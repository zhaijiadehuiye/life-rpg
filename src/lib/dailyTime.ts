import type { GameState, TimeCategory, TimeEntry, TimeEntryInput } from '../types'
import { addDays, formatChineseDate, parseKey, todayKey } from '../utils/date'

export const TIME_CATEGORIES: Record<TimeCategory, { label: string; color: string }> = {
  sleep: { label: '睡眠', color: '#cbbce9' },
  work: { label: '工作', color: '#a5cdeb' },
  study: { label: '学习', color: '#9dbba3' },
  exercise: { label: '运动', color: '#f3bb9f' },
  rest: { label: '休息', color: '#e5cba6' },
  other: { label: '其他', color: '#b2c1b5' },
}
export const ACTIVITY_CATEGORIES = (Object.keys(TIME_CATEGORIES) as TimeCategory[]).filter((key) => key !== 'sleep')
export type AllocationCategory = TimeCategory | 'unrecorded' | 'conflict'
export const ALLOCATION_STYLES = {
  ...TIME_CATEGORIES,
  conflict: { label: '重叠待核对', color: '#ddb4b4' },
  unrecorded: { label: '未记录', color: '#e7e6e3' },
}

export function interval(entry: Pick<TimeEntry, 'startedAt' | 'endedAt'>): [number, number] | null {
  const start = Date.parse(entry.startedAt)
  const end = Date.parse(entry.endedAt)
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? [start, end] : null
}

export function validTimeEntry(entry: TimeEntry): boolean {
  return !!entry && Object.prototype.hasOwnProperty.call(TIME_CATEGORIES, entry.category) && interval(entry) !== null
}

export function localDateTime(value: string | Date): { date: string; time: string } {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return { date: '', time: '' }
  return { date: todayKey(date), time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` }
}

/** Reject invalid dates (including a local clock time skipped by DST). */
export function timestampFromLocal(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const parsed = new Date(year, month - 1, day, hour, minute)
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day || parsed.getHours() !== hour || parsed.getMinutes() !== minute) return null
  return parsed.toISOString()
}

export function formatDuration(minutes: number | null, compact = false): string {
  if (minutes === null || !Number.isFinite(minutes)) return '未记'
  const rounded = Math.max(0, Math.round(minutes))
  const hours = Math.floor(rounded / 60)
  const rest = rounded % 60
  if (compact) return hours ? `${hours}h${rest ? String(rest).padStart(2, '0') : ''}` : `${rest}m`
  return hours ? `${hours}小时${rest ? `${rest}分` : ''}` : `${rest}分钟`
}

export function clockLabel(timestamp: string, date: string): string {
  const parts = localDateTime(timestamp)
  if (!parts.date) return '未记'
  const day = parts.date === date ? '今天' : parts.date === addDays(date, -1) ? (Number(parts.time.slice(0, 2)) >= 18 ? '昨晚' : '昨天') : formatChineseDate(parts.date).split(' ')[0]
  return `${day} ${parts.time}`
}

export function entryLabel(entry: TimeEntry): string {
  const start = localDateTime(entry.startedAt)
  const end = localDateTime(entry.endedAt)
  if (!start.date || !end.date) return '时间不可读，请修改记录'
  return `${formatChineseDate(start.date).split(' ')[0]} ${start.time} — ${start.date !== end.date ? `${formatChineseDate(end.date).split(' ')[0]} ` : ''}${end.time}`
}

export function validateTimeEntry(input: TimeEntryInput, entries: TimeEntry[], now = new Date()): string | null {
  if (!Object.prototype.hasOwnProperty.call(TIME_CATEGORIES, input.category)) return '请选择活动类别。'
  const range = interval(input)
  if (!range) return '请填写有效的起止时间，结束时间应晚于开始时间；跨天时请调整日期。'
  if (range[1] > now.getTime()) return '这里只记录已经发生的时段，结束时间不能晚于现在。'
  if (input.id && !entries.some((entry) => entry.id === input.id)) return '这条记录已不存在，请关闭后重新打开。'
  if (typeof input.note !== 'string' || input.note.length > 2000) return '补充说明请控制在 2000 字以内。'
  const overlap = entries.find((entry) => {
    if (entry.id === input.id || !validTimeEntry(entry)) return false
    const other = interval(entry)!
    return range[0] < other[1] && range[1] > other[0]
  })
  if (overlap) return `与「${TIME_CATEGORIES[overlap.category].label} · ${entryLabel(overlap)}」重叠，请调整时间或修改已有记录。`
  return null
}

function unionMinutes(ranges: [number, number][]): number {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0])
  let end = -Infinity
  let total = 0
  for (const range of sorted) {
    total += Math.max(0, range[1] - Math.max(end, range[0]))
    end = Math.max(end, range[1])
  }
  return total / 60000
}

export function sleepForDate(state: Pick<GameState, 'timeEntries' | 'checkIns' | 'logs'>, date: string, now = new Date()) {
  const entries = (state.timeEntries ?? []).filter((entry) => validTimeEntry(entry) && entry.category === 'sleep' && localDateTime(entry.endedAt).date === date && Date.parse(entry.endedAt) <= now.getTime())
  const longest = [...entries].sort((a, b) => (Date.parse(b.endedAt) - Date.parse(b.startedAt)) - (Date.parse(a.endedAt) - Date.parse(a.startedAt)))[0]
  const reported = state.checkIns?.[date]?.sleep
  const reportedMinutes = typeof reported === 'number' && Number.isFinite(reported) && reported >= 0 && reported <= 24 ? reported * 60 : null
  const wakeTime = state.logs.find((log) => log.date === date)?.wakeTime
  return {
    minutes: entries.length ? unionMinutes(entries.map((entry) => interval(entry)!)) : reportedMinutes,
    source: entries.length ? 'interval' as const : reportedMinutes !== null ? 'reported' as const : 'missing' as const,
    main: longest ?? null,
    entries,
    legacyWakeTime: wakeTime && /^([01]\d|2[0-3]):[0-5]\d$/.test(wakeTime) ? wakeTime : null,
  }
}

/** Allocation is per LOCAL calendar day. Overlapping imported data is kept and counted once as a conflict. */
export function allocationForDate(entries: TimeEntry[], date: string, now = new Date()) {
  const start = parseKey(date).getTime()
  const end = parseKey(addDays(date, 1)).getTime()
  const clipped = entries.filter(validTimeEntry).map((entry) => ({
    category: entry.category,
    start: Math.max(start, Date.parse(entry.startedAt)),
    end: Math.min(end, now.getTime(), Date.parse(entry.endedAt)),
  })).filter((entry) => entry.start < entry.end)
  const points = [...new Set([start, end, ...clipped.flatMap((entry) => [entry.start, entry.end])])].sort((a, b) => a - b)
  const totals = Object.fromEntries([...Object.keys(TIME_CATEGORIES), 'conflict', 'unrecorded'].map((key) => [key, 0])) as Record<AllocationCategory, number>
  for (let index = 0; index < points.length - 1; index++) {
    const left = points[index]
    const right = points[index + 1]
    const active = clipped.filter((entry) => entry.start < right && entry.end > left)
    const category = active.length > 1 ? 'conflict' : active[0]?.category ?? 'unrecorded'
    totals[category] += (right - left) / 60000
  }
  const dayMinutes = (end - start) / 60000
  return {
    totals,
    dayMinutes,
    recordedMinutes: dayMinutes - totals.unrecorded,
    parts: (Object.keys(totals) as AllocationCategory[]).map((category) => ({ category, minutes: totals[category], ...ALLOCATION_STYLES[category] })),
  }
}

export function sleepTimeline(entries: TimeEntry[], date: string, now = new Date()) {
  const start = parseKey(addDays(date, -1))
  start.setHours(18)
  const end = parseKey(date)
  end.setHours(18)
  const length = end.getTime() - start.getTime()
  const bands = entries.filter((entry) => validTimeEntry(entry) && entry.category === 'sleep').map((entry) => ({
    ...entry,
    left: Math.max(start.getTime(), Date.parse(entry.startedAt)),
    right: Math.min(end.getTime(), now.getTime(), Date.parse(entry.endedAt)),
  })).filter((entry) => entry.left < entry.right).map((entry) => ({
    id: entry.id,
    left: ((entry.left - start.getTime()) / length) * 100,
    width: ((entry.right - entry.left) / length) * 100,
    label: `${localDateTime(entry.startedAt).time}–${localDateTime(entry.endedAt).time}`,
  }))
  return { bands }
}

export function entriesForDate(entries: TimeEntry[], date: string) {
  const start = parseKey(date).getTime()
  const end = parseKey(addDays(date, 1)).getTime()
  return entries.filter((entry) => {
    const range = interval(entry)
    return !validTimeEntry(entry) || (range && range[0] < end && range[1] > start) || (entry.category === 'sleep' && localDateTime(entry.endedAt).date === date)
  }).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
}
