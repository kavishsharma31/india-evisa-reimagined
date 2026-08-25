import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { StatusApplication } from './app/StatusApplication'
import { createAppRuntime } from './app/create-app-runtime'
import type { SyntheticId } from './domain'
import {
  MEDICAL_CONTROLLED_ANSWERS,
  TOURIST_CONTROLLED_ANSWERS,
  getSeed,
} from './fixtures'
import {
  createPersistenceStore,
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

function prepareStatus(scenarioId: 'SYN-MEDICAL-001' | 'SYN-TOURIST-001') {
  const store = createPersistenceStore(new MemoryStorage())
  const services = createAppRuntime({ store })
  const medical = scenarioId === 'SYN-MEDICAL-001'
  const caseId: SyntheticId = medical ? 'SYN-CASE-MED-001' : 'SYN-CASE-TOURIST-001'
  const suffix = medical ? 'MED' : 'TOURIST'
  const answers = medical ? MEDICAL_CONTROLLED_ANSWERS : TOURIST_CONTROLLED_ANSWERS
  services.runtime.createCase({ scenarioId, idempotencyKey: `SYN-A07-UI-CREATE-${suffix}` })
  services.runtime.beginDraft({ caseId, idempotencyKey: `SYN-A07-UI-BEGIN-${suffix}` })
  services.runtime.saveDraftSnapshot({
    caseId,
    idempotencyKey: `SYN-A07-UI-DOCUMENTS-${suffix}`,
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
      idempotencyKey: `SYN-A07-UI-DOCUMENT-${suffix}-${requirementId}`,
    })
  }
  services.runtime.prepareReview({ caseId, idempotencyKey: `SYN-A07-UI-REVIEW-${suffix}` })
  services.runtime.submitApplication({ caseId, idempotencyKey: `SYN-A07-UI-SUBMIT-${suffix}` })
  services.runtime.startMockPayment({ caseId })
  services.runtime.checkMockPaymentStatus({ caseId })
  services.runtime.beginScrutiny({ caseId })
  return { services, caseId }
}

function renderStatus(scenarioId: 'SYN-MEDICAL-001' | 'SYN-TOURIST-001') {
  const prepared = prepareStatus(scenarioId)
  render(
    <StatusApplication
      services={prepared.services}
      caseId={prepared.caseId}
      onOpenCorrection={() => undefined}
      onRecoveryRequired={() => undefined}
    />,
  )
  return prepared
}

describe('A07 unified applicant status', () => {
  it('shows the Medical in-review projection and a prominent explicit wait', () => {
    renderStatus('SYN-MEDICAL-001')

    expect(screen.getByRole('heading', { name: 'Track your demo application' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Under review' })).toBeInTheDocument()
    expect(screen.getByText('Your synthetic application is being reviewed.')).toBeInTheDocument()
    expect(screen.getByText('Nothing needed from you')).toBeInTheDocument()
    expect(screen.getByText('No action is needed now. Synthetic scrutiny is continuing.')).toBeInTheDocument()
    expect(screen.getByText('Application submitted')).toBeInTheDocument()
    expect(screen.getByText('Payment confirmed')).toBeInTheDocument()
    expect(screen.getByText('Documents under review')).toBeInTheDocument()
    expect(screen.getByText('ETA not ready')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Replace hospital letter' })).not.toBeInTheDocument()
  })

  it('reuses the same status component for Tourist', () => {
    renderStatus('SYN-TOURIST-001')

    expect(screen.getByText('Tourism')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Under review' })).toBeInTheDocument()
    expect(screen.getByText('Documents under review')).toBeInTheDocument()
    expect(screen.queryByText('Medical treatment')).not.toBeInTheDocument()
  })

  it('renders the canonical status-recovery seed through the same projection without an action', () => {
    const store = createPersistenceStore(new MemoryStorage())
    expect(store.save(getSeed('SEED-MEDICAL-STATUS-RECOVERY').envelope).status).toBe('SAVED')
    const services = createAppRuntime({ store })
    render(
      <StatusApplication
        services={services}
        caseId="SYN-CASE-MED-001"
        onOpenCorrection={() => undefined}
        onRecoveryRequired={() => undefined}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Under review' })).toBeInTheDocument()
    expect(screen.getByText('Nothing needed from you')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Replace hospital letter' })).not.toBeInTheDocument()
  })

  it('projects the canonical re-upload seed as one specific applicant action', async () => {
    const store = createPersistenceStore(new MemoryStorage())
    expect(store.save(getSeed('SEED-MEDICAL-REUPLOAD-REQUESTED').envelope).status).toBe('SAVED')
    const services = createAppRuntime({ store })
    const onOpenCorrection = vi.fn()
    render(
      <StatusApplication
        services={services}
        caseId="SYN-CASE-MED-001"
        onOpenCorrection={onOpenCorrection}
        onRecoveryRequired={() => undefined}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Action required' })).toBeInTheDocument()
    expect(screen.getByText('Your synthetic hospital letter needs one correction.')).toBeInTheDocument()
    expect(screen.getByText(/admission date on the demo hospital letter/)).toBeInTheDocument()
    expect(screen.queryByText('DOC_HOSPITAL_ADMISSION_DATE_UNCLEAR_SYNTHETIC')).not.toBeInTheDocument()
    const action = screen.getByRole('button', { name: 'Replace hospital letter' })
    expect(screen.getAllByRole('button')).toHaveLength(1)
    await userEvent.click(action)
    expect(onOpenCorrection).toHaveBeenCalledOnce()
  })

  it('uses the low-priority demo control to record the deterministic Medical review outcome', async () => {
    renderStatus('SYN-MEDICAL-001')
    await userEvent.click(screen.getByText('Demo review control'))
    await userEvent.click(
      screen.getByRole('button', { name: 'Simulate hospital-letter review outcome' }),
    )

    expect(screen.getByRole('heading', { name: 'Action required' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Replace hospital letter' })).toBeInTheDocument()
    expect(screen.getByText(/Simulated delivery failed/)).toBeInTheDocument()
  })
})

describe('A09 synthetic approval and ETA outcome', () => {
  it('completes corrected Medical review and renders the non-valid ETA artifact', async () => {
    const prepared = prepareStatus('SYN-MEDICAL-001')
    prepared.services.runtime.requestMedicalCorrection({ caseId: prepared.caseId })
    prepared.services.runtime.prepareCorrection({
      caseId: prepared.caseId,
      fixtureId: 'SYN-FIXTURE-HOSPITAL-LETTER-V2-001',
    })
    prepared.services.runtime.submitCorrection({ caseId: prepared.caseId })
    render(
      <StatusApplication
        services={prepared.services}
        caseId={prepared.caseId}
        onOpenCorrection={() => undefined}
        onRecoveryRequired={() => undefined}
      />,
    )

    await userEvent.click(screen.getByText('Demo review control'))
    await userEvent.click(screen.getByRole('button', { name: 'Complete synthetic review' }))

    const approvedHeading = screen.getByRole('heading', { name: 'Demo application approved' })
    expect(approvedHeading).toHaveFocus()
    expect(screen.getByRole('heading', { name: 'Synthetic ETA issued' })).toBeInTheDocument()
    expect(screen.getByText(
      'SYNTHETIC — NOT VALID. This is not a visa or travel document.',
    )).toBeInTheDocument()
    expect(screen.getByText(
      'Entry into India is decided separately at the border.',
    )).toBeInTheDocument()
    expect(screen.getByText('SYN-ETA-MED-001')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Under review' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Action required' })).not.toBeInTheDocument()
  })

  it('renders Tourist through the same issued-outcome component with safe metadata only', async () => {
    renderStatus('SYN-TOURIST-001')
    await userEvent.click(screen.getByText('Demo review control'))
    await userEvent.click(screen.getByRole('button', { name: 'Complete synthetic review' }))

    expect(screen.getAllByText('Tourism')).toHaveLength(2)
    expect(screen.getByText('SYN-ETA-TOURIST-001')).toBeInTheDocument()
    expect(screen.getAllByText(/SYN-EVISA-POLICY@1\.0\.0/)).toHaveLength(2)
    expect(screen.getByText(
      'SYNTHETIC — NOT VALID. This is not a visa or travel document.',
    )).toBeInTheDocument()
    expect(screen.queryByText(/passport number/i)).not.toBeInTheDocument()
  })
})
