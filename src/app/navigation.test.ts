import { describe, expect, it } from 'vitest'

import { createPersistenceStore, type StoragePort } from '../persistence'
import { getSeed } from '../fixtures'
import { createAppRuntime } from './create-app-runtime'
import {
  SCENARIOS,
  applicationPath,
  guardedDestination,
  projectCaseNavigation,
  projectScenarioNavigation,
  scenarioFromSlug,
  withPreservedDemo,
} from './navigation'

class MemoryStorage implements StoragePort {
  readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

function seeded(seedId: Parameters<typeof getSeed>[0]) {
  const storage = new MemoryStorage()
  const store = createPersistenceStore(storage)
  expect(store.save(getSeed(seedId).envelope).status).toBe('SAVED')
  return { storage, store, services: createAppRuntime({ store }) }
}

describe('route guard and navigation projection', () => {
  it('keeps the extensible scenario slug catalogue explicit', () => {
    expect(scenarioFromSlug('medical')?.id).toBe('SYN-MEDICAL-001')
    expect(scenarioFromSlug('tourist')?.id).toBe('SYN-TOURIST-001')
    expect(scenarioFromSlug('unknown')).toBeNull()
  })

  it('preserves demo mode only when it is already active', () => {
    expect(withPreservedDemo('/apply/medical', '')).toBe('/apply/medical')
    expect(withPreservedDemo('/apply/medical', '?demo=1')).toBe('/apply/medical?demo=1')
    expect(withPreservedDemo('/apply/medical', '?demo=0')).toBe('/apply/medical')
  })

  it('does not create a case while projecting an unknown case URL', () => {
    const storage = new MemoryStorage()
    const store = createPersistenceStore(storage)
    const services = createAppRuntime({ store })
    const before = JSON.stringify(store.load())

    expect(projectCaseNavigation(services, 'SYN-CASE-UNKNOWN-001')).toEqual({
      status: 'CASE_NOT_FOUND',
    })
    expect(JSON.stringify(store.load())).toBe(before)
  })

  it('finds every category through the shared scenario slot without mutating persistence', () => {
    const storage = new MemoryStorage()
    const store = createPersistenceStore(storage)
    const services = createAppRuntime({ store })
    for (const scenario of SCENARIOS) {
      expect(services.runtime.createCase({
        scenarioId: scenario.id,
        idempotencyKey: `SYN-IDEMPOTENCY-NAVIGATION-${scenario.id}`,
      }).status).toBe('COMMAND_ACCEPTED')
    }
    const beforeProjection = JSON.stringify(store.load())

    for (const scenario of SCENARIOS) {
      const projection = projectScenarioNavigation(services, scenario.id)
      expect(projection.status).toBe('READY')
      if (projection.status !== 'READY') continue
      expect(projection.scenario.id).toBe(scenario.id)
      expect(projection.resumedCase.policyQualifiedVersion).toBe(
        'SYN-EVISA-POLICY@2.1.0',
      )
      expect(projection.furthestPath).toBe(applicationPath(projection.caseId))
    }
    expect(JSON.stringify(store.load())).toBe(beforeProjection)
  })

  it('exposes only payment for the ambiguous-payment recovery point', () => {
    const { services } = seeded('SEED-MEDICAL-AMBIGUOUS-PAYMENT')
    const projection = projectCaseNavigation(services, 'SYN-CASE-MED-001')
    expect(projection.status).toBe('READY')
    if (projection.status !== 'READY') return

    expect(projection.available.payment).toBe(true)
    expect(projection.available.status).toBe(false)
    expect(projection.furthestPath).toBe(applicationPath(projection.caseId, 'payment'))
  })

  it('reprojects a replacement Tourist seed without retaining the former Medical case', () => {
    const { store, services } = seeded('SEED-MEDICAL-START')
    expect(store.save(getSeed('SEED-TOURIST-START').envelope).status).toBe('SAVED')

    expect(projectCaseNavigation(services, 'SYN-CASE-MED-001')).toEqual({
      status: 'CASE_NOT_FOUND',
    })
    const tourist = projectCaseNavigation(services, 'SYN-CASE-TOURIST-001')
    expect(tourist.status).toBe('READY')
    if (tourist.status !== 'READY') return
    expect(tourist.scenario.slug).toBe('tourist')
    expect(tourist.available.application).toBe(true)
  })

  it('permits correction only for the authoritative action-required state', () => {
    const { services } = seeded('SEED-MEDICAL-REUPLOAD-REQUESTED')
    const projection = projectCaseNavigation(services, 'SYN-CASE-MED-001')
    expect(projection.status).toBe('READY')
    if (projection.status !== 'READY') return

    expect(projection.available.correction).toBe(true)
    expect(guardedDestination(projection, 'correction')).toBeNull()
  })

  it('redirects an impermissible correction URL to status', () => {
    const { services } = seeded('SEED-MEDICAL-STATUS-RECOVERY')
    const projection = projectCaseNavigation(services, 'SYN-CASE-MED-001')
    expect(projection.status).toBe('READY')
    if (projection.status !== 'READY') return

    expect(projection.available.correction).toBe(false)
    expect(guardedDestination(projection, 'correction')).toBe(
      applicationPath(projection.caseId, 'status'),
    )
  })

  it('redirects locked editable routes to the safe read-only Review', () => {
    const { services } = seeded('SEED-MEDICAL-AMBIGUOUS-PAYMENT')
    const projection = projectCaseNavigation(services, 'SYN-CASE-MED-001')
    expect(projection.status).toBe('READY')
    if (projection.status !== 'READY') return

    expect(projection.available.application).toBe(false)
    expect(guardedDestination(projection, 'application')).toBe(
      applicationPath(projection.caseId, 'review'),
    )
    expect(guardedDestination(projection, 'documents')).toBe(
      applicationPath(projection.caseId, 'review'),
    )
  })

  it('cannot grant ETA access before issuance', () => {
    const { services } = seeded('SEED-MEDICAL-STATUS-RECOVERY')
    const projection = projectCaseNavigation(services, 'SYN-CASE-MED-001')
    expect(projection.status).toBe('READY')
    if (projection.status !== 'READY') return

    expect(projection.available.eta).toBe(false)
    expect(guardedDestination(projection, 'eta')).toBe(
      applicationPath(projection.caseId, 'status'),
    )
  })

  it('projects an issued ETA without adding versions, revisions, or events', () => {
    const { store, services } = seeded('SEED-MEDICAL-REUPLOAD-REQUESTED')
    services.runtime.prepareCorrection({
      caseId: 'SYN-CASE-MED-001',
      fixtureId: 'SYN-FIXTURE-HOSPITAL-LETTER-V2-001',
    })
    services.runtime.submitCorrection({ caseId: 'SYN-CASE-MED-001' })
    services.runtime.completeSyntheticReview({ caseId: 'SYN-CASE-MED-001' })
    const before = JSON.stringify(store.load())

    const projection = projectCaseNavigation(services, 'SYN-CASE-MED-001')
    expect(projection.status).toBe('READY')
    if (projection.status !== 'READY') return
    expect(projection.available.eta).toBe(true)
    expect(projection.furthestPath).toBe(applicationPath(projection.caseId, 'eta'))
    expect(JSON.stringify(store.load())).toBe(before)
  })
})
