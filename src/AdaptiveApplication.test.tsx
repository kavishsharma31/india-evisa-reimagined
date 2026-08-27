import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { createAppRuntime, type AppRuntimeServices } from './app/create-app-runtime'
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

function createTestServices(storage = new MemoryStorage()) {
  const store = createPersistenceStore(storage)
  return { storage, store, services: createAppRuntime({ store }) }
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
    throw new Error(`Expected form control at index ${index}.`)
  }
  return value
}

async function startApplication(
  user: ReturnType<typeof userEvent.setup>,
  scenarioName: 'Medical treatment' | 'Tourism' = 'Medical treatment',
) {
  await user.click(screen.getByRole('radio', { name: new RegExp(scenarioName, 'i') }))
  await user.click(screen.getByRole('link', { name: 'Continue' }))
  await user.click(screen.getByRole('button', { name: 'Continue application' }))
  await user.click(screen.getByRole('button', { name: 'Start application' }))
  expect(screen.getByRole('heading', { name: 'Tell us about this trip' })).toBeInTheDocument()
}

async function answerMedicalForm(user: ReturnType<typeof userEvent.setup>) {
  const selects = screen.getAllByRole('combobox')
  await user.selectOptions(requiredItem(selects, 0), 'SYN-POLICY-COHORT-A')
  await user.selectOptions(requiredItem(selects, 1), 'SYNTHETIC_STANDARD_PASSPORT')
  await user.selectOptions(requiredItem(selects, 2), '2099-04-14')
  await user.selectOptions(requiredItem(selects, 3), 'SYNTHETIC_MEDICAL_TREATMENT')
  await user.selectOptions(requiredItem(selects, 4), '2099-04-18')
  await user.click(screen.getByRole('radio', { name: 'Yes' }))
}

async function answerTouristForm(user: ReturnType<typeof userEvent.setup>) {
  const selects = screen.getAllByRole('combobox')
  await user.selectOptions(requiredItem(selects, 0), 'SYN-POLICY-COHORT-A')
  await user.selectOptions(requiredItem(selects, 1), 'SYNTHETIC_STANDARD_PASSPORT')
  await user.selectOptions(requiredItem(selects, 2), '2099-05-10')
  await user.selectOptions(requiredItem(selects, 3), 'SYNTHETIC_TOURISM')
  await user.selectOptions(requiredItem(selects, 4), '2099-05-17')
}

describe('A03 adaptive application', () => {
  it('renders the Medical manifest after the real create and begin-draft path', async () => {
    const user = userEvent.setup()
    const { services } = createTestServices()
    render(<App services={services} />)

    await startApplication(user)

    expect(screen.getByText('Application · Step 2 of 6', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Proposed hospital admission date', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Will a medical attendant travel with you?', { exact: true })).toBeInTheDocument()
    expect(screen.queryByText('QM-MEDICAL-1', { exact: true })).not.toBeInTheDocument()
    expect(screen.queryByText('SYN-MEDICAL-001', { exact: true })).not.toBeInTheDocument()
  })

  it('uses the same renderer for Tourist without Medical-only questions', async () => {
    const user = userEvent.setup()
    const { services } = createTestServices()
    render(<App services={services} />)

    await startApplication(user, 'Tourism')

    expect(screen.getByText('Purpose of visit', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Expected date of departure', { exact: true })).toBeInTheDocument()
    expect(screen.queryByText('Proposed hospital admission date', { exact: true })).not.toBeInTheDocument()
    expect(screen.queryByText('Will a medical attendant travel with you?', { exact: true })).not.toBeInTheDocument()
  })

  it('autosaves each changed answer once and does not duplicate an already-saved selection', async () => {
    const user = userEvent.setup()
    const { services, store } = createTestServices()
    render(<App services={services} />)
    await startApplication(user)

    const firstQuestion = requiredItem(screen.getAllByRole('combobox'), 0)
    await user.selectOptions(firstQuestion, 'SYN-POLICY-COHORT-A')

    expect(screen.getByText('Saved in this browser', { exact: true })).toBeInTheDocument()
    const afterFirstSave = requireCase(store)
    expect(afterFirstSave.application.draftSnapshots).toHaveLength(1)
    expect(afterFirstSave.application.draftSnapshots[0]?.answers).toEqual({
      'Q-SHARED-POLICY-COHORT': 'SYN-POLICY-COHORT-A',
    })

    await user.selectOptions(firstQuestion, 'SYN-POLICY-COHORT-A')
    expect(requireCase(store).application.draftSnapshots).toHaveLength(1)
  })

  it('shows an error summary, keeps A03 incomplete, and focuses the first invalid control', async () => {
    const user = userEvent.setup()
    const { services, store } = createTestServices()
    render(<App services={services} />)
    await startApplication(user)

    await user.click(screen.getByRole('button', { name: 'Continue to documents' }))

    expect(screen.getByRole('heading', { name: 'Check your answers' })).toBeInTheDocument()
    expect(screen.getByText('6 required answers need attention.', { exact: true })).toBeInTheDocument()
    expect(screen.getAllByRole('combobox')[0]).toHaveFocus()
    expect(screen.queryByRole('heading', { name: 'Application details saved' })).not.toBeInTheDocument()
    expect(requireCase(store).application.draftSnapshots).toHaveLength(0)
  })

  it('repopulates a partial saved draft without recreating or restarting its Case', async () => {
    const firstUser = userEvent.setup()
    const storage = new MemoryStorage()
    const firstStore = createPersistenceStore(storage)
    const firstView = render(<App services={createAppRuntime({ store: firstStore })} />)
    await startApplication(firstUser)
    const firstTwoQuestions = screen.getAllByRole('combobox').slice(0, 2)
    await firstUser.selectOptions(requiredItem(firstTwoQuestions, 0), 'SYN-POLICY-COHORT-A')
    await firstUser.selectOptions(requiredItem(firstTwoQuestions, 1), 'SYNTHETIC_STANDARD_PASSPORT')
    const beforeReload = requireCase(firstStore)
    firstView.unmount()

    const reloadedStore = createPersistenceStore(storage)
    const baseServices = createAppRuntime({ store: reloadedStore })
    const beginDraft = vi.fn(baseServices.runtime.beginDraft)
    const services: AppRuntimeServices = Object.freeze({
      ...baseServices,
      runtime: Object.freeze({ ...baseServices.runtime, beginDraft }),
    })
    render(<App services={services} />)

    const resumedQuestions = screen.getAllByRole('combobox')
    expect(resumedQuestions[0]).toHaveValue('SYN-POLICY-COHORT-A')
    expect(resumedQuestions[1]).toHaveValue('SYNTHETIC_STANDARD_PASSPORT')
    expect(resumedQuestions[2]).toHaveValue('')
    expect(beginDraft).not.toHaveBeenCalled()
    const afterReload = requireCase(reloadedStore)
    expect(afterReload.revision).toBe(beforeReload.revision)
    expect(afterReload.auditEvents.filter(({ eventType }) => eventType === 'DraftCreated')).toHaveLength(1)
    expect(afterReload.application.draftSnapshots).toHaveLength(2)
  })

  it('refreshes persisted answers when returning through the saved-case summary', async () => {
    const user = userEvent.setup()
    const { services, store } = createTestServices()
    render(<App services={services} />)
    await startApplication(user)
    await user.selectOptions(
      requiredItem(screen.getAllByRole('combobox'), 0),
      'SYN-POLICY-COHORT-A',
    )
    const beforeBack = requireCase(store)

    await user.click(requiredItem(screen.getAllByRole('link', { name: 'Back to requirements' }), 0))
    expect(screen.getByRole('heading', { name: 'Medical treatment' })).toBeInTheDocument()
    window.history.back()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Tell us about this trip' })).toBeInTheDocument())

    expect(requiredItem(screen.getAllByRole('combobox'), 0)).toHaveValue('SYN-POLICY-COHORT-A')
    const afterReturn = requireCase(store)
    expect(afterReturn.revision).toBe(beforeBack.revision)
    expect(afterReturn.application.draftSnapshots).toHaveLength(1)
  })

  it('completes with a Documents snapshot and reloads the same application route without mutation', async () => {
    const user = userEvent.setup()
    const storage = new MemoryStorage()
    const store = createPersistenceStore(storage)
    const firstView = render(<App services={createAppRuntime({ store })} />)
    await startApplication(user)
    await answerMedicalForm(user)
    await user.click(screen.getByRole('button', { name: 'Continue to documents' }))

    expect(screen.getByRole('heading', { name: 'Application details saved' })).toBeInTheDocument()
    expect(screen.getAllByText('Documents', { exact: true }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('link', { name: 'Prepare documents' })).toBeInTheDocument()
    const completedCase = requireCase(store)
    expect(completedCase.application.state).toBe('IN_PROGRESS')
    expect(completedCase.application.draftSnapshots.at(-1)?.currentStep).toBe('DOCUMENTS')
    expect(completedCase.application.draftSnapshots.at(-1)?.answers).toHaveProperty(
      'Q-MEDICAL-ATTENDANT-GUIDANCE',
      'YES_SYNTHETIC',
    )
    firstView.unmount()

    render(<App services={createAppRuntime({ store: createPersistenceStore(storage) })} />)
    expect(screen.getByRole('heading', { name: 'Application details saved' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Prepare documents' })).toBeInTheDocument()
  })

  it('completes the Tourist manifest through the shared snapshot path', async () => {
    const user = userEvent.setup()
    const { services, store } = createTestServices()
    render(<App services={services} />)
    await startApplication(user, 'Tourism')
    await answerTouristForm(user)
    await user.click(screen.getByRole('button', { name: 'Continue to documents' }))

    expect(screen.getByRole('heading', { name: 'Application details saved' })).toBeInTheDocument()
    const touristCase = requireCase(store)
    expect(touristCase.scenarioId).toBe('SYN-TOURIST-001')
    expect(touristCase.application.draftSnapshots.at(-1)?.currentStep).toBe('DOCUMENTS')
    expect(touristCase.application.draftSnapshots.at(-1)?.answers).not.toHaveProperty(
      'Q-MEDICAL-ADMISSION-DATE',
    )
  })

  it('keeps an unsaved answer visible and never claims success when snapshot saving is rejected', async () => {
    const user = userEvent.setup()
    const { services: baseServices, store } = createTestServices()
    const services: AppRuntimeServices = Object.freeze({
      ...baseServices,
      runtime: Object.freeze({
        ...baseServices.runtime,
        saveDraftSnapshot() {
          return Object.freeze({
            status: 'COMMAND_REJECTED' as const,
            operation: 'SaveSnapshot' as const,
            reasonCode: 'PERSISTENCE_VALIDATION_FAILED' as const,
            caseId: 'SYN-CASE-MED-001' as const,
            diagnostic: { issueCount: 1 },
          })
        },
      }),
    })
    render(<App services={services} />)
    await startApplication(user)

    const firstQuestion = requiredItem(screen.getAllByRole('combobox'), 0)
    await user.selectOptions(firstQuestion, 'SYN-POLICY-COHORT-A')

    expect(firstQuestion).toHaveValue('SYN-POLICY-COHORT-A')
    expect(screen.getByText(/Could not save changes/)).toBeInTheDocument()
    expect(screen.queryByText('Saved in this browser', { exact: true })).not.toBeInTheDocument()
    expect(requireCase(store).application.draftSnapshots).toHaveLength(0)
  })
})
