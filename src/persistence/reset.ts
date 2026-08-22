import { CANONICAL_RESET_TIMESTAMP, P0_FIXTURE_VERSION, P0_STORAGE_SCHEMA_VERSION } from './keys'
import { parsePersistenceEnvelope, type PersistenceEnvelope } from './schema'

export function createCanonicalPersistenceEnvelope(): PersistenceEnvelope {
  return parsePersistenceEnvelope({
    storageSchemaVersion: P0_STORAGE_SCHEMA_VERSION,
    fixtureVersion: P0_FIXTURE_VERSION,
    activeCaseId: null,
    lastUpdatedAt: CANONICAL_RESET_TIMESTAMP,
    cases: [],
  })
}
