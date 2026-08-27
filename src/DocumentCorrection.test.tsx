import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import { DocumentCorrection } from './app/DocumentCorrection'
import { createAppRuntime } from './app/create-app-runtime'
import { getSeed } from './fixtures'
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
    throw new Error('Expected the canonical Medical correction Case.')
  }
  return loaded.state.cases[0]
}

function renderCorrection() {
  const store = createPersistenceStore(new MemoryStorage())
  expect(store.save(getSeed('SEED-MEDICAL-REUPLOAD-REQUESTED').envelope).status).toBe('SAVED')
  const services = createAppRuntime({ store })
  const onCorrectionSubmitted = vi.fn()
  render(
    <MemoryRouter>
      <DocumentCorrection
        services={services}
        caseId="SYN-CASE-MED-001"
        statusPath="/status"
        onCorrectionSubmitted={onCorrectionSubmitted}
        onRecoveryRequired={() => undefined}
      />
    </MemoryRouter>,
  )
  return { services, store, onCorrectionSubmitted }
}

describe('A08 document correction', () => {
  it('shows V1 as needing correction and offers only the bundled hospital V2 replacement', () => {
    renderCorrection()

    expect(screen.getByRole('heading', { name: 'Replace your hospital letter' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Hospital letter V1' })).toBeInTheDocument()
    expect(screen.getByText('Needs correction')).toBeInTheDocument()
    expect(screen.getByText('Hospital letter V2 — corrected demo')).toBeInTheDocument()
    expect(screen.getByText('SYNTHETIC — NOT VALID')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use corrected demo letter' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /V1/ })).not.toBeInTheDocument()
    expect(document.querySelector('input[type="file"]')).toBeNull()
  })

  it('prepares V2 through local preflight while retaining superseded V1 history', async () => {
    const { store } = renderCorrection()
    await userEvent.click(screen.getByRole('button', { name: 'Use corrected demo letter' }))

    expect(screen.getByText('Correction ready')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit correction' })).toBeInTheDocument()
    expect(screen.getByText(/V1 remains preserved in version history as superseded/)).toBeInTheDocument()
    const hospital = requireCase(store).documents.find(
      ({ requirementId }) => requirementId === 'REQ-HOSPITAL-LETTER-1',
    )
    expect(hospital?.versions.map(({ state }) => state)).toEqual([
      'SUPERSEDED',
      'PREFLIGHT_PASSED',
    ])
  })

  it('submits the prepared correction and returns control to unified status', async () => {
    const { services, store, onCorrectionSubmitted } = renderCorrection()
    await userEvent.click(screen.getByRole('button', { name: 'Use corrected demo letter' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit correction' }))

    expect(onCorrectionSubmitted).toHaveBeenCalledOnce()
    const persistedCase = requireCase(store)
    expect(persistedCase.scrutiny.state).toBe('IN_REVIEW')
    expect(persistedCase.documents.at(-1)?.versions.map(({ state }) => state)).toEqual([
      'SUPERSEDED',
      'UNDER_REVIEW',
    ])
    expect(services.runtime.inspectStatus({ caseId: persistedCase.caseId })).toMatchObject({
      status: 'STATUS_INSPECTED',
      headline: 'Under review',
      applicantActionRequired: false,
      waitMessage: 'No action is needed now. Synthetic scrutiny is continuing.',
    })
  })
})
