import { describe, expect, it } from 'vitest'

import {
  MEDICAL_CONTROLLED_ANSWERS,
  TOURIST_CONTROLLED_ANSWERS,
  getSeed,
} from '../fixtures'
import { createLocalMockAdapters } from '../mocks'
import {
  P0_STORAGE_KEY,
  createPersistenceStore,
  type PersistenceService,
  type StoragePort,
} from '../persistence'
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

function requireCase(store: PersistenceService) {
  const loaded = store.load()
  if (loaded.status !== 'VALID_STATE' || loaded.state.cases[0] === undefined) {
    throw new Error('Expected one valid persisted synthetic Case.')
  }
  return loaded.state.cases[0]
}

function prepareInReview(
  runtime: DemoRuntime,
  scenarioId: 'SYN-MEDICAL-001' | 'SYN-TOURIST-001' = 'SYN-MEDICAL-001',
) {
  const medical = scenarioId === 'SYN-MEDICAL-001'
  const caseId = medical ? 'SYN-CASE-MED-001' : 'SYN-CASE-TOURIST-001'
  const suffix = medical ? 'MED' : 'TOURIST'
  const answers = medical ? MEDICAL_CONTROLLED_ANSWERS : TOURIST_CONTROLLED_ANSWERS
  expect(runtime.createCase({ scenarioId, idempotencyKey: `SYN-A08-CREATE-${suffix}` }).status).toBe('COMMAND_ACCEPTED')
  expect(runtime.beginDraft({ caseId, idempotencyKey: `SYN-A08-BEGIN-${suffix}` }).status).toBe('COMMAND_ACCEPTED')
  expect(runtime.saveDraftSnapshot({
    caseId,
    idempotencyKey: `SYN-A08-DOCUMENTS-${suffix}`,
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
      idempotencyKey: `SYN-A08-DOCUMENT-${suffix}-${requirementId}`,
    }).status).toBe('DOCUMENT_PREPARED')
  }
  expect(runtime.prepareReview({ caseId, idempotencyKey: `SYN-A08-REVIEW-${suffix}` }).status).toBe('REVIEW_PREPARED')
  expect(runtime.submitApplication({ caseId, idempotencyKey: `SYN-A08-SUBMIT-${suffix}` }).status).toBe('APPLICATION_SUBMITTED')
  expect(runtime.startMockPayment({ caseId }).status).toBe('PAYMENT_RECONCILIATION_REQUIRED')
  expect(runtime.checkMockPaymentStatus({ caseId }).status).toBe('PAYMENT_CONFIRMED')
  expect(runtime.beginScrutiny({ caseId }).status).toBe('SCRUTINY_STARTED')
  return caseId
}

describe('runtime A08 Medical correction and resubmission', () => {
  it('records the exact Medical correction through legal scrutiny and document transitions', () => {
    const storage = new MemoryStorage()
    const store = createPersistenceStore(storage)
    const runtime = createRuntime(storage)
    const caseId = prepareInReview(runtime)
    const beforeRevision = requireCase(store).revision

    const result = runtime.requestMedicalCorrection({ caseId })
    expect(result).toMatchObject({
      status: 'CORRECTION_REQUESTED',
      scrutinyState: 'ACTION_REQUIRED',
      documentState: 'REUPLOAD_REQUESTED',
      reasonCode: 'DOC_HOSPITAL_ADMISSION_DATE_UNCLEAR_SYNTHETIC',
      emittedEventTypes: ['ScrutinyActionRequired', 'DocumentReuploadRequested'],
      notificationEvidence: [
        { outcome: 'QUEUED', persisted: false },
        { outcome: 'DELIVERY_SIMULATION_FAILED', persisted: false },
        { outcome: 'RETRY_QUEUED', persisted: false },
        { outcome: 'RETRY_DELIVERED_SIMULATED', persisted: false },
      ],
    })
    const persistedCase = requireCase(store)
    expect(persistedCase.revision).toBe(beforeRevision + 2)
    expect(persistedCase.scrutiny.state).toBe('ACTION_REQUIRED')
    expect(persistedCase.documents.at(-1)?.versions.at(-1)?.state).toBe('REUPLOAD_REQUESTED')
    expect(persistedCase.auditEvents.at(-2)?.payload.outcomeCode).toBe(
      'DOC_HOSPITAL_ADMISSION_DATE_UNCLEAR_SYNTHETIC',
    )
    expect(persistedCase.auditEvents.at(-1)?.payload.outcomeCode).toBe(
      'DOC_HOSPITAL_ADMISSION_DATE_UNCLEAR_SYNTHETIC',
    )
  })

  it('projects both a live request and the canonical re-upload seed to one applicant action', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const caseId = prepareInReview(runtime)
    runtime.requestMedicalCorrection({ caseId })

    expect(runtime.inspectStatus({ caseId })).toMatchObject({
      status: 'STATUS_INSPECTED',
      headline: 'Action required',
      explanation: 'Your hospital letter needs one correction.',
      applicantActionRequired: true,
      nextAction: 'REPLACE_HOSPITAL_LETTER',
      actionGuidance:
        'The admission date on the hospital letter could not be confirmed during review.',
    })

    const seedStorage = new MemoryStorage()
    const seedStore = createPersistenceStore(seedStorage)
    expect(seedStore.save(getSeed('SEED-MEDICAL-REUPLOAD-REQUESTED').envelope).status).toBe('SAVED')
    expect(createRuntime(seedStorage).inspectStatus({ caseId: 'SYN-CASE-MED-001' })).toMatchObject({
      status: 'STATUS_INSPECTED',
      headline: 'Action required',
      applicantActionRequired: true,
      nextAction: 'REPLACE_HOSPITAL_LETTER',
    })
  })

  it('creates only hospital V2, passes technical preflight, and supersedes V1 without overwriting it', () => {
    const storage = new MemoryStorage()
    const store = createPersistenceStore(storage)
    const runtime = createRuntime(storage)
    const caseId = prepareInReview(runtime)
    runtime.requestMedicalCorrection({ caseId })

    const prepared = runtime.prepareCorrection({
      caseId,
      fixtureId: 'SYN-FIXTURE-HOSPITAL-LETTER-V2-001',
    })
    expect(prepared).toMatchObject({
      status: 'CORRECTION_REPLACEMENT_READY',
      scrutinyState: 'ACTION_REQUIRED',
      documentState: 'PREFLIGHT_PASSED',
      emittedEventTypes: [
        'DocumentVersionCreated',
        'DocumentPreflightPassed',
        'DocumentVersionSuperseded',
      ],
    })
    const hospital = requireCase(store).documents.find(
      ({ requirementId }) => requirementId === 'REQ-HOSPITAL-LETTER-1',
    )
    expect(hospital?.versions).toHaveLength(2)
    expect(hospital?.versions.map(({ state }) => state)).toEqual([
      'SUPERSEDED',
      'PREFLIGHT_PASSED',
    ])
    expect(runtime.inspectCorrection({ caseId })).toMatchObject({
      status: 'CORRECTION_INSPECTED',
      stage: 'REPLACEMENT_READY',
      replacementOption: { fixtureId: 'SYN-FIXTURE-HOSPITAL-LETTER-V2-001' },
    })
  })

  it('submits V2 and legally resumes scrutiny before returning to the no-action projection', () => {
    const storage = new MemoryStorage()
    const store = createPersistenceStore(storage)
    const runtime = createRuntime(storage)
    const caseId = prepareInReview(runtime)
    runtime.requestMedicalCorrection({ caseId })
    runtime.prepareCorrection({
      caseId,
      fixtureId: 'SYN-FIXTURE-HOSPITAL-LETTER-V2-001',
    })

    expect(runtime.submitCorrection({ caseId })).toMatchObject({
      status: 'CORRECTION_SUBMITTED',
      scrutinyState: 'IN_REVIEW',
      documentState: 'UNDER_REVIEW',
      emittedEventTypes: [
        'DocumentVersionSubmitted',
        'ScrutinyResubmitted',
        'ScrutinyResumed',
        'DocumentReviewStarted',
      ],
    })
    const persistedCase = requireCase(store)
    const hospital = persistedCase.documents.find(
      ({ requirementId }) => requirementId === 'REQ-HOSPITAL-LETTER-1',
    )
    expect(persistedCase.scrutiny.state).toBe('IN_REVIEW')
    expect(hospital?.versions.map(({ state }) => state)).toEqual(['SUPERSEDED', 'UNDER_REVIEW'])
    expect(persistedCase.scrutiny.submittedDocumentVersionIds).toContain(
      hospital?.activeVersionId,
    )
    expect(runtime.inspectStatus({ caseId })).toMatchObject({
      status: 'STATUS_INSPECTED',
      headline: 'Under review',
      applicantActionRequired: false,
      nextAction: null,
      demoReviewAction: 'COMPLETE_SYNTHETIC_REVIEW',
      waitMessage: 'We will update this page when the review is complete or if we need more information.',
    })
  })

  it('keeps repeated request, replacement, submission, and reload reads byte-stable', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const caseId = prepareInReview(runtime)
    runtime.requestMedicalCorrection({ caseId })
    const actionRequiredBytes = storage.rawProjectState()
    expect(runtime.requestMedicalCorrection({ caseId })).toMatchObject({
      status: 'CORRECTION_REQUEST_EXISTING',
      idempotentReplay: true,
    })
    expect(createRuntime(storage).inspectStatus({ caseId }).status).toBe('STATUS_INSPECTED')
    expect(storage.rawProjectState()).toBe(actionRequiredBytes)

    runtime.prepareCorrection({
      caseId,
      fixtureId: 'SYN-FIXTURE-HOSPITAL-LETTER-V2-001',
    })
    const readyBytes = storage.rawProjectState()
    expect(runtime.prepareCorrection({
      caseId,
      fixtureId: 'SYN-FIXTURE-HOSPITAL-LETTER-V2-001',
    })).toMatchObject({ status: 'CORRECTION_EXISTING', idempotentReplay: true })
    expect(createRuntime(storage).inspectCorrection({ caseId }).status).toBe('CORRECTION_INSPECTED')
    expect(storage.rawProjectState()).toBe(readyBytes)

    runtime.submitCorrection({ caseId })
    const resumedBytes = storage.rawProjectState()
    expect(runtime.submitCorrection({ caseId })).toMatchObject({
      status: 'CORRECTION_EXISTING',
      idempotentReplay: true,
    })
    expect(createRuntime(storage).inspectStatus({ caseId }).status).toBe('STATUS_INSPECTED')
    expect(storage.rawProjectState()).toBe(resumedBytes)
  })

  it('rejects V1 or unknown replacement input without mutating the action-required Case', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const caseId = prepareInReview(runtime)
    runtime.requestMedicalCorrection({ caseId })
    const before = storage.rawProjectState()

    expect(runtime.prepareCorrection({
      caseId,
      fixtureId: 'SYN-FIXTURE-HOSPITAL-LETTER-V1-001',
    })).toMatchObject({ status: 'COMMAND_REJECTED', reasonCode: 'INVALID_COMMAND' })
    expect(storage.rawProjectState()).toBe(before)
  })

  it('keeps Tourist in the ordinary shared no-action status without a correction trigger', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const caseId = prepareInReview(runtime, 'SYN-TOURIST-001')
    const before = storage.rawProjectState()

    expect(runtime.inspectStatus({ caseId })).toMatchObject({
      status: 'STATUS_INSPECTED',
      headline: 'Under review',
      demoReviewAction: 'COMPLETE_SYNTHETIC_REVIEW',
      applicantActionRequired: false,
    })
    expect(runtime.requestMedicalCorrection({ caseId })).toMatchObject({
      status: 'COMMAND_REJECTED',
      reasonCode: 'CORRECTION_PREREQUISITES_NOT_MET',
    })
    expect(storage.rawProjectState()).toBe(before)
  })
})
