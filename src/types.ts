export type CapitalKey = 'time' | 'money' | 'health' | 'relationships' | 'knowledge'
export type QuestType = 'main' | 'side'
export type QuestStatus = 'active' | 'completed'

export interface Character {
  name: string
  title: string
  motto: string
}

export interface Psyche {
  mood: number
  energy: number
  stress: number
  note: string
}

export interface Quest {
  id: string
  title: string
  description: string
  type: QuestType
  xp: number
  status: QuestStatus
  createdAt: string
  completedAt?: string
}

export interface ActivityLog {
  id: string
  text: string
  xp?: number
  createdAt: string
  kind: 'quest' | 'note' | 'system'
}

export interface AppData {
  schemaVersion: number
  character: Character
  capitals: Record<CapitalKey, number>
  psyche: Psyche
  xp: number
  quests: Quest[]
  logs: ActivityLog[]
  updatedAt: string
}
