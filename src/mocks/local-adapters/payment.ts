import { z } from 'zod'

import { syntheticIdSchema, type SyntheticId } from '../../domain/ids'
import type { ResettableLocalMockAdapter } from '../contracts'
import {
  createMockOutcome,
  createMockRejection,
  validateMockRequest,
  type MockAdapterResult,
} from '../result'
import { PAYMENT_SCENARIOS, type PaymentScenario } from '../scenarios'

const PAYMENT_SCENARIO_NAMES = [
  'PAYMENT_IMMEDIATE_CONFIRMATION',
  'PAYMENT_DECLINED',
  'PAYMENT_PENDING',
  'PAYMENT_AMBIGUOUS_RECONCILIATION',
  'PAYMENT_RECONCILIATION_CONFIRMED',
  'PAYMENT_RECONCILIATION_NOT_CONFIRMED',
  'PAYMENT_REFUND_PENDING',
  'PAYMENT_REFUNDED',
] as const satisfies readonly PaymentScenario[]

const paymentRequestSchema = z
  .object({
    requestReference: syntheticIdSchema,
    correlationId: syntheticIdSchema,
    caseId: syntheticIdSchema,
    applicationId: syntheticIdSchema,
    amount: z.union([z.literal(41), z.literal(73)]),
    unit: z.literal('SYNTHETIC_DEMO_CREDITS'),
    idempotencyKey: syntheticIdSchema,
    scenario: z.enum(PAYMENT_SCENARIO_NAMES),
  })
  .strict()

type PaymentRequest = z.infer<typeof paymentRequestSchema>
type PaymentOutcome =
  (typeof PAYMENT_SCENARIOS)[keyof typeof PAYMENT_SCENARIOS]['outcome']
type PaymentEvidence = Readonly<{
  caseId: SyntheticId
  applicationId: SyntheticId
  amount: 41 | 73
  unit: 'SYNTHETIC_DEMO_CREDITS'
  idempotencyKey: SyntheticId
  syntheticPaymentReference: SyntheticId
}>

export type PaymentAdapterResult = MockAdapterResult<PaymentOutcome, PaymentEvidence>
export type LocalPaymentAdapter = ResettableLocalMockAdapter<PaymentAdapterResult>

function requestSignature(request: PaymentRequest): string {
  return [
    request.requestReference,
    request.correlationId,
    request.caseId,
    request.applicationId,
    request.amount,
    request.unit,
    request.scenario,
  ].join('|')
}

export function createLocalPaymentAdapter(): LocalPaymentAdapter {
  const processedRequests = new Map<
    SyntheticId,
    Readonly<{ signature: string; result: PaymentAdapterResult }>
  >()

  function execute(candidate: unknown): PaymentAdapterResult {
    const validated = validateMockRequest({
      adapter: 'PAYMENT',
      schema: paymentRequestSchema,
      candidate,
      supportedScenarios: PAYMENT_SCENARIO_NAMES,
    })
    if (!validated.success) {
      return validated.result
    }

    const request = validated.data
    const signature = requestSignature(request)
    const previous = processedRequests.get(request.idempotencyKey)
    if (previous) {
      if (previous.signature === signature) {
        return previous.result
      }

      return createMockRejection({
        adapter: 'PAYMENT',
        rejectionKind: 'IDEMPOTENCY_CONFLICT',
        reasonCode: 'MOCK_PAYMENT_IDEMPOTENCY_CONFLICT',
        requestReference: request.requestReference,
        correlationId: request.correlationId,
        issueCount: 1,
      })
    }

    const configured = PAYMENT_SCENARIOS[request.scenario]
    const result = createMockOutcome({
      adapter: 'PAYMENT',
      requestReference: request.requestReference,
      correlationId: request.correlationId,
      outcome: configured.outcome,
      classification: configured.classification,
      reasonCode: configured.reasonCode,
      metadata: {
        caseId: request.caseId,
        applicationId: request.applicationId,
        amount: request.amount,
        unit: request.unit,
        idempotencyKey: request.idempotencyKey,
        syntheticPaymentReference: request.requestReference,
      },
    })

    processedRequests.set(request.idempotencyKey, { signature, result })
    return result
  }

  function reset(): void {
    processedRequests.clear()
  }

  return Object.freeze({ execute, reset })
}
