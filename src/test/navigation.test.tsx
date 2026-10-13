import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import { useGameStore } from '../store/useGameStore'
import { buildDemoState } from '../data/demo'
import { saveState } from '../lib/storage'

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  localStorage.clear() // jsdom's synthetic test storage only.
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

async function renderAt(path: string) {
  await act(async () => {
    root.render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></MemoryRouter>)
  })
}

describe('Life OS module navigation', () => {
  it('opens historian without creating or replacing an RPG save', async () => {
    await renderAt('/historian')
    expect(host.querySelector('iframe')?.title).toBe('自我历史学研究工作区')
    expect(host.querySelector('iframe')?.src).toContain('/personal-historian/index.html')
    expect(localStorage.getItem('life-rpg:v1')).toBeNull()
    expect(host.textContent).not.toContain('Step 1')
  })

  it('preserves existing RPG data when entering, leaving and re-entering historian', async () => {
    const saved = buildDemoState()
    await saveState(saved)
    const before = localStorage.getItem('life-rpg:v1')
    await renderAt('/historian')
    const desktop = host.querySelector('nav[aria-label="桌面主导航"] a[href="/historian"]')
    const mobile = host.querySelector('nav[aria-label="移动主导航"] a[href="/historian"]')
    expect(desktop?.textContent).toBe('自我历史学')
    expect(mobile?.textContent).toBe('自我历史学')
    expect(host.querySelectorAll('nav[aria-label="移动主导航"] a')).toHaveLength(5)
    for (const path of ['/', '/historian']) {
      const link = host.querySelector(`nav[aria-label="桌面主导航"] a[href="${path}"]`)!
      await act(async () => { link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })) })
      if (path === '/') expect(host.querySelector('section[aria-label="Life OS 模块"] a[href="/historian"]')).not.toBeNull()
    }
    expect(host.querySelector('iframe')).not.toBeNull()
    expect(localStorage.getItem('life-rpg:v1')).toBe(before)
    expect(useGameStore.getState().logs).toEqual(saved.logs)
    expect(useGameStore.getState().sideQuests).toEqual(saved.sideQuests)
    expect(useGameStore.getState().skills).toEqual(saved.skills)
    expect(useGameStore.getState().profile?.totalXp).toBe(saved.profile?.totalXp)
  })
})
