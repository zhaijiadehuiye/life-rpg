// 当前发挥率 — 游戏化估算，非医学/心理学测量。
import type { MentalState } from '../types'

const WEIGHTS = {
  energy: 0.25,
  focus: 0.25,
  mood: 0.15,
  selfEfficacy: 0.15,
  stress: 0.2,
} as const

export interface PerformanceResult {
  performance: number
  breakdown: {
    energy: number; focus: number; mood: number; selfEfficacy: number; stress: number
  }
  suggestion: string
}

export function computePerformance(m: MentalState): PerformanceResult {
  const stressInv = 100 - m.stress
  const performance =
    m.energy * WEIGHTS.energy +
    m.focus * WEIGHTS.focus +
    m.mood * WEIGHTS.mood +
    m.selfEfficacy * WEIGHTS.selfEfficacy +
    stressInv * WEIGHTS.stress

  let suggestion = '系统运行顺畅。可以推进当前主线里最重要的一步。'
  if (performance < 40) {
    suggestion = '当前系统处于高负载状态，建议降低任务复杂度，优先完成 1 件恢复类小事（散步、早睡、记录）。'
  } else if (performance < 60) {
    suggestion = '系统负载中等。建议先做一个 25 分钟的专注块，再决定是否推进困难任务。'
  } else if (performance >= 80) {
    suggestion = '当前状态充沛。适合啃一块硬骨头：推进主线里最怕拖延的那个阶段。'
  }

  return {
    performance: Math.round(performance),
    breakdown: {
      energy: m.energy, focus: m.focus, mood: m.mood,
      selfEfficacy: m.selfEfficacy, stress: stressInv,
    },
    suggestion,
  }
}

export function effectiveValue(base: number, performance: number): number {
  return Math.round((base * performance) / 100)
}
