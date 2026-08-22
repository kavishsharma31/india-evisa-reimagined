import { syntheticIdSchema } from '../domain/ids'
import {
  deepFreeze,
  policyEvaluationRequestSchema,
  type DocumentManifest,
  type PolicyBundle,
  type PolicyEvaluationRequest,
  type PolicyFactKey,
  type PolicyRule,
  type ProvenanceDefinition,
  type QuestionManifest,
  type ReasonDefinition,
} from './schema'
import type {
  PolicyComparison,
  PolicyEvaluationResult,
  PolicyReference,
  ScenarioSupport,
} from './types'

const SAFE_FALLBACK_SCENARIO_ID = 'SYN-UNKNOWN-SCENARIO' as const
const SAFE_FALLBACK_TIMESTAMP = '2099-01-01T00:00:00Z' as const

function unique<Value>(values: readonly Value[]): readonly Value[] {
  return [...new Set(values)]
}

function createPolicyReference(bundle: PolicyBundle): PolicyReference {
  return deepFreeze({
    bundleId: bundle.bundleId,
    version: bundle.version,
    qualifiedVersion: bundle.qualifiedVersion,
    status: bundle.status,
    digest: bundle.digest,
  })
}

function createEvaluationId(request: PolicyEvaluationRequest, bundle: PolicyBundle) {
  const stableParts = [
    request.facts.scenarioId,
    bundle.qualifiedVersion,
    request.mode,
    request.evaluatedAt,
  ]
    .join('-')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return syntheticIdSchema.parse(`SYN-EVAL-${stableParts}`)
}

function resolveReasons(
  bundle: PolicyBundle,
  reasonCodes: PolicyEvaluationResult['reasonCodes'],
): readonly ReasonDefinition[] {
  const reasons: ReasonDefinition[] = []

  for (const reasonCode of reasonCodes) {
    const reason = bundle.reasons.find((candidate) => candidate.code === reasonCode)
    if (reason) {
      reasons.push(reason)
    }
  }

  return deepFreeze(reasons)
}

function resolveProvenance(
  bundle: PolicyBundle,
  provenanceIds: readonly `PROV-SYN-${string}`[],
): readonly ProvenanceDefinition[] {
  const provenance: ProvenanceDefinition[] = []

  for (const provenanceId of unique(provenanceIds)) {
    const source = bundle.provenance.find((candidate) => candidate.id === provenanceId)
    if (source) {
      provenance.push(source)
    }
  }

  return deepFreeze(provenance)
}

function createNonSupportedResult(
  request: PolicyEvaluationRequest,
  bundle: PolicyBundle,
  support: Exclude<ScenarioSupport, 'SUPPORTED_BY_DEMO'>,
  reasonCodes: PolicyEvaluationResult['reasonCodes'],
  missingFactKeys: readonly PolicyFactKey[] = [],
  matchedRuleIds: readonly string[] = [],
): PolicyEvaluationResult {
  return deepFreeze({
    evaluationId: createEvaluationId(request, bundle),
    scenarioId: request.facts.scenarioId,
    mode: request.mode,
    evaluatedAt: request.evaluatedAt,
    policy: createPolicyReference(bundle),
    scenarioSupport: support,
    matchedRuleIds: [...matchedRuleIds],
    reasonCodes: [...reasonCodes],
    reasons: resolveReasons(bundle, reasonCodes),
    provenance: resolveProvenance(bundle, ['PROV-SYN-FROZEN-P0']),
    explanation: {
      legalDecision: false,
      summaryCode: 'DEMO_POLICY_GUIDANCE_ONLY',
      missingFactKeys: [...missingFactKeys],
      guidanceCodes: [],
    },
  })
}

function conditionMatches(request: PolicyEvaluationRequest, rule: PolicyRule): boolean {
  return rule.conditions.every((condition) => {
    const factValue = request.facts[condition.fact]
    if (condition.operator === 'PRESENT') {
      return factValue !== undefined
    }

    return factValue === condition.value
  })
}

function coreEffectSignature(rule: PolicyRule): string {
  return JSON.stringify({
    scenarioSupport: rule.effects.scenarioSupport,
    purposeFamily: rule.effects.purposeFamily,
    questionManifestId: rule.effects.questionManifestId,
    documentManifestId: rule.effects.documentManifestId,
    fee: rule.effects.fee,
  })
}

function findQuestionManifest(bundle: PolicyBundle, id: string): QuestionManifest | undefined {
  return bundle.questionManifests.find((manifest) => manifest.id === id)
}

function findDocumentManifest(bundle: PolicyBundle, id: string): DocumentManifest | undefined {
  return bundle.documentManifests.find((manifest) => manifest.id === id)
}

function isWithinEffectivePeriod(request: PolicyEvaluationRequest, bundle: PolicyBundle): boolean {
  const evaluationDate = request.evaluatedAt.slice(0, 10)
  return evaluationDate >= bundle.effectiveFrom && evaluationDate < bundle.effectiveTo
}

function safeInvalidRequest(bundle: PolicyBundle): PolicyEvaluationResult {
  const fallbackRequest = policyEvaluationRequestSchema.parse({
    mode: 'NEW_CASE',
    evaluatedAt: SAFE_FALLBACK_TIMESTAMP,
    facts: { scenarioId: SAFE_FALLBACK_SCENARIO_ID },
  })

  return createNonSupportedResult(
    fallbackRequest,
    bundle,
    'POLICY_CONFLICT',
    ['R-SYN-INVALID-INPUT'],
  )
}

export function evaluatePolicy(input: unknown, bundle: PolicyBundle): PolicyEvaluationResult {
  const parsedRequest = policyEvaluationRequestSchema.safeParse(input)
  if (!parsedRequest.success) {
    return safeInvalidRequest(bundle)
  }

  const request = parsedRequest.data

  if (bundle.status === 'DRAFT' && request.mode !== 'PREVIEW') {
    return createNonSupportedResult(
      request,
      bundle,
      'POLICY_CONFLICT',
      ['R-SYN-DRAFT-PREVIEW-ONLY'],
    )
  }

  if (!isWithinEffectivePeriod(request, bundle)) {
    return createNonSupportedResult(
      request,
      bundle,
      'NOT_SUPPORTED_IN_DEMO',
      ['R-SYN-BUNDLE-NOT-EFFECTIVE'],
    )
  }

  const missingMinimumFacts = bundle.minimumFactKeys.filter(
    (factKey) => request.facts[factKey] === undefined,
  )
  if (missingMinimumFacts.length > 0) {
    return createNonSupportedResult(
      request,
      bundle,
      'NEEDS_MORE_INFORMATION',
      ['R-SYN-MISSING-MINIMUM-FACT'],
      missingMinimumFacts,
    )
  }

  const matchedRules = bundle.rules
    .filter((rule) => conditionMatches(request, rule))
    .toSorted((left, right) => right.priority - left.priority || left.id.localeCompare(right.id))

  if (matchedRules.length === 0) {
    return createNonSupportedResult(
      request,
      bundle,
      'NOT_SUPPORTED_IN_DEMO',
      ['R-SYN-NOT-SUPPORTED'],
    )
  }

  const missingRuleFacts = unique(
    matchedRules.flatMap((rule) =>
      rule.requiredFactKeys.filter((factKey) => request.facts[factKey] === undefined),
    ),
  )
  if (missingRuleFacts.length > 0) {
    return createNonSupportedResult(
      request,
      bundle,
      'NEEDS_MORE_INFORMATION',
      ['R-SYN-MISSING-MINIMUM-FACT'],
      missingRuleFacts,
      matchedRules.map((rule) => rule.id),
    )
  }

  const effectSignatures = unique(matchedRules.map(coreEffectSignature))
  if (effectSignatures.length !== 1) {
    return createNonSupportedResult(
      request,
      bundle,
      'POLICY_CONFLICT',
      ['R-SYN-POLICY-CONFLICT'],
      [],
      matchedRules.map((rule) => rule.id),
    )
  }

  const selectedRule = matchedRules[0]
  if (!selectedRule) {
    return createNonSupportedResult(
      request,
      bundle,
      'POLICY_CONFLICT',
      ['R-SYN-POLICY-CONFLICT'],
    )
  }

  const questionManifest = findQuestionManifest(
    bundle,
    selectedRule.effects.questionManifestId,
  )
  const documentManifest = findDocumentManifest(
    bundle,
    selectedRule.effects.documentManifestId,
  )
  if (!questionManifest || !documentManifest) {
    return createNonSupportedResult(
      request,
      bundle,
      'POLICY_CONFLICT',
      ['R-SYN-POLICY-CONFLICT'],
      [],
      matchedRules.map((rule) => rule.id),
    )
  }

  const reasonCodes = unique(
    matchedRules.flatMap((rule) => rule.effects.reasonCodes),
  )
  const provenanceIds = unique([
    ...matchedRules.flatMap((rule) => rule.effects.provenanceIds),
    ...questionManifest.questions.map((question) => question.policySourceId),
    ...documentManifest.requirements.map((requirement) => requirement.policySourceId),
  ])

  return deepFreeze({
    evaluationId: createEvaluationId(request, bundle),
    scenarioId: request.facts.scenarioId,
    mode: request.mode,
    evaluatedAt: request.evaluatedAt,
    policy: createPolicyReference(bundle),
    scenarioSupport: selectedRule.effects.scenarioSupport,
    suggestedPurposeFamily: selectedRule.effects.purposeFamily,
    questionManifest,
    documentManifest,
    syntheticFee: selectedRule.effects.fee,
    matchedRuleIds: matchedRules.map((rule) => rule.id),
    reasonCodes,
    reasons: resolveReasons(bundle, reasonCodes),
    provenance: resolveProvenance(bundle, provenanceIds),
    explanation: {
      legalDecision: false,
      summaryCode: 'DEMO_POLICY_GUIDANCE_ONLY',
      missingFactKeys: [],
      guidanceCodes: unique(matchedRules.flatMap((rule) => rule.effects.guidanceCodes)),
    },
  })
}

export function comparePolicyEvaluations(
  active: PolicyEvaluationResult,
  candidate: PolicyEvaluationResult,
): PolicyComparison {
  const activeRequirements = new Map(
    active.documentManifest?.requirements.map((requirement) => [requirement.id, requirement]),
  )
  const candidateRequirements = new Map(
    candidate.documentManifest?.requirements.map((requirement) => [requirement.id, requirement]),
  )
  const requirementIds = unique([
    ...activeRequirements.keys(),
    ...candidateRequirements.keys(),
  ]).toSorted()
  const affectedDocumentRequirementIds = requirementIds.filter(
    (requirementId) =>
      JSON.stringify(activeRequirements.get(requirementId)) !==
      JSON.stringify(candidateRequirements.get(requirementId)),
  )

  return deepFreeze({
    scenarioId: candidate.scenarioId,
    activeQualifiedVersion: active.policy.qualifiedVersion,
    candidateQualifiedVersion: candidate.policy.qualifiedVersion,
    supportChanged: active.scenarioSupport !== candidate.scenarioSupport,
    questionManifestChanged:
      JSON.stringify(active.questionManifest) !== JSON.stringify(candidate.questionManifest),
    feeChanged: JSON.stringify(active.syntheticFee) !== JSON.stringify(candidate.syntheticFee),
    affectedDocumentRequirementIds,
  })
}
