import type {
  ApplicationState,
  DomainEventType,
  PolicyQualifiedVersion,
  ReasonCode,
  SyntheticId,
  SyntheticTimestamp,
} from '../domain'
import type { LocalMockAdapters } from '../mocks'
import type { PolicyEvaluationResult, ScenarioSupport } from '../policy'
import type {
  PersistenceDiagnostic,
  PersistenceEnvelope,
  PersistenceService,
} from '../persistence'

export type RuntimeOperation =
  | 'EvaluateScenario'
  | 'CreateDraft'
  | 'BeginDraft'
  | 'SaveSnapshot'
  | 'ResumeCase'

export type RuntimeCommandRejectionCode =
  | 'INVALID_COMMAND'
  | 'INVALID_LIFECYCLE_TRANSITION'
  | 'GUARD_FAILED'
  | 'INVALID_DRAFT_ANSWER'
  | 'IDEMPOTENCY_CONFLICT'
  | 'CASE_CONFLICT'
  | 'PERSISTENCE_VALIDATION_FAILED'

export type RuntimeStorageRequiresReset = Readonly<{
  status: 'STORAGE_REQUIRES_RESET'
  storageStatus: 'INVALID_JSON' | 'INVALID_SCHEMA' | 'UNSUPPORTED_VERSION'
  diagnostic: PersistenceDiagnostic
}>

export type RuntimeStorageUnavailable = Readonly<{
  status: 'STORAGE_UNAVAILABLE'
  diagnostic: PersistenceDiagnostic
}>

export type RuntimeStorageFailure =
  | RuntimeStorageRequiresReset
  | RuntimeStorageUnavailable

export type RuntimeCommandRejected = Readonly<{
  status: 'COMMAND_REJECTED'
  operation: RuntimeOperation
  reasonCode: RuntimeCommandRejectionCode
  caseId?: SyntheticId
  diagnostic: Readonly<{
    issueCount?: number
    currentState?: ApplicationState
    requestedState?: ApplicationState
    requiredState?: ApplicationState
    allowedNextStates?: readonly ApplicationState[]
  }>
}>

export type RuntimeCaseNotFound = Readonly<{
  status: 'CASE_NOT_FOUND'
  caseId: SyntheticId | null
}>

export type RuntimePolicyRejected = Readonly<{
  status: 'POLICY_REJECTED'
  scenarioId: SyntheticId
  scenarioSupport: Exclude<ScenarioSupport, 'SUPPORTED_BY_DEMO'>
  reasonCodes: readonly ReasonCode[]
  evaluation?: PolicyEvaluationResult
}>

export type RuntimeCommandAccepted = Readonly<{
  status: 'COMMAND_ACCEPTED'
  operation: 'CreateDraft' | 'BeginDraft' | 'SaveSnapshot'
  commandId: SyntheticId
  caseId: SyntheticId
  revision: number
  applicationState: ApplicationState
  emittedEventType: DomainEventType
  emittedEventId: SyntheticId
  idempotentReplay: boolean
  snapshotId?: SyntheticId
}>

export type RuntimeExistingCase = Readonly<{
  status: 'EXISTING_CASE'
  caseId: SyntheticId
  scenarioId: SyntheticId
  revision: number
  applicationState: ApplicationState
  activeCaseId: SyntheticId | null
  resumeRecommended: true
}>

export type RuntimeInspectResult =
  | Readonly<{ status: 'NO_STATE' }>
  | Readonly<{ status: 'VALID_STATE'; state: PersistenceEnvelope }>
  | RuntimeStorageFailure

export type RuntimeEvaluationResult =
  | Readonly<{ status: 'POLICY_EVALUATED'; evaluation: PolicyEvaluationResult }>
  | RuntimePolicyRejected
  | RuntimeCommandRejected

export type RuntimeMutationResult =
  | RuntimeCommandAccepted
  | RuntimeExistingCase
  | RuntimeCommandRejected
  | RuntimeCaseNotFound
  | RuntimePolicyRejected
  | RuntimeStorageFailure

export type RuntimeResumeResult =
  | Readonly<{
      status: 'CASE_RESUMED'
      activeCaseId: SyntheticId | null
      caseId: SyntheticId
      scenarioId: SyntheticId
      policyQualifiedVersion: PolicyQualifiedVersion
      applicationState: ApplicationState
      currentStep: string | null
      latestAnswers: Readonly<Record<string, string>>
      latestSnapshotId: SyntheticId | null
      resumable: boolean
      revision: number
    }>
  | RuntimeCaseNotFound
  | RuntimeCommandRejected
  | RuntimeStorageFailure

export type RuntimeMetadataSource = Readonly<{
  nextTimestamp(previousTimestamp: SyntheticTimestamp): SyntheticTimestamp
  commandId(caseId: SyntheticId, operation: RuntimeOperation, revision: number): SyntheticId
  eventId(caseId: SyntheticId, eventType: DomainEventType, revision: number): SyntheticId
  snapshotId(caseId: SyntheticId, sequence: number): SyntheticId
}>

export type DemoRuntimeDependencies = Readonly<{
  store: PersistenceService
  adapters: LocalMockAdapters
  metadata: RuntimeMetadataSource
}>

export type DemoRuntime = Readonly<{
  inspectState(): RuntimeInspectResult
  evaluateScenario(candidate: unknown): RuntimeEvaluationResult
  createCase(candidate: unknown): RuntimeMutationResult
  beginDraft(candidate: unknown): RuntimeMutationResult
  saveDraftSnapshot(candidate: unknown): RuntimeMutationResult
  resumeCase(candidate?: unknown): RuntimeResumeResult
}>
