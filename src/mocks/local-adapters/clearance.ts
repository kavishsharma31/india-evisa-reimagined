import { z } from 'zod'

import { syntheticIdSchema, type SyntheticId } from '../../domain/ids'
import type { LocalMockAdapter } from '../contracts'
import { createMockOutcome, validateMockRequest, type MockAdapterResult } from '../result'
import { CLEARANCE_SCENARIOS, type ClearanceScenario } from '../scenarios'

const CLEARANCE_SCENARIO_NAMES = [
  'CLEARANCE_APPROVED',
  'CLEARANCE_PENDING',
  'CLEARANCE_REJECTED',
  'CLEARANCE_MORE_INFORMATION',
  'CLEARANCE_UNAVAILABLE',
] as const satisfies readonly ClearanceScenario[]

const clearanceRequestSchema = z
  .object({
    requestReference: syntheticIdSchema,
    correlationId: syntheticIdSchema,
    caseId: syntheticIdSchema,
    clearanceType: z.enum(['SYNTHETIC_SECTORAL_CLEARANCE', 'SYNTHETIC_GENERIC_CLEARANCE']),
    purposeReference: syntheticIdSchema,
    scenario: z.enum(CLEARANCE_SCENARIO_NAMES),
  })
  .strict()

type ClearanceOutcome =
  (typeof CLEARANCE_SCENARIOS)[keyof typeof CLEARANCE_SCENARIOS]['outcome']
type ClearanceEvidence = Readonly<{
  caseId: SyntheticId
  clearanceType: 'SYNTHETIC_SECTORAL_CLEARANCE' | 'SYNTHETIC_GENERIC_CLEARANCE'
  purposeReference: SyntheticId
  workflowRepresentation: 'CONCEPTUAL_BOUNDARY_ONLY'
}>

export type ClearanceAdapterResult = MockAdapterResult<ClearanceOutcome, ClearanceEvidence>
export type LocalClearanceAdapter = LocalMockAdapter<ClearanceAdapterResult>

export function createLocalClearanceAdapter(): LocalClearanceAdapter {
  function execute(candidate: unknown): ClearanceAdapterResult {
    const validated = validateMockRequest({
      adapter: 'CLEARANCE',
      schema: clearanceRequestSchema,
      candidate,
      supportedScenarios: CLEARANCE_SCENARIO_NAMES,
    })
    if (!validated.success) {
      return validated.result
    }

    const request = validated.data
    const configured = CLEARANCE_SCENARIOS[request.scenario]
    return createMockOutcome({
      adapter: 'CLEARANCE',
      requestReference: request.requestReference,
      correlationId: request.correlationId,
      outcome: configured.outcome,
      classification: configured.classification,
      reasonCode: configured.reasonCode,
      metadata: {
        caseId: request.caseId,
        clearanceType: request.clearanceType,
        purposeReference: request.purposeReference,
        workflowRepresentation: 'CONCEPTUAL_BOUNDARY_ONLY',
      },
    })
  }

  return Object.freeze({ execute })
}
