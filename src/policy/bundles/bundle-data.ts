import type { ProvenanceId } from '../../domain/ids'
import type { z } from 'zod'

import { createDocumentManifests, createQuestionManifests } from '../manifests'
import { createProvenanceCatalogue, createReasonCatalogue } from '../reasons'
import type { policyBundleSchema } from '../schema'

type PolicyBundleInput = z.input<typeof policyBundleSchema>

type BundleDataOptions = Readonly<{
  version: '1.0.0' | '1.1.0-preview'
  status: 'ACTIVE_FOR_DEMO' | 'DRAFT'
  digest: `SYN-${string}`
  hospitalLetterGuidance: string
  hospitalLetterSourceId: ProvenanceId
  medicalProvenanceIds: readonly ProvenanceId[]
}>

export function createPolicyBundleData(options: BundleDataOptions): PolicyBundleInput {
  return {
    bundleId: 'SYN-EVISA-POLICY',
    version: options.version,
    qualifiedVersion: `SYN-EVISA-POLICY@${options.version}`,
    status: options.status,
    effectiveFrom: '2099-01-01',
    effectiveTo: '2100-01-01',
    digest: options.digest,
    minimumFactKeys: [
      'scenarioIntent',
      'syntheticPolicyCohort',
      'syntheticPassportClass',
      'plannedArrivalDate',
    ],
    reasons: [...createReasonCatalogue()],
    provenance: [...createProvenanceCatalogue()],
    questionManifests: [...createQuestionManifests()],
    documentManifests: [
      ...createDocumentManifests(
        options.hospitalLetterGuidance,
        options.hospitalLetterSourceId,
      ),
    ],
    rules: [
      {
        id: 'RULE-SYN-MEDICAL-001',
        priority: 100,
        conditions: [
          { fact: 'scenarioId', operator: 'EQUALS', value: 'SYN-MEDICAL-001' },
          {
            fact: 'scenarioIntent',
            operator: 'EQUALS',
            value: 'SYNTHETIC_MEDICAL_TREATMENT',
          },
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
        requiredFactKeys: ['proposedAdmissionDate', 'attendantGuidanceRequested'],
        effects: {
          scenarioSupport: 'SUPPORTED_BY_DEMO',
          purposeFamily: 'SYNTHETIC_MEDICAL_PURPOSE',
          questionManifestId: 'QM-MEDICAL-1',
          documentManifestId: 'DM-MEDICAL-1',
          fee: {
            amount: 73,
            unit: 'SYNTHETIC_DEMO_CREDITS',
            label: 'SYNTHETIC — NOT PAYABLE',
            reasonCode: 'R-SYN-FEE-POLICY',
          },
          reasonCodes: [
            'R-SYN-SCENARIO-SUPPORTED',
            'R-SYN-MEDICAL-INTENT',
            'R-SYN-MEDICAL-DOCUMENTS',
            'R-SYN-HOSPITAL-LETTER-REQUIRED',
            'R-SYN-FEE-POLICY',
            'R-SYN-ATTENDANT-ONLY',
          ],
          provenanceIds: [...options.medicalProvenanceIds],
          guidanceCodes: ['ATTENDANT_GUIDANCE_ONLY'],
        },
      },
      {
        id: 'RULE-SYN-TOURIST-001',
        priority: 100,
        conditions: [
          { fact: 'scenarioId', operator: 'EQUALS', value: 'SYN-TOURIST-001' },
          {
            fact: 'scenarioIntent',
            operator: 'EQUALS',
            value: 'SYNTHETIC_TOURISM',
          },
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
        requiredFactKeys: ['plannedExitDate'],
        effects: {
          scenarioSupport: 'SUPPORTED_BY_DEMO',
          purposeFamily: 'SYNTHETIC_TOURIST_PURPOSE',
          questionManifestId: 'QM-TOURIST-1',
          documentManifestId: 'DM-TOURIST-1',
          fee: {
            amount: 41,
            unit: 'SYNTHETIC_DEMO_CREDITS',
            label: 'SYNTHETIC — NOT PAYABLE',
            reasonCode: 'R-SYN-FEE-POLICY',
          },
          reasonCodes: [
            'R-SYN-SCENARIO-SUPPORTED',
            'R-SYN-TOURIST-INTENT',
            'R-SYN-TOURIST-DOCUMENTS',
            'R-SYN-NO-HOSPITAL-LETTER',
            'R-SYN-FEE-POLICY',
          ],
          provenanceIds: ['PROV-SYN-P1-TOURIST', 'PROV-SYN-FROZEN-P0'],
          guidanceCodes: ['NO_HOSPITAL_LETTER_IN_DEMO_FIXTURE'],
        },
      },
    ],
  }
}
