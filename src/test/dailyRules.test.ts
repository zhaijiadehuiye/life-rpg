import { describe, expect, it } from 'vitest'
import { buildDemoState } from '../data/demo'
import { calculateDailySettlement, generateDailyActions } from '../data/dailyRules'
import { todayKey } from '../utils/date'
import type { DailyCheckIn } from '../types'
import { useGameStore } from '../store/useGameStore'

function checkIn(overrides: Partial<DailyCheckIn> = {}): DailyCheckIn {
  return {
    date: todayKey(),
    sleep: 7,
    energy: 70,
    focus: 70,
    mood: 70,
    stress: 35,
    selfEfficacy: 70,
    note: '',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('daily operating loop rules', () => {
  it('always generates three actions and adapts to a low-energy check-in', () => {
    const state = buildDemoState()
    const actions = generateDailyActions(state, checkIn({ sleep: 5, energy: 30 }))

    expect(actions).toHaveLength(3)
    expect(actions.every((action) => action.date === todayKey())).toBe(true)
    expect(actions.some((action) => action.title.includes('恢复'))).toBe(true)
  })

  it('settles completed actions with character, capital, skill, and mainline metrics', () => {
    const state = buildDemoState()
    const actions = generateDailyActions(state, checkIn())
    const completed = actions.map((action, index) => (index === 0 ? { ...action, status: 'completed' as const } : action))
    const date = todayKey()
    const settled = calculateDailySettlement({
      ...state,
      dailyActions: completed,
      actionLogs: [{
        id: 'log-1', date, text: completed[0].title, xp: completed[0].xpReward,
        capitalKey: completed[0].capitalKey, capitalXp: 20,
        skillId: completed[0].skillId, skillXp: 30, createdAt: new Date().toISOString(),
      }],
      transactions: [
        { id: 'tx-1', amount: completed[0].xpReward, source: completed[0].title, timestamp: new Date().toISOString(), kind: 'character' },
        { id: 'tx-2', amount: 20, source: completed[0].title, timestamp: new Date().toISOString(), kind: 'capital', targetKey: completed[0].capitalKey },
        { id: 'tx-3', amount: 30, source: completed[0].title, timestamp: new Date().toISOString(), kind: 'skill', targetKey: completed[0].skillId },
      ],
    })

    expect(settled.completionRate).toBeGreaterThan(0)
    expect(settled.xpEarned).toBe(completed[0].xpReward)
    expect(settled.capitalXp).toBe(20)
    expect(settled.skillXp).toBe(30)
    expect(settled.mainlineProgress).toBeGreaterThanOrEqual(0)
  })

  it('keeps a completed non-main action when the same check-in is edited', () => {
    useGameStore.getState().startDemo()
    const input = checkIn()
    useGameStore.getState().saveCheckIn(input)
    const action = useGameStore.getState().dailyActions?.find((item) => !item.mainQuestId)
    expect(action).toBeDefined()
    useGameStore.getState().completeDailyAction(action!.id)
    const xpAfterCompletion = useGameStore.getState().profile?.totalXp

    useGameStore.getState().saveCheckIn(input)
    const sameAction = useGameStore.getState().dailyActions?.find((item) => item.id === action!.id)
    expect(sameAction?.status).toBe('completed')
    expect(useGameStore.getState().profile?.totalXp).toBe(xpAfterCompletion)
  })
})
