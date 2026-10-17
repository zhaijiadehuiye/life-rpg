import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { readResearchWorkspace, updateResearchWorkspace, type ResearchStorageMode } from '../lib/historianStorage'
import type { ResearchState } from '../types/historian'

import { ResearchContext } from '../lib/useResearch'

export function ResearchProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ResearchState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<ResearchStorageMode>('IndexedDB')
  const refresh = useCallback(async () => {
    try { const result = await readResearchWorkspace(); setState(result.state); setMode(result.mode); setError('') }
    catch (err) { setError(err instanceof Error ? err.message : '读取档案失败，请检查浏览器存储。') }
    finally { setLoading(false) }
  }, [])
  const commit = useCallback(async (change: (draft: ResearchState) => void) => {
    const result = await updateResearchWorkspace(change, mode)
    setState(result.state); setMode(result.mode); setError('')
    if (typeof BroadcastChannel !== 'undefined') {
      try { const channel = new BroadcastChannel('life-os-research'); channel.postMessage('updated'); channel.close() } catch { /* Storage has already succeeded; tab notifications are optional. */ }
    }
  }, [mode])
  useEffect(() => {
    void refresh()
    const onFocus = () => { void refresh() }
    let channel: BroadcastChannel | null = null
    try { if (typeof BroadcastChannel !== 'undefined') channel = new BroadcastChannel('life-os-research') } catch { /* Focus refresh remains available. */ }
    if (channel) channel.onmessage = onFocus
    window.addEventListener('focus', onFocus)
    window.addEventListener('storage', onFocus)
    return () => { channel?.close(); window.removeEventListener('focus', onFocus); window.removeEventListener('storage', onFocus) }
  }, [refresh])
  return <ResearchContext.Provider value={{ state, loading, error, mode, refresh, commit }}>{children}</ResearchContext.Provider>
}

