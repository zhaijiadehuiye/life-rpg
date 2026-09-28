import { beforeEach, describe, expect, it } from 'vitest'
import { parseImport, STORAGE_VERSION } from '../lib/storage'
import { buildDemoState } from '../data/demo'

describe('versioned local storage import', () => {
  beforeEach(() => localStorage.clear())

  it('migrates a v1 backup without deleting the existing game state', () => {
    const state = buildDemoState()
    const result = parseImport(JSON.stringify({ version: 1, savedAt: new Date().toISOString(), state }))

    expect(STORAGE_VERSION).toBe(2)
    expect(result.error).toBeUndefined()
    expect(result.state?.profile?.name).toBe(state.profile?.name)
    expect(result.state?.checkIns).toEqual({})
    expect(result.state?.dailyActions).toEqual([])
  })

  it('rejects malformed backups with a user-readable error', () => {
    expect(parseImport('{"version":2}').error).toContain('格式不正确')
  })
})
