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

export const businessScenario = parseScenarioFacts({
  scenarioId: 'SYN-BUSINESS-001', scenarioIntent: 'SYNTHETIC_ORDINARY_BUSINESS_VISIT',
  syntheticPolicyCohort: 'SYN-POLICY-COHORT-A', syntheticPassportClass: 'SYNTHETIC_STANDARD_PASSPORT',
  plannedArrivalDate: '2099-05-10', plannedExitDate: '2099-05-17',
})

export const medicalAttendantScenario = parseScenarioFacts({
  scenarioId: 'SYN-MEDICAL-ATTENDANT-001', scenarioIntent: 'SYNTHETIC_MEDICAL_ATTENDANT',
  syntheticPolicyCohort: 'SYN-POLICY-COHORT-A', syntheticPassportClass: 'SYNTHETIC_STANDARD_PASSPORT',
  plannedArrivalDate: '2099-04-14',
})

export const studentScenario = parseScenarioFacts({
  scenarioId: 'SYN-STUDENT-001', scenarioIntent: 'SYNTHETIC_GENERAL_ACADEMIC_STUDY',
  syntheticPolicyCohort: 'SYN-POLICY-COHORT-A', syntheticPassportClass: 'SYNTHETIC_STANDARD_PASSPORT',
  plannedArrivalDate: '2099-05-10',
})

export const familyScenario = parseScenarioFacts({
  scenarioId: 'SYN-FAMILY-001', scenarioIntent: 'SYNTHETIC_STUDENT_DEPENDENT',
  syntheticPolicyCohort: 'SYN-POLICY-COHORT-A', syntheticPassportClass: 'SYNTHETIC_STANDARD_PASSPORT',
  plannedArrivalDate: '2099-05-10', plannedExitDate: '2099-05-17',
})

export const transitScenario = parseScenarioFacts({
  scenarioId: 'SYN-TRANSIT-001', scenarioIntent: 'SYNTHETIC_TRANSIT',
  syntheticPolicyCohort: 'SYN-POLICY-COHORT-A', syntheticPassportClass: 'SYNTHETIC_STANDARD_PASSPORT',
  plannedArrivalDate: '2099-05-10', plannedExitDate: '2099-05-11',
})

export const miscellaneousScenario = parseScenarioFacts({
  scenarioId: 'SYN-MISCELLANEOUS-001', scenarioIntent: 'SYNTHETIC_RELATIONSHIP_BASED_ENTRY',
  syntheticPolicyCohort: 'SYN-POLICY-COHORT-A', syntheticPassportClass: 'SYNTHETIC_STANDARD_PASSPORT',
  plannedArrivalDate: '2099-05-10', plannedExitDate: '2099-05-17',
})

export const canonicalScenarios = deepFreeze([
  touristScenario, businessScenario, medicalScenario, medicalAttendantScenario,
  studentScenario, familyScenario, transitScenario, miscellaneousScenario,
])

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
