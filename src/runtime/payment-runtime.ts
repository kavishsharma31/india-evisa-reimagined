import {
  transitionPaymentState,
  type DomainCommand,
  type PaymentState,
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
import type { RuntimeMetadataSource, RuntimePaymentSummary } from './contracts'

type PaymentCommand = Extract<
  DomainCommand,
  { type: 'StartMockPayment' | 'MockResultPending' | 'MarkAmbiguous' | 'ReconcileConfirmed' }
>

export type PaymentProjectionResult =
  | Readonly<{ accepted: true; summary: RuntimePaymentSummary }>
  | Readonly<{ accepted: false; reasonCode: 'GUARD_FAILED' }>

export type PaymentMutation = Readonly<{
  accepted: true
  persistedCase: PersistedCase
  events: readonly PersistedDomainEvent[]
}>

export type PaymentMutationRejection = Readonly<{
  accepted: false
  reasonCode: 'GUARD_FAILED' | 'INVALID_LIFECYCLE_TRANSITION'
  paymentState: PaymentState
}>

function childIdempotencyKey(idempotencyKey: SyntheticId, suffix: string): SyntheticId {
  return syntheticIdSchema.parse(`${idempotencyKey}-${suffix}`)
}

export function paymentIdempotencyKey(
  caseId: SyntheticId,
  operation: 'START' | 'RECONCILE',
): SyntheticId {
  return syntheticIdSchema.parse(
    `SYN-IDEMPOTENCY-PAYMENT-${caseId.slice('SYN-'.length)}-${operation}`,
  )
}

export function paymentCorrelationId(caseId: SyntheticId): SyntheticId {
  return syntheticIdSchema.parse(
    `SYN-CORRELATION-PAYMENT-${caseId.slice('SYN-'.length)}`,
  )
}

export function buildPaymentSummary(
  persistedCase: PersistedCase,
  evaluation: PolicyEvaluationResult,
): PaymentProjectionResult {
  const syntheticFee = evaluation.syntheticFee
  const purposeFamily = evaluation.suggestedPurposeFamily
  if (
    persistedCase.application.state !== 'LOCKED' ||
    evaluation.scenarioSupport !== 'SUPPORTED_BY_DEMO' ||
    evaluation.policy.qualifiedVersion !== persistedCase.policyPin.qualifiedVersion ||
    syntheticFee === undefined ||
    purposeFamily === undefined
  ) {
    return deepFreeze({ accepted: false, reasonCode: 'GUARD_FAILED' })
  }

  return deepFreeze({
    accepted: true,
    summary: {
      status: 'PAYMENT_INSPECTED',
      caseId: persistedCase.caseId,
      scenarioId: persistedCase.scenarioId,
      purposeFamily,
      policyQualifiedVersion: persistedCase.policyPin.qualifiedVersion,
      applicationState: 'LOCKED',
      revision: persistedCase.revision,
      paymentState: persistedCase.payment.state,
      mockPaymentAttemptId: persistedCase.payment.mockPaymentAttemptId,
      syntheticReference: persistedCase.payment.syntheticReference,
      syntheticFee,
    },
  })
}

function applyPaymentTransition(input: {
  persistedCase: PersistedCase
  command: PaymentCommand
  eventType:
    | 'MockPaymentInitiated'
    | 'MockPaymentPending'
    | 'PaymentReconciliationRequired'
    | 'PaymentReconciledConfirmed'
  requestedState: 'INITIATED' | 'PENDING' | 'RECONCILIATION_REQUIRED' | 'CONFIRMED'
  attemptId: SyntheticId
  syntheticReference: SyntheticId
  outcomeCode: string
  metadata: RuntimeMetadataSource
}): Readonly<{
  accepted: true
  persistedCase: PersistedCase
  event: PersistedDomainEvent
}> | PaymentMutationRejection {
  const transition = transitionPaymentState(
    input.persistedCase.payment.state,
    input.requestedState,
  )
  if (!transition.accepted) {
    return deepFreeze({
      accepted: false,
      reasonCode: transition.reasonCode,
      paymentState: input.persistedCase.payment.state,
    })
  }

  const nextRevision = input.persistedCase.revision + 1
  const timestamp = input.metadata.nextTimestamp(input.persistedCase.updatedAt)
  const event = persistedDomainEventSchema.parse({
    eventId: input.metadata.eventId(
      input.persistedCase.caseId,
      input.eventType,
      nextRevision,
    ),
    caseId: input.persistedCase.caseId,
    eventType: input.eventType,
    domain: 'PAYMENT',
    aggregateId: input.attemptId,
    previousState: transition.previousState,
    newState: transition.nextState,
    actor: input.command.actor,
    syntheticTimestamp: timestamp,
    policyQualifiedVersion: input.persistedCase.policyPin.qualifiedVersion,
    idempotencyKey: input.command.idempotencyKey,
    payload: {
      attemptId: input.attemptId,
      outcomeCode: input.outcomeCode,
    },
  })
  const nextCase = persistedCaseSchema.parse({
    ...input.persistedCase,
    revision: nextRevision,
    updatedAt: timestamp,
    payment: {
      state: transition.nextState,
      mockPaymentAttemptId: input.attemptId,
      syntheticReference: input.syntheticReference,
    },
    auditEvents: [...input.persistedCase.auditEvents, event],
  })

  return deepFreeze({ accepted: true, persistedCase: nextCase, event })
}

export function applyAmbiguousPaymentStart(input: {
  persistedCase: PersistedCase
  amount: 41 | 73
  attemptId: SyntheticId
  syntheticReference: SyntheticId
  idempotencyKey: SyntheticId
  adapterReasonCode: string
  metadata: RuntimeMetadataSource
}): PaymentMutation | PaymentMutationRejection {
  if (
    input.persistedCase.application.state !== 'LOCKED' ||
    input.persistedCase.payment.state !== 'NOT_STARTED' ||
    input.persistedCase.payment.mockPaymentAttemptId !== null ||
    input.persistedCase.payment.syntheticReference !== null
  ) {
    return deepFreeze({
      accepted: false,
      reasonCode: 'GUARD_FAILED',
      paymentState: input.persistedCase.payment.state,
    })
  }

  const events: PersistedDomainEvent[] = []
  let currentCase = input.persistedCase
  const transitions: readonly Readonly<{
    type: PaymentCommand['type']
    eventType:
      | 'MockPaymentInitiated'
      | 'MockPaymentPending'
      | 'PaymentReconciliationRequired'
    requestedState: 'INITIATED' | 'PENDING' | 'RECONCILIATION_REQUIRED'
    actor: 'APPLICANT' | 'PAYMENT_MOCK' | 'SYSTEM'
    suffix: string
    outcomeCode: string
  }>[] = [
    {
      type: 'StartMockPayment',
      eventType: 'MockPaymentInitiated',
      requestedState: 'INITIATED',
      actor: 'APPLICANT',
      suffix: 'INITIATED',
      outcomeCode: 'MOCK_PAYMENT_INITIATED',
    },
    {
      type: 'MockResultPending',
      eventType: 'MockPaymentPending',
      requestedState: 'PENDING',
      actor: 'PAYMENT_MOCK',
      suffix: 'PENDING',
      outcomeCode: 'MOCK_PAYMENT_PENDING',
    },
    {
      type: 'MarkAmbiguous',
      eventType: 'PaymentReconciliationRequired',
      requestedState: 'RECONCILIATION_REQUIRED',
      actor: 'SYSTEM',
      suffix: 'RECONCILIATION-REQUIRED',
      outcomeCode: input.adapterReasonCode,
    },
  ]

  for (const definition of transitions) {
    const nextRevision = currentCase.revision + 1
    const common = {
      commandId: input.metadata.commandId(currentCase.caseId, 'StartMockPayment', nextRevision),
      caseId: currentCase.caseId,
      syntheticTimestamp: input.metadata.nextTimestamp(currentCase.updatedAt),
      idempotencyKey: childIdempotencyKey(input.idempotencyKey, definition.suffix),
    }
    const command: PaymentCommand =
      definition.type === 'StartMockPayment'
        ? deepFreeze({
            ...common,
            type: 'StartMockPayment',
            actor: 'APPLICANT',
            payload: { amount: input.amount },
          })
        : definition.type === 'MockResultPending'
          ? deepFreeze({
              ...common,
              type: 'MockResultPending',
              actor: 'PAYMENT_MOCK',
              payload: { attemptId: input.attemptId },
            })
          : deepFreeze({
              ...common,
              type: 'MarkAmbiguous',
              actor: 'SYSTEM',
              payload: { attemptId: input.attemptId },
            })
    const transitioned = applyPaymentTransition({
      persistedCase: currentCase,
      command,
      eventType: definition.eventType,
      requestedState: definition.requestedState,
      attemptId: input.attemptId,
      syntheticReference: input.syntheticReference,
      outcomeCode: definition.outcomeCode,
      metadata: input.metadata,
    })
    if (!transitioned.accepted) {
      return transitioned
    }
    currentCase = transitioned.persistedCase
    events.push(transitioned.event)
  }

  return deepFreeze({ accepted: true, persistedCase: currentCase, events })
}

export function applyPaymentReconciliation(input: {
  persistedCase: PersistedCase
  attemptId: SyntheticId
  syntheticReference: SyntheticId
  idempotencyKey: SyntheticId
  adapterReasonCode: string
  metadata: RuntimeMetadataSource
}): PaymentMutation | PaymentMutationRejection {
  if (
    input.persistedCase.application.state !== 'LOCKED' ||
    input.persistedCase.payment.state !== 'RECONCILIATION_REQUIRED' ||
    input.persistedCase.payment.mockPaymentAttemptId !== input.attemptId ||
    input.persistedCase.payment.syntheticReference !== input.syntheticReference
  ) {
    return deepFreeze({
      accepted: false,
      reasonCode: 'GUARD_FAILED',
      paymentState: input.persistedCase.payment.state,
    })
  }

  const nextRevision = input.persistedCase.revision + 1
  const command: Extract<PaymentCommand, { type: 'ReconcileConfirmed' }> = deepFreeze({
    commandId: input.metadata.commandId(
      input.persistedCase.caseId,
      'CheckMockPaymentStatus',
      nextRevision,
    ),
    type: 'ReconcileConfirmed',
    caseId: input.persistedCase.caseId,
    actor: 'PAYMENT_MOCK',
    syntheticTimestamp: input.metadata.nextTimestamp(input.persistedCase.updatedAt),
    idempotencyKey: input.idempotencyKey,
    payload: { attemptId: input.attemptId },
  })
  const transitioned = applyPaymentTransition({
    persistedCase: input.persistedCase,
    command,
    eventType: 'PaymentReconciledConfirmed',
    requestedState: 'CONFIRMED',
    attemptId: input.attemptId,
    syntheticReference: input.syntheticReference,
    outcomeCode: input.adapterReasonCode,
    metadata: input.metadata,
  })
  if (!transitioned.accepted) {
    return transitioned
  }
  return deepFreeze({
    accepted: true,
    persistedCase: transitioned.persistedCase,
    events: [transitioned.event],
  })
}
