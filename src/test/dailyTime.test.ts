import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { allocationForDate, sleepForDate, timestampFromLocal, validateTimeEntry } from '../lib/dailyTime'
import { buildDemoState } from '../data/demo'
import { useGameStore } from '../store/useGameStore'
import { loadState, parseImport, exportState } from '../lib/storage'
import type { TimeCategory, TimeEntry } from '../types'

const date = '2026-10-17'
const at = (day: string, time: string) => timestampFromLocal(day, time)!
const now = new Date(2026, 9, 17, 23, 30)
const entry = (id: string, category: TimeCategory, start: string, end: string): TimeEntry => ({ id, category, startedAt: start, endedAt: end, note: '', createdAt: start, updatedAt: end })
const night = entry('night', 'sleep', at('2026-10-16', '23:30'), at(date, '07:30'))

describe('local time calculations', () => {
  it('rejects impossible local dates and reversed, future or overlapping intervals', () => {
    expect(timestampFromLocal('2026-02-30', '06:00')).toBeNull()
    expect(timestampFromLocal(date, '24:01')).toBeNull()
    expect(validateTimeEntry({ ...night, endedAt: night.startedAt }, [], now)).toContain('结束时间')
    expect(validateTimeEntry({ ...night, endedAt: at('2026-10-18', '07:30') }, [], now)).toContain('现在')
    expect(validateTimeEntry({ ...entry('work', 'work', at(date, '07:00'), at(date, '08:00')), id: undefined }, [night], now)).toContain('重叠')
    expect(validateTimeEntry({ ...night, id: undefined }, [], now)).toBeNull()
    expect(validateTimeEntry(night, [night], now)).toBeNull() // editing itself
    expect(validateTimeEntry(entry('new', 'work', at(date, '07:30'), at(date, '08:00')), [night], now)).toContain('不存在')
    expect(validateTimeEntry({ ...entry('new', 'work', at(date, '07:30'), at(date, '08:00')), id: undefined }, [night], now)).toBeNull()
  })

  it('assigns full overnight sleep to wake day and adds naps, while daily allocation clips midnight', () => {
    const nap = entry('nap', 'sleep', at(date, '13:00'), at(date, '13:30'))
    const state = { timeEntries: [night, nap], logs: [], checkIns: {} }
    const sleep = sleepForDate(state, date, now)
    expect(sleep.minutes).toBe(510)
    expect(sleep.main?.id).toBe('night')
    expect(sleepForDate(state, '2026-10-16', now).minutes).toBeNull()
    const allocation = allocationForDate(state.timeEntries, date, now)
    expect(allocation.totals.sleep).toBe(480)
    expect(allocation.totals.unrecorded).toBe(960)
    expect(allocation.parts.reduce((sum, item) => sum + item.minutes, 0)).toBe(1440)
    expect(allocationForDate([night], '2026-10-16', now).totals.sleep).toBe(30)
  })

  it('retains legacy hours including explicit zero, without inventing a bedtime', () => {
    const base = buildDemoState()
    const state = { ...base, timeEntries: [], checkIns: { [date]: { date, sleep: 0, energy: 50, focus: 50, stress: 50, mood: 50, selfEfficacy: 50, note: '', createdAt: now.toISOString() } }, logs: [{ ...base.logs[0], date, wakeTime: '07:15' }] }
    expect(sleepForDate(state, date, now)).toMatchObject({ minutes: 0, source: 'reported', main: null, legacyWakeTime: '07:15' })
    expect(sleepForDate({ ...state, timeEntries: [night] }, date, now)).toMatchObject({ minutes: 480, source: 'interval' })
    expect(sleepForDate(state, '2026-10-10', now).minutes).toBeNull()
    expect(allocationForDate([], date, now).recordedMinutes).toBe(0)
  })

  it('keeps imported overlaps and counts them once with a visible conflict, never over 24 hours', () => {
    const second = entry('second', 'work', at(date, '07:00'), at(date, '09:00'))
    const entries = [night, second]
    const before = JSON.stringify(entries)
    const result = allocationForDate(entries, date, now)
    expect(result.totals.conflict).toBe(30)
    expect(result.totals.sleep).toBe(420)
    expect(result.totals.work).toBe(90)
    expect(result.parts.reduce((sum, part) => sum + part.minutes, 0)).toBe(1440)
    expect(JSON.stringify(entries)).toBe(before)
    expect(sleepForDate({ timeEntries: [night, night], logs: [] }, date, now).minutes).toBe(480)
  })

  it('clips future imported time to now without counting it as elapsed time', () => {
    const future = entry('future', 'work', at(date, '22:00'), at('2026-10-18', '02:00'))
    expect(allocationForDate([future], date, now).totals.work).toBe(90)
    expect(allocationForDate([future], '2026-10-18', now).recordedMinutes).toBe(0)
  })
})

describe('durable time records', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    localStorage.clear()
    useGameStore.setState({ ...buildDemoState(), timeEntries: [] })
  })
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

  it('creates, edits, exports, reloads and deletes a record without changing journal or growth', async () => {
    const before = useGameStore.getState()
    expect(before.saveTimeEntry({ ...night, id: undefined }).ok).toBe(true)
    const saved = useGameStore.getState().timeEntries![0]
    expect(useGameStore.getState().saveTimeEntry({ ...saved, note: '补充' }).ok).toBe(true)
    expect(parseImport(exportState(useGameStore.getState())).state?.timeEntries?.[0].note).toBe('补充')
    expect((await loadState())?.timeEntries).toEqual(useGameStore.getState().timeEntries)
    expect(useGameStore.getState().logs).toEqual(before.logs)
    expect(useGameStore.getState().profile).toEqual(before.profile)
    expect(useGameStore.getState().skills).toEqual(before.skills)
    expect(useGameStore.getState().capitals).toEqual(before.capitals)
    expect(useGameStore.getState().checkIns).toEqual(before.checkIns)
    expect(useGameStore.getState().deleteTimeEntry(saved.id).ok).toBe(true)
    expect((await loadState())?.timeEntries).toEqual([])
  })

  it('returns a useful error on quota failure, leaving both persisted and displayed records intact', () => {
    useGameStore.getState().saveTimeEntry({ ...night, id: undefined })
    const before = localStorage.getItem('life-rpg:v1')
    const original = useGameStore.getState().timeEntries![0]
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError') })
    const result = useGameStore.getState().saveTimeEntry({ ...original, note: '未保存的修改' })
    expect(result).toMatchObject({ ok: false })
    expect(result.error).toContain('内容仍在')
    expect(useGameStore.getState().timeEntries![0]).toEqual(original)
    expect(useGameStore.getState().deleteTimeEntry(original.id).ok).toBe(false)
    expect(localStorage.getItem('life-rpg:v1')).toBe(before)
  })
})
