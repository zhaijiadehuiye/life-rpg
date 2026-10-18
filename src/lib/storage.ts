// 版本化本地持久化层。未来迁移 IndexedDB/Supabase 只需替换适配器。
import type { GameState } from '../types'
import type { FailureReview, FailureReviewDraft, FailureReviewPayload, ReviewOutcome } from '../types/failureReview'
import { failureReviewBackup, latestReview, mergeFailureReviews, normalizeFailureReviews, prepareReviewDraft } from './failureReviews'
import { uuid } from '../utils/id'

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

// Independent schema: no change to the RPG v3 payload or the Historian database.
// A missing review store is empty in memory; reading never initializes or migrates real data.
export const FAILURE_REVIEW_KEY = 'life-os:failure-reviews:v1'
export const FAILURE_REVIEW_EVENT = 'life-os:failure-reviews-updated'
export function readFailureReviewPayload(): FailureReviewPayload {
  const raw = localStorage.getItem(FAILURE_REVIEW_KEY)
  return raw === null ? failureReviewBackup([]) : normalizeFailureReviews(JSON.parse(raw))
}
export function readFailureReviews(): FailureReview[] {
  return readFailureReviewPayload().reviews
}

async function mutateFailureReviews(change: (reviews: FailureReview[]) => FailureReview[]): Promise<void> {
  const write = () => {
    const payload = readFailureReviewPayload()
    const next = { ...payload, savedAt: new Date().toISOString(), reviews: change(structuredClone(payload.reviews)) }
    normalizeFailureReviews(next)
    try { localStorage.setItem(FAILURE_REVIEW_KEY, JSON.stringify(next)) }
    catch { throw new Error('保存失败，可能是浏览器空间不足或存储被禁用。输入仍在，原复盘未改变。') }
    window.dispatchEvent(new Event(FAILURE_REVIEW_EVENT))
  }
  // Serialize native tabs on browsers with Web Locks (including GitHub Pages HTTPS).
  if (typeof navigator !== 'undefined' && navigator.locks) await navigator.locks.request(FAILURE_REVIEW_KEY, write)
  else write()
}

export async function saveFailureReview(draft: FailureReviewDraft, id?: string, expectedVersion?: string): Promise<{ id: string; versionId: string }> {
  const clean = prepareReviewDraft(draft)
  const reviewId = id ?? uuid(), versionId = uuid()
  await mutateFailureReviews((reviews) => {
    const now = new Date().toISOString()
    const version = { ...clean, id: versionId, savedAt: now }
    if (!id) reviews.push({ id: reviewId, createdAt: now, versions: [version], followUps: [] })
    else {
      const row = reviews.find((review) => review.id === id)
      if (!row || latestReview(row).id !== expectedVersion) throw new Error('这条复盘已在另一个窗口修改。输入仍在，请先核对最新版本。')
      row.versions.push(version)
    }
    return reviews
  })
  return { id: reviewId, versionId }
}

export async function addFailureFollowUp(id: string, versionId: string, outcome: ReviewOutcome, note: string): Promise<void> {
  await mutateFailureReviews((reviews) => {
    const row = reviews.find((review) => review.id === id)
    if (!row || latestReview(row).id !== versionId) throw new Error('调整办法已更新。输入仍在，请先核对最新版本再回看。')
    if (!latestReview(row).nextStep) throw new Error('先写下想尝试的调整，再记录这个办法有没有帮助。')
    row.followUps.push({ id: uuid(), createdAt: new Date().toISOString(), versionId, outcome, note: note.trim() })
    return reviews
  })
}

export async function importFailureReviews(payload: FailureReviewPayload): Promise<void> {
  const incoming = normalizeFailureReviews(payload)
  await mutateFailureReviews((reviews) => mergeFailureReviews(reviews, incoming.reviews).reviews)
}
