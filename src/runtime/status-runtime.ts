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

function statusContent(scrutinyState: PersistedCase['scrutiny']['state']): Readonly<{
  headline: string
  explanation: string
  applicantActionRequired: boolean
  nextAction: 'BEGIN_SCRUTINY' | null
  waitMessage: string | null
}> {
  if (scrutinyState === 'NOT_STARTED') {
    return Object.freeze({
      headline: 'Ready for review',
      explanation: 'Your confirmed synthetic application can enter local review.',
      applicantActionRequired: false,
      nextAction: 'BEGIN_SCRUTINY',
      waitMessage: null,
    })
  }
  if (scrutinyState === 'ACTION_REQUIRED') {
    return Object.freeze({
      headline: 'Action needed',
      explanation: 'Synthetic review has requested a controlled demo correction.',
      applicantActionRequired: true,
      nextAction: null,
      waitMessage: null,
    })
  }
  if (scrutinyState === 'APPROVED') {
    return Object.freeze({
      headline: 'Synthetic review complete',
      explanation: 'The local synthetic review has completed. This is not a visa decision.',
      applicantActionRequired: false,
      nextAction: null,
      waitMessage: 'No action is needed now.',
    })
  }
  return Object.freeze({
    headline: 'Under review',
    explanation: 'Your synthetic application is being reviewed.',
    applicantActionRequired: false,
    nextAction: null,
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
  const documentsSubmitted = currentVersions.every(
    (version) => version?.state === 'SUBMITTED',
  )
  if (
    persistedCase.scrutiny.state === 'NOT_STARTED'
      ? !documentsSubmitted
      : !documentsUnderReview
  ) {
    return deepFreeze({ accepted: false, reasonCode: 'GUARD_FAILED' })
  }

  const content = statusContent(persistedCase.scrutiny.state)
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
      waitMessage: content.waitMessage,
      journeyFacts: [
        { id: 'APPLICATION', label: 'Application', value: 'Application submitted', state: 'COMPLETE' },
        { id: 'PAYMENT', label: 'Payment', value: 'Payment confirmed', state: 'COMPLETE' },
        {
          id: 'DOCUMENTS',
          label: 'Documents',
          value: documentsUnderReview ? 'Documents under review' : 'Documents submitted',
          state: 'CURRENT',
        },
        {
          id: 'ETA',
          label: 'ETA',
          value: persistedCase.eta.state === 'NOT_READY' ? 'ETA not ready' : 'ETA preparation continuing',
          state: 'WAITING',
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
