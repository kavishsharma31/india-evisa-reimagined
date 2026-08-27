import { z } from 'zod'

import {
  APPLICATION_STATES,
  DOCUMENT_VERSION_STATES,
  DOMAIN_EVENT_TYPES,
  ETA_STATES,
  PAYMENT_STATES,
  SCRUTINY_STATES,
} from '../domain'
import {
  policyQualifiedVersionSchema,
  reasonCodeSchema,
  syntheticIdSchema,
  syntheticTimestampSchema,
} from '../domain/ids'
import { isSupportedPolicyPin, registeredPolicyBundles } from '../policy'
import { deepFreeze, type DeepReadonly } from '../policy/schema'
import {
  P0_FIXTURE_VERSION,
  P0_STORAGE_SCHEMA_VERSION,
  PERSISTED_SCENARIO_IDS,
} from './keys'

export const APPLICATION_STEP_IDS = Object.freeze([
  'PURPOSE',
  'APPLICATION',
  'DOCUMENTS',
  'REVIEW',
  'MOCK_PAYMENT',
  'STATUS',
] as const)

export const EVENT_PAYLOAD_KEYS = Object.freeze([
  'scenarioId',
  'stepId',
  'snapshotId',
  'documentAssetId',
  'documentVersionId',
  'fixtureCategory',
  'sequence',
  'attemptId',
  'scrutinyRecordId',
  'syntheticEtaId',
  'outcomeCode',
  'policyEvaluationId',
] as const)

const documentRequirementIdSchema = z.enum([
  'REQ-PORTRAIT-1',
  'REQ-PASSPORT-PAGE-1',
  'REQ-HOSPITAL-LETTER-1',
  'REQ-BUSINESS-CARD-1',
  'REQ-ADMISSION-LETTER-1',
  'REQ-FINANCIAL-SUPPORT-1',
  'REQ-TRANSIT-TICKETS-1',
  'REQ-DESTINATION-ENTRY-1',
  'REQ-RELATIONSHIP-PROOF-1',
  'REQ-CIVIL-CERTIFICATE-1',
])

const questionAllowedValues = new Map(
  registeredPolicyBundles.flatMap((bundle) => bundle.questionManifests.flatMap((manifest) =>
    manifest.questions.map((question) => [question.id, new Set(question.allowedValues)] as const),
  )),
)

export const controlledAnswerMapSchema = z
  .record(z.string().regex(/^Q-[A-Z0-9-]+$/), z.string().min(1).max(80))
  .superRefine((answers, context) => {
    if (Object.keys(answers).length > questionAllowedValues.size) {
      context.addIssue({
        code: 'custom',
        message: 'Draft answers exceed the bounded policy question catalogue.',
      })
    }

    for (const [questionId, answer] of Object.entries(answers)) {
      const allowedValues = questionAllowedValues.get(questionId)
      if (!allowedValues) {
        context.addIssue({
          code: 'custom',
          path: [questionId],
          message: 'Draft answer key is not in the active policy manifests.',
        })
      } else if (!allowedValues.has(answer)) {
        context.addIssue({
          code: 'custom',
          path: [questionId],
          message: 'Draft answer is not an allowed controlled policy value.',
        })
      }
    }
  })

export const draftSnapshotSchema = z
  .object({
    snapshotId: syntheticIdSchema,
    caseId: syntheticIdSchema,
    sequence: z.number().int().positive(),
    currentStep: z.enum(APPLICATION_STEP_IDS),
    answers: controlledAnswerMapSchema,
    policyQualifiedVersion: policyQualifiedVersionSchema,
    savedAt: syntheticTimestampSchema,
  })
  .strict()

const persistedApplicationSchema = z
  .object({
    applicationDraftId: syntheticIdSchema,
    state: z.enum(APPLICATION_STATES),
    revision: z.number().int().nonnegative(),
    latestDraftSnapshotId: syntheticIdSchema.nullable(),
    draftSnapshots: z.array(draftSnapshotSchema).max(50),
  })
  .strict()

const persistedDocumentVersionSchema = z
  .object({
    documentVersionId: syntheticIdSchema,
    sequence: z.number().int().positive(),
    state: z.enum(DOCUMENT_VERSION_STATES),
    predecessorVersionId: syntheticIdSchema.optional(),
  })
  .strict()

const persistedDocumentAggregateSchema = z
  .object({
    documentAssetId: syntheticIdSchema,
    requirementId: documentRequirementIdSchema,
    activeVersionId: syntheticIdSchema.nullable(),
    versions: z.array(persistedDocumentVersionSchema).min(1).max(5),
  })
  .strict()

const persistedPaymentSchema = z
  .object({
    state: z.enum(PAYMENT_STATES),
    mockPaymentAttemptId: syntheticIdSchema.nullable(),
    syntheticReference: syntheticIdSchema.nullable(),
  })
  .strict()
  .superRefine((payment, context) => {
    const hasAttempt =
      payment.mockPaymentAttemptId !== null && payment.syntheticReference !== null
    if (payment.state === 'NOT_STARTED' && hasAttempt) {
      context.addIssue({
        code: 'custom',
        message: 'A payment that has not started cannot reference an attempt.',
      })
    }
    if (payment.state !== 'NOT_STARTED' && !hasAttempt) {
      context.addIssue({
        code: 'custom',
        message: 'A started payment must reference its synthetic attempt.',
      })
    }
  })

const persistedScrutinySchema = z
  .object({
    scrutinyRecordId: syntheticIdSchema,
    state: z.enum(SCRUTINY_STATES),
    submittedDocumentVersionIds: z.array(syntheticIdSchema).max(15),
  })
  .strict()

const persistedEtaSchema = z
  .object({
    syntheticEtaId: syntheticIdSchema,
    state: z.enum(ETA_STATES),
  })
  .strict()

const controlledEventCodeSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^(?:SYN|R-SYN|Q|QM|REQ|DM|RULE|PROV-SYN|[A-Z])[A-Z0-9_-]*$/)

const privacySafeEventValueSchema = z.union([
  syntheticIdSchema,
  policyQualifiedVersionSchema,
  reasonCodeSchema,
  controlledEventCodeSchema,
  z.number().int(),
  z.boolean(),
  z.null(),
  z.array(controlledEventCodeSchema).max(20),
])

const privacySafeEventPayloadSchema = z.partialRecord(
  z.enum(EVENT_PAYLOAD_KEYS),
  privacySafeEventValueSchema,
)

const eventStatesByDomain = {
  APPLICATION: new Set<string>(APPLICATION_STATES),
  DOCUMENT: new Set<string>(DOCUMENT_VERSION_STATES),
  PAYMENT: new Set<string>(PAYMENT_STATES),
  SCRUTINY: new Set<string>(SCRUTINY_STATES),
  ETA: new Set<string>(ETA_STATES),
} as const

const eventDomainByType = {
  DraftCreated: 'APPLICATION',
  DraftWorkStarted: 'APPLICATION',
  DraftSnapshotSaved: 'APPLICATION',
  DraftReadyForReview: 'APPLICATION',
  ApplicationReadyToSubmit: 'APPLICATION',
  ApplicationSubmitted: 'APPLICATION',
  ApplicationLocked: 'APPLICATION',
  DocumentVersionCreated: 'DOCUMENT',
  DocumentPreflightPassed: 'DOCUMENT',
  DocumentPreflightFailed: 'DOCUMENT',
  DocumentVersionSubmitted: 'DOCUMENT',
  DocumentReviewStarted: 'DOCUMENT',
  DocumentReuploadRequested: 'DOCUMENT',
  DocumentVersionSuperseded: 'DOCUMENT',
  DocumentAccepted: 'DOCUMENT',
  MockPaymentInitiated: 'PAYMENT',
  MockPaymentPending: 'PAYMENT',
  PaymentReconciliationRequired: 'PAYMENT',
  PaymentReconciledConfirmed: 'PAYMENT',
  ScrutinyQueued: 'SCRUTINY',
  ScrutinyStarted: 'SCRUTINY',
  ScrutinyActionRequired: 'SCRUTINY',
  ScrutinyResubmitted: 'SCRUTINY',
  ScrutinyResumed: 'SCRUTINY',
  SyntheticScrutinyApproved: 'SCRUTINY',
  SyntheticETAReadyToIssue: 'ETA',
  SyntheticETAIssued: 'ETA',
} as const satisfies Readonly<Record<(typeof DOMAIN_EVENT_TYPES)[number], keyof typeof eventStatesByDomain>>

export const persistedDomainEventSchema = z
  .object({
    eventId: syntheticIdSchema,
    caseId: syntheticIdSchema,
    eventType: z.enum(DOMAIN_EVENT_TYPES),
    domain: z.enum(['APPLICATION', 'DOCUMENT', 'PAYMENT', 'SCRUTINY', 'ETA']),
    aggregateId: syntheticIdSchema,
    previousState: z.string().min(1).optional(),
    newState: z.string().min(1).optional(),
    actor: z.enum(['APPLICANT', 'SYSTEM', 'REVIEWER', 'PAYMENT_MOCK']),
    syntheticTimestamp: syntheticTimestampSchema,
    policyQualifiedVersion: policyQualifiedVersionSchema.optional(),
    reasonCode: reasonCodeSchema.optional(),
    idempotencyKey: syntheticIdSchema.optional(),
    payload: privacySafeEventPayloadSchema,
  })
  .strict()
  .superRefine((event, context) => {
    if (eventDomainByType[event.eventType] !== event.domain) {
      context.addIssue({
        code: 'custom',
        path: ['domain'],
        message: 'Event type does not belong to the declared lifecycle domain.',
      })
    }

    const domainStates = eventStatesByDomain[event.domain]
    for (const stateField of ['previousState', 'newState'] as const) {
      const state = event[stateField]
      if (state !== undefined && !domainStates.has(state)) {
        context.addIssue({
          code: 'custom',
          path: [stateField],
          message: 'Event state is not valid for its lifecycle domain.',
        })
      }
    }
  })

const policyPinSchema = z
  .object({
    qualifiedVersion: policyQualifiedVersionSchema,
    digest: syntheticIdSchema,
  })
  .strict()
  .refine((pin) => isSupportedPolicyPin(pin.qualifiedVersion, pin.digest), {
    message: 'Policy pin must identify an exact registered policy bundle.',
  })

export const persistedCaseSchema = z
  .object({
    caseId: syntheticIdSchema,
    scenarioId: z.enum(PERSISTED_SCENARIO_IDS),
    revision: z.number().int().nonnegative(),
    createdAt: syntheticTimestampSchema,
    updatedAt: syntheticTimestampSchema,
    policyPin: policyPinSchema,
    application: persistedApplicationSchema,
    documents: z.array(persistedDocumentAggregateSchema).max(4),
    payment: persistedPaymentSchema,
    scrutiny: persistedScrutinySchema,
    eta: persistedEtaSchema,
    auditEvents: z.array(persistedDomainEventSchema).max(250),
  })
  .strict()
  .superRefine((persistedCase, context) => {
    if (persistedCase.updatedAt < persistedCase.createdAt) {
      context.addIssue({
        code: 'custom',
        path: ['updatedAt'],
        message: 'Case update time cannot precede case creation time.',
      })
    }

    const snapshots = persistedCase.application.draftSnapshots
    const snapshotIds = new Set<string>()
    for (const [index, snapshot] of snapshots.entries()) {
      if (snapshot.caseId !== persistedCase.caseId) {
        context.addIssue({
          code: 'custom',
          path: ['application', 'draftSnapshots', index, 'caseId'],
          message: 'Draft snapshot must belong to its containing case.',
        })
      }
      if (snapshot.policyQualifiedVersion !== persistedCase.policyPin.qualifiedVersion) {
        context.addIssue({
          code: 'custom',
          path: ['application', 'draftSnapshots', index, 'policyQualifiedVersion'],
          message: 'Draft snapshot must retain the case policy pin.',
        })
      }
      if (snapshot.sequence !== index + 1) {
        context.addIssue({
          code: 'custom',
          path: ['application', 'draftSnapshots', index, 'sequence'],
          message: 'Draft snapshots must use deterministic contiguous sequence numbers.',
        })
      }
      if (snapshotIds.has(snapshot.snapshotId)) {
        context.addIssue({
          code: 'custom',
          path: ['application', 'draftSnapshots', index, 'snapshotId'],
          message: 'Draft snapshot identifiers must be unique within a case.',
        })
      }
      snapshotIds.add(snapshot.snapshotId)
    }

    const expectedLatestSnapshotId = snapshots.at(-1)?.snapshotId ?? null
    if (persistedCase.application.latestDraftSnapshotId !== expectedLatestSnapshotId) {
      context.addIssue({
        code: 'custom',
        path: ['application', 'latestDraftSnapshotId'],
        message: 'Latest snapshot reference must identify the final stored draft snapshot.',
      })
    }

    const documentAssetIds = new Set<string>()
    const documentVersionIds = new Set<string>()
    for (const [assetIndex, document] of persistedCase.documents.entries()) {
      if (documentAssetIds.has(document.documentAssetId)) {
        context.addIssue({
          code: 'custom',
          path: ['documents', assetIndex, 'documentAssetId'],
          message: 'Document asset identifiers must be unique within a case.',
        })
      }
      documentAssetIds.add(document.documentAssetId)

      for (const [versionIndex, version] of document.versions.entries()) {
        if (version.sequence !== versionIndex + 1) {
          context.addIssue({
            code: 'custom',
            path: ['documents', assetIndex, 'versions', versionIndex, 'sequence'],
            message: 'Document versions must use deterministic contiguous sequence numbers.',
          })
        }
        const expectedPredecessor = document.versions[versionIndex - 1]?.documentVersionId
        if (version.predecessorVersionId !== expectedPredecessor) {
          context.addIssue({
            code: 'custom',
            path: ['documents', assetIndex, 'versions', versionIndex, 'predecessorVersionId'],
            message: 'Document predecessor references must preserve version history.',
          })
        }
        if (documentVersionIds.has(version.documentVersionId)) {
          context.addIssue({
            code: 'custom',
            path: ['documents', assetIndex, 'versions', versionIndex, 'documentVersionId'],
            message: 'Document version identifiers must be unique within a case.',
          })
        }
        documentVersionIds.add(version.documentVersionId)
      }

      if (
        document.activeVersionId !== null &&
        !document.versions.some(
          (version) => version.documentVersionId === document.activeVersionId,
        )
      ) {
        context.addIssue({
          code: 'custom',
          path: ['documents', assetIndex, 'activeVersionId'],
          message: 'Active document version must exist in its version history.',
        })
      }
    }

    for (const [index, versionId] of persistedCase.scrutiny.submittedDocumentVersionIds.entries()) {
      if (!documentVersionIds.has(versionId)) {
        context.addIssue({
          code: 'custom',
          path: ['scrutiny', 'submittedDocumentVersionIds', index],
          message: 'Scrutiny may reference only document versions stored on the case.',
        })
      }
    }

    const eventIds = new Set<string>()
    let previousEventTimestamp: string | undefined
    for (const [index, event] of persistedCase.auditEvents.entries()) {
      if (event.caseId !== persistedCase.caseId) {
        context.addIssue({
          code: 'custom',
          path: ['auditEvents', index, 'caseId'],
          message: 'Audit event must belong to its containing case.',
        })
      }
      if (eventIds.has(event.eventId)) {
        context.addIssue({
          code: 'custom',
          path: ['auditEvents', index, 'eventId'],
          message: 'Audit event identifiers must be unique within a case.',
        })
      }
      if (previousEventTimestamp && event.syntheticTimestamp < previousEventTimestamp) {
        context.addIssue({
          code: 'custom',
          path: ['auditEvents', index, 'syntheticTimestamp'],
          message: 'Audit events must remain in deterministic timestamp order.',
        })
      }
      eventIds.add(event.eventId)
      previousEventTimestamp = event.syntheticTimestamp
    }
  })

export const persistenceEnvelopeSchema = z
  .object({
    storageSchemaVersion: z.literal(P0_STORAGE_SCHEMA_VERSION),
    fixtureVersion: z.literal(P0_FIXTURE_VERSION),
    activeCaseId: syntheticIdSchema.nullable(),
    lastUpdatedAt: syntheticTimestampSchema,
    cases: z.array(persistedCaseSchema).max(8),
  })
  .strict()
  .superRefine((envelope, context) => {
    const caseIds = new Set<string>()
    for (const [index, persistedCase] of envelope.cases.entries()) {
      if (caseIds.has(persistedCase.caseId)) {
        context.addIssue({
          code: 'custom',
          path: ['cases', index, 'caseId'],
          message: 'Case identifiers must be unique in the persistence envelope.',
        })
      }
      caseIds.add(persistedCase.caseId)

      if (persistedCase.updatedAt > envelope.lastUpdatedAt) {
        context.addIssue({
          code: 'custom',
          path: ['cases', index, 'updatedAt'],
          message: 'Envelope update evidence cannot precede a contained case update.',
        })
      }
    }

    if (envelope.activeCaseId !== null && !caseIds.has(envelope.activeCaseId)) {
      context.addIssue({
        code: 'custom',
        path: ['activeCaseId'],
        message: 'Active case identifier must reference a stored case.',
      })
    }
  })

export type DraftSnapshot = DeepReadonly<z.infer<typeof draftSnapshotSchema>>
export type PersistedDomainEvent = DeepReadonly<z.infer<typeof persistedDomainEventSchema>>
export type PersistedCase = DeepReadonly<z.infer<typeof persistedCaseSchema>>
export type PersistenceEnvelope = DeepReadonly<z.infer<typeof persistenceEnvelopeSchema>>

export function parsePersistenceEnvelope(input: unknown): PersistenceEnvelope {
  return deepFreeze(persistenceEnvelopeSchema.parse(input))
}
