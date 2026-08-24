import { z } from 'zod'

import { syntheticIdSchema, type SyntheticId } from '../../domain/ids'
import type { LocalMockAdapter } from '../contracts'
import { createMockOutcome, validateMockRequest, type MockAdapterResult } from '../result'
import { APIS_SCENARIOS, type ApisScenario } from '../scenarios'

const APIS_SCENARIO_NAMES = [
  'APIS_MATCHED',
  'APIS_UNMATCHED',
  'APIS_DELAYED',
  'APIS_DUPLICATE',
  'APIS_UNAVAILABLE',
] as const satisfies readonly ApisScenario[]

const apisRequestSchema = z
  .object({
    requestReference: syntheticIdSchema,
    correlationId: syntheticIdSchema,
    travellerReference: syntheticIdSchema,
    itineraryEventReference: syntheticIdSchema,
    syntheticEtaReference: syntheticIdSchema,
    scenario: z.enum(APIS_SCENARIO_NAMES),
  })
  .strict()

type ApisOutcome = (typeof APIS_SCENARIOS)[keyof typeof APIS_SCENARIOS]['outcome']
type ApisEvidence = Readonly<{
  travellerReference: SyntheticId
  itineraryEventReference: SyntheticId
  syntheticEtaReference: SyntheticId
  passengerDataIncluded: false
}>

export type ApisAdapterResult = MockAdapterResult<ApisOutcome, ApisEvidence>
export type LocalApisAdapter = LocalMockAdapter<ApisAdapterResult>

export function createLocalApisAdapter(): LocalApisAdapter {
  function execute(candidate: unknown): ApisAdapterResult {
    const validated = validateMockRequest({
      adapter: 'APIS',
      schema: apisRequestSchema,
      candidate,
      supportedScenarios: APIS_SCENARIO_NAMES,
    })
    if (!validated.success) {
      return validated.result
    }

    const request = validated.data
    const configured = APIS_SCENARIOS[request.scenario]
    return createMockOutcome({
      adapter: 'APIS',
      requestReference: request.requestReference,
      correlationId: request.correlationId,
      outcome: configured.outcome,
      classification: configured.classification,
      reasonCode: configured.reasonCode,
      metadata: {
        travellerReference: request.travellerReference,
        itineraryEventReference: request.itineraryEventReference,
        syntheticEtaReference: request.syntheticEtaReference,
        passengerDataIncluded: false,
      },
    })
  }

  return Object.freeze({ execute })
}
