import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HISTORIAN_FALLBACK, assertResearchPreserved, normalizeResearchState, readResearchWorkspace, updateResearchWorkspace } from '../lib/historianStorage'
import { analyzeResearchEntry, appendResearchRevision, makeResearchEntry, mergeResearchImport, parseResearchImport, researchExport, fieldNumber } from '../lib/research'

function legacyWorkspace() {
  const state = normalizeResearchState({ createdAt: '2020-01-01', customLegacyField: { keep: true } })
  const entry = makeResearchEntry('原始材料不覆盖', '2020-01-01', ['学习'])
  entry.metadata = { customMeasurement: 123 }
  state.entries.push(entry)
  state.hypotheses.push({ id: 'H-1', title: '一个待验证的解释', description: '描述', status: 'Active', confidence: 0, createdAt: entry.createdAt, updatedAt: entry.createdAt, confidenceHistory: [{ date: entry.date, confidence: 0, reason: '首次判断' }], supportingEvidence: ['E-1'], opposingEvidence: [] })
  state.evidence.push({ id: 'E-1', entryId: entry.id, hypothesisId: 'H-1', type: 'support', note: '原来的关联', createdAt: entry.createdAt })
  return state
}

describe('existing research storage compatibility', () => {
  beforeEach(() => { localStorage.clear(); vi.stubGlobal('indexedDB', undefined) })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('does not seed, migrate or write either store just by reading', async () => {
    const result = await readResearchWorkspace()
    expect(result.state.entries).toEqual([])
    expect(localStorage.getItem(HISTORIAN_FALLBACK)).toBeNull()
    expect(localStorage.getItem('life-rpg:v1')).toBeNull()
  })

  it('does not silently switch an existing IndexedDB session to an empty fallback when access fails', async () => {
    await expect(updateResearchWorkspace((draft) => { draft.entries.push(makeResearchEntry('未保存的输入', '2020-01-01', [])) }, 'IndexedDB')).rejects.toThrow('不会改用空白档案')
    expect(localStorage.getItem(HISTORIAN_FALLBACK)).toBeNull()
  })

  it('reads a legacy fallback unchanged and keeps unknown fields through a native edit', async () => {
    const state = legacyWorkspace(), raw = JSON.stringify(state)
    localStorage.setItem(HISTORIAN_FALLBACK, raw)
    localStorage.setItem('life-rpg:v1', 'existing-game-payload')
    expect((await readResearchWorkspace()).state).toEqual(state)
    expect(localStorage.getItem(HISTORIAN_FALLBACK)).toBe(raw)
    const result = await updateResearchWorkspace((draft) => appendResearchRevision(draft, state.entries[0].id, '手动补充', state.entries[0].currentText))
    expect(result.state.entries[0].originalText).toBe('原始材料不覆盖')
    expect(result.state.entries[0].revisions[0]).toEqual(state.entries[0].revisions[0])
    expect(result.state.entries[0].metadata).toEqual({ customMeasurement: 123 })
    expect(result.state.customLegacyField).toEqual(state.customLegacyField)
    expect(result.state.evidence).toEqual(state.evidence)
    expect(result.state.hypotheses).toEqual(state.hypotheses)
    expect(localStorage.getItem('life-rpg:v1')).toBe('existing-game-payload')
    expect(parseResearchImport(researchExport(result.state))).toEqual(result.state)
  })

  it('refuses edits that remove records, replace originals, or rewrite old revision text', async () => {
    const state = legacyWorkspace(), raw = JSON.stringify(state)
    localStorage.setItem(HISTORIAN_FALLBACK, raw)
    await expect(updateResearchWorkspace((draft) => { draft.entries[0].originalText = '被覆盖' })).rejects.toThrow('原文')
    await expect(updateResearchWorkspace((draft) => { draft.entries[0].revisions[0].text = '被覆盖' })).rejects.toThrow('修订')
    await expect(updateResearchWorkspace((draft) => { draft.entries = [] })).rejects.toThrow('移除')
    expect(localStorage.getItem(HISTORIAN_FALLBACK)).toBe(raw)
  })

  it('leaves the existing payload intact when quota fails, and does not treat corrupt storage as an empty archive', async () => {
    const state = legacyWorkspace(), raw = JSON.stringify(state)
    localStorage.setItem(HISTORIAN_FALLBACK, raw)
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError') })
    await expect(updateResearchWorkspace((draft) => { draft.entries.unshift(makeResearchEntry('新的内容', '2020-01-02', [])) })).rejects.toThrow('输入仍在')
    expect(localStorage.getItem(HISTORIAN_FALLBACK)).toBe(raw)
    spy.mockRestore()
    localStorage.setItem(HISTORIAN_FALLBACK, '{broken')
    await expect(readResearchWorkspace()).rejects.toThrow()
    expect(localStorage.getItem(HISTORIAN_FALLBACK)).toBe('{broken')
  })
})

describe('research originals, revisions and explicit backup import', () => {
  it('requires a fresh revision base and keeps analysis separate from text history', () => {
    const state = legacyWorkspace(), entry = state.entries[0]
    appendResearchRevision(state, entry.id, '第二版', entry.currentText)
    expect(() => appendResearchRevision(state, entry.id, '过期的修改', '原始材料不覆盖')).toThrow('另一个窗口')
    const before = structuredClone(entry)
    analyzeResearchEntry(entry)
    expect(entry.originalText).toBe(before.originalText)
    expect(entry.currentText).toBe(before.currentText)
    expect(entry.revisions).toEqual(before.revisions)
    expect(entry.analysis?.facts).toEqual(['第二版'])
  })

  it('deduplicates the same backup without comparing only the text', () => {
    const state = legacyWorkspace(), incoming = parseResearchImport(researchExport(state))
    const result = mergeResearchImport(state, incoming)
    expect(result.added).toBe(0)
    expect(result.skipped).toBe(3)
    expect(result.state).toEqual(state)
    incoming.entries.push({ ...structuredClone(incoming.entries[0]), id: 'another-id' })
    const appended = mergeResearchImport(state, incoming)
    expect(appended.state.entries).toHaveLength(2) // Same words may describe two intentional records.
  })

  it('keeps conflicting originals and revision chains as separate linked copies, repeatably', () => {
    const state = legacyWorkspace(), incoming = structuredClone(state)
    appendResearchRevision(incoming, incoming.entries[0].id, '来自旧备份的另一版', incoming.entries[0].currentText)
    const result = mergeResearchImport(state, incoming)
    expect(result.conflicts).toBe(1)
    expect(result.state.entries[0]).toEqual(state.entries[0])
    const copy = result.state.entries[1], proof = result.state.evidence[1], hypothesis = result.state.hypotheses[1]
    expect(copy.id).not.toBe(state.entries[0].id)
    expect(copy.originalText).toBe(state.entries[0].originalText)
    expect(copy.revisions).toEqual(incoming.entries[0].revisions)
    expect(proof.entryId).toBe(copy.id)
    expect(proof.hypothesisId).toBe(hypothesis.id)
    expect(hypothesis.supportingEvidence).toEqual([proof.id])
    expect(() => assertResearchPreserved(state, result.state)).not.toThrow()
    expect(mergeResearchImport(result.state, incoming).added).toBe(0)
  })

  it('rejects invalid backup shapes and accepts a deliberately entered zero', () => {
    expect(() => parseResearchImport('{"state":{"profile":{}}}')).toThrow('JSON 档案')
    expect(() => parseResearchImport('{"entries":[{"id":"broken"}],"hypotheses":[]}')).toThrow('原文')
    const data = new FormData(); data.set('probability', '0')
    expect(fieldNumber(data, 'probability', 0, 100)).toBe(0)
    data.set('probability', '')
    expect(() => fieldNumber(data, 'probability', 0, 100)).toThrow()
  })
})
