import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import { PaymentApplication } from './app/PaymentApplication'
import { createAppRuntime, type AppRuntimeServices } from './app/create-app-runtime'
import { MEDICAL_CONTROLLED_ANSWERS, TOURIST_CONTROLLED_ANSWERS } from './fixtures'
import { createLocalMockAdapters, type LocalMockAdapters } from './mocks'
import type { PaymentAdapterResult } from './mocks/local-adapters/payment'
import {
  createPersistenceStore,
  type PersistenceService,
  type StoragePort,
} from './persistence'

afterEach(cleanup)

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
}

function requireCase(store: PersistenceService) {
  const loaded = store.load()
  if (loaded.status !== 'VALID_STATE' || loaded.state.cases[0] === undefined) {
    throw new Error('Expected one valid persisted synthetic Case.')
  }
  return loaded.state.cases[0]
}

function prepareLockedCase(
  services: AppRuntimeServices,
  scenarioId: 'SYN-MEDICAL-001' | 'SYN-TOURIST-001',
) {
  const medical = scenarioId === 'SYN-MEDICAL-001'
  const caseId = medical ? 'SYN-CASE-MED-001' : 'SYN-CASE-TOURIST-001'
  const suffix = medical ? 'MEDICAL' : 'TOURIST'
  const answers = medical ? MEDICAL_CONTROLLED_ANSWERS : TOURIST_CONTROLLED_ANSWERS
  services.runtime.createCase({ scenarioId, idempotencyKey: `SYN-A06-UI-CREATE-${suffix}` })
  services.runtime.beginDraft({ caseId, idempotencyKey: `SYN-A06-UI-BEGIN-${suffix}` })
  services.runtime.saveDraftSnapshot({
    caseId,
    idempotencyKey: `SYN-A06-UI-DOCUMENTS-${suffix}`,
    currentStep: 'DOCUMENTS',
    answers,
  })
  const fixtures = [
    ['REQ-PORTRAIT-1', 'SYN-FIXTURE-PORTRAIT-VALID-001'],
    ['REQ-PASSPORT-PAGE-1', 'SYN-FIXTURE-PASSPORT-VALID-001'],
    ...(medical
      ? [['REQ-HOSPITAL-LETTER-1', 'SYN-FIXTURE-HOSPITAL-LETTER-V1-001']]
      : []),
  ] as const
  for (const [requirementId, fixtureId] of fixtures) {
    services.runtime.prepareDocumentFixture({
      caseId,
      requirementId,
      fixtureId,
      idempotencyKey: `SYN-A06-UI-DOCUMENT-${suffix}-${requirementId}`,
    })
  }
  services.runtime.prepareReview({ caseId, idempotencyKey: `SYN-A06-UI-REVIEW-${suffix}` })
  services.runtime.submitApplication({ caseId, idempotencyKey: `SYN-A06-UI-SUBMIT-${suffix}` })
  return caseId
}

function renderPayment(input: {
  scenarioId?: 'SYN-MEDICAL-001' | 'SYN-TOURIST-001'
  adapters?: LocalMockAdapters
}) {
  const store = createPersistenceStore(new MemoryStorage())
  const services = createAppRuntime({ store, ...(input.adapters ? { adapters: input.adapters } : {}) })
  const caseId = prepareLockedCase(services, input.scenarioId ?? 'SYN-MEDICAL-001')
  render(
    <MemoryRouter>
      <PaymentApplication
        services={services}
        caseId={caseId}
        reviewPath="/review"
        statusPath="/status"
        onRecoveryRequired={() => undefined}
      />
    </MemoryRouter>,
  )
  return { services, store, caseId }
}

describe('A06 mock payment and ambiguous-result recovery', () => {
  it('shows the policy-derived Medical fee and requires an explicit start action', () => {
    const { store } = renderPayment({})

    expect(screen.getByRole('heading', { name: 'Complete the demo payment' })).toBeInTheDocument()
    expect(screen.getByText('Medical treatment')).toBeInTheDocument()
    expect(screen.getByText('73 SYNTHETIC_DEMO_CREDITS')).toBeInTheDocument()
    expect(screen.getByText('SYNTHETIC — NOT PAYABLE')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start mock payment' })).toBeInTheDocument()
    expect(requireCase(store).payment.state).toBe('NOT_STARTED')
  })

  it('uses the same component and pinned policy projection for Tourist', () => {
    renderPayment({ scenarioId: 'SYN-TOURIST-001' })

    expect(screen.getByText('Tourism')).toBeInTheDocument()
    expect(screen.getByText('41 SYNTHETIC_DEMO_CREDITS')).toBeInTheDocument()
  })

  it('starts once, explains ambiguity exactly, and reconciles the existing attempt', async () => {
    const user = userEvent.setup()
    const { store } = renderPayment({})
    await user.click(screen.getByRole('button', { name: 'Start mock payment' }))

    expect(screen.getByRole('heading', {
      name: 'Mock payment is pending. No real payment was made.',
    })).toBeInTheDocument()
    expect(screen.getByText(
      'Do not start another mock payment. Check mock payment status instead.',
    )).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start mock payment' })).not.toBeInTheDocument()
    expect(requireCase(store).payment).toEqual({
      state: 'RECONCILIATION_REQUIRED',
      mockPaymentAttemptId: 'SYN-PAYMENT-ATTEMPT-MED-001',
      syntheticReference: 'SYN-PAYMENT-REFERENCE-MED-001',
    })

    await user.click(screen.getByRole('button', { name: 'Check mock payment status' }))
    expect(screen.getByRole('heading', { name: 'Payment confirmed' })).toBeInTheDocument()
    expect(screen.getByText('Status', { exact: true })).toBeInTheDocument()
    expect(requireCase(store).payment.state).toBe('CONFIRMED')
  })

  it('prevents a double start from creating duplicate payment evidence', async () => {
    const user = userEvent.setup()
    const { store } = renderPayment({})
    await user.dblClick(screen.getByRole('button', { name: 'Start mock payment' }))

    const persistedCase = requireCase(store)
    expect(persistedCase.auditEvents.filter(({ eventType }) => eventType === 'MockPaymentInitiated')).toHaveLength(1)
    expect(persistedCase.auditEvents.filter(({ eventType }) => eventType === 'MockPaymentPending')).toHaveLength(1)
    expect(persistedCase.auditEvents.filter(({ eventType }) => eventType === 'PaymentReconciliationRequired')).toHaveLength(1)
  })

  it('shows an adapter failure without claiming the payment was confirmed', async () => {
    const user = userEvent.setup()
    const base = createLocalMockAdapters()
    const adapters: LocalMockAdapters = Object.freeze({
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
    const { store } = renderPayment({ adapters })
    await user.click(screen.getByRole('button', { name: 'Start mock payment' }))

    expect(screen.getByRole('alert')).toHaveTextContent('could not start safely')
    expect(screen.queryByRole('heading', { name: 'Payment confirmed' })).not.toBeInTheDocument()
    expect(requireCase(store).payment.state).toBe('NOT_STARTED')
  })
})
