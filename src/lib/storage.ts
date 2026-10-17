// 版本化本地持久化层。未来迁移 IndexedDB/Supabase 只需替换适配器。
import type { GameState } from '../types'

const STORAGE_KEY = 'life-rpg:v1'
// Native research pages keep using the existing Historian schema-1 IndexedDB via historianStorage.ts.
// This game payload stays at v3; presenting the two stores together does not migrate either one.
export const STORAGE_VERSION = 3

export interface PersistedPayload {
  version: number
  savedAt: string
  state: GameState
}

export async function loadState(): Promise<GameState | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedPayload
    if (!parsed || !parsed.state) return null
    return migrateState(parsed.state, parsed.version)
  } catch (err) {
    console.warn('[storage] load failed, starting fresh', err)
    return null
  }
}

export async function saveState(state: GameState): Promise<void> {
  try {
    persistState(state)
  } catch (err) {
    console.error('[storage] save failed', err)
  }
}

// Synchronous, throwing variant for forms that must confirm durable storage before closing.
export function persistState(state: GameState): void {
  const payload: PersistedPayload = { version: STORAGE_VERSION, savedAt: new Date().toISOString(), state }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export async function clearState(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY)
}

export function exportState(state: GameState): string {
  return JSON.stringify({ version: STORAGE_VERSION, savedAt: new Date().toISOString(), state }, null, 2)
}

export function parseImport(text: string): { state?: GameState; error?: string } {
  try {
    const parsed = JSON.parse(text) as PersistedPayload
    if (!parsed || !parsed.state || !parsed.state.profile) {
      return { error: '文件格式不正确：缺少 state 或 profile 字段。' }
    }
    return { state: migrateState(parsed.state, parsed.version) }
  } catch {
    return { error: 'JSON 解析失败，请确认是 Life RPG 导出的备份文件。' }
  }
}

function migrateState(state: GameState, version: number): GameState {
  // Add collections only; keep every original log/check-in and never write during loading.
  if (![1, 2, STORAGE_VERSION].includes(version)) return state
  return {
    ...state,
    checkIns: state.checkIns ?? {},
    dailyActions: state.dailyActions ?? [],
    actionLogs: state.actionLogs ?? [],
    settlements: state.settlements ?? [],
    timeEntries: state.timeEntries ?? [],
  }
}
