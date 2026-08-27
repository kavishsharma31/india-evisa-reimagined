import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import App from './App'
import {
  createAppRuntime,
  type AppRuntimeServices,
} from './app/create-app-runtime'
import { getSeed, RECOVERY_SEED_IDS } from './fixtures'
import {
  P0_STORAGE_KEY,
  createCanonicalPersistenceEnvelope,
  createPersistenceStore,
  type PersistenceService,
  type StoragePort,
} from './persistence'

const PROTOTYPE_NOTICE =
  'UNOFFICIAL HACKATHON PROTOTYPE — NO REAL APPLICATIONS OR PAYMENTS'

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
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

function createTestServices(storage = new MemoryStorage()) {
  const store = createPersistenceStore(storage)
  return {
    storage,
    store,
    services: createAppRuntime({ store }),
  }
}

function requireValidState(store: PersistenceService) {
  const result = store.load()
  if (result.status !== 'VALID_STATE') {
    throw new Error(`Expected valid state, received ${result.status}.`)
  }
  return result.state
}

async function openMedicalGuidance(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: /Medical treatment/i }))
  await user.click(screen.getByRole('link', { name: 'Continue' }))
  expect(
    screen.getByRole('heading', { level: 2, name: 'Medical treatment' }),
  ).toBeInTheDocument()
}

describe('applicant slice A00 and A01', () => {
  it('presents the persistent notice and exactly eight accessible scenario choices', () => {
    const { services } = createTestServices()
    render(<App services={services} />)

    expect(screen.getByRole('heading', { level: 1, name: 'India e-Visa Reimagined' })).toBeInTheDocument()
    expect(screen.getByText(PROTOTYPE_NOTICE, { exact: true })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(8)
    expect(screen.getAllByRole('radio').every((radio) => !radio.hasAttribute('checked'))).toBe(true)
    expect(screen.getByRole('radio', { name: /Medical treatment/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Tourism/i })).toBeInTheDocument()
    expect(screen.queryByText('Recommended demo', { exact: true })).not.toBeInTheDocument()
    expect(screen.queryByText('Shared journey check', { exact: true })).not.toBeInTheDocument()
  })

  it('renders Medical guidance from the actual policy evaluation result', async () => {
    const user = userEvent.setup()
    const { services } = createTestServices()
    render(<App services={services} />)

    await openMedicalGuidance(user)

    expect(
      screen.getByText('Requirements shown here are simplified and do not determine eligibility.', { exact: true }),
    ).toBeInTheDocument()
    expect(screen.getByText('Recent photograph', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Passport bio page', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Hospital letter', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Calculated before payment', { exact: true })).toBeInTheDocument()
    expect(screen.queryByText(/SYNTHETIC_DEMO_CREDITS/)).not.toBeInTheDocument()
    expect(screen.getByText(PROTOTYPE_NOTICE, { exact: true })).toBeInTheDocument()
  })

  it('reuses the same UI and policy machinery for Tourist without a hospital letter', async () => {
    const user = userEvent.setup()
    const { services } = createTestServices()
    render(<App services={services} />)

    await user.click(screen.getByRole('radio', { name: /Tourism/i }))
    await user.click(screen.getByRole('link', { name: 'Continue' }))

    expect(screen.getByRole('heading', { level: 2, name: 'Tourism' })).toBeInTheDocument()
    expect(screen.getByText('Recent photograph', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Passport bio page', { exact: true })).toBeInTheDocument()
    expect(screen.queryByText('Hospital letter', { exact: true })).not.toBeInTheDocument()
    expect(screen.getByText('Calculated before payment', { exact: true })).toBeInTheDocument()
  })

  it('does not offer continuation when policy evaluation rejects the selection', async () => {
    const user = userEvent.setup()
    const { services: baseServices } = createTestServices()
    const services: AppRuntimeServices = Object.freeze({
      ...baseServices,
      runtime: Object.freeze({
        ...baseServices.runtime,
        evaluateScenario() {
          return Object.freeze({
            status: 'POLICY_REJECTED' as const,
            scenarioId: 'SYN-MEDICAL-001' as const,
            scenarioSupport: 'NOT_SUPPORTED_IN_DEMO' as const,
            reasonCodes: ['R-SYN-NOT-SUPPORTED' as const],
          })
        },
      }),
    })
    render(<App services={services} />)

    await user.click(screen.getByRole('radio', { name: /Medical treatment/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'We could not confirm that purpose.',
    )
    expect(screen.queryByRole('button', { name: 'Continue application' })).not.toBeInTheDocument()
  })
})

describe('applicant slice A02 and resume', () => {
  it('creates and legally starts one new Medical case through explicit actions', async () => {
    const user = userEvent.setup()
    const { services, store } = createTestServices()
    render(<App services={services} />)

    await openMedicalGuidance(user)
    await user.click(screen.getByRole('button', { name: 'Continue application' }))

    expect(
      screen.getByRole('heading', { name: 'Your application has been created' }),
    ).toBeInTheDocument()
    expect(requireValidState(store).cases).toHaveLength(1)
    expect(requireValidState(store).cases[0]?.application.state).toBe('DRAFT_CREATED')

    await user.click(screen.getByRole('button', { name: 'Start application' }))

    expect(
      screen.getByRole('heading', { name: 'Tell us about this trip' }),
    ).toBeInTheDocument()
    const state = requireValidState(store)
    expect(state.cases).toHaveLength(1)
    expect(state.cases[0]).toMatchObject({
      caseId: 'SYN-CASE-MED-001',
      revision: 2,
      application: { state: 'IN_PROGRESS' },
    })
  })

  it('renders and resumes the same in-progress case after a simulated reload', async () => {
    const firstUser = userEvent.setup()
    const storage = new MemoryStorage()
    const firstStore = createPersistenceStore(storage)
    const firstRender = render(<App services={createAppRuntime({ store: firstStore })} />)

    await openMedicalGuidance(firstUser)
    await firstUser.click(screen.getByRole('button', { name: 'Continue application' }))
    await firstUser.click(screen.getByRole('button', { name: 'Start application' }))
    const beforeReload = storage.getItem(P0_STORAGE_KEY)
    firstRender.unmount()

    const reloadedStore = createPersistenceStore(storage)
    render(<App services={createAppRuntime({ store: reloadedStore })} />)

    expect(screen.getByRole('heading', { name: 'Tell us about this trip' })).toBeInTheDocument()
    expect(storage.getItem(P0_STORAGE_KEY)).toBe(beforeReload)
    expect(requireValidState(reloadedStore).cases).toHaveLength(1)
    expect(requireValidState(reloadedStore).cases[0]?.auditEvents).toHaveLength(2)
  })

  it('reuses an existing created case rather than duplicating DraftCreated evidence', async () => {
    const user = userEvent.setup()
    const { services, store } = createTestServices()
    expect(
      services.runtime.createCase({
        scenarioId: 'SYN-MEDICAL-001',
        idempotencyKey: 'SYN-IDEMPOTENCY-COMPONENT-PRECREATE-001',
      }).status,
    ).toBe('COMMAND_ACCEPTED')

    window.history.replaceState(null, '', '/application/SYN-CASE-MED-001')
    render(<App services={services} />)

    expect(screen.getByRole('heading', { name: 'Continue your application' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start application' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start application' }))

    const state = requireValidState(store)
    expect(state.cases).toHaveLength(1)
    expect(state.cases[0]?.auditEvents.filter(({ eventType }) => eventType === 'DraftCreated')).toHaveLength(1)
    expect(state.cases[0]?.application.state).toBe('IN_PROGRESS')
  })

  it('requires an explicit reset for corrupt state and never resets during initial read', async () => {
    const user = userEvent.setup()
    const storage = new MemoryStorage()
    const corruptValue = '{"untrusted":"SYN-MALFORMED-CONTENT"'
    storage.setItem(P0_STORAGE_KEY, corruptValue)
    const store = createPersistenceStore(storage)
    const baseServices = createAppRuntime({ store })
    let resetCalls = 0
    const services: AppRuntimeServices = Object.freeze({
      ...baseServices,
      resetDemoData() {
        resetCalls += 1
        return store.reset()
      },
    })

    render(<App services={services} />)

    expect(screen.getByRole('heading', { name: 'Saved application data cannot be read' })).toBeInTheDocument()
    expect(resetCalls).toBe(0)
    expect(storage.getItem(P0_STORAGE_KEY)).toBe(corruptValue)
    expect(document.body).not.toHaveTextContent('SYN-MALFORMED-CONTENT')

    await user.click(screen.getByRole('button', { name: 'Clear saved application data' }))

    expect(resetCalls).toBe(1)
    expect(screen.getByRole('heading', { name: 'Why are you travelling to India?' })).toBeInTheDocument()
    expect(requireValidState(store).cases).toEqual([])
  })

  it('explains when browser storage is unavailable without pretending progress can be saved', () => {
    const unavailableStorage: StoragePort = {
      getItem() {
        throw new Error('Synthetic storage unavailable.')
      },
      setItem() {
        throw new Error('Synthetic storage unavailable.')
      },
      removeItem() {
        throw new Error('Synthetic storage unavailable.')
      },
    }

    render(
      <App
        services={createAppRuntime({
          store: createPersistenceStore(unavailableStorage),
        })}
      />,
    )

    expect(
      screen.getByRole('heading', {
        name: 'Progress cannot be saved in this browser',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear saved application data' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue application' })).not.toBeInTheDocument()
  })
})

describe('D01 deterministic demo controls', () => {
  it('keeps controls out of the applicant URL and exposes exactly seven canonical seeds in demo mode', () => {
    const { services } = createTestServices()
    const applicantView = render(<App services={services} />)

    expect(screen.queryByRole('heading', { name: 'Demo controls' })).not.toBeInTheDocument()
    applicantView.unmount()

    window.history.replaceState(null, '', '/?demo=1')
    render(<App services={services} />)

    expect(screen.getByRole('heading', { name: 'Demo controls' })).toBeInTheDocument()
    expect(screen.getByText('Demo-only controls', { exact: true })).toBeInTheDocument()
    const seedOptions = screen
      .getAllByRole('option')
      .map((option) => option.getAttribute('value'))
      .filter((value): value is string => value?.startsWith('SEED-') === true)
    expect(seedOptions).toEqual(RECOVERY_SEED_IDS)
  })

  it('loads, switches, and reloads authoritative seeds without duplicates or unrelated-storage writes', async () => {
    const user = userEvent.setup()
    const storage = new MemoryStorage()
    storage.setItem('unrelated:preference', 'keep-me')
    const store = createPersistenceStore(storage)
    window.history.replaceState(null, '', '/?demo=1')
    const firstView = render(<App services={createAppRuntime({ store })} />)
    const seedSelect = screen.getByRole('combobox', { name: 'Canonical seed' })

    await user.selectOptions(seedSelect, 'SEED-MEDICAL-REUPLOAD-REQUESTED')

    expect(await screen.findByRole('heading', { name: 'Action required' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Replace hospital letter' })).toBeInTheDocument()
    expect(requireValidState(store)).toEqual(getSeed('SEED-MEDICAL-REUPLOAD-REQUESTED').envelope)
    const canonicalReuploadBytes = storage.getItem(P0_STORAGE_KEY)

    await user.selectOptions(seedSelect, 'SEED-MEDICAL-AMBIGUOUS-PAYMENT')
    expect(await screen.findByRole('heading', { name: 'Pay visa fee' })).toBeInTheDocument()
    expect(requireValidState(store).cases).toHaveLength(1)
    await user.selectOptions(seedSelect, 'SEED-MEDICAL-REUPLOAD-REQUESTED')
    expect(storage.getItem(P0_STORAGE_KEY)).toBe(canonicalReuploadBytes)
    expect(storage.getItem('unrelated:preference')).toBe('keep-me')

    firstView.unmount()
    render(<App services={createAppRuntime({ store: createPersistenceStore(storage) })} />)

    expect(await screen.findByRole('heading', { name: 'Action required' })).toBeInTheDocument()
    expect(storage.getItem(P0_STORAGE_KEY)).toBe(canonicalReuploadBytes)
  })

  it('uses canonical reset behavior and leaves unrelated storage untouched', async () => {
    const user = userEvent.setup()
    const storage = new MemoryStorage()
    storage.setItem('unrelated:preference', 'keep-me')
    const store = createPersistenceStore(storage)
    window.history.replaceState(null, '', '/?demo=1')
    render(<App services={createAppRuntime({ store })} />)

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Canonical seed' }),
      'SEED-MEDICAL-STATUS-RECOVERY',
    )
    await user.click(screen.getByRole('button', { name: 'Reset demo' }))

    expect(
      screen.getByRole('heading', { name: 'Why are you travelling to India?' }),
    ).toBeInTheDocument()
    expect(requireValidState(store)).toEqual(createCanonicalPersistenceEnvelope())
    expect(storage.getItem('unrelated:preference')).toBe('keep-me')
  })
})
