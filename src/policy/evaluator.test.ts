import { describe, expect, it } from 'vitest'

import {
  createPolicyEvaluationRequest,
  medicalScenario,
  touristScenario,
} from '../fixtures'
import {
  ACTIVE_POLICY_QUALIFIED_VERSION,
  activePolicyBundle,
  comparePolicyEvaluations,
  evaluatePolicy,
  parsePolicyBundle,
  parseScenarioFacts,
  PREVIEW_POLICY_QUALIFIED_VERSION,
  previewPolicyBundle,
} from './index'

describe('versioned policy evaluation', () => {
  it('evaluates the canonical Medical scenario deterministically', () => {
    const request = createPolicyEvaluationRequest(medicalScenario)
    const firstResult = evaluatePolicy(request, activePolicyBundle)
    const repeatedResult = evaluatePolicy(request, activePolicyBundle)

    expect(firstResult).toEqual(repeatedResult)
    expect(firstResult.policy.qualifiedVersion).toBe(ACTIVE_POLICY_QUALIFIED_VERSION)
    expect(firstResult.scenarioSupport).toBe('SUPPORTED_BY_DEMO')
    expect(firstResult.suggestedPurposeFamily).toBe('SYNTHETIC_MEDICAL_PURPOSE')
    expect(firstResult.questionManifest?.id).toBe('QM-MEDICAL-1')
    expect(firstResult.questionManifest?.questions.map((question) => question.scope)).toContain(
      'SHARED',
    )
    expect(firstResult.questionManifest?.questions.map((question) => question.scope)).toContain(
      'MEDICAL',
    )
    expect(firstResult.documentManifest?.requirements.map((requirement) => requirement.documentType))
      .toEqual([
        'SYNTHETIC_PORTRAIT',
        'SYNTHETIC_PASSPORT_PAGE',
        'SYNTHETIC_HOSPITAL_LETTER',
      ])
    expect(firstResult.syntheticFee).toMatchObject({
      amount: 73,
      unit: 'SYNTHETIC_DEMO_CREDITS',
    })
    expect(firstResult.reasonCodes.length).toBeGreaterThan(0)
    expect(firstResult.provenance.length).toBeGreaterThan(0)
    expect(firstResult.explanation.legalDecision).toBe(false)
  })

  it('evaluates Tourist through the same evaluator and shared policy version', () => {
    const request = createPolicyEvaluationRequest(touristScenario)
    const firstResult = evaluatePolicy(request, activePolicyBundle)
    const repeatedResult = evaluatePolicy(request, activePolicyBundle)

    expect(firstResult).toEqual(repeatedResult)
    expect(firstResult.policy.qualifiedVersion).toBe(ACTIVE_POLICY_QUALIFIED_VERSION)
    expect(firstResult.scenarioSupport).toBe('SUPPORTED_BY_DEMO')
    expect(firstResult.suggestedPurposeFamily).toBe('SYNTHETIC_TOURIST_PURPOSE')
    expect(firstResult.questionManifest?.id).toBe('QM-TOURIST-1')
    expect(firstResult.questionManifest?.questions.map((question) => question.scope)).toContain(
      'SHARED',
    )
    expect(firstResult.questionManifest?.questions.map((question) => question.scope)).toContain(
      'TOURIST',
    )
    expect(firstResult.documentManifest?.requirements.map((requirement) => requirement.documentType))
      .toEqual(['SYNTHETIC_PORTRAIT', 'SYNTHETIC_PASSPORT_PAGE'])
    expect(firstResult.documentManifest?.requirements).not.toContainEqual(
      expect.objectContaining({ documentType: 'SYNTHETIC_HOSPITAL_LETTER' }),
    )
    expect(firstResult.syntheticFee).toMatchObject({
      amount: 41,
      unit: 'SYNTHETIC_DEMO_CREDITS',
    })
    expect(firstResult.reasonCodes.length).toBeGreaterThan(0)
    expect(firstResult.provenance.length).toBeGreaterThan(0)
  })

  it('keeps the draft preview separate and changes only Medical hospital-letter guidance', () => {
    const activeBundleBeforePreview = JSON.stringify(activePolicyBundle)
    const activeResult = evaluatePolicy(
      createPolicyEvaluationRequest(medicalScenario),
      activePolicyBundle,
    )
    const activeResultBeforePreview = JSON.stringify(activeResult)
    const previewResult = evaluatePolicy(
      createPolicyEvaluationRequest(medicalScenario, 'PREVIEW'),
      previewPolicyBundle,
    )
    const comparison = comparePolicyEvaluations(activeResult, previewResult)

    const activeHospitalLetter = activeResult.documentManifest?.requirements.find(
      (requirement) => requirement.id === 'REQ-HOSPITAL-LETTER-1',
    )
    const previewHospitalLetter = previewResult.documentManifest?.requirements.find(
      (requirement) => requirement.id === 'REQ-HOSPITAL-LETTER-1',
    )

    expect(previewPolicyBundle.status).toBe('DRAFT')
    expect(previewResult.policy.qualifiedVersion).toBe(PREVIEW_POLICY_QUALIFIED_VERSION)
    expect(previewResult.scenarioSupport).toBe('SUPPORTED_BY_DEMO')
    expect(previewHospitalLetter?.guidance).toContain('fictional admission date')
    expect(previewHospitalLetter?.guidance).not.toBe(activeHospitalLetter?.guidance)
    expect(comparison.affectedDocumentRequirementIds).toEqual(['REQ-HOSPITAL-LETTER-1'])
    expect(comparison.questionManifestChanged).toBe(false)
    expect(comparison.feeChanged).toBe(false)
    expect(comparison.supportChanged).toBe(false)
    expect(JSON.stringify(activePolicyBundle)).toBe(activeBundleBeforePreview)
    expect(JSON.stringify(activeResult)).toBe(activeResultBeforePreview)
    expect(Object.isFrozen(activeResult)).toBe(true)
    expect(Object.isFrozen(activePolicyBundle)).toBe(true)
    expect(Object.isFrozen(activePolicyBundle.rules)).toBe(true)
    expect(Object.isFrozen(previewPolicyBundle)).toBe(true)
  })

  it('leaves Tourist policy effects unaffected by the Medical-only preview', () => {
    const activeResult = evaluatePolicy(
      createPolicyEvaluationRequest(touristScenario),
      activePolicyBundle,
    )
    const previewResult = evaluatePolicy(
      createPolicyEvaluationRequest(touristScenario, 'PREVIEW'),
      previewPolicyBundle,
    )
    const comparison = comparePolicyEvaluations(activeResult, previewResult)

    expect(previewResult.scenarioSupport).toBe(activeResult.scenarioSupport)
    expect(previewResult.suggestedPurposeFamily).toBe(activeResult.suggestedPurposeFamily)
    expect(previewResult.questionManifest).toEqual(activeResult.questionManifest)
    expect(previewResult.documentManifest).toEqual(activeResult.documentManifest)
    expect(previewResult.syntheticFee).toEqual(activeResult.syntheticFee)
    expect(previewResult.reasonCodes).toEqual(activeResult.reasonCodes)
    expect(previewResult.provenance).toEqual(activeResult.provenance)
    expect(comparison.affectedDocumentRequirementIds).toEqual([])
  })

  it('rejects a draft bundle outside explicit preview mode', () => {
    const result = evaluatePolicy(
      createPolicyEvaluationRequest(medicalScenario),
      previewPolicyBundle,
    )

    expect(result.scenarioSupport).toBe('POLICY_CONFLICT')
    expect(result.reasonCodes).toEqual(['R-SYN-DRAFT-PREVIEW-ONLY'])
    expect(result.questionManifest).toBeUndefined()
    expect(result.documentManifest).toBeUndefined()
    expect(result.syntheticFee).toBeUndefined()
  })

  it('fails closed with more-information when a required Medical fact is missing', () => {
    const incompleteMedicalFacts = parseScenarioFacts({
      scenarioId: 'SYN-MEDICAL-001',
      scenarioIntent: 'SYNTHETIC_MEDICAL_TREATMENT',
      syntheticPolicyCohort: 'SYN-POLICY-COHORT-A',
      syntheticPassportClass: 'SYNTHETIC_STANDARD_PASSPORT',
      plannedArrivalDate: '2099-04-14',
      attendantGuidanceRequested: true,
    })
    const result = evaluatePolicy(
      createPolicyEvaluationRequest(incompleteMedicalFacts),
      activePolicyBundle,
    )

    expect(result.scenarioSupport).toBe('NEEDS_MORE_INFORMATION')
    expect(result.explanation.missingFactKeys).toEqual(['proposedAdmissionDate'])
    expect(result.questionManifest).toBeUndefined()
    expect(result.documentManifest).toBeUndefined()
    expect(result.syntheticFee).toBeUndefined()
  })

  it('returns a typed unsupported result for an unknown scenario', () => {
    const unknownFacts = parseScenarioFacts({
      ...touristScenario,
      scenarioId: 'SYN-UNKNOWN-001',
    })
    const result = evaluatePolicy(
      createPolicyEvaluationRequest(unknownFacts),
      activePolicyBundle,
    )

    expect(result.scenarioSupport).toBe('NOT_SUPPORTED_IN_DEMO')
    expect(result.reasonCodes).toEqual(['R-SYN-NOT-SUPPORTED'])
    expect(result.matchedRuleIds).toEqual([])
  })

  it('returns a typed conflict for overlapping incompatible policy effects', () => {
    const medicalRule = activePolicyBundle.rules.find(
      (rule) => rule.id === 'RULE-SYN-MEDICAL-001',
    )
    if (!medicalRule) {
      throw new Error('Expected the canonical Medical rule.')
    }

    const conflictingBundle = parsePolicyBundle({
      ...activePolicyBundle,
      rules: [
        ...activePolicyBundle.rules,
        {
          ...medicalRule,
          id: 'RULE-SYN-MEDICAL-CONFLICT',
          effects: {
            ...medicalRule.effects,
            purposeFamily: 'SYNTHETIC_TOURIST_PURPOSE',
          },
        },
      ],
    })
    const result = evaluatePolicy(
      createPolicyEvaluationRequest(medicalScenario),
      conflictingBundle,
    )

    expect(result.scenarioSupport).toBe('POLICY_CONFLICT')
    expect(result.reasonCodes).toEqual(['R-SYN-POLICY-CONFLICT'])
    expect(result.matchedRuleIds).toEqual([
      'RULE-SYN-MEDICAL-001',
      'RULE-SYN-MEDICAL-CONFLICT',
    ])
    expect(result.questionManifest).toBeUndefined()
  })
})
