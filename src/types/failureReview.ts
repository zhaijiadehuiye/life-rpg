export type ReviewOutcome = 'helped' | 'not-helped' | 'not-tried'

export interface FailureReviewDraft {
  date: string
  expected: string
  actual: string
  factors: string[]
  nextStep: string
}

export interface FailureReviewVersion extends FailureReviewDraft, Record<string, unknown> {
  id: string
  savedAt: string
}

export interface FailureFollowUp extends Record<string, unknown> {
  id: string
  createdAt: string
  versionId: string
  outcome: ReviewOutcome
  note: string
}

export interface FailureReview extends Record<string, unknown> {
  id: string
  createdAt: string
  versions: FailureReviewVersion[]
  followUps: FailureFollowUp[]
}

export interface FailureReviewPayload extends Record<string, unknown> {
  product: 'Life OS failure reviews'
  version: 1
  savedAt: string
  reviews: FailureReview[]
}
