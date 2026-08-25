import {
  transitionDocumentVersionState,
  transitionScrutinyState,
  type DomainCommand,
  type SyntheticId,
} from '../domain'
import { syntheticIdSchema } from '../domain/ids'
import { hospitalLetterV2Fixture } from '../fixtures'
import type { PolicyEvaluationResult } from '../policy'
import { deepFreeze } from '../policy/schema'
import {
  persistedCaseSchema,
  persistedDomainEventSchema,
  type PersistedCase,
  type PersistedDomainEvent,
} from '../persistence'
import type {
  RuntimeCorrectionSummary,
  RuntimeMetadataSource,
} from './contracts'
import { documentFixtureForVersionId } from './document-runtime'

export const MEDICAL_CORRECTION_REASON =
  'DOC_HOSPITAL_ADMISSION_DATE_UNCLEAR_SYNTHETIC' as const
export const HOSPITAL_REQUIREMENT_ID = 'REQ-HOSPITAL-LETTER-1' as const
export const HOSPITAL_V2_FIXTURE_ID =
  'SYN-FIXTURE-HOSPITAL-LETTER-V2-001' as const

type RequestApplicantActionCommand = Extract<
  DomainCommand,
  { type: 'RequestApplicantAction' }
>
type RequestReuploadCommand = Extract<DomainCommand, { type: 'RequestReupload' }>
type SubmitDocumentVersionCommand = Extract<
  DomainCommand,
  { type: 'SubmitDocumentVersion' }
>
type SubmitCorrectionCommand = Extract<DomainCommand, { type: 'SubmitCorrection' }>
type ResumeScrutinyCommand = Extract<DomainCommand, { type: 'ResumeScrutiny' }>
type StartDocumentReviewCommand = Extract<
  DomainCommand,
  { type: 'StartDocumentReview' }
>

export type CorrectionMutation = Readonly<{
  accepted: true
  persistedCase: PersistedCase
  documentVersionId: SyntheticId
  events: readonly PersistedDomainEvent[]
}>

export type CorrectionMutationRejection = Readonly<{
  accepted: false
  reasonCode: 'GUARD_FAILED' | 'INVALID_LIFECYCLE_TRANSITION'
}>

export type CorrectionProjectionResult =
  | Readonly<{ accepted: true; summary: RuntimeCorrectionSummary }>
  | CorrectionMutationRejection

function childIdempotencyKey(idempotencyKey: SyntheticId, suffix: string): SyntheticId {
  return syntheticIdSchema.parse(`${idempotencyKey}-${suffix}`)
}

export function medicalCorrectionIdempotencyKey(caseId: SyntheticId): SyntheticId {
  return syntheticIdSchema.parse(
    `SYN-IDEMPOTENCY-CORRECTION-${caseId.slice('SYN-'.length)}-REQUEST`,
  )
}

export function correctionPreparationIdempotencyKey(caseId: SyntheticId): SyntheticId {
  return syntheticIdSchema.parse(
    `SYN-IDEMPOTENCY-CORRECTION-${caseId.slice('SYN-'.length)}-PREPARE-V2`,
  )
}

export function correctionSubmissionIdempotencyKey(caseId: SyntheticId): SyntheticId {
  return syntheticIdSchema.parse(
    `SYN-IDEMPOTENCY-CORRECTION-${caseId.slice('SYN-'.length)}-SUBMIT-V2`,
  )
}

function hospitalAggregate(persistedCase: PersistedCase) {
  return persistedCase.documents.find(
    ({ requirementId }) => requirementId === HOSPITAL_REQUIREMENT_ID,
  )
}

function activeHospitalVersion(persistedCase: PersistedCase) {
  const aggregate = hospitalAggregate(persistedCase)
  return aggregate?.versions.find(
    ({ documentVersionId }) => documentVersionId === aggregate.activeVersionId,
  )
}

function hasCorrectionReason(persistedCase: PersistedCase): boolean {
  return persistedCase.auditEvents.some(
    (event) =>
      (event.eventType === 'ScrutinyActionRequired' ||
        event.eventType === 'DocumentReuploadRequested') &&
      event.payload.outcomeCode === MEDICAL_CORRECTION_REASON,
  )
}

export function buildCorrectionSummary(
  persistedCase: PersistedCase,
  evaluation: PolicyEvaluationResult,
): CorrectionProjectionResult {
  if (
    persistedCase.scenarioId !== 'SYN-MEDICAL-001' ||
    persistedCase.application.state !== 'LOCKED' ||
    persistedCase.payment.state !== 'CONFIRMED' ||
    persistedCase.scrutiny.state !== 'ACTION_REQUIRED' ||
    evaluation.scenarioSupport !== 'SUPPORTED_BY_DEMO' ||
    evaluation.policy.qualifiedVersion !== persistedCase.policyPin.qualifiedVersion ||
    !evaluation.documentManifest?.requirements.some(
      ({ id, required }) => id === HOSPITAL_REQUIREMENT_ID && required,
    ) ||
    !hasCorrectionReason(persistedCase)
  ) {
    return deepFreeze({ accepted: false, reasonCode: 'GUARD_FAILED' })
  }

  const aggregate = hospitalAggregate(persistedCase)
  const currentVersion = activeHospitalVersion(persistedCase)
  if (aggregate === undefined || currentVersion === undefined) {
    return deepFreeze({ accepted: false, reasonCode: 'GUARD_FAILED' })
  }

  const versionHistory = aggregate.versions.flatMap((version) => {
    const fixture = documentFixtureForVersionId(version.documentVersionId)
    return fixture === undefined
      ? []
      : [{
          documentVersionId: version.documentVersionId,
          fixtureId: fixture.fixtureId,
          label: fixture.label,
          state: version.state,
        }]
  })
  const currentFixture = documentFixtureForVersionId(currentVersion.documentVersionId)
  const v1 = versionHistory.find(
    ({ fixtureId }) => fixtureId === 'SYN-FIXTURE-HOSPITAL-LETTER-V1-001',
  )
  const replacementRequired =
    currentFixture?.fixtureId === 'SYN-FIXTURE-HOSPITAL-LETTER-V1-001' &&
    currentVersion.state === 'REUPLOAD_REQUESTED'
  const replacementReady =
    currentFixture?.fixtureId === HOSPITAL_V2_FIXTURE_ID &&
    currentVersion.state === 'PREFLIGHT_PASSED' &&
    v1?.state === 'SUPERSEDED'
  if (
    currentFixture === undefined ||
    v1 === undefined ||
    (!replacementRequired && !replacementReady)
  ) {
    return deepFreeze({ accepted: false, reasonCode: 'GUARD_FAILED' })
  }

  return deepFreeze({
    accepted: true,
    summary: {
      status: 'CORRECTION_INSPECTED',
      caseId: persistedCase.caseId,
      scenarioId: 'SYN-MEDICAL-001',
      policyQualifiedVersion: persistedCase.policyPin.qualifiedVersion,
      revision: persistedCase.revision,
      scrutinyState: 'ACTION_REQUIRED',
      stage: replacementReady ? 'REPLACEMENT_READY' : 'REPLACEMENT_REQUIRED',
      reasonCode: MEDICAL_CORRECTION_REASON,
      currentVersion: {
        documentVersionId: currentVersion.documentVersionId,
        fixtureId: currentFixture.fixtureId,
        label: currentFixture.label,
        state: currentVersion.state,
      },
      versionHistory,
      replacementOption: {
        fixtureId: HOSPITAL_V2_FIXTURE_ID,
        label: hospitalLetterV2Fixture.label,
        watermark: hospitalLetterV2Fixture.watermark,
      },
    },
  })
}

export function applyMedicalCorrectionRequest(input: {
  persistedCase: PersistedCase
  idempotencyKey: SyntheticId
  metadata: RuntimeMetadataSource
}): CorrectionMutation | CorrectionMutationRejection {
  const aggregate = hospitalAggregate(input.persistedCase)
  const version = activeHospitalVersion(input.persistedCase)
  const fixture =
    version === undefined ? undefined : documentFixtureForVersionId(version.documentVersionId)
  if (
    input.persistedCase.scenarioId !== 'SYN-MEDICAL-001' ||
    input.persistedCase.application.state !== 'LOCKED' ||
    input.persistedCase.payment.state !== 'CONFIRMED' ||
    input.persistedCase.scrutiny.state !== 'IN_REVIEW' ||
    aggregate === undefined ||
    version === undefined ||
    fixture?.fixtureId !== 'SYN-FIXTURE-HOSPITAL-LETTER-V1-001' ||
    version.state !== 'UNDER_REVIEW'
  ) {
    return deepFreeze({ accepted: false, reasonCode: 'GUARD_FAILED' })
  }

  const scrutinyTransition = transitionScrutinyState('IN_REVIEW', 'ACTION_REQUIRED')
  const documentTransition = transitionDocumentVersionState(
    'UNDER_REVIEW',
    'REUPLOAD_REQUESTED',
  )
  if (!scrutinyTransition.accepted || !documentTransition.accepted) {
    return deepFreeze({ accepted: false, reasonCode: 'INVALID_LIFECYCLE_TRANSITION' })
  }

  const scrutinyRevision = input.persistedCase.revision + 1
  const scrutinyTimestamp = input.metadata.nextTimestamp(input.persistedCase.updatedAt)
  const scrutinyCommand: RequestApplicantActionCommand = deepFreeze({
    commandId: input.metadata.commandId(
      input.persistedCase.caseId,
      'RequestMedicalCorrection',
      scrutinyRevision,
    ),
    type: 'RequestApplicantAction',
    caseId: input.persistedCase.caseId,
    actor: 'REVIEWER',
    syntheticTimestamp: scrutinyTimestamp,
    idempotencyKey: childIdempotencyKey(input.idempotencyKey, 'SCRUTINY'),
    payload: {
      scrutinyRecordId: input.persistedCase.scrutiny.scrutinyRecordId,
      documentVersionId: version.documentVersionId,
      reasonCode: 'R-SYN-DOCUMENT-CORRECTION-REQUESTED',
    },
  })
  const scrutinyEvent = persistedDomainEventSchema.parse({
    eventId: input.metadata.eventId(
      input.persistedCase.caseId,
      'ScrutinyActionRequired',
      scrutinyRevision,
    ),
    caseId: input.persistedCase.caseId,
    eventType: 'ScrutinyActionRequired',
    domain: 'SCRUTINY',
    aggregateId: input.persistedCase.scrutiny.scrutinyRecordId,
    previousState: scrutinyTransition.previousState,
    newState: scrutinyTransition.nextState,
    actor: scrutinyCommand.actor,
    syntheticTimestamp: scrutinyTimestamp,
    policyQualifiedVersion: input.persistedCase.policyPin.qualifiedVersion,
    reasonCode: scrutinyCommand.payload.reasonCode,
    idempotencyKey: scrutinyCommand.idempotencyKey,
    payload: {
      scrutinyRecordId: input.persistedCase.scrutiny.scrutinyRecordId,
      documentAssetId: aggregate.documentAssetId,
      documentVersionId: version.documentVersionId,
      outcomeCode: MEDICAL_CORRECTION_REASON,
    },
  })

  const documentRevision = scrutinyRevision + 1
  const documentTimestamp = input.metadata.nextTimestamp(scrutinyTimestamp)
  const documentCommand: RequestReuploadCommand = deepFreeze({
    commandId: input.metadata.commandId(
      input.persistedCase.caseId,
      'RequestMedicalCorrection',
      documentRevision,
    ),
    type: 'RequestReupload',
    caseId: input.persistedCase.caseId,
    actor: 'REVIEWER',
    syntheticTimestamp: documentTimestamp,
    idempotencyKey: childIdempotencyKey(input.idempotencyKey, 'DOCUMENT'),
    payload: {
      documentVersionId: version.documentVersionId,
      reasonCode: 'R-SYN-DOCUMENT-CORRECTION-REQUESTED',
    },
  })
  const documentEvent = persistedDomainEventSchema.parse({
    eventId: input.metadata.eventId(
      input.persistedCase.caseId,
      'DocumentReuploadRequested',
      documentRevision,
    ),
    caseId: input.persistedCase.caseId,
    eventType: 'DocumentReuploadRequested',
    domain: 'DOCUMENT',
    aggregateId: aggregate.documentAssetId,
    previousState: documentTransition.previousState,
    newState: documentTransition.nextState,
    actor: documentCommand.actor,
    syntheticTimestamp: documentTimestamp,
    policyQualifiedVersion: input.persistedCase.policyPin.qualifiedVersion,
    reasonCode: documentCommand.payload.reasonCode,
    idempotencyKey: documentCommand.idempotencyKey,
    payload: {
      documentAssetId: aggregate.documentAssetId,
      documentVersionId: version.documentVersionId,
      outcomeCode: MEDICAL_CORRECTION_REASON,
    },
  })

  const nextCase = persistedCaseSchema.parse({
    ...input.persistedCase,
    revision: documentRevision,
    updatedAt: documentTimestamp,
    scrutiny: {
      ...input.persistedCase.scrutiny,
      state: scrutinyTransition.nextState,
    },
    documents: input.persistedCase.documents.map((candidate) =>
      candidate.requirementId === HOSPITAL_REQUIREMENT_ID
        ? {
            ...candidate,
            versions: candidate.versions.map((candidateVersion) =>
              candidateVersion.documentVersionId === version.documentVersionId
                ? { ...candidateVersion, state: documentTransition.nextState }
                : candidateVersion,
            ),
          }
        : candidate,
    ),
    auditEvents: [
      ...input.persistedCase.auditEvents,
      scrutinyEvent,
      documentEvent,
    ],
  })

  return deepFreeze({
    accepted: true,
    persistedCase: nextCase,
    documentVersionId: version.documentVersionId,
    events: [scrutinyEvent, documentEvent],
  })
}

function updateCaseWithEvent(input: {
  persistedCase: PersistedCase
  event: PersistedDomainEvent
  documents?: PersistedCase['documents']
  scrutiny?: PersistedCase['scrutiny']
}): PersistedCase {
  return persistedCaseSchema.parse({
    ...input.persistedCase,
    revision: input.persistedCase.revision + 1,
    updatedAt: input.event.syntheticTimestamp,
    ...(input.documents === undefined ? {} : { documents: input.documents }),
    ...(input.scrutiny === undefined ? {} : { scrutiny: input.scrutiny }),
    auditEvents: [...input.persistedCase.auditEvents, input.event],
  })
}

export function applyCorrectionSubmission(input: {
  persistedCase: PersistedCase
  idempotencyKey: SyntheticId
  metadata: RuntimeMetadataSource
}): CorrectionMutation | CorrectionMutationRejection {
  const aggregate = hospitalAggregate(input.persistedCase)
  const version = activeHospitalVersion(input.persistedCase)
  const fixture =
    version === undefined ? undefined : documentFixtureForVersionId(version.documentVersionId)
  const predecessor = aggregate?.versions.find(
    ({ documentVersionId }) => documentVersionId === version?.predecessorVersionId,
  )
  if (
    input.persistedCase.scenarioId !== 'SYN-MEDICAL-001' ||
    input.persistedCase.application.state !== 'LOCKED' ||
    input.persistedCase.payment.state !== 'CONFIRMED' ||
    input.persistedCase.scrutiny.state !== 'ACTION_REQUIRED' ||
    aggregate === undefined ||
    version === undefined ||
    fixture?.fixtureId !== HOSPITAL_V2_FIXTURE_ID ||
    version.state !== 'PREFLIGHT_PASSED' ||
    predecessor?.state !== 'SUPERSEDED' ||
    !input.persistedCase.scrutiny.submittedDocumentVersionIds.includes(
      predecessor.documentVersionId,
    )
  ) {
    return deepFreeze({ accepted: false, reasonCode: 'GUARD_FAILED' })
  }

  const submitted = transitionDocumentVersionState(version.state, 'SUBMITTED')
  const resubmitted = transitionScrutinyState('ACTION_REQUIRED', 'RESUBMITTED')
  const resumed = transitionScrutinyState('RESUBMITTED', 'IN_REVIEW')
  const reviewed = transitionDocumentVersionState('SUBMITTED', 'UNDER_REVIEW')
  if (!submitted.accepted || !resubmitted.accepted || !resumed.accepted || !reviewed.accepted) {
    return deepFreeze({ accepted: false, reasonCode: 'INVALID_LIFECYCLE_TRANSITION' })
  }

  const events: PersistedDomainEvent[] = []
  let currentCase = input.persistedCase

  const submitRevision = currentCase.revision + 1
  const submitTimestamp = input.metadata.nextTimestamp(currentCase.updatedAt)
  const submitCommand: SubmitDocumentVersionCommand = deepFreeze({
    commandId: input.metadata.commandId(currentCase.caseId, 'SubmitCorrection', submitRevision),
    type: 'SubmitDocumentVersion',
    caseId: currentCase.caseId,
    actor: 'APPLICANT',
    syntheticTimestamp: submitTimestamp,
    idempotencyKey: childIdempotencyKey(input.idempotencyKey, 'DOCUMENT-SUBMIT'),
    payload: { documentVersionId: version.documentVersionId },
  })
  const submitEvent = persistedDomainEventSchema.parse({
    eventId: input.metadata.eventId(currentCase.caseId, 'DocumentVersionSubmitted', submitRevision),
    caseId: currentCase.caseId,
    eventType: 'DocumentVersionSubmitted',
    domain: 'DOCUMENT',
    aggregateId: aggregate.documentAssetId,
    previousState: submitted.previousState,
    newState: submitted.nextState,
    actor: submitCommand.actor,
    syntheticTimestamp: submitTimestamp,
    policyQualifiedVersion: currentCase.policyPin.qualifiedVersion,
    idempotencyKey: submitCommand.idempotencyKey,
    payload: {
      documentAssetId: aggregate.documentAssetId,
      documentVersionId: version.documentVersionId,
    },
  })
  const submittedDocuments = currentCase.documents.map((candidate) =>
    candidate.requirementId === HOSPITAL_REQUIREMENT_ID
      ? {
          ...candidate,
          versions: candidate.versions.map((candidateVersion) =>
            candidateVersion.documentVersionId === version.documentVersionId
              ? { ...candidateVersion, state: submitted.nextState }
              : candidateVersion,
          ),
        }
      : candidate,
  )
  const submittedScrutiny = {
    ...currentCase.scrutiny,
    submittedDocumentVersionIds: currentCase.scrutiny.submittedDocumentVersionIds.map(
      (documentVersionId) =>
        documentVersionId === predecessor.documentVersionId
          ? version.documentVersionId
          : documentVersionId,
    ),
  }
  currentCase = updateCaseWithEvent({
    persistedCase: currentCase,
    event: submitEvent,
    documents: submittedDocuments,
    scrutiny: submittedScrutiny,
  })
  events.push(submitEvent)

  const resubmitRevision = currentCase.revision + 1
  const resubmitTimestamp = input.metadata.nextTimestamp(currentCase.updatedAt)
  const resubmitCommand: SubmitCorrectionCommand = deepFreeze({
    commandId: input.metadata.commandId(currentCase.caseId, 'SubmitCorrection', resubmitRevision),
    type: 'SubmitCorrection',
    caseId: currentCase.caseId,
    actor: 'APPLICANT',
    syntheticTimestamp: resubmitTimestamp,
    idempotencyKey: childIdempotencyKey(input.idempotencyKey, 'SCRUTINY-RESUBMIT'),
    payload: {
      scrutinyRecordId: currentCase.scrutiny.scrutinyRecordId,
      replacementVersionIds: [version.documentVersionId],
    },
  })
  const resubmitEvent = persistedDomainEventSchema.parse({
    eventId: input.metadata.eventId(currentCase.caseId, 'ScrutinyResubmitted', resubmitRevision),
    caseId: currentCase.caseId,
    eventType: 'ScrutinyResubmitted',
    domain: 'SCRUTINY',
    aggregateId: currentCase.scrutiny.scrutinyRecordId,
    previousState: resubmitted.previousState,
    newState: resubmitted.nextState,
    actor: resubmitCommand.actor,
    syntheticTimestamp: resubmitTimestamp,
    policyQualifiedVersion: currentCase.policyPin.qualifiedVersion,
    idempotencyKey: resubmitCommand.idempotencyKey,
    payload: {
      scrutinyRecordId: currentCase.scrutiny.scrutinyRecordId,
      documentVersionId: version.documentVersionId,
      outcomeCode: 'CORRECTION_RESUBMITTED',
    },
  })
  currentCase = updateCaseWithEvent({
    persistedCase: currentCase,
    event: resubmitEvent,
    scrutiny: { ...currentCase.scrutiny, state: resubmitted.nextState },
  })
  events.push(resubmitEvent)

  const resumeRevision = currentCase.revision + 1
  const resumeTimestamp = input.metadata.nextTimestamp(currentCase.updatedAt)
  const resumeCommand: ResumeScrutinyCommand = deepFreeze({
    commandId: input.metadata.commandId(currentCase.caseId, 'SubmitCorrection', resumeRevision),
    type: 'ResumeScrutiny',
    caseId: currentCase.caseId,
    actor: 'REVIEWER',
    syntheticTimestamp: resumeTimestamp,
    idempotencyKey: childIdempotencyKey(input.idempotencyKey, 'SCRUTINY-RESUME'),
    payload: { scrutinyRecordId: currentCase.scrutiny.scrutinyRecordId },
  })
  const resumeEvent = persistedDomainEventSchema.parse({
    eventId: input.metadata.eventId(currentCase.caseId, 'ScrutinyResumed', resumeRevision),
    caseId: currentCase.caseId,
    eventType: 'ScrutinyResumed',
    domain: 'SCRUTINY',
    aggregateId: currentCase.scrutiny.scrutinyRecordId,
    previousState: resumed.previousState,
    newState: resumed.nextState,
    actor: resumeCommand.actor,
    syntheticTimestamp: resumeTimestamp,
    policyQualifiedVersion: currentCase.policyPin.qualifiedVersion,
    idempotencyKey: resumeCommand.idempotencyKey,
    payload: { scrutinyRecordId: currentCase.scrutiny.scrutinyRecordId },
  })
  currentCase = updateCaseWithEvent({
    persistedCase: currentCase,
    event: resumeEvent,
    scrutiny: { ...currentCase.scrutiny, state: resumed.nextState },
  })
  events.push(resumeEvent)

  const reviewRevision = currentCase.revision + 1
  const reviewTimestamp = input.metadata.nextTimestamp(currentCase.updatedAt)
  const reviewCommand: StartDocumentReviewCommand = deepFreeze({
    commandId: input.metadata.commandId(currentCase.caseId, 'SubmitCorrection', reviewRevision),
    type: 'StartDocumentReview',
    caseId: currentCase.caseId,
    actor: 'REVIEWER',
    syntheticTimestamp: reviewTimestamp,
    idempotencyKey: childIdempotencyKey(input.idempotencyKey, 'DOCUMENT-REVIEW'),
    payload: { documentVersionId: version.documentVersionId },
  })
  const reviewEvent = persistedDomainEventSchema.parse({
    eventId: input.metadata.eventId(currentCase.caseId, 'DocumentReviewStarted', reviewRevision),
    caseId: currentCase.caseId,
    eventType: 'DocumentReviewStarted',
    domain: 'DOCUMENT',
    aggregateId: aggregate.documentAssetId,
    previousState: reviewed.previousState,
    newState: reviewed.nextState,
    actor: reviewCommand.actor,
    syntheticTimestamp: reviewTimestamp,
    policyQualifiedVersion: currentCase.policyPin.qualifiedVersion,
    idempotencyKey: reviewCommand.idempotencyKey,
    payload: {
      documentAssetId: aggregate.documentAssetId,
      documentVersionId: version.documentVersionId,
      scrutinyRecordId: currentCase.scrutiny.scrutinyRecordId,
    },
  })
  const reviewedDocuments = currentCase.documents.map((candidate) =>
    candidate.requirementId === HOSPITAL_REQUIREMENT_ID
      ? {
          ...candidate,
          versions: candidate.versions.map((candidateVersion) =>
            candidateVersion.documentVersionId === version.documentVersionId
              ? { ...candidateVersion, state: reviewed.nextState }
              : candidateVersion,
          ),
        }
      : candidate,
  )
  currentCase = updateCaseWithEvent({
    persistedCase: currentCase,
    event: reviewEvent,
    documents: reviewedDocuments,
  })
  events.push(reviewEvent)

  return deepFreeze({
    accepted: true,
    persistedCase: currentCase,
    documentVersionId: version.documentVersionId,
    events,
  })
}
