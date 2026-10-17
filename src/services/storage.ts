// Legacy service path kept for existing imports; implementation lives in lib/storage.ts.
export {
  STORAGE_VERSION,
  loadState,
  saveState,
  persistState,
  clearState,
  exportState,
  parseImport,
} from '../lib/storage'
export type { PersistedPayload } from '../lib/storage'
