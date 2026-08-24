import { z } from 'zod'

import { syntheticIdSchema, type SyntheticId } from '../../domain/ids'
import type { LocalMockAdapter } from '../contracts'
import { createMockOutcome, validateMockRequest, type MockAdapterResult } from '../result'
import { BIOMETRIC_SCENARIOS, type BiometricScenario } from '../scenarios'

const BIOMETRIC_SCENARIO_NAMES = [
  'BIOMETRIC_MATCH',
  'BIOMETRIC_MISMATCH',
  'BIOMETRIC_QUALITY_FAILURE',
  'BIOMETRIC_UNAVAILABLE',
  'BIOMETRIC_MANUAL_REFERRAL',
] as const satisfies readonly BiometricScenario[]

const biometricRequestSchema = z
  .object({
    requestReference: syntheticIdSchema,
    correlationId: syntheticIdSchema,
    caseId: syntheticIdSchema,
    biometricReferenceId: syntheticIdSchema,
    scenario: z.enum(BIOMETRIC_SCENARIO_NAMES),
  })
  .strict()

type BiometricOutcome =
  (typeof BIOMETRIC_SCENARIOS)[keyof typeof BIOMETRIC_SCENARIOS]['outcome']
type BiometricEvidence = Readonly<{
  caseId: SyntheticId
  biometricReferenceId: SyntheticId
  biometricMaterialIncluded: false
  computationPerformed: false
}>

export type BiometricAdapterResult = MockAdapterResult<BiometricOutcome, BiometricEvidence>
export type LocalBiometricAdapter = LocalMockAdapter<BiometricAdapterResult>

export function createLocalBiometricAdapter(): LocalBiometricAdapter {
  function execute(candidate: unknown): BiometricAdapterResult {
    const validated = validateMockRequest({
      adapter: 'BIOMETRICS',
      schema: biometricRequestSchema,
      candidate,
      supportedScenarios: BIOMETRIC_SCENARIO_NAMES,
    })
    if (!validated.success) {
      return validated.result
    }

    const request = validated.data
    const configured = BIOMETRIC_SCENARIOS[request.scenario]
    return createMockOutcome({
      adapter: 'BIOMETRICS',
      requestReference: request.requestReference,
      correlationId: request.correlationId,
      outcome: configured.outcome,
      classification: configured.classification,
      reasonCode: configured.reasonCode,
      metadata: {
        caseId: request.caseId,
        biometricReferenceId: request.biometricReferenceId,
        biometricMaterialIncluded: false,
        computationPerformed: false,
      },
    })
  }

  return Object.freeze({ execute })
}
