import type {
  PolicyQualifiedVersion,
  ReasonCode,
  SyntheticId,
  SyntheticTimestamp,
} from './ids'

export const DOMAIN_EVENT_TYPES = Object.freeze([
  'DraftCreated',
  'DraftWorkStarted',
  'DraftSnapshotSaved',
  'DraftReadyForReview',
  'ApplicationReadyToSubmit',
  'ApplicationSubmitted',
  'ApplicationLocked',
  'DocumentVersionCreated',
  'DocumentPreflightPassed',
  'DocumentPreflightFailed',
  'DocumentVersionSubmitted',
  'DocumentReviewStarted',
  'DocumentReuploadRequested',
  'DocumentVersionSuperseded',
  'DocumentAccepted',
  'MockPaymentInitiated',
  'MockPaymentPending',
  'PaymentReconciliationRequired',
  'PaymentReconciledConfirmed',
  'ScrutinyQueued',
  'ScrutinyStarted',
  'ScrutinyActionRequired',
  'ScrutinyResubmitted',
  'ScrutinyResumed',
  'SyntheticScrutinyApproved',
  'SyntheticETAReadyToIssue',
  'SyntheticETAIssued',
] as const)

export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[number]
export type EventDomain = 'APPLICATION' | 'DOCUMENT' | 'PAYMENT' | 'SCRUTINY' | 'ETA'
export type EventActor = 'APPLICANT' | 'SYSTEM' | 'REVIEWER' | 'PAYMENT_MOCK'
export type PrivacySafeEventValue = string | number | boolean | null | readonly string[]
export type PrivacySafeEventPayload = Readonly<Record<string, PrivacySafeEventValue>>

export type DomainEventEnvelope = Readonly<{
  eventId: SyntheticId
  caseId: SyntheticId
  eventType: DomainEventType
  domain: EventDomain
  aggregateId: SyntheticId
  previousState?: string
  newState?: string
  actor: EventActor
  syntheticTimestamp: SyntheticTimestamp
  policyQualifiedVersion?: PolicyQualifiedVersion
  reasonCode?: ReasonCode
  idempotencyKey?: SyntheticId
  payload: PrivacySafeEventPayload
}>
