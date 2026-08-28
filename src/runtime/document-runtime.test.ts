import { describe, expect, it } from 'vitest'

import {
  MEDICAL_CONTROLLED_ANSWERS,
  TOURIST_CONTROLLED_ANSWERS,
} from '../fixtures'
import { createLocalMockAdapters } from '../mocks'
import {
  P0_STORAGE_KEY,
  createPersistenceStore,
  type StoragePort,
} from '../persistence'
import {
  createDemoRuntime,
  createDeterministicRuntimeMetadata,
  type DemoRuntime,
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

  rawProjectState(): string | null {
    return this.#values.get(P0_STORAGE_KEY) ?? null
  }
}

function createRuntime(storage: MemoryStorage): DemoRuntime {
  return createDemoRuntime({
    store: createPersistenceStore(storage),
    adapters: createLocalMockAdapters(),
    metadata: createDeterministicRuntimeMetadata(),
  })
}

function prepareCaseAtDocuments(
  runtime: DemoRuntime,
  scenarioId: 'SYN-MEDICAL-001' | 'SYN-TOURIST-001',
) {
  const caseId =
    scenarioId === 'SYN-MEDICAL-001' ? 'SYN-CASE-MED-001' : 'SYN-CASE-TOURIST-001'
  const suffix = scenarioId === 'SYN-MEDICAL-001' ? 'MED' : 'TOURIST'
  const answers =
    scenarioId === 'SYN-MEDICAL-001'
      ? MEDICAL_CONTROLLED_ANSWERS
      : TOURIST_CONTROLLED_ANSWERS

  expect(
    runtime.createCase({
      scenarioId,
      idempotencyKey: `SYN-IDEMPOTENCY-A04-CREATE-${suffix}`,
    }).status,
  ).toBe('COMMAND_ACCEPTED')
  expect(
    runtime.beginDraft({
      caseId,
      idempotencyKey: `SYN-IDEMPOTENCY-A04-BEGIN-${suffix}`,
    }).status,
  ).toBe('COMMAND_ACCEPTED')
  expect(
    runtime.saveDraftSnapshot({
      caseId,
      idempotencyKey: `SYN-IDEMPOTENCY-A04-DOCUMENTS-${suffix}`,
      currentStep: 'DOCUMENTS',
      answers,
    }).status,
  ).toBe('COMMAND_ACCEPTED')

  return caseId
}

function prepareFixture(
  runtime: DemoRuntime,
  caseId: 'SYN-CASE-MED-001' | 'SYN-CASE-TOURIST-001',
  requirementId: string,
  fixtureId: string,
) {
  return runtime.prepareDocumentFixture({
    caseId,
    requirementId,
    fixtureId,
    idempotencyKey: `SYN-IDEMPOTENCY-A04-${requirementId}-${fixtureId}`,
  })
}

describe('runtime A04 document preparation', () => {
  it('derives the Medical checklist from policy and prepares all three bundled fixtures', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const caseId = prepareCaseAtDocuments(runtime, 'SYN-MEDICAL-001')

    const initial = runtime.inspectDocuments({ caseId })
    expect(initial).toMatchObject({
      status: 'DOCUMENTS_INSPECTED',
      requiredCount: 3,
      readyCount: 0,
      allReady: false,
    })
    if (initial.status !== 'DOCUMENTS_INSPECTED') {
      throw new Error('Expected the Medical document checklist.')
    }
    expect(initial.requirements.map(({ documentType }) => documentType)).toEqual([
      'SYNTHETIC_PORTRAIT',
      'SYNTHETIC_PASSPORT_PAGE',
      'SYNTHETIC_HOSPITAL_LETTER',
    ])
    expect(
      initial.requirements.flatMap(({ fixtureOptions }) =>
        fixtureOptions.map(({ fixtureId }) => fixtureId),
      ),
    ).not.toContain('SYN-FIXTURE-HOSPITAL-LETTER-V2-001')

    expect(
      prepareFixture(
        runtime,
        caseId,
        'REQ-PORTRAIT-1',
        'SYN-FIXTURE-PORTRAIT-VALID-001',
      ).status,
    ).toBe('DOCUMENT_PREPARED')
    expect(
      prepareFixture(
        runtime,
        caseId,
        'REQ-PASSPORT-PAGE-1',
        'SYN-FIXTURE-PASSPORT-VALID-001',
      ).status,
    ).toBe('DOCUMENT_PREPARED')
    expect(
      prepareFixture(
        runtime,
        caseId,
        'REQ-HOSPITAL-LETTER-1',
        'SYN-FIXTURE-HOSPITAL-LETTER-V1-001',
      ),
    ).toMatchObject({
      status: 'DOCUMENT_PREPARED',
      documentState: 'PREFLIGHT_PASSED',
      inspectionReasonCode: 'MOCK_DOCUMENT_PREFLIGHT_PASSED',
    })

    const completed = runtime.inspectDocuments({ caseId })
    expect(completed).toMatchObject({
      status: 'DOCUMENTS_INSPECTED',
      requiredCount: 3,
      readyCount: 3,
      allReady: true,
    })
  })

  it('uses the same runtime for the two-item Tourist policy manifest', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const caseId = prepareCaseAtDocuments(runtime, 'SYN-TOURIST-001')

    const initial = runtime.inspectDocuments({ caseId })
    expect(initial).toMatchObject({
      status: 'DOCUMENTS_INSPECTED',
      requiredCount: 2,
    })
    if (initial.status !== 'DOCUMENTS_INSPECTED') {
      throw new Error('Expected the Tourist document checklist.')
    }
    expect(initial.requirements.map(({ documentType }) => documentType)).toEqual([
      'SYNTHETIC_PORTRAIT',
      'SYNTHETIC_PASSPORT_PAGE',
    ])

    prepareFixture(runtime, caseId, 'REQ-PORTRAIT-1', 'SYN-FIXTURE-PORTRAIT-VALID-001')
    prepareFixture(
      runtime,
      caseId,
      'REQ-PASSPORT-PAGE-1',
      'SYN-FIXTURE-PASSPORT-VALID-001',
    )
    expect(runtime.inspectDocuments({ caseId })).toMatchObject({
      status: 'DOCUMENTS_INSPECTED',
      readyCount: 2,
      allReady: true,
    })
  })

  it('preserves a failed passport version and legally supersedes it with the clear replacement', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const caseId = prepareCaseAtDocuments(runtime, 'SYN-MEDICAL-001')

    const failed = prepareFixture(
      runtime,
      caseId,
      'REQ-PASSPORT-PAGE-1',
      'SYN-FIXTURE-PASSPORT-UNCLEAR-001',
    )
    expect(failed).toMatchObject({
      status: 'DOCUMENT_PREPARED',
      documentState: 'PREFLIGHT_FAILED',
      inspectionReasonCode: 'DOC_PREFLIGHT_UNCLEAR_SYNTHETIC',
    })

    const corrected = prepareFixture(
      runtime,
      caseId,
      'REQ-PASSPORT-PAGE-1',
      'SYN-FIXTURE-PASSPORT-VALID-001',
    )
    expect(corrected).toMatchObject({
      status: 'DOCUMENT_PREPARED',
      documentState: 'PREFLIGHT_PASSED',
      inspectionReasonCode: 'MOCK_DOCUMENT_PREFLIGHT_PASSED',
    })

    const inspected = runtime.inspectDocuments({ caseId })
    if (inspected.status !== 'DOCUMENTS_INSPECTED') {
      throw new Error('Expected the corrected document checklist.')
    }
    const passport = inspected.requirements.find(
      ({ requirementId }) => requirementId === 'REQ-PASSPORT-PAGE-1',
    )
    expect(passport).toMatchObject({ status: 'READY' })
    expect(passport?.versionHistory).toHaveLength(2)
    expect(passport?.versionHistory.map(({ state }) => state)).toEqual([
      'SUPERSEDED',
      'PREFLIGHT_PASSED',
    ])

    const persisted = createPersistenceStore(storage).load()
    if (persisted.status !== 'VALID_STATE') {
      throw new Error('Expected valid persisted document state.')
    }
    const persistedCase = persisted.state.cases[0]
    expect(
      persistedCase?.auditEvents.filter(({ eventType }) =>
        eventType.startsWith('Document'),
      ).map(({ eventType }) => eventType),
    ).toEqual([
      'DocumentVersionCreated',
      'DocumentPreflightFailed',
      'DocumentVersionCreated',
      'DocumentPreflightPassed',
      'DocumentVersionSuperseded',
    ])
  })

  it('reuses an already-checked fixture and does not mutate on read or reload', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const caseId = prepareCaseAtDocuments(runtime, 'SYN-MEDICAL-001')
    const first = prepareFixture(
      runtime,
      caseId,
      'REQ-PORTRAIT-1',
      'SYN-FIXTURE-PORTRAIT-VALID-001',
    )
    expect(first.status).toBe('DOCUMENT_PREPARED')
    const before = storage.rawProjectState()

    expect(
      prepareFixture(
        runtime,
        caseId,
        'REQ-PORTRAIT-1',
        'SYN-FIXTURE-PORTRAIT-VALID-001',
      ),
    ).toMatchObject({ status: 'DOCUMENT_EXISTING', idempotentReplay: true })
    expect(storage.rawProjectState()).toBe(before)

    const reloadedRuntime = createRuntime(storage)
    expect(reloadedRuntime.inspectDocuments({ caseId })).toMatchObject({
      status: 'DOCUMENTS_INSPECTED',
      readyCount: 1,
    })
    expect(storage.rawProjectState()).toBe(before)
  })

  it('rejects incompatible fixtures and cases that have not completed A03 without persisting', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const caseId = prepareCaseAtDocuments(runtime, 'SYN-MEDICAL-001')
    const before = storage.rawProjectState()

    expect(
      prepareFixture(
        runtime,
        caseId,
        'REQ-HOSPITAL-LETTER-1',
        'SYN-FIXTURE-HOSPITAL-LETTER-V2-001',
      ),
    ).toMatchObject({ status: 'COMMAND_REJECTED', reasonCode: 'FIXTURE_NOT_COMPATIBLE' })
    expect(storage.rawProjectState()).toBe(before)

    const freshStorage = new MemoryStorage()
    const freshRuntime = createRuntime(freshStorage)
    expect(
      freshRuntime.createCase({
        scenarioId: 'SYN-MEDICAL-001',
        idempotencyKey: 'SYN-IDEMPOTENCY-A04-FRESH-CREATE',
      }).status,
    ).toBe('COMMAND_ACCEPTED')
    expect(freshRuntime.inspectDocuments({ caseId })).toMatchObject({
      status: 'COMMAND_REJECTED',
      reasonCode: 'GUARD_FAILED',
    })
  })

  it('rejects invalid local metadata without creating a document version', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const caseId = prepareCaseAtDocuments(runtime, 'SYN-MEDICAL-001')
    const before = storage.rawProjectState()
    expect(runtime.prepareLocalDocument({
      caseId,
      requirementId: 'REQ-PASSPORT-PAGE-1',
      fileName: 'passport.png',
      mimeType: 'image/png',
      sizeBytes: 12_000,
      idempotencyKey: 'SYN-IDEMPOTENCY-A04-LOCAL-INVALID',
    })).toMatchObject({ status: 'COMMAND_REJECTED', reasonCode: 'INVALID_COMMAND' })
    expect(storage.rawProjectState()).toBe(before)
    expect(runtime.inspectDocuments({ caseId })).toMatchObject({ readyCount: 0 })
  })

  it('persists only safe local-file metadata and reloads without duplicate events', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const caseId = prepareCaseAtDocuments(runtime, 'SYN-MEDICAL-001')
    const input = {
      caseId,
      requirementId: 'REQ-PORTRAIT-1',
      fileName: 'very-private-applicant-name.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 12_000,
      width: 350,
      height: 350,
      idempotencyKey: 'SYN-IDEMPOTENCY-A04-LOCAL-VALID',
    }
    expect(runtime.prepareLocalDocument(input)).toMatchObject({
      status: 'DOCUMENT_PREPARED', source: 'LOCAL_FILE', documentState: 'PREFLIGHT_PASSED',
    })
    const before = storage.rawProjectState()
    expect(before).not.toContain(input.fileName)
    expect(before).not.toContain('base64')
    expect(before).not.toContain('blob:')
    expect(runtime.prepareLocalDocument(input)).toMatchObject({
      status: 'DOCUMENT_EXISTING', source: 'LOCAL_FILE', idempotentReplay: true,
    })
    expect(storage.rawProjectState()).toBe(before)
    const view = createRuntime(storage).inspectDocuments({ caseId })
    expect(view).toMatchObject({ status: 'DOCUMENTS_INSPECTED', readyCount: 1 })
    if (view.status === 'DOCUMENTS_INSPECTED') {
      expect(view.requirements[0]?.currentVersion).toMatchObject({
        source: 'LOCAL_FILE',
        localFileMetadata: { mimeType: 'image/jpeg', sizeBytes: 12_000, width: 350, height: 350 },
      })
    }
    expect(storage.rawProjectState()).toBe(before)
  })
})
