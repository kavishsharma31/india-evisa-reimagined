import {
  transitionApplicationState,
  type DomainCommand,
  type TransitionRejected,
} from '../domain'
import { deepFreeze } from '../policy/schema'
import {
  draftSnapshotSchema,
  persistedCaseSchema,
  persistedDomainEventSchema,
  type DraftSnapshot,
  type PersistedCase,
  type PersistedDomainEvent,
} from '../persistence'
import type { PolicyEvaluationResult } from '../policy'
import type { RuntimeMetadataSource } from './contracts'

export type CreateDraftCommand = Extract<DomainCommand, { type: 'CreateDraft' }>
export type BeginDraftCommand = Extract<DomainCommand, { type: 'BeginDraft' }>
export type SaveSnapshotCommand = Extract<DomainCommand, { type: 'SaveSnapshot' }>

export type CaseMutation = Readonly<{
  persistedCase: PersistedCase
  event: PersistedDomainEvent
}>

export type BeginDraftMutation =
  | Readonly<{ accepted: true; mutation: CaseMutation }>
  | Readonly<{ accepted: false; rejection: TransitionRejected<'DRAFT_CREATED' | 'IN_PROGRESS' | 'READY_FOR_REVIEW' | 'READY_TO_SUBMIT' | 'SUBMITTED' | 'LOCKED'> }>

export function createRuntimeCase(
  canonicalCase: PersistedCase,
  command: CreateDraftCommand,
  evaluation: PolicyEvaluationResult,
): PersistedCase {
  const canonicalEvent = canonicalCase.auditEvents[0]
  if (canonicalEvent === undefined || canonicalEvent.eventType !== 'DraftCreated') {
    throw new Error('Canonical start fixture must contain one DraftCreated event.')
  }

  const event = persistedDomainEventSchema.parse({
    ...canonicalEvent,
    idempotencyKey: command.idempotencyKey,
    payload: {
      ...canonicalEvent.payload,
      policyEvaluationId: evaluation.evaluationId,
    },
  })

  return deepFreeze(
    persistedCaseSchema.parse({
      ...canonicalCase,
      auditEvents: [event],
    }),
  )
}

export function applyBeginDraft(
  persistedCase: PersistedCase,
  command: BeginDraftCommand,
  metadata: RuntimeMetadataSource,
): BeginDraftMutation {
  const transition = transitionApplicationState(
    persistedCase.application.state,
    'IN_PROGRESS',
  )
  if (!transition.accepted) {
    return deepFreeze({ accepted: false, rejection: transition })
  }

  const nextRevision = persistedCase.revision + 1
  const timestamp = metadata.nextTimestamp(persistedCase.updatedAt)
  const event = persistedDomainEventSchema.parse({
    eventId: metadata.eventId(persistedCase.caseId, 'DraftWorkStarted', nextRevision),
    caseId: persistedCase.caseId,
    eventType: 'DraftWorkStarted',
    domain: 'APPLICATION',
    aggregateId: persistedCase.application.applicationDraftId,
    previousState: transition.previousState,
    newState: transition.nextState,
    actor: command.actor,
    syntheticTimestamp: timestamp,
    policyQualifiedVersion: persistedCase.policyPin.qualifiedVersion,
    idempotencyKey: command.idempotencyKey,
    payload: {},
  })
  const nextCase = persistedCaseSchema.parse({
    ...persistedCase,
    revision: nextRevision,
    updatedAt: timestamp,
    application: {
      ...persistedCase.application,
      state: transition.nextState,
      revision: persistedCase.application.revision + 1,
    },
    auditEvents: [...persistedCase.auditEvents, event],
  })

  return deepFreeze({
    accepted: true,
    mutation: { persistedCase: nextCase, event },
  })
}

export function applySaveSnapshot(
  persistedCase: PersistedCase,
  command: SaveSnapshotCommand,
  answers: Readonly<Record<string, string>>,
  metadata: RuntimeMetadataSource,
): CaseMutation {
  const nextRevision = persistedCase.revision + 1
  const sequence = persistedCase.application.draftSnapshots.length + 1
  const timestamp = metadata.nextTimestamp(persistedCase.updatedAt)
  const snapshot: DraftSnapshot = draftSnapshotSchema.parse({
    snapshotId: command.payload.draftSnapshotId,
    caseId: persistedCase.caseId,
    sequence,
    currentStep: command.payload.stepId,
    answers,
    policyQualifiedVersion: persistedCase.policyPin.qualifiedVersion,
    savedAt: timestamp,
  })
  const event = persistedDomainEventSchema.parse({
    eventId: metadata.eventId(persistedCase.caseId, 'DraftSnapshotSaved', nextRevision),
    caseId: persistedCase.caseId,
    eventType: 'DraftSnapshotSaved',
    domain: 'APPLICATION',
    aggregateId: persistedCase.application.applicationDraftId,
    actor: command.actor,
    syntheticTimestamp: timestamp,
    policyQualifiedVersion: persistedCase.policyPin.qualifiedVersion,
    idempotencyKey: command.idempotencyKey,
    payload: {
      snapshotId: snapshot.snapshotId,
      stepId: snapshot.currentStep,
      sequence: snapshot.sequence,
    },
  })
  const nextCase = persistedCaseSchema.parse({
    ...persistedCase,
    revision: nextRevision,
    updatedAt: timestamp,
    application: {
      ...persistedCase.application,
      revision: persistedCase.application.revision + 1,
      latestDraftSnapshotId: snapshot.snapshotId,
      draftSnapshots: [...persistedCase.application.draftSnapshots, snapshot],
    },
    auditEvents: [...persistedCase.auditEvents, event],
  })

  return deepFreeze({ persistedCase: nextCase, event })
}
