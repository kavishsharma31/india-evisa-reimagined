import { describe, expect, it } from 'vitest'

import {
  MEDICAL_CONTROLLED_ANSWERS,
  TOURIST_CONTROLLED_ANSWERS,
  getSeed,
} from '../fixtures'
import { createLocalMockAdapters, type LocalMockAdapters } from '../mocks'
import {
  P0_STORAGE_KEY,
  createPersistenceStore,
  parsePersistenceEnvelope,
  serializePersistenceEnvelope,
  type PersistenceService,
  type StoragePort,
} from '../persistence'
import { PREVIEW_POLICY_QUALIFIED_VERSION } from '../policy'
import {
  createDemoRuntime,
  createDeterministicRuntimeMetadata,
  type DemoRuntime,
} from './index'

class MemoryStorage implements StoragePort {
  readonly #values = new Map<string, string>()
  failReads = false
  failWrites = false

  getItem(key: string): string | null {
    if (this.failReads) {
      throw new Error('Synthetic storage read failure.')
    }
    return this.#values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) {
      throw new Error('Synthetic storage write failure.')
    }
    this.#values.set(key, value)
  }

  removeItem(key: string): void {
    if (this.failWrites) {
      throw new Error('Synthetic storage clear failure.')
    }
    this.#values.delete(key)
  }

  setRawProjectState(value: string): void {
    this.#values.set(P0_STORAGE_KEY, value)
  }

  rawProjectState(): string | null {
    return this.#values.get(P0_STORAGE_KEY) ?? null
  }
}

function createRuntime(
  storage: MemoryStorage,
  adapters: LocalMockAdapters = createLocalMockAdapters(),
): DemoRuntime {
  return createDemoRuntime({
    store: createPersistenceStore(storage),
    adapters,
    metadata: createDeterministicRuntimeMetadata(),
  })
}

function loadedCase(store: PersistenceService, caseId: string) {
  const loaded = store.load()
  if (loaded.status !== 'VALID_STATE') {
    throw new Error(`Expected valid state, received ${loaded.status}.`)
  }
  const persistedCase = loaded.state.cases.find((candidate) => candidate.caseId === caseId)
  if (persistedCase === undefined) {
    throw new Error(`Expected persisted Case ${caseId}.`)
  }
  return { envelope: loaded.state, persistedCase }
}

function createMedicalCase(runtime: DemoRuntime) {
  const result = runtime.createCase({
    scenarioId: 'SYN-MEDICAL-001',
    idempotencyKey: 'SYN-IDEMPOTENCY-RUNTIME-CREATE-MED-001',
  })
  expect(result.status).toBe('COMMAND_ACCEPTED')
  return result
}

function beginMedicalDraft(runtime: DemoRuntime) {
  const result = runtime.beginDraft({
    caseId: 'SYN-CASE-MED-001',
    idempotencyKey: 'SYN-IDEMPOTENCY-RUNTIME-BEGIN-MED-001',
  })
  expect(result.status).toBe('COMMAND_ACCEPTED')
  return result
}

function saveMedicalSnapshot(runtime: DemoRuntime) {
  const result = runtime.saveDraftSnapshot({
    caseId: 'SYN-CASE-MED-001',
    idempotencyKey: 'SYN-IDEMPOTENCY-RUNTIME-SNAPSHOT-MED-001',
    currentStep: 'APPLICATION',
    answers: {
      'Q-SHARED-POLICY-COHORT': MEDICAL_CONTROLLED_ANSWERS['Q-SHARED-POLICY-COHORT'],
      'Q-SHARED-PASSPORT-CLASS': MEDICAL_CONTROLLED_ANSWERS['Q-SHARED-PASSPORT-CLASS'],
      'Q-SHARED-ARRIVAL-DATE': MEDICAL_CONTROLLED_ANSWERS['Q-SHARED-ARRIVAL-DATE'],
      'Q-MEDICAL-TREATMENT-INTENT':
        MEDICAL_CONTROLLED_ANSWERS['Q-MEDICAL-TREATMENT-INTENT'],
    },
  })
  expect(result.status).toBe('COMMAND_ACCEPTED')
  return result
}

describe('runtime A00 to A02 vertical smoke path', () => {
  it('evaluates, creates, starts, snapshots, reloads and safely reuses the Medical case', () => {
    const storage = new MemoryStorage()
    const initialStore = createPersistenceStore(storage)
    expect(initialStore.reset().status).toBe('RESET')
    const runtime = createRuntime(storage)

    const evaluation = runtime.evaluateScenario({ scenarioId: 'SYN-MEDICAL-001' })
    expect(evaluation).toMatchObject({
      status: 'POLICY_EVALUATED',
      evaluation: {
        scenarioSupport: 'SUPPORTED_BY_DEMO',
        policy: { qualifiedVersion: 'SYN-EVISA-POLICY@1.0.0' },
        questionManifest: { id: 'QM-MEDICAL-1' },
        syntheticFee: { amount: 73, unit: 'SYNTHETIC_DEMO_CREDITS' },
      },
    })

    const created = createMedicalCase(runtime)
    expect(created).toMatchObject({
      status: 'COMMAND_ACCEPTED',
      operation: 'CreateDraft',
      caseId: 'SYN-CASE-MED-001',
      revision: 1,
      applicationState: 'DRAFT_CREATED',
      emittedEventType: 'DraftCreated',
      idempotentReplay: false,
    })
    const afterCreate = loadedCase(initialStore, 'SYN-CASE-MED-001')
    expect(afterCreate.envelope.activeCaseId).toBe('SYN-CASE-MED-001')
    expect(afterCreate.envelope.cases).toHaveLength(1)
    expect(afterCreate.persistedCase.policyPin.qualifiedVersion).toBe(
      'SYN-EVISA-POLICY@1.0.0',
    )
    expect(afterCreate.persistedCase.auditEvents).toHaveLength(1)
    expect(afterCreate.persistedCase.auditEvents[0]?.eventType).toBe('DraftCreated')

    const begun = beginMedicalDraft(runtime)
    expect(begun).toMatchObject({
      status: 'COMMAND_ACCEPTED',
      revision: 2,
      applicationState: 'IN_PROGRESS',
      emittedEventType: 'DraftWorkStarted',
    })

    const snapshotSaved = saveMedicalSnapshot(runtime)
    expect(snapshotSaved).toMatchObject({
      status: 'COMMAND_ACCEPTED',
      revision: 3,
      applicationState: 'IN_PROGRESS',
      emittedEventType: 'DraftSnapshotSaved',
    })

    const reloadedRuntime = createRuntime(storage)
    const resumed = reloadedRuntime.resumeCase()
    expect(resumed).toMatchObject({
      status: 'CASE_RESUMED',
      activeCaseId: 'SYN-CASE-MED-001',
      caseId: 'SYN-CASE-MED-001',
      scenarioId: 'SYN-MEDICAL-001',
      policyQualifiedVersion: 'SYN-EVISA-POLICY@1.0.0',
      applicationState: 'IN_PROGRESS',
      currentStep: 'APPLICATION',
      resumable: true,
      revision: 3,
    })
    if (resumed.status !== 'CASE_RESUMED') {
      throw new Error('Expected the Medical draft to resume.')
    }
    expect(resumed.latestAnswers).toMatchObject({
      'Q-MEDICAL-TREATMENT-INTENT': 'SYNTHETIC_MEDICAL_TREATMENT',
    })

    const beforeDuplicate = storage.rawProjectState()
    const duplicate = reloadedRuntime.createCase({
      scenarioId: 'SYN-MEDICAL-001',
      idempotencyKey: 'SYN-IDEMPOTENCY-RUNTIME-CREATE-MED-RETRY',
    })
    expect(duplicate).toMatchObject({
      status: 'EXISTING_CASE',
      caseId: 'SYN-CASE-MED-001',
      revision: 3,
      applicationState: 'IN_PROGRESS',
      resumeRecommended: true,
    })
    expect(storage.rawProjectState()).toBe(beforeDuplicate)
    const finalState = loadedCase(initialStore, 'SYN-CASE-MED-001')
    expect(finalState.envelope.cases).toHaveLength(1)
    expect(finalState.persistedCase.application.draftSnapshots).toHaveLength(1)
    expect(
      finalState.persistedCase.auditEvents.filter(({ eventType }) => eventType === 'DraftCreated'),
    ).toHaveLength(1)
    expect(finalState.persistedCase.auditEvents).toHaveLength(3)
  })

  it('reuses the same evaluator, facade, lifecycle guard and persistence shape for Tourist', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)

    expect(runtime.evaluateScenario({ scenarioId: 'SYN-TOURIST-001' })).toMatchObject({
      status: 'POLICY_EVALUATED',
      evaluation: {
        scenarioSupport: 'SUPPORTED_BY_DEMO',
        policy: { qualifiedVersion: 'SYN-EVISA-POLICY@1.0.0' },
        questionManifest: { id: 'QM-TOURIST-1' },
        syntheticFee: { amount: 41, unit: 'SYNTHETIC_DEMO_CREDITS' },
      },
    })
    expect(
      runtime.createCase({
        scenarioId: 'SYN-TOURIST-001',
        idempotencyKey: 'SYN-IDEMPOTENCY-RUNTIME-CREATE-TOURIST-001',
      }),
    ).toMatchObject({
      status: 'COMMAND_ACCEPTED',
      caseId: 'SYN-CASE-TOURIST-001',
      applicationState: 'DRAFT_CREATED',
    })
    expect(
      runtime.beginDraft({
        caseId: 'SYN-CASE-TOURIST-001',
        idempotencyKey: 'SYN-IDEMPOTENCY-RUNTIME-BEGIN-TOURIST-001',
      }),
    ).toMatchObject({
      status: 'COMMAND_ACCEPTED',
      caseId: 'SYN-CASE-TOURIST-001',
      revision: 2,
      applicationState: 'IN_PROGRESS',
    })
    const persisted = loadedCase(
      createPersistenceStore(storage),
      'SYN-CASE-TOURIST-001',
    )
    expect(Object.keys(persisted.persistedCase)).toEqual(
      Object.keys(getSeed('SEED-MEDICAL-START').envelope.cases[0] ?? {}),
    )
  })

  it('allows first creation from NO_STATE without an implicit reset operation', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)

    expect(runtime.inspectState()).toEqual({ status: 'NO_STATE' })
    expect(createMedicalCase(runtime)).toMatchObject({ status: 'COMMAND_ACCEPTED' })
    expect(runtime.inspectState()).toMatchObject({
      status: 'VALID_STATE',
      state: { activeCaseId: 'SYN-CASE-MED-001' },
    })
  })

  it('treats repeated command keys as idempotent evidence and conflicting reuse as rejection', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    createMedicalCase(runtime)
    const firstBegin = beginMedicalDraft(runtime)
    const rawAfterBegin = storage.rawProjectState()
    const repeatedBegin = runtime.beginDraft({
      caseId: 'SYN-CASE-MED-001',
      idempotencyKey: 'SYN-IDEMPOTENCY-RUNTIME-BEGIN-MED-001',
    })
    expect(firstBegin.status).toBe('COMMAND_ACCEPTED')
    expect(repeatedBegin).toMatchObject({
      status: 'COMMAND_ACCEPTED',
      revision: 2,
      idempotentReplay: true,
    })
    if (firstBegin.status === 'COMMAND_ACCEPTED' && repeatedBegin.status === 'COMMAND_ACCEPTED') {
      expect(repeatedBegin.commandId).toBe(firstBegin.commandId)
    }
    expect(storage.rawProjectState()).toBe(rawAfterBegin)

    const snapshotSavedResult = saveMedicalSnapshot(runtime)
    const rawAfterSnapshot = storage.rawProjectState()
    const repeatedSnapshot = runtime.saveDraftSnapshot({
      caseId: 'SYN-CASE-MED-001',
      idempotencyKey: 'SYN-IDEMPOTENCY-RUNTIME-SNAPSHOT-MED-001',
      currentStep: 'APPLICATION',
      answers: {
        'Q-SHARED-POLICY-COHORT': 'SYN-POLICY-COHORT-A',
        'Q-SHARED-PASSPORT-CLASS': 'SYNTHETIC_STANDARD_PASSPORT',
        'Q-SHARED-ARRIVAL-DATE': '2099-04-14',
        'Q-MEDICAL-TREATMENT-INTENT': 'SYNTHETIC_MEDICAL_TREATMENT',
      },
    })
    expect(repeatedSnapshot).toMatchObject({
      status: 'COMMAND_ACCEPTED',
      idempotentReplay: true,
      revision: 3,
    })
    if (
      snapshotSavedResult.status === 'COMMAND_ACCEPTED' &&
      repeatedSnapshot.status === 'COMMAND_ACCEPTED'
    ) {
      expect(repeatedSnapshot.commandId).toBe(snapshotSavedResult.commandId)
    }
    expect(storage.rawProjectState()).toBe(rawAfterSnapshot)

    expect(
      runtime.saveDraftSnapshot({
        caseId: 'SYN-CASE-MED-001',
        idempotencyKey: 'SYN-IDEMPOTENCY-RUNTIME-BEGIN-MED-001',
        currentStep: 'APPLICATION',
        answers: { 'Q-SHARED-POLICY-COHORT': 'SYN-POLICY-COHORT-A' },
      }),
    ).toMatchObject({
      status: 'COMMAND_REJECTED',
      reasonCode: 'IDEMPOTENCY_CONFLICT',
    })
    expect(storage.rawProjectState()).toBe(rawAfterSnapshot)
  })
})

describe('runtime fail-closed command behavior', () => {
  it('surfaces corrupt JSON as reset-required without reading through or rewriting it', () => {
    const storage = new MemoryStorage()
    const corrupt = '{"untrusted":"SYN-PRIVATE-CONTENT"'
    storage.setRawProjectState(corrupt)
    const runtime = createRuntime(storage)

    const result = runtime.createCase({
      scenarioId: 'SYN-MEDICAL-001',
      idempotencyKey: 'SYN-IDEMPOTENCY-CORRUPT-001',
    })
    expect(result).toEqual({
      status: 'STORAGE_REQUIRES_RESET',
      storageStatus: 'INVALID_JSON',
      diagnostic: { code: 'JSON_PARSE_FAILED' },
    })
    expect(JSON.stringify(result)).not.toContain('SYN-PRIVATE-CONTENT')
    expect(storage.rawProjectState()).toBe(corrupt)
  })

  it('surfaces invalid schema and unsupported versions as distinct reset-required results', () => {
    const invalidSchemaStorage = new MemoryStorage()
    invalidSchemaStorage.setRawProjectState(
      JSON.stringify({ storageSchemaVersion: 1, fixtureVersion: 'SYN-P0-RESET@1.0.0' }),
    )
    expect(createRuntime(invalidSchemaStorage).inspectState()).toMatchObject({
      status: 'STORAGE_REQUIRES_RESET',
      storageStatus: 'INVALID_SCHEMA',
    })

    const unsupportedStorage = new MemoryStorage()
    unsupportedStorage.setRawProjectState(
      JSON.stringify({ storageSchemaVersion: 2, unsafe: 'SYN-DO-NOT-ECHO' }),
    )
    const result = createRuntime(unsupportedStorage).resumeCase()
    expect(result).toEqual({
      status: 'STORAGE_REQUIRES_RESET',
      storageStatus: 'UNSUPPORTED_VERSION',
      diagnostic: {
        code: 'UNSUPPORTED_STORAGE_SCHEMA_VERSION',
        supportedVersion: 1,
        foundVersion: 2,
      },
    })
    expect(JSON.stringify(result)).not.toContain('SYN-DO-NOT-ECHO')
  })

  it('contains load and atomic-save storage failures as typed unavailable results', () => {
    const storage = new MemoryStorage()
    storage.failReads = true
    expect(createRuntime(storage).inspectState()).toMatchObject({
      status: 'STORAGE_UNAVAILABLE',
      diagnostic: { operation: 'LOAD' },
    })

    storage.failReads = false
    const runtime = createRuntime(storage)
    createMedicalCase(runtime)
    const rawBefore = storage.rawProjectState()
    storage.failWrites = true
    expect(
      runtime.beginDraft({
        caseId: 'SYN-CASE-MED-001',
        idempotencyKey: 'SYN-IDEMPOTENCY-RUNTIME-BEGIN-MED-001',
      }),
    ).toMatchObject({
      status: 'STORAGE_UNAVAILABLE',
      diagnostic: { operation: 'SAVE' },
    })
    expect(storage.rawProjectState()).toBe(rawBefore)
  })

  it('returns CASE_NOT_FOUND for commands and resume reads against missing cases', () => {
    const runtime = createRuntime(new MemoryStorage())
    expect(
      runtime.beginDraft({
        caseId: 'SYN-CASE-MISSING-001',
        idempotencyKey: 'SYN-IDEMPOTENCY-MISSING-001',
      }),
    ).toEqual({ status: 'CASE_NOT_FOUND', caseId: 'SYN-CASE-MISSING-001' })
    expect(runtime.resumeCase({ caseId: 'SYN-CASE-MISSING-001' })).toEqual({
      status: 'CASE_NOT_FOUND',
      caseId: 'SYN-CASE-MISSING-001',
    })
  })

  it('rejects a second begin transition without changing revision, events or storage', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    createMedicalCase(runtime)
    beginMedicalDraft(runtime)
    const before = loadedCase(createPersistenceStore(storage), 'SYN-CASE-MED-001')
    const rawBefore = storage.rawProjectState()

    const rejected = runtime.beginDraft({
      caseId: 'SYN-CASE-MED-001',
      idempotencyKey: 'SYN-IDEMPOTENCY-RUNTIME-BEGIN-MED-SECOND',
    })
    expect(rejected).toMatchObject({
      status: 'COMMAND_REJECTED',
      reasonCode: 'INVALID_LIFECYCLE_TRANSITION',
      diagnostic: { currentState: 'IN_PROGRESS', requestedState: 'IN_PROGRESS' },
    })
    const after = loadedCase(createPersistenceStore(storage), 'SYN-CASE-MED-001')
    expect(after.persistedCase.revision).toBe(before.persistedCase.revision)
    expect(after.persistedCase.auditEvents).toHaveLength(
      before.persistedCase.auditEvents.length,
    )
    expect(storage.rawProjectState()).toBe(rawBefore)
  })

  it('rejects snapshot saving before IN_PROGRESS without persisting', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    createMedicalCase(runtime)
    const rawBefore = storage.rawProjectState()

    expect(
      runtime.saveDraftSnapshot({
        caseId: 'SYN-CASE-MED-001',
        idempotencyKey: 'SYN-IDEMPOTENCY-EARLY-SNAPSHOT-001',
        currentStep: 'APPLICATION',
        answers: { 'Q-SHARED-POLICY-COHORT': 'SYN-POLICY-COHORT-A' },
      }),
    ).toMatchObject({
      status: 'COMMAND_REJECTED',
      reasonCode: 'GUARD_FAILED',
      diagnostic: { currentState: 'DRAFT_CREATED', requiredState: 'IN_PROGRESS' },
    })
    expect(storage.rawProjectState()).toBe(rawBefore)
  })

  it('rejects unknown and cross-scenario answer keys before persistence', () => {
    const medicalStorage = new MemoryStorage()
    const medicalRuntime = createRuntime(medicalStorage)
    createMedicalCase(medicalRuntime)
    beginMedicalDraft(medicalRuntime)
    const medicalRaw = medicalStorage.rawProjectState()
    expect(
      medicalRuntime.saveDraftSnapshot({
        caseId: 'SYN-CASE-MED-001',
        idempotencyKey: 'SYN-IDEMPOTENCY-UNKNOWN-ANSWER-001',
        currentStep: 'APPLICATION',
        answers: { 'Q-UNKNOWN-PERSONAL-FIELD': 'SYNTHETIC_VALUE' },
      }),
    ).toMatchObject({
      status: 'COMMAND_REJECTED',
      reasonCode: 'INVALID_DRAFT_ANSWER',
    })
    expect(medicalStorage.rawProjectState()).toBe(medicalRaw)

    const touristStorage = new MemoryStorage()
    const touristRuntime = createRuntime(touristStorage)
    touristRuntime.createCase({
      scenarioId: 'SYN-TOURIST-001',
      idempotencyKey: 'SYN-IDEMPOTENCY-TOURIST-CREATE-ANSWER-001',
    })
    touristRuntime.beginDraft({
      caseId: 'SYN-CASE-TOURIST-001',
      idempotencyKey: 'SYN-IDEMPOTENCY-TOURIST-BEGIN-ANSWER-001',
    })
    const touristRaw = touristStorage.rawProjectState()
    expect(
      touristRuntime.saveDraftSnapshot({
        caseId: 'SYN-CASE-TOURIST-001',
        idempotencyKey: 'SYN-IDEMPOTENCY-TOURIST-MEDICAL-ANSWER-001',
        currentStep: 'APPLICATION',
        answers: {
          'Q-MEDICAL-TREATMENT-INTENT':
            MEDICAL_CONTROLLED_ANSWERS['Q-MEDICAL-TREATMENT-INTENT'],
        },
      }),
    ).toMatchObject({
      status: 'COMMAND_REJECTED',
      reasonCode: 'INVALID_DRAFT_ANSWER',
    })
    expect(touristStorage.rawProjectState()).toBe(touristRaw)
  })

  it('fails closed on an unknown scenario without creating state', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    expect(runtime.evaluateScenario({ scenarioId: 'SYN-UNKNOWN-SCENARIO' })).toEqual({
      status: 'POLICY_REJECTED',
      scenarioId: 'SYN-UNKNOWN-SCENARIO',
      scenarioSupport: 'NOT_SUPPORTED_IN_DEMO',
      reasonCodes: ['R-SYN-NOT-SUPPORTED'],
    })
    expect(
      runtime.createCase({
        scenarioId: 'SYN-UNKNOWN-SCENARIO',
        idempotencyKey: 'SYN-IDEMPOTENCY-UNKNOWN-SCENARIO-001',
      }),
    ).toMatchObject({ status: 'POLICY_REJECTED' })
    expect(storage.rawProjectState()).toBeNull()
  })

  it('rejects a conflicting occupant of the canonical case ID without overwriting it', () => {
    const storage = new MemoryStorage()
    const medicalSeedCase = getSeed('SEED-MEDICAL-START').envelope.cases[0]
    if (medicalSeedCase === undefined) {
      throw new Error('Medical start seed did not contain its case.')
    }
    const conflictEnvelope = parsePersistenceEnvelope({
      ...getSeed('SEED-MEDICAL-START').envelope,
      cases: [{ ...medicalSeedCase, scenarioId: 'SYN-TOURIST-001' }],
    })
    expect(createPersistenceStore(storage).save(conflictEnvelope).status).toBe('SAVED')
    const rawBefore = storage.rawProjectState()

    expect(
      createRuntime(storage).createCase({
        scenarioId: 'SYN-MEDICAL-001',
        idempotencyKey: 'SYN-IDEMPOTENCY-CONFLICT-001',
      }),
    ).toMatchObject({
      status: 'COMMAND_REJECTED',
      reasonCode: 'CASE_CONFLICT',
      caseId: 'SYN-CASE-MED-001',
    })
    expect(storage.rawProjectState()).toBe(rawBefore)
  })

  it('rejects preview-policy misuse and never changes the authoritative active pin', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    expect(
      runtime.createCase({
        scenarioId: 'SYN-MEDICAL-001',
        idempotencyKey: 'SYN-IDEMPOTENCY-PREVIEW-001',
        policyQualifiedVersion: PREVIEW_POLICY_QUALIFIED_VERSION,
      }),
    ).toEqual({
      status: 'POLICY_REJECTED',
      scenarioId: 'SYN-MEDICAL-001',
      scenarioSupport: 'POLICY_CONFLICT',
      reasonCodes: ['R-SYN-DRAFT-PREVIEW-ONLY'],
    })
    expect(storage.rawProjectState()).toBeNull()

    createMedicalCase(runtime)
    expect(
      loadedCase(createPersistenceStore(storage), 'SYN-CASE-MED-001').persistedCase
        .policyPin.qualifiedVersion,
    ).toBe('SYN-EVISA-POLICY@1.0.0')
  })
})

describe('runtime determinism and architectural boundaries', () => {
  it('produces byte-equivalent state for repeated execution from the same inputs', () => {
    function executePath() {
      const storage = new MemoryStorage()
      const runtime = createRuntime(storage)
      createMedicalCase(runtime)
      beginMedicalDraft(runtime)
      saveMedicalSnapshot(runtime)
      const inspected = runtime.inspectState()
      if (inspected.status !== 'VALID_STATE') {
        throw new Error('Deterministic path did not produce valid state.')
      }
      return serializePersistenceEnvelope(inspected.state)
    }

    expect(executePath()).toBe(executePath())
  })

  it('performs A00 to A02 without invoking any injected mock adapter', () => {
    const inaccessibleAdapters = new Proxy(createLocalMockAdapters(), {
      get() {
        throw new Error('A00 to A02 must not access a mock adapter.')
      },
    })
    const runtime = createRuntime(new MemoryStorage(), inaccessibleAdapters)

    expect(runtime.evaluateScenario({ scenarioId: 'SYN-MEDICAL-001' })).toMatchObject({
      status: 'POLICY_EVALUATED',
    })
    createMedicalCase(runtime)
    beginMedicalDraft(runtime)
    saveMedicalSnapshot(runtime)
  })

  it('keeps runtime source free of React, browser globals, network and nondeterminism', () => {
    const runtimeSources = import.meta.glob<string>(['./*.ts', '!./runtime.test.ts'], {
      eager: true,
      import: 'default',
      query: '?raw',
    })
    const source = Object.values(runtimeSources).join('\n')

    expect(source).not.toMatch(/\bReact\b|from ['"]react['"]|<\w+[\s>]/)
    expect(source).not.toMatch(/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/)
    expect(source).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b/)
    expect(source).not.toMatch(/(?:https?:\/\/|(?:process|import\.meta)\.env)/)
    expect(source).not.toMatch(/Date\.now\s*\(|new Date\s*\(|Math\.random\s*\(/)
  })

  it('retains bounded Tourist answers as policy-compatible data, not a second engine', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    runtime.createCase({
      scenarioId: 'SYN-TOURIST-001',
      idempotencyKey: 'SYN-IDEMPOTENCY-TOURIST-CREATE-DETERMINISTIC-001',
    })
    runtime.beginDraft({
      caseId: 'SYN-CASE-TOURIST-001',
      idempotencyKey: 'SYN-IDEMPOTENCY-TOURIST-BEGIN-DETERMINISTIC-001',
    })
    expect(
      runtime.saveDraftSnapshot({
        caseId: 'SYN-CASE-TOURIST-001',
        idempotencyKey: 'SYN-IDEMPOTENCY-TOURIST-SNAPSHOT-DETERMINISTIC-001',
        currentStep: 'APPLICATION',
        answers: TOURIST_CONTROLLED_ANSWERS,
      }),
    ).toMatchObject({
      status: 'COMMAND_ACCEPTED',
      applicationState: 'IN_PROGRESS',
      revision: 3,
    })
  })
})
