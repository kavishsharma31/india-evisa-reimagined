import type { ZodIssue } from 'zod'

import { deepFreeze } from '../policy/schema'
import { P0_STORAGE_KEY, P0_STORAGE_SCHEMA_VERSION } from './keys'
import { createCanonicalPersistenceEnvelope } from './reset'
import {
  persistenceEnvelopeSchema,
  type PersistenceEnvelope,
} from './schema'
import type {
  ClearPersistenceResult,
  LoadPersistenceResult,
  PersistenceDiagnostic,
  PersistenceService,
  ResetPersistenceResult,
  SavePersistenceResult,
  StoragePort,
} from './types'

function createSchemaDiagnostic(
  issues: readonly ZodIssue[],
): Extract<PersistenceDiagnostic, { code: 'SCHEMA_VALIDATION_FAILED' }> {
  const issueCodes = [...new Set(issues.map((issue) => issue.code))]

  return Object.freeze({
    code: 'SCHEMA_VALIDATION_FAILED',
    issueCount: issues.length,
    issueCodes,
  })
}

function createStorageDiagnostic(
  operation: 'LOAD' | 'SAVE' | 'RESET' | 'CLEAR',
): Extract<PersistenceDiagnostic, { code: 'STORAGE_OPERATION_FAILED' }> {
  return Object.freeze({ code: 'STORAGE_OPERATION_FAILED', operation })
}

function readStorageSchemaVersion(value: unknown): number | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  if (!('storageSchemaVersion' in value)) {
    return undefined
  }

  return typeof value.storageSchemaVersion === 'number'
    ? value.storageSchemaVersion
    : undefined
}

export function serializePersistenceEnvelope(envelope: PersistenceEnvelope): string {
  const serialized = JSON.stringify(envelope, (_key, value: unknown) => {
    if (value === null || Array.isArray(value) || typeof value !== 'object') {
      return value
    }

    return Object.fromEntries(
      Object.entries(value).toSorted(([leftKey], [rightKey]) =>
        leftKey.localeCompare(rightKey),
      ),
    )
  })

  if (serialized === undefined) {
    throw new Error('A validated persistence envelope must be serializable.')
  }

  return serialized
}

export function createPersistenceStore(storage: StoragePort): PersistenceService {
  function load(): LoadPersistenceResult {
    let raw: string | null
    try {
      raw = storage.getItem(P0_STORAGE_KEY)
    } catch {
      return Object.freeze({
        status: 'STORAGE_UNAVAILABLE',
        resetRequired: false,
        diagnostic: createStorageDiagnostic('LOAD'),
      })
    }

    if (raw === null) {
      return Object.freeze({ status: 'NO_STATE', resetRequired: false })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return Object.freeze({
        status: 'INVALID_JSON',
        resetRequired: true,
        diagnostic: Object.freeze({ code: 'JSON_PARSE_FAILED' }),
      })
    }

    const storedVersion = readStorageSchemaVersion(parsed)
    if (storedVersion !== undefined && storedVersion !== P0_STORAGE_SCHEMA_VERSION) {
      return Object.freeze({
        status: 'UNSUPPORTED_VERSION',
        resetRequired: true,
        diagnostic: Object.freeze({
          code: 'UNSUPPORTED_STORAGE_SCHEMA_VERSION',
          supportedVersion: P0_STORAGE_SCHEMA_VERSION,
          foundVersion: storedVersion,
        }),
      })
    }

    const validation = persistenceEnvelopeSchema.safeParse(parsed)
    if (!validation.success) {
      return Object.freeze({
        status: 'INVALID_SCHEMA',
        resetRequired: true,
        diagnostic: createSchemaDiagnostic(validation.error.issues),
      })
    }

    return Object.freeze({
      status: 'VALID_STATE',
      resetRequired: false,
      state: deepFreeze(validation.data),
    })
  }

  function save(candidate: unknown): SavePersistenceResult {
    const validation = persistenceEnvelopeSchema.safeParse(candidate)
    if (!validation.success) {
      return Object.freeze({
        status: 'INVALID_STATE',
        diagnostic: createSchemaDiagnostic(validation.error.issues),
      })
    }

    const state = deepFreeze(validation.data)
    const serialized = serializePersistenceEnvelope(state)
    try {
      storage.setItem(P0_STORAGE_KEY, serialized)
    } catch {
      return Object.freeze({
        status: 'STORAGE_UNAVAILABLE',
        diagnostic: createStorageDiagnostic('SAVE'),
      })
    }

    return Object.freeze({ status: 'SAVED', state, serialized })
  }

  function reset(): ResetPersistenceResult {
    const state = createCanonicalPersistenceEnvelope()
    const serialized = serializePersistenceEnvelope(state)
    try {
      storage.removeItem(P0_STORAGE_KEY)
      storage.setItem(P0_STORAGE_KEY, serialized)
    } catch {
      return Object.freeze({
        status: 'STORAGE_UNAVAILABLE',
        diagnostic: createStorageDiagnostic('RESET'),
      })
    }

    return Object.freeze({ status: 'RESET', state, serialized })
  }

  function clearProjectState(): ClearPersistenceResult {
    try {
      storage.removeItem(P0_STORAGE_KEY)
    } catch {
      return Object.freeze({
        status: 'STORAGE_UNAVAILABLE',
        diagnostic: createStorageDiagnostic('CLEAR'),
      })
    }

    return Object.freeze({ status: 'CLEARED' })
  }

  return Object.freeze({ load, save, reset, clearProjectState })
}
