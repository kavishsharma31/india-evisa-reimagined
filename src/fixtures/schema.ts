import { z } from 'zod'

import {
  APPLICATION_STATES,
  DOCUMENT_VERSION_STATES,
  ETA_STATES,
  PAYMENT_STATES,
  SCRUTINY_STATES,
  transitionApplicationState,
  transitionDocumentVersionState,
  transitionEtaState,
  transitionPaymentState,
  transitionScrutinyState,
} from '../domain'
import {
  provenanceIdSchema,
  syntheticIdSchema,
  syntheticTimestampSchema,
} from '../domain/ids'
import type { DocumentInspectionScenario } from '../mocks'
import { ACTIVE_POLICY_QUALIFIED_VERSION, activePolicyBundle } from '../policy'
import { deepFreeze, type DeepReadonly } from '../policy/schema'
import {
  APPLICATION_STEP_IDS,
  P0_FIXTURE_VERSION,
  P0_STORAGE_SCHEMA_VERSION,
  PERSISTED_SCENARIO_IDS,
  persistenceEnvelopeSchema,
} from '../persistence'

export const P0_FIXTURE_MANIFEST_VERSION = 'SYN-P0-FIXTURES@1.0.0' as const
export const FIXTURE_MANIFEST_TIMESTAMP = '2099-03-01T09:00:00Z' as const
export const SYNTHETIC_FIXTURE_WATERMARK = 'SYNTHETIC — NOT VALID' as const

export const CANONICAL_CASE_IDS = Object.freeze([
  'SYN-CASE-MED-001',
  'SYN-CASE-TOURIST-001',
] as const)

export const CANONICAL_APPLICANT_IDS = Object.freeze([
  'SYN-APPLICANT-MED-001',
  'SYN-APPLICANT-TOURIST-001',
] as const)

export const DOCUMENT_FIXTURE_IDS = Object.freeze([
  'SYN-FIXTURE-PORTRAIT-VALID-001',
  'SYN-FIXTURE-PASSPORT-VALID-001',
  'SYN-FIXTURE-PASSPORT-UNCLEAR-001',
  'SYN-FIXTURE-HOSPITAL-LETTER-V1-001',
  'SYN-FIXTURE-HOSPITAL-LETTER-V2-001',
] as const)

export const RECOVERY_SEED_IDS = Object.freeze([
  'SEED-MEDICAL-START',
  'SEED-TOURIST-START',
  'SEED-MEDICAL-INTERRUPTED-DRAFT',
  'SEED-MEDICAL-DOCUMENT-DEFECT',
  'SEED-MEDICAL-AMBIGUOUS-PAYMENT',
  'SEED-MEDICAL-REUPLOAD-REQUESTED',
  'SEED-MEDICAL-STATUS-RECOVERY',
] as const)

const DOCUMENT_INSPECTION_SCENARIO_IDS = [
  'DOCUMENT_PASS',
  'DOCUMENT_TECHNICAL_DEFECT',
] as const satisfies readonly DocumentInspectionScenario[]

const documentRequirementIdSchema = z.enum([
  'REQ-PORTRAIT-1',
  'REQ-PASSPORT-PAGE-1',
  'REQ-HOSPITAL-LETTER-1',
])

const fixtureCategorySchema = z.enum([
  'SYNTHETIC_PORTRAIT_FIXTURE',
  'SYNTHETIC_PASSPORT_PAGE_FIXTURE',
  'SYNTHETIC_HOSPITAL_LETTER_FIXTURE',
])

const fixtureTimestampSchema = syntheticTimestampSchema.refine(
  (timestamp) => /^2099-03-01T09:[0-5]\d:00Z$/.test(timestamp),
  { message: 'Fixture timestamps must use the controlled 2099-03-01 09:xx clock.' },
)

const applicationStateSchema = z.enum(APPLICATION_STATES)
const documentVersionStateSchema = z.enum(DOCUMENT_VERSION_STATES)
const paymentStateSchema = z.enum(PAYMENT_STATES)
const scrutinyStateSchema = z.enum(SCRUTINY_STATES)
const etaStateSchema = z.enum(ETA_STATES)

export const syntheticApplicantFixtureSchema = z
  .object({
    applicantId: z.enum(CANONICAL_APPLICANT_IDS),
    displayName: z.string().regex(/^(?:Demo|Synthetic|Example) [A-Za-z ]+$/),
    contactEmail: z.literal('demo-applicant@example.com'),
    syntheticIdentityReference: syntheticIdSchema,
    syntheticOnly: z.literal(true),
    provenanceNote: z.literal('Project-created synthetic applicant metadata; no real person.'),
  })
  .strict()

export const documentFixtureSchema = z
  .object({
    fixtureId: z.enum(DOCUMENT_FIXTURE_IDS),
    documentType: z.enum([
      'SYNTHETIC_PORTRAIT',
      'SYNTHETIC_PASSPORT_PAGE',
      'SYNTHETIC_HOSPITAL_LETTER',
    ]),
    requirementId: documentRequirementIdSchema,
    fixtureCategory: fixtureCategorySchema,
    label: z.string().min(1).max(80),
    syntheticOnly: z.literal(true),
    watermark: z.literal(SYNTHETIC_FIXTURE_WATERMARK),
    expectedInspectionScenario: z.enum(DOCUMENT_INSPECTION_SCENARIO_IDS),
    expectedInspectionReasonCode: z.enum([
      'MOCK_DOCUMENT_PREFLIGHT_PASSED',
      'DOC_PREFLIGHT_UNCLEAR_SYNTHETIC',
    ]),
    scrutinyOutcomeCode: z
      .literal('DOC_HOSPITAL_ADMISSION_DATE_UNCLEAR_SYNTHETIC')
      .optional(),
    fixtureVersion: z.string().regex(/^1\.\d+\.\d+$/),
    replacesFixtureId: z.enum(DOCUMENT_FIXTURE_IDS).optional(),
    integrityHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    integrityScope: z.literal('FIXTURE_ID_AND_VERSION'),
    sourceLicense: z.literal('PROJECT_CREATED_NO_EXTERNAL_SOURCE'),
    reviewStatus: z.literal('APPROVED_FOR_SYNTHETIC_P0'),
    responsibleRole: z.literal('PROJECT_FIXTURE_MAINTAINER'),
    provenanceNote: z.literal(
      'Project-created synthetic metadata fixture; no document body or real source material.',
    ),
  })
  .strict()

export const scenarioRootSchema = z
  .object({
    scenarioId: z.enum(PERSISTED_SCENARIO_IDS),
    caseId: z.enum(CANONICAL_CASE_IDS),
    applicantId: z.enum(CANONICAL_APPLICANT_IDS),
    orientation: z.enum(['PRIMARY', 'SHARED_CONTRACT_VALIDATION']),
    policyQualifiedVersion: z.literal(ACTIVE_POLICY_QUALIFIED_VERSION),
    questionManifestId: z.enum(['QM-MEDICAL-1', 'QM-TOURIST-1']),
    documentManifestId: z.enum(['DM-MEDICAL-1', 'DM-TOURIST-1']),
    purposeFamily: z.enum([
      'SYNTHETIC_MEDICAL_PURPOSE',
      'SYNTHETIC_TOURIST_PURPOSE',
    ]),
    syntheticFee: z
      .object({
        amount: z.union([z.literal(41), z.literal(73)]),
        unit: z.literal('SYNTHETIC_DEMO_CREDITS'),
      })
      .strict(),
  })
  .strict()

export const seedExpectedDocumentSchema = z
  .object({
    fixtureId: z.enum(DOCUMENT_FIXTURE_IDS),
    activeVersionState: z.enum(DOCUMENT_VERSION_STATES),
  })
  .strict()

export const recoverySeedSchema = z
  .object({
    seedId: z.enum(RECOVERY_SEED_IDS),
    label: z.string().min(1).max(100),
    seedKind: z.enum(['SCENARIO_ROOT', 'RECOVERY']),
    scenarioId: z.enum(PERSISTED_SCENARIO_IDS),
    caseId: z.enum(CANONICAL_CASE_IDS),
    recoveryOracle: z.enum([
      'BEGIN_FRESH_CASE',
      'RESUME_SAME_DRAFT',
      'SELECT_CORRECTED_BUNDLED_FIXTURE',
      'CHECK_MOCK_PAYMENT_STATUS',
      'SUBMIT_CORRECTED_HOSPITAL_LETTER',
      'WAIT_FOR_SYNTHETIC_SCRUTINY',
    ]),
    expectedState: z
      .object({
        application: z.enum(APPLICATION_STATES),
        documents: z.array(seedExpectedDocumentSchema).max(3),
        payment: z.enum(PAYMENT_STATES),
        scrutiny: z.enum(SCRUTINY_STATES),
        eta: z.enum(ETA_STATES),
        currentStep: z.enum(APPLICATION_STEP_IDS).nullable(),
        outcomeCode: z
          .enum([
            'DOC_PREFLIGHT_UNCLEAR_SYNTHETIC',
            'DOC_HOSPITAL_ADMISSION_DATE_UNCLEAR_SYNTHETIC',
          ])
          .nullable(),
      })
      .strict(),
    envelope: persistenceEnvelopeSchema,
  })
  .strict()

function addIssue(
  context: z.RefinementCtx,
  path: PropertyKey[],
  message: string,
): void {
  context.addIssue({ code: 'custom', path, message })
}

function hasUniqueValues(values: readonly string[]): boolean {
  return new Set(values).size === values.length
}

function sameMembers(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && expected.every((value) => actual.includes(value))
}

function isLegalSeedTransition(
  domain: 'APPLICATION' | 'DOCUMENT' | 'PAYMENT' | 'SCRUTINY' | 'ETA',
  previousState: string,
  newState: string,
): boolean {
  if (domain === 'APPLICATION') {
    const previous = applicationStateSchema.safeParse(previousState)
    const next = applicationStateSchema.safeParse(newState)
    return previous.success && next.success && transitionApplicationState(previous.data, next.data).accepted
  }
  if (domain === 'DOCUMENT') {
    const previous = documentVersionStateSchema.safeParse(previousState)
    const next = documentVersionStateSchema.safeParse(newState)
    return previous.success && next.success && transitionDocumentVersionState(previous.data, next.data).accepted
  }
  if (domain === 'PAYMENT') {
    const previous = paymentStateSchema.safeParse(previousState)
    const next = paymentStateSchema.safeParse(newState)
    return previous.success && next.success && transitionPaymentState(previous.data, next.data).accepted
  }
  if (domain === 'SCRUTINY') {
    const previous = scrutinyStateSchema.safeParse(previousState)
    const next = scrutinyStateSchema.safeParse(newState)
    return previous.success && next.success && transitionScrutinyState(previous.data, next.data).accepted
  }

  const previous = etaStateSchema.safeParse(previousState)
  const next = etaStateSchema.safeParse(newState)
  return previous.success && next.success && transitionEtaState(previous.data, next.data).accepted
}

function validateSeedConsistency(
  seed: z.infer<typeof recoverySeedSchema>,
  documentIds: ReadonlySet<string>,
  context: z.RefinementCtx,
  seedIndex: number,
): void {
  const seedPath = ['seeds', seedIndex]
  const activeCase = seed.envelope.cases.find(({ caseId }) => caseId === seed.caseId)

  if (seed.envelope.activeCaseId !== seed.caseId || activeCase === undefined) {
    addIssue(context, seedPath, 'Seed active case must reference its canonical stored case.')
    return
  }
  if (seed.envelope.cases.length !== 1) {
    addIssue(context, [...seedPath, 'envelope', 'cases'], 'Each seed must contain one case.')
  }
  if (activeCase.scenarioId !== seed.scenarioId) {
    addIssue(context, seedPath, 'Seed scenario must match its persisted case.')
  }
  if (activeCase.policyPin.qualifiedVersion !== ACTIVE_POLICY_QUALIFIED_VERSION) {
    addIssue(context, seedPath, 'Seed case must retain the active P0 policy pin.')
  }
  if (
    activeCase.application.state !== seed.expectedState.application ||
    activeCase.payment.state !== seed.expectedState.payment ||
    activeCase.scrutiny.state !== seed.expectedState.scrutiny ||
    activeCase.eta.state !== seed.expectedState.eta
  ) {
    addIssue(context, [...seedPath, 'expectedState'], 'Expected aggregate states must match the case.')
  }

  const latestStep = activeCase.application.draftSnapshots.at(-1)?.currentStep ?? null
  if (latestStep !== seed.expectedState.currentStep) {
    addIssue(context, [...seedPath, 'expectedState', 'currentStep'], 'Expected step must match the latest snapshot.')
  }

  const actualDocuments = activeCase.documents.map((document) => {
    const activeVersion = document.versions.find(
      ({ documentVersionId }) => documentVersionId === document.activeVersionId,
    )
    return `${document.documentAssetId}|${activeVersion?.state ?? 'NO_ACTIVE_VERSION'}`
  })
  const expectedDocuments = seed.expectedState.documents.map(
    ({ fixtureId, activeVersionState }) => `${fixtureId}|${activeVersionState}`,
  )
  if (!sameMembers(actualDocuments, expectedDocuments)) {
    addIssue(context, [...seedPath, 'expectedState', 'documents'], 'Expected document states must match the case.')
  }

  for (const [documentIndex, document] of activeCase.documents.entries()) {
    if (!documentIds.has(document.documentAssetId)) {
      addIssue(
        context,
        [...seedPath, 'envelope', 'cases', 0, 'documents', documentIndex, 'documentAssetId'],
        'Persisted document must reference a known fixture.',
      )
    }
  }

  if (
    seed.expectedState.outcomeCode !== null &&
    !activeCase.auditEvents.some(
      (event) => event.payload.outcomeCode === seed.expectedState.outcomeCode,
    )
  ) {
    addIssue(context, [...seedPath, 'expectedState', 'outcomeCode'], 'Expected outcome evidence is missing.')
  }

  for (const [eventIndex, event] of activeCase.auditEvents.entries()) {
    if (
      event.previousState !== undefined &&
      event.newState !== undefined &&
      !isLegalSeedTransition(event.domain, event.previousState, event.newState)
    ) {
      addIssue(
        context,
        [...seedPath, 'envelope', 'cases', 0, 'auditEvents', eventIndex],
        'Seed audit evidence contains an illegal lifecycle transition.',
      )
    }
  }

  const controlledTimestamps = [
    seed.envelope.lastUpdatedAt,
    activeCase.createdAt,
    activeCase.updatedAt,
    ...activeCase.application.draftSnapshots.map(({ savedAt }) => savedAt),
    ...activeCase.auditEvents.map(({ syntheticTimestamp }) => syntheticTimestamp),
  ]
  if (!controlledTimestamps.every((timestamp) => fixtureTimestampSchema.safeParse(timestamp).success)) {
    addIssue(context, [...seedPath, 'envelope'], 'Seed timestamps must use the controlled fixture clock.')
  }
}

export const fixtureManifestSchema = z
  .object({
    version: z.literal(P0_FIXTURE_MANIFEST_VERSION),
    generatedAt: z.literal(FIXTURE_MANIFEST_TIMESTAMP),
    storageSchemaVersion: z.literal(P0_STORAGE_SCHEMA_VERSION),
    persistenceFixtureVersion: z.literal(P0_FIXTURE_VERSION),
    activePolicy: z
      .object({
        qualifiedVersion: z.literal(ACTIVE_POLICY_QUALIFIED_VERSION),
        digest: z.literal(activePolicyBundle.digest),
      })
      .strict(),
    provenance: z
      .object({
        provenanceId: provenanceIdSchema,
        syntheticOnly: z.literal(true),
        sourceMethod: z.literal('PROJECT_CREATED_SYNTHETIC'),
        note: z.literal('Canonical P0 demo worlds; never production or applicant data.'),
      })
      .strict(),
    scenarioRoots: z.array(scenarioRootSchema).length(2),
    applicants: z.array(syntheticApplicantFixtureSchema).length(2),
    documents: z.array(documentFixtureSchema).length(DOCUMENT_FIXTURE_IDS.length),
    seeds: z.array(recoverySeedSchema).length(RECOVERY_SEED_IDS.length),
  })
  .strict()
  .superRefine((manifest, context) => {
    const scenarioIds = manifest.scenarioRoots.map(({ scenarioId }) => scenarioId)
    const caseIds = manifest.scenarioRoots.map(({ caseId }) => caseId)
    const applicantIds = manifest.applicants.map(({ applicantId }) => applicantId)
    const documentIds = manifest.documents.map(({ fixtureId }) => fixtureId)
    const seedIds = manifest.seeds.map(({ seedId }) => seedId)

    for (const [path, values] of [
      ['scenarioRoots', scenarioIds],
      ['scenarioRoots', caseIds],
      ['applicants', applicantIds],
      ['documents', documentIds],
      ['seeds', seedIds],
    ] as const) {
      if (!hasUniqueValues(values)) {
        addIssue(context, [path], 'Canonical fixture identifiers must be unique.')
      }
    }

    if (!sameMembers(scenarioIds, PERSISTED_SCENARIO_IDS)) {
      addIssue(context, ['scenarioRoots'], 'Manifest must contain exactly Medical and Tourist.')
    }
    if (!sameMembers(caseIds, CANONICAL_CASE_IDS)) {
      addIssue(context, ['scenarioRoots'], 'Manifest case IDs must match the canonical catalogue.')
    }
    if (!sameMembers(applicantIds, CANONICAL_APPLICANT_IDS)) {
      addIssue(context, ['applicants'], 'Manifest applicant IDs must match the canonical catalogue.')
    }
    if (!sameMembers(documentIds, DOCUMENT_FIXTURE_IDS)) {
      addIssue(context, ['documents'], 'Manifest document IDs must match the canonical catalogue.')
    }
    if (!sameMembers(seedIds, RECOVERY_SEED_IDS)) {
      addIssue(context, ['seeds'], 'Manifest must contain exactly the seven D01 seeds.')
    }

    const medicalRoot = manifest.scenarioRoots.find(({ scenarioId }) => scenarioId === 'SYN-MEDICAL-001')
    const touristRoot = manifest.scenarioRoots.find(({ scenarioId }) => scenarioId === 'SYN-TOURIST-001')
    if (medicalRoot?.orientation !== 'PRIMARY' || medicalRoot.syntheticFee.amount !== 73) {
      addIssue(context, ['scenarioRoots'], 'Medical must remain the 73-credit primary scenario.')
    }
    if (
      touristRoot?.orientation !== 'SHARED_CONTRACT_VALIDATION' ||
      touristRoot.syntheticFee.amount !== 41
    ) {
      addIssue(context, ['scenarioRoots'], 'Tourist must remain shared-contract validation.')
    }

    const documentIdSet = new Set(documentIds)
    for (const [documentIndex, document] of manifest.documents.entries()) {
      if (document.replacesFixtureId !== undefined && !documentIdSet.has(document.replacesFixtureId)) {
        addIssue(context, ['documents', documentIndex, 'replacesFixtureId'], 'Replacement fixture must exist.')
      }
    }

    manifest.seeds.forEach((seed, index) =>
      validateSeedConsistency(seed, documentIdSet, context, index),
    )
  })

export type SyntheticApplicantFixture = DeepReadonly<
  z.infer<typeof syntheticApplicantFixtureSchema>
>
export type DocumentFixture = DeepReadonly<z.infer<typeof documentFixtureSchema>>
export type ScenarioRoot = DeepReadonly<z.infer<typeof scenarioRootSchema>>
export type RecoverySeed = DeepReadonly<z.infer<typeof recoverySeedSchema>>
export type RecoverySeedId = (typeof RECOVERY_SEED_IDS)[number]
export type FixtureManifest = DeepReadonly<z.infer<typeof fixtureManifestSchema>>

export type FixtureManifestValidation =
  | Readonly<{ status: 'VALID'; manifest: FixtureManifest }>
  | Readonly<{ status: 'INVALID'; issueCount: number; issueCodes: readonly string[] }>

export function parseFixtureManifest(input: unknown): FixtureManifest {
  return deepFreeze(fixtureManifestSchema.parse(input))
}

export function validateFixtureManifest(input: unknown): FixtureManifestValidation {
  const result = fixtureManifestSchema.safeParse(input)
  if (!result.success) {
    return Object.freeze({
      status: 'INVALID',
      issueCount: result.error.issues.length,
      issueCodes: Object.freeze([...new Set(result.error.issues.map(({ code }) => code))]),
    })
  }

  return Object.freeze({ status: 'VALID', manifest: deepFreeze(result.data) })
}
