import { useCallback, useEffect, useState } from 'react'
import type { FailureReview } from '../types/failureReview'
import { FAILURE_REVIEW_EVENT, FAILURE_REVIEW_KEY, readFailureReviews } from './storage'

export function useFailureReviews() {
  const [reviews, setReviews] = useState<FailureReview[]>([])
  const [error, setError] = useState('')
  const refresh = useCallback(() => {
    try { setReviews(readFailureReviews()); setError('') }
    catch { setError('失败复盘暂时无法读取，原数据未改动。请检查浏览器存储，或保留备份后重试。') }
  }, [])
  useEffect(() => {
    refresh()
    const storage = (event: StorageEvent) => { if (event.key === FAILURE_REVIEW_KEY || event.key === null) refresh() }
    window.addEventListener(FAILURE_REVIEW_EVENT, refresh)
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', storage)
    return () => {
      window.removeEventListener(FAILURE_REVIEW_EVENT, refresh)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', storage)
    }
  }, [refresh])
  return { reviews, error, refresh }
}
