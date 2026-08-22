import {
  deepFreeze,
  parseScenarioFacts,
  type PolicyEvaluationRequest,
  type PolicyFacts,
} from '../policy/schema'

export const CONTROLLED_POLICY_EVALUATION_TIME = '2099-03-01T09:00:00Z' as const

export const medicalScenario = parseScenarioFacts({
  scenarioId: 'SYN-MEDICAL-001',
  scenarioIntent: 'SYNTHETIC_MEDICAL_TREATMENT',
  syntheticPolicyCohort: 'SYN-POLICY-COHORT-A',
  syntheticPassportClass: 'SYNTHETIC_STANDARD_PASSPORT',
  plannedArrivalDate: '2099-04-14',
  proposedAdmissionDate: '2099-04-18',
  attendantGuidanceRequested: true,
})

export const touristScenario = parseScenarioFacts({
  scenarioId: 'SYN-TOURIST-001',
  scenarioIntent: 'SYNTHETIC_TOURISM',
  syntheticPolicyCohort: 'SYN-POLICY-COHORT-A',
  syntheticPassportClass: 'SYNTHETIC_STANDARD_PASSPORT',
  plannedArrivalDate: '2099-05-10',
  plannedExitDate: '2099-05-17',
})

export const canonicalScenarios = deepFreeze([medicalScenario, touristScenario])

export function createPolicyEvaluationRequest(
  facts: PolicyFacts,
  mode: PolicyEvaluationRequest['mode'] = 'NEW_CASE',
): PolicyEvaluationRequest {
  return deepFreeze({
    mode,
    evaluatedAt: CONTROLLED_POLICY_EVALUATION_TIME,
    facts,
  })
}
