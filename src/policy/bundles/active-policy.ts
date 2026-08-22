import { parsePolicyBundle } from '../schema'
import { createPolicyBundleData } from './bundle-data'

export const ACTIVE_POLICY_QUALIFIED_VERSION = 'SYN-EVISA-POLICY@1.0.0' as const

export const activePolicyBundle = parsePolicyBundle(
  createPolicyBundleData({
    version: '1.0.0',
    status: 'ACTIVE_FOR_DEMO',
    digest: 'SYN-POLICY-DIGEST-1-0-0',
    hospitalLetterGuidance: 'Use the bundled project-created synthetic hospital-letter fixture.',
    hospitalLetterSourceId: 'PROV-SYN-P1-MEDICAL',
    medicalProvenanceIds: ['PROV-SYN-P1-MEDICAL', 'PROV-SYN-FROZEN-P0'],
  }),
)
