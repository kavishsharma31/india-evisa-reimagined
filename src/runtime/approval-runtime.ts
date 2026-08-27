import {
  transitionDocumentVersionState,
  transitionEtaState,
  transitionScrutinyState,
  type DomainCommand,
  type SyntheticId,
} from '../domain'
import { syntheticIdSchema } from '../domain/ids'
import { isSupportedPolicyPin } from '../policy'
import { deepFreeze } from '../policy/schema'
import {
  persistedCaseSchema,
  persistedDomainEventSchema,
  type PersistedCase,
  type PersistedDomainEvent,
} from '../persistence'
import { HOSPITAL_V2_FIXTURE_ID } from './correction-runtime'
import type { RuntimeMetadataSource } from './contracts'
import { documentFixtureForVersionId } from './document-runtime'

type ApprovalCommand = Extract<
  DomainCommand,
  {
    type:
      | 'AcceptDocument'
      | 'RecordSyntheticApproval'
      | 'MarkETAReady'
      | 'IssueSyntheticETA'
  }
>

export type SyntheticReviewCompletionMutation = Readonly<{
  accepted: true
  persistedCase: PersistedCase
  acceptedDocumentVersionIds: readonly SyntheticId[]
  syntheticEtaReference: SyntheticId
  events: readonly PersistedDomainEvent[]
}>

export type SyntheticReviewCompletionRejection = Readonly<{
  accepted: false
  reasonCode: 'GUARD_FAILED' | 'INVALID_LIFECYCLE_TRANSITION'
}>

type ApprovalStepResult =
  | Readonly<{
      accepted: true
      persistedCase: PersistedCase
      event: PersistedDomainEvent
    }>
  | SyntheticReviewCompletionRejection

type EtaIssuanceMutation =
  | Readonly<{
      accepted: true
      persistedCase: PersistedCase
      events: readonly [PersistedDomainEvent, PersistedDomainEvent]
      syntheticEtaReference: SyntheticId
    }>
  | SyntheticReviewCompletionRejection

function childIdempotencyKey(idempotencyKey: SyntheticId, suffix: string): SyntheticId {
  return syntheticIdSchema.parse(`${idempotencyKey}-${suffix}`)
}

export function syntheticReviewCompletionIdempotencyKey(caseId: SyntheticId): SyntheticId {
  return syntheticIdSchema.parse(
    `SYN-IDEMPOTENCY-APPROVAL-${caseId.slice('SYN-'.length)}-COMPLETE`,
  )
}

function requiredCurrentVersions(
  persistedCase: PersistedCase,
  requiredRequirementIds: readonly string[],
) {
  return requiredRequirementIds.map((requirementId) => {
    const document = persistedCase.documents.find(
      (candidate) => candidate.requirementId === requirementId,
    )
    const version = document?.versions.find(
      ({ documentVersionId }) => documentVersionId === document.activeVersionId,
    )
    return document === undefined || version === undefined
      ? undefined
      : { document, version }
  })
}

function hasActivePolicyPin(persistedCase: PersistedCase): boolean {
  return isSupportedPolicyPin(
    persistedCase.policyPin.qualifiedVersion,
    persistedCase.policyPin.digest,
  )
}

function applyDocumentAcceptance(input: {
  persistedCase: PersistedCase
  requirementId: string
  idempotencyKey: SyntheticId
  metadata: RuntimeMetadataSource
}): ApprovalStepResult {
  const current = requiredCurrentVersions(input.persistedCase, [input.requirementId])[0]
  if (
    current === undefined ||
    current.version.state !== 'UNDER_REVIEW' ||
    !input.persistedCase.scrutiny.submittedDocumentVersionIds.includes(
      current.version.documentVersionId,
    )
  ) {
    return deepFreeze({ accepted: false, reasonCode: 'GUARD_FAILED' })
  }
  const transition = transitionDocumentVersionState(current.version.state, 'ACCEPTED')
  if (!transition.accepted) {
    return deepFreeze({ accepted: false, reasonCode: transition.reasonCode })
  }
  const revision = input.persistedCase.revision + 1
  const timestamp = input.metadata.nextTimestamp(input.persistedCase.updatedAt)
  const command: Extract<ApprovalCommand, { type: 'AcceptDocument' }> = deepFreeze({
    commandId: input.metadata.commandId(
      input.persistedCase.caseId,
      'CompleteSyntheticReview',
      revision,
    ),
    type: 'AcceptDocument',
    caseId: input.persistedCase.caseId,
    actor: 'REVIEWER',
    syntheticTimestamp: timestamp,
    idempotencyKey: input.idempotencyKey,
    payload: { documentVersionId: current.version.documentVersionId },
  })
  const event = persistedDomainEventSchema.parse({
    eventId: input.metadata.eventId(input.persistedCase.caseId, 'DocumentAccepted', revision),
    caseId: input.persistedCase.caseId,
    eventType: 'DocumentAccepted',
    domain: 'DOCUMENT',
    aggregateId: current.version.documentVersionId,
    previousState: transition.previousState,
    newState: transition.nextState,
    actor: command.actor,
    syntheticTimestamp: timestamp,
    policyQualifiedVersion: input.persistedCase.policyPin.qualifiedVersion,
    idempotencyKey: command.idempotencyKey,
    payload: {
      documentAssetId: current.document.documentAssetId,
      documentVersionId: current.version.documentVersionId,
      scrutinyRecordId: input.persistedCase.scrutiny.scrutinyRecordId,
    },
  })
  const nextCase = persistedCaseSchema.parse({
    ...input.persistedCase,
    revision,
    updatedAt: timestamp,
    documents: input.persistedCase.documents.map((document) =>
      document.requirementId === input.requirementId
        ? {
            ...document,
            versions: document.versions.map((version) =>
              version.documentVersionId === current.version.documentVersionId
                ? { ...version, state: transition.nextState }
                : version,
            ),
          }
        : document,
    ),
    auditEvents: [...input.persistedCase.auditEvents, event],
  })
  return deepFreeze({ accepted: true, persistedCase: nextCase, event })
}

function applyScrutinyApproval(input: {
  persistedCase: PersistedCase
  requiredRequirementIds: readonly string[]
  idempotencyKey: SyntheticId
  metadata: RuntimeMetadataSource
}): ApprovalStepResult {
  const currentVersions = requiredCurrentVersions(
    input.persistedCase,
    input.requiredRequirementIds,
  )
  if (
    input.persistedCase.scrutiny.state !== 'IN_REVIEW' ||
    currentVersions.some((current) => current?.version.state !== 'ACCEPTED')
  ) {
    return deepFreeze({ accepted: false, reasonCode: 'GUARD_FAILED' })
  }
  const transition = transitionScrutinyState(input.persistedCase.scrutiny.state, 'APPROVED')
  if (!transition.accepted) {
    return deepFreeze({ accepted: false, reasonCode: transition.reasonCode })
  }
  const revision = input.persistedCase.revision + 1
  const timestamp = input.metadata.nextTimestamp(input.persistedCase.updatedAt)
  const command: Extract<ApprovalCommand, { type: 'RecordSyntheticApproval' }> = deepFreeze({
    commandId: input.metadata.commandId(
      input.persistedCase.caseId,
      'CompleteSyntheticReview',
      revision,
    ),
    type: 'RecordSyntheticApproval',
    caseId: input.persistedCase.caseId,
    actor: 'REVIEWER',
    syntheticTimestamp: timestamp,
    idempotencyKey: input.idempotencyKey,
    payload: { scrutinyRecordId: input.persistedCase.scrutiny.scrutinyRecordId },
  })
  const event = persistedDomainEventSchema.parse({
    eventId: input.metadata.eventId(
      input.persistedCase.caseId,
      'SyntheticScrutinyApproved',
      revision,
    ),
    caseId: input.persistedCase.caseId,
    eventType: 'SyntheticScrutinyApproved',
    domain: 'SCRUTINY',
    aggregateId: input.persistedCase.scrutiny.scrutinyRecordId,
    previousState: transition.previousState,
    newState: transition.nextState,
    actor: command.actor,
    syntheticTimestamp: timestamp,
    policyQualifiedVersion: input.persistedCase.policyPin.qualifiedVersion,
    idempotencyKey: command.idempotencyKey,
    payload: {
      scrutinyRecordId: input.persistedCase.scrutiny.scrutinyRecordId,
      outcomeCode: 'SYNTHETIC_APPROVED',
    },
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

function applyEtaTransition(input: {
  persistedCase: PersistedCase
  requestedState: 'READY_TO_ISSUE' | 'ISSUED'
  commandType: 'MarkETAReady' | 'IssueSyntheticETA'
  eventType: 'SyntheticETAReadyToIssue' | 'SyntheticETAIssued'
  idempotencyKey: SyntheticId
  metadata: RuntimeMetadataSource
}): ApprovalStepResult {
  const transition = transitionEtaState(input.persistedCase.eta.state, input.requestedState)
  if (!transition.accepted) {
    return deepFreeze({ accepted: false, reasonCode: transition.reasonCode })
  }
  const revision = input.persistedCase.revision + 1
  const timestamp = input.metadata.nextTimestamp(input.persistedCase.updatedAt)
  const command = deepFreeze({
    commandId: input.metadata.commandId(
      input.persistedCase.caseId,
      'CompleteSyntheticReview',
      revision,
    ),
    type: input.commandType,
    caseId: input.persistedCase.caseId,
    actor: 'SYSTEM',
    syntheticTimestamp: timestamp,
    idempotencyKey: input.idempotencyKey,
    payload: { syntheticEtaId: input.persistedCase.eta.syntheticEtaId },
  }) as Extract<ApprovalCommand, { type: typeof input.commandType }>
  const event = persistedDomainEventSchema.parse({
    eventId: input.metadata.eventId(input.persistedCase.caseId, input.eventType, revision),
    caseId: input.persistedCase.caseId,
    eventType: input.eventType,
    domain: 'ETA',
    aggregateId: input.persistedCase.eta.syntheticEtaId,
    previousState: transition.previousState,
    newState: transition.nextState,
    actor: command.actor,
    syntheticTimestamp: timestamp,
    policyQualifiedVersion: input.persistedCase.policyPin.qualifiedVersion,
    idempotencyKey: command.idempotencyKey,
    payload: {
      syntheticEtaId: input.persistedCase.eta.syntheticEtaId,
      outcomeCode:
        input.requestedState === 'READY_TO_ISSUE'
          ? 'SYNTHETIC_ETA_READY'
          : 'SYNTHETIC_ETA_ISSUED',
    },
  })
  const nextCase = persistedCaseSchema.parse({
    ...input.persistedCase,
    revision,
    updatedAt: timestamp,
    eta: { ...input.persistedCase.eta, state: transition.nextState },
    auditEvents: [...input.persistedCase.auditEvents, event],
  })
  return deepFreeze({ accepted: true, persistedCase: nextCase, event })
}

export function applySyntheticEtaIssuance(input: {
  persistedCase: PersistedCase
  requiredRequirementIds: readonly string[]
  idempotencyKey: SyntheticId
  metadata: RuntimeMetadataSource
}): EtaIssuanceMutation {
  const currentVersions = requiredCurrentVersions(
    input.persistedCase,
    input.requiredRequirementIds,
  )
  if (
    !hasActivePolicyPin(input.persistedCase) ||
    input.persistedCase.application.state !== 'LOCKED' ||
    input.persistedCase.payment.state !== 'CONFIRMED' ||
    input.persistedCase.scrutiny.state !== 'APPROVED' ||
    input.persistedCase.eta.state !== 'NOT_READY' ||
    currentVersions.some((current) => current?.version.state !== 'ACCEPTED')
  ) {
    return deepFreeze({ accepted: false, reasonCode: 'GUARD_FAILED' })
  }
  const ready = applyEtaTransition({
    persistedCase: input.persistedCase,
    requestedState: 'READY_TO_ISSUE',
    commandType: 'MarkETAReady',
    eventType: 'SyntheticETAReadyToIssue',
    idempotencyKey: childIdempotencyKey(input.idempotencyKey, 'ETA-READY'),
    metadata: input.metadata,
  })
  if (!ready.accepted) {
    return ready
  }
  const issued = applyEtaTransition({
    persistedCase: ready.persistedCase,
    requestedState: 'ISSUED',
    commandType: 'IssueSyntheticETA',
    eventType: 'SyntheticETAIssued',
    idempotencyKey: childIdempotencyKey(input.idempotencyKey, 'ETA-ISSUE'),
    metadata: input.metadata,
  })
  if (!issued.accepted) {
    return issued
  }
  return deepFreeze({
    accepted: true,
    persistedCase: issued.persistedCase,
    events: [ready.event, issued.event],
    syntheticEtaReference: issued.persistedCase.eta.syntheticEtaId,
  })
}

export function applySyntheticReviewCompletion(input: {
  persistedCase: PersistedCase
  requiredRequirementIds: readonly string[]
  idempotencyKey: SyntheticId
  metadata: RuntimeMetadataSource
}): SyntheticReviewCompletionMutation | SyntheticReviewCompletionRejection {
  const currentVersions = requiredCurrentVersions(
    input.persistedCase,
    input.requiredRequirementIds,
  )
  const medicalHospital = input.persistedCase.scenarioId === 'SYN-MEDICAL-001'
    ? currentVersions[input.requiredRequirementIds.indexOf('REQ-HOSPITAL-LETTER-1')]
    : undefined
  if (
    !hasActivePolicyPin(input.persistedCase) ||
    input.persistedCase.application.state !== 'LOCKED' ||
    input.persistedCase.payment.state !== 'CONFIRMED' ||
    input.persistedCase.scrutiny.state !== 'IN_REVIEW' ||
    input.persistedCase.eta.state !== 'NOT_READY' ||
    currentVersions.some((current) => current?.version.state !== 'UNDER_REVIEW') ||
    (input.persistedCase.scenarioId === 'SYN-MEDICAL-001' &&
      (medicalHospital === undefined ||
        documentFixtureForVersionId(medicalHospital.version.documentVersionId)?.fixtureId !==
          HOSPITAL_V2_FIXTURE_ID))
  ) {
    return deepFreeze({ accepted: false, reasonCode: 'GUARD_FAILED' })
  }

  const events: PersistedDomainEvent[] = []
  const acceptedDocumentVersionIds: SyntheticId[] = []
  let currentCase = input.persistedCase
  for (const requirementId of input.requiredRequirementIds) {
    const accepted = applyDocumentAcceptance({
      persistedCase: currentCase,
      requirementId,
      idempotencyKey: childIdempotencyKey(input.idempotencyKey, `DOCUMENT-${requirementId}`),
      metadata: input.metadata,
    })
    if (!accepted.accepted) {
      return accepted
    }
    currentCase = accepted.persistedCase
    events.push(accepted.event)
    acceptedDocumentVersionIds.push(accepted.event.aggregateId)
  }

  const approved = applyScrutinyApproval({
    persistedCase: currentCase,
    requiredRequirementIds: input.requiredRequirementIds,
    idempotencyKey: childIdempotencyKey(input.idempotencyKey, 'SCRUTINY'),
    metadata: input.metadata,
  })
  if (!approved.accepted) {
    return approved
  }
  currentCase = approved.persistedCase
  events.push(approved.event)

  const issued = applySyntheticEtaIssuance({
    persistedCase: currentCase,
    requiredRequirementIds: input.requiredRequirementIds,
    idempotencyKey: input.idempotencyKey,
    metadata: input.metadata,
  })
  if (!issued.accepted) {
    return issued
  }
  events.push(...issued.events)
  return deepFreeze({
    accepted: true,
    persistedCase: issued.persistedCase,
    acceptedDocumentVersionIds,
    syntheticEtaReference: issued.syntheticEtaReference,
    events,
  })
}
