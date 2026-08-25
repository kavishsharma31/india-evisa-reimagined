import { describe, expect, it } from 'vitest'

import {
  MEDICAL_CONTROLLED_ANSWERS,
  TOURIST_CONTROLLED_ANSWERS,
} from '../fixtures'
import { createLocalMockAdapters } from '../mocks'
import {
  P0_STORAGE_KEY,
  createPersistenceStore,
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

function prepareReviewableCase(
  runtime: DemoRuntime,
  scenarioId: 'SYN-MEDICAL-001' | 'SYN-TOURIST-001',
) {
  const medical = scenarioId === 'SYN-MEDICAL-001'
  const caseId = medical ? 'SYN-CASE-MED-001' : 'SYN-CASE-TOURIST-001'
  const answers = medical ? MEDICAL_CONTROLLED_ANSWERS : TOURIST_CONTROLLED_ANSWERS
  const suffix = medical ? 'MEDICAL' : 'TOURIST'

  expect(
    runtime.createCase({
      scenarioId,
      idempotencyKey: `SYN-IDEMPOTENCY-A05-CREATE-${suffix}`,
    }).status,
  ).toBe('COMMAND_ACCEPTED')
  expect(
    runtime.beginDraft({
      caseId,
      idempotencyKey: `SYN-IDEMPOTENCY-A05-BEGIN-${suffix}`,
    }).status,
  ).toBe('COMMAND_ACCEPTED')
  expect(
    runtime.saveDraftSnapshot({
      caseId,
      idempotencyKey: `SYN-IDEMPOTENCY-A05-DOCUMENTS-${suffix}`,
      currentStep: 'DOCUMENTS',
      answers,
    }).status,
  ).toBe('COMMAND_ACCEPTED')

  const fixtures = [
    ['REQ-PORTRAIT-1', 'SYN-FIXTURE-PORTRAIT-VALID-001'],
    ['REQ-PASSPORT-PAGE-1', 'SYN-FIXTURE-PASSPORT-VALID-001'],
    ...(medical
      ? [['REQ-HOSPITAL-LETTER-1', 'SYN-FIXTURE-HOSPITAL-LETTER-V1-001']]
      : []),
  ] as const
  for (const [requirementId, fixtureId] of fixtures) {
    expect(
      runtime.prepareDocumentFixture({
        caseId,
        requirementId,
        fixtureId,
        idempotencyKey: `SYN-IDEMPOTENCY-A05-PREPARE-${suffix}-${requirementId}`,
      }).status,
    ).toBe('DOCUMENT_PREPARED')
  }

  return { caseId, answers }
}

function openReview(runtime: DemoRuntime, caseId: string) {
  return runtime.prepareReview({
    caseId,
    idempotencyKey: `SYN-IDEMPOTENCY-A05-OPEN-${caseId.slice('SYN-'.length)}`,
  })
}

describe('runtime A05 review and simulated submission', () => {
  it('derives the Medical review from authoritative answers, documents, and policy', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const { caseId } = prepareReviewableCase(runtime, 'SYN-MEDICAL-001')

    expect(openReview(runtime, caseId)).toMatchObject({
      status: 'REVIEW_PREPARED',
      idempotentReplay: false,
    })
    const review = runtime.inspectReview({ caseId })
    expect(review).toMatchObject({
      status: 'REVIEW_INSPECTED',
      purposeFamily: 'SYNTHETIC_MEDICAL_PURPOSE',
      policyQualifiedVersion: 'SYN-EVISA-POLICY@1.0.0',
      applicationState: 'IN_PROGRESS',
      locked: false,
      syntheticFee: {
        amount: 73,
        unit: 'SYNTHETIC_DEMO_CREDITS',
        label: 'SYNTHETIC — NOT PAYABLE',
      },
    })
    if (review.status !== 'REVIEW_INSPECTED') {
      throw new Error('Expected the Medical review summary.')
    }
    expect(review.answers).toHaveLength(6)
    expect(review.documents).toHaveLength(3)
    expect(review.documents.every(({ state }) => state === 'PREFLIGHT_PASSED')).toBe(true)
  })

  it('reuses the same review and submission runtime for Tourist policy data', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const { caseId } = prepareReviewableCase(runtime, 'SYN-TOURIST-001')
    expect(openReview(runtime, caseId).status).toBe('REVIEW_PREPARED')

    const review = runtime.inspectReview({ caseId })
    expect(review).toMatchObject({
      status: 'REVIEW_INSPECTED',
      purposeFamily: 'SYNTHETIC_TOURIST_PURPOSE',
      syntheticFee: { amount: 41 },
    })
    if (review.status !== 'REVIEW_INSPECTED') {
      throw new Error('Expected the Tourist review summary.')
    }
    expect(review.answers).toHaveLength(5)
    expect(review.documents).toHaveLength(2)
  })

  it('persists one Review marker and reuses it without mutating on reload', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const { caseId } = prepareReviewableCase(runtime, 'SYN-MEDICAL-001')
    const first = openReview(runtime, caseId)
    expect(first).toMatchObject({ status: 'REVIEW_PREPARED', idempotentReplay: false })
    const before = storage.rawProjectState()

    const reloadedRuntime = createRuntime(storage)
    expect(openReview(reloadedRuntime, caseId)).toMatchObject({
      status: 'REVIEW_PREPARED',
      idempotentReplay: true,
    })
    expect(reloadedRuntime.inspectReview({ caseId }).status).toBe('REVIEW_INSPECTED')
    expect(storage.rawProjectState()).toBe(before)
  })

  it('rejects missing answers or documents without review or submission mutation', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    expect(
      runtime.createCase({
        scenarioId: 'SYN-MEDICAL-001',
        idempotencyKey: 'SYN-IDEMPOTENCY-A05-INCOMPLETE-CREATE',
      }).status,
    ).toBe('COMMAND_ACCEPTED')
    expect(
      runtime.beginDraft({
        caseId: 'SYN-CASE-MED-001',
        idempotencyKey: 'SYN-IDEMPOTENCY-A05-INCOMPLETE-BEGIN',
      }).status,
    ).toBe('COMMAND_ACCEPTED')
    expect(
      runtime.saveDraftSnapshot({
        caseId: 'SYN-CASE-MED-001',
        idempotencyKey: 'SYN-IDEMPOTENCY-A05-INCOMPLETE-DOCUMENTS',
        currentStep: 'DOCUMENTS',
        answers: { 'Q-SHARED-POLICY-COHORT': 'SYN-POLICY-COHORT-A' },
      }).status,
    ).toBe('COMMAND_ACCEPTED')
    const before = storage.rawProjectState()

    expect(openReview(runtime, 'SYN-CASE-MED-001')).toMatchObject({
      status: 'COMMAND_REJECTED',
      reasonCode: 'REVIEW_PREREQUISITES_NOT_MET',
    })
    expect(
      runtime.submitApplication({
        caseId: 'SYN-CASE-MED-001',
        idempotencyKey: 'SYN-IDEMPOTENCY-A05-INCOMPLETE-SUBMIT',
      }),
    ).toMatchObject({ status: 'COMMAND_REJECTED' })
    expect(storage.rawProjectState()).toBe(before)
  })

  it('submits documents and applies every legal application transition in order', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const { caseId } = prepareReviewableCase(runtime, 'SYN-MEDICAL-001')
    expect(openReview(runtime, caseId).status).toBe('REVIEW_PREPARED')

    const submitted = runtime.submitApplication({
      caseId,
      idempotencyKey: 'SYN-IDEMPOTENCY-A05-SUBMIT-MEDICAL',
    })
    expect(submitted).toMatchObject({
      status: 'APPLICATION_SUBMITTED',
      applicationState: 'LOCKED',
    })
    if (submitted.status !== 'APPLICATION_SUBMITTED') {
      throw new Error('Expected a simulated Medical submission.')
    }
    expect(submitted.emittedEventTypes).toEqual([
      'DraftReadyForReview',
      'DocumentVersionSubmitted',
      'DocumentVersionSubmitted',
      'DocumentVersionSubmitted',
      'ApplicationReadyToSubmit',
      'ApplicationSubmitted',
      'ApplicationLocked',
    ])

    const review = runtime.inspectReview({ caseId })
    expect(review).toMatchObject({
      status: 'REVIEW_INSPECTED',
      applicationState: 'LOCKED',
      locked: true,
    })
    if (review.status !== 'REVIEW_INSPECTED') {
      throw new Error('Expected the durable locked review summary.')
    }
    expect(review.documents.every(({ state }) => state === 'SUBMITTED')).toBe(true)
  })

  it('returns the existing locked result without duplicate events or revision changes', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const { caseId } = prepareReviewableCase(runtime, 'SYN-MEDICAL-001')
    expect(openReview(runtime, caseId).status).toBe('REVIEW_PREPARED')
    const command = {
      caseId,
      idempotencyKey: 'SYN-IDEMPOTENCY-A05-SUBMIT-ONCE',
    }
    expect(runtime.submitApplication(command).status).toBe('APPLICATION_SUBMITTED')
    const before = storage.rawProjectState()

    expect(runtime.submitApplication(command)).toMatchObject({
      status: 'APPLICATION_ALREADY_SUBMITTED',
      applicationState: 'LOCKED',
      idempotentReplay: true,
    })
    expect(createRuntime(storage).inspectReview({ caseId }).status).toBe('REVIEW_INSPECTED')
    expect(storage.rawProjectState()).toBe(before)
  })
})
