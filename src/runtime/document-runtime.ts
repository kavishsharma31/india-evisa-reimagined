import {
  transitionDocumentVersionState,
  type DomainCommand,
  type DocumentVersionState,
  type SyntheticId,
} from '../domain'
import { syntheticIdSchema } from '../domain/ids'
import {
  canonicalDocumentFixtures,
  type DocumentFixture,
} from '../fixtures'
import type { PolicyEvaluationResult } from '../policy'
import { deepFreeze } from '../policy/schema'
import {
  persistedCaseSchema,
  persistedDomainEventSchema,
  type PersistedCase,
  type PersistedDomainEvent,
} from '../persistence'
import type {
  RuntimeDocumentRequirementView,
  RuntimeDocumentVersionView,
  RuntimeDocumentsInspected,
  RuntimeMetadataSource,
} from './contracts'

const A04_FIXTURE_IDS = Object.freeze([
  'SYN-FIXTURE-PORTRAIT-VALID-001',
  'SYN-FIXTURE-PASSPORT-VALID-001',
  'SYN-FIXTURE-PASSPORT-UNCLEAR-001',
  'SYN-FIXTURE-HOSPITAL-LETTER-V1-001',
] as const)

export const a04DocumentFixtures = deepFreeze(
  canonicalDocumentFixtures.filter(({ fixtureId }) =>
    A04_FIXTURE_IDS.some((allowedFixtureId) => allowedFixtureId === fixtureId),
  ),
)

const legacyFixtureByVersionId: Readonly<Record<string, SyntheticId>> = Object.freeze({
  'SYN-DOCVER-PORTRAIT-V1': 'SYN-FIXTURE-PORTRAIT-VALID-001',
  'SYN-DOCVER-PASSPORT-V1': 'SYN-FIXTURE-PASSPORT-VALID-001',
  'SYN-DOCVER-PASSPORT-DEFECT-V1': 'SYN-FIXTURE-PASSPORT-UNCLEAR-001',
  'SYN-DOCVER-HOSPITAL-V1': 'SYN-FIXTURE-HOSPITAL-LETTER-V1-001',
})

type CreateDocumentVersionCommand = Extract<DomainCommand, { type: 'CreateDocumentVersion' }>
type PreflightPassedCommand = Extract<DomainCommand, { type: 'PreflightPassed' }>
type PreflightFailedCommand = Extract<DomainCommand, { type: 'PreflightFailed' }>
type ActivateReplacementCommand = Extract<DomainCommand, { type: 'ActivateReplacement' }>

type InspectionOutcome = Readonly<{
  state: 'PREFLIGHT_PASSED' | 'PREFLIGHT_FAILED'
  reasonCode: string
}>

export type DocumentMutation = Readonly<{
  accepted: true
  persistedCase: PersistedCase
  documentVersionId: SyntheticId
  events: readonly PersistedDomainEvent[]
}>

export type DocumentMutationRejection = Readonly<{
  accepted: false
  reasonCode: 'GUARD_FAILED' | 'INVALID_LIFECYCLE_TRANSITION'
  documentState?: DocumentVersionState
}>

function identifierBody(identifier: SyntheticId): string {
  return identifier.slice('SYN-'.length)
}

function fixtureForVersionId(documentVersionId: SyntheticId): DocumentFixture | undefined {
  const legacyFixtureId = legacyFixtureByVersionId[documentVersionId]
  if (legacyFixtureId !== undefined) {
    return canonicalDocumentFixtures.find(({ fixtureId }) => fixtureId === legacyFixtureId)
  }

  return canonicalDocumentFixtures.find(({ fixtureId }) =>
    documentVersionId.includes(`-${fixtureId.slice('SYN-FIXTURE-'.length)}-V`),
  )
}

function inspectionReasonCode(
  persistedCase: PersistedCase,
  documentVersionId: SyntheticId,
): string | null {
  for (let index = persistedCase.auditEvents.length - 1; index >= 0; index -= 1) {
    const event = persistedCase.auditEvents[index]
    if (
      event !== undefined &&
      (event.eventType === 'DocumentPreflightPassed' ||
        event.eventType === 'DocumentPreflightFailed') &&
      event.payload.documentVersionId === documentVersionId
    ) {
      return typeof event.payload.outcomeCode === 'string' ? event.payload.outcomeCode : null
    }
  }
  return null
}

function versionView(
  persistedCase: PersistedCase,
  version: PersistedCase['documents'][number]['versions'][number],
): RuntimeDocumentVersionView | null {
  const fixture = fixtureForVersionId(version.documentVersionId)
  if (fixture === undefined) {
    return null
  }
  return deepFreeze({
    documentVersionId: version.documentVersionId,
    sequence: version.sequence,
    fixtureId: fixture.fixtureId,
    state: version.state,
    inspectionReasonCode: inspectionReasonCode(persistedCase, version.documentVersionId),
  })
}

function preparationStatus(
  currentVersion: RuntimeDocumentVersionView | null,
): RuntimeDocumentRequirementView['status'] {
  if (currentVersion === null || currentVersion.state === 'CREATED') {
    return 'NOT_CHECKED'
  }
  return currentVersion.state === 'PREFLIGHT_PASSED' ? 'READY' : 'NEEDS_ATTENTION'
}

export function buildDocumentPreparationView(
  persistedCase: PersistedCase,
  evaluation: PolicyEvaluationResult,
): RuntimeDocumentsInspected {
  const requirements = evaluation.documentManifest?.requirements ?? []
  const requirementViews = requirements.map((requirement): RuntimeDocumentRequirementView => {
    const aggregate = persistedCase.documents.find(
      ({ requirementId }) => requirementId === requirement.id,
    )
    const history = (aggregate?.versions ?? []).flatMap((version) => {
      const view = versionView(persistedCase, version)
      return view === null ? [] : [view]
    })
    const currentVersion =
      aggregate?.activeVersionId === null || aggregate?.activeVersionId === undefined
        ? null
        : history.find(
            ({ documentVersionId }) => documentVersionId === aggregate.activeVersionId,
          ) ?? null
    const fixtureOptions = a04DocumentFixtures
      .filter(
        (fixture) =>
          fixture.requirementId === requirement.id &&
          requirement.acceptedFixtureCategories.includes(fixture.fixtureCategory),
      )
      .map((fixture) =>
        deepFreeze({
          fixtureId: fixture.fixtureId,
          label: fixture.label,
          watermark: fixture.watermark,
          recoveryExample: fixture.fixtureId === 'SYN-FIXTURE-PASSPORT-UNCLEAR-001',
        }),
      )

    return deepFreeze({
      requirementId: requirement.id,
      documentType: requirement.documentType,
      guidance: requirement.guidance,
      status: preparationStatus(currentVersion),
      fixtureOptions,
      currentVersion,
      versionHistory: history,
    })
  })
  const readyCount = requirementViews.filter(({ status }) => status === 'READY').length

  return deepFreeze({
    status: 'DOCUMENTS_INSPECTED',
    caseId: persistedCase.caseId,
    scenarioId: persistedCase.scenarioId,
    policyQualifiedVersion: persistedCase.policyPin.qualifiedVersion,
    revision: persistedCase.revision,
    requiredCount: requirementViews.length,
    readyCount,
    allReady: requirementViews.length > 0 && readyCount === requirementViews.length,
    requirements: requirementViews,
  })
}

function preflightIdempotencyKey(documentVersionId: SyntheticId): SyntheticId {
  return syntheticIdSchema.parse(
    `SYN-IDEMPOTENCY-PREFLIGHT-${identifierBody(documentVersionId)}`,
  )
}

function replacementIdempotencyKey(
  previousVersionId: SyntheticId,
  replacementVersionId: SyntheticId,
): SyntheticId {
  return syntheticIdSchema.parse(
    `SYN-IDEMPOTENCY-SUPERSEDE-${identifierBody(previousVersionId)}-${identifierBody(replacementVersionId)}`,
  )
}

export function applyDocumentPreparation(input: {
  persistedCase: PersistedCase
  fixture: DocumentFixture
  outcome: InspectionOutcome
  idempotencyKey: SyntheticId
  metadata: RuntimeMetadataSource
}): DocumentMutation | DocumentMutationRejection {
  const existingAggregate = input.persistedCase.documents.find(
    ({ requirementId }) => requirementId === input.fixture.requirementId,
  )
  const existingActiveVersion = existingAggregate?.versions.find(
    ({ documentVersionId }) => documentVersionId === existingAggregate.activeVersionId,
  )

  if (existingAggregate !== undefined && existingActiveVersion === undefined) {
    return deepFreeze({ accepted: false, reasonCode: 'GUARD_FAILED' })
  }
  if (existingActiveVersion !== undefined && input.outcome.state !== 'PREFLIGHT_PASSED') {
    return deepFreeze({
      accepted: false,
      reasonCode: 'GUARD_FAILED',
      documentState: existingActiveVersion.state,
    })
  }

  const sequence = (existingAggregate?.versions.length ?? 0) + 1
  const documentAssetId =
    existingAggregate?.documentAssetId ??
    input.metadata.documentAssetId(input.persistedCase.caseId, input.fixture.requirementId)
  const documentVersionId = input.metadata.documentVersionId(
    input.persistedCase.caseId,
    input.fixture.fixtureId,
    sequence,
  )
  const createRevision = input.persistedCase.revision + 1
  const createdAt = input.metadata.nextTimestamp(input.persistedCase.updatedAt)
  const createCommand: CreateDocumentVersionCommand = deepFreeze({
    commandId: input.metadata.commandId(
      input.persistedCase.caseId,
      'PrepareDocument',
      createRevision,
    ),
    type: 'CreateDocumentVersion',
    caseId: input.persistedCase.caseId,
    actor: 'APPLICANT',
    syntheticTimestamp: createdAt,
    idempotencyKey: input.idempotencyKey,
    payload: {
      documentAssetId,
      fixtureCategory: input.fixture.fixtureCategory,
      sequence,
    },
  })
  const createEvent = persistedDomainEventSchema.parse({
    eventId: input.metadata.eventId(
      input.persistedCase.caseId,
      'DocumentVersionCreated',
      createRevision,
    ),
    caseId: input.persistedCase.caseId,
    eventType: 'DocumentVersionCreated',
    domain: 'DOCUMENT',
    aggregateId: documentAssetId,
    newState: 'CREATED',
    actor: createCommand.actor,
    syntheticTimestamp: createdAt,
    policyQualifiedVersion: input.persistedCase.policyPin.qualifiedVersion,
    idempotencyKey: createCommand.idempotencyKey,
    payload: {
      documentAssetId,
      documentVersionId,
      fixtureCategory: input.fixture.fixtureCategory,
      sequence,
    },
  })

  const preflightTransition = transitionDocumentVersionState('CREATED', input.outcome.state)
  if (!preflightTransition.accepted) {
    return deepFreeze({ accepted: false, reasonCode: preflightTransition.reasonCode })
  }
  const preflightRevision = createRevision + 1
  const inspectedAt = input.metadata.nextTimestamp(createdAt)
  const preflightCommand: PreflightPassedCommand | PreflightFailedCommand =
    input.outcome.state === 'PREFLIGHT_PASSED'
      ? deepFreeze({
          commandId: input.metadata.commandId(
            input.persistedCase.caseId,
            'PrepareDocument',
            preflightRevision,
          ),
          type: 'PreflightPassed',
          caseId: input.persistedCase.caseId,
          actor: 'SYSTEM',
          syntheticTimestamp: inspectedAt,
          idempotencyKey: preflightIdempotencyKey(documentVersionId),
          payload: { documentVersionId },
        })
      : deepFreeze({
          commandId: input.metadata.commandId(
            input.persistedCase.caseId,
            'PrepareDocument',
            preflightRevision,
          ),
          type: 'PreflightFailed',
          caseId: input.persistedCase.caseId,
          actor: 'SYSTEM',
          syntheticTimestamp: inspectedAt,
          idempotencyKey: preflightIdempotencyKey(documentVersionId),
          payload: {
            documentVersionId,
            reasonCode: 'R-SYN-DOCUMENT-PREFLIGHT-FAILED',
          },
        })
  const preflightEventType =
    input.outcome.state === 'PREFLIGHT_PASSED'
      ? 'DocumentPreflightPassed'
      : 'DocumentPreflightFailed'
  const preflightEvent = persistedDomainEventSchema.parse({
    eventId: input.metadata.eventId(
      input.persistedCase.caseId,
      preflightEventType,
      preflightRevision,
    ),
    caseId: input.persistedCase.caseId,
    eventType: preflightEventType,
    domain: 'DOCUMENT',
    aggregateId: documentAssetId,
    previousState: preflightTransition.previousState,
    newState: preflightTransition.nextState,
    actor: preflightCommand.actor,
    syntheticTimestamp: inspectedAt,
    policyQualifiedVersion: input.persistedCase.policyPin.qualifiedVersion,
    idempotencyKey: preflightCommand.idempotencyKey,
    ...(input.outcome.state === 'PREFLIGHT_FAILED'
      ? { reasonCode: 'R-SYN-DOCUMENT-PREFLIGHT-FAILED' }
      : {}),
    payload: {
      documentAssetId,
      documentVersionId,
      outcomeCode: input.outcome.reasonCode,
    },
  })

  const newVersion = {
    documentVersionId,
    sequence,
    state: preflightTransition.nextState,
    ...(existingActiveVersion === undefined
      ? {}
      : { predecessorVersionId: existingActiveVersion.documentVersionId }),
  }
  const events: PersistedDomainEvent[] = [createEvent, preflightEvent]
  let versions = [...(existingAggregate?.versions ?? []), newVersion]
  let finalTimestamp = inspectedAt

  if (existingActiveVersion !== undefined) {
    const supersedeTransition = transitionDocumentVersionState(
      existingActiveVersion.state,
      'SUPERSEDED',
    )
    if (!supersedeTransition.accepted) {
      return deepFreeze({
        accepted: false,
        reasonCode: supersedeTransition.reasonCode,
        documentState: existingActiveVersion.state,
      })
    }
    const supersedeRevision = preflightRevision + 1
    finalTimestamp = input.metadata.nextTimestamp(inspectedAt)
    const replacementCommand: ActivateReplacementCommand = deepFreeze({
      commandId: input.metadata.commandId(
        input.persistedCase.caseId,
        'PrepareDocument',
        supersedeRevision,
      ),
      type: 'ActivateReplacement',
      caseId: input.persistedCase.caseId,
      actor: 'SYSTEM',
      syntheticTimestamp: finalTimestamp,
      idempotencyKey: replacementIdempotencyKey(
        existingActiveVersion.documentVersionId,
        documentVersionId,
      ),
      payload: {
        previousVersionId: existingActiveVersion.documentVersionId,
        replacementVersionId: documentVersionId,
      },
    })
    versions = versions.map((version) =>
      version.documentVersionId === existingActiveVersion.documentVersionId
        ? { ...version, state: supersedeTransition.nextState }
        : version,
    )
    events.push(
      persistedDomainEventSchema.parse({
        eventId: input.metadata.eventId(
          input.persistedCase.caseId,
          'DocumentVersionSuperseded',
          supersedeRevision,
        ),
        caseId: input.persistedCase.caseId,
        eventType: 'DocumentVersionSuperseded',
        domain: 'DOCUMENT',
        aggregateId: documentAssetId,
        previousState: supersedeTransition.previousState,
        newState: supersedeTransition.nextState,
        actor: replacementCommand.actor,
        syntheticTimestamp: finalTimestamp,
        policyQualifiedVersion: input.persistedCase.policyPin.qualifiedVersion,
        idempotencyKey: replacementCommand.idempotencyKey,
        payload: {
          documentAssetId,
          documentVersionId: existingActiveVersion.documentVersionId,
          outcomeCode: documentVersionId,
        },
      }),
    )
  }

  const nextAggregate = {
    documentAssetId,
    requirementId: input.fixture.requirementId,
    activeVersionId: documentVersionId,
    versions,
  }
  const nextDocuments =
    existingAggregate === undefined
      ? [...input.persistedCase.documents, nextAggregate]
      : input.persistedCase.documents.map((aggregate) =>
          aggregate.requirementId === input.fixture.requirementId ? nextAggregate : aggregate,
        )
  const nextCase = persistedCaseSchema.parse({
    ...input.persistedCase,
    revision: input.persistedCase.revision + events.length,
    updatedAt: finalTimestamp,
    documents: nextDocuments,
    auditEvents: [...input.persistedCase.auditEvents, ...events],
  })

  return deepFreeze({
    accepted: true,
    persistedCase: nextCase,
    documentVersionId,
    events,
  })
}
