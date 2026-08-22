import { describe, expect, it } from 'vitest'

import { activePolicyBundle, ACTIVE_POLICY_QUALIFIED_VERSION } from '../policy'
import {
  createCanonicalPersistenceEnvelope,
  createPersistenceStore,
  P0_STORAGE_KEY,
  parsePersistenceEnvelope,
  persistenceEnvelopeSchema,
  serializePersistenceEnvelope,
  type StoragePort,
} from './index'

class MemoryStorage implements StoragePort {
  readonly #entries = new Map<string, string>()

  getItem(key: string): string | null {
    return this.#entries.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.#entries.set(key, value)
  }

  removeItem(key: string): void {
    this.#entries.delete(key)
  }
}

type DraftEnvelopeOptions = Readonly<{
  caseId?: string
  scenarioId?: string
  policyQualifiedVersion?: string
  applicationState?: string
  documentState?: string
  paymentState?: string
  scrutinyState?: string
  etaState?: string
  unknownAnswer?: boolean
  reverseAnswers?: boolean
  eventType?: string
  invalidEventPayload?: boolean
}>

function createDraftEnvelopeInput(options: DraftEnvelopeOptions = {}) {
  const caseId = options.caseId ?? 'SYN-CASE-MED-001'
  const policyQualifiedVersion =
    options.policyQualifiedVersion ?? ACTIVE_POLICY_QUALIFIED_VERSION
  const answerEntries = [
    ['Q-SHARED-POLICY-COHORT', 'SYN-POLICY-COHORT-A'],
    ['Q-SHARED-PASSPORT-CLASS', 'SYNTHETIC_STANDARD_PASSPORT'],
    ['Q-SHARED-ARRIVAL-DATE', '2099-04-14'],
    ['Q-MEDICAL-TREATMENT-INTENT', 'SYNTHETIC_MEDICAL_TREATMENT'],
    ['Q-MEDICAL-ADMISSION-DATE', '2099-04-18'],
    ['Q-MEDICAL-ATTENDANT-GUIDANCE', 'YES_SYNTHETIC'],
  ] as const
  const orderedAnswerEntries = options.reverseAnswers
    ? answerEntries.toReversed()
    : answerEntries
  const answers = Object.fromEntries(orderedAnswerEntries)
  const boundedAnswers = options.unknownAnswer
    ? { ...answers, 'Q-UNAPPROVED-FIELD': 'SYNTHETIC_UNAPPROVED_VALUE' }
    : answers
  const eventPayload = options.invalidEventPayload
    ? { unapprovedField: 'SYN-UNAPPROVED-EVENT-VALUE' }
    : { snapshotId: 'SYN-SNAPSHOT-MED-001', stepId: 'APPLICATION' }

  return {
    storageSchemaVersion: 1,
    fixtureVersion: 'SYN-P0-RESET@1.0.0',
    activeCaseId: caseId,
    lastUpdatedAt: '2099-03-01T09:12:00Z',
    cases: [
      {
        caseId,
        scenarioId: options.scenarioId ?? 'SYN-MEDICAL-001',
        revision: 1,
        createdAt: '2099-03-01T09:05:00Z',
        updatedAt: '2099-03-01T09:12:00Z',
        policyPin: {
          qualifiedVersion: policyQualifiedVersion,
          digest: activePolicyBundle.digest,
        },
        application: {
          applicationDraftId: 'SYN-DRAFT-MED-001',
          state: options.applicationState ?? 'IN_PROGRESS',
          revision: 1,
          latestDraftSnapshotId: 'SYN-SNAPSHOT-MED-001',
          draftSnapshots: [
            {
              snapshotId: 'SYN-SNAPSHOT-MED-001',
              caseId,
              sequence: 1,
              currentStep: 'APPLICATION',
              answers: boundedAnswers,
              policyQualifiedVersion,
              savedAt: '2099-03-01T09:12:00Z',
            },
          ],
        },
        documents: [
          {
            documentAssetId: 'SYN-DOC-ASSET-MED-001',
            requirementId: 'REQ-HOSPITAL-LETTER-1',
            activeVersionId: 'SYN-DOC-VERSION-MED-001',
            versions: [
              {
                documentVersionId: 'SYN-DOC-VERSION-MED-001',
                sequence: 1,
                state: options.documentState ?? 'CREATED',
              },
            ],
          },
        ],
        payment: {
          state: options.paymentState ?? 'NOT_STARTED',
          mockPaymentAttemptId: null,
          syntheticReference: null,
        },
        scrutiny: {
          scrutinyRecordId: 'SYN-SCRUTINY-MED-001',
          state: options.scrutinyState ?? 'NOT_STARTED',
          submittedDocumentVersionIds: [],
        },
        eta: {
          syntheticEtaId: 'SYN-ETA-MED-001',
          state: options.etaState ?? 'NOT_READY',
        },
        auditEvents: [
          {
            eventId: 'SYN-EVENT-DRAFT-SAVED-001',
            caseId,
            eventType: options.eventType ?? 'DraftSnapshotSaved',
            domain: 'APPLICATION',
            aggregateId: 'SYN-DRAFT-MED-001',
            previousState: 'IN_PROGRESS',
            newState: 'IN_PROGRESS',
            actor: 'APPLICANT',
            syntheticTimestamp: '2099-03-01T09:12:00Z',
            policyQualifiedVersion,
            idempotencyKey: 'SYN-IDEMPOTENCY-SNAPSHOT-001',
            payload: eventPayload,
          },
        ],
      },
    ],
  }
}

function expectValidLoadedState(storage: MemoryStorage) {
  const result = createPersistenceStore(storage).load()
  expect(result.status).toBe('VALID_STATE')
  if (result.status !== 'VALID_STATE') {
    throw new Error(`Expected valid persisted state, received ${result.status}.`)
  }

  return result.state
}

describe('validated P0 persistence', () => {
  it('returns NO_STATE for empty project storage', () => {
    const storage = new MemoryStorage()

    expect(createPersistenceStore(storage).load()).toEqual({
      status: 'NO_STATE',
      resetRequired: false,
    })
  })

  it('contains storage access failures as typed unavailable results', () => {
    const unavailableStorage: StoragePort = {
      getItem(): string | null {
        throw new Error('Unavailable in this test.')
      },
      setItem(): void {
        throw new Error('Unavailable in this test.')
      },
      removeItem(): void {
        throw new Error('Unavailable in this test.')
      },
    }

    expect(createPersistenceStore(unavailableStorage).load()).toEqual({
      status: 'STORAGE_UNAVAILABLE',
      resetRequired: false,
      diagnostic: {
        code: 'STORAGE_OPERATION_FAILED',
        operation: 'LOAD',
      },
    })
  })

  it('saves and reloads the canonical envelope with deterministic serialization', () => {
    const storage = new MemoryStorage()
    const store = createPersistenceStore(storage)
    const canonical = createCanonicalPersistenceEnvelope()

    const saveResult = store.save(canonical)
    expect(saveResult.status).toBe('SAVED')
    const loaded = expectValidLoadedState(storage)

    expect(loaded).toEqual(canonical)
    expect(Object.isFrozen(loaded)).toBe(true)
    expect(storage.getItem(P0_STORAGE_KEY)).toBe(serializePersistenceEnvelope(canonical))
  })

  it('serializes equivalent bounded answer maps to the same bytes', () => {
    const forward = parsePersistenceEnvelope(createDraftEnvelopeInput())
    const reversed = parsePersistenceEnvelope(
      createDraftEnvelopeInput({ reverseAnswers: true }),
    )

    expect(forward).toEqual(reversed)
    expect(serializePersistenceEnvelope(forward)).toBe(
      serializePersistenceEnvelope(reversed),
    )
  })

  it('reloads the same interrupted draft without creating another case or snapshot', () => {
    const storage = new MemoryStorage()
    const firstRuntime = createPersistenceStore(storage)
    const draftEnvelope = parsePersistenceEnvelope(createDraftEnvelopeInput())

    expect(firstRuntime.save(draftEnvelope).status).toBe('SAVED')

    const reloaded = expectValidLoadedState(storage)
    const resumedCase = reloaded.cases[0]
    const latestSnapshot = resumedCase?.application.draftSnapshots.at(-1)

    expect(reloaded.cases).toHaveLength(1)
    expect(resumedCase?.caseId).toBe('SYN-CASE-MED-001')
    expect(resumedCase?.scenarioId).toBe('SYN-MEDICAL-001')
    expect(resumedCase?.policyPin.qualifiedVersion).toBe(ACTIVE_POLICY_QUALIFIED_VERSION)
    expect(latestSnapshot?.currentStep).toBe('APPLICATION')
    expect(latestSnapshot?.answers).toEqual(draftEnvelope.cases[0]?.application.draftSnapshots[0]?.answers)
    expect(resumedCase?.application.draftSnapshots).toHaveLength(1)
  })

  it('returns INVALID_JSON without throwing, echoing, or rewriting corrupt content', () => {
    const storage = new MemoryStorage()
    const corruptValue = '{"untrusted":"SYN-CORRUPT-CONTENT"'
    storage.setItem(P0_STORAGE_KEY, corruptValue)

    const result = createPersistenceStore(storage).load()

    expect(result).toEqual({
      status: 'INVALID_JSON',
      resetRequired: true,
      diagnostic: { code: 'JSON_PARSE_FAILED' },
    })
    expect(JSON.stringify(result)).not.toContain('SYN-CORRUPT-CONTENT')
    expect(storage.getItem(P0_STORAGE_KEY)).toBe(corruptValue)
  })

  it('fails closed on a wrong top-level shape without rewriting storage', () => {
    const storage = new MemoryStorage()
    const wrongShape = JSON.stringify({ storageSchemaVersion: 1 })
    storage.setItem(P0_STORAGE_KEY, wrongShape)

    const result = createPersistenceStore(storage).load()

    expect(result.status).toBe('INVALID_SCHEMA')
    expect(result.resetRequired).toBe(true)
    expect(storage.getItem(P0_STORAGE_KEY)).toBe(wrongShape)
  })

  it('rejects malformed snapshots and unknown answer fields', () => {
    const malformedSnapshot = createDraftEnvelopeInput({ unknownAnswer: true })
    const result = persistenceEnvelopeSchema.safeParse(malformedSnapshot)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('Q-UNAPPROVED-FIELD'))).toBe(
        true,
      )
    }
  })

  it('returns UNSUPPORTED_VERSION and requires reset without migration or rewrite', () => {
    const storage = new MemoryStorage()
    const unsupportedValue = JSON.stringify({
      ...createDraftEnvelopeInput(),
      storageSchemaVersion: 2,
    })
    storage.setItem(P0_STORAGE_KEY, unsupportedValue)

    const result = createPersistenceStore(storage).load()

    expect(result).toEqual({
      status: 'UNSUPPORTED_VERSION',
      resetRequired: true,
      diagnostic: {
        code: 'UNSUPPORTED_STORAGE_SCHEMA_VERSION',
        supportedVersion: 1,
        foundVersion: 2,
      },
    })
    expect(storage.getItem(P0_STORAGE_KEY)).toBe(unsupportedValue)
  })

  it('rejects every unknown persisted lifecycle state', () => {
    const invalidLifecycleInputs = [
      createDraftEnvelopeInput({ applicationState: 'INVALID_APPLICATION_STATE' }),
      createDraftEnvelopeInput({ documentState: 'INVALID_DOCUMENT_STATE' }),
      createDraftEnvelopeInput({ paymentState: 'INVALID_PAYMENT_STATE' }),
      createDraftEnvelopeInput({ scrutinyState: 'INVALID_SCRUTINY_STATE' }),
      createDraftEnvelopeInput({ etaState: 'INVALID_ETA_STATE' }),
    ]

    for (const input of invalidLifecycleInputs) {
      expect(persistenceEnvelopeSchema.safeParse(input).success).toBe(false)
    }
  })

  it('rejects malformed case IDs, unknown scenarios, and unknown policy pins', () => {
    const invalidIdentityInputs = [
      createDraftEnvelopeInput({ caseId: 'CASE-WITHOUT-SYNTHETIC-NAMESPACE' }),
      createDraftEnvelopeInput({ scenarioId: 'SYN-UNKNOWN-001' }),
      createDraftEnvelopeInput({
        policyQualifiedVersion: 'SYN-EVISA-POLICY@9.9.9',
      }),
    ]

    for (const input of invalidIdentityInputs) {
      expect(persistenceEnvelopeSchema.safeParse(input).success).toBe(false)
    }
  })

  it('performs five byte-equivalent resets without touching unrelated storage', () => {
    const storage = new MemoryStorage()
    const store = createPersistenceStore(storage)
    const staleDraft = parsePersistenceEnvelope(createDraftEnvelopeInput())
    storage.setItem('unrelated:application:key', 'keep-this-value')
    expect(store.save(staleDraft).status).toBe('SAVED')

    const resetBytes: string[] = []
    for (let resetNumber = 0; resetNumber < 5; resetNumber += 1) {
      const resetResult = store.reset()
      expect(resetResult.status).toBe('RESET')
      if (resetResult.status !== 'RESET') {
        throw new Error('Expected deterministic reset to succeed.')
      }
      resetBytes.push(resetResult.serialized)
      expect(resetResult.state).toEqual(createCanonicalPersistenceEnvelope())
      expect(resetResult.state.activeCaseId).toBeNull()
      expect(resetResult.state.cases).toEqual([])
    }

    expect(new Set(resetBytes).size).toBe(1)
    expect(resetBytes[0]).toBe(
      serializePersistenceEnvelope(createCanonicalPersistenceEnvelope()),
    )
    expect(storage.getItem('unrelated:application:key')).toBe('keep-this-value')
    expect(expectValidLoadedState(storage).cases).toEqual([])
  })

  it('clears only the project key', () => {
    const storage = new MemoryStorage()
    const store = createPersistenceStore(storage)
    storage.setItem('unrelated:application:key', 'keep-this-value')
    expect(store.reset().status).toBe('RESET')

    expect(store.clearProjectState()).toEqual({ status: 'CLEARED' })
    expect(storage.getItem(P0_STORAGE_KEY)).toBeNull()
    expect(storage.getItem('unrelated:application:key')).toBe('keep-this-value')
  })

  it('persists a privacy-safe event and rejects malformed event data before writing', () => {
    const storage = new MemoryStorage()
    const store = createPersistenceStore(storage)
    const validEnvelope = parsePersistenceEnvelope(createDraftEnvelopeInput())
    expect(store.save(validEnvelope).status).toBe('SAVED')
    const storedBeforeRejection = storage.getItem(P0_STORAGE_KEY)

    const loaded = expectValidLoadedState(storage)
    expect(loaded.cases[0]?.auditEvents[0]).toMatchObject({
      eventType: 'DraftSnapshotSaved',
      payload: {
        snapshotId: 'SYN-SNAPSHOT-MED-001',
        stepId: 'APPLICATION',
      },
    })

    const malformedEventEnvelope = createDraftEnvelopeInput({
      invalidEventPayload: true,
    })
    expect(store.save(malformedEventEnvelope).status).toBe('INVALID_STATE')
    expect(
      persistenceEnvelopeSchema.safeParse(
        createDraftEnvelopeInput({ eventType: 'UnknownDomainEvent' }),
      ).success,
    ).toBe(false)
    expect(storage.getItem(P0_STORAGE_KEY)).toBe(storedBeforeRejection)
  })
})
