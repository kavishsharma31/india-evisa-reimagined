import type {
  DocumentManifest,
  PolicyBundle,
  PolicyEvaluationRequest,
  PolicyFactKey,
  PolicyFacts,
  ProvenanceDefinition,
  QuestionManifest,
  ReasonDefinition,
  SyntheticFee,
} from './schema'

export type ScenarioSupport =
  | 'SUPPORTED_BY_DEMO'
  | 'NEEDS_MORE_INFORMATION'
  | 'NOT_SUPPORTED_IN_DEMO'
  | 'POLICY_CONFLICT'

export type PurposeFamily =
  | 'SYNTHETIC_TOURIST_PURPOSE'
  | 'SYNTHETIC_BUSINESS_PURPOSE'
  | 'SYNTHETIC_MEDICAL_PURPOSE'
  | 'SYNTHETIC_MEDICAL_ATTENDANT_PURPOSE'
  | 'SYNTHETIC_STUDENT_PURPOSE'
  | 'SYNTHETIC_FAMILY_PURPOSE'
  | 'SYNTHETIC_TRANSIT_PURPOSE'
  | 'SYNTHETIC_MISCELLANEOUS_PURPOSE'

export type PolicyReference = Readonly<{
  bundleId: PolicyBundle['bundleId']
  version: PolicyBundle['version']
  qualifiedVersion: PolicyBundle['qualifiedVersion']
  status: PolicyBundle['status']
  digest: PolicyBundle['digest']
}>

export type ExplanationSafeInformation = Readonly<{
  legalDecision: false
  summaryCode: 'DEMO_POLICY_GUIDANCE_ONLY'
  missingFactKeys: readonly PolicyFactKey[]
  guidanceCodes: readonly string[]
}>

export type PolicyEvaluationResult = Readonly<{
  evaluationId: `SYN-${string}`
  scenarioId: `SYN-${string}`
  mode: PolicyEvaluationRequest['mode']
  evaluatedAt: PolicyEvaluationRequest['evaluatedAt']
  policy: PolicyReference
  scenarioSupport: ScenarioSupport
  suggestedPurposeFamily?: PurposeFamily
  questionManifest?: QuestionManifest
  documentManifest?: DocumentManifest
  syntheticFee?: SyntheticFee
  matchedRuleIds: readonly string[]
  reasonCodes: readonly `R-SYN-${string}`[]
  reasons: readonly ReasonDefinition[]
  provenance: readonly ProvenanceDefinition[]
  explanation: ExplanationSafeInformation
}>

export type PolicyComparison = Readonly<{
  scenarioId: `SYN-${string}`
  activeQualifiedVersion: PolicyBundle['qualifiedVersion']
  candidateQualifiedVersion: PolicyBundle['qualifiedVersion']
  supportChanged: boolean
  questionManifestChanged: boolean
  feeChanged: boolean
  affectedDocumentRequirementIds: readonly string[]
}>

export type {
  DocumentManifest,
  PolicyBundle,
  PolicyEvaluationRequest,
  PolicyFactKey,
  PolicyFacts,
  ProvenanceDefinition,
  QuestionManifest,
  ReasonDefinition,
  SyntheticFee,
}
