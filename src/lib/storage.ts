import type { AppData, CapitalKey } from '../types'
import { makeId } from './utils'

export const STORAGE_KEY = 'life-rpg:data'
export const CURRENT_VERSION = 1

const defaultData: AppData = {
  schemaVersion: CURRENT_VERSION,
  character: { name: '冒险者', title: '正在升级的人类', motto: '把今天过成值得记录的一天。' },
  capitals: { time: 62, money: 48, health: 71, relationships: 55, knowledge: 68 },
  psyche: { mood: 72, energy: 64, stress: 28, note: '状态不错，适合推进一件重要的事。' },
  xp: 260,
  quests: [
    { id: 'quest-main-1', title: '完成今天最重要的一件事', description: '为主线目标留出一段不被打扰的专注时间。', type: 'main', xp: 80, status: 'active', createdAt: new Date().toISOString() },
    { id: 'quest-side-1', title: '整理桌面 10 分钟', description: '给明天的自己一个清爽的起点。', type: 'side', xp: 20, status: 'active', createdAt: new Date().toISOString() },
    { id: 'quest-side-2', title: '给重要的人发条消息', description: '关系资本也需要被主动投入。', type: 'side', xp: 30, status: 'active', createdAt: new Date().toISOString() },
  ],
  logs: [{ id: 'log-welcome', text: '欢迎来到人生 RPG，今天是新的存档点。', kind: 'system', createdAt: new Date().toISOString() }],
  updatedAt: new Date().toISOString(),
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function migrate(raw: unknown): AppData {
  if (!isRecord(raw)) return structuredClone(defaultData)
  const source = raw as Partial<AppData> & { schemaVersion?: number }
  const character: Record<string, unknown> = isRecord(source.character) ? source.character : {}
  const psyche: Record<string, unknown> = isRecord(source.psyche) ? source.psyche : {}
  const sourceCapitals: Record<string, unknown> = isRecord(source.capitals) ? source.capitals : {}
  const capitals = { ...defaultData.capitals }
  ;(['time', 'money', 'health', 'relationships', 'knowledge'] as CapitalKey[]).forEach((key) => {
    const value = sourceCapitals[key]
    if (typeof value === 'number' && Number.isFinite(value)) capitals[key] = Math.max(0, Math.min(100, value))
  })
  return {
    schemaVersion: CURRENT_VERSION,
    character: {
      name: typeof character.name === 'string' && character.name.trim() ? character.name : defaultData.character.name,
      title: typeof character.title === 'string' ? character.title : defaultData.character.title,
      motto: typeof character.motto === 'string' ? character.motto : defaultData.character.motto,
    },
    capitals,
    psyche: {
      mood: typeof psyche.mood === 'number' ? Math.max(0, Math.min(100, psyche.mood)) : defaultData.psyche.mood,
      energy: typeof psyche.energy === 'number' ? Math.max(0, Math.min(100, psyche.energy)) : defaultData.psyche.energy,
      stress: typeof psyche.stress === 'number' ? Math.max(0, Math.min(100, psyche.stress)) : defaultData.psyche.stress,
      note: typeof psyche.note === 'string' ? psyche.note : defaultData.psyche.note,
    },
    xp: typeof source.xp === 'number' && Number.isFinite(source.xp) ? Math.max(0, source.xp) : defaultData.xp,
    quests: Array.isArray(source.quests) ? source.quests.filter(isRecord).map((quest) => ({
      id: typeof quest.id === 'string' ? quest.id : makeId('quest'),
      title: typeof quest.title === 'string' ? quest.title : '未命名任务',
      description: typeof quest.description === 'string' ? quest.description : '',
      type: quest.type === 'main' ? 'main' : 'side',
      xp: typeof quest.xp === 'number' ? Math.max(0, quest.xp) : 20,
      status: quest.status === 'completed' ? 'completed' : 'active',
      createdAt: typeof quest.createdAt === 'string' ? quest.createdAt : new Date().toISOString(),
      completedAt: typeof quest.completedAt === 'string' ? quest.completedAt : undefined,
    })) : defaultData.quests,
    logs: Array.isArray(source.logs) ? source.logs.filter(isRecord).map((log) => ({
      id: typeof log.id === 'string' ? log.id : makeId('log'),
      text: typeof log.text === 'string' ? log.text : '记录了一次行动',
      xp: typeof log.xp === 'number' ? log.xp : undefined,
      kind: log.kind === 'quest' || log.kind === 'note' ? log.kind : 'system',
      createdAt: typeof log.createdAt === 'string' ? log.createdAt : new Date().toISOString(),
    })) : defaultData.logs,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : new Date().toISOString(),
  }
}

export function loadData(): AppData {
  if (typeof window === 'undefined') return structuredClone(defaultData)
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(defaultData)
    return migrate(JSON.parse(raw))
  } catch {
    return structuredClone(defaultData)
  }
}

export function saveData(data: AppData): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, schemaVersion: CURRENT_VERSION, updatedAt: new Date().toISOString() }))
}

export function resetData(): AppData {
  const next = structuredClone(defaultData)
  saveData(next)
  return next
}
