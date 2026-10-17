import type { ResearchState } from '../types/historian'

export const HISTORIAN_DB = 'personal-historian-db'
export const HISTORIAN_FALLBACK = `${HISTORIAN_DB}:current`
const STORE = 'workspace'
const KEY = 'current'
export const RESEARCH_COLLECTIONS = ['entries', 'hypotheses', 'evidence', 'experiments', 'predictions', 'reviews', 'backups'] as const
export type ResearchStorageMode = 'IndexedDB' | 'localStorage'

export function normalizeResearchState(input: unknown): ResearchState {
  if (input !== undefined && input !== null && (typeof input !== 'object' || Array.isArray(input))) throw new Error('档案格式无法识别，原数据未改动，请先导出备份。')
  const raw = (input ?? {}) as Partial<ResearchState>
  for (const key of RESEARCH_COLLECTIONS) {
    if (raw[key] !== undefined && !Array.isArray(raw[key])) throw new Error(`档案中的 ${key} 无法读取，原数据未改动。`)
  }
  const timestamp = new Date().toISOString()
  return {
    ...raw, schemaVersion: raw.schemaVersion ?? 1, appVersion: raw.appVersion ?? '0.1',
    createdAt: raw.createdAt ?? timestamp, updatedAt: raw.updatedAt ?? timestamp, seeded: raw.seeded ?? false,
    entries: raw.entries ?? [], hypotheses: raw.hypotheses ?? [], evidence: raw.evidence ?? [],
    experiments: raw.experiments ?? [], predictions: raw.predictions ?? [], reviews: raw.reviews ?? [], backups: raw.backups ?? [],
  }
}

function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (!globalThis.indexedDB) { resolve(null); return }
    const request = indexedDB.open(HISTORIAN_DB, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
}

function fallbackState() {
  try {
    const raw = localStorage.getItem(HISTORIAN_FALLBACK)
    return raw === null ? null : normalizeResearchState(JSON.parse(raw))
  } catch { throw new Error('本机备用档案无法读取，原内容未改动。请检查浏览器存储权限，并保留原备份。') }
}

export async function readResearchWorkspace(): Promise<{ state: ResearchState; mode: ResearchStorageMode }> {
  const db = await openDatabase()
  if (!db) return { state: fallbackState() ?? normalizeResearchState(null), mode: 'localStorage' }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const request = tx.objectStore(STORE).get(KEY)
    tx.oncomplete = () => {
      db.close()
      try {
        const fallback = request.result == null ? fallbackState() : null
        resolve({ state: normalizeResearchState(request.result ?? fallback), mode: fallback ? 'localStorage' : 'IndexedDB' })
      } catch (error) { reject(error) }
    }
    tx.onabort = tx.onerror = () => { db.close(); reject(new Error('无法读取本机档案，原数据未改动，请稍后重试。')) }
  })
}

/** Guard the immutable originals and append-only revision prefixes, including accidental future edits. */
export function assertResearchPreserved(before: ResearchState, after: ResearchState) {
  for (const key of RESEARCH_COLLECTIONS) {
    const ids = new Set(after[key].map((row) => row.id))
    if (ids.size !== after[key].length) throw new Error('记录编号重复，已停止保存。')
    for (const original of before[key]) {
      if (!ids.has(original.id)) throw new Error('操作会移除已有档案，已停止保存。')
    }
  }
  const entries = new Map(after.entries.map((entry) => [entry.id, entry]))
  for (const original of before.entries) {
    const next = entries.get(original.id)!
    const revisions = original.revisions ?? []
    if (next.originalText !== original.originalText || revisions.some((revision, index) => JSON.stringify(next.revisions?.[index]) !== JSON.stringify(revision))) {
      throw new Error('原文和已有修订不可覆盖，已停止保存。请追加一个新版本。')
    }
    if (next.currentText !== original.currentText && ((next.revisions?.length ?? 0) <= revisions.length || next.revisions[next.revisions.length - 1]?.text !== next.currentText)) throw new Error('内容修改必须追加新版本，已停止保存。')
  }
}

function applyChange(before: ResearchState, change: (draft: ResearchState) => void): ResearchState {
  const next = structuredClone(before)
  change(next)
  assertResearchPreserved(before, next)
  next.updatedAt = new Date().toISOString()
  return next
}

/** Read latest and write in ONE transaction: native tabs append without overwriting each other's work. */
export async function updateResearchWorkspace(change: (draft: ResearchState) => void, expectedMode?: ResearchStorageMode): Promise<{ state: ResearchState; mode: ResearchStorageMode }> {
  const db = await openDatabase()
  if (!db) {
    if (expectedMode === 'IndexedDB') throw new Error('原档案暂时无法访问，已停止保存，不会改用空白档案。输入仍在，请重试。')
    const next = applyChange(fallbackState() ?? normalizeResearchState(null), change)
    try { localStorage.setItem(HISTORIAN_FALLBACK, JSON.stringify(next)) } catch { throw new Error('保存失败，可能是浏览器空间不足或存储被禁用。输入仍在，原档案未改变。') }
    return { state: next, mode: 'localStorage' }
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const request = store.get(KEY)
    let next: ResearchState
    let failure: unknown
    let fallback = false
    request.onsuccess = () => {
      try {
        const previous = request.result == null ? fallbackState() : null
        fallback = previous !== null
        if (expectedMode && expectedMode !== (fallback ? 'localStorage' : 'IndexedDB')) throw new Error('档案存储位置发生变化，已停止保存。输入仍在，请重新读取后核对。')
        next = applyChange(normalizeResearchState(request.result ?? previous), change)
        // Keep an existing fallback in its original location; no automatic migration.
        if (fallback) localStorage.setItem(HISTORIAN_FALLBACK, JSON.stringify(next))
        else store.put(next, KEY)
      } catch (error) { failure = error; tx.abort() }
    }
    tx.oncomplete = () => { db.close(); resolve({ state: next, mode: fallback ? 'localStorage' : 'IndexedDB' }) }
    tx.onabort = tx.onerror = () => { db.close(); reject(failure ?? new Error('保存失败，原档案仍保留。请备份后检查浏览器空间或权限，再重试。')) }
  })
}
