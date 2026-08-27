import type {
  ApplicationState,
  DocumentVersionState,
  EtaState,
  EventActor,
  EventDomain,
  DomainEventType,
  PaymentState,
  ScrutinyState,
  SyntheticId,
} from '../domain'
import { syntheticTimestampSchema } from '../domain/ids'
import { LEGACY_POLICY_QUALIFIED_VERSION, legacyPolicyBundle } from '../policy'
import { deepFreeze } from '../policy/schema'
import {
  P0_FIXTURE_VERSION,
  P0_STORAGE_SCHEMA_VERSION,
  draftSnapshotSchema,
  parsePersistenceEnvelope,
  persistedCaseSchema,
  persistedDomainEventSchema,
  type DraftSnapshot,
  type PersistedCase,
  type PersistedDomainEvent,
  type PersistenceEnvelope,
} from '../persistence'
import type { DocumentFixture, RecoverySeed } from './schema'

export const MEDICAL_CASE_ID = 'SYN-CASE-MED-001' as const
export const TOURIST_CASE_ID = 'SYN-CASE-TOURIST-001' as const

export const MEDICAL_APPLICATION_DRAFT_ID = 'SYN-APPLICATION-DRAFT-MED-001' as const
export const TOURIST_APPLICATION_DRAFT_ID = 'SYN-APPLICATION-DRAFT-TOURIST-001' as const

export const MEDICAL_SCRUTINY_RECORD_ID = 'SYN-SCRUTINY-MED-001' as const
export const TOURIST_SCRUTINY_RECORD_ID = 'SYN-SCRUTINY-TOURIST-001' as const

export const MEDICAL_ETA_ID = 'SYN-ETA-MED-001' as const
export const TOURIST_ETA_ID = 'SYN-ETA-TOURIST-001' as const

export const MEDICAL_PAYMENT_ATTEMPT_ID = 'SYN-PAYMENT-ATTEMPT-MED-001' as const
export const MEDICAL_PAYMENT_REFERENCE = 'SYN-PAYMENT-REFERENCE-MED-001' as const

export const MEDICAL_CONTROLLED_ANSWERS = deepFreeze({
  'Q-SHARED-POLICY-COHORT': 'SYN-POLICY-COHORT-A',
  'Q-SHARED-PASSPORT-CLASS': 'SYNTHETIC_STANDARD_PASSPORT',
  'Q-SHARED-ARRIVAL-DATE': '2099-04-14',
  'Q-MEDICAL-TREATMENT-INTENT': 'SYNTHETIC_MEDICAL_TREATMENT',
  'Q-MEDICAL-ADMISSION-DATE': '2099-04-18',
  'Q-MEDICAL-ATTENDANT-GUIDANCE': 'YES_SYNTHETIC',
})

export const TOURIST_CONTROLLED_ANSWERS = deepFreeze({
  'Q-SHARED-POLICY-COHORT': 'SYN-POLICY-COHORT-A',
  'Q-SHARED-PASSPORT-CLASS': 'SYNTHETIC_STANDARD_PASSPORT',
  'Q-SHARED-ARRIVAL-DATE': '2099-05-10',
  'Q-TOURIST-LEISURE-INTENT': 'SYNTHETIC_TOURISM',
  'Q-TOURIST-EXIT-DATE': '2099-05-17',
})

type ApplicationStepId = DraftSnapshot['currentStep']
type ScenarioId = PersistedCase['scenarioId']
type PersistedDocument = PersistedCase['documents'][number]
type PrivacySafePayloadValue = string | number | boolean | null | readonly string[]
type PrivacySafePayload = Readonly<Record<string, PrivacySafePayloadValue>>

export type SeedDocumentDefinition = Readonly<{
  fixture: DocumentFixture
  documentVersionId: SyntheticId
  state: DocumentVersionState
}>

export type SeedCaseDefinition = Readonly<{
  caseId: SyntheticId
  scenarioId: ScenarioId
  applicationDraftId: SyntheticId
  applicationState: ApplicationState
  applicationRevision: number
  snapshots: readonly DraftSnapshot[]
  documents: readonly PersistedDocument[]
  paymentState: PaymentState
  paymentAttemptId?: SyntheticId
  paymentReference?: SyntheticId
  scrutinyRecordId: SyntheticId
  scrutinyState: ScrutinyState
  submittedDocumentVersionIds: readonly SyntheticId[]
  syntheticEtaId: SyntheticId
  etaState: EtaState
  auditEvents: readonly PersistedDomainEvent[]
  updatedAtMinute: number
}>

type SeedEventDefinition = Readonly<{
  eventType: DomainEventType
  domain: EventDomain
  aggregateId: SyntheticId
  actor: EventActor
  previousState?: string
  newState?: string
  reasonCode?: `R-SYN-${string}`
  idempotencyKey?: SyntheticId
  payload?: PrivacySafePayload
}>

export function controlledFixtureTimestamp(minute: number) {
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error('Controlled fixture minute must be an integer from 0 through 59.')
  }

  return syntheticTimestampSchema.parse(
    `2099-03-01T09:${String(minute).padStart(2, '0')}:00Z`,
  )
}

export function createDraftSnapshot(input: {
  snapshotId: SyntheticId
  caseId: SyntheticId
  sequence: number
  currentStep: ApplicationStepId
  answers: Readonly<Record<string, string>>
  savedAtMinute: number
}): DraftSnapshot {
  return deepFreeze(
    draftSnapshotSchema.parse({
      snapshotId: input.snapshotId,
      caseId: input.caseId,
      sequence: input.sequence,
      currentStep: input.currentStep,
      answers: input.answers,
      policyQualifiedVersion: LEGACY_POLICY_QUALIFIED_VERSION,
      savedAt: controlledFixtureTimestamp(input.savedAtMinute),
    }),
  )
}

export function createSeedDocument(input: SeedDocumentDefinition): PersistedDocument {
  return deepFreeze({
    documentAssetId: input.fixture.fixtureId,
    requirementId: input.fixture.requirementId,
    activeVersionId: input.documentVersionId,
    versions: [
      {
        documentVersionId: input.documentVersionId,
        sequence: 1,
        state: input.state,
      },
    ],
  })
}

export function createSeedEventFactory(input: {
  seedTag: string
  caseId: SyntheticId
  firstMinute?: number
}) {
  let sequence = 0
  const firstMinute = input.firstMinute ?? 1

  return function createEvent(definition: SeedEventDefinition): PersistedDomainEvent {
    sequence += 1
    const eventSuffix = String(sequence).padStart(2, '0')
    return deepFreeze(
      persistedDomainEventSchema.parse({
        eventId: `SYN-EVENT-${input.seedTag}-${eventSuffix}`,
        caseId: input.caseId,
        eventType: definition.eventType,
        domain: definition.domain,
        aggregateId: definition.aggregateId,
        actor: definition.actor,
        syntheticTimestamp: controlledFixtureTimestamp(firstMinute + sequence - 1),
        policyQualifiedVersion: LEGACY_POLICY_QUALIFIED_VERSION,
        payload: definition.payload ?? {},
        ...(definition.previousState === undefined
          ? {}
          : { previousState: definition.previousState }),
        ...(definition.newState === undefined ? {} : { newState: definition.newState }),
        ...(definition.reasonCode === undefined ? {} : { reasonCode: definition.reasonCode }),
        ...(definition.idempotencyKey === undefined
          ? {}
          : { idempotencyKey: definition.idempotencyKey }),
      }),
    )
  }
}

export function createSeedCase(definition: SeedCaseDefinition): PersistedCase {
  // Seed-only construction proves reachable demo worlds. Runtime product writes must still
  // pass through the validated domain-command layer and its guarded lifecycle transitions.
  const paymentStarted = definition.paymentState !== 'NOT_STARTED'
  return deepFreeze(
    persistedCaseSchema.parse({
      caseId: definition.caseId,
      scenarioId: definition.scenarioId,
      revision: definition.auditEvents.length,
      createdAt: controlledFixtureTimestamp(1),
      updatedAt: controlledFixtureTimestamp(definition.updatedAtMinute),
      policyPin: {
        qualifiedVersion: LEGACY_POLICY_QUALIFIED_VERSION,
        digest: legacyPolicyBundle.digest,
      },
      application: {
        applicationDraftId: definition.applicationDraftId,
        state: definition.applicationState,
        revision: definition.applicationRevision,
        latestDraftSnapshotId: definition.snapshots.at(-1)?.snapshotId ?? null,
        draftSnapshots: definition.snapshots,
      },
      documents: definition.documents,
      payment: {
        state: definition.paymentState,
        mockPaymentAttemptId: paymentStarted ? definition.paymentAttemptId : null,
        syntheticReference: paymentStarted ? definition.paymentReference : null,
      },
      scrutiny: {
        scrutinyRecordId: definition.scrutinyRecordId,
        state: definition.scrutinyState,
        submittedDocumentVersionIds: definition.submittedDocumentVersionIds,
      },
      eta: {
        syntheticEtaId: definition.syntheticEtaId,
        state: definition.etaState,
      },
      auditEvents: definition.auditEvents,
    }),
  )
}

export function createSeedEnvelope(persistedCase: PersistedCase): PersistenceEnvelope {
  return parsePersistenceEnvelope({
    storageSchemaVersion: P0_STORAGE_SCHEMA_VERSION,
    fixtureVersion: P0_FIXTURE_VERSION,
    activeCaseId: persistedCase.caseId,
    lastUpdatedAt: persistedCase.updatedAt,
    cases: [persistedCase],
  })
}

export function activeVersionState(seed: RecoverySeed, fixtureId: string) {
  const persistedCase = seed.envelope.cases[0]
  const document = persistedCase?.documents.find(
    ({ documentAssetId }) => documentAssetId === fixtureId,
  )
  return document?.versions.find(
    ({ documentVersionId }) => documentVersionId === document.activeVersionId,
  )?.state
}
