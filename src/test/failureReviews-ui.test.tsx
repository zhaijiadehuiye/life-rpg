import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FailureReviews } from '../components/research/FailureReviews'
import { TodayFailureReviews } from '../components/TodayFailureReviews'
import { FAILURE_REVIEW_KEY, readFailureReviews, saveFailureReview } from '../lib/storage'
import { todayKey } from '../utils/date'

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  localStorage.clear()
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); host.remove() })
async function render(creating = true) {
  await act(async () => root.render(<MemoryRouter initialEntries={[`/reflection?view=failures${creating ? '&new=1' : ''}`]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><FailureReviews /></MemoryRouter>))
}
async function fill(label: string, value: string) {
  const input = host.querySelector<HTMLTextAreaElement>(`textarea[aria-label="${label}"]`)!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function submit() {
  await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
}

describe('failure-review entry and forms', () => {
  it('saves facts with no required explanation, displays today and leaves original archives untouched', async () => {
    localStorage.setItem('life-rpg:v1', 'existing-rpg')
    await render()
    await fill('原本想做什么', '每天散步')
    await fill('实际发生了什么', '今天下雨，改在家休息')
    await submit()
    expect(readFailureReviews()).toHaveLength(1)
    expect(host.textContent).toContain('原来的日志和旧版本都保留')
    expect(localStorage.getItem('life-rpg:v1')).toBe('existing-rpg')
    await act(async () => root.render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><TodayFailureReviews /></MemoryRouter>))
    expect(host.textContent).toContain('每天散步')
    expect(host.textContent).toContain('待整理')
    expect(host.querySelector('a[href*="new=1"]')?.textContent).toContain('记一次复盘')
    expect(host.querySelector('a[href*="range=all"]')?.textContent).toContain('查看全部复盘')
  })

  it('keeps all draft inputs when saving is rejected by storage', async () => {
    await render()
    await fill('原本想做什么', '读一页书')
    await fill('实际发生了什么', '不能丢失的现场记录')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError') })
    await submit()
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('输入仍在')
    expect(host.querySelector<HTMLTextAreaElement>('textarea[aria-label="实际发生了什么"]')?.value).toBe('不能丢失的现场记录')
    expect(localStorage.getItem(FAILURE_REVIEW_KEY)).toBeNull()
  })

  it('never treats malformed stored reviews as a blank editable archive', async () => {
    localStorage.setItem(FAILURE_REVIEW_KEY, '{broken')
    await render()
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('原数据未改动')
    expect(host.querySelector('form')).toBeNull()
    expect(localStorage.getItem(FAILURE_REVIEW_KEY)).toBe('{broken')
  })

  it('preserves an unsaved edit when another tab writes a newer version', async () => {
    const first = await saveFailureReview({ date: todayKey(), expected: '读书', actual: '没开始', factors: [], nextStep: '读一页' })
    await render(false)
    await fill('实际发生了什么', '本窗口还没保存的内容')
    await act(async () => { await saveFailureReview({ date: todayKey(), expected: '读书', actual: '另一窗口已保存的事实', factors: [], nextStep: '读一行' }, first.id, first.versionId) })
    expect(host.querySelector<HTMLTextAreaElement>('textarea[aria-label="实际发生了什么"]')?.value).toBe('本窗口还没保存的内容')
    expect(host.textContent).toContain('已有新版本')
    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true)
    expect(readFailureReviews()[0].versions).toHaveLength(2)
  })
})
