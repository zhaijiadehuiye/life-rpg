// 持久化层：localStorage。未来迁移 IndexedDB/Supabase 只需替换本文件。
import type { GameState } from '../types'

const STORAGE_KEY = 'life-rpg:v1'
export const STORAGE_VERSION = 1

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
    if (!parsed || parsed.version !== STORAGE_VERSION || !parsed.state) return null
    return parsed.state
  } catch (err) {
    console.warn('[storage] load failed, starting fresh', err)
    return null
  }
}

export async function saveState(state: GameState): Promise<void> {
  const payload: PersistedPayload = { version: STORAGE_VERSION, savedAt: new Date().toISOString(), state }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (err) {
    console.error('[storage] save failed', err)
  }
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
    return { state: parsed.state }
  } catch {
    return { error: 'JSON 解析失败，请确认是 Life RPG 导出的备份文件。' }
  }
}
