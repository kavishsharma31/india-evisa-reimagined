import { z } from 'zod'

import { syntheticIdSchema, type SyntheticId } from '../../domain/ids'
import type { LocalMockAdapter } from '../contracts'
import { createMockOutcome, validateMockRequest, type MockAdapterResult } from '../result'
import { IVFRT_LEDGER_SCENARIOS, type IvfrtLedgerScenario } from '../scenarios'

const IVFRT_LEDGER_SCENARIO_NAMES = [
  'IVFRT_RECORDED',
  'IVFRT_DUPLICATE',
  'IVFRT_ORDERING_CONFLICT',
  'IVFRT_REJECTED',
  'IVFRT_UNAVAILABLE',
] as const satisfies readonly IvfrtLedgerScenario[]

const ivfrtLedgerRequestSchema = z
  .object({
    requestReference: syntheticIdSchema,
    correlationId: syntheticIdSchema,
    caseId: syntheticIdSchema,
    syntheticEtaReference: syntheticIdSchema,
    eventType: z.enum(['SYNTHETIC_ENTRY_EVENT', 'SYNTHETIC_EXIT_EVENT']),
    eventReference: syntheticIdSchema,
    scenario: z.enum(IVFRT_LEDGER_SCENARIO_NAMES),
  })
  .strict()

type IvfrtLedgerOutcome =
  (typeof IVFRT_LEDGER_SCENARIOS)[keyof typeof IVFRT_LEDGER_SCENARIOS]['outcome']
type IvfrtLedgerEvidence = Readonly<{
  caseId: SyntheticId
  syntheticEtaReference: SyntheticId
  eventType: 'SYNTHETIC_ENTRY_EVENT' | 'SYNTHETIC_EXIT_EVENT'
  eventReference: SyntheticId
  appendEvidenceOnly: true
  privateWorkflowClaimed: false
}>

export type IvfrtLedgerAdapterResult = MockAdapterResult<
  IvfrtLedgerOutcome,
  IvfrtLedgerEvidence
>
export type LocalIvfrtLedgerAdapter = LocalMockAdapter<IvfrtLedgerAdapterResult>

export function createLocalIvfrtLedgerAdapter(): LocalIvfrtLedgerAdapter {
  function execute(candidate: unknown): IvfrtLedgerAdapterResult {
    const validated = validateMockRequest({
      adapter: 'IVFRT_LEDGER',
      schema: ivfrtLedgerRequestSchema,
      candidate,
      supportedScenarios: IVFRT_LEDGER_SCENARIO_NAMES,
    })
    if (!validated.success) {
      return validated.result
    }

    const request = validated.data
    const configured = IVFRT_LEDGER_SCENARIOS[request.scenario]
    return createMockOutcome({
      adapter: 'IVFRT_LEDGER',
      requestReference: request.requestReference,
      correlationId: request.correlationId,
      outcome: configured.outcome,
      classification: configured.classification,
      reasonCode: configured.reasonCode,
      metadata: {
        caseId: request.caseId,
        syntheticEtaReference: request.syntheticEtaReference,
        eventType: request.eventType,
        eventReference: request.eventReference,
        appendEvidenceOnly: true,
        privateWorkflowClaimed: false,
      },
    })
  }

  return Object.freeze({ execute })
}
