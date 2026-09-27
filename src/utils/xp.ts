import type { Difficulty } from '../types'

export function xpToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5))
}

export function levelFromTotalXp(totalXp: number): {
  level: number
  currentLevelXp: number
  xpIntoLevel: number
  xpToNext: number
  progress: number
} {
  let level = 1
  let remaining = totalXp
  let need = xpToNextLevel(level)
  while (remaining >= need) {
    remaining -= need
    level += 1
    need = xpToNextLevel(level)
  }
  return {
    level,
    currentLevelXp: totalXp - (totalXp - remaining),
    xpIntoLevel: remaining,
    xpToNext: need,
    progress: Math.min(1, remaining / need),
  }
}

export const DIFFICULTY_PRESET: Record<Difficulty, { min: number; max: number; label: string }> = {
  easy: { min: 5, max: 15, label: '简单' },
  normal: { min: 20, max: 40, label: '正常' },
  hard: { min: 50, max: 100, label: '困难' },
  epic: { min: 100, max: 500, label: '里程碑' },
}

export const MAX_DAILY_CHARACTER_XP = 300

export function xpToNextCapitalPoint(currentLevel: number): number {
  return Math.floor(80 + currentLevel * 40)
}

export function xpToNextSkillLevel(currentLevel: number): number {
  return Math.floor(60 * Math.pow(currentLevel, 1.3))
}
