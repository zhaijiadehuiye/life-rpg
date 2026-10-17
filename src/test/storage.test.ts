import { beforeEach, describe, expect, it } from 'vitest'
import { loadState, parseImport, STORAGE_VERSION } from '../lib/storage'
import { buildDemoState } from '../data/demo'

describe('versioned local storage import', () => {
  beforeEach(() => localStorage.clear())

  it('migrates a v1 backup without deleting the existing game state', () => {
    const state = buildDemoState()
    delete state.timeEntries
    const result = parseImport(JSON.stringify({ version: 1, savedAt: new Date().toISOString(), state }))

    expect(STORAGE_VERSION).toBe(3)
    expect(result.error).toBeUndefined()
    expect(result.state?.profile?.name).toBe(state.profile?.name)
    expect(result.state?.checkIns).toEqual({})
    expect(result.state?.dailyActions).toEqual([])
    expect(result.state?.logs).toEqual(state.logs)
    expect(result.state?.timeEntries).toEqual([])
  })

  it('rejects malformed backups with a user-readable error', () => {
    expect(parseImport('{"version":2}').error).toContain('格式不正确')
  })

  it('loads v2 without rewriting its raw storage or original check-ins and logs', async () => {
    const state = buildDemoState()
    delete state.timeEntries
    state.checkIns = { '2026-10-01': { date: '2026-10-01', sleep: 0, energy: 50, focus: 50, mood: 50, stress: 50, selfEfficacy: 50, note: '原始备注', createdAt: '2026-10-01T10:00:00Z' } }
    const raw = JSON.stringify({ version: 2, savedAt: '2026-10-01', state })
    localStorage.setItem('life-rpg:v1', raw)
    const result = await loadState()
    expect(result?.timeEntries).toEqual([])
    expect(result?.logs).toEqual(state.logs)
    expect(result?.checkIns).toEqual(state.checkIns)
    expect(localStorage.getItem('life-rpg:v1')).toBe(raw)
  })

  it('keeps v3 time entries through JSON backup round-trip', () => {
    const state = buildDemoState()
    expect(parseImport(JSON.stringify({ version: 3, state })).state?.timeEntries).toEqual(state.timeEntries)
  })
})
