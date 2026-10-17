import { createContext, useContext } from 'react'
import type { ResearchState } from '../types/historian'
import type { ResearchStorageMode } from './historianStorage'

export interface ResearchContextValue {
  state: ResearchState | null; loading: boolean; error: string; mode: ResearchStorageMode
  refresh: () => Promise<void>; commit: (change: (draft: ResearchState) => void) => Promise<void>
}
export const ResearchContext = createContext<ResearchContextValue | null>(null)
export function useResearch() {
  const context = useContext(ResearchContext)
  if (!context) throw new Error('ResearchProvider is required')
  return context
}
