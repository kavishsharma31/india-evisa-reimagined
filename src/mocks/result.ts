import type { z } from 'zod'

import { syntheticIdSchema, type SyntheticId } from '../domain/ids'
import { deepFreeze } from '../policy/schema'
import { CONTROLLED_MOCK_TIMESTAMP } from './scenarios'

export const MOCK_ADAPTER_NAMES = Object.freeze([
  'PAYMENT',
  'DOCUMENT_INSPECTION',
  'NOTIFICATION',
  'CLEARANCE',
  'APIS',
  'BIOMETRICS',
  'BORDER',
  'IVFRT_LEDGER',
] as const)

export type MockAdapterName = (typeof MOCK_ADAPTER_NAMES)[number]
export type MockOutcomeClassification = 'SUCCESS' | 'CONTROLLED_FAILURE'
export type MockRejectionKind =
  | 'INVALID_REQUEST'
  | 'UNSUPPORTED_SCENARIO'
  | 'UNSUPPORTED_COMBINATION'
  | 'IDEMPOTENCY_CONFLICT'

export type MockOutcomeResult<Outcome extends string, Metadata> = Readonly<{
  status: 'MOCK_OUTCOME'
  classification: MockOutcomeClassification
  adapter: MockAdapterName
  requestReference: SyntheticId
  correlationId: SyntheticId
  outcome: Outcome
  occurredAt: typeof CONTROLLED_MOCK_TIMESTAMP
  reasonCode: string
  mock: true
  metadata: Readonly<Metadata>
}>

export type MockRejectedResult = Readonly<{
  status: 'REJECTED'
  rejectionKind: MockRejectionKind
  adapter: MockAdapterName
  requestReference: SyntheticId
  correlationId: SyntheticId
  occurredAt: typeof CONTROLLED_MOCK_TIMESTAMP
  reasonCode: string
  mock: true
  diagnostic: Readonly<{
    issueCount: number
  }>
}>

export type MockAdapterResult<Outcome extends string, Metadata> =
  | MockOutcomeResult<Outcome, Metadata>
  | MockRejectedResult

type ParsedMockRequest<Value> =
  | Readonly<{ success: true; data: Value }>
  | Readonly<{ success: false; result: MockRejectedResult }>

const SAFE_REJECTED_REQUEST_REFERENCE = 'SYN-REJECTED-REQUEST' as const
const SAFE_REJECTED_CORRELATION_ID = 'SYN-REJECTED-CORRELATION' as const

function readSafeSyntheticId(input: unknown, key: string): SyntheticId | undefined {
  if (input === null || typeof input !== 'object' || !(key in input)) {
    return undefined
  }

  const parsed = syntheticIdSchema.safeParse(Reflect.get(input, key))
  return parsed.success ? parsed.data : undefined
}

function readScenario(input: unknown): string | undefined {
  if (input === null || typeof input !== 'object' || !('scenario' in input)) {
    return undefined
  }

  return typeof input.scenario === 'string' ? input.scenario : undefined
}

export function createMockOutcome<Outcome extends string, Metadata>(input: {
  adapter: MockAdapterName
  requestReference: SyntheticId
  correlationId: SyntheticId
  outcome: Outcome
  classification: MockOutcomeClassification
  reasonCode: string
  metadata: Metadata
}): MockOutcomeResult<Outcome, Metadata> {
  return deepFreeze({
    status: 'MOCK_OUTCOME',
    classification: input.classification,
    adapter: input.adapter,
    requestReference: input.requestReference,
    correlationId: input.correlationId,
    outcome: input.outcome,
    occurredAt: CONTROLLED_MOCK_TIMESTAMP,
    reasonCode: input.reasonCode,
    mock: true,
    metadata: input.metadata,
  })
}

export function createMockRejection(input: {
  adapter: MockAdapterName
  rejectionKind: MockRejectionKind
  reasonCode: string
  requestReference?: SyntheticId
  correlationId?: SyntheticId
  issueCount?: number
}): MockRejectedResult {
  return deepFreeze({
    status: 'REJECTED',
    rejectionKind: input.rejectionKind,
    adapter: input.adapter,
    requestReference: input.requestReference ?? SAFE_REJECTED_REQUEST_REFERENCE,
    correlationId: input.correlationId ?? SAFE_REJECTED_CORRELATION_ID,
    occurredAt: CONTROLLED_MOCK_TIMESTAMP,
    reasonCode: input.reasonCode,
    mock: true,
    diagnostic: {
      issueCount: input.issueCount ?? 0,
    },
  })
}

export function validateMockRequest<Schema extends z.ZodType>(input: {
  adapter: MockAdapterName
  schema: Schema
  candidate: unknown
  supportedScenarios: readonly string[]
}): ParsedMockRequest<z.output<Schema>> {
  const requestReference = readSafeSyntheticId(input.candidate, 'requestReference')
  const correlationId = readSafeSyntheticId(input.candidate, 'correlationId')
  const scenario = readScenario(input.candidate)

  if (scenario !== undefined && !input.supportedScenarios.includes(scenario)) {
    return {
      success: false,
      result: createMockRejection({
        adapter: input.adapter,
        rejectionKind: 'UNSUPPORTED_SCENARIO',
        reasonCode: 'MOCK_UNSUPPORTED_SCENARIO',
        requestReference,
        correlationId,
      }),
    }
  }

  const parsed = input.schema.safeParse(input.candidate)
  if (!parsed.success) {
    return {
      success: false,
      result: createMockRejection({
        adapter: input.adapter,
        rejectionKind: 'INVALID_REQUEST',
        reasonCode: 'MOCK_INVALID_REQUEST',
        requestReference,
        correlationId,
        issueCount: parsed.error.issues.length,
      }),
    }
  }

  return { success: true, data: parsed.data }
}
