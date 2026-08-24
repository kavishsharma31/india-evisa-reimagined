import { describe, expect, it } from 'vitest'

import { evaluatePolicy, activePolicyBundle, ACTIVE_POLICY_QUALIFIED_VERSION } from '../policy'
import {
  createPersistenceStore,
  parsePersistenceEnvelope,
  persistenceEnvelopeSchema,
  serializePersistenceEnvelope,
  type StoragePort,
} from '../persistence'
import {
  DOCUMENT_FIXTURE_IDS,
  P0_FIXTURE_MANIFEST_VERSION,
  RECOVERY_SEED_IDS,
  activeVersionState,
  createPolicyEvaluationRequest,
  getFixtureManifest,
  getSeed,
  hospitalLetterV1Fixture,
  hospitalLetterV2Fixture,
  listSeeds,
  medicalScenario,
  touristScenario,
  unclearPassportPageFixture,
  validPassportPageFixture,
  validateFixtureManifest,
} from './index'

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

function singleCase(seedId: (typeof RECOVERY_SEED_IDS)[number]) {
  const seed = getSeed(seedId)
  const persistedCase = seed.envelope.cases[0]
  if (persistedCase === undefined) {
    throw new Error(`Seed ${seedId} did not contain its canonical case.`)
  }
  return { seed, persistedCase }
}

describe('canonical P0 fixture manifest', () => {
  it('runtime validates the immutable versioned manifest', () => {
    const manifest = getFixtureManifest()
    const validation = validateFixtureManifest(manifest)

    expect(validation.status).toBe('VALID')
    expect(manifest.version).toBe(P0_FIXTURE_MANIFEST_VERSION)
    expect(manifest.activePolicy.qualifiedVersion).toBe(ACTIVE_POLICY_QUALIFIED_VERSION)
    expect(manifest.activePolicy.digest).toBe(activePolicyBundle.digest)
    expect(Object.isFrozen(manifest)).toBe(true)
    expect(Object.isFrozen(manifest.seeds)).toBe(true)
    expect(Reflect.set(manifest, 'version', 'SYN-P0-FIXTURES@999.0.0')).toBe(false)
    expect(manifest.version).toBe(P0_FIXTURE_MANIFEST_VERSION)
  })

  it('enumerates exactly the seven unique D01 seeds in canonical order', () => {
    const seeds = listSeeds()
    expect(seeds).toHaveLength(7)
    expect(seeds.map(({ seedId }) => seedId)).toEqual(RECOVERY_SEED_IDS)
    expect(new Set(seeds.map(({ seedId }) => seedId)).size).toBe(7)
    expect(seeds.filter(({ seedKind }) => seedKind === 'RECOVERY')).toHaveLength(5)
  })

  it('keeps Medical primary and Tourist a lightweight shared-contract validation', () => {
    const roots = getFixtureManifest().scenarioRoots
    const medical = roots.find(({ scenarioId }) => scenarioId === 'SYN-MEDICAL-001')
    const tourist = roots.find(({ scenarioId }) => scenarioId === 'SYN-TOURIST-001')

    expect(medical).toMatchObject({
      orientation: 'PRIMARY',
      caseId: 'SYN-CASE-MED-001',
      questionManifestId: 'QM-MEDICAL-1',
      documentManifestId: 'DM-MEDICAL-1',
      syntheticFee: { amount: 73, unit: 'SYNTHETIC_DEMO_CREDITS' },
    })
    expect(tourist).toMatchObject({
      orientation: 'SHARED_CONTRACT_VALIDATION',
      caseId: 'SYN-CASE-TOURIST-001',
      questionManifestId: 'QM-TOURIST-1',
      documentManifestId: 'DM-TOURIST-1',
      syntheticFee: { amount: 41, unit: 'SYNTHETIC_DEMO_CREDITS' },
    })
  })

  it('retains policy compatibility through the same evaluator', () => {
    const medical = evaluatePolicy(
      createPolicyEvaluationRequest(medicalScenario),
      activePolicyBundle,
    )
    const tourist = evaluatePolicy(
      createPolicyEvaluationRequest(touristScenario),
      activePolicyBundle,
    )

    expect(medical).toMatchObject({
      scenarioSupport: 'SUPPORTED_BY_DEMO',
      suggestedPurposeFamily: 'SYNTHETIC_MEDICAL_PURPOSE',
      questionManifest: { id: 'QM-MEDICAL-1' },
      syntheticFee: { amount: 73, unit: 'SYNTHETIC_DEMO_CREDITS' },
    })
    expect(medical.documentManifest?.requirements.map(({ id }) => id)).toEqual([
      'REQ-PORTRAIT-1',
      'REQ-PASSPORT-PAGE-1',
      'REQ-HOSPITAL-LETTER-1',
    ])
    expect(tourist).toMatchObject({
      scenarioSupport: 'SUPPORTED_BY_DEMO',
      suggestedPurposeFamily: 'SYNTHETIC_TOURIST_PURPOSE',
      questionManifest: { id: 'QM-TOURIST-1' },
      syntheticFee: { amount: 41, unit: 'SYNTHETIC_DEMO_CREDITS' },
    })
    expect(tourist.documentManifest?.requirements.map(({ id }) => id)).toEqual([
      'REQ-PORTRAIT-1',
      'REQ-PASSPORT-PAGE-1',
    ])
  })

  it('fails manifest consistency validation when expected aggregate evidence is contradicted', () => {
    const manifest = getFixtureManifest()
    const candidate = {
      ...manifest,
      seeds: manifest.seeds.map((seed) =>
        seed.seedId === 'SEED-MEDICAL-AMBIGUOUS-PAYMENT'
          ? {
              ...seed,
              expectedState: { ...seed.expectedState, payment: 'CONFIRMED' },
            }
          : seed,
      ),
    }

    expect(validateFixtureManifest(candidate)).toMatchObject({ status: 'INVALID' })
  })
})

describe('canonical document catalogue', () => {
  it('contains unique metadata-only fixtures with the required synthetic watermark', () => {
    const documents = getFixtureManifest().documents
    expect(documents.map(({ fixtureId }) => fixtureId)).toEqual(DOCUMENT_FIXTURE_IDS)
    expect(new Set(documents.map(({ fixtureId }) => fixtureId)).size).toBe(documents.length)
    for (const document of documents) {
      expect(document).toMatchObject({
        syntheticOnly: true,
        watermark: 'SYNTHETIC — NOT VALID',
        sourceLicense: 'PROJECT_CREATED_NO_EXTERNAL_SOURCE',
        reviewStatus: 'APPROVED_FOR_SYNTHETIC_P0',
      })
    }
  })

  it('keeps technical preflight and later hospital-letter scrutiny distinct', () => {
    expect(unclearPassportPageFixture).toMatchObject({
      expectedInspectionScenario: 'DOCUMENT_TECHNICAL_DEFECT',
      expectedInspectionReasonCode: 'DOC_PREFLIGHT_UNCLEAR_SYNTHETIC',
    })
    expect(hospitalLetterV1Fixture).toMatchObject({
      expectedInspectionScenario: 'DOCUMENT_PASS',
      expectedInspectionReasonCode: 'MOCK_DOCUMENT_PREFLIGHT_PASSED',
      scrutinyOutcomeCode: 'DOC_HOSPITAL_ADMISSION_DATE_UNCLEAR_SYNTHETIC',
    })
    expect(hospitalLetterV2Fixture).toMatchObject({
      expectedInspectionScenario: 'DOCUMENT_PASS',
      replacesFixtureId: hospitalLetterV1Fixture.fixtureId,
    })
  })
})

describe('canonical scenario roots', () => {
  it('uses the same persistence shape and active policy pin for both fresh starts', () => {
    const medical = singleCase('SEED-MEDICAL-START')
    const tourist = singleCase('SEED-TOURIST-START')

    expect(persistenceEnvelopeSchema.safeParse(medical.seed.envelope).success).toBe(true)
    expect(persistenceEnvelopeSchema.safeParse(tourist.seed.envelope).success).toBe(true)
    expect(Object.keys(medical.seed.envelope)).toEqual(Object.keys(tourist.seed.envelope))
    expect(Object.keys(medical.persistedCase)).toEqual(Object.keys(tourist.persistedCase))
    expect(medical.persistedCase.policyPin.qualifiedVersion).toBe(ACTIVE_POLICY_QUALIFIED_VERSION)
    expect(tourist.persistedCase.policyPin.qualifiedVersion).toBe(ACTIVE_POLICY_QUALIFIED_VERSION)
    expect(medical.persistedCase.application.state).toBe('DRAFT_CREATED')
    expect(tourist.persistedCase.application.state).toBe('DRAFT_CREATED')
  })
})

describe('mandatory recovery seeds', () => {
  it('preserves the interrupted Medical draft without duplicate cases or snapshots', () => {
    const { seed, persistedCase } = singleCase('SEED-MEDICAL-INTERRUPTED-DRAFT')
    const snapshots = persistedCase.application.draftSnapshots
    const latest = snapshots.at(-1)

    expect(persistedCase.application.state).toBe('IN_PROGRESS')
    expect(seed.envelope.cases).toHaveLength(1)
    expect(snapshots).toHaveLength(2)
    expect(snapshots.map(({ sequence }) => sequence)).toEqual([1, 2])
    expect(latest).toMatchObject({
      currentStep: 'DOCUMENTS',
      policyQualifiedVersion: ACTIVE_POLICY_QUALIFIED_VERSION,
    })
    expect(latest?.answers).toMatchObject({
      'Q-MEDICAL-TREATMENT-INTENT': 'SYNTHETIC_MEDICAL_TREATMENT',
      'Q-MEDICAL-ADMISSION-DATE': '2099-04-18',
    })
    expect(
      persistedCase.auditEvents.filter(({ eventType }) => eventType === 'DraftSnapshotSaved'),
    ).toHaveLength(2)
  })

  it('round trips the interrupted draft through a recreated persistence service', () => {
    const { seed } = singleCase('SEED-MEDICAL-INTERRUPTED-DRAFT')
    const storage = new MemoryStorage()
    const save = createPersistenceStore(storage).save(seed.envelope)
    const reloaded = createPersistenceStore(storage).load()

    expect(save.status).toBe('SAVED')
    expect(reloaded).toMatchObject({ status: 'VALID_STATE', state: seed.envelope })
    if (reloaded.status !== 'VALID_STATE') {
      throw new Error('Valid seed did not reload.')
    }
    expect(reloaded.state.cases).toHaveLength(1)
    expect(reloaded.state.cases[0]?.application.draftSnapshots).toHaveLength(2)
  })

  it('models only the controlled technical-preflight defect and its bundled correction', () => {
    const { persistedCase } = singleCase('SEED-MEDICAL-DOCUMENT-DEFECT')
    const serialized = serializePersistenceEnvelope(
      getSeed('SEED-MEDICAL-DOCUMENT-DEFECT').envelope,
    )

    expect(persistedCase.application.state).toBe('IN_PROGRESS')
    expect(activeVersionState(getSeed('SEED-MEDICAL-DOCUMENT-DEFECT'), unclearPassportPageFixture.fixtureId)).toBe(
      'PREFLIGHT_FAILED',
    )
    expect(serialized).toContain('DOC_PREFLIGHT_UNCLEAR_SYNTHETIC')
    expect(serialized).not.toContain('DOC_HOSPITAL_ADMISSION_DATE_UNCLEAR_SYNTHETIC')
    expect(validPassportPageFixture.expectedInspectionScenario).toBe('DOCUMENT_PASS')
    expect(persistedCase.payment.state).toBe('NOT_STARTED')
    expect(persistedCase.scrutiny.state).toBe('NOT_STARTED')
  })

  it('contains one ambiguous payment attempt after coherent submission prerequisites', () => {
    const { persistedCase } = singleCase('SEED-MEDICAL-AMBIGUOUS-PAYMENT')
    const attemptIds = new Set(
      persistedCase.auditEvents
        .filter(({ domain }) => domain === 'PAYMENT')
        .map(({ payload }) => payload.attemptId),
    )

    expect(persistedCase.application.state).toBe('LOCKED')
    expect(persistedCase.documents).toHaveLength(3)
    expect(persistedCase.documents.every(({ versions }) => versions[0]?.state === 'SUBMITTED')).toBe(true)
    expect(persistedCase.payment).toMatchObject({
      state: 'RECONCILIATION_REQUIRED',
      mockPaymentAttemptId: 'SYN-PAYMENT-ATTEMPT-MED-001',
    })
    expect(attemptIds).toEqual(new Set(['SYN-PAYMENT-ATTEMPT-MED-001']))
    expect(persistedCase.scrutiny.state).toBe('NOT_STARTED')
    expect(persistedCase.eta.state).toBe('NOT_READY')
  })

  it('preserves hospital V1 in the exact action-required correction state', () => {
    const { persistedCase } = singleCase('SEED-MEDICAL-REUPLOAD-REQUESTED')
    const events = persistedCase.auditEvents
    const actionIndex = events.findIndex(({ eventType }) => eventType === 'ScrutinyActionRequired')
    const reuploadIndex = events.findIndex(({ eventType }) => eventType === 'DocumentReuploadRequested')

    expect(persistedCase.payment.state).toBe('CONFIRMED')
    expect(persistedCase.scrutiny.state).toBe('ACTION_REQUIRED')
    expect(activeVersionState(getSeed('SEED-MEDICAL-REUPLOAD-REQUESTED'), hospitalLetterV1Fixture.fixtureId)).toBe(
      'REUPLOAD_REQUESTED',
    )
    expect(persistedCase.documents.some(({ documentAssetId }) => documentAssetId === hospitalLetterV2Fixture.fixtureId)).toBe(false)
    expect(events.some(({ payload }) => payload.outcomeCode === 'DOC_HOSPITAL_ADMISSION_DATE_UNCLEAR_SYNTHETIC')).toBe(true)
    expect(actionIndex).toBeGreaterThan(-1)
    expect(reuploadIndex).toBeGreaterThan(actionIndex)
    expect(persistedCase.eta.state).toBe('NOT_READY')
  })

  it('stores authoritative in-review facts without persisting derived status copy', () => {
    const { seed, persistedCase } = singleCase('SEED-MEDICAL-STATUS-RECOVERY')
    const serialized = serializePersistenceEnvelope(seed.envelope)

    expect(persistedCase.application.state).toBe('LOCKED')
    expect(persistedCase.payment.state).toBe('CONFIRMED')
    expect(persistedCase.scrutiny.state).toBe('IN_REVIEW')
    expect(persistedCase.documents.every(({ versions }) => versions[0]?.state === 'UNDER_REVIEW')).toBe(true)
    expect(persistedCase.eta.state).toBe('NOT_READY')
    expect(serialized).not.toContain('UNDER_SCRUTINY')
    expect(serialized).not.toContain('No action is needed now')
  })
})

describe('fixture repeatability and safety', () => {
  it('parses and deterministically serializes every seed on repeated access', () => {
    for (const seedId of RECOVERY_SEED_IDS) {
      const first = getSeed(seedId)
      const repeated = getSeed(seedId)

      expect(parsePersistenceEnvelope(first.envelope)).toEqual(first.envelope)
      expect(repeated).toEqual(first)
      expect(serializePersistenceEnvelope(repeated.envelope)).toBe(
        serializePersistenceEnvelope(first.envelope),
      )
      expect(Object.isFrozen(first)).toBe(true)
      expect(Object.isFrozen(first.envelope.cases[0])).toBe(true)
    }
  })

  it('contains only bounded synthetic fixture values and reserved email data', () => {
    const serialized = JSON.stringify(getFixtureManifest())
    const forbidden = [
      /https?:\/\//i,
      /cardNumber/i,
      /bankAccount/i,
      /fingerprint/i,
      /embedding/i,
      /imageBytes/i,
      /fileContent/i,
      /documentBody/i,
      /healthNarrative/i,
      /(?:secret|credential|token)/i,
      /\b[A-Z]\d{7,8}\b/,
    ]

    expect(serialized.match(/[A-Za-z0-9._%+-]+@[A-Za-z][A-Za-z0-9-]*\.[A-Za-z]{2,}/g)).toEqual([
      'demo-applicant@example.com',
      'demo-applicant@example.com',
    ])
    for (const pattern of forbidden) {
      expect(serialized).not.toMatch(pattern)
    }
  })

  it('keeps fixture runtime source free of React, browser storage, network and nondeterminism', () => {
    const runtimeSources = import.meta.glob<string>(['./*.ts', '!./fixtures.test.ts'], {
      eager: true,
      import: 'default',
      query: '?raw',
    })
    const source = Object.values(runtimeSources).join('\n')

    expect(source).not.toMatch(/\bReact\b|from ['"]react['"]/)
    expect(source).not.toMatch(/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/)
    expect(source).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b/)
    expect(source).not.toMatch(/Math\.random\s*\(|Date\.now\s*\(|new Date\s*\(/)
    expect(source).not.toMatch(/https?:\/\//)
  })
})
