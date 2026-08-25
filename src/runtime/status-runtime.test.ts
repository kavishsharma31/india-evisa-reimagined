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

function prepareConfirmedCase(
  runtime: DemoRuntime,
  scenarioId: 'SYN-MEDICAL-001' | 'SYN-TOURIST-001',
) {
  const medical = scenarioId === 'SYN-MEDICAL-001'
  const caseId = medical ? 'SYN-CASE-MED-001' : 'SYN-CASE-TOURIST-001'
  const suffix = medical ? 'MEDICAL' : 'TOURIST'
  const answers = medical ? MEDICAL_CONTROLLED_ANSWERS : TOURIST_CONTROLLED_ANSWERS
  expect(runtime.createCase({ scenarioId, idempotencyKey: `SYN-A07-CREATE-${suffix}` }).status).toBe('COMMAND_ACCEPTED')
  expect(runtime.beginDraft({ caseId, idempotencyKey: `SYN-A07-BEGIN-${suffix}` }).status).toBe('COMMAND_ACCEPTED')
  expect(runtime.saveDraftSnapshot({
    caseId,
    idempotencyKey: `SYN-A07-DOCUMENTS-${suffix}`,
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
      idempotencyKey: `SYN-A07-DOCUMENT-${suffix}-${requirementId}`,
    }).status).toBe('DOCUMENT_PREPARED')
  }
  expect(runtime.prepareReview({ caseId, idempotencyKey: `SYN-A07-REVIEW-${suffix}` }).status).toBe('REVIEW_PREPARED')
  expect(runtime.submitApplication({ caseId, idempotencyKey: `SYN-A07-SUBMIT-${suffix}` }).status).toBe('APPLICATION_SUBMITTED')
  expect(runtime.startMockPayment({ caseId }).status).toBe('PAYMENT_RECONCILIATION_REQUIRED')
  expect(runtime.checkMockPaymentStatus({ caseId }).status).toBe('PAYMENT_CONFIRMED')
  return caseId
}

describe('runtime A07 unified status and scrutiny entry', () => {
  it('inspects a confirmed Medical case without mutation and exposes the one legal next action', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const caseId = prepareConfirmedCase(runtime, 'SYN-MEDICAL-001')
    const before = storage.rawProjectState()

    expect(runtime.inspectStatus({ caseId })).toMatchObject({
      status: 'STATUS_INSPECTED',
      purposeFamily: 'SYNTHETIC_MEDICAL_PURPOSE',
      applicationState: 'LOCKED',
      paymentState: 'CONFIRMED',
      scrutinyState: 'NOT_STARTED',
      headline: 'Ready for review',
      nextAction: 'BEGIN_SCRUTINY',
    })
    expect(storage.rawProjectState()).toBe(before)
  })

  it('legally queues and starts scrutiny, then moves every submitted Medical document under review', () => {
    const storage = new MemoryStorage()
    const store = createPersistenceStore(storage)
    const runtime = createDemoRuntime({
      store,
      adapters: createLocalMockAdapters(),
      metadata: createDeterministicRuntimeMetadata(),
    })
    const caseId = prepareConfirmedCase(runtime, 'SYN-MEDICAL-001')
    const beforeRevision = requireCase(store).revision

    const result = runtime.beginScrutiny({ caseId })
    expect(result).toMatchObject({
      status: 'SCRUTINY_STARTED',
      scrutinyState: 'IN_REVIEW',
      emittedEventTypes: [
        'ScrutinyQueued',
        'ScrutinyStarted',
        'DocumentReviewStarted',
        'DocumentReviewStarted',
        'DocumentReviewStarted',
      ],
    })
    const persistedCase = requireCase(store)
    expect(persistedCase.application.state).toBe('LOCKED')
    expect(persistedCase.payment.state).toBe('CONFIRMED')
    expect(persistedCase.scrutiny.state).toBe('IN_REVIEW')
    expect(persistedCase.documents.map(({ versions }) => versions.at(-1)?.state)).toEqual([
      'UNDER_REVIEW',
      'UNDER_REVIEW',
      'UNDER_REVIEW',
    ])
    expect(persistedCase.revision).toBe(beforeRevision + 5)
  })

  it('projects the authoritative in-review state as an explicit no-action wait', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const caseId = prepareConfirmedCase(runtime, 'SYN-MEDICAL-001')
    runtime.beginScrutiny({ caseId })

    expect(runtime.inspectStatus({ caseId })).toMatchObject({
      status: 'STATUS_INSPECTED',
      headline: 'Under review',
      explanation: 'Your synthetic application is being reviewed.',
      applicantActionRequired: false,
      nextAction: null,
      waitMessage: 'No action is needed now. Synthetic scrutiny is continuing.',
      scrutinyState: 'IN_REVIEW',
      etaState: 'NOT_READY',
    })
  })

  it('treats repeated scrutiny entry and reload inspection as byte-stable no-ops', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const caseId = prepareConfirmedCase(runtime, 'SYN-MEDICAL-001')
    expect(runtime.beginScrutiny({ caseId }).status).toBe('SCRUTINY_STARTED')
    const before = storage.rawProjectState()

    expect(runtime.beginScrutiny({ caseId })).toMatchObject({
      status: 'SCRUTINY_EXISTING',
      scrutinyState: 'IN_REVIEW',
      idempotentReplay: true,
    })
    const reloaded = createRuntime(storage)
    expect(reloaded.inspectStatus({ caseId }).status).toBe('STATUS_INSPECTED')
    expect(storage.rawProjectState()).toBe(before)
  })

  it('fails atomically when payment is not confirmed', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const caseId = 'SYN-CASE-MED-001'
    expect(runtime.createCase({ scenarioId: 'SYN-MEDICAL-001', idempotencyKey: 'SYN-A07-INVALID-CREATE' }).status).toBe('COMMAND_ACCEPTED')
    const before = storage.rawProjectState()

    expect(runtime.beginScrutiny({ caseId })).toMatchObject({
      status: 'COMMAND_REJECTED',
      reasonCode: 'STATUS_PREREQUISITES_NOT_MET',
    })
    expect(storage.rawProjectState()).toBe(before)
  })

  it('reuses the same runtime and projection for Tourist', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const caseId = prepareConfirmedCase(runtime, 'SYN-TOURIST-001')
    const result = runtime.beginScrutiny({ caseId })

    expect(result).toMatchObject({ status: 'SCRUTINY_STARTED' })
    if (result.status !== 'SCRUTINY_STARTED') {
      throw new Error('Expected Tourist scrutiny to start.')
    }
    expect(result.reviewedDocumentVersionIds).toHaveLength(2)
    expect(runtime.inspectStatus({ caseId })).toMatchObject({
      status: 'STATUS_INSPECTED',
      purposeFamily: 'SYNTHETIC_TOURIST_PURPOSE',
      headline: 'Under review',
      applicantActionRequired: false,
    })
  })

  it('projects the canonical status-recovery seed to the same in-review no-action state', () => {
    const storage = new MemoryStorage()
    const store = createPersistenceStore(storage)
    const seed = getSeed('SEED-MEDICAL-STATUS-RECOVERY')
    expect(store.save(seed.envelope).status).toBe('SAVED')
    const runtime = createDemoRuntime({
      store,
      adapters: createLocalMockAdapters(),
      metadata: createDeterministicRuntimeMetadata(),
    })

    expect(runtime.inspectStatus({ caseId: 'SYN-CASE-MED-001' })).toMatchObject({
      status: 'STATUS_INSPECTED',
      headline: 'Under review',
      applicantActionRequired: false,
      nextAction: null,
      waitMessage: 'No action is needed now. Synthetic scrutiny is continuing.',
    })
  })
})
