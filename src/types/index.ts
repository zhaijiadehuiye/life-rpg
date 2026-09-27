// Life RPG — 全局数据模型
// 所有 ID 使用 UUID（运行时生成），时间使用 ISO 字符串。

export type Difficulty = 'easy' | 'normal' | 'hard' | 'epic'

export type CapitalKey =
  | 'physical' | 'cultural' | 'economic' | 'social' | 'symbolic' | 'time'

export type MentalKey =
  | 'energy' | 'focus' | 'stress' | 'mood' | 'selfEfficacy' | 'socialBattery'

export type BuffType = 'buff' | 'debuff'

export interface UserProfile {
  id: string
  name: string
  createdAt: string
  lastActiveDate: string
  totalXp: number
  level: number
  streak: number
  longestStreak: number
  startedWithDemo: boolean
}

export interface MentalState {
  date: string
  energy: number
  focus: number
  stress: number
  mood: number
  selfEfficacy: number
  socialBattery: number
}

export interface Capital {
  key: CapitalKey
  name: string
  level: number
  xp: number
  xpToNext: number
}

export interface Skill {
  id: string
  name: string
  category: string
  level: number
  xp: number
  xpToNext: number
  totalMinutes: number
  createdAt: string
}

export interface QuestMilestone {
  id: string
  title: string
  completed: boolean
  completedAt?: string
}

export interface MainQuest {
  id: string
  kind: 'main'
  title: string
  description: string
  domain: string
  startDate: string
  targetDate?: string
  difficulty: Difficulty
  milestones: QuestMilestone[]
  status: 'active' | 'completed' | 'paused'
  createdAt: string
  completedAt?: string
}

export interface SideQuest {
  id: string
  kind: 'side'
  title: string
  description: string
  difficulty: Difficulty
  xpReward: number
  capitalKey?: CapitalKey
  skillId?: string
  minutes?: number
  completed: boolean
  completedAt?: string
  createdAt: string
}

export interface DailyQuest {
  id: string
  kind: 'daily'
  title: string
  description: string
  difficulty: Difficulty
  xpReward: number
  capitalKey?: CapitalKey
  skillId?: string
  minutes?: number
  lastCompletedDate?: string
  createdAt: string
}

export interface RandomEvent {
  id: string
  kind: 'event'
  title: string
  description: string
  createdAt: string
  status: 'pending' | 'accepted' | 'ignored' | 'done'
  outcome?: string
}

export interface StatusEffect {
  id: string
  name: string
  description: string
  icon: string
  type: BuffType
  source: 'derived' | 'manual'
}

export interface DailyLog {
  date: string
  whatHappened: string
  bestThing: string
  biggestDifficulty: string
  didRight: string
  tomorrowPriority: string
  tasksCompleted: number
  xpEarned: number
}

export interface LifeDomain {
  key: string
  name: string
  importance: number
  satisfaction: number
  investment: number
  selected: boolean
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  target: number
  progress: number
  unlockedAt?: string
}

export interface XPTransaction {
  id: string
  amount: number
  source: string
  timestamp: string
  kind: 'character' | 'capital' | 'skill'
  targetKey?: string
}

export interface MapNode {
  id: string
  title: string
  subtitle: string
  status: 'locked' | 'available' | 'completed'
  x: number
  y: number
}

export interface GameState {
  initialized: boolean
  profile: UserProfile | null
  mental: MentalState
  capitals: Capital[]
  skills: Skill[]
  mainQuests: MainQuest[]
  sideQuests: SideQuest[]
  dailyQuests: DailyQuest[]
  randomEvents: RandomEvent[]
  effects: StatusEffect[]
  logs: DailyLog[]
  domains: LifeDomain[]
  achievements: Achievement[]
  transactions: XPTransaction[]
  mapNodes: MapNode[]
}
