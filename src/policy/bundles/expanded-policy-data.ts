import type { z } from 'zod'

import { createExpandedDocumentManifests, createExpandedQuestionManifests } from '../manifests'
import { createExpandedProvenanceCatalogue, createExpandedReasonCatalogue } from '../reasons'
import type { policyBundleSchema } from '../schema'

type PolicyBundleInput = z.input<typeof policyBundleSchema>

export const SCENARIO_RULES = [
  ['SYN-TOURIST-001', 'TOURIST', 'SYNTHETIC_TOURISM', 'SYNTHETIC_TOURIST_PURPOSE', 'QM-TOURIST-1', 'DM-TOURIST-1', 41, 'PROV-SYN-P1-TOURIST'],
  ['SYN-BUSINESS-001', 'BUSINESS', 'SYNTHETIC_ORDINARY_BUSINESS_VISIT', 'SYNTHETIC_BUSINESS_PURPOSE', 'QM-BUSINESS-1', 'DM-BUSINESS-1', 59, 'PROV-SYN-P2-BUSINESS'],
  ['SYN-MEDICAL-001', 'MEDICAL', 'SYNTHETIC_MEDICAL_TREATMENT', 'SYNTHETIC_MEDICAL_PURPOSE', 'QM-MEDICAL-1', 'DM-MEDICAL-1', 73, 'PROV-SYN-P1-MEDICAL'],
  ['SYN-MEDICAL-ATTENDANT-001', 'MEDICAL-ATTENDANT', 'SYNTHETIC_MEDICAL_ATTENDANT', 'SYNTHETIC_MEDICAL_ATTENDANT_PURPOSE', 'QM-MEDICAL-ATTENDANT-1', 'DM-MEDICAL-ATTENDANT-1', 47, 'PROV-SYN-P2-MEDICAL-ATTENDANT'],
  ['SYN-STUDENT-001', 'STUDENT', 'SYNTHETIC_GENERAL_ACADEMIC_STUDY', 'SYNTHETIC_STUDENT_PURPOSE', 'QM-STUDENT-1', 'DM-STUDENT-1', 53, 'PROV-SYN-P2-STUDENT'],
  ['SYN-FAMILY-001', 'FAMILY', 'SYNTHETIC_STUDENT_DEPENDENT', 'SYNTHETIC_FAMILY_PURPOSE', 'QM-FAMILY-1', 'DM-FAMILY-1', 43, 'PROV-SYN-P2-FAMILY'],
  ['SYN-TRANSIT-001', 'TRANSIT', 'SYNTHETIC_TRANSIT', 'SYNTHETIC_TRANSIT_PURPOSE', 'QM-TRANSIT-1', 'DM-TRANSIT-1', 29, 'PROV-SYN-P2-TRANSIT'],
  ['SYN-MISCELLANEOUS-001', 'MISCELLANEOUS', 'SYNTHETIC_RELATIONSHIP_BASED_ENTRY', 'SYNTHETIC_MISCELLANEOUS_PURPOSE', 'QM-MISCELLANEOUS-1', 'DM-MISCELLANEOUS-1', 61, 'PROV-SYN-P2-MISCELLANEOUS'],
] as const

export function createExpandedPolicyBundleData(): PolicyBundleInput {
  return {
    bundleId: 'SYN-EVISA-POLICY',
    version: '2.0.0',
    qualifiedVersion: 'SYN-EVISA-POLICY@2.0.0',
    status: 'ACTIVE_FOR_DEMO',
    effectiveFrom: '2099-01-01',
    effectiveTo: '2100-01-01',
    digest: 'SYN-POLICY-DIGEST-2-0-0-EIGHT-CATEGORY',
    minimumFactKeys: ['scenarioIntent', 'syntheticPolicyCohort', 'syntheticPassportClass', 'plannedArrivalDate'],
    reasons: [...createExpandedReasonCatalogue()],
    provenance: [...createExpandedProvenanceCatalogue()],
    questionManifests: [...createExpandedQuestionManifests()],
    documentManifests: [...createExpandedDocumentManifests()],
    rules: SCENARIO_RULES.map(([scenarioId, codePart, intent, purposeFamily, questionManifestId, documentManifestId, amount, provenanceId]) => ({
      id: `RULE-${scenarioId}`,
      priority: 100,
      conditions: [
        { fact: 'scenarioId', operator: 'EQUALS', value: scenarioId },
        { fact: 'scenarioIntent', operator: 'EQUALS', value: intent },
        { fact: 'syntheticPolicyCohort', operator: 'EQUALS', value: 'SYN-POLICY-COHORT-A' },
        { fact: 'syntheticPassportClass', operator: 'EQUALS', value: 'SYNTHETIC_STANDARD_PASSPORT' },
      ],
      requiredFactKeys: scenarioId === 'SYN-MEDICAL-001'
        ? ['proposedAdmissionDate', 'attendantGuidanceRequested']
        : scenarioId === 'SYN-TOURIST-001'
          ? ['plannedExitDate']
          : [],
      effects: {
        scenarioSupport: 'SUPPORTED_BY_DEMO',
        purposeFamily,
        questionManifestId,
        documentManifestId,
        fee: { amount, unit: 'SYNTHETIC_DEMO_CREDITS', label: 'SYNTHETIC — NOT PAYABLE', reasonCode: 'R-SYN-FEE-POLICY' },
        reasonCodes: [
          'R-SYN-SCENARIO-SUPPORTED',
          `R-SYN-${codePart}-INTENT`,
          `R-SYN-${codePart}-DOCUMENTS`,
          ...(scenarioId === 'SYN-MEDICAL-001'
            ? ['R-SYN-HOSPITAL-LETTER-REQUIRED', 'R-SYN-ATTENDANT-ONLY'] as const
            : scenarioId === 'SYN-TOURIST-001'
              ? ['R-SYN-NO-HOSPITAL-LETTER'] as const
              : []),
          'R-SYN-FEE-POLICY',
        ],
        provenanceIds: [provenanceId, 'PROV-SYN-FROZEN-P0'],
        guidanceCodes: scenarioId === 'SYN-MEDICAL-001'
          ? ['ATTENDANT_GUIDANCE_ONLY']
          : scenarioId === 'SYN-TOURIST-001'
            ? ['NO_HOSPITAL_LETTER_IN_DEMO_FIXTURE']
            : [],
      },
    })),
  }
}
