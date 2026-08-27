import { describe, expect, it } from 'vitest'

import { canonicalScenarios, canonicalDocumentFixtures, listSeeds, createPolicyEvaluationRequest } from '../fixtures'
import { P0_STORAGE_KEY, createPersistenceStore, type StoragePort } from '../persistence'
import { createLocalMockAdapters } from '../mocks'
import { createDemoRuntime, createDeterministicRuntimeMetadata } from '../runtime'
import {
  ACTIVE_POLICY_QUALIFIED_VERSION,
  LEGACY_POLICY_QUALIFIED_VERSION,
  activePolicyBundle,
  evaluatePolicy,
  resolvePolicyBundle,
} from './index'

const EXPECTED = [
  ['SYN-TOURIST-001', 'QM-TOURIST-1', ['REQ-PORTRAIT-1', 'REQ-PASSPORT-PAGE-1'], 41],
  ['SYN-BUSINESS-001', 'QM-BUSINESS-1', ['REQ-PORTRAIT-1', 'REQ-PASSPORT-PAGE-1', 'REQ-BUSINESS-CARD-1'], 59],
  ['SYN-MEDICAL-001', 'QM-MEDICAL-1', ['REQ-PORTRAIT-1', 'REQ-PASSPORT-PAGE-1', 'REQ-HOSPITAL-LETTER-1'], 73],
  ['SYN-MEDICAL-ATTENDANT-001', 'QM-MEDICAL-ATTENDANT-1', ['REQ-PORTRAIT-1', 'REQ-PASSPORT-PAGE-1'], 47],
  ['SYN-STUDENT-001', 'QM-STUDENT-1', ['REQ-PORTRAIT-1', 'REQ-PASSPORT-PAGE-1', 'REQ-ADMISSION-LETTER-1', 'REQ-FINANCIAL-SUPPORT-1'], 53],
  ['SYN-FAMILY-001', 'QM-FAMILY-1', ['REQ-PORTRAIT-1', 'REQ-PASSPORT-PAGE-1'], 43],
  ['SYN-TRANSIT-001', 'QM-TRANSIT-1', ['REQ-PORTRAIT-1', 'REQ-PASSPORT-PAGE-1', 'REQ-TRANSIT-TICKETS-1', 'REQ-DESTINATION-ENTRY-1'], 29],
  ['SYN-MISCELLANEOUS-001', 'QM-MISCELLANEOUS-1', ['REQ-PORTRAIT-1', 'REQ-PASSPORT-PAGE-1', 'REQ-RELATIONSHIP-PROOF-1', 'REQ-CIVIL-CERTIFICATE-1'], 61],
] as const

class MemoryStorage implements StoragePort {
  readonly values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

describe('eight-category active policy catalog', () => {
  it('registers a new active version without replacing frozen 1.0.0', () => {
    expect(ACTIVE_POLICY_QUALIFIED_VERSION).toBe('SYN-EVISA-POLICY@2.0.0')
    expect(resolvePolicyBundle(LEGACY_POLICY_QUALIFIED_VERSION)?.digest).toBe('SYN-POLICY-DIGEST-1-0-0')
    expect(resolvePolicyBundle(ACTIVE_POLICY_QUALIFIED_VERSION)).toBe(activePolicyBundle)
  })

  it.each(EXPECTED)('%s resolves its manifest, documents, and synthetic fee', (scenarioId, manifestId, requirementIds, fee) => {
    const facts = canonicalScenarios.find((scenario) => scenario.scenarioId === scenarioId)
    expect(facts).toBeDefined()
    const result = evaluatePolicy(createPolicyEvaluationRequest(facts!), activePolicyBundle)
    expect(result.scenarioSupport).toBe('SUPPORTED_BY_DEMO')
    expect(result.questionManifest?.id).toBe(manifestId)
    expect(result.questionManifest?.questions).toHaveLength(scenarioId === 'SYN-MEDICAL-001' ? 6 : scenarioId === 'SYN-TOURIST-001' ? 5 : 5)
    expect(result.documentManifest?.requirements.map(({ id }) => id)).toEqual(requirementIds)
    expect(result.syntheticFee).toMatchObject({ amount: fee, label: 'SYNTHETIC — NOT PAYABLE' })
  })

  it('keeps Medical-only hospital correction evidence out of every other manifest', () => {
    const hospitalScenarios = EXPECTED.filter(([scenarioId]) => {
      const facts = canonicalScenarios.find((scenario) => scenario.scenarioId === scenarioId)!
      return evaluatePolicy(createPolicyEvaluationRequest(facts), activePolicyBundle)
        .documentManifest?.requirements.some(({ id }) => id === 'REQ-HOSPITAL-LETTER-1')
    })
    expect(hospitalScenarios.map(([scenarioId]) => scenarioId)).toEqual(['SYN-MEDICAL-001'])
  })

  it('publishes all seven requested new deterministic metadata fixtures', () => {
    const expandedIds = canonicalDocumentFixtures
      .map(({ fixtureId }) => fixtureId)
      .filter((id) => /BUSINESS|STUDENT|TRANSIT|DESTINATION|MISC/.test(id))
    expect(expandedIds).toHaveLength(7)
    expect(canonicalDocumentFixtures.filter(({ fixtureId }) => expandedIds.includes(fixtureId)).every(({ expectedInspectionScenario }) => expectedInspectionScenario === 'DOCUMENT_PASS')).toBe(true)
  })

  it('keeps exactly the existing seven D01 seeds pinned to 1.0.0', () => {
    const seeds = listSeeds()
    expect(seeds).toHaveLength(7)
    expect(seeds.every(({ envelope }) => envelope.cases[0]?.policyPin.qualifiedVersion === LEGACY_POLICY_QUALIFIED_VERSION)).toBe(true)
  })

  it('resumes a frozen 1.0.0 D01 case without rewriting its persisted envelope', () => {
    const storage = new MemoryStorage()
    const legacySeed = listSeeds()[0]!
    storage.setItem(P0_STORAGE_KEY, JSON.stringify(legacySeed.envelope))
    const beforeResume = storage.getItem(P0_STORAGE_KEY)
    const runtime = createDemoRuntime({
      store: createPersistenceStore(storage),
      adapters: createLocalMockAdapters(),
      metadata: createDeterministicRuntimeMetadata(),
    })

    expect(runtime.resumeCase()).toMatchObject({
      status: 'CASE_RESUMED',
      policyQualifiedVersion: LEGACY_POLICY_QUALIFIED_VERSION,
    })
    expect(storage.getItem(P0_STORAGE_KEY)).toBe(beforeResume)
  })

  it('creates and resumes one stable active-policy case for every category', () => {
    const storage = new MemoryStorage()
    const runtime = createDemoRuntime({
      store: createPersistenceStore(storage),
      adapters: createLocalMockAdapters(),
      metadata: createDeterministicRuntimeMetadata(),
    })
    for (const [scenarioId] of EXPECTED) {
      expect(runtime.createCase({ scenarioId, idempotencyKey: `SYN-IDEMPOTENCY-TEST-${scenarioId}` }).status).toBe('COMMAND_ACCEPTED')
      expect(runtime.createCase({ scenarioId, idempotencyKey: `SYN-IDEMPOTENCY-TEST-${scenarioId}-REPEAT` }).status).toBe('EXISTING_CASE')
    }
    const raw = storage.getItem(P0_STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!).cases).toHaveLength(8)
  })
})
