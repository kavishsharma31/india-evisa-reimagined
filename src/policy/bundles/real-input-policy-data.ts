import type { z } from 'zod'

import { createExpandedDocumentManifests, createRealInputQuestionManifests } from '../manifests'
import { createExpandedProvenanceCatalogue, createExpandedReasonCatalogue } from '../reasons'
import type { policyBundleSchema } from '../schema'
import { SCENARIO_RULES } from './expanded-policy-data'

type PolicyBundleInput = z.input<typeof policyBundleSchema>

export function createRealInputPolicyBundleData(): PolicyBundleInput {
  return {
    bundleId: 'SYN-EVISA-POLICY',
    version: '2.1.0',
    qualifiedVersion: 'SYN-EVISA-POLICY@2.1.0',
    status: 'ACTIVE_FOR_DEMO',
    effectiveFrom: '2099-01-01',
    effectiveTo: '2100-01-01',
    digest: 'SYN-POLICY-DIGEST-2-1-0-REAL-INPUTS',
    minimumFactKeys: [
      'scenarioIntent',
      'syntheticPolicyCohort',
      'syntheticPassportClass',
      'plannedArrivalDate',
    ],
    reasons: [...createExpandedReasonCatalogue()],
    provenance: [...createExpandedProvenanceCatalogue()],
    questionManifests: [...createRealInputQuestionManifests()],
    documentManifests: [...createExpandedDocumentManifests()],
    rules: SCENARIO_RULES.map(
      ([
        scenarioId,
        codePart,
        intent,
        purposeFamily,
        questionManifestId,
        documentManifestId,
        amount,
        provenanceId,
      ]) => ({
        id: `RULE-${scenarioId}`,
        priority: 100,
        conditions: [
          { fact: 'scenarioId', operator: 'EQUALS', value: scenarioId },
          { fact: 'scenarioIntent', operator: 'EQUALS', value: intent },
          {
            fact: 'syntheticPolicyCohort',
            operator: 'EQUALS',
            value: 'SYN-POLICY-COHORT-A',
          },
          {
            fact: 'syntheticPassportClass',
            operator: 'EQUALS',
            value: 'SYNTHETIC_STANDARD_PASSPORT',
          },
        ],
        requiredFactKeys:
          scenarioId === 'SYN-MEDICAL-001'
            ? ['proposedAdmissionDate', 'attendantGuidanceRequested']
            : scenarioId === 'SYN-TOURIST-001'
              ? ['plannedExitDate']
              : [],
        effects: {
          scenarioSupport: 'SUPPORTED_BY_DEMO',
          purposeFamily,
          questionManifestId,
          documentManifestId,
          fee: {
            amount,
            unit: 'SYNTHETIC_DEMO_CREDITS',
            label: 'SYNTHETIC — NOT PAYABLE',
            reasonCode: 'R-SYN-FEE-POLICY',
          },
          reasonCodes: [
            'R-SYN-SCENARIO-SUPPORTED',
            `R-SYN-${codePart}-INTENT`,
            `R-SYN-${codePart}-DOCUMENTS`,
            ...(scenarioId === 'SYN-MEDICAL-001'
              ? (['R-SYN-HOSPITAL-LETTER-REQUIRED', 'R-SYN-ATTENDANT-ONLY'] as const)
              : scenarioId === 'SYN-TOURIST-001'
                ? (['R-SYN-NO-HOSPITAL-LETTER'] as const)
                : []),
            'R-SYN-FEE-POLICY',
          ],
          provenanceIds: [provenanceId, 'PROV-SYN-FROZEN-P0'],
          guidanceCodes:
            scenarioId === 'SYN-MEDICAL-001'
              ? ['ATTENDANT_GUIDANCE_ONLY']
              : scenarioId === 'SYN-TOURIST-001'
                ? ['NO_HOSPITAL_LETTER_IN_DEMO_FIXTURE']
                : [],
        },
      }),
    ),
  }
}
