import type { ReasonCode, SyntheticId, SyntheticTimestamp } from './ids'

export const COMMAND_TYPES = Object.freeze([
  'CreateDraft',
  'BeginDraft',
  'SaveSnapshot',
  'MarkReadyForReview',
  'ConfirmReview',
  'SubmitApplication',
  'LockSubmission',
  'CreateDocumentVersion',
  'PreflightPassed',
  'PreflightFailed',
  'SubmitDocumentVersion',
  'StartDocumentReview',
  'RequestReupload',
  'ActivateReplacement',
  'AcceptDocument',
  'StartMockPayment',
  'MockResultPending',
  'MarkAmbiguous',
  'ReconcileConfirmed',
  'QueueScrutiny',
  'BeginScrutiny',
  'RequestApplicantAction',
  'SubmitCorrection',
  'ResumeScrutiny',
  'RecordSyntheticApproval',
  'MarkETAReady',
  'IssueSyntheticETA',
] as const)

export type CommandType = (typeof COMMAND_TYPES)[number]
export type CommandActor = 'APPLICANT' | 'SYSTEM' | 'REVIEWER' | 'PAYMENT_MOCK'

type CommandDefinition = Readonly<{
  actor: CommandActor
  payload: Readonly<Record<string, string | number | boolean | readonly string[]>>
}>

export type CommandDefinitions = Readonly<{
  CreateDraft: { actor: 'APPLICANT'; payload: { policyEvaluationId: SyntheticId } }
  BeginDraft: { actor: 'APPLICANT'; payload: { applicationDraftId: SyntheticId } }
  SaveSnapshot: {
    actor: 'APPLICANT'
    payload: { draftSnapshotId: SyntheticId; stepId: string }
  }
  MarkReadyForReview: { actor: 'SYSTEM'; payload: { applicationDraftId: SyntheticId } }
  ConfirmReview: { actor: 'APPLICANT'; payload: { applicationDraftId: SyntheticId } }
  SubmitApplication: { actor: 'APPLICANT'; payload: { applicationDraftId: SyntheticId } }
  LockSubmission: { actor: 'SYSTEM'; payload: { applicationDraftId: SyntheticId } }
  CreateDocumentVersion: {
    actor: 'APPLICANT'
    payload: { documentAssetId: SyntheticId; fixtureCategory: string; sequence: number }
  }
  PreflightPassed: { actor: 'SYSTEM'; payload: { documentVersionId: SyntheticId } }
  PreflightFailed: {
    actor: 'SYSTEM'
    payload: { documentVersionId: SyntheticId; reasonCode: ReasonCode }
  }
  SubmitDocumentVersion: {
    actor: 'APPLICANT'
    payload: { documentVersionId: SyntheticId }
  }
  StartDocumentReview: { actor: 'REVIEWER'; payload: { documentVersionId: SyntheticId } }
  RequestReupload: {
    actor: 'REVIEWER'
    payload: { documentVersionId: SyntheticId; reasonCode: ReasonCode }
  }
  ActivateReplacement: {
    actor: 'SYSTEM'
    payload: { previousVersionId: SyntheticId; replacementVersionId: SyntheticId }
  }
  AcceptDocument: { actor: 'REVIEWER'; payload: { documentVersionId: SyntheticId } }
  StartMockPayment: { actor: 'APPLICANT'; payload: { amount: number } }
  MockResultPending: { actor: 'PAYMENT_MOCK'; payload: { attemptId: SyntheticId } }
  MarkAmbiguous: { actor: 'SYSTEM'; payload: { attemptId: SyntheticId } }
  ReconcileConfirmed: { actor: 'PAYMENT_MOCK'; payload: { attemptId: SyntheticId } }
  QueueScrutiny: { actor: 'SYSTEM'; payload: { scrutinyRecordId: SyntheticId } }
  BeginScrutiny: { actor: 'REVIEWER'; payload: { scrutinyRecordId: SyntheticId } }
  RequestApplicantAction: {
    actor: 'REVIEWER'
    payload: { scrutinyRecordId: SyntheticId; documentVersionId: SyntheticId; reasonCode: ReasonCode }
  }
  SubmitCorrection: {
    actor: 'APPLICANT'
    payload: { scrutinyRecordId: SyntheticId; replacementVersionIds: readonly string[] }
  }
  ResumeScrutiny: { actor: 'REVIEWER'; payload: { scrutinyRecordId: SyntheticId } }
  RecordSyntheticApproval: { actor: 'REVIEWER'; payload: { scrutinyRecordId: SyntheticId } }
  MarkETAReady: { actor: 'SYSTEM'; payload: { syntheticEtaId: SyntheticId } }
  IssueSyntheticETA: { actor: 'SYSTEM'; payload: { syntheticEtaId: SyntheticId } }
}>

type CheckedCommandDefinitions = {
  readonly [Type in keyof CommandDefinitions]: CommandDefinitions[Type] extends CommandDefinition
    ? CommandDefinitions[Type]
    : never
}

export type DomainCommand = {
  [Type in keyof CheckedCommandDefinitions]: Readonly<{
    commandId: SyntheticId
    type: Type
    caseId: SyntheticId
    actor: CheckedCommandDefinitions[Type]['actor']
    syntheticTimestamp: SyntheticTimestamp
    idempotencyKey: SyntheticId
    payload: Readonly<CheckedCommandDefinitions[Type]['payload']>
  }>
}[keyof CheckedCommandDefinitions]

export type CommandRejection = Readonly<{
  accepted: false
  commandId: SyntheticId
  reasonCode: 'INVALID_LIFECYCLE_TRANSITION' | 'IDEMPOTENCY_CONFLICT' | 'GUARD_FAILED'
}>
