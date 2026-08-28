import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import App from './App'
import { createAppRuntime } from './app/create-app-runtime'
import { addLocalDays, isoDateFromLocalDate } from './policy/question-validation'
import {
  createPersistenceStore,
  type PersistenceService,
  type StoragePort,
} from './persistence'

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

beforeEach(() => {
  window.history.replaceState(null, '', '/?demo=1')
})

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

async function reachA05(
  user: ReturnType<typeof userEvent.setup>,
  scenario: 'Medical treatment' | 'Tourism' = 'Medical treatment',
) {
  window.history.replaceState(null, '', '/?demo=1')
  window.dispatchEvent(new PopStateEvent('popstate'))
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Why are you travelling to India?' })).toBeInTheDocument())
  await user.click(screen.getByRole('radio', { name: new RegExp(scenario, 'i') }))
  await user.click(screen.getByRole('link', { name: 'Continue' }))
  await user.click(screen.getByRole('button', { name: 'Continue application' }))
  await user.click(screen.getByRole('button', { name: 'Start application' }))

  await user.selectOptions(screen.getByLabelText(/Country of nationality/), 'NAT-UNITED-KINGDOM')
  await user.selectOptions(screen.getByLabelText(/Passport type/), 'PASSPORT-ORDINARY')
  await user.type(
    screen.getByLabelText(/Expected date of arrival/),
    isoDateFromLocalDate(addLocalDays(new Date(), 10)),
  )
  if (scenario === 'Medical treatment') {
    await user.type(screen.getByLabelText(/Type of medical treatment required/), 'Cardiac consultation')
    await user.type(
      screen.getByLabelText(/Proposed hospital admission date/),
      isoDateFromLocalDate(addLocalDays(new Date(), 12)),
    )
    await user.click(screen.getByRole('radio', { name: 'Yes' }))
  } else {
    await user.selectOptions(screen.getByLabelText(/Purpose of visit/), 'TOURIST-LEISURE')
    await user.type(
      screen.getByLabelText(/Expected date of departure/),
      isoDateFromLocalDate(addLocalDays(new Date(), 17)),
    )
  }
  await user.click(screen.getByRole('button', { name: 'Continue to documents' }))
  await user.click(screen.getByRole('link', { name: 'Prepare documents' }))

  for (const button of screen.getAllByRole('button', { name: 'Check document' })) {
    await user.click(button)
  }
  await user.click(screen.getByRole('link', { name: 'Review application' }))
  expect(screen.getByRole('heading', { name: 'Review your application' })).toBeInTheDocument()
}

describe('A05 review and simulated submission', () => {
  it('shows the authoritative Medical answers, documents, and policy fee', async () => {
    const user = userEvent.setup()
    const store = createPersistenceStore(new MemoryStorage())
    render(<App services={createAppRuntime({ store })} />)
    await reachA05(user)

    expect(screen.getByRole('heading', { name: 'Medical treatment' })).toBeInTheDocument()
    expect(screen.getByText('Type of medical treatment required')).toBeInTheDocument()
    expect(screen.getByText('Cardiac consultation')).toBeInTheDocument()
    expect(screen.getAllByText('Ready')).toHaveLength(3)
    expect(screen.getByRole('heading', { name: 'Not calculated in this prototype' })).toBeInTheDocument()
    expect(requireCase(store).application.state).toBe('IN_PROGRESS')
  })

  it('uses the same review renderer for the five-answer, two-document Tourist case', async () => {
    const user = userEvent.setup()
    render(<App services={createAppRuntime({ store: createPersistenceStore(new MemoryStorage()) })} />)
    await reachA05(user, 'Tourism')

    expect(screen.getByRole('heading', { name: 'Tourism' })).toBeInTheDocument()
    expect(screen.getByText('Purpose of visit')).toBeInTheDocument()
    expect(screen.queryByText(/Medical treatment intent/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Hospital letter')).not.toBeInTheDocument()
    expect(screen.getAllByText('Ready')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Not calculated in this prototype' })).toBeInTheDocument()
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
    expect(screen.getByRole('heading', { name: 'Prepare your documents' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Return to review' }))
    expect(screen.getByRole('heading', { name: 'Review your application' })).toBeInTheDocument()
    const after = requireCase(store)
    expect(after.documents.reduce((total, document) => total + document.versions.length, 0)).toBe(versionCount)
  })

  it('requires confirmation, then submits once through the legal locked sequence', async () => {
    const user = userEvent.setup()
    const store = createPersistenceStore(new MemoryStorage())
    render(<App services={createAppRuntime({ store })} />)
    await reachA05(user)

    const submitButton = screen.getByRole('button', { name: 'Submit application' })
    expect(submitButton).toBeDisabled()
    await user.click(
      screen.getByRole('checkbox', {
        name: 'I confirm these application details are complete and ready to submit.',
      }),
    )
    await user.dblClick(submitButton)

    expect(screen.getByRole('heading', { name: 'Pay visa fee' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Back to review' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Application submitted' })).toBeInTheDocument())
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
    window.history.replaceState(null, '', '/?demo=1')
    const firstRender = render(<App services={createAppRuntime({ store })} />)
    await reachA05(user)
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Submit application' }))
    await user.click(screen.getByRole('link', { name: 'Back to review' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Application submitted' })).toBeInTheDocument())
    const beforeReload = JSON.stringify(requireCase(store))

    firstRender.unmount()
    render(<App services={createAppRuntime({ store: createPersistenceStore(storage) })} />)
    expect(screen.getByRole('heading', { name: 'Application submitted' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Edit application details|Edit documents/ })).not.toBeInTheDocument()
    expect(JSON.stringify(requireCase(createPersistenceStore(storage)))).toBe(beforeReload)
  })
})
