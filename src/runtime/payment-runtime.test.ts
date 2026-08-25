import { describe, expect, it } from 'vitest'

import { MEDICAL_CONTROLLED_ANSWERS, TOURIST_CONTROLLED_ANSWERS } from '../fixtures'
import {
  createLocalMockAdapters,
  type LocalMockAdapters,
} from '../mocks'
import type { PaymentAdapterResult } from '../mocks/local-adapters/payment'
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

function createRuntime(
  storage: MemoryStorage,
  adapters: LocalMockAdapters = createLocalMockAdapters(),
): DemoRuntime {
  return createDemoRuntime({
    store: createPersistenceStore(storage),
    adapters,
    metadata: createDeterministicRuntimeMetadata(),
  })
}

function prepareLockedCase(
  runtime: DemoRuntime,
  scenarioId: 'SYN-MEDICAL-001' | 'SYN-TOURIST-001',
) {
  const medical = scenarioId === 'SYN-MEDICAL-001'
  const caseId = medical ? 'SYN-CASE-MED-001' : 'SYN-CASE-TOURIST-001'
  const answers = medical ? MEDICAL_CONTROLLED_ANSWERS : TOURIST_CONTROLLED_ANSWERS
  const suffix = medical ? 'MEDICAL' : 'TOURIST'
  expect(runtime.createCase({ scenarioId, idempotencyKey: `SYN-A06-CREATE-${suffix}` }).status).toBe('COMMAND_ACCEPTED')
  expect(runtime.beginDraft({ caseId, idempotencyKey: `SYN-A06-BEGIN-${suffix}` }).status).toBe('COMMAND_ACCEPTED')
  expect(runtime.saveDraftSnapshot({
    caseId,
    idempotencyKey: `SYN-A06-DOCUMENTS-${suffix}`,
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
      idempotencyKey: `SYN-A06-DOCUMENT-${suffix}-${requirementId}`,
    }).status).toBe('DOCUMENT_PREPARED')
  }
  expect(runtime.prepareReview({
    caseId,
    idempotencyKey: `SYN-A06-REVIEW-${suffix}`,
  }).status).toBe('REVIEW_PREPARED')
  expect(runtime.submitApplication({
    caseId,
    idempotencyKey: `SYN-A06-SUBMIT-${suffix}`,
  }).status).toBe('APPLICATION_SUBMITTED')
  return caseId
}

function createPaymentSpy(): Readonly<{
  adapters: LocalMockAdapters
  calls: unknown[]
}> {
  const base = createLocalMockAdapters()
  const calls: unknown[] = []
  return {
    calls,
    adapters: Object.freeze({
      ...base,
      payment: Object.freeze({
        execute(candidate: unknown) {
          calls.push(candidate)
          return base.payment.execute(candidate)
        },
        reset() {
          calls.splice(0)
          base.payment.reset()
        },
      }),
    }),
  }
}

describe('runtime A06 mock payment and reconciliation', () => {
  it('reads a locked Medical case without mutation and derives the 73-credit fee', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const caseId = prepareLockedCase(runtime, 'SYN-MEDICAL-001')
    const before = storage.rawProjectState()

    expect(runtime.inspectPayment({ caseId })).toMatchObject({
      status: 'PAYMENT_INSPECTED',
      applicationState: 'LOCKED',
      paymentState: 'NOT_STARTED',
      mockPaymentAttemptId: null,
      syntheticReference: null,
      syntheticFee: {
        amount: 73,
        unit: 'SYNTHETIC_DEMO_CREDITS',
        label: 'SYNTHETIC — NOT PAYABLE',
      },
    })
    expect(storage.rawProjectState()).toBe(before)
  })

  it('reuses the same runtime path for Tourist and its policy-derived 41-credit fee', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const caseId = prepareLockedCase(runtime, 'SYN-TOURIST-001')

    expect(runtime.inspectPayment({ caseId })).toMatchObject({
      status: 'PAYMENT_INSPECTED',
      purposeFamily: 'SYNTHETIC_TOURIST_PURPOSE',
      syntheticFee: { amount: 41 },
    })
    expect(runtime.startMockPayment({ caseId })).toMatchObject({
      status: 'PAYMENT_RECONCILIATION_REQUIRED',
      paymentState: 'RECONCILIATION_REQUIRED',
    })
  })

  it('creates one deterministic attempt and ordered legal ambiguous-payment evidence', () => {
    const storage = new MemoryStorage()
    const paymentSpy = createPaymentSpy()
    const runtime = createRuntime(storage, paymentSpy.adapters)
    const caseId = prepareLockedCase(runtime, 'SYN-MEDICAL-001')
    const initial = runtime.inspectPayment({ caseId })
    if (initial.status !== 'PAYMENT_INSPECTED') {
      throw new Error('Expected the initial payment projection.')
    }

    const result = runtime.startMockPayment({ caseId })
    expect(result).toMatchObject({
      status: 'PAYMENT_RECONCILIATION_REQUIRED',
      mockPaymentAttemptId: 'SYN-PAYMENT-ATTEMPT-MED-001',
      syntheticReference: 'SYN-PAYMENT-REFERENCE-MED-001',
      revision: initial.revision + 3,
      emittedEventTypes: [
        'MockPaymentInitiated',
        'MockPaymentPending',
        'PaymentReconciliationRequired',
      ],
    })
    expect(paymentSpy.calls).toHaveLength(1)
    expect(paymentSpy.calls[0]).toMatchObject({
      amount: 73,
      unit: 'SYNTHETIC_DEMO_CREDITS',
      scenario: 'PAYMENT_AMBIGUOUS_RECONCILIATION',
      idempotencyKey: 'SYN-IDEMPOTENCY-PAYMENT-CASE-MED-001-START',
    })

    const loaded = runtime.inspectState()
    if (loaded.status !== 'VALID_STATE') {
      throw new Error('Expected the saved payment state.')
    }
    const persistedCase = loaded.state.cases[0]
    expect(persistedCase?.application.state).toBe('LOCKED')
    expect(persistedCase?.payment).toEqual({
      state: 'RECONCILIATION_REQUIRED',
      mockPaymentAttemptId: 'SYN-PAYMENT-ATTEMPT-MED-001',
      syntheticReference: 'SYN-PAYMENT-REFERENCE-MED-001',
    })
  })

  it('blocks duplicate start before the adapter and preserves persistence bytes', () => {
    const storage = new MemoryStorage()
    const paymentSpy = createPaymentSpy()
    const runtime = createRuntime(storage, paymentSpy.adapters)
    const caseId = prepareLockedCase(runtime, 'SYN-MEDICAL-001')
    expect(runtime.startMockPayment({ caseId }).status).toBe('PAYMENT_RECONCILIATION_REQUIRED')
    const before = storage.rawProjectState()

    expect(runtime.startMockPayment({ caseId })).toMatchObject({
      status: 'PAYMENT_EXISTING',
      paymentState: 'RECONCILIATION_REQUIRED',
      idempotentReplay: true,
    })
    expect(paymentSpy.calls).toHaveLength(1)
    expect(storage.rawProjectState()).toBe(before)
  })

  it('reconciles the same attempt to confirmed with one approved event', () => {
    const storage = new MemoryStorage()
    const paymentSpy = createPaymentSpy()
    const runtime = createRuntime(storage, paymentSpy.adapters)
    const caseId = prepareLockedCase(runtime, 'SYN-MEDICAL-001')
    const started = runtime.startMockPayment({ caseId })
    if (started.status !== 'PAYMENT_RECONCILIATION_REQUIRED') {
      throw new Error('Expected the ambiguous payment state.')
    }

    expect(runtime.checkMockPaymentStatus({ caseId })).toMatchObject({
      status: 'PAYMENT_CONFIRMED',
      paymentState: 'CONFIRMED',
      mockPaymentAttemptId: started.mockPaymentAttemptId,
      syntheticReference: started.syntheticReference,
      revision: started.revision + 1,
      emittedEventType: 'PaymentReconciledConfirmed',
    })
    expect(paymentSpy.calls).toHaveLength(2)
    expect(paymentSpy.calls[1]).toMatchObject({
      requestReference: started.syntheticReference,
      scenario: 'PAYMENT_RECONCILIATION_CONFIRMED',
      idempotencyKey: 'SYN-IDEMPOTENCY-PAYMENT-CASE-MED-001-RECONCILE',
    })
  })

  it('treats repeated reconciliation after confirmation as a byte-stable no-op', () => {
    const storage = new MemoryStorage()
    const paymentSpy = createPaymentSpy()
    const runtime = createRuntime(storage, paymentSpy.adapters)
    const caseId = prepareLockedCase(runtime, 'SYN-MEDICAL-001')
    runtime.startMockPayment({ caseId })
    runtime.checkMockPaymentStatus({ caseId })
    const before = storage.rawProjectState()

    expect(runtime.checkMockPaymentStatus({ caseId })).toMatchObject({
      status: 'PAYMENT_EXISTING',
      paymentState: 'CONFIRMED',
      idempotentReplay: true,
    })
    expect(paymentSpy.calls).toHaveLength(2)
    expect(storage.rawProjectState()).toBe(before)
  })

  it('restores uncertain and confirmed states after runtime recreation without adapter calls', () => {
    const storage = new MemoryStorage()
    const firstRuntime = createRuntime(storage)
    const caseId = prepareLockedCase(firstRuntime, 'SYN-MEDICAL-001')
    firstRuntime.startMockPayment({ caseId })
    const uncertainBytes = storage.rawProjectState()
    const uncertainSpy = createPaymentSpy()
    const uncertainRuntime = createRuntime(storage, uncertainSpy.adapters)

    expect(uncertainRuntime.inspectPayment({ caseId })).toMatchObject({
      status: 'PAYMENT_INSPECTED',
      paymentState: 'RECONCILIATION_REQUIRED',
    })
    expect(uncertainSpy.calls).toHaveLength(0)
    expect(storage.rawProjectState()).toBe(uncertainBytes)

    uncertainRuntime.checkMockPaymentStatus({ caseId })
    const confirmedBytes = storage.rawProjectState()
    const confirmedSpy = createPaymentSpy()
    expect(createRuntime(storage, confirmedSpy.adapters).inspectPayment({ caseId })).toMatchObject({
      status: 'PAYMENT_INSPECTED',
      paymentState: 'CONFIRMED',
    })
    expect(confirmedSpy.calls).toHaveLength(0)
    expect(storage.rawProjectState()).toBe(confirmedBytes)
  })

  it('rejects an unlocked application atomically before payment adapter use', () => {
    const storage = new MemoryStorage()
    const paymentSpy = createPaymentSpy()
    const runtime = createRuntime(storage, paymentSpy.adapters)
    runtime.createCase({
      scenarioId: 'SYN-MEDICAL-001',
      idempotencyKey: 'SYN-A06-INVALID-APP-CREATE',
    })
    const before = storage.rawProjectState()

    expect(runtime.startMockPayment({ caseId: 'SYN-CASE-MED-001' })).toMatchObject({
      status: 'COMMAND_REJECTED',
      reasonCode: 'PAYMENT_PREREQUISITES_NOT_MET',
    })
    expect(paymentSpy.calls).toHaveLength(0)
    expect(storage.rawProjectState()).toBe(before)
  })

  it('fails closed when adapter evidence conflicts with the pinned policy fee', () => {
    const storage = new MemoryStorage()
    const base = createLocalMockAdapters()
    const mismatchedAdapters: LocalMockAdapters = Object.freeze({
      ...base,
      payment: Object.freeze({
        execute(candidate: unknown): PaymentAdapterResult {
          const result = base.payment.execute(candidate)
          return result.status === 'MOCK_OUTCOME'
            ? Object.freeze({ ...result, metadata: Object.freeze({ ...result.metadata, amount: 41 }) })
            : result
        },
        reset: base.payment.reset,
      }),
    })
    const runtime = createRuntime(storage, mismatchedAdapters)
    const caseId = prepareLockedCase(runtime, 'SYN-MEDICAL-001')
    const before = storage.rawProjectState()

    expect(runtime.startMockPayment({ caseId })).toMatchObject({
      status: 'COMMAND_REJECTED',
      reasonCode: 'PAYMENT_EVIDENCE_MISMATCH',
    })
    expect(storage.rawProjectState()).toBe(before)
  })

  it('fails closed on a controlled adapter rejection and never claims confirmation', () => {
    const storage = new MemoryStorage()
    const base = createLocalMockAdapters()
    const rejectedAdapters: LocalMockAdapters = Object.freeze({
      ...base,
      payment: Object.freeze({
        execute(): PaymentAdapterResult {
          return Object.freeze({
            status: 'REJECTED',
            rejectionKind: 'INVALID_REQUEST',
            adapter: 'PAYMENT',
            requestReference: 'SYN-REJECTED-REQUEST',
            correlationId: 'SYN-REJECTED-CORRELATION',
            occurredAt: '2099-03-01T10:00:00Z',
            reasonCode: 'MOCK_INVALID_REQUEST',
            mock: true,
            diagnostic: Object.freeze({ issueCount: 1 }),
          })
        },
        reset() {},
      }),
    })
    const runtime = createRuntime(storage, rejectedAdapters)
    const caseId = prepareLockedCase(runtime, 'SYN-MEDICAL-001')
    const before = storage.rawProjectState()

    expect(runtime.startMockPayment({ caseId })).toMatchObject({
      status: 'COMMAND_REJECTED',
      reasonCode: 'PAYMENT_ADAPTER_REJECTED',
    })
    expect(runtime.inspectPayment({ caseId })).toMatchObject({ paymentState: 'NOT_STARTED' })
    expect(storage.rawProjectState()).toBe(before)
  })

  it('returns typed failures for a missing Case and a premature status check', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    expect(runtime.inspectPayment({ caseId: 'SYN-CASE-MISSING-001' })).toEqual({
      status: 'CASE_NOT_FOUND',
      caseId: 'SYN-CASE-MISSING-001',
    })
    const caseId = prepareLockedCase(runtime, 'SYN-MEDICAL-001')
    const before = storage.rawProjectState()
    expect(runtime.checkMockPaymentStatus({ caseId })).toMatchObject({
      status: 'COMMAND_REJECTED',
      reasonCode: 'GUARD_FAILED',
    })
    expect(storage.rawProjectState()).toBe(before)
  })
})
