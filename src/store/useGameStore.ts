// ============================================================
// 全局状态仓库（Zustand）
// ============================================================

import { create } from 'zustand'
import type {
  Capital,
  CapitalKey,
  DailyLog,
  DailyQuest,
  GameState,
  LifeDomain,
  MainQuest,
  MentalKey,
  MentalState,
  QuestMilestone,
  SideQuest,
  Skill,
  StatusEffect,
  ActionLog,
  DailyCheckIn,
} from '../types'
import { uuid } from '../utils/id'

type MainQuestPatch = Omit<Partial<MainQuest>, 'milestones'> & { milestones?: string[] }
import { todayKey, diffDays, dateKeyFromTimestamp } from '../utils/date'
import {
  MAX_DAILY_CHARACTER_XP,
  levelFromTotalXp,
  xpToNextCapitalPoint,
  xpToNextSkillLevel,
} from '../utils/xp'
import {
  buildDefaultCapitals,
  DEFAULT_ACHIEVEMENTS,
  DEFAULT_DOMAINS,
  DEFAULT_MAP_NODES,
  newEventFromPool,
} from '../data/constants'
import { buildDemoState } from '../data/demo'
import { loadState, saveState, clearState, exportState, parseImport } from '../services/storage'
import { calculateDailySettlement, generateDailyActions } from '../data/dailyRules'

const emptyMental = (): MentalState => ({
  date: todayKey(),
  energy: 60,
  focus: 60,
  stress: 40,
  mood: 60,
  selfEfficacy: 50,
  socialBattery: 60,
})

const initialState: GameState = {
  initialized: false,
  profile: null,
  mental: emptyMental(),
  capitals: [],
  skills: [],
  mainQuests: [],
  sideQuests: [],
  dailyQuests: [],
  randomEvents: [],
  effects: [],
  logs: [],
  domains: DEFAULT_DOMAINS,
  achievements: [],
  transactions: [],
  mapNodes: DEFAULT_MAP_NODES,
  checkIns: {},
  dailyActions: [],
  actionLogs: [],
  settlements: [],
}

function grantCharacterXp(
  state: GameState,
  amount: number,
  source: string,
): Pick<GameState, 'profile' | 'transactions'> {
  if (!state.profile) return { profile: state.profile, transactions: state.transactions }
  const today = todayKey()
  const todayGain = state.transactions
    .filter((t) => t.kind === 'character' && dateKeyFromTimestamp(t.timestamp) === today)
    .reduce((s, t) => s + t.amount, 0)
  const allowed = Math.max(0, MAX_DAILY_CHARACTER_XP - todayGain)
  const granted = Math.min(amount, allowed)
  const newTotal = state.profile.totalXp + granted
  const lv = levelFromTotalXp(newTotal)
  return {
    profile: { ...state.profile, totalXp: newTotal, level: lv.level },
    transactions: [
      ...state.transactions,
      { id: uuid(), amount: granted, source, timestamp: new Date().toISOString(), kind: 'character' as const },
    ],
  }
}

function grantCapitalXp(cap: Capital, amount: number): Capital {
  let { level, xp, xpToNext } = cap
  xp += amount
  while (xp >= xpToNext && level < 100) {
    xp -= xpToNext
    level += 1
    xpToNext = xpToNextCapitalPoint(level)
  }
  if (level >= 100) xp = Math.min(xp, xpToNext)
  return { ...cap, level, xp, xpToNext }
}

function grantSkillXp(skill: Skill, amount: number, minutes: number): Skill {
  let { level, xp, xpToNext, totalMinutes } = skill
  xp += amount
  totalMinutes += minutes
  while (xp >= xpToNext) {
    xp -= xpToNext
    level += 1
    xpToNext = xpToNextSkillLevel(level)
  }
  return { ...skill, level, xp, xpToNext, totalMinutes }
}

function deriveEffects(m: MentalState, streak: number, daysSinceMain: number): StatusEffect[] {
  const out: StatusEffect[] = []
  if (m.energy >= 70 && m.focus >= 70)
    out.push({ id: uuid(), name: '精力充沛', description: '执行效率与学习 XP 加成。', icon: 'zap', type: 'buff', source: 'derived' })
  if (m.focus >= 80)
    out.push({ id: uuid(), name: '深度专注', description: '学习类任务奖励更高。', icon: 'brain', type: 'buff', source: 'derived' })
  if (streak >= 3)
    out.push({ id: uuid(), name: '连续行动', description: '已连续推进，状态在累积。', icon: 'flame', type: 'buff', source: 'derived' })
  if (m.energy <= 35)
    out.push({ id: uuid(), name: '睡眠不足', description: '当前发挥率下降，优先恢复。', icon: 'moon-star', type: 'debuff', source: 'derived' })
  if (m.stress >= 75)
    out.push({ id: uuid(), name: '高压力', description: '建议减少高认知任务，做轻量恢复。', icon: 'cloud-rain', type: 'debuff', source: 'derived' })
  if (m.socialBattery <= 25)
    out.push({ id: uuid(), name: '社交过载', description: '系统优先推荐独处恢复类任务。', icon: 'users', type: 'debuff', source: 'derived' })
  if (daysSinceMain >= 3)
    out.push({ id: uuid(), name: '主线搁置', description: '主线已数日未推进，可拆一个 15 分钟的小步。', icon: 'pause-circle', type: 'debuff', source: 'derived' })
  return out
}

interface StoreActions {
  hydrate: () => Promise<void>
  startDemo: () => void
  completeOnboarding: (args: {
    name: string
    selectedDomains: string[]
    capitalRatings: Partial<Record<CapitalKey, number>>
    initialMental: Omit<MentalState, 'date'>
    firstMainQuestTitle: string
  }) => void
  updateMental: (key: MentalKey, value: number) => void
  saveCheckIn: (checkIn: Omit<DailyCheckIn, 'createdAt'>) => void
  completeDailyAction: (id: string) => void
  settleToday: () => void
  addSideQuest: (q: Omit<SideQuest, 'id' | 'kind' | 'completed' | 'createdAt'>) => void
  addDailyQuest: (q: Omit<DailyQuest, 'id' | 'kind' | 'lastCompletedDate' | 'createdAt'>) => void
  addMainQuest: (q: Omit<MainQuest, 'id' | 'kind' | 'milestones' | 'status' | 'createdAt'> & { milestones: string[] }) => void
  updateSideQuest: (id: string, patch: Partial<SideQuest>) => void
  updateDailyQuest: (id: string, patch: Partial<DailyQuest>) => void
  updateMainQuest: (id: string, patch: MainQuestPatch) => void
  toggleMilestone: (mainId: string, mileId: string) => void
  completeSideQuest: (id: string) => void
  completeDailyQuest: (id: string) => void
  skipSideQuest: (id: string) => void
  deleteQuest: (kind: 'side' | 'daily' | 'main', id: string) => void
  acceptEvent: (id: string) => void
  ignoreEvent: (id: string) => void
  newRandomEvent: () => void
  addSkill: (name: string, category: string) => void
  writeLog: (log: Omit<DailyLog, 'date'>) => void
  updateDomain: (key: string, patch: Partial<Pick<LifeDomain, 'importance' | 'satisfaction' | 'investment'>>) => void
  setMapNodeStatus: (id: string, status: 'locked' | 'available' | 'completed') => void
  resetAll: () => void
  importJson: (text: string) => { ok: boolean; error?: string }
  downloadBackup: () => void
}

export type GameStore = GameState & StoreActions

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,
  achievements: DEFAULT_ACHIEVEMENTS,

  hydrate: async () => {
    const saved = await loadState()
    if (saved) {
      const today = todayKey()
      const mental: MentalState =
        saved.mental.date === today ? saved.mental : { ...saved.mental, date: today }
      let profile = saved.profile
      if (profile) {
        const gap = diffDays(profile.lastActiveDate, today)
        if (gap === 1) profile = { ...profile, lastActiveDate: today }
        else if (gap > 1) profile = { ...profile, streak: 0, lastActiveDate: today }
      }
      set({
        ...saved,
        mental,
        profile,
        effects: deriveEffects(mental, profile?.streak ?? 0, daysSinceLastMainProgress(saved)),
      })
      return
    }
    set({ ...initialState, mental: emptyMental(), achievements: DEFAULT_ACHIEVEMENTS })
  },

  startDemo: () => {
    const demo = buildDemoState()
    set(demo)
    void saveState(demo)
  },

  completeOnboarding: ({ name, selectedDomains, capitalRatings, initialMental, firstMainQuestTitle }) => {
    const t = todayKey()
    const profile = {
      id: uuid(),
      name: name.trim() || '无名冒险者',
      createdAt: t,
      lastActiveDate: t,
      totalXp: 0,
      level: 1,
      streak: 1,
      longestStreak: 1,
      startedWithDemo: false,
    }
    const mental: MentalState = { date: t, ...initialMental }
    const domains = DEFAULT_DOMAINS.map((d) => ({ ...d, selected: selectedDomains.includes(d.key) }))
    const state: GameState = {
      ...initialState,
      initialized: true,
      profile,
      mental,
      capitals: buildDefaultCapitals(capitalRatings),
      domains,
      achievements: DEFAULT_ACHIEVEMENTS,
      mapNodes: DEFAULT_MAP_NODES,
      mainQuests: firstMainQuestTitle.trim()
        ? [
            {
              id: uuid(),
              kind: 'main' as const,
              title: firstMainQuestTitle.trim(),
              description: '这是你的第一条主线。可以随时添加阶段。',
              domain: selectedDomains[0] ?? 'career',
              startDate: t,
              difficulty: 'normal' as const,
              status: 'active' as const,
              createdAt: t,
              milestones: [
                { id: uuid(), title: '迈出第一步', completed: false },
                { id: uuid(), title: '形成初步节奏', completed: false },
                { id: uuid(), title: '完成它', completed: false },
              ],
            },
          ]
        : [],
      effects: deriveEffects(mental, 1, 99),
    }
    set(state)
    void saveState(state)
  },

  updateMental: (key, value) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value)))
    set((s) => {
      const mental = { ...s.mental, [key]: clamped }
      return { mental, effects: deriveEffects(mental, s.profile?.streak ?? 0, daysSinceLastMainProgress(s)) }
    })
    persistAfter(get)
  },

  saveCheckIn: (checkIn) => {
    const current = get()
    const full: DailyCheckIn = { ...checkIn, createdAt: new Date().toISOString() }
    const generated = generateDailyActions(current, full)
    const previous = current.dailyActions ?? []
    const dailyActions = generated.map((action) => {
      const old = previous.find((item) => item.id === action.id && item.date === action.date)
      const sameTarget = old?.mainQuestId === action.mainQuestId && old?.milestoneId === action.milestoneId
      return old?.status === 'completed' && sameTarget ? { ...action, status: 'completed' as const } : action
    })
    const nextState: GameState = { ...current, checkIns: { ...(current.checkIns ?? {}), [full.date]: full }, mental: { date: full.date, energy: full.energy, focus: full.focus, stress: full.stress, mood: full.mood, selfEfficacy: full.selfEfficacy, socialBattery: current.mental.socialBattery }, dailyActions, effects: deriveEffects({ ...current.mental, date: full.date, energy: full.energy, focus: full.focus, stress: full.stress, mood: full.mood, selfEfficacy: full.selfEfficacy }, current.profile?.streak ?? 0, daysSinceLastMainProgress(current)) }
    set(nextState)
    persistAfter(get)
  },

  completeDailyAction: (id) => {
    const action = get().dailyActions?.find((item) => item.id === id)
    if (!action || action.status === 'completed') return
    set((s) => ({
      dailyActions: (s.dailyActions ?? []).map((item) => item.id === id ? { ...item, status: 'completed' as const } : item),
      mainQuests: action.mainQuestId && action.milestoneId
        ? s.mainQuests.map((quest) => {
            if (quest.id !== action.mainQuestId) return quest
            const milestones = quest.milestones.map((milestone) => milestone.id === action.milestoneId
              ? { ...milestone, completed: true, completedAt: todayKey() }
              : milestone)
            const complete = milestones.every((milestone) => milestone.completed)
            return { ...quest, milestones, status: complete ? 'completed' as const : 'active' as const, completedAt: complete ? todayKey() : undefined }
          })
        : s.mainQuests,
    }))
    applyRewards(set, get, { characterXp: action.xpReward, capitalKey: action.capitalKey, skillId: action.skillId, minutes: action.minutes ?? 0, source: `今日行动：${action.title}` })
    bumpStreakAndAchievements(set)
    const capitalXp = action.capitalKey ? Math.round(action.xpReward * 0.4) : 0
    const skillXp = action.skillId ? Math.round(action.xpReward * 0.8) : 0
    const log: ActionLog = { id: uuid(), date: action.date, text: action.title, xp: action.xpReward, capitalKey: action.capitalKey, capitalXp, skillId: action.skillId, skillXp, createdAt: new Date().toISOString() }
    set((s) => ({ actionLogs: [...(s.actionLogs ?? []), log] }))
    persistAfter(get)
  },

  settleToday: () => {
    const summary = calculateDailySettlement(get())
    set((s) => ({ settlements: [summary, ...(s.settlements ?? []).filter((item) => item.date !== summary.date)] }))
    persistAfter(get)
  },

  addSideQuest: (q) => {
    const item: SideQuest = { ...q, id: uuid(), kind: 'side', completed: false, createdAt: new Date().toISOString() }
    set((s) => ({ sideQuests: [...s.sideQuests, item] }))
    persistAfter(get)
  },

  addDailyQuest: (q) => {
    const item: DailyQuest = { ...q, id: uuid(), kind: 'daily', createdAt: new Date().toISOString() }
    set((s) => ({ dailyQuests: [...s.dailyQuests, item] }))
    persistAfter(get)
  },

  addMainQuest: (q) => {
    const { milestones, ...rest } = q
    const item: MainQuest = {
      ...rest,
      id: uuid(),
      kind: 'main',
      status: 'active',
      createdAt: new Date().toISOString(),
      milestones: milestones.map((t) => ({ id: uuid(), title: t, completed: false })),
    }
    set((s) => ({ mainQuests: [...s.mainQuests, item] }))
    persistAfter(get)
  },

  updateSideQuest: (id, patch) => {
    set((s) => ({ sideQuests: s.sideQuests.map((x) => (x.id === id ? { ...x, ...patch } : x)) }))
    persistAfter(get)
  },

  updateDailyQuest: (id, patch) => {
    set((s) => ({ dailyQuests: s.dailyQuests.map((x) => (x.id === id ? { ...x, ...patch } : x)) }))
    persistAfter(get)
  },

  updateMainQuest: (id, patch) => {
    set((s) => ({
      mainQuests: s.mainQuests.map((m) => {
        if (m.id !== id) return m
        const { milestones, ...rest } = patch
        const next: MainQuest = { ...m, ...rest }
        if (milestones) {
          next.milestones = milestones.map((t, i): QuestMilestone => {
            const existing = m.milestones[i]
            return existing ? { ...existing, title: t } : { id: uuid(), title: t, completed: false }
          })
        }
        return next
      }),
    }))
    persistAfter(get)
  },

  toggleMilestone: (mainId, mileId) => {
    const before = get().mainQuests.find((m) => m.id === mainId)?.milestones.find((x) => x.id === mileId)
    set((s) => ({
      mainQuests: s.mainQuests.map((m) => {
        if (m.id !== mainId) return m
        const milestones = m.milestones.map((mi) =>
          mi.id === mileId ? { ...mi, completed: !mi.completed, completedAt: !mi.completed ? todayKey() : undefined } : mi,
        )
        const allDone = milestones.every((x) => x.completed)
        return { ...m, milestones, status: allDone ? 'completed' : 'active', completedAt: allDone ? todayKey() : undefined }
      }),
    }))
    const after = get().mainQuests.find((m) => m.id === mainId)?.milestones.find((x) => x.id === mileId)
    if (after?.completed && !before?.completed) {
      applyRewards(set, get, { characterXp: 30, source: `里程碑：${after.title}` })
    }
    persistAfter(get)
  },

  completeSideQuest: (id) => {
    const q = get().sideQuests.find((x) => x.id === id)
    if (!q || q.completed) return
    set((s) => ({
      sideQuests: s.sideQuests.map((x) => (x.id === id ? { ...x, completed: true, completedAt: todayKey() } : x)),
    }))
    applyRewards(set, get, {
      characterXp: q.xpReward,
      capitalKey: q.capitalKey,
      skillId: q.skillId,
      minutes: q.minutes ?? 0,
      source: q.title,
    })
    bumpStreakAndAchievements(set)
    persistAfter(get)
  },

  completeDailyQuest: (id) => {
    const q = get().dailyQuests.find((x) => x.id === id)
    if (!q) return
    const today = todayKey()
    if (q.lastCompletedDate === today) return
    set((s) => ({
      dailyQuests: s.dailyQuests.map((x) => (x.id === id ? { ...x, lastCompletedDate: today } : x)),
    }))
    applyRewards(set, get, {
      characterXp: q.xpReward,
      capitalKey: q.capitalKey,
      skillId: q.skillId,
      minutes: q.minutes ?? 0,
      source: `日常：${q.title}`,
    })
    bumpStreakAndAchievements(set)
    persistAfter(get)
  },

  skipSideQuest: (id) => {
    set((s) => ({ sideQuests: s.sideQuests.filter((x) => x.id !== id) }))
    persistAfter(get)
  },

  deleteQuest: (kind, id) => {
    set((s) => {
      if (kind === 'side') return { sideQuests: s.sideQuests.filter((x) => x.id !== id) }
      if (kind === 'daily') return { dailyQuests: s.dailyQuests.filter((x) => x.id !== id) }
      return { mainQuests: s.mainQuests.filter((x) => x.id !== id) }
    })
    persistAfter(get)
  },

  acceptEvent: (id) => {
    set((s) => ({ randomEvents: s.randomEvents.map((e) => (e.id === id ? { ...e, status: 'accepted' } : e)) }))
    persistAfter(get)
  },
  ignoreEvent: (id) => {
    set((s) => ({ randomEvents: s.randomEvents.map((e) => (e.id === id ? { ...e, status: 'ignored' } : e)) }))
    persistAfter(get)
  },
  newRandomEvent: () => {
    set((s) => ({ randomEvents: [newEventFromPool(), ...s.randomEvents] }))
    persistAfter(get)
  },

  addSkill: (name, category) => {
    const skill: Skill = {
      id: uuid(),
      name: name.trim(),
      category,
      level: 1,
      xp: 0,
      xpToNext: xpToNextSkillLevel(1),
      totalMinutes: 0,
      createdAt: new Date().toISOString(),
    }
    set((s) => ({ skills: [...s.skills, skill] }))
    persistAfter(get)
  },

  writeLog: (log) => {
    const today = todayKey()
    set((s) => {
      const entry: DailyLog = { ...log, date: today }
      const logs = s.logs.some((l) => l.date === today)
        ? s.logs.map((l) => (l.date === today ? entry : l))
        : [entry, ...s.logs]
      const achievements = s.achievements.map((a) => {
        if (a.id !== 'journal-7') return a
        const progress = Math.min(a.target, a.progress + 1)
        return { ...a, progress, unlockedAt: progress >= a.target && !a.unlockedAt ? today : a.unlockedAt }
      })
      return { logs, achievements }
    })
    persistAfter(get)
  },

  updateDomain: (key, patch) => {
    set((s) => ({ domains: s.domains.map((d) => (d.key === key ? { ...d, ...patch } : d)) }))
    persistAfter(get)
  },

  setMapNodeStatus: (id, status) => {
    set((s) => ({ mapNodes: s.mapNodes.map((n) => (n.id === id ? { ...n, status } : n)) }))
    persistAfter(get)
  },

  resetAll: () => {
    void clearState()
    set({ ...initialState, mental: emptyMental(), achievements: DEFAULT_ACHIEVEMENTS })
  },

  importJson: (text) => {
    const { state, error } = parseImport(text)
    if (error || !state) return { ok: false, error }
    set(state)
    void saveState(state)
    return { ok: true }
  },

  downloadBackup: () => {
    const state = get()
    const blob = new Blob([exportState(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `life-rpg-backup-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
  },
}))

function persistAfter(get: () => GameStore) {
  void saveState(get())
}

type RewardInput = {
  characterXp: number
  capitalKey?: CapitalKey
  skillId?: string
  minutes?: number
  source: string
}

type SetFn = (fn: (s: GameStore) => Partial<GameStore>) => void

function applyRewards(set: SetFn, get: () => GameStore, r: RewardInput) {
  set((s) => {
    const next: Partial<GameStore> = {}
    const c = grantCharacterXp(s, r.characterXp, r.source)
    next.profile = c.profile
    const transactions = [...c.transactions]
    if (r.capitalKey) {
      const amount = Math.round(r.characterXp * 0.4)
      next.capitals = s.capitals.map((cap) =>
        cap.key === r.capitalKey ? grantCapitalXp(cap, amount) : cap,
      )
      transactions.push({ id: uuid(), amount, source: r.source, timestamp: new Date().toISOString(), kind: 'capital' as const, targetKey: r.capitalKey })
    }
    if (r.skillId) {
      const amount = Math.round(r.characterXp * 0.8)
      next.skills = s.skills.map((sk) =>
        sk.id === r.skillId ? grantSkillXp(sk, amount, r.minutes ?? 0) : sk,
      )
      transactions.push({ id: uuid(), amount, source: r.source, timestamp: new Date().toISOString(), kind: 'skill' as const, targetKey: r.skillId })
    }
    next.transactions = transactions
    return next
  })
  set((s) => {
    const achievements = s.achievements.map((a) => {
      if (a.id === 'first-quest') {
        const progress = Math.min(a.target, a.progress + 1)
        return { ...a, progress, unlockedAt: progress >= a.target && !a.unlockedAt ? todayKey() : a.unlockedAt }
      }
      if (a.id === 'learn-10h') {
        const mins = s.skills.reduce((sum, sk) => sum + sk.totalMinutes, 0)
        const progress = Math.min(a.target, mins)
        return { ...a, progress, unlockedAt: progress >= a.target && !a.unlockedAt ? todayKey() : a.unlockedAt }
      }
      return a
    })
    return { achievements }
  })
}

function bumpStreakAndAchievements(set: SetFn) {
  set((s) => {
    if (!s.profile) return {}
    const today = todayKey()
    const gap = diffDays(s.profile.lastActiveDate, today)
    let streak = s.profile.streak
    if (gap === 1) streak = s.profile.streak + 1
    else if (gap === 0) streak = s.profile.streak
    else streak = 1
    const createdAt = s.profile.createdAt
    const profile = {
      ...s.profile,
      streak,
      lastActiveDate: today,
      longestStreak: Math.max(s.profile.longestStreak, streak),
    }
    const achievements = s.achievements.map((a) => {
      if (a.id === 'streak-7') {
        const progress = Math.min(a.target, streak)
        return { ...a, progress, unlockedAt: progress >= a.target && !a.unlockedAt ? today : a.unlockedAt }
      }
      if (a.id === 'streak-30') {
        const daysUsed = Math.max(1, diffDays(createdAt, today) + 1)
        const progress = Math.min(a.target, daysUsed)
        return { ...a, progress, unlockedAt: progress >= a.target && !a.unlockedAt ? today : a.unlockedAt }
      }
      return a
    })
    return { profile, achievements }
  })
}

function daysSinceLastMainProgress(s: GameState): number {
  if (!s.mainQuests.length) return 99
  const t = todayKey()
  let best = 99
  for (const mq of s.mainQuests) {
    for (const m of mq.milestones) {
      if (m.completedAt) best = Math.min(best, diffDays(m.completedAt, t))
    }
  }
  return best
}
