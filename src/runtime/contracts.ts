import type {
  ApplicationState,
  DocumentVersionState,
  DomainEventType,
  PaymentState,
  PolicyQualifiedVersion,
  ReasonCode,
  ScrutinyState,
  EtaState,
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
  | 'InspectDocuments'
  | 'PrepareDocument'
  | 'InspectReview'
  | 'PrepareReview'
  | 'SubmitApplication'
  | 'InspectPayment'
  | 'StartMockPayment'
  | 'CheckMockPaymentStatus'
  | 'InspectStatus'
  | 'BeginScrutiny'
  | 'RequestMedicalCorrection'
  | 'InspectCorrection'
  | 'PrepareCorrection'
  | 'SubmitCorrection'
  | 'CompleteSyntheticReview'

export type RuntimeCommandRejectionCode =
  | 'INVALID_COMMAND'
  | 'INVALID_LIFECYCLE_TRANSITION'
  | 'GUARD_FAILED'
  | 'INVALID_DRAFT_ANSWER'
  | 'IDEMPOTENCY_CONFLICT'
  | 'CASE_CONFLICT'
  | 'FIXTURE_NOT_COMPATIBLE'
  | 'DOCUMENT_INSPECTION_UNAVAILABLE'
  | 'REVIEW_PREREQUISITES_NOT_MET'
  | 'PAYMENT_PREREQUISITES_NOT_MET'
  | 'PAYMENT_ADAPTER_REJECTED'
  | 'PAYMENT_EVIDENCE_MISMATCH'
  | 'STATUS_PREREQUISITES_NOT_MET'
  | 'CORRECTION_PREREQUISITES_NOT_MET'
  | 'APPROVAL_PREREQUISITES_NOT_MET'
  | 'NOTIFICATION_ADAPTER_REJECTED'
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
    documentState?: DocumentVersionState
    requirementId?: string
    missingQuestionIds?: readonly string[]
    missingRequirementIds?: readonly string[]
    paymentState?: PaymentState
    scrutinyState?: ScrutinyState
    etaState?: EtaState
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

export type RuntimeDocumentFixtureOption = Readonly<{
  fixtureId: SyntheticId
  label: string
  watermark: 'SYNTHETIC — NOT VALID'
  recoveryExample: boolean
}>

export type RuntimeDocumentVersionView = Readonly<{
  documentVersionId: SyntheticId
  sequence: number
  fixtureId: SyntheticId
  state: DocumentVersionState
  inspectionReasonCode: string | null
}>

export type RuntimeDocumentRequirementView = Readonly<{
  requirementId: string
  documentType: string
  guidance: string
  status: 'NOT_CHECKED' | 'READY' | 'NEEDS_ATTENTION'
  fixtureOptions: readonly RuntimeDocumentFixtureOption[]
  currentVersion: RuntimeDocumentVersionView | null
  versionHistory: readonly RuntimeDocumentVersionView[]
}>

export type RuntimeDocumentsInspected = Readonly<{
  status: 'DOCUMENTS_INSPECTED'
  caseId: SyntheticId
  scenarioId: SyntheticId
  policyQualifiedVersion: PolicyQualifiedVersion
  revision: number
  requiredCount: number
  readyCount: number
  allReady: boolean
  requirements: readonly RuntimeDocumentRequirementView[]
}>

export type RuntimeDocumentInspectResult =
  | RuntimeDocumentsInspected
  | RuntimeCaseNotFound
  | RuntimeCommandRejected
  | RuntimePolicyRejected
  | RuntimeStorageFailure

export type RuntimeDocumentPrepared = Readonly<{
  status: 'DOCUMENT_PREPARED'
  operation: 'PrepareDocument'
  caseId: SyntheticId
  requirementId: string
  fixtureId: SyntheticId
  documentVersionId: SyntheticId
  documentState: 'PREFLIGHT_PASSED' | 'PREFLIGHT_FAILED'
  revision: number
  emittedEventTypes: readonly DomainEventType[]
  emittedEventIds: readonly SyntheticId[]
  inspectionReasonCode: string
}>

export type RuntimeDocumentExisting = Readonly<{
  status: 'DOCUMENT_EXISTING'
  operation: 'PrepareDocument'
  caseId: SyntheticId
  requirementId: string
  fixtureId: SyntheticId
  documentVersionId: SyntheticId
  documentState: DocumentVersionState
  revision: number
  idempotentReplay: true
}>

export type RuntimeDocumentMutationResult =
  | RuntimeDocumentPrepared
  | RuntimeDocumentExisting
  | RuntimeCommandRejected
  | RuntimeCaseNotFound
  | RuntimePolicyRejected
  | RuntimeStorageFailure

export type RuntimeReviewAnswerView = Readonly<{
  questionId: string
  prompt: string
  answerValue: string
  allowedValues: readonly string[]
}>

export type RuntimeReviewDocumentView = Readonly<{
  requirementId: string
  documentType: string
  documentVersionId: SyntheticId
  fixtureId: SyntheticId
  state: DocumentVersionState
}>

export type RuntimeReviewSummary = Readonly<{
  status: 'REVIEW_INSPECTED'
  caseId: SyntheticId
  scenarioId: SyntheticId
  purposeFamily: NonNullable<PolicyEvaluationResult['suggestedPurposeFamily']>
  policyQualifiedVersion: PolicyQualifiedVersion
  applicationState: ApplicationState
  revision: number
  answers: readonly RuntimeReviewAnswerView[]
  documents: readonly RuntimeReviewDocumentView[]
  syntheticFee: NonNullable<PolicyEvaluationResult['syntheticFee']>
  locked: boolean
}>

export type RuntimeReviewInspectResult =
  | RuntimeReviewSummary
  | RuntimeCaseNotFound
  | RuntimeCommandRejected
  | RuntimePolicyRejected
  | RuntimeStorageFailure

export type RuntimeReviewPrepared = Readonly<{
  status: 'REVIEW_PREPARED'
  operation: 'PrepareReview'
  caseId: SyntheticId
  revision: number
  snapshotId: SyntheticId
  idempotentReplay: boolean
}>

export type RuntimeApplicationSubmitted = Readonly<{
  status: 'APPLICATION_SUBMITTED'
  operation: 'SubmitApplication'
  caseId: SyntheticId
  revision: number
  applicationState: 'LOCKED'
  submittedDocumentVersionIds: readonly SyntheticId[]
  emittedEventTypes: readonly DomainEventType[]
  emittedEventIds: readonly SyntheticId[]
}>

export type RuntimeApplicationAlreadySubmitted = Readonly<{
  status: 'APPLICATION_ALREADY_SUBMITTED'
  operation: 'SubmitApplication'
  caseId: SyntheticId
  revision: number
  applicationState: 'LOCKED'
  idempotentReplay: true
}>

export type RuntimeReviewMutationResult =
  | RuntimeReviewPrepared
  | RuntimeApplicationSubmitted
  | RuntimeApplicationAlreadySubmitted
  | RuntimeCommandRejected
  | RuntimeCaseNotFound
  | RuntimePolicyRejected
  | RuntimeStorageFailure

export type RuntimePaymentSummary = Readonly<{
  status: 'PAYMENT_INSPECTED'
  caseId: SyntheticId
  scenarioId: SyntheticId
  purposeFamily: NonNullable<PolicyEvaluationResult['suggestedPurposeFamily']>
  policyQualifiedVersion: PolicyQualifiedVersion
  applicationState: 'LOCKED'
  revision: number
  paymentState: PaymentState
  mockPaymentAttemptId: SyntheticId | null
  syntheticReference: SyntheticId | null
  syntheticFee: NonNullable<PolicyEvaluationResult['syntheticFee']>
}>

export type RuntimePaymentInspectResult =
  | RuntimePaymentSummary
  | RuntimeCaseNotFound
  | RuntimeCommandRejected
  | RuntimePolicyRejected
  | RuntimeStorageFailure

export type RuntimePaymentReconciliationRequired = Readonly<{
  status: 'PAYMENT_RECONCILIATION_REQUIRED'
  operation: 'StartMockPayment'
  caseId: SyntheticId
  revision: number
  paymentState: 'RECONCILIATION_REQUIRED'
  mockPaymentAttemptId: SyntheticId
  syntheticReference: SyntheticId
  emittedEventTypes: readonly DomainEventType[]
  emittedEventIds: readonly SyntheticId[]
}>

export type RuntimePaymentConfirmed = Readonly<{
  status: 'PAYMENT_CONFIRMED'
  operation: 'CheckMockPaymentStatus'
  caseId: SyntheticId
  revision: number
  paymentState: 'CONFIRMED'
  mockPaymentAttemptId: SyntheticId
  syntheticReference: SyntheticId
  emittedEventType: 'PaymentReconciledConfirmed'
  emittedEventId: SyntheticId
}>

export type RuntimePaymentExisting = Readonly<{
  status: 'PAYMENT_EXISTING'
  operation: 'StartMockPayment' | 'CheckMockPaymentStatus'
  caseId: SyntheticId
  revision: number
  paymentState: PaymentState
  mockPaymentAttemptId: SyntheticId
  syntheticReference: SyntheticId
  idempotentReplay: true
}>

export type RuntimePaymentMutationResult =
  | RuntimePaymentReconciliationRequired
  | RuntimePaymentConfirmed
  | RuntimePaymentExisting
  | RuntimeCaseNotFound
  | RuntimeCommandRejected
  | RuntimePolicyRejected
  | RuntimeStorageFailure

export type RuntimeStatusJourneyFact = Readonly<{
  id: 'APPLICATION' | 'PAYMENT' | 'DOCUMENTS' | 'ETA'
  label: string
  value: string
  state: 'COMPLETE' | 'CURRENT' | 'WAITING'
}>

export type RuntimeStatusSummary = Readonly<{
  status: 'STATUS_INSPECTED'
  caseId: SyntheticId
  scenarioId: SyntheticId
  purposeFamily: NonNullable<PolicyEvaluationResult['suggestedPurposeFamily']>
  policyQualifiedVersion: PolicyQualifiedVersion
  revision: number
  applicationState: 'LOCKED'
  paymentState: 'CONFIRMED'
  scrutinyState: ScrutinyState
  etaState: EtaState
  headline: string
  explanation: string
  applicantActionRequired: boolean
  nextAction: 'BEGIN_SCRUTINY' | 'REPLACE_HOSPITAL_LETTER' | null
  actionGuidance: string | null
  demoReviewAction: 'REQUEST_MEDICAL_CORRECTION' | 'COMPLETE_SYNTHETIC_REVIEW' | null
  waitMessage: string | null
  syntheticEtaReference: SyntheticId | null
  journeyFacts: readonly RuntimeStatusJourneyFact[]
}>

export type RuntimeStatusInspectResult =
  | RuntimeStatusSummary
  | RuntimeCaseNotFound
  | RuntimeCommandRejected
  | RuntimePolicyRejected
  | RuntimeStorageFailure

export type RuntimeScrutinyStarted = Readonly<{
  status: 'SCRUTINY_STARTED'
  operation: 'BeginScrutiny'
  caseId: SyntheticId
  revision: number
  scrutinyState: 'IN_REVIEW'
  reviewedDocumentVersionIds: readonly SyntheticId[]
  emittedEventTypes: readonly DomainEventType[]
  emittedEventIds: readonly SyntheticId[]
}>

export type RuntimeScrutinyExisting = Readonly<{
  status: 'SCRUTINY_EXISTING'
  operation: 'BeginScrutiny'
  caseId: SyntheticId
  revision: number
  scrutinyState: ScrutinyState
  idempotentReplay: true
}>

export type RuntimeScrutinyMutationResult =
  | RuntimeScrutinyStarted
  | RuntimeScrutinyExisting
  | RuntimeCaseNotFound
  | RuntimeCommandRejected
  | RuntimePolicyRejected
  | RuntimeStorageFailure

export type RuntimeSyntheticReviewCompleted = Readonly<{
  status: 'SYNTHETIC_REVIEW_COMPLETED'
  operation: 'CompleteSyntheticReview'
  caseId: SyntheticId
  revision: number
  scrutinyState: 'APPROVED'
  etaState: 'ISSUED'
  acceptedDocumentVersionIds: readonly SyntheticId[]
  syntheticEtaReference: SyntheticId
  emittedEventTypes: readonly DomainEventType[]
  emittedEventIds: readonly SyntheticId[]
}>

export type RuntimeSyntheticReviewExisting = Readonly<{
  status: 'SYNTHETIC_REVIEW_EXISTING'
  operation: 'CompleteSyntheticReview'
  caseId: SyntheticId
  revision: number
  scrutinyState: 'APPROVED'
  etaState: 'ISSUED'
  syntheticEtaReference: SyntheticId
  idempotentReplay: true
}>

export type RuntimeSyntheticReviewMutationResult =
  | RuntimeSyntheticReviewCompleted
  | RuntimeSyntheticReviewExisting
  | RuntimeCaseNotFound
  | RuntimeCommandRejected
  | RuntimePolicyRejected
  | RuntimeStorageFailure

export type RuntimeNotificationEvidence = Readonly<{
  outcome:
    | 'QUEUED'
    | 'DELIVERY_SIMULATION_FAILED'
    | 'RETRY_QUEUED'
    | 'RETRY_DELIVERED_SIMULATED'
  reasonCode: string
  persisted: false
}>

export type RuntimeCorrectionRequestAccepted = Readonly<{
  status: 'CORRECTION_REQUESTED'
  operation: 'RequestMedicalCorrection'
  caseId: SyntheticId
  revision: number
  scrutinyState: 'ACTION_REQUIRED'
  documentState: 'REUPLOAD_REQUESTED'
  documentVersionId: SyntheticId
  reasonCode: 'DOC_HOSPITAL_ADMISSION_DATE_UNCLEAR_SYNTHETIC'
  emittedEventTypes: readonly ['ScrutinyActionRequired', 'DocumentReuploadRequested']
  emittedEventIds: readonly SyntheticId[]
  notificationEvidence: readonly RuntimeNotificationEvidence[]
}>

export type RuntimeCorrectionRequestExisting = Readonly<{
  status: 'CORRECTION_REQUEST_EXISTING'
  operation: 'RequestMedicalCorrection'
  caseId: SyntheticId
  revision: number
  scrutinyState: ScrutinyState
  idempotentReplay: true
}>

export type RuntimeCorrectionVersionView = Readonly<{
  documentVersionId: SyntheticId
  fixtureId: SyntheticId
  label: string
  state: DocumentVersionState
}>

export type RuntimeCorrectionSummary = Readonly<{
  status: 'CORRECTION_INSPECTED'
  caseId: SyntheticId
  scenarioId: 'SYN-MEDICAL-001'
  policyQualifiedVersion: PolicyQualifiedVersion
  revision: number
  scrutinyState: 'ACTION_REQUIRED'
  stage: 'REPLACEMENT_REQUIRED' | 'REPLACEMENT_READY'
  reasonCode: 'DOC_HOSPITAL_ADMISSION_DATE_UNCLEAR_SYNTHETIC'
  currentVersion: RuntimeCorrectionVersionView
  versionHistory: readonly RuntimeCorrectionVersionView[]
  replacementOption: Readonly<{
    fixtureId: 'SYN-FIXTURE-HOSPITAL-LETTER-V2-001'
    label: string
    watermark: 'SYNTHETIC — NOT VALID'
  }>
}>

export type RuntimeCorrectionInspectResult =
  | RuntimeCorrectionSummary
  | RuntimeCaseNotFound
  | RuntimeCommandRejected
  | RuntimePolicyRejected
  | RuntimeStorageFailure

export type RuntimeCorrectionPrepared = Readonly<{
  status: 'CORRECTION_REPLACEMENT_READY'
  operation: 'PrepareCorrection'
  caseId: SyntheticId
  revision: number
  scrutinyState: 'ACTION_REQUIRED'
  documentVersionId: SyntheticId
  documentState: 'PREFLIGHT_PASSED'
  supersededVersionId: SyntheticId
  emittedEventTypes: readonly DomainEventType[]
  emittedEventIds: readonly SyntheticId[]
}>

export type RuntimeCorrectionSubmitted = Readonly<{
  status: 'CORRECTION_SUBMITTED'
  operation: 'SubmitCorrection'
  caseId: SyntheticId
  revision: number
  scrutinyState: 'IN_REVIEW'
  documentVersionId: SyntheticId
  documentState: 'UNDER_REVIEW'
  emittedEventTypes: readonly [
    'DocumentVersionSubmitted',
    'ScrutinyResubmitted',
    'ScrutinyResumed',
    'DocumentReviewStarted',
  ]
  emittedEventIds: readonly SyntheticId[]
}>

export type RuntimeCorrectionExisting = Readonly<{
  status: 'CORRECTION_EXISTING'
  operation: 'PrepareCorrection' | 'SubmitCorrection'
  caseId: SyntheticId
  revision: number
  scrutinyState: ScrutinyState
  idempotentReplay: true
}>

export type RuntimeCorrectionMutationResult =
  | RuntimeCorrectionRequestAccepted
  | RuntimeCorrectionRequestExisting
  | RuntimeCorrectionPrepared
  | RuntimeCorrectionSubmitted
  | RuntimeCorrectionExisting
  | RuntimeCaseNotFound
  | RuntimeCommandRejected
  | RuntimePolicyRejected
  | RuntimeStorageFailure

export type RuntimeMetadataSource = Readonly<{
  nextTimestamp(previousTimestamp: SyntheticTimestamp): SyntheticTimestamp
  commandId(caseId: SyntheticId, operation: RuntimeOperation, revision: number): SyntheticId
  eventId(caseId: SyntheticId, eventType: DomainEventType, revision: number): SyntheticId
  snapshotId(caseId: SyntheticId, sequence: number): SyntheticId
  documentAssetId(caseId: SyntheticId, requirementId: string): SyntheticId
  documentVersionId(caseId: SyntheticId, fixtureId: SyntheticId, sequence: number): SyntheticId
  paymentAttemptId(caseId: SyntheticId): SyntheticId
  paymentReference(caseId: SyntheticId): SyntheticId
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
  inspectDocuments(candidate: unknown): RuntimeDocumentInspectResult
  prepareDocumentFixture(candidate: unknown): RuntimeDocumentMutationResult
  inspectReview(candidate: unknown): RuntimeReviewInspectResult
  prepareReview(candidate: unknown): RuntimeReviewMutationResult
  submitApplication(candidate: unknown): RuntimeReviewMutationResult
  inspectPayment(candidate: unknown): RuntimePaymentInspectResult
  startMockPayment(candidate: unknown): RuntimePaymentMutationResult
  checkMockPaymentStatus(candidate: unknown): RuntimePaymentMutationResult
  inspectStatus(candidate: unknown): RuntimeStatusInspectResult
  beginScrutiny(candidate: unknown): RuntimeScrutinyMutationResult
  requestMedicalCorrection(candidate: unknown): RuntimeCorrectionMutationResult
  inspectCorrection(candidate: unknown): RuntimeCorrectionInspectResult
  prepareCorrection(candidate: unknown): RuntimeCorrectionMutationResult
  submitCorrection(candidate: unknown): RuntimeCorrectionMutationResult
  completeSyntheticReview(candidate: unknown): RuntimeSyntheticReviewMutationResult
}>
