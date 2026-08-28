import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import App from './App'
import { createAppRuntime, type AppRuntimeServices } from './app/create-app-runtime'
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

async function reachA04(
  user: ReturnType<typeof userEvent.setup>,
  scenario: 'Medical treatment' | 'Tourism' = 'Medical treatment',
) {
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
  expect(screen.getByRole('heading', { name: 'Prepare your documents' })).toBeInTheDocument()
}

function documentCard(name: string): HTMLElement {
  const heading = screen.getByRole('heading', { level: 3, name })
  const card = heading.closest('article')
  if (card === null) {
    throw new Error(`Expected a document card for ${name}.`)
  }
  return card
}

async function checkCurrentFixture(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  await user.click(within(documentCard(name)).getByRole('button', { name: /Check document|Check replacement/ }))
}

describe('A04 document preparation', () => {
  it('renders all Medical policy requirements and reaches the derived ready state', async () => {
    const user = userEvent.setup()
    const store = createPersistenceStore(new MemoryStorage())
    render(<App services={createAppRuntime({ store })} />)
    await reachA04(user)

    expect(screen.getByRole('heading', { level: 3, name: 'Recent photograph' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Passport bio page' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Hospital letter' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Provided hospital letter' })).toBeInTheDocument()
    expect(screen.queryByText(/hospital letter V2/i)).not.toBeInTheDocument()

    await checkCurrentFixture(user, 'Recent photograph')
    await checkCurrentFixture(user, 'Passport bio page')
    await checkCurrentFixture(user, 'Hospital letter')

    expect(screen.getByRole('heading', { name: 'Documents ready' })).toBeInTheDocument()
    expect(screen.getByText('All required documents are ready.')).toBeInTheDocument()
    expect(screen.getAllByText('Review', { exact: true }).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByRole('heading', { name: /Review your application/i })).not.toBeInTheDocument()
    expect(requireCase(store).application.state).toBe('IN_PROGRESS')
  })

  it('uses the same renderer for the two-document Tourist manifest', async () => {
    const user = userEvent.setup()
    const store = createPersistenceStore(new MemoryStorage())
    render(<App services={createAppRuntime({ store })} />)
    await reachA04(user, 'Tourism')

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2)
    expect(screen.getByRole('heading', { level: 3, name: 'Recent photograph' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Passport bio page' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3, name: 'Hospital letter' })).not.toBeInTheDocument()

    await checkCurrentFixture(user, 'Recent photograph')
    await checkCurrentFixture(user, 'Passport bio page')
    expect(screen.getByRole('heading', { name: 'Documents ready' })).toBeInTheDocument()
  })

  it('shows the controlled passport defect and preserves the superseded version after correction', async () => {
    const user = userEvent.setup()
    const store = createPersistenceStore(new MemoryStorage())
    render(<App services={createAppRuntime({ store })} />)
    await reachA04(user)

    const passportCard = documentCard('Passport bio page')
    const selector = within(passportCard).getByRole('combobox', { name: 'Sample document' })
    await user.selectOptions(selector, 'SYN-FIXTURE-PASSPORT-UNCLEAR-001')
    await checkCurrentFixture(user, 'Passport bio page')

    expect(within(documentCard('Passport bio page')).getByText('Needs attention')).toBeInTheDocument()
    expect(
      screen.getByText(
        'This passport bio page is too unclear to check. Choose the clearer copy and try again.',
      ),
    ).toBeInTheDocument()

    await user.selectOptions(selector, 'SYN-FIXTURE-PASSPORT-VALID-001')
    await checkCurrentFixture(user, 'Passport bio page')
    expect(within(documentCard('Passport bio page')).getByText('Ready')).toBeInTheDocument()

    const passport = requireCase(store).documents.find(
      ({ requirementId }) => requirementId === 'REQ-PASSPORT-PAGE-1',
    )
    expect(passport?.versions).toHaveLength(2)
    expect(passport?.versions.map(({ state }) => state)).toEqual([
      'SUPERSEDED',
      'PREFLIGHT_PASSED',
    ])
  })

  it('restores prepared state on reload without creating a duplicate version or event', async () => {
    const user = userEvent.setup()
    const storage = new MemoryStorage()
    const store = createPersistenceStore(storage)
    const firstRender = render(<App services={createAppRuntime({ store })} />)
    await reachA04(user)
    await checkCurrentFixture(user, 'Recent photograph')

    const beforeReload = JSON.stringify(requireCase(store))
    firstRender.unmount()
    render(<App services={createAppRuntime({ store: createPersistenceStore(storage) })} />)

    expect(screen.getByRole('heading', { name: 'Prepare your documents' })).toBeInTheDocument()
    expect(within(documentCard('Recent photograph')).getByText('Ready')).toBeInTheDocument()
    expect(JSON.stringify(requireCase(createPersistenceStore(storage)))).toBe(beforeReload)
  })

  it('does not offer another mutation for the already-current checked fixture', async () => {
    const user = userEvent.setup()
    const store = createPersistenceStore(new MemoryStorage())
    render(<App services={createAppRuntime({ store })} />)
    await reachA04(user)
    await checkCurrentFixture(user, 'Recent photograph')

    const prepared = requireCase(store)
    const revision = prepared.revision
    const eventCount = prepared.auditEvents.length
    expect(
      within(documentCard('Recent photograph')).getByRole('button', {
        name: 'Document checked',
      }),
    ).toBeDisabled()
    expect(requireCase(store).revision).toBe(revision)
    expect(requireCase(store).auditEvents).toHaveLength(eventCount)
  })

  it('reports an unavailable local inspection without marking the document Ready', async () => {
    const user = userEvent.setup()
    const store = createPersistenceStore(new MemoryStorage())
    const baseServices = createAppRuntime({ store })
    const services: AppRuntimeServices = Object.freeze({
      ...baseServices,
      runtime: Object.freeze({
        ...baseServices.runtime,
        prepareDocumentFixture() {
          return Object.freeze({
            status: 'COMMAND_REJECTED' as const,
            operation: 'PrepareDocument' as const,
            reasonCode: 'DOCUMENT_INSPECTION_UNAVAILABLE' as const,
            caseId: 'SYN-CASE-MED-001' as const,
            diagnostic: Object.freeze({}),
          })
        },
      }),
    })
    render(<App services={services} />)
    await reachA04(user)

    await checkCurrentFixture(user, 'Recent photograph')
    expect(
      screen.getByText('The document check is unavailable. Nothing was marked Ready.'),
    ).toBeInTheDocument()
    expect(within(documentCard('Recent photograph')).getByText('Not checked')).toBeInTheDocument()
    expect(requireCase(store).documents).toEqual([])
  })
})
