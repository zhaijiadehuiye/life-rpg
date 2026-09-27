import type { CapitalKey } from '../types'

export const capitalMeta: Record<CapitalKey, { label: string; icon: string; color: string }> = {
  time: { label: '时间', icon: '⌛', color: 'text-sky-600' },
  money: { label: '金钱', icon: '◆', color: 'text-amber-600' },
  health: { label: '健康', icon: '♥', color: 'text-rose-600' },
  relationships: { label: '关系', icon: '✦', color: 'text-violet-600' },
  knowledge: { label: '知识', icon: '✺', color: 'text-emerald-600' },
}

export const capitalKeys = Object.keys(capitalMeta) as CapitalKey[]

export function xpForLevel(level: number): number {
  return Math.max(0, (level - 1) * 100 + Math.floor((level - 1) ** 1.55 * 25))
}

export function levelFromXp(xp: number): number {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level += 1
  return level
}

export function xpProgress(xp: number): { level: number; current: number; needed: number; percent: number } {
  const level = levelFromXp(xp)
  const current = xp - xpForLevel(level)
  const needed = xpForLevel(level + 1) - xpForLevel(level)
  return { level, current, needed, percent: Math.min(100, Math.round((current / needed) * 100)) }
}

export function makeId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(date))
}

export function relativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}
