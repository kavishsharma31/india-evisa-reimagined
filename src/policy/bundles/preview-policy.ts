import { parsePolicyBundle } from '../schema'
import { createPolicyBundleData } from './bundle-data'

export const PREVIEW_POLICY_QUALIFIED_VERSION = 'SYN-EVISA-POLICY@1.1.0-preview' as const

export const previewPolicyBundle = parsePolicyBundle(
  createPolicyBundleData({
    version: '1.1.0-preview',
    status: 'DRAFT',
    digest: 'SYN-POLICY-DIGEST-1-1-0-PREVIEW',
    hospitalLetterGuidance:
      'The bundled synthetic hospital-letter fixture must visibly identify the fictional admission date.',
    hospitalLetterSourceId: 'PROV-SYN-UX-PREVIEW',
    medicalProvenanceIds: [
      'PROV-SYN-P1-MEDICAL',
      'PROV-SYN-FROZEN-P0',
      'PROV-SYN-UX-PREVIEW',
    ],
  }),
)
