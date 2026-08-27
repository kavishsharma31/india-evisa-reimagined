import {
  transitionDocumentVersionState,
  transitionScrutinyState,
  type DomainCommand,
  type SyntheticId,
} from '../domain'
import { syntheticIdSchema } from '../domain/ids'
import type { PolicyEvaluationResult } from '../policy'
import { deepFreeze } from '../policy/schema'
import {
  persistedCaseSchema,
  persistedDomainEventSchema,
  type PersistedCase,
  type PersistedDomainEvent,
} from '../persistence'
import type { RuntimeMetadataSource, RuntimeStatusSummary } from './contracts'
import { documentFixtureForVersionId } from './document-runtime'

type ScrutinyEntryCommand = Extract<
  DomainCommand,
  { type: 'QueueScrutiny' | 'BeginScrutiny' | 'StartDocumentReview' }
>

export type StatusProjectionResult =
  | Readonly<{ accepted: true; summary: RuntimeStatusSummary }>
  | Readonly<{ accepted: false; reasonCode: 'GUARD_FAILED' }>

export type ScrutinyEntryMutation = Readonly<{
  accepted: true
  persistedCase: PersistedCase
  events: readonly PersistedDomainEvent[]
}>

export type ScrutinyEntryRejection = Readonly<{
  accepted: false
  reasonCode: 'GUARD_FAILED' | 'INVALID_LIFECYCLE_TRANSITION'
}>

function childIdempotencyKey(idempotencyKey: SyntheticId, suffix: string): SyntheticId {
  return syntheticIdSchema.parse(`${idempotencyKey}-${suffix}`)
}

export function scrutinyEntryIdempotencyKey(caseId: SyntheticId): SyntheticId {
  return syntheticIdSchema.parse(
    `SYN-IDEMPOTENCY-STATUS-${caseId.slice('SYN-'.length)}-BEGIN`,
  )
}

function statusContent(input: {
  scrutinyState: PersistedCase['scrutiny']['state']
  etaState: PersistedCase['eta']['state']
  replacementReady: boolean
}): Readonly<{
  headline: string
  explanation: string
  applicantActionRequired: boolean
  nextAction: 'BEGIN_SCRUTINY' | 'REPLACE_HOSPITAL_LETTER' | null
  actionGuidance: string | null
  waitMessage: string | null
}> {
  if (input.scrutinyState === 'NOT_STARTED') {
    return Object.freeze({
      headline: 'Ready for review',
      explanation: 'Your confirmed synthetic application can enter local review.',
      applicantActionRequired: false,
      nextAction: 'BEGIN_SCRUTINY',
      actionGuidance: null,
      waitMessage: null,
    })
  }
  if (input.scrutinyState === 'ACTION_REQUIRED') {
    return Object.freeze({
      headline: 'Action required',
      explanation: input.replacementReady
        ? 'Your corrected synthetic hospital letter is ready to submit.'
        : 'Your synthetic hospital letter needs one correction.',
      applicantActionRequired: true,
      nextAction: 'REPLACE_HOSPITAL_LETTER',
      actionGuidance:
        'The admission date on the demo hospital letter could not be confirmed during synthetic review.',
      waitMessage: null,
    })
  }
  if (input.scrutinyState === 'APPROVED') {
    return Object.freeze({
      headline: 'Demo application approved',
      explanation:
        input.etaState === 'ISSUED'
          ? 'Local synthetic review is complete and a non-valid prototype ETA is available below.'
          : 'Local synthetic review is complete. This is not a government decision.',
      applicantActionRequired: false,
      nextAction: null,
      actionGuidance: null,
      waitMessage: null,
    })
  }
  return Object.freeze({
    headline: 'Under review',
    explanation: 'Your synthetic application is being reviewed.',
    applicantActionRequired: false,
    nextAction: null,
    actionGuidance: null,
    waitMessage: 'No action is needed now. Synthetic scrutiny is continuing.',
  })
}

export function buildStatusSummary(
  persistedCase: PersistedCase,
  evaluation: PolicyEvaluationResult,
): StatusProjectionResult {
  const purposeFamily = evaluation.suggestedPurposeFamily
  const documentManifest = evaluation.documentManifest
  if (
    persistedCase.application.state !== 'LOCKED' ||
    persistedCase.payment.state !== 'CONFIRMED' ||
    evaluation.scenarioSupport !== 'SUPPORTED_BY_DEMO' ||
    evaluation.policy.qualifiedVersion !== persistedCase.policyPin.qualifiedVersion ||
    purposeFamily === undefined ||
    documentManifest === undefined
  ) {
    return deepFreeze({ accepted: false, reasonCode: 'GUARD_FAILED' })
  }

  const requiredDocuments = documentManifest.requirements.filter(({ required }) => required)
  const currentVersions = requiredDocuments.map((requirement) => {
    const document = persistedCase.documents.find(
      ({ requirementId }) => requirementId === requirement.id,
    )
    return document?.versions.find(
      ({ documentVersionId }) => documentVersionId === document.activeVersionId,
    )
  })
  if (currentVersions.some((version) => version === undefined)) {
    return deepFreeze({ accepted: false, reasonCode: 'GUARD_FAILED' })
  }

  const documentsUnderReview = currentVersions.every(
    (version) => version?.state === 'UNDER_REVIEW',
  )
  const documentsAccepted = currentVersions.every(
    (version) => version?.state === 'ACCEPTED',
  )
  const documentsSubmitted = currentVersions.every(
    (version) => version?.state === 'SUBMITTED',
  )
  const hospitalVersion = currentVersions.find((_version, index) =>
    requiredDocuments[index]?.id === 'REQ-HOSPITAL-LETTER-1'
  )
  const actionRequiredDocumentsValid =
    persistedCase.scrutiny.state === 'ACTION_REQUIRED' &&
    hospitalVersion !== undefined &&
    (hospitalVersion.state === 'REUPLOAD_REQUESTED' ||
      hospitalVersion.state === 'PREFLIGHT_PASSED') &&
    currentVersions.every((version) =>
      version === hospitalVersion ? true : version?.state === 'UNDER_REVIEW',
    )
  if (
    persistedCase.scrutiny.state === 'NOT_STARTED'
      ? !documentsSubmitted || persistedCase.eta.state !== 'NOT_READY'
      : persistedCase.scrutiny.state === 'ACTION_REQUIRED'
        ? !actionRequiredDocumentsValid || persistedCase.eta.state !== 'NOT_READY'
        : persistedCase.scrutiny.state === 'APPROVED'
          ? !documentsAccepted || persistedCase.eta.state !== 'ISSUED'
          : !documentsUnderReview || persistedCase.eta.state !== 'NOT_READY'
  ) {
    return deepFreeze({ accepted: false, reasonCode: 'GUARD_FAILED' })
  }

  const content = statusContent({
    scrutinyState: persistedCase.scrutiny.state,
    etaState: persistedCase.eta.state,
    replacementReady: hospitalVersion?.state === 'PREFLIGHT_PASSED',
  })
  const canRequestMedicalCorrection =
    persistedCase.scenarioId === 'SYN-MEDICAL-001' &&
    persistedCase.scrutiny.state === 'IN_REVIEW' &&
    hospitalVersion?.state === 'UNDER_REVIEW' &&
    documentFixtureForVersionId(hospitalVersion.documentVersionId)?.fixtureId ===
      'SYN-FIXTURE-HOSPITAL-LETTER-V1-001'
  const canCompleteSyntheticReview =
    persistedCase.scrutiny.state === 'IN_REVIEW' &&
    persistedCase.eta.state === 'NOT_READY' &&
    documentsUnderReview &&
    (persistedCase.scenarioId !== 'SYN-MEDICAL-001' ||
      documentFixtureForVersionId(hospitalVersion?.documentVersionId ?? 'SYN-MISSING')
        ?.fixtureId === 'SYN-FIXTURE-HOSPITAL-LETTER-V2-001')
  return deepFreeze({
    accepted: true,
    summary: {
      status: 'STATUS_INSPECTED',
      caseId: persistedCase.caseId,
      scenarioId: persistedCase.scenarioId,
      purposeFamily,
      policyQualifiedVersion: persistedCase.policyPin.qualifiedVersion,
      revision: persistedCase.revision,
      applicationState: 'LOCKED',
      paymentState: 'CONFIRMED',
      scrutinyState: persistedCase.scrutiny.state,
      etaState: persistedCase.eta.state,
      headline: content.headline,
      explanation: content.explanation,
      applicantActionRequired: content.applicantActionRequired,
      nextAction: content.nextAction,
      actionGuidance: content.actionGuidance,
      demoReviewAction: canRequestMedicalCorrection
        ? 'REQUEST_MEDICAL_CORRECTION'
        : canCompleteSyntheticReview
          ? 'COMPLETE_SYNTHETIC_REVIEW'
          : null,
      waitMessage: content.waitMessage,
      syntheticEtaReference:
        persistedCase.eta.state === 'ISSUED'
          ? persistedCase.eta.syntheticEtaId
          : null,
      journeyFacts: [
        { id: 'APPLICATION', label: 'Application', value: 'Application submitted', state: 'COMPLETE' },
        { id: 'PAYMENT', label: 'Payment', value: 'Payment confirmed', state: 'COMPLETE' },
        {
          id: 'DOCUMENTS',
          label: 'Documents',
          value: actionRequiredDocumentsValid
            ? 'Hospital letter correction required'
            : documentsAccepted
              ? 'Documents accepted'
            : documentsUnderReview
              ? 'Documents under review'
              : 'Documents submitted',
          state: documentsAccepted ? 'COMPLETE' : 'CURRENT',
        },
        {
          id: 'ETA',
          label: 'ETA',
          value:
            persistedCase.eta.state === 'NOT_READY'
              ? 'ETA not ready'
              : persistedCase.eta.state === 'READY_TO_ISSUE'
                ? 'Synthetic ETA ready to issue'
                : 'Synthetic ETA issued',
          state: persistedCase.eta.state === 'ISSUED' ? 'COMPLETE' : 'WAITING',
        },
      ],
    },
  })
}

function applyScrutinyTransition(input: {
  persistedCase: PersistedCase
  command: Extract<ScrutinyEntryCommand, { type: 'QueueScrutiny' | 'BeginScrutiny' }>
  eventType: 'ScrutinyQueued' | 'ScrutinyStarted'
  requestedState: 'QUEUED' | 'IN_REVIEW'
  metadata: RuntimeMetadataSource
}): Readonly<{ accepted: true; persistedCase: PersistedCase; event: PersistedDomainEvent }> | ScrutinyEntryRejection {
  const transition = transitionScrutinyState(
    input.persistedCase.scrutiny.state,
    input.requestedState,
  )
  if (!transition.accepted) {
    return deepFreeze({ accepted: false, reasonCode: transition.reasonCode })
  }
  const revision = input.persistedCase.revision + 1
  const timestamp = input.metadata.nextTimestamp(input.persistedCase.updatedAt)
  const event = persistedDomainEventSchema.parse({
    eventId: input.metadata.eventId(input.persistedCase.caseId, input.eventType, revision),
    caseId: input.persistedCase.caseId,
    eventType: input.eventType,
    domain: 'SCRUTINY',
    aggregateId: input.persistedCase.scrutiny.scrutinyRecordId,
    previousState: transition.previousState,
    newState: transition.nextState,
    actor: input.command.actor,
    syntheticTimestamp: timestamp,
    policyQualifiedVersion: input.persistedCase.policyPin.qualifiedVersion,
    idempotencyKey: input.command.idempotencyKey,
    payload: { scrutinyRecordId: input.persistedCase.scrutiny.scrutinyRecordId },
  })
  const nextCase = persistedCaseSchema.parse({
    ...input.persistedCase,
    revision,
    updatedAt: timestamp,
    scrutiny: { ...input.persistedCase.scrutiny, state: transition.nextState },
    auditEvents: [...input.persistedCase.auditEvents, event],
  })
  return deepFreeze({ accepted: true, persistedCase: nextCase, event })
}

function applyDocumentReview(input: {
  persistedCase: PersistedCase
  requirementId: string
  documentVersionId: SyntheticId
  command: Extract<ScrutinyEntryCommand, { type: 'StartDocumentReview' }>
  metadata: RuntimeMetadataSource
}): Readonly<{ accepted: true; persistedCase: PersistedCase; event: PersistedDomainEvent }> | ScrutinyEntryRejection {
  const document = input.persistedCase.documents.find(
    ({ requirementId }) => requirementId === input.requirementId,
  )
  const version = document?.versions.find(
    ({ documentVersionId }) => documentVersionId === input.documentVersionId,
  )
  if (document === undefined || version === undefined || document.activeVersionId !== version.documentVersionId) {
    return deepFreeze({ accepted: false, reasonCode: 'GUARD_FAILED' })
  }
  const transition = transitionDocumentVersionState(version.state, 'UNDER_REVIEW')
  if (!transition.accepted) {
    return deepFreeze({ accepted: false, reasonCode: transition.reasonCode })
  }
  const revision = input.persistedCase.revision + 1
  const timestamp = input.metadata.nextTimestamp(input.persistedCase.updatedAt)
  const event = persistedDomainEventSchema.parse({
    eventId: input.metadata.eventId(input.persistedCase.caseId, 'DocumentReviewStarted', revision),
    caseId: input.persistedCase.caseId,
    eventType: 'DocumentReviewStarted',
    domain: 'DOCUMENT',
    aggregateId: version.documentVersionId,
    previousState: transition.previousState,
    newState: transition.nextState,
    actor: input.command.actor,
    syntheticTimestamp: timestamp,
    policyQualifiedVersion: input.persistedCase.policyPin.qualifiedVersion,
    idempotencyKey: input.command.idempotencyKey,
    payload: {
      documentVersionId: version.documentVersionId,
      scrutinyRecordId: input.persistedCase.scrutiny.scrutinyRecordId,
    },
  })
  const nextCase = persistedCaseSchema.parse({
    ...input.persistedCase,
    revision,
    updatedAt: timestamp,
    documents: input.persistedCase.documents.map((candidate) =>
      candidate.requirementId === input.requirementId
        ? {
            ...candidate,
            versions: candidate.versions.map((candidateVersion) =>
              candidateVersion.documentVersionId === version.documentVersionId
                ? { ...candidateVersion, state: transition.nextState }
                : candidateVersion,
            ),
          }
        : candidate,
    ),
    auditEvents: [...input.persistedCase.auditEvents, event],
  })
  return deepFreeze({ accepted: true, persistedCase: nextCase, event })
}

export function applyScrutinyEntry(input: {
  persistedCase: PersistedCase
  requiredRequirementIds: readonly string[]
  idempotencyKey: SyntheticId
  metadata: RuntimeMetadataSource
}): ScrutinyEntryMutation | ScrutinyEntryRejection {
  if (
    input.persistedCase.application.state !== 'LOCKED' ||
    input.persistedCase.payment.state !== 'CONFIRMED' ||
    input.persistedCase.scrutiny.state !== 'NOT_STARTED'
  ) {
    return deepFreeze({ accepted: false, reasonCode: 'GUARD_FAILED' })
  }
  const submittedVersions = input.requiredRequirementIds.map((requirementId) => {
    const document = input.persistedCase.documents.find(
      (candidate) => candidate.requirementId === requirementId,
    )
    return document?.versions.find(
      ({ documentVersionId }) => documentVersionId === document.activeVersionId,
    )
  })
  if (
    submittedVersions.some((version) => version?.state !== 'SUBMITTED') ||
    submittedVersions.some(
      (version) =>
        version === undefined ||
        !input.persistedCase.scrutiny.submittedDocumentVersionIds.includes(
          version.documentVersionId,
        ),
    )
  ) {
    return deepFreeze({ accepted: false, reasonCode: 'GUARD_FAILED' })
  }

  const events: PersistedDomainEvent[] = []
  let currentCase = input.persistedCase
  const queueRevision = currentCase.revision + 1
  const queueCommand: Extract<ScrutinyEntryCommand, { type: 'QueueScrutiny' }> = deepFreeze({
    commandId: input.metadata.commandId(currentCase.caseId, 'BeginScrutiny', queueRevision),
    type: 'QueueScrutiny',
    caseId: currentCase.caseId,
    actor: 'SYSTEM',
    syntheticTimestamp: input.metadata.nextTimestamp(currentCase.updatedAt),
    idempotencyKey: childIdempotencyKey(input.idempotencyKey, 'QUEUE'),
    payload: { scrutinyRecordId: currentCase.scrutiny.scrutinyRecordId },
  })
  const queued = applyScrutinyTransition({
    persistedCase: currentCase,
    command: queueCommand,
    eventType: 'ScrutinyQueued',
    requestedState: 'QUEUED',
    metadata: input.metadata,
  })
  if (!queued.accepted) {
    return queued
  }
  currentCase = queued.persistedCase
  events.push(queued.event)

  const startRevision = currentCase.revision + 1
  const startCommand: Extract<ScrutinyEntryCommand, { type: 'BeginScrutiny' }> = deepFreeze({
    commandId: input.metadata.commandId(currentCase.caseId, 'BeginScrutiny', startRevision),
    type: 'BeginScrutiny',
    caseId: currentCase.caseId,
    actor: 'REVIEWER',
    syntheticTimestamp: input.metadata.nextTimestamp(currentCase.updatedAt),
    idempotencyKey: childIdempotencyKey(input.idempotencyKey, 'START'),
    payload: { scrutinyRecordId: currentCase.scrutiny.scrutinyRecordId },
  })
  const started = applyScrutinyTransition({
    persistedCase: currentCase,
    command: startCommand,
    eventType: 'ScrutinyStarted',
    requestedState: 'IN_REVIEW',
    metadata: input.metadata,
  })
  if (!started.accepted) {
    return started
  }
  currentCase = started.persistedCase
  events.push(started.event)

  for (const [index, requirementId] of input.requiredRequirementIds.entries()) {
    const version = submittedVersions[index]
    if (version === undefined) {
      return deepFreeze({ accepted: false, reasonCode: 'GUARD_FAILED' })
    }
    const revision = currentCase.revision + 1
    const command: Extract<ScrutinyEntryCommand, { type: 'StartDocumentReview' }> = deepFreeze({
      commandId: input.metadata.commandId(currentCase.caseId, 'BeginScrutiny', revision),
      type: 'StartDocumentReview',
      caseId: currentCase.caseId,
      actor: 'REVIEWER',
      syntheticTimestamp: input.metadata.nextTimestamp(currentCase.updatedAt),
      idempotencyKey: childIdempotencyKey(input.idempotencyKey, `DOCUMENT-${requirementId}`),
      payload: { documentVersionId: version.documentVersionId },
    })
    const reviewed = applyDocumentReview({
      persistedCase: currentCase,
      requirementId,
      documentVersionId: version.documentVersionId,
      command,
      metadata: input.metadata,
    })
    if (!reviewed.accepted) {
      return reviewed
    }
    currentCase = reviewed.persistedCase
    events.push(reviewed.event)
  }

  return deepFreeze({ accepted: true, persistedCase: currentCase, events })
}
