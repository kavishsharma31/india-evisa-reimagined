import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import App from './App'
import { createAppRuntime } from './app/create-app-runtime'
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

function requiredItem<Value>(values: readonly Value[], index: number): Value {
  const value = values[index]
  if (value === undefined) {
    throw new Error(`Expected item at index ${index}.`)
  }
  return value
}

async function reachA05(
  user: ReturnType<typeof userEvent.setup>,
  scenario: 'Medical treatment' | 'Tourism' = 'Medical treatment',
) {
  await user.click(screen.getByRole('radio', { name: new RegExp(scenario, 'i') }))
  await user.click(screen.getByRole('link', { name: 'Continue' }))
  await user.click(screen.getByRole('button', { name: 'Continue with this demo' }))
  await user.click(screen.getByRole('button', { name: 'Start application' }))

  const selects = screen.getAllByRole('combobox')
  await user.selectOptions(requiredItem(selects, 0), 'SYN-POLICY-COHORT-A')
  await user.selectOptions(requiredItem(selects, 1), 'SYNTHETIC_STANDARD_PASSPORT')
  await user.selectOptions(
    requiredItem(selects, 2),
    scenario === 'Medical treatment' ? '2099-04-14' : '2099-05-10',
  )
  await user.selectOptions(
    requiredItem(selects, 3),
    scenario === 'Medical treatment' ? 'SYNTHETIC_MEDICAL_TREATMENT' : 'SYNTHETIC_TOURISM',
  )
  await user.selectOptions(
    requiredItem(selects, 4),
    scenario === 'Medical treatment' ? '2099-04-18' : '2099-05-17',
  )
  if (scenario === 'Medical treatment') {
    await user.click(screen.getByRole('radio', { name: 'Yes' }))
  }
  await user.click(screen.getByRole('button', { name: 'Continue to documents' }))
  await user.click(screen.getByRole('link', { name: 'Prepare documents' }))

  for (const button of screen.getAllByRole('button', { name: 'Run technical check' })) {
    await user.click(button)
  }
  await user.click(screen.getByRole('link', { name: 'Review application' }))
  expect(screen.getByRole('heading', { name: 'Review your demo application' })).toBeInTheDocument()
}

describe('A05 review and simulated submission', () => {
  it('shows the authoritative Medical answers, documents, and policy fee', async () => {
    const user = userEvent.setup()
    const store = createPersistenceStore(new MemoryStorage())
    render(<App services={createAppRuntime({ store })} />)
    await reachA05(user)

    expect(screen.getByRole('heading', { name: 'Medical treatment' })).toBeInTheDocument()
    expect(screen.getByText('Confirm the synthetic Medical treatment intent.')).toBeInTheDocument()
    expect(screen.getByText('18 April 2099 (fictional)')).toBeInTheDocument()
    expect(screen.getAllByText('Ready')).toHaveLength(3)
    expect(screen.getByText('73 SYNTHETIC_DEMO_CREDITS')).toBeInTheDocument()
    expect(screen.getByText('SYNTHETIC — NOT PAYABLE')).toBeInTheDocument()
    expect(requireCase(store).application.state).toBe('IN_PROGRESS')
  })

  it('uses the same review renderer for the five-answer, two-document Tourist case', async () => {
    const user = userEvent.setup()
    render(<App services={createAppRuntime({ store: createPersistenceStore(new MemoryStorage()) })} />)
    await reachA05(user, 'Tourism')

    expect(screen.getByRole('heading', { name: 'Tourism' })).toBeInTheDocument()
    expect(screen.getByText('Confirm the synthetic tourism intent.')).toBeInTheDocument()
    expect(screen.queryByText(/Medical treatment intent/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Synthetic hospital letter')).not.toBeInTheDocument()
    expect(screen.getAllByText('Ready')).toHaveLength(2)
    expect(screen.getByText('41 SYNTHETIC_DEMO_CREDITS')).toBeInTheDocument()
  })

  it('edits application details without recreating the Case and refreshes the review', async () => {
    const user = userEvent.setup()
    const store = createPersistenceStore(new MemoryStorage())
    render(<App services={createAppRuntime({ store })} />)
    await reachA05(user)
    const before = requireCase(store)

    await user.click(screen.getByRole('link', { name: 'Edit application details' }))
    expect(screen.getByRole('heading', { name: 'Tell us about this trip' })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'No' }))
    await user.click(screen.getByRole('button', { name: 'Continue to documents' }))
    await user.click(screen.getByRole('link', { name: 'Prepare documents' }))
    await user.click(screen.getByRole('button', { name: 'Prepare review' }))
    await user.click(screen.getByRole('link', { name: 'Review application' }))

    expect(screen.getByText('No')).toBeInTheDocument()
    const after = requireCase(store)
    expect(after.caseId).toBe(before.caseId)
    expect(after.auditEvents.filter(({ eventType }) => eventType === 'DraftCreated')).toHaveLength(1)
  })

  it('returns to prepared documents without creating another version and refreshes review', async () => {
    const user = userEvent.setup()
    const store = createPersistenceStore(new MemoryStorage())
    render(<App services={createAppRuntime({ store })} />)
    await reachA05(user)
    const before = requireCase(store)
    const versionCount = before.documents.reduce((total, document) => total + document.versions.length, 0)

    await user.click(screen.getByRole('link', { name: 'Edit documents' }))
    expect(screen.getByRole('heading', { name: 'Prepare your demo documents' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Return to review' }))
    expect(screen.getByRole('heading', { name: 'Review your demo application' })).toBeInTheDocument()
    const after = requireCase(store)
    expect(after.documents.reduce((total, document) => total + document.versions.length, 0)).toBe(versionCount)
  })

  it('requires confirmation, then submits once through the legal locked sequence', async () => {
    const user = userEvent.setup()
    const store = createPersistenceStore(new MemoryStorage())
    render(<App services={createAppRuntime({ store })} />)
    await reachA05(user)

    const submitButton = screen.getByRole('button', { name: 'Submit demo application' })
    expect(submitButton).toBeDisabled()
    await user.click(
      screen.getByRole('checkbox', {
        name: 'I confirm these synthetic demo details are ready for simulated submission.',
      }),
    )
    await user.dblClick(submitButton)

    expect(screen.getByRole('heading', { name: 'Complete the demo payment' })).toBeInTheDocument()
    window.history.back()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Application submitted in demo' })).toBeInTheDocument())
    expect(screen.getAllByText('Payment', { exact: true }).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByRole('button', { name: /Edit application details|Edit documents/ })).not.toBeInTheDocument()
    const persistedCase = requireCase(store)
    expect(persistedCase.application.state).toBe('LOCKED')
    expect(persistedCase.auditEvents.filter(({ eventType }) => eventType === 'ApplicationSubmitted')).toHaveLength(1)
    expect(persistedCase.auditEvents.filter(({ eventType }) => eventType === 'ApplicationLocked')).toHaveLength(1)
  })

  it('reloads the locked A05 state without another submission or editable action', async () => {
    const user = userEvent.setup()
    const storage = new MemoryStorage()
    const store = createPersistenceStore(storage)
    const firstRender = render(<App services={createAppRuntime({ store })} />)
    await reachA05(user)
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Submit demo application' }))
    window.history.back()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Application submitted in demo' })).toBeInTheDocument())
    const beforeReload = JSON.stringify(requireCase(store))

    firstRender.unmount()
    render(<App services={createAppRuntime({ store: createPersistenceStore(storage) })} />)
    expect(screen.getByRole('heading', { name: 'Application submitted in demo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Edit application details|Edit documents/ })).not.toBeInTheDocument()
    expect(JSON.stringify(requireCase(createPersistenceStore(storage)))).toBe(beforeReload)
  })
})
