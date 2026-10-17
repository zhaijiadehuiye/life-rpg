import { addDays, todayKey } from '../utils/date'
import { uuid } from '../utils/id'
import { normalizeResearchState, RESEARCH_COLLECTIONS } from './historianStorage'
import type { ResearchEntry, ResearchState } from '../types/historian'

export const researchId = (prefix: string) => `${prefix}_${uuid()}`
export const fieldText = (data: FormData, name: string) => String(data.get(name) ?? '').trim()
export function fieldNumber(data: FormData, name: string, min: number, max: number) {
  const text = fieldText(data, name), value = Number(text)
  if (!text || !Number.isFinite(value) || value < min || value > max) throw new Error(`请填写 ${min}–${max} 范围内的数值。`)
  return value
}
export const statusLabel = (status: string) => ({ Active: '进行中', Weak: '待观察', Supported: '有支持', Rejected: '已否定', Archived: '已归档', Analyzed: '已复盘', Open: '待核对', Resolved: '已核对' }[status] ?? status)
export function researchDate(value: string) {
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00` : value)
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }).format(parsed)
}
export function makeResearchEntry(text: string, date: string, tags: string[]): ResearchEntry {
  if (!text.trim()) throw new Error('先写下一段想记住的内容。')
  if (date > todayKey() || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('请选择今天或过去的记录日期。')
  const timestamp = new Date().toISOString()
  return { id: researchId('entry'), date, createdAt: timestamp, updatedAt: timestamp, originalText: text.trim(), currentText: text.trim(),
    revisions: [{ id: researchId('rev'), text: text.trim(), createdAt: timestamp, kind: 'original', note: '首次保存的原始材料' }],
    tags, metadata: {}, analysis: null, events: [] }
}

export function appendResearchRevision(state: ResearchState, id: string, text: string, expectedText: string) {
  const entry = state.entries.find((row) => row.id === id)
  if (!entry) throw new Error('记录已不存在，请重新打开。')
  if (entry.currentText !== expectedText) throw new Error('这条记录已在另一个窗口修改。你的输入仍保留，请重新打开记录后核对。')
  if (!text.trim() || text.trim() === entry.currentText) throw new Error('请填写与当前版本不同的内容。')
  const timestamp = new Date().toISOString()
  entry.revisions = [...(entry.revisions ?? []), { id: researchId('rev'), createdAt: timestamp, text: text.trim(), kind: 'revision', note: '用户主动修订' }]
  entry.currentText = text.trim(); entry.updatedAt = timestamp
  // The original and its existing analysis stay intact; any new analysis is explicit.
}

/** Same local sentence extraction as the legacy notebook. No personality/causal claims. */
export function analyzeResearchEntry(entry: ResearchEntry) {
  const sentences = entry.currentText.replace(/\r/g, '').split(/(?<=[。！？.!?])\s*|\n+/).map((line) => line.trim()).filter(Boolean)
  entry.analysis = {
    ...(entry.analysis ?? {}), facts: sentences.slice(0, 5),
    interpretation: sentences.find((line) => /(我|自己).*(差|不行|拖延|懒|失败|焦虑)/.test(line)) ?? '原文没有明确的自我解释。',
    narrative: sentences.find((line) => /(一直|总是|永远|从来|每次)/.test(line)) ?? '还没有足够材料判断长期规律。',
    alternatives: ['任务大小、环境和当时状态都可能影响体验，需要更多记录来区分。'],
    cannotConclude: ['文字摘录不等于已核实的事实。', '相关性不代表因果关系，也不能据此判断人格或健康状况。'],
    analyzedAt: new Date().toISOString(), model: 'local-structured-analysis-v0',
  }
}

export function tagCounts(entries: ResearchEntry[]): [string, number][] {
  const counts = new Map<string, number>()
  entries.forEach((entry) => (entry.tags ?? []).forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)))
  return [...counts].sort((a, b) => b[1] - a[1])
}
export function entriesInRange(entries: ResearchEntry[], days: number, now = todayKey()) {
  const first = addDays(now, 1 - days)
  return entries.filter((entry) => entry.date >= first && entry.date <= now)
}
export function researchExport(state: ResearchState) {
  return JSON.stringify({ product: 'Personal Historian / 自我历史学', schemaVersion: 1, exportedAt: new Date().toISOString(), state }, null, 2)
}
export function parseResearchImport(text: string): ResearchState {
  const parsed = JSON.parse(text)
  const raw = parsed?.state ?? parsed
  if (!raw || !Array.isArray(raw.entries) || !Array.isArray(raw.hypotheses)) throw new Error('请选择随手记 / 自我历史学导出的 JSON 档案。角色与生活记录请在本页对应区域恢复。')
  const state = normalizeResearchState(raw)
  for (const key of RESEARCH_COLLECTIONS) {
    if (state[key].some((row) => !row || typeof row.id !== 'string')) throw new Error('档案中有缺少编号的记录，请核对备份文件。')
    if (new Set(state[key].map((row) => row.id)).size !== state[key].length) throw new Error('备份含重复编号，请先核对文件，当前数据未改变。')
  }
  if (state.entries.some((entry) => typeof entry.originalText !== 'string' || typeof entry.currentText !== 'string' || !Array.isArray(entry.revisions))) throw new Error('备份缺少原文或修订历史，当前数据未改变。')
  if (state.entries.some((entry) => typeof entry.date !== 'string' || typeof entry.createdAt !== 'string' || typeof entry.updatedAt !== 'string' || !Array.isArray(entry.tags) || entry.revisions.some((revision) => !revision || typeof revision.id !== 'string' || typeof revision.text !== 'string' || typeof revision.createdAt !== 'string'))) throw new Error('备份中的记录或修订格式不完整，当前数据未改变。')
  if (state.hypotheses.some((row) => typeof row.title !== 'string' || typeof row.updatedAt !== 'string' || !Array.isArray(row.confidenceHistory)) || state.experiments.some((row) => typeof row.title !== 'string' || !Array.isArray(row.observations)) || state.predictions.some((row) => typeof row.text !== 'string' || !Number.isFinite(row.probability))) throw new Error('备份中的复盘资料格式不完整，当前数据未改变。')
  return state
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`
  return JSON.stringify(value) ?? 'null'
}

/** Explicit import only. Conflicting backups become separate linked copies; never replace current originals. */
export function mergeResearchImport(current: ResearchState, incoming: ResearchState) {
  const currentMaps = Object.fromEntries(RESEARCH_COLLECTIONS.map((key) => [key, new Map(current[key].map((row) => [row.id, row]))]))
  const conflicts = RESEARCH_COLLECTIONS.reduce((sum, key) => sum + incoming[key].filter((row) => {
    const existing = currentMaps[key].get(row.id)
    return existing && stableJson(existing) !== stableJson(row)
  }).length, 0)
  const serial = stableJson(incoming)
  let hash = 2166136261
  for (let index = 0; index < serial.length; index++) hash = Math.imul(hash ^ serial.charCodeAt(index), 16777619)
  const prefix = `import-${(hash >>> 0).toString(16)}-`
  const ids = new Map<string, string>()
  RESEARCH_COLLECTIONS.forEach((key) => incoming[key].forEach((row) => ids.set(row.id, conflicts ? `${prefix}${row.id}` : row.id)))
  const mapId = (id: string) => ids.get(id) ?? id
  const next = structuredClone(current)
  Object.entries(incoming).forEach(([key, value]) => { if (!Object.prototype.hasOwnProperty.call(next, key)) next[key] = structuredClone(value) })
  let added = 0, skipped = 0
  for (const key of RESEARCH_COLLECTIONS) {
    const existingIds = new Set(next[key].map((row) => row.id))
    for (const original of incoming[key]) {
      const row = structuredClone(original)
      const id = mapId(row.id)
      if (existingIds.has(id)) { skipped++; continue }
      row.id = id
      if ('entryId' in row) row.entryId = mapId(String(row.entryId))
      if ('hypothesisId' in row) row.hypothesisId = mapId(String(row.hypothesisId))
      if ('supportingEvidence' in row) row.supportingEvidence = (row.supportingEvidence as string[]).map(mapId)
      if ('opposingEvidence' in row) row.opposingEvidence = (row.opposingEvidence as string[]).map(mapId)
      // Each collection is already validated; keep its full object, including unknown legacy fields.
      ;(next[key] as Record<string, unknown>[]).push(row)
      existingIds.add(id)
      added++
    }
  }
  return { state: next, added, skipped, conflicts }
}
