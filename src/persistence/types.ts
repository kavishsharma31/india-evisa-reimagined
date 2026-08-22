import type { ZodIssue } from 'zod'

import type { PersistenceEnvelope } from './schema'

export type StoragePort = Readonly<{
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}>

export type PersistenceDiagnostic =
  | Readonly<{ code: 'JSON_PARSE_FAILED' }>
  | Readonly<{
      code: 'SCHEMA_VALIDATION_FAILED'
      issueCount: number
      issueCodes: readonly ZodIssue['code'][]
    }>
  | Readonly<{
      code: 'UNSUPPORTED_STORAGE_SCHEMA_VERSION'
      supportedVersion: 1
      foundVersion: number
    }>
  | Readonly<{
      code: 'STORAGE_OPERATION_FAILED'
      operation: 'LOAD' | 'SAVE' | 'RESET' | 'CLEAR'
    }>

export type LoadPersistenceResult =
  | Readonly<{ status: 'VALID_STATE'; resetRequired: false; state: PersistenceEnvelope }>
  | Readonly<{ status: 'NO_STATE'; resetRequired: false }>
  | Readonly<{
      status: 'INVALID_JSON'
      resetRequired: true
      diagnostic: Extract<PersistenceDiagnostic, { code: 'JSON_PARSE_FAILED' }>
    }>
  | Readonly<{
      status: 'INVALID_SCHEMA'
      resetRequired: true
      diagnostic: Extract<PersistenceDiagnostic, { code: 'SCHEMA_VALIDATION_FAILED' }>
    }>
  | Readonly<{
      status: 'UNSUPPORTED_VERSION'
      resetRequired: true
      diagnostic: Extract<
        PersistenceDiagnostic,
        { code: 'UNSUPPORTED_STORAGE_SCHEMA_VERSION' }
      >
    }>
  | Readonly<{
      status: 'STORAGE_UNAVAILABLE'
      resetRequired: false
      diagnostic: Extract<PersistenceDiagnostic, { code: 'STORAGE_OPERATION_FAILED' }>
    }>

export type SavePersistenceResult =
  | Readonly<{
      status: 'SAVED'
      state: PersistenceEnvelope
      serialized: string
    }>
  | Readonly<{
      status: 'INVALID_STATE'
      diagnostic: Extract<PersistenceDiagnostic, { code: 'SCHEMA_VALIDATION_FAILED' }>
    }>
  | Readonly<{
      status: 'STORAGE_UNAVAILABLE'
      diagnostic: Extract<PersistenceDiagnostic, { code: 'STORAGE_OPERATION_FAILED' }>
    }>

export type ResetPersistenceResult =
  | Readonly<{
      status: 'RESET'
      state: PersistenceEnvelope
      serialized: string
    }>
  | Readonly<{
      status: 'STORAGE_UNAVAILABLE'
      diagnostic: Extract<PersistenceDiagnostic, { code: 'STORAGE_OPERATION_FAILED' }>
    }>

export type ClearPersistenceResult =
  | Readonly<{ status: 'CLEARED' }>
  | Readonly<{
      status: 'STORAGE_UNAVAILABLE'
      diagnostic: Extract<PersistenceDiagnostic, { code: 'STORAGE_OPERATION_FAILED' }>
    }>

export type PersistenceService = Readonly<{
  load(): LoadPersistenceResult
  save(candidate: unknown): SavePersistenceResult
  reset(): ResetPersistenceResult
  clearProjectState(): ClearPersistenceResult
}>
