import { z } from 'zod'

import {
  policyQualifiedVersionSchema,
  provenanceIdSchema,
  reasonCodeSchema,
  syntheticDateSchema,
  syntheticIdSchema,
  syntheticTimestampSchema,
} from '../domain/ids'

export type DeepReadonly<Value> = Value extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : Value extends object
    ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
    : Value

export const SCENARIO_SUPPORT_STATES = Object.freeze([
  'SUPPORTED_BY_DEMO',
  'NEEDS_MORE_INFORMATION',
  'NOT_SUPPORTED_IN_DEMO',
  'POLICY_CONFLICT',
] as const)

export const POLICY_FACT_KEYS = Object.freeze([
  'scenarioId',
  'scenarioIntent',
  'syntheticPolicyCohort',
  'syntheticPassportClass',
  'plannedArrivalDate',
  'proposedAdmissionDate',
  'attendantGuidanceRequested',
  'plannedExitDate',
] as const)

export const policyFactKeySchema = z.enum(POLICY_FACT_KEYS)

export const policyFactsSchema = z
  .object({
    scenarioId: syntheticIdSchema,
    scenarioIntent: z.string().min(1).optional(),
    syntheticPolicyCohort: z.string().min(1).optional(),
    syntheticPassportClass: z.string().min(1).optional(),
    plannedArrivalDate: syntheticDateSchema.optional(),
    proposedAdmissionDate: syntheticDateSchema.optional(),
    attendantGuidanceRequested: z.boolean().optional(),
    plannedExitDate: syntheticDateSchema.optional(),
  })
  .strict()

export const policyEvaluationRequestSchema = z
  .object({
    mode: z.enum(['NEW_CASE', 'RESUME', 'PREVIEW']),
    evaluatedAt: syntheticTimestampSchema,
    facts: policyFactsSchema,
  })
  .strict()

export const reasonDefinitionSchema = z
  .object({
    code: reasonCodeSchema,
    summary: z.string().min(1),
    explanation: z.string().min(1),
    legalAdvice: z.literal(false),
  })
  .strict()

export const provenanceDefinitionSchema = z
  .object({
    id: provenanceIdSchema,
    sourceLabel: z.string().min(1),
    note: z.string().min(1),
  })
  .strict()

export const questionDefinitionSchema = z
  .object({
    id: z.string().regex(/^Q-[A-Z0-9-]+$/),
    scope: z.enum([
      'SHARED',
      'TOURIST',
      'BUSINESS',
      'MEDICAL',
      'MEDICAL_ATTENDANT',
      'STUDENT',
      'FAMILY',
      'TRANSIT',
      'MISCELLANEOUS',
    ]),
    prompt: z.string().min(1),
    control: z.enum([
      'SINGLE_SELECT',
      'SYNTHETIC_DATE',
      'BOOLEAN_CHOICE',
      'SELECT',
      'DATE',
      'TEXT',
      'YES_NO',
    ]),
    allowedValues: z.array(z.string().min(1)).max(250),
    legacyAllowedValues: z.array(z.string().min(1)).max(20).optional(),
    required: z.boolean(),
    helperText: z.string().min(1).max(300).optional(),
    placeholder: z.string().min(1).max(160).optional(),
    maxLength: z.number().int().positive().max(500).optional(),
    searchable: z.boolean().optional(),
    guidanceByValue: z.record(z.string().min(1), z.string().min(1).max(400)).optional(),
    dateConstraints: z
      .object({
        minOffsetDays: z.number().int().min(0).max(3650).optional(),
        maxOffsetDays: z.number().int().min(0).max(3650).optional(),
        notBeforeQuestionId: z.string().regex(/^Q-[A-Z0-9-]+$/).optional(),
      })
      .strict()
      .optional(),
    reasonCode: reasonCodeSchema,
    policySourceId: provenanceIdSchema,
  })
  .strict()
  .superRefine((question, context) => {
    if (
      ['SINGLE_SELECT', 'SYNTHETIC_DATE', 'BOOLEAN_CHOICE', 'SELECT', 'YES_NO'].includes(
        question.control,
      ) &&
      question.allowedValues.length === 0
    ) {
      context.addIssue({
        code: 'custom',
        path: ['allowedValues'],
        message: 'Choice controls require at least one allowed value.',
      })
    }
    if (question.control === 'YES_NO' && question.allowedValues.length !== 2) {
      context.addIssue({
        code: 'custom',
        path: ['allowedValues'],
        message: 'YES_NO controls require exactly two allowed values.',
      })
    }
    if (
      question.dateConstraints?.minOffsetDays !== undefined &&
      question.dateConstraints.maxOffsetDays !== undefined &&
      question.dateConstraints.minOffsetDays > question.dateConstraints.maxOffsetDays
    ) {
      context.addIssue({
        code: 'custom',
        path: ['dateConstraints'],
        message: 'Date minimum offset cannot exceed its maximum offset.',
      })
    }
  })

export const questionManifestSchema = z
  .object({
    id: z.string().regex(/^QM-[A-Z0-9-]+$/),
    questions: z.array(questionDefinitionSchema).min(1),
  })
  .strict()

export const documentRequirementSchema = z
  .object({
    id: z.string().regex(/^REQ-[A-Z0-9-]+$/),
    documentType: z.enum([
      'SYNTHETIC_PORTRAIT',
      'SYNTHETIC_PASSPORT_PAGE',
      'SYNTHETIC_HOSPITAL_LETTER',
      'SYNTHETIC_BUSINESS_CARD',
      'SYNTHETIC_ADMISSION_LETTER',
      'SYNTHETIC_FINANCIAL_SUPPORT',
      'SYNTHETIC_TRANSIT_TICKETS',
      'SYNTHETIC_DESTINATION_ENTRY_EVIDENCE',
      'SYNTHETIC_RELATIONSHIP_EVIDENCE',
      'SYNTHETIC_CIVIL_CERTIFICATE',
    ]),
    required: z.boolean(),
    reasonCode: reasonCodeSchema,
    acceptedFixtureCategories: z.array(z.string().regex(/^SYNTHETIC_[A-Z0-9_]+$/)).min(1),
    policySourceId: provenanceIdSchema,
    guidance: z.string().min(1),
  })
  .strict()

export const documentManifestSchema = z
  .object({
    id: z.string().regex(/^DM-[A-Z0-9-]+$/),
    requirements: z.array(documentRequirementSchema).min(1),
  })
  .strict()

export const syntheticFeeSchema = z
  .object({
    amount: z.number().int().positive(),
    unit: z.literal('SYNTHETIC_DEMO_CREDITS'),
    label: z.literal('SYNTHETIC — NOT PAYABLE'),
    reasonCode: reasonCodeSchema,
  })
  .strict()

export const ruleConditionSchema = z
  .object({
    fact: policyFactKeySchema,
    operator: z.enum(['EQUALS', 'PRESENT']),
    value: z.union([z.string(), z.boolean()]).optional(),
  })
  .strict()
  .superRefine((condition, context) => {
    if (condition.operator === 'EQUALS' && condition.value === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'EQUALS conditions require a value.',
      })
    }
  })

export const policyRuleSchema = z
  .object({
    id: z.string().regex(/^RULE-[A-Z0-9-]+$/),
    priority: z.number().int(),
    conditions: z.array(ruleConditionSchema).min(1),
    requiredFactKeys: z.array(policyFactKeySchema),
    effects: z
      .object({
        scenarioSupport: z.literal('SUPPORTED_BY_DEMO'),
        purposeFamily: z.enum([
          'SYNTHETIC_TOURIST_PURPOSE',
          'SYNTHETIC_BUSINESS_PURPOSE',
          'SYNTHETIC_MEDICAL_PURPOSE',
          'SYNTHETIC_MEDICAL_ATTENDANT_PURPOSE',
          'SYNTHETIC_STUDENT_PURPOSE',
          'SYNTHETIC_FAMILY_PURPOSE',
          'SYNTHETIC_TRANSIT_PURPOSE',
          'SYNTHETIC_MISCELLANEOUS_PURPOSE',
        ]),
        questionManifestId: z.string().regex(/^QM-[A-Z0-9-]+$/),
        documentManifestId: z.string().regex(/^DM-[A-Z0-9-]+$/),
        fee: syntheticFeeSchema,
        reasonCodes: z.array(reasonCodeSchema).min(1),
        provenanceIds: z.array(provenanceIdSchema).min(1),
        guidanceCodes: z.array(z.string().regex(/^[A-Z0-9_]+$/)),
      })
      .strict(),
  })
  .strict()

export const policyBundleSchema = z
  .object({
    bundleId: z.literal('SYN-EVISA-POLICY'),
    version: z.string().regex(/^\d+\.\d+\.\d+(?:-preview)?$/),
    qualifiedVersion: policyQualifiedVersionSchema,
    status: z.enum(['DRAFT', 'ACTIVE_FOR_DEMO', 'RETIRED']),
    effectiveFrom: syntheticDateSchema,
    effectiveTo: syntheticDateSchema,
    digest: syntheticIdSchema,
    minimumFactKeys: z.array(policyFactKeySchema).min(1),
    reasons: z.array(reasonDefinitionSchema).min(1),
    provenance: z.array(provenanceDefinitionSchema).min(1),
    questionManifests: z.array(questionManifestSchema).min(1),
    documentManifests: z.array(documentManifestSchema).min(1),
    rules: z.array(policyRuleSchema).min(1),
  })
  .strict()
  .superRefine((bundle, context) => {
    if (bundle.qualifiedVersion !== `${bundle.bundleId}@${bundle.version}`) {
      context.addIssue({
        code: 'custom',
        path: ['qualifiedVersion'],
        message: 'Qualified policy version must match bundle ID and version.',
      })
    }

    const reasonCodes = new Set(bundle.reasons.map((reason) => reason.code))
    const provenanceIds = new Set(bundle.provenance.map((source) => source.id))
    const questionManifestIds = new Set(bundle.questionManifests.map((manifest) => manifest.id))
    const documentManifestIds = new Set(bundle.documentManifests.map((manifest) => manifest.id))

    for (const manifest of bundle.questionManifests) {
      for (const question of manifest.questions) {
        if (!reasonCodes.has(question.reasonCode)) {
          context.addIssue({ code: 'custom', message: `Unknown question reason ${question.reasonCode}.` })
        }
        if (!provenanceIds.has(question.policySourceId)) {
          context.addIssue({
            code: 'custom',
            message: `Unknown question provenance ${question.policySourceId}.`,
          })
        }
      }
    }

    for (const manifest of bundle.documentManifests) {
      for (const requirement of manifest.requirements) {
        if (!reasonCodes.has(requirement.reasonCode)) {
          context.addIssue({
            code: 'custom',
            message: `Unknown document reason ${requirement.reasonCode}.`,
          })
        }
        if (!provenanceIds.has(requirement.policySourceId)) {
          context.addIssue({
            code: 'custom',
            message: `Unknown document provenance ${requirement.policySourceId}.`,
          })
        }
      }
    }

    for (const rule of bundle.rules) {
      if (!questionManifestIds.has(rule.effects.questionManifestId)) {
        context.addIssue({
          code: 'custom',
          message: `Unknown question manifest ${rule.effects.questionManifestId}.`,
        })
      }
      if (!documentManifestIds.has(rule.effects.documentManifestId)) {
        context.addIssue({
          code: 'custom',
          message: `Unknown document manifest ${rule.effects.documentManifestId}.`,
        })
      }
      for (const reasonCode of [...rule.effects.reasonCodes, rule.effects.fee.reasonCode]) {
        if (!reasonCodes.has(reasonCode)) {
          context.addIssue({ code: 'custom', message: `Unknown rule reason ${reasonCode}.` })
        }
      }
      for (const provenanceId of rule.effects.provenanceIds) {
        if (!provenanceIds.has(provenanceId)) {
          context.addIssue({
            code: 'custom',
            message: `Unknown rule provenance ${provenanceId}.`,
          })
        }
      }
    }
  })

export type PolicyFactKey = z.infer<typeof policyFactKeySchema>
export type PolicyFacts = DeepReadonly<z.infer<typeof policyFactsSchema>>
export type PolicyEvaluationRequest = DeepReadonly<z.infer<typeof policyEvaluationRequestSchema>>
export type ReasonDefinition = DeepReadonly<z.infer<typeof reasonDefinitionSchema>>
export type ProvenanceDefinition = DeepReadonly<z.infer<typeof provenanceDefinitionSchema>>
export type QuestionManifest = DeepReadonly<z.infer<typeof questionManifestSchema>>
export type DocumentManifest = DeepReadonly<z.infer<typeof documentManifestSchema>>
export type SyntheticFee = DeepReadonly<z.infer<typeof syntheticFeeSchema>>
export type PolicyRule = DeepReadonly<z.infer<typeof policyRuleSchema>>
export type PolicyBundle = DeepReadonly<z.infer<typeof policyBundleSchema>>

export function deepFreeze<Value>(value: Value): Value {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const nestedValue of Object.values(value)) {
      deepFreeze(nestedValue)
    }
    Object.freeze(value)
  }

  return value
}

export function parsePolicyBundle(input: unknown): PolicyBundle {
  return deepFreeze(policyBundleSchema.parse(input))
}

export function parseScenarioFacts(input: unknown): PolicyFacts {
  return deepFreeze(policyFactsSchema.parse(input))
}
