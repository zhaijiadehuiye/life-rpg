// Compatible with personal-historian/app.js, schemaVersion 1. Unknown fields survive edits/export.
export interface Revision extends Record<string, unknown> {
  id: string; createdAt: string; text: string; kind: string; note?: string
}
export interface ResearchAnalysis extends Record<string, unknown> {
  facts: string[]; interpretation?: string; narrative?: string; alternatives?: string[]
  cannotConclude?: string[]; analyzedAt?: string; model?: string
}
export interface ResearchEntry extends Record<string, unknown> {
  id: string; date: string; createdAt: string; updatedAt: string
  originalText: string; currentText: string; revisions: Revision[]; tags: string[]
  metadata: Record<string, unknown>; analysis: ResearchAnalysis | null
  events: { id: string; text: string; createdAt: string }[]
}
export interface Hypothesis extends Record<string, unknown> {
  id: string; title: string; description: string; status: string; confidence: number
  createdAt: string; updatedAt: string
  confidenceHistory: { date: string; confidence: number; reason: string }[]
  supportingEvidence: string[]; opposingEvidence: string[]
}
export interface Evidence extends Record<string, unknown> {
  id: string; hypothesisId: string; entryId: string; type: string; note: string; createdAt: string
}
export interface Observation extends Record<string, unknown> {
  id: string; date: string; completed: boolean; focus: number; resistance: number; sleepHours: number | null; note: string
}
export interface Experiment extends Record<string, unknown> {
  id: string; title: string; question: string; status: string; startDate: string; endDate: string
  durationDays: number; metrics: string[]; observations: Observation[]; conclusion: string; createdAt: string
}
export interface Prediction extends Record<string, unknown> {
  id: string; text: string; probability: number; dueDate: string; status: string
  result: boolean | null; createdAt: string; resolvedAt?: string
}
export interface ResearchReview extends Record<string, unknown> {
  id: string; type: string; period: string; createdAt: string
  data: { entryCount: number; topTags: [string, number][]; evidenceCount: number; nextVariable: string }
  note?: string
}
export interface ResearchBackup extends Record<string, unknown> {
  id: string; createdAt: string; entryCount: number; hypothesisCount: number; snapshot: ResearchState
}
export interface ResearchState extends Record<string, unknown> {
  schemaVersion: number; appVersion: string; createdAt: string; updatedAt: string; seeded: boolean
  entries: ResearchEntry[]; hypotheses: Hypothesis[]; evidence: Evidence[]; experiments: Experiment[]
  predictions: Prediction[]; reviews: ResearchReview[]; backups: ResearchBackup[]
}
