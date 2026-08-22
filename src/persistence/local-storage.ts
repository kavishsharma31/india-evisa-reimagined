import { createPersistenceStore } from './store'
import type { PersistenceService, StoragePort } from './types'

const unavailableStorage: StoragePort = Object.freeze({
  getItem(): string | null {
    throw new Error('Browser storage is unavailable.')
  },
  setItem(): void {
    throw new Error('Browser storage is unavailable.')
  },
  removeItem(): void {
    throw new Error('Browser storage is unavailable.')
  },
})

export function createLocalStoragePersistence(): PersistenceService {
  let storage: StoragePort
  try {
    storage = globalThis.localStorage
  } catch {
    storage = unavailableStorage
  }

  return createPersistenceStore(storage)
}
