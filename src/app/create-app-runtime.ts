import { createLocalMockAdapters, type LocalMockAdapters } from '../mocks'
import {
  createLocalStoragePersistence,
  type PersistenceService,
  type ResetPersistenceResult,
} from '../persistence'
import {
  createDemoRuntime,
  createDeterministicRuntimeMetadata,
  type DemoRuntime,
  type RuntimeMetadataSource,
} from '../runtime'

export type AppRuntimeServices = Readonly<{
  runtime: DemoRuntime
  resetDemoData(): ResetPersistenceResult
}>

export type AppRuntimeOptions = Readonly<{
  store?: PersistenceService
  adapters?: LocalMockAdapters
  metadata?: RuntimeMetadataSource
}>

export function createAppRuntime(
  options: AppRuntimeOptions = {},
): AppRuntimeServices {
  const store = options.store ?? createLocalStoragePersistence()
  const runtime = createDemoRuntime({
    store,
    adapters: options.adapters ?? createLocalMockAdapters(),
    metadata: options.metadata ?? createDeterministicRuntimeMetadata(),
  })

  return Object.freeze({
    runtime,
    resetDemoData() {
      return store.reset()
    },
  })
}
