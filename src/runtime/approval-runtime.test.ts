import { describe, expect, it } from 'vitest'

import {
  MEDICAL_CONTROLLED_ANSWERS,
  TOURIST_CONTROLLED_ANSWERS,
} from '../fixtures'
import { createLocalMockAdapters } from '../mocks'
import {
  P0_STORAGE_KEY,
  createPersistenceStore,
  type PersistedCase,
  type PersistenceService,
  type StoragePort,
} from '../persistence'
import {
  applySyntheticEtaIssuance,
  applySyntheticReviewCompletion,
  syntheticReviewCompletionIdempotencyKey,
} from './approval-runtime'
import {
  createDemoRuntime,
  createDeterministicRuntimeMetadata,
  type DemoRuntime,
} from './index'

class MemoryStorage implements StoragePort {
  readonly #values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value)
  }

  removeItem(key: string): void {
    this.#values.delete(key)
  }

  rawProjectState(): string | null {
    return this.#values.get(P0_STORAGE_KEY) ?? null
  }
}

function createRuntime(storage: MemoryStorage): DemoRuntime {
  return createDemoRuntime({
    store: createPersistenceStore(storage),
    adapters: createLocalMockAdapters(),
    metadata: createDeterministicRuntimeMetadata(),
  })
}

function requireCase(store: PersistenceService): PersistedCase {
  const loaded = store.load()
  if (loaded.status !== 'VALID_STATE' || loaded.state.cases[0] === undefined) {
    throw new Error('Expected one valid persisted synthetic Case.')
  }
  return loaded.state.cases[0]
}

function prepareInReview(
  runtime: DemoRuntime,
  scenarioId: 'SYN-MEDICAL-001' | 'SYN-TOURIST-001',
) {
  const medical = scenarioId === 'SYN-MEDICAL-001'
  const caseId = medical ? 'SYN-CASE-MED-001' : 'SYN-CASE-TOURIST-001'
  const suffix = medical ? 'MED' : 'TOURIST'
  const answers = medical ? MEDICAL_CONTROLLED_ANSWERS : TOURIST_CONTROLLED_ANSWERS
  expect(runtime.createCase({ scenarioId, idempotencyKey: `SYN-A09-CREATE-${suffix}` }).status)
    .toBe('COMMAND_ACCEPTED')
  expect(runtime.beginDraft({ caseId, idempotencyKey: `SYN-A09-BEGIN-${suffix}` }).status)
    .toBe('COMMAND_ACCEPTED')
  expect(runtime.saveDraftSnapshot({
    caseId,
    idempotencyKey: `SYN-A09-DOCUMENTS-${suffix}`,
    currentStep: 'DOCUMENTS',
    answers,
  }).status).toBe('COMMAND_ACCEPTED')
  const fixtures = [
    ['REQ-PORTRAIT-1', 'SYN-FIXTURE-PORTRAIT-VALID-001'],
    ['REQ-PASSPORT-PAGE-1', 'SYN-FIXTURE-PASSPORT-VALID-001'],
    ...(medical
      ? [['REQ-HOSPITAL-LETTER-1', 'SYN-FIXTURE-HOSPITAL-LETTER-V1-001']]
      : []),
  ] as const
  for (const [requirementId, fixtureId] of fixtures) {
    expect(runtime.prepareDocumentFixture({
      caseId,
      requirementId,
      fixtureId,
      idempotencyKey: `SYN-A09-DOCUMENT-${suffix}-${requirementId}`,
    }).status).toBe('DOCUMENT_PREPARED')
  }
  expect(runtime.prepareReview({ caseId, idempotencyKey: `SYN-A09-REVIEW-${suffix}` }).status)
    .toBe('REVIEW_PREPARED')
  expect(runtime.submitApplication({ caseId, idempotencyKey: `SYN-A09-SUBMIT-${suffix}` }).status)
    .toBe('APPLICATION_SUBMITTED')
  expect(runtime.startMockPayment({ caseId }).status).toBe('PAYMENT_RECONCILIATION_REQUIRED')
  expect(runtime.checkMockPaymentStatus({ caseId }).status).toBe('PAYMENT_CONFIRMED')
  expect(runtime.beginScrutiny({ caseId }).status).toBe('SCRUTINY_STARTED')
  return caseId
}

function submitMedicalCorrection(runtime: DemoRuntime, caseId: `SYN-${string}`): void {
  expect(runtime.requestMedicalCorrection({ caseId }).status).toBe('CORRECTION_REQUESTED')
  expect(runtime.prepareCorrection({
    caseId,
    fixtureId: 'SYN-FIXTURE-HOSPITAL-LETTER-V2-001',
  }).status).toBe('CORRECTION_REPLACEMENT_READY')
  expect(runtime.submitCorrection({ caseId }).status).toBe('CORRECTION_SUBMITTED')
}

function currentVersionStates(persistedCase: PersistedCase): readonly string[] {
  return persistedCase.documents.map((document) =>
    document.versions.find(
      ({ documentVersionId }) => documentVersionId === document.activeVersionId,
    )?.state ?? 'MISSING',
  )
}

describe('runtime A09 synthetic approval and ETA issuance', () => {
  it('legally completes corrected Medical review, accepts current documents, and issues one ETA', () => {
    const storage = new MemoryStorage()
    const store = createPersistenceStore(storage)
    const runtime = createRuntime(storage)
    const caseId = prepareInReview(runtime, 'SYN-MEDICAL-001')
    submitMedicalCorrection(runtime, caseId)

    const result = runtime.completeSyntheticReview({ caseId })

    expect(result).toMatchObject({
      status: 'SYNTHETIC_REVIEW_COMPLETED',
      scrutinyState: 'APPROVED',
      etaState: 'ISSUED',
      emittedEventTypes: [
        'DocumentAccepted',
        'DocumentAccepted',
        'DocumentAccepted',
        'SyntheticScrutinyApproved',
        'SyntheticETAReadyToIssue',
        'SyntheticETAIssued',
      ],
    })
    const persistedCase = requireCase(store)
    expect(currentVersionStates(persistedCase)).toEqual(['ACCEPTED', 'ACCEPTED', 'ACCEPTED'])
    expect(persistedCase.scrutiny.state).toBe('APPROVED')
    expect(persistedCase.eta.state).toBe('ISSUED')
    expect(result.status === 'SYNTHETIC_REVIEW_COMPLETED'
      ? result.syntheticEtaReference
      : null).toBe(persistedCase.eta.syntheticEtaId)
  })

  it('preserves Medical V1 as SUPERSEDED while V2 remains current and becomes ACCEPTED', () => {
    const storage = new MemoryStorage()
    const store = createPersistenceStore(storage)
    const runtime = createRuntime(storage)
    const caseId = prepareInReview(runtime, 'SYN-MEDICAL-001')
    submitMedicalCorrection(runtime, caseId)

    runtime.completeSyntheticReview({ caseId })

    const hospital = requireCase(store).documents.find(
      ({ requirementId }) => requirementId === 'REQ-HOSPITAL-LETTER-1',
    )
    expect(hospital?.versions.map(({ state }) => state)).toEqual(['SUPERSEDED', 'ACCEPTED'])
    expect(hospital?.activeVersionId).toBe(hospital?.versions[1]?.documentVersionId)
    expect(hospital?.versions[1]?.documentVersionId).toContain('HOSPITAL-LETTER-V2-001')
  })

  it('rejects ETA issuance before scrutiny approval without changing the input Case', () => {
    const storage = new MemoryStorage()
    const store = createPersistenceStore(storage)
    const runtime = createRuntime(storage)
    const caseId = prepareInReview(runtime, 'SYN-TOURIST-001')
    const persistedCase = requireCase(store)

    expect(applySyntheticEtaIssuance({
      persistedCase,
      requiredRequirementIds: ['REQ-PORTRAIT-1', 'REQ-PASSPORT-PAGE-1'],
      idempotencyKey: 'SYN-A09-PREMATURE-ETA',
      metadata: createDeterministicRuntimeMetadata(),
    })).toEqual({ accepted: false, reasonCode: 'GUARD_FAILED' })
    expect(requireCase(store)).toEqual(persistedCase)
    expect(persistedCase.scrutiny.state).toBe('IN_REVIEW')
    expect(persistedCase.eta.state).toBe('NOT_READY')
    expect(caseId).toBe(persistedCase.caseId)
  })

  it('fails closed when any application, payment, scrutiny, document, ETA, or policy guard is missing', () => {
    const storage = new MemoryStorage()
    const store = createPersistenceStore(storage)
    const runtime = createRuntime(storage)
    const caseId = prepareInReview(runtime, 'SYN-TOURIST-001')
    const persistedCase = requireCase(store)
    const requiredRequirementIds = ['REQ-PORTRAIT-1', 'REQ-PASSPORT-PAGE-1']
    const candidates = [
      { ...persistedCase, application: { ...persistedCase.application, state: 'SUBMITTED' } },
      { ...persistedCase, payment: { ...persistedCase.payment, state: 'PENDING' } },
      { ...persistedCase, scrutiny: { ...persistedCase.scrutiny, state: 'ACTION_REQUIRED' } },
      {
        ...persistedCase,
        documents: persistedCase.documents.map((document, index) =>
          index === 0
            ? {
                ...document,
                versions: document.versions.map((version) => ({ ...version, state: 'SUBMITTED' })),
              }
            : document,
        ),
      },
      { ...persistedCase, eta: { ...persistedCase.eta, state: 'READY_TO_ISSUE' } },
      {
        ...persistedCase,
        policyPin: { ...persistedCase.policyPin, qualifiedVersion: 'SYN-EVISA-POLICY@9.9.9' },
      },
    ] as unknown as readonly PersistedCase[]

    for (const candidate of candidates) {
      expect(applySyntheticReviewCompletion({
        persistedCase: candidate,
        requiredRequirementIds,
        idempotencyKey: syntheticReviewCompletionIdempotencyKey(caseId),
        metadata: createDeterministicRuntimeMetadata(),
      })).toEqual({ accepted: false, reasonCode: 'GUARD_FAILED' })
    }
    expect(requireCase(store)).toEqual(persistedCase)
  })

  it('does not let uncorrected Medical V1 bypass the approved A08 correction path', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const caseId = prepareInReview(runtime, 'SYN-MEDICAL-001')
    const before = storage.rawProjectState()

    expect(runtime.completeSyntheticReview({ caseId })).toMatchObject({
      status: 'COMMAND_REJECTED',
      reasonCode: 'APPROVAL_PREREQUISITES_NOT_MET',
    })
    expect(storage.rawProjectState()).toBe(before)
  })

  it('keeps duplicate completion and reload inspection byte-stable with one stable ETA reference', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const caseId = prepareInReview(runtime, 'SYN-TOURIST-001')
    const completed = runtime.completeSyntheticReview({ caseId })
    if (completed.status !== 'SYNTHETIC_REVIEW_COMPLETED') {
      throw new Error('Expected Tourist review completion.')
    }
    const issuedBytes = storage.rawProjectState()

    expect(runtime.completeSyntheticReview({ caseId })).toMatchObject({
      status: 'SYNTHETIC_REVIEW_EXISTING',
      idempotentReplay: true,
      syntheticEtaReference: completed.syntheticEtaReference,
    })
    expect(createRuntime(storage).inspectStatus({ caseId })).toMatchObject({
      status: 'STATUS_INSPECTED',
      syntheticEtaReference: completed.syntheticEtaReference,
    })
    expect(storage.rawProjectState()).toBe(issuedBytes)
    const persistedCase = createPersistenceStore(storage).load()
    if (persistedCase.status !== 'VALID_STATE' || persistedCase.state.cases[0] === undefined) {
      throw new Error('Expected persisted Tourist ETA evidence.')
    }
    const eventTypes = persistedCase.state.cases[0].auditEvents.map(({ eventType }) => eventType)
    expect(eventTypes.filter((type) => type === 'SyntheticScrutinyApproved')).toHaveLength(1)
    expect(eventTypes.filter((type) => type === 'SyntheticETAReadyToIssue')).toHaveLength(1)
    expect(eventTypes.filter((type) => type === 'SyntheticETAIssued')).toHaveLength(1)
  })

  it('reuses the same approval and ETA runtime for Tourist with two accepted documents', () => {
    const storage = new MemoryStorage()
    const store = createPersistenceStore(storage)
    const runtime = createRuntime(storage)
    const caseId = prepareInReview(runtime, 'SYN-TOURIST-001')

    const result = runtime.completeSyntheticReview({ caseId })

    expect(result).toMatchObject({
      status: 'SYNTHETIC_REVIEW_COMPLETED',
      scrutinyState: 'APPROVED',
      etaState: 'ISSUED',
      emittedEventTypes: [
        'DocumentAccepted',
        'DocumentAccepted',
        'SyntheticScrutinyApproved',
        'SyntheticETAReadyToIssue',
        'SyntheticETAIssued',
      ],
    })
    expect(currentVersionStates(requireCase(store))).toEqual(['ACCEPTED', 'ACCEPTED'])
  })

  it('projects the issued outcome without action-required or under-review language', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const caseId = prepareInReview(runtime, 'SYN-TOURIST-001')
    runtime.completeSyntheticReview({ caseId })

    expect(runtime.inspectStatus({ caseId })).toMatchObject({
      status: 'STATUS_INSPECTED',
      headline: 'Application approved',
      explanation:
        'Your application has been approved and your Electronic Travel Authorization is available.',
      applicantActionRequired: false,
      nextAction: null,
      demoReviewAction: null,
      scrutinyState: 'APPROVED',
      etaState: 'ISSUED',
    })
  })
})
