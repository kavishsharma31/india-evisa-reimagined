import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import App from './App'
import {
  createAppRuntime,
  type AppRuntimeServices,
} from './app/create-app-runtime'
import {
  P0_STORAGE_KEY,
  createPersistenceStore,
  type PersistenceService,
  type StoragePort,
} from './persistence'

const PROTOTYPE_NOTICE =
  'UNOFFICIAL HACKATHON PROTOTYPE — SYNTHETIC DATA ONLY — CANNOT SUBMIT A VISA APPLICATION'

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
  expect(
    screen.getByRole('heading', { level: 2, name: 'Medical treatment' }),
  ).toBeInTheDocument()
}

describe('applicant slice A00 and A01', () => {
  it('presents the persistent notice and exactly two accessible scenario choices', () => {
    const { services } = createTestServices()
    render(<App services={services} />)

    expect(screen.getByRole('heading', { level: 1, name: 'India e-Visa Reimagined' })).toBeInTheDocument()
    expect(screen.getByText(PROTOTYPE_NOTICE, { exact: true })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(2)
    expect(screen.getByRole('radio', { name: /Medical treatment/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Tourism/i })).toBeInTheDocument()
    expect(screen.getByText('Recommended demo', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Shared journey check', { exact: true })).toBeInTheDocument()
  })

  it('renders Medical guidance from the actual policy evaluation result', async () => {
    const user = userEvent.setup()
    const { services } = createTestServices()
    render(<App services={services} />)

    await openMedicalGuidance(user)

    expect(
      screen.getByText(
        'This purpose is supported by the selected demo scenario. It is not a legal eligibility decision.',
        { exact: true },
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Synthetic portrait', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Synthetic passport page', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Synthetic hospital letter', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('73 SYNTHETIC_DEMO_CREDITS', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('SYNTHETIC — NOT PAYABLE', { exact: true })).toBeInTheDocument()
    expect(screen.getByText(PROTOTYPE_NOTICE, { exact: true })).toBeInTheDocument()
  })

  it('reuses the same UI and policy machinery for Tourist without a hospital letter', async () => {
    const user = userEvent.setup()
    const { services } = createTestServices()
    render(<App services={services} />)

    await user.click(screen.getByRole('radio', { name: /Tourism/i }))

    expect(screen.getByRole('heading', { level: 2, name: 'Tourism' })).toBeInTheDocument()
    expect(screen.getByText('Synthetic portrait', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Synthetic passport page', { exact: true })).toBeInTheDocument()
    expect(screen.queryByText('Synthetic hospital letter', { exact: true })).not.toBeInTheDocument()
    expect(screen.getByText('41 SYNTHETIC_DEMO_CREDITS', { exact: true })).toBeInTheDocument()
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
      'We could not confirm support for that demo scenario.',
    )
    expect(screen.queryByRole('button', { name: 'Continue with this demo' })).not.toBeInTheDocument()
  })
})

describe('applicant slice A02 and resume', () => {
  it('creates and legally starts one new Medical case through explicit actions', async () => {
    const user = userEvent.setup()
    const { services, store } = createTestServices()
    render(<App services={services} />)

    await openMedicalGuidance(user)
    await user.click(screen.getByRole('button', { name: 'Continue with this demo' }))

    expect(
      screen.getByRole('heading', { name: 'Your synthetic application has been created' }),
    ).toBeInTheDocument()
    expect(requireValidState(store).cases).toHaveLength(1)
    expect(requireValidState(store).cases[0]?.application.state).toBe('DRAFT_CREATED')

    await user.click(screen.getByRole('button', { name: 'Start application' }))

    expect(
      screen.getByRole('heading', { name: 'Your application is ready to continue' }),
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
    await firstUser.click(screen.getByRole('button', { name: 'Continue with this demo' }))
    await firstUser.click(screen.getByRole('button', { name: 'Start application' }))
    const beforeReload = storage.getItem(P0_STORAGE_KEY)
    firstRender.unmount()

    const secondUser = userEvent.setup()
    const reloadedStore = createPersistenceStore(storage)
    render(<App services={createAppRuntime({ store: reloadedStore })} />)

    expect(screen.getByRole('heading', { name: 'Continue your application' })).toBeInTheDocument()
    expect(screen.getByText('SYN-CASE-MED-001', { exact: true })).toBeInTheDocument()
    await secondUser.click(screen.getByRole('button', { name: 'Resume application' }))
    expect(screen.getByRole('heading', { name: 'Your application is ready to continue' })).toBeInTheDocument()
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

    render(<App services={services} />)

    expect(screen.getByRole('heading', { name: 'Continue your application' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue setup' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue setup' }))

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

    expect(screen.getByRole('heading', { name: 'Saved demo data cannot be read' })).toBeInTheDocument()
    expect(resetCalls).toBe(0)
    expect(storage.getItem(P0_STORAGE_KEY)).toBe(corruptValue)
    expect(document.body).not.toHaveTextContent('SYN-MALFORMED-CONTENT')

    await user.click(screen.getByRole('button', { name: 'Reset demo data' }))

    expect(resetCalls).toBe(1)
    expect(screen.getByRole('heading', { name: 'What are you travelling to India for?' })).toBeInTheDocument()
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
    expect(screen.queryByRole('button', { name: 'Reset demo data' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue with this demo' })).not.toBeInTheDocument()
  })
})
