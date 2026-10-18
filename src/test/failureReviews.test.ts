import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addFailureFollowUp, FAILURE_REVIEW_KEY, importFailureReviews, readFailureReviews, saveFailureReview } from '../lib/storage'
import { failureReviewBackup, latestReview, mergeFailureReviews, normalizeFailureReviews, parseFailureReviewImport, prepareReviewDraft, reviewFactorCounts, reviewStatus } from '../lib/failureReviews'
import type { FailureReviewDraft } from '../types/failureReview'
import { HISTORIAN_FALLBACK } from '../lib/historianStorage'

const facts: FailureReviewDraft = { date: '2020-01-02', expected: '晚饭后学英语', actual: '刷手机后没有开始', factors: [], nextStep: '' }
beforeEach(() => localStorage.clear()) // Isolated jsdom storage, never a user's browser.
afterEach(() => vi.restoreAllMocks())

describe('independent failure-review storage and history', () => {
  it('reads a missing store without initializing, seeding or touching either existing archive', async () => {
    localStorage.setItem('life-rpg:v1', 'old-rpg-raw')
    localStorage.setItem(HISTORIAN_FALLBACK, 'old-original-and-revisions')
    expect(readFailureReviews()).toEqual([])
    expect(localStorage.getItem(FAILURE_REVIEW_KEY)).toBeNull()
    await saveFailureReview(facts)
    expect(readFailureReviews()).toHaveLength(1)
    expect(localStorage.getItem('life-rpg:v1')).toBe('old-rpg-raw')
    expect(localStorage.getItem(HISTORIAN_FALLBACK)).toBe('old-original-and-revisions')
    expect(reviewStatus(readFailureReviews()[0])).toBe('待整理')
  })

  it('appends versions and observations, and evaluates follow-up only for the actual version tried', async () => {
    const first = await saveFailureReview({ ...facts, nextStep: '先跟读一句', factors: ['手机干扰'] })
    const original = structuredClone(readFailureReviews()[0].versions[0])
    await addFailureFollowUp(first.id, first.versionId, 'not-helped', '手机还在桌边')
    expect(reviewStatus(readFailureReviews()[0])).toBe('没帮助')
    const second = await saveFailureReview({ ...facts, nextStep: '先把手机放远' }, first.id, first.versionId)
    expect(reviewStatus(readFailureReviews()[0])).toBe('待尝试')
    await addFailureFollowUp(first.id, second.versionId, 'not-tried', '明天有空再试')
    await addFailureFollowUp(first.id, second.versionId, 'helped', '开始了两分钟')
    const row = readFailureReviews()[0]
    expect(row.versions).toHaveLength(2)
    expect(row.versions[0]).toEqual(original)
    expect(row.followUps.map((item) => item.outcome)).toEqual(['not-helped', 'not-tried', 'helped'])
    expect(reviewStatus(row)).toBe('有帮助')
    expect(parseFailureReviewImport(JSON.stringify(failureReviewBackup([row]))).reviews).toEqual([row])
  })

  it('refuses a stale edit or follow-up instead of overwriting another tab', async () => {
    const first = await saveFailureReview({ ...facts, nextStep: '先跟读一句' })
    await saveFailureReview({ ...facts, actual: '另一个窗口补充的事实', nextStep: '先跟读一句' }, first.id, first.versionId)
    const raw = localStorage.getItem(FAILURE_REVIEW_KEY)
    await expect(saveFailureReview(facts, first.id, first.versionId)).rejects.toThrow('另一个窗口')
    await expect(addFailureFollowUp(first.id, first.versionId, 'helped', '')).rejects.toThrow('办法已更新')
    expect(localStorage.getItem(FAILURE_REVIEW_KEY)).toBe(raw)
  })

  it('preserves the stored payload if writing fails', async () => {
    await saveFailureReview(facts)
    const raw = localStorage.getItem(FAILURE_REVIEW_KEY)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError') })
    await expect(saveFailureReview({ ...facts, actual: '不能丢的输入' })).rejects.toThrow('输入仍在')
    expect(localStorage.getItem(FAILURE_REVIEW_KEY)).toBe(raw)
  })

  it.each(['{broken', '{"product":"Life OS failure reviews","version":2,"reviews":[]}'])('never replaces an unreadable or newer archive with an empty one: %s', async (raw) => {
    localStorage.setItem(FAILURE_REVIEW_KEY, raw)
    expect(() => readFailureReviews()).toThrow()
    await expect(saveFailureReview(facts)).rejects.toThrow()
    expect(localStorage.getItem(FAILURE_REVIEW_KEY)).toBe(raw)
  })

  it('validates real dates and facts while letting users postpone explanations and plans', () => {
    expect(() => prepareReviewDraft({ ...facts, date: '2020-02-30' })).toThrow('有效日期')
    expect(() => prepareReviewDraft({ ...facts, date: '2999-01-01' })).toThrow('有效日期')
    expect(() => prepareReviewDraft({ ...facts, actual: '  ' })).toThrow('实际发生')
    expect(prepareReviewDraft(facts)).toEqual(facts)
  })

  it('rejects malformed histories and follow-ups that reference a missing version', async () => {
    await saveFailureReview(facts)
    const payload = failureReviewBackup(readFailureReviews())
    payload.reviews[0].followUps.push({ id: 'bad', createdAt: new Date().toISOString(), versionId: 'missing', outcome: 'helped', note: '' })
    expect(() => normalizeFailureReviews(payload)).toThrow('完整读取')
    payload.reviews[0].followUps = []
    payload.reviews[0].versions.push(payload.reviews[0].versions[0])
    expect(() => normalizeFailureReviews(payload)).toThrow('完整读取')
  })
})

describe('explicit backup merging and self-selected tag counts', () => {
  it('retains both conflicting histories, skips repeated imports and preserves unknown fields', async () => {
    await saveFailureReview(facts)
    const original = readFailureReviews(), incoming = structuredClone(original)
    incoming[0].versions[0].actual = '备份里另一份原始事实'
    incoming[0].futureField = { keep: true }
    const merged = mergeFailureReviews(original, incoming)
    expect(merged).toMatchObject({ added: 1, conflicts: 1, skipped: 0 })
    expect(merged.reviews[0]).toEqual(original[0])
    expect(merged.reviews[1].futureField).toEqual({ keep: true })
    expect(merged.reviews[1].id).not.toContain('原始事实')
    expect(mergeFailureReviews(merged.reviews, incoming).added).toBe(0)
    await importFailureReviews(failureReviewBackup(incoming))
    await importFailureReviews(failureReviewBackup(incoming))
    expect(readFailureReviews()).toHaveLength(2)
  })

  it('accepts the new whole-site backup and rejects an absent section without clearing current reviews', async () => {
    await saveFailureReview(facts)
    const raw = localStorage.getItem(FAILURE_REVIEW_KEY)
    const payload = failureReviewBackup(readFailureReviews())
    expect(parseFailureReviewImport(JSON.stringify({ product: 'Life OS', version: 1, failureReviews: payload }))).toEqual(payload)
    expect(() => parseFailureReviewImport('{"product":"Life OS","version":1,"historian":{}}')).toThrow()
    expect(localStorage.getItem(FAILURE_REVIEW_KEY)).toBe(raw)
  })

  it('counts each selected tag once per current record within seven days, not versions or unrecorded tasks', async () => {
    const first = await saveFailureReview({ ...facts, date: '2020-01-08', factors: ['手机干扰'] })
    await saveFailureReview({ ...facts, date: '2020-01-08', factors: ['手机干扰', '开始太难', '手机干扰'] }, first.id, first.versionId)
    await saveFailureReview({ ...facts, date: '2020-01-02', factors: ['手机干扰'] })
    await saveFailureReview({ ...facts, date: '2020-01-01', factors: ['状态不足'] })
    await saveFailureReview({ ...facts, date: '2020-01-09', factors: ['安排变化'] })
    expect(reviewFactorCounts(readFailureReviews(), '2020-01-08')).toEqual({ total: 2, counts: [['手机干扰', 2], ['开始太难', 1]] })
    expect(latestReview(readFailureReviews()[0]).factors).toEqual(['手机干扰', '开始太难'])
  })
})
