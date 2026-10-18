import type { FailureReview, FailureReviewDraft, FailureReviewPayload, ReviewOutcome } from '../types/failureReview'
import { addDays, todayKey } from '../utils/date'
import { uuid } from '../utils/id'

export const REVIEW_FACTORS = ['手机干扰', '开始太难', '状态不足', '安排变化', '时间不够', '还不确定']
export const OUTCOME_LABELS: Record<ReviewOutcome, string> = { helped: '有帮助', 'not-helped': '没帮助', 'not-tried': '还没尝试' }
export const latestReview = (review: FailureReview) => review.versions[review.versions.length - 1]
export function latestFollowUp(review: FailureReview) {
  const rows = review.followUps.filter((row) => row.versionId === latestReview(review).id)
  return rows[rows.length - 1]
}
export function reviewStatus(review: FailureReview) {
  const outcome = latestFollowUp(review)?.outcome
  return outcome ? OUTCOME_LABELS[outcome] : latestReview(review).nextStep ? '待尝试' : '待整理'
}
export function validReviewDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T12:00:00`)
  return !Number.isNaN(parsed.getTime()) && todayKey(parsed) === value
}
export function prepareReviewDraft(draft: FailureReviewDraft): FailureReviewDraft {
  if (!validReviewDate(draft.date) || draft.date > todayKey()) throw new Error('请选择今天或过去的有效日期。')
  if (!draft.expected.trim() || !draft.actual.trim()) throw new Error('请先写下原本想做什么，以及实际发生了什么。')
  return { ...draft, expected: draft.expected.trim(), actual: draft.actual.trim(), factors: [...new Set(draft.factors)], nextStep: draft.nextStep.trim() }
}

/** Strict, non-writing schema-1 reader. Unknown fields survive backups and edits. */
export function normalizeFailureReviews(input: unknown): FailureReviewPayload {
  const fail = () => { throw new Error('失败复盘档案无法完整读取，原数据未改动。请保留备份并检查文件版本。') }
  if (!input || typeof input !== 'object') return fail()
  const raw = input as FailureReviewPayload
  if (raw.product !== 'Life OS failure reviews' || raw.version !== 1 || !Array.isArray(raw.reviews)) return fail()
  const ids = new Set<string>()
  const timestamp = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value))
  const id = (value: unknown): value is string => typeof value === 'string' && value.length > 0
  if (!timestamp(raw.savedAt)) return fail()
  for (const review of raw.reviews) {
    if (!review || !id(review.id) || ids.has(review.id) || !timestamp(review.createdAt) || !Array.isArray(review.versions) || !review.versions.length || !Array.isArray(review.followUps)) return fail()
    ids.add(review.id)
    const versions = new Set<string>(), follows = new Set<string>()
    for (const row of review.versions) {
      if (!row || !id(row.id) || versions.has(row.id) || !timestamp(row.savedAt) || typeof row.date !== 'string' || !validReviewDate(row.date) || typeof row.expected !== 'string' || !row.expected.trim() || typeof row.actual !== 'string' || !row.actual.trim() || typeof row.nextStep !== 'string' || !Array.isArray(row.factors) || row.factors.some((tag) => typeof tag !== 'string')) return fail()
      versions.add(row.id)
    }
    for (const row of review.followUps) {
      if (!row || !id(row.id) || follows.has(row.id) || !timestamp(row.createdAt) || !versions.has(row.versionId) || !Object.prototype.hasOwnProperty.call(OUTCOME_LABELS, row.outcome) || typeof row.note !== 'string') return fail()
      follows.add(row.id)
    }
  }
  return raw
}

export function failureReviewBackup(reviews: FailureReview[]): FailureReviewPayload {
  return { product: 'Life OS failure reviews', version: 1, savedAt: new Date().toISOString(), reviews }
}
export function parseFailureReviewImport(text: string): FailureReviewPayload {
  const parsed = JSON.parse(text)
  // An old whole-site backup without this section is not an instruction to clear it.
  return normalizeFailureReviews(parsed?.product === 'Life OS' ? parsed.failureReviews : parsed)
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`
  return JSON.stringify(value) ?? 'null'
}

/** Exact repeats are skipped; conflicts are retained as copies, never used to overwrite history. */
export function mergeFailureReviews(current: FailureReview[], incoming: FailureReview[]) {
  const reviews = structuredClone(current)
  let added = 0, skipped = 0, conflicts = 0
  for (const row of incoming) {
    const serial = stableJson(row)
    if (reviews.some((existing) => stableJson(existing) === serial || (existing.importedFrom === row.id && stableJson({ ...existing, id: row.id, importedFrom: row.importedFrom }) === stableJson({ ...row, importedFrom: row.importedFrom })))) { skipped++; continue }
    let copy = structuredClone(row)
    if (reviews.some((existing) => existing.id === row.id)) {
      copy = { ...copy, id: uuid(), importedFrom: row.id }
      conflicts++
    }
    reviews.push(copy); added++
  }
  return { reviews, added, skipped, conflicts }
}

export function reviewFactorCounts(reviews: FailureReview[], now = todayKey()) {
  const first = addDays(now, -6)
  const recent = reviews.filter((row) => latestReview(row).date >= first && latestReview(row).date <= now)
  const counts = new Map<string, number>()
  recent.forEach((row) => new Set(latestReview(row).factors).forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)))
  return { total: recent.length, counts: [...counts].sort((a, b) => b[1] - a[1]) }
}
