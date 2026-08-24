import { z } from 'zod'

import { syntheticIdSchema, type SyntheticId } from '../../domain/ids'
import type { LocalMockAdapter } from '../contracts'
import { createMockOutcome, validateMockRequest, type MockAdapterResult } from '../result'
import { BORDER_SCENARIOS, type BorderScenario } from '../scenarios'

const BORDER_SCENARIO_NAMES = [
  'BORDER_ADMITTED',
  'BORDER_DENIED',
  'BORDER_REFERRED',
  'BORDER_PENDING',
  'BORDER_UNAVAILABLE',
] as const satisfies readonly BorderScenario[]

const borderRequestSchema = z
  .object({
    requestReference: syntheticIdSchema,
    correlationId: syntheticIdSchema,
    caseId: syntheticIdSchema,
    syntheticEtaReference: syntheticIdSchema,
    apisResultReference: syntheticIdSchema,
    biometricResultReference: syntheticIdSchema,
    portEventReference: syntheticIdSchema,
    scenario: z.enum(BORDER_SCENARIO_NAMES),
  })
  .strict()

type BorderOutcome = (typeof BORDER_SCENARIOS)[keyof typeof BORDER_SCENARIOS]['outcome']
type BorderEvidence = Readonly<{
  caseId: SyntheticId
  syntheticEtaReference: SyntheticId
  apisResultReference: SyntheticId
  biometricResultReference: SyntheticId
  portEventReference: SyntheticId
  separateFromEtaIssuance: true
  admissionGuaranteedByEta: false
}>

export type BorderAdapterResult = MockAdapterResult<BorderOutcome, BorderEvidence>
export type LocalBorderAdapter = LocalMockAdapter<BorderAdapterResult>

export function createLocalBorderAdapter(): LocalBorderAdapter {
  function execute(candidate: unknown): BorderAdapterResult {
    const validated = validateMockRequest({
      adapter: 'BORDER',
      schema: borderRequestSchema,
      candidate,
      supportedScenarios: BORDER_SCENARIO_NAMES,
    })
    if (!validated.success) {
      return validated.result
    }

    const request = validated.data
    const configured = BORDER_SCENARIOS[request.scenario]
    return createMockOutcome({
      adapter: 'BORDER',
      requestReference: request.requestReference,
      correlationId: request.correlationId,
      outcome: configured.outcome,
      classification: configured.classification,
      reasonCode: configured.reasonCode,
      metadata: {
        caseId: request.caseId,
        syntheticEtaReference: request.syntheticEtaReference,
        apisResultReference: request.apisResultReference,
        biometricResultReference: request.biometricResultReference,
        portEventReference: request.portEventReference,
        separateFromEtaIssuance: true,
        admissionGuaranteedByEta: false,
      },
    })
  }

  return Object.freeze({ execute })
}
