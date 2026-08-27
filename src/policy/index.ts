export { activePolicyBundle, ACTIVE_POLICY_QUALIFIED_VERSION } from './bundles/active-policy'
export { legacyPolicyBundle, LEGACY_POLICY_QUALIFIED_VERSION } from './bundles/legacy-policy'
export {
  previewPolicyBundle,
  PREVIEW_POLICY_QUALIFIED_VERSION,
} from './bundles/preview-policy'
export { comparePolicyEvaluations, evaluatePolicy } from './evaluator'
export {
  parsePolicyBundle,
  parseScenarioFacts,
  policyBundleSchema,
  policyEvaluationRequestSchema,
  policyFactsSchema,
} from './schema'
export type {
  DocumentManifest,
  PolicyBundle,
  PolicyComparison,
  PolicyEvaluationRequest,
  PolicyEvaluationResult,
  PolicyFactKey,
  PolicyFacts,
  ProvenanceDefinition,
  PurposeFamily,
  QuestionManifest,
  ReasonDefinition,
  ScenarioSupport,
  SyntheticFee,
} from './types'

import { activePolicyBundle } from './bundles/active-policy'
import { legacyPolicyBundle } from './bundles/legacy-policy'

export const registeredPolicyBundles = Object.freeze([legacyPolicyBundle, activePolicyBundle])

export function resolvePolicyBundle(qualifiedVersion: string) {
  return registeredPolicyBundles.find((bundle) => bundle.qualifiedVersion === qualifiedVersion) ?? null
}

export function isSupportedPolicyPin(qualifiedVersion: string, digest: string): boolean {
  const bundle = resolvePolicyBundle(qualifiedVersion)
  return bundle !== null && bundle.digest === digest
}
