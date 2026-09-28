export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function dateKeyFromTimestamp(timestamp: string): string {
  const parsed = new Date(timestamp)
  return Number.isNaN(parsed.getTime()) ? timestamp.slice(0, 10) : todayKey(parsed)
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, n: number): string {
  const d = parseKey(key)
  d.setDate(d.getDate() + n)
  return todayKey(d)
}

export function diffDays(fromKey: string, toKey: string): number {
  const a = parseKey(fromKey).getTime()
  const b = parseKey(toKey).getTime()
  return Math.round((b - a) / 86400000)
}

export function formatChineseDate(key: string): string {
  const d = parseKey(key)
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日 周${week}`
}

export function lastNDays(n: number): string[] {
  const out: string[] = []
  const t = todayKey()
  for (let i = n - 1; i >= 0; i--) out.push(addDays(t, -i))
  return out
}
