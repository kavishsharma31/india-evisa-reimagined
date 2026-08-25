import { z } from 'zod'

import type { DomainCommand, ReasonCode, SyntheticId } from '../domain'
import { policyQualifiedVersionSchema, syntheticIdSchema } from '../domain/ids'
import {
  canonicalScenarios,
  createPolicyEvaluationRequest,
  getSeed,
} from '../fixtures'
import {
  ACTIVE_POLICY_QUALIFIED_VERSION,
  activePolicyBundle,
  evaluatePolicy,
  type PolicyEvaluationResult,
} from '../policy'
import { deepFreeze } from '../policy/schema'
import {
  APPLICATION_STEP_IDS,
  controlledAnswerMapSchema,
  createCanonicalPersistenceEnvelope,
  persistenceEnvelopeSchema,
  type PersistedCase,
  type PersistenceEnvelope,
} from '../persistence'
import {
  applyBeginDraft,
  applySaveSnapshot,
  createRuntimeCase,
  type BeginDraftCommand,
  type CreateDraftCommand,
  type SaveSnapshotCommand,
} from './case-runtime'
import {
  a04DocumentFixtures,
  applyDocumentPreparation,
  buildDocumentPreparationView,
} from './document-runtime'
import {
  applyReviewSubmission,
  buildReviewSummary,
} from './review-runtime'
import {
  applyAmbiguousPaymentStart,
  applyPaymentReconciliation,
  buildPaymentSummary,
  paymentCorrelationId,
  paymentIdempotencyKey,
} from './payment-runtime'
import type {
  DemoRuntime,
  DemoRuntimeDependencies,
  RuntimeCommandAccepted,
  RuntimeCommandRejected,
  RuntimeEvaluationResult,
  RuntimeDocumentInspectResult,
  RuntimeDocumentMutationResult,
  RuntimeInspectResult,
  RuntimeMutationResult,
  RuntimePolicyRejected,
  RuntimeResumeResult,
  RuntimeReviewInspectResult,
  RuntimeReviewMutationResult,
  RuntimePaymentInspectResult,
  RuntimePaymentMutationResult,
  RuntimeStorageFailure,
} from './contracts'

const scenarioInputSchema = z.object({ scenarioId: syntheticIdSchema }).strict()
const createCaseInputSchema = z
  .object({
    scenarioId: syntheticIdSchema,
    idempotencyKey: syntheticIdSchema,
    policyQualifiedVersion: policyQualifiedVersionSchema.optional(),
  })
  .strict()
const beginDraftInputSchema = z
  .object({ caseId: syntheticIdSchema, idempotencyKey: syntheticIdSchema })
  .strict()
const saveSnapshotInputSchema = z
  .object({
    caseId: syntheticIdSchema,
    idempotencyKey: syntheticIdSchema,
    currentStep: z.enum(APPLICATION_STEP_IDS),
    answers: z.record(z.string(), z.string()),
  })
  .strict()
const resumeCaseInputSchema = z.object({ caseId: syntheticIdSchema.optional() }).strict()
const inspectDocumentsInputSchema = z.object({ caseId: syntheticIdSchema }).strict()
const prepareDocumentInputSchema = z
  .object({
    caseId: syntheticIdSchema,
    requirementId: z.enum([
      'REQ-PORTRAIT-1',
      'REQ-PASSPORT-PAGE-1',
      'REQ-HOSPITAL-LETTER-1',
    ]),
    fixtureId: syntheticIdSchema,
    idempotencyKey: syntheticIdSchema,
  })
  .strict()
const reviewInputSchema = z.object({ caseId: syntheticIdSchema }).strict()
const reviewMutationInputSchema = z
  .object({ caseId: syntheticIdSchema, idempotencyKey: syntheticIdSchema })
  .strict()
const paymentInputSchema = z.object({ caseId: syntheticIdSchema }).strict()

type CanonicalScenarioId = PersistedCase['scenarioId']

const START_SEED_BY_SCENARIO = Object.freeze({
  'SYN-MEDICAL-001': 'SEED-MEDICAL-START',
  'SYN-TOURIST-001': 'SEED-TOURIST-START',
} as const)

function invalidCommand(
  operation: RuntimeCommandRejected['operation'],
  issueCount: number,
  reasonCode: RuntimeCommandRejected['reasonCode'] = 'INVALID_COMMAND',
  caseId?: SyntheticId,
): RuntimeCommandRejected {
  return deepFreeze({
    status: 'COMMAND_REJECTED',
    operation,
    reasonCode,
    ...(caseId === undefined ? {} : { caseId }),
    diagnostic: { issueCount },
  })
}

function isCanonicalScenarioId(scenarioId: SyntheticId): scenarioId is CanonicalScenarioId {
  return scenarioId === 'SYN-MEDICAL-001' || scenarioId === 'SYN-TOURIST-001'
}

function scenarioFacts(scenarioId: CanonicalScenarioId) {
  const facts = canonicalScenarios.find((scenario) => scenario.scenarioId === scenarioId)
  if (facts === undefined) {
    throw new Error(`Canonical scenario facts are missing for ${scenarioId}.`)
  }
  return facts
}

function evaluateCanonicalScenario(
  scenarioId: CanonicalScenarioId,
  mode: 'NEW_CASE' | 'RESUME' = 'NEW_CASE',
): PolicyEvaluationResult {
  return evaluatePolicy(
    createPolicyEvaluationRequest(scenarioFacts(scenarioId), mode),
    activePolicyBundle,
  )
}

function unknownScenarioPolicyRejection(scenarioId: SyntheticId): RuntimePolicyRejected {
  return deepFreeze({
    status: 'POLICY_REJECTED',
    scenarioId,
    scenarioSupport: 'NOT_SUPPORTED_IN_DEMO',
    reasonCodes: ['R-SYN-NOT-SUPPORTED'],
  })
}

function evaluationPolicyRejection(
  evaluation: PolicyEvaluationResult,
): RuntimePolicyRejected {
  return deepFreeze({
    status: 'POLICY_REJECTED',
    scenarioId: evaluation.scenarioId,
    scenarioSupport:
      evaluation.scenarioSupport === 'SUPPORTED_BY_DEMO'
        ? 'POLICY_CONFLICT'
        : evaluation.scenarioSupport,
    reasonCodes:
      evaluation.reasonCodes.length > 0
        ? evaluation.reasonCodes
        : (['R-SYN-POLICY-CONFLICT'] satisfies readonly ReasonCode[]),
    evaluation,
  })
}

function previewPolicyRejection(
  scenarioId: SyntheticId,
  policyQualifiedVersion: string,
): RuntimePolicyRejected {
  const previewRequested = policyQualifiedVersion.endsWith('-preview')
  return deepFreeze({
    status: 'POLICY_REJECTED',
    scenarioId,
    scenarioSupport: 'POLICY_CONFLICT',
    reasonCodes: [
      previewRequested ? 'R-SYN-DRAFT-PREVIEW-ONLY' : 'R-SYN-POLICY-CONFLICT',
    ],
  })
}

function mapStorageLoadFailure(
  result: Exclude<ReturnType<DemoRuntimeDependencies['store']['load']>, { status: 'VALID_STATE' | 'NO_STATE' }>,
): RuntimeStorageFailure {
  if (result.status === 'STORAGE_UNAVAILABLE') {
    return deepFreeze({
      status: 'STORAGE_UNAVAILABLE',
      diagnostic: result.diagnostic,
    })
  }

  return deepFreeze({
    status: 'STORAGE_REQUIRES_RESET',
    storageStatus: result.status,
    diagnostic: result.diagnostic,
  })
}

function loadForMutation(dependencies: DemoRuntimeDependencies):
  | Readonly<{ status: 'READY'; state: PersistenceEnvelope | null }>
  | RuntimeStorageFailure {
  const loaded = dependencies.store.load()
  if (loaded.status === 'NO_STATE') {
    return Object.freeze({ status: 'READY', state: null })
  }
  if (loaded.status === 'VALID_STATE') {
    return Object.freeze({ status: 'READY', state: loaded.state })
  }
  return mapStorageLoadFailure(loaded)
}

function caseConflict(
  operation: 'CreateDraft',
  caseId: SyntheticId,
): RuntimeCommandRejected {
  return deepFreeze({
    status: 'COMMAND_REJECTED',
    operation,
    reasonCode: 'CASE_CONFLICT',
    caseId,
    diagnostic: {},
  })
}

function replaceCase(
  envelope: PersistenceEnvelope,
  nextCase: PersistedCase,
): PersistenceEnvelope {
  const validation = persistenceEnvelopeSchema.safeParse({
    ...envelope,
    activeCaseId: nextCase.caseId,
    lastUpdatedAt:
      nextCase.updatedAt > envelope.lastUpdatedAt
        ? nextCase.updatedAt
        : envelope.lastUpdatedAt,
    cases: envelope.cases.map((candidate) =>
      candidate.caseId === nextCase.caseId ? nextCase : candidate,
    ),
  })
  if (!validation.success) {
    throw new Error('A guarded runtime mutation produced an invalid persistence envelope.')
  }
  return deepFreeze(validation.data)
}

function appendCase(
  envelope: PersistenceEnvelope,
  persistedCase: PersistedCase,
): PersistenceEnvelope | RuntimeCommandRejected {
  const validation = persistenceEnvelopeSchema.safeParse({
    ...envelope,
    activeCaseId: persistedCase.caseId,
    lastUpdatedAt:
      persistedCase.updatedAt > envelope.lastUpdatedAt
        ? persistedCase.updatedAt
        : envelope.lastUpdatedAt,
    cases: [...envelope.cases, persistedCase],
  })
  if (!validation.success) {
    return invalidCommand(
      'CreateDraft',
      validation.error.issues.length,
      'PERSISTENCE_VALIDATION_FAILED',
      persistedCase.caseId,
    )
  }
  return deepFreeze(validation.data)
}

function saveEnvelope(
  dependencies: DemoRuntimeDependencies,
  envelope: PersistenceEnvelope,
  operation:
    | 'CreateDraft'
    | 'BeginDraft'
    | 'SaveSnapshot'
    | 'PrepareDocument'
    | 'PrepareReview'
    | 'SubmitApplication'
    | 'StartMockPayment'
    | 'CheckMockPaymentStatus',
  caseId: SyntheticId,
): PersistenceEnvelope | RuntimeCommandRejected | RuntimeStorageFailure {
  const validation = persistenceEnvelopeSchema.safeParse(envelope)
  if (!validation.success) {
    return invalidCommand(
      operation,
      validation.error.issues.length,
      'PERSISTENCE_VALIDATION_FAILED',
      caseId,
    )
  }

  const saved = dependencies.store.save(validation.data)
  if (saved.status === 'SAVED') {
    return saved.state
  }
  if (saved.status === 'STORAGE_UNAVAILABLE') {
    return deepFreeze({ status: 'STORAGE_UNAVAILABLE', diagnostic: saved.diagnostic })
  }
  return invalidCommand(
    operation,
    saved.diagnostic.issueCount,
    'PERSISTENCE_VALIDATION_FAILED',
    caseId,
  )
}

function acceptedResult(input: {
  operation: RuntimeCommandAccepted['operation']
  command: DomainCommand
  persistedCase: PersistedCase
  eventType: RuntimeCommandAccepted['emittedEventType']
  eventId: SyntheticId
  idempotentReplay: boolean
  snapshotId?: SyntheticId
}): RuntimeCommandAccepted {
  return deepFreeze({
    status: 'COMMAND_ACCEPTED',
    operation: input.operation,
    commandId: input.command.commandId,
    caseId: input.persistedCase.caseId,
    revision: input.persistedCase.revision,
    applicationState: input.persistedCase.application.state,
    emittedEventType: input.eventType,
    emittedEventId: input.eventId,
    idempotentReplay: input.idempotentReplay,
    ...(input.snapshotId === undefined ? {} : { snapshotId: input.snapshotId }),
  })
}

function sameAnswers(
  left: Readonly<Record<string, string>>,
  right: Readonly<Record<string, string>>,
): boolean {
  const leftEntries = Object.entries(left)
  return (
    leftEntries.length === Object.keys(right).length &&
    leftEntries.every(([key, value]) => right[key] === value)
  )
}

function existingIdempotentEvent(
  persistedCase: PersistedCase,
  idempotencyKey: SyntheticId,
) {
  return persistedCase.auditEvents.find((event) => event.idempotencyKey === idempotencyKey)
}

function eventRevision(persistedCase: PersistedCase, eventId: SyntheticId): number {
  const eventIndex = persistedCase.auditEvents.findIndex((event) => event.eventId === eventId)
  if (eventIndex < 0) {
    throw new Error('Idempotent runtime evidence must belong to its containing Case.')
  }
  return eventIndex + 1
}

function evaluatePinnedDocumentPolicy(
  persistedCase: PersistedCase,
): PolicyEvaluationResult | RuntimePolicyRejected {
  const evaluation = evaluateCanonicalScenario(persistedCase.scenarioId, 'RESUME')
  if (
    evaluation.scenarioSupport !== 'SUPPORTED_BY_DEMO' ||
    evaluation.policy.qualifiedVersion !== persistedCase.policyPin.qualifiedVersion ||
    evaluation.documentManifest === undefined
  ) {
    return evaluationPolicyRejection(evaluation)
  }
  return evaluation
}

function evaluatePinnedPaymentPolicy(
  persistedCase: PersistedCase,
): PolicyEvaluationResult | RuntimePolicyRejected {
  const evaluation = evaluateCanonicalScenario(persistedCase.scenarioId, 'RESUME')
  if (
    evaluation.scenarioSupport !== 'SUPPORTED_BY_DEMO' ||
    evaluation.policy.qualifiedVersion !== persistedCase.policyPin.qualifiedVersion ||
    evaluation.syntheticFee === undefined
  ) {
    return evaluationPolicyRejection(evaluation)
  }
  return evaluation
}

function paymentExisting(
  operation: 'StartMockPayment' | 'CheckMockPaymentStatus',
  persistedCase: PersistedCase,
): RuntimePaymentMutationResult {
  const attemptId = persistedCase.payment.mockPaymentAttemptId
  const syntheticReference = persistedCase.payment.syntheticReference
  if (attemptId === null || syntheticReference === null) {
    return invalidCommand(
      operation,
      1,
      'PERSISTENCE_VALIDATION_FAILED',
      persistedCase.caseId,
    )
  }
  return deepFreeze({
    status: 'PAYMENT_EXISTING',
    operation,
    caseId: persistedCase.caseId,
    revision: persistedCase.revision,
    paymentState: persistedCase.payment.state,
    mockPaymentAttemptId: attemptId,
    syntheticReference,
    idempotentReplay: true,
  })
}

function paymentEvidenceMatches(input: {
  metadata: Readonly<{
    caseId: SyntheticId
    applicationId: SyntheticId
    amount: 41 | 73
    unit: 'SYNTHETIC_DEMO_CREDITS'
    idempotencyKey: SyntheticId
    syntheticPaymentReference: SyntheticId
  }>
  persistedCase: PersistedCase
  amount: 41 | 73
  idempotencyKey: SyntheticId
  syntheticReference: SyntheticId
}): boolean {
  return (
    input.metadata.caseId === input.persistedCase.caseId &&
    input.metadata.applicationId === input.persistedCase.application.applicationDraftId &&
    input.metadata.amount === input.amount &&
    input.metadata.unit === 'SYNTHETIC_DEMO_CREDITS' &&
    input.metadata.idempotencyKey === input.idempotencyKey &&
    input.metadata.syntheticPaymentReference === input.syntheticReference
  )
}

function reviewPrerequisiteRejection(
  operation: 'InspectReview' | 'PrepareReview' | 'SubmitApplication',
  persistedCase: PersistedCase,
  missingQuestionIds: readonly string[],
  missingRequirementIds: readonly string[],
): RuntimeCommandRejected {
  return deepFreeze({
    status: 'COMMAND_REJECTED',
    operation,
    reasonCode: 'REVIEW_PREREQUISITES_NOT_MET',
    caseId: persistedCase.caseId,
    diagnostic: {
      currentState: persistedCase.application.state,
      missingQuestionIds,
      missingRequirementIds,
    },
  })
}

function documentRequestReference(
  caseId: SyntheticId,
  requirementId: string,
  fixtureId: SyntheticId,
): SyntheticId {
  return syntheticIdSchema.parse(
    `SYN-DOCUMENT-REQUEST-${caseId.slice('SYN-'.length)}-${requirementId.replace(/^REQ-/, '')}-${fixtureId.slice('SYN-FIXTURE-'.length)}`,
  )
}

function documentCorrelationId(caseId: SyntheticId, requirementId: string): SyntheticId {
  return syntheticIdSchema.parse(
    `SYN-CORRELATION-DOCUMENT-${caseId.slice('SYN-'.length)}-${requirementId.replace(/^REQ-/, '')}`,
  )
}

export function createDemoRuntime(dependencies: DemoRuntimeDependencies): DemoRuntime {
  function inspectState(): RuntimeInspectResult {
    const loaded = dependencies.store.load()
    if (loaded.status === 'NO_STATE') {
      return Object.freeze({ status: 'NO_STATE' })
    }
    if (loaded.status === 'VALID_STATE') {
      return Object.freeze({ status: 'VALID_STATE', state: loaded.state })
    }
    return mapStorageLoadFailure(loaded)
  }

  function evaluateScenario(candidate: unknown): RuntimeEvaluationResult {
    const parsed = scenarioInputSchema.safeParse(candidate)
    if (!parsed.success) {
      return invalidCommand('EvaluateScenario', parsed.error.issues.length)
    }
    if (!isCanonicalScenarioId(parsed.data.scenarioId)) {
      return unknownScenarioPolicyRejection(parsed.data.scenarioId)
    }

    const evaluation = evaluateCanonicalScenario(parsed.data.scenarioId)
    if (evaluation.scenarioSupport !== 'SUPPORTED_BY_DEMO') {
      return evaluationPolicyRejection(evaluation)
    }
    return deepFreeze({ status: 'POLICY_EVALUATED', evaluation })
  }

  function createCase(candidate: unknown): RuntimeMutationResult {
    const parsed = createCaseInputSchema.safeParse(candidate)
    if (!parsed.success) {
      return invalidCommand('CreateDraft', parsed.error.issues.length)
    }

    const loaded = loadForMutation(dependencies)
    if (loaded.status !== 'READY') {
      return loaded
    }

    const input = parsed.data
    if (!isCanonicalScenarioId(input.scenarioId)) {
      return unknownScenarioPolicyRejection(input.scenarioId)
    }
    const requestedPolicy =
      input.policyQualifiedVersion ?? ACTIVE_POLICY_QUALIFIED_VERSION
    if (requestedPolicy !== ACTIVE_POLICY_QUALIFIED_VERSION) {
      return previewPolicyRejection(input.scenarioId, requestedPolicy)
    }

    const evaluation = evaluateCanonicalScenario(input.scenarioId)
    if (
      evaluation.scenarioSupport !== 'SUPPORTED_BY_DEMO' ||
      evaluation.policy.qualifiedVersion !== ACTIVE_POLICY_QUALIFIED_VERSION
    ) {
      return evaluationPolicyRejection(evaluation)
    }

    const envelope = loaded.state ?? createCanonicalPersistenceEnvelope()
    const canonicalSeed = getSeed(START_SEED_BY_SCENARIO[input.scenarioId])
    const canonicalCase = canonicalSeed.envelope.cases[0]
    if (canonicalCase === undefined) {
      throw new Error('Canonical start seed did not contain its case.')
    }
    const expectedCaseId = canonicalCase.caseId
    const scenarioCase = envelope.cases.find(
      (persistedCase) => persistedCase.scenarioId === input.scenarioId,
    )
    const occupiedCanonicalId = envelope.cases.find(
      (persistedCase) => persistedCase.caseId === expectedCaseId,
    )
    if (scenarioCase !== undefined) {
      const compatible =
        scenarioCase.caseId === canonicalCase.caseId &&
        scenarioCase.application.applicationDraftId ===
          canonicalCase.application.applicationDraftId &&
        scenarioCase.policyPin.qualifiedVersion === evaluation.policy.qualifiedVersion &&
        scenarioCase.policyPin.digest === evaluation.policy.digest
      if (!compatible) {
        return caseConflict('CreateDraft', expectedCaseId)
      }
      return deepFreeze({
        status: 'EXISTING_CASE',
        caseId: scenarioCase.caseId,
        scenarioId: scenarioCase.scenarioId,
        revision: scenarioCase.revision,
        applicationState: scenarioCase.application.state,
        activeCaseId: envelope.activeCaseId,
        resumeRecommended: true,
      })
    }
    if (occupiedCanonicalId !== undefined) {
      return caseConflict('CreateDraft', expectedCaseId)
    }

    const command: CreateDraftCommand = deepFreeze({
      commandId: dependencies.metadata.commandId(expectedCaseId, 'CreateDraft', 1),
      type: 'CreateDraft',
      caseId: expectedCaseId,
      actor: 'APPLICANT',
      syntheticTimestamp: canonicalCase.updatedAt,
      idempotencyKey: input.idempotencyKey,
      payload: { policyEvaluationId: evaluation.evaluationId },
    })
    const runtimeCase = createRuntimeCase(canonicalCase, command, evaluation)
    const nextEnvelope = appendCase(envelope, runtimeCase)
    if ('status' in nextEnvelope) {
      return nextEnvelope
    }
    const saved = saveEnvelope(
      dependencies,
      nextEnvelope,
      'CreateDraft',
      runtimeCase.caseId,
    )
    if ('status' in saved) {
      return saved
    }
    const event = runtimeCase.auditEvents[0]
    if (event === undefined) {
      throw new Error('Accepted case creation must contain DraftCreated evidence.')
    }
    return acceptedResult({
      operation: 'CreateDraft',
      command,
      persistedCase: runtimeCase,
      eventType: event.eventType,
      eventId: event.eventId,
      idempotentReplay: false,
    })
  }

  function beginDraft(candidate: unknown): RuntimeMutationResult {
    const parsed = beginDraftInputSchema.safeParse(candidate)
    if (!parsed.success) {
      return invalidCommand('BeginDraft', parsed.error.issues.length)
    }
    const loaded = loadForMutation(dependencies)
    if (loaded.status !== 'READY') {
      return loaded
    }
    const input = parsed.data
    const persistedCase = loaded.state?.cases.find(({ caseId }) => caseId === input.caseId)
    if (persistedCase === undefined) {
      return Object.freeze({ status: 'CASE_NOT_FOUND', caseId: input.caseId })
    }

    const existingEvent = existingIdempotentEvent(persistedCase, input.idempotencyKey)
    if (existingEvent !== undefined) {
      if (existingEvent.eventType !== 'DraftWorkStarted') {
        return invalidCommand(
          'BeginDraft',
          1,
          'IDEMPOTENCY_CONFLICT',
          persistedCase.caseId,
        )
      }
      const replayCommand: BeginDraftCommand = deepFreeze({
        commandId: dependencies.metadata.commandId(
          persistedCase.caseId,
          'BeginDraft',
          eventRevision(persistedCase, existingEvent.eventId),
        ),
        type: 'BeginDraft',
        caseId: persistedCase.caseId,
        actor: 'APPLICANT',
        syntheticTimestamp: existingEvent.syntheticTimestamp,
        idempotencyKey: input.idempotencyKey,
        payload: { applicationDraftId: persistedCase.application.applicationDraftId },
      })
      return acceptedResult({
        operation: 'BeginDraft',
        command: replayCommand,
        persistedCase,
        eventType: existingEvent.eventType,
        eventId: existingEvent.eventId,
        idempotentReplay: true,
      })
    }

    const nextRevision = persistedCase.revision + 1
    const command: BeginDraftCommand = deepFreeze({
      commandId: dependencies.metadata.commandId(
        persistedCase.caseId,
        'BeginDraft',
        nextRevision,
      ),
      type: 'BeginDraft',
      caseId: persistedCase.caseId,
      actor: 'APPLICANT',
      syntheticTimestamp: dependencies.metadata.nextTimestamp(persistedCase.updatedAt),
      idempotencyKey: input.idempotencyKey,
      payload: { applicationDraftId: persistedCase.application.applicationDraftId },
    })
    const result = applyBeginDraft(persistedCase, command, dependencies.metadata)
    if (!result.accepted) {
      return deepFreeze({
        status: 'COMMAND_REJECTED',
        operation: 'BeginDraft',
        reasonCode: result.rejection.reasonCode,
        caseId: persistedCase.caseId,
        diagnostic: {
          currentState: result.rejection.currentState,
          requestedState: result.rejection.requestedState,
          allowedNextStates: result.rejection.allowedNextStates,
        },
      })
    }

    const envelope = loaded.state
    if (envelope === null) {
      throw new Error('A located Case must belong to a loaded persistence envelope.')
    }
    const nextEnvelope = replaceCase(envelope, result.mutation.persistedCase)
    const saved = saveEnvelope(
      dependencies,
      nextEnvelope,
      'BeginDraft',
      persistedCase.caseId,
    )
    if ('status' in saved) {
      return saved
    }
    return acceptedResult({
      operation: 'BeginDraft',
      command,
      persistedCase: result.mutation.persistedCase,
      eventType: result.mutation.event.eventType,
      eventId: result.mutation.event.eventId,
      idempotentReplay: false,
    })
  }

  function saveDraftSnapshot(candidate: unknown): RuntimeMutationResult {
    const parsed = saveSnapshotInputSchema.safeParse(candidate)
    if (!parsed.success) {
      return invalidCommand('SaveSnapshot', parsed.error.issues.length)
    }
    const answersValidation = controlledAnswerMapSchema.safeParse(parsed.data.answers)
    if (!answersValidation.success || Object.keys(parsed.data.answers).length === 0) {
      return invalidCommand(
        'SaveSnapshot',
        answersValidation.success ? 1 : answersValidation.error.issues.length,
        'INVALID_DRAFT_ANSWER',
        parsed.data.caseId,
      )
    }

    const loaded = loadForMutation(dependencies)
    if (loaded.status !== 'READY') {
      return loaded
    }
    const input = parsed.data
    const persistedCase = loaded.state?.cases.find(({ caseId }) => caseId === input.caseId)
    if (persistedCase === undefined) {
      return Object.freeze({ status: 'CASE_NOT_FOUND', caseId: input.caseId })
    }

    const evaluation = evaluateCanonicalScenario(persistedCase.scenarioId, 'RESUME')
    if (
      evaluation.scenarioSupport !== 'SUPPORTED_BY_DEMO' ||
      evaluation.policy.qualifiedVersion !== persistedCase.policyPin.qualifiedVersion ||
      evaluation.questionManifest === undefined
    ) {
      return evaluationPolicyRejection(evaluation)
    }
    const allowedQuestionIds = new Set(
      evaluation.questionManifest.questions.map(({ id }) => id),
    )
    if (Object.keys(answersValidation.data).some((questionId) => !allowedQuestionIds.has(questionId))) {
      return invalidCommand(
        'SaveSnapshot',
        1,
        'INVALID_DRAFT_ANSWER',
        persistedCase.caseId,
      )
    }

    const existingEvent = existingIdempotentEvent(persistedCase, input.idempotencyKey)
    if (existingEvent !== undefined) {
      const snapshotId = existingEvent.payload.snapshotId
      const snapshot =
        typeof snapshotId === 'string'
          ? persistedCase.application.draftSnapshots.find(
              (candidateSnapshot) => candidateSnapshot.snapshotId === snapshotId,
            )
          : undefined
      if (
        existingEvent.eventType !== 'DraftSnapshotSaved' ||
        snapshot === undefined ||
        snapshot.currentStep !== input.currentStep ||
        !sameAnswers(snapshot.answers, answersValidation.data)
      ) {
        return invalidCommand(
          'SaveSnapshot',
          1,
          'IDEMPOTENCY_CONFLICT',
          persistedCase.caseId,
        )
      }
      const replayCommand: SaveSnapshotCommand = deepFreeze({
        commandId: dependencies.metadata.commandId(
          persistedCase.caseId,
          'SaveSnapshot',
          eventRevision(persistedCase, existingEvent.eventId),
        ),
        type: 'SaveSnapshot',
        caseId: persistedCase.caseId,
        actor: 'APPLICANT',
        syntheticTimestamp: existingEvent.syntheticTimestamp,
        idempotencyKey: input.idempotencyKey,
        payload: { draftSnapshotId: snapshot.snapshotId, stepId: snapshot.currentStep },
      })
      return acceptedResult({
        operation: 'SaveSnapshot',
        command: replayCommand,
        persistedCase,
        eventType: existingEvent.eventType,
        eventId: existingEvent.eventId,
        idempotentReplay: true,
        snapshotId: snapshot.snapshotId,
      })
    }

    if (persistedCase.application.state !== 'IN_PROGRESS') {
      return deepFreeze({
        status: 'COMMAND_REJECTED',
        operation: 'SaveSnapshot',
        reasonCode: 'GUARD_FAILED',
        caseId: persistedCase.caseId,
        diagnostic: {
          currentState: persistedCase.application.state,
          requiredState: 'IN_PROGRESS',
        },
      })
    }

    const nextRevision = persistedCase.revision + 1
    const snapshotId = dependencies.metadata.snapshotId(
      persistedCase.caseId,
      persistedCase.application.draftSnapshots.length + 1,
    )
    const command: SaveSnapshotCommand = deepFreeze({
      commandId: dependencies.metadata.commandId(
        persistedCase.caseId,
        'SaveSnapshot',
        nextRevision,
      ),
      type: 'SaveSnapshot',
      caseId: persistedCase.caseId,
      actor: 'APPLICANT',
      syntheticTimestamp: dependencies.metadata.nextTimestamp(persistedCase.updatedAt),
      idempotencyKey: input.idempotencyKey,
      payload: { draftSnapshotId: snapshotId, stepId: input.currentStep },
    })
    const mutation = applySaveSnapshot(
      persistedCase,
      command,
      answersValidation.data,
      dependencies.metadata,
    )
    const envelope = loaded.state
    if (envelope === null) {
      throw new Error('A located Case must belong to a loaded persistence envelope.')
    }
    const nextEnvelope = replaceCase(envelope, mutation.persistedCase)
    const saved = saveEnvelope(
      dependencies,
      nextEnvelope,
      'SaveSnapshot',
      persistedCase.caseId,
    )
    if ('status' in saved) {
      return saved
    }
    return acceptedResult({
      operation: 'SaveSnapshot',
      command,
      persistedCase: mutation.persistedCase,
      eventType: mutation.event.eventType,
      eventId: mutation.event.eventId,
      idempotentReplay: false,
      snapshotId,
    })
  }

  function resumeCase(candidate: unknown = {}): RuntimeResumeResult {
    const parsed = resumeCaseInputSchema.safeParse(candidate)
    if (!parsed.success) {
      return invalidCommand('ResumeCase', parsed.error.issues.length)
    }
    const loaded = loadForMutation(dependencies)
    if (loaded.status !== 'READY') {
      return loaded
    }
    const caseId = parsed.data.caseId ?? loaded.state?.activeCaseId ?? null
    if (caseId === null) {
      return Object.freeze({ status: 'CASE_NOT_FOUND', caseId: null })
    }
    const persistedCase = loaded.state?.cases.find((candidateCase) => candidateCase.caseId === caseId)
    if (persistedCase === undefined) {
      return Object.freeze({ status: 'CASE_NOT_FOUND', caseId })
    }
    const latestSnapshot = persistedCase.application.draftSnapshots.at(-1)
    return deepFreeze({
      status: 'CASE_RESUMED',
      activeCaseId: loaded.state?.activeCaseId ?? null,
      caseId: persistedCase.caseId,
      scenarioId: persistedCase.scenarioId,
      policyQualifiedVersion: persistedCase.policyPin.qualifiedVersion,
      applicationState: persistedCase.application.state,
      currentStep: latestSnapshot?.currentStep ?? null,
      latestAnswers: latestSnapshot?.answers ?? {},
      latestSnapshotId: latestSnapshot?.snapshotId ?? null,
      resumable:
        persistedCase.application.state === 'DRAFT_CREATED' ||
        persistedCase.application.state === 'IN_PROGRESS',
      revision: persistedCase.revision,
    })
  }

  function inspectDocuments(candidate: unknown): RuntimeDocumentInspectResult {
    const parsed = inspectDocumentsInputSchema.safeParse(candidate)
    if (!parsed.success) {
      return invalidCommand('InspectDocuments', parsed.error.issues.length)
    }
    const loaded = loadForMutation(dependencies)
    if (loaded.status !== 'READY') {
      return loaded
    }
    const persistedCase = loaded.state?.cases.find(
      ({ caseId }) => caseId === parsed.data.caseId,
    )
    if (persistedCase === undefined) {
      return Object.freeze({ status: 'CASE_NOT_FOUND', caseId: parsed.data.caseId })
    }
    const latestSnapshot = persistedCase.application.draftSnapshots.at(-1)
    if (
      persistedCase.application.state !== 'IN_PROGRESS' ||
      (latestSnapshot?.currentStep !== 'DOCUMENTS' &&
        latestSnapshot?.currentStep !== 'REVIEW')
    ) {
      return deepFreeze({
        status: 'COMMAND_REJECTED',
        operation: 'InspectDocuments',
        reasonCode: 'GUARD_FAILED',
        caseId: persistedCase.caseId,
        diagnostic: {
          currentState: persistedCase.application.state,
          requiredState: 'IN_PROGRESS',
        },
      })
    }
    const evaluation = evaluatePinnedDocumentPolicy(persistedCase)
    if ('status' in evaluation) {
      return evaluation
    }
    return buildDocumentPreparationView(persistedCase, evaluation)
  }

  function prepareDocumentFixture(candidate: unknown): RuntimeDocumentMutationResult {
    const parsed = prepareDocumentInputSchema.safeParse(candidate)
    if (!parsed.success) {
      return invalidCommand('PrepareDocument', parsed.error.issues.length)
    }
    const loaded = loadForMutation(dependencies)
    if (loaded.status !== 'READY') {
      return loaded
    }
    const input = parsed.data
    const persistedCase = loaded.state?.cases.find(({ caseId }) => caseId === input.caseId)
    if (persistedCase === undefined) {
      return Object.freeze({ status: 'CASE_NOT_FOUND', caseId: input.caseId })
    }
    const latestSnapshot = persistedCase.application.draftSnapshots.at(-1)
    if (
      persistedCase.application.state !== 'IN_PROGRESS' ||
      (latestSnapshot?.currentStep !== 'DOCUMENTS' &&
        latestSnapshot?.currentStep !== 'REVIEW')
    ) {
      return deepFreeze({
        status: 'COMMAND_REJECTED',
        operation: 'PrepareDocument',
        reasonCode: 'GUARD_FAILED',
        caseId: persistedCase.caseId,
        diagnostic: {
          currentState: persistedCase.application.state,
          requiredState: 'IN_PROGRESS',
          requirementId: input.requirementId,
        },
      })
    }

    const evaluation = evaluatePinnedDocumentPolicy(persistedCase)
    if ('status' in evaluation) {
      return evaluation
    }
    const requirement = evaluation.documentManifest?.requirements.find(
      ({ id }) => id === input.requirementId,
    )
    const fixture = a04DocumentFixtures.find(({ fixtureId }) => fixtureId === input.fixtureId)
    if (
      requirement === undefined ||
      fixture === undefined ||
      fixture.requirementId !== requirement.id ||
      fixture.documentType !== requirement.documentType ||
      !requirement.acceptedFixtureCategories.includes(fixture.fixtureCategory)
    ) {
      return invalidCommand(
        'PrepareDocument',
        1,
        'FIXTURE_NOT_COMPATIBLE',
        persistedCase.caseId,
      )
    }

    const preparation = buildDocumentPreparationView(persistedCase, evaluation)
    const requirementView = preparation.requirements.find(
      ({ requirementId }) => requirementId === input.requirementId,
    )
    const latestVersion = requirementView?.versionHistory.at(-1)
    if (
      latestVersion !== undefined &&
      latestVersion.fixtureId === fixture.fixtureId &&
      latestVersion.state !== 'CREATED'
    ) {
      return deepFreeze({
        status: 'DOCUMENT_EXISTING',
        operation: 'PrepareDocument',
        caseId: persistedCase.caseId,
        requirementId: input.requirementId,
        fixtureId: fixture.fixtureId,
        documentVersionId: latestVersion.documentVersionId,
        documentState: latestVersion.state,
        revision: persistedCase.revision,
        idempotentReplay: true,
      })
    }

    if (existingIdempotentEvent(persistedCase, input.idempotencyKey) !== undefined) {
      return invalidCommand(
        'PrepareDocument',
        1,
        'IDEMPOTENCY_CONFLICT',
        persistedCase.caseId,
      )
    }

    const inspection = dependencies.adapters.documentInspection.execute({
      requestReference: documentRequestReference(
        persistedCase.caseId,
        input.requirementId,
        fixture.fixtureId,
      ),
      correlationId: documentCorrelationId(persistedCase.caseId, input.requirementId),
      caseId: persistedCase.caseId,
      fixtureId: fixture.fixtureId,
      expectedDocumentType: fixture.documentType,
      scenario: fixture.expectedInspectionScenario,
    })
    if (
      inspection.status !== 'MOCK_OUTCOME' ||
      (inspection.outcome !== 'PREFLIGHT_PASSED' &&
        inspection.outcome !== 'PREFLIGHT_FAILED')
    ) {
      return invalidCommand(
        'PrepareDocument',
        1,
        'DOCUMENT_INSPECTION_UNAVAILABLE',
        persistedCase.caseId,
      )
    }

    const mutation = applyDocumentPreparation({
      persistedCase,
      fixture,
      outcome: {
        state: inspection.outcome,
        reasonCode: inspection.reasonCode,
      },
      idempotencyKey: input.idempotencyKey,
      metadata: dependencies.metadata,
    })
    if (!mutation.accepted) {
      return deepFreeze({
        status: 'COMMAND_REJECTED',
        operation: 'PrepareDocument',
        reasonCode: mutation.reasonCode,
        caseId: persistedCase.caseId,
        diagnostic: {
          ...(mutation.documentState === undefined
            ? {}
            : { documentState: mutation.documentState }),
          requirementId: input.requirementId,
        },
      })
    }
    const envelope = loaded.state
    if (envelope === null) {
      throw new Error('A located Case must belong to a loaded persistence envelope.')
    }
    const nextEnvelope = replaceCase(envelope, mutation.persistedCase)
    const saved = saveEnvelope(
      dependencies,
      nextEnvelope,
      'PrepareDocument',
      persistedCase.caseId,
    )
    if ('status' in saved) {
      return saved
    }

    return deepFreeze({
      status: 'DOCUMENT_PREPARED',
      operation: 'PrepareDocument',
      caseId: persistedCase.caseId,
      requirementId: input.requirementId,
      fixtureId: fixture.fixtureId,
      documentVersionId: mutation.documentVersionId,
      documentState: inspection.outcome,
      revision: mutation.persistedCase.revision,
      emittedEventTypes: mutation.events.map(({ eventType }) => eventType),
      emittedEventIds: mutation.events.map(({ eventId }) => eventId),
      inspectionReasonCode: inspection.reasonCode,
    })
  }

  function inspectReview(candidate: unknown): RuntimeReviewInspectResult {
    const parsed = reviewInputSchema.safeParse(candidate)
    if (!parsed.success) {
      return invalidCommand('InspectReview', parsed.error.issues.length)
    }
    const loaded = loadForMutation(dependencies)
    if (loaded.status !== 'READY') {
      return loaded
    }
    const persistedCase = loaded.state?.cases.find(
      ({ caseId }) => caseId === parsed.data.caseId,
    )
    if (persistedCase === undefined) {
      return Object.freeze({ status: 'CASE_NOT_FOUND', caseId: parsed.data.caseId })
    }
    const latestStep = persistedCase.application.draftSnapshots.at(-1)?.currentStep
    if (
      (persistedCase.application.state !== 'IN_PROGRESS' || latestStep !== 'REVIEW') &&
      persistedCase.application.state !== 'LOCKED'
    ) {
      return deepFreeze({
        status: 'COMMAND_REJECTED',
        operation: 'InspectReview',
        reasonCode: 'GUARD_FAILED',
        caseId: persistedCase.caseId,
        diagnostic: {
          currentState: persistedCase.application.state,
          requiredState: 'IN_PROGRESS',
        },
      })
    }
    const evaluation = evaluatePinnedDocumentPolicy(persistedCase)
    if ('status' in evaluation) {
      return evaluation
    }
    const projection = buildReviewSummary(persistedCase, evaluation)
    if (!projection.accepted) {
      return reviewPrerequisiteRejection(
        'InspectReview',
        persistedCase,
        projection.missingQuestionIds,
        projection.missingRequirementIds,
      )
    }
    return projection.summary
  }

  function prepareReview(candidate: unknown): RuntimeReviewMutationResult {
    const parsed = reviewMutationInputSchema.safeParse(candidate)
    if (!parsed.success) {
      return invalidCommand('PrepareReview', parsed.error.issues.length)
    }
    const loaded = loadForMutation(dependencies)
    if (loaded.status !== 'READY') {
      return loaded
    }
    const input = parsed.data
    const persistedCase = loaded.state?.cases.find(({ caseId }) => caseId === input.caseId)
    if (persistedCase === undefined) {
      return Object.freeze({ status: 'CASE_NOT_FOUND', caseId: input.caseId })
    }
    const latestSnapshot = persistedCase.application.draftSnapshots.at(-1)
    if (latestSnapshot?.currentStep === 'REVIEW') {
      return deepFreeze({
        status: 'REVIEW_PREPARED',
        operation: 'PrepareReview',
        caseId: persistedCase.caseId,
        revision: persistedCase.revision,
        snapshotId: latestSnapshot.snapshotId,
        idempotentReplay: true,
      })
    }
    if (
      persistedCase.application.state !== 'IN_PROGRESS' ||
      latestSnapshot?.currentStep !== 'DOCUMENTS'
    ) {
      return deepFreeze({
        status: 'COMMAND_REJECTED',
        operation: 'PrepareReview',
        reasonCode: 'GUARD_FAILED',
        caseId: persistedCase.caseId,
        diagnostic: {
          currentState: persistedCase.application.state,
          requiredState: 'IN_PROGRESS',
        },
      })
    }
    const evaluation = evaluatePinnedDocumentPolicy(persistedCase)
    if ('status' in evaluation) {
      return evaluation
    }
    const projection = buildReviewSummary(persistedCase, evaluation)
    if (!projection.accepted) {
      return reviewPrerequisiteRejection(
        'PrepareReview',
        persistedCase,
        projection.missingQuestionIds,
        projection.missingRequirementIds,
      )
    }
    if (existingIdempotentEvent(persistedCase, input.idempotencyKey) !== undefined) {
      return invalidCommand(
        'PrepareReview',
        1,
        'IDEMPOTENCY_CONFLICT',
        persistedCase.caseId,
      )
    }

    const nextRevision = persistedCase.revision + 1
    const snapshotId = dependencies.metadata.snapshotId(
      persistedCase.caseId,
      persistedCase.application.draftSnapshots.length + 1,
    )
    const command: SaveSnapshotCommand = deepFreeze({
      commandId: dependencies.metadata.commandId(
        persistedCase.caseId,
        'PrepareReview',
        nextRevision,
      ),
      type: 'SaveSnapshot',
      caseId: persistedCase.caseId,
      actor: 'APPLICANT',
      syntheticTimestamp: dependencies.metadata.nextTimestamp(persistedCase.updatedAt),
      idempotencyKey: input.idempotencyKey,
      payload: { draftSnapshotId: snapshotId, stepId: 'REVIEW' },
    })
    const mutation = applySaveSnapshot(
      persistedCase,
      command,
      latestSnapshot.answers,
      dependencies.metadata,
    )
    const envelope = loaded.state
    if (envelope === null) {
      throw new Error('A located Case must belong to a loaded persistence envelope.')
    }
    const saved = saveEnvelope(
      dependencies,
      replaceCase(envelope, mutation.persistedCase),
      'PrepareReview',
      persistedCase.caseId,
    )
    if ('status' in saved) {
      return saved
    }
    return deepFreeze({
      status: 'REVIEW_PREPARED',
      operation: 'PrepareReview',
      caseId: persistedCase.caseId,
      revision: mutation.persistedCase.revision,
      snapshotId,
      idempotentReplay: false,
    })
  }

  function submitApplication(candidate: unknown): RuntimeReviewMutationResult {
    const parsed = reviewMutationInputSchema.safeParse(candidate)
    if (!parsed.success) {
      return invalidCommand('SubmitApplication', parsed.error.issues.length)
    }
    const loaded = loadForMutation(dependencies)
    if (loaded.status !== 'READY') {
      return loaded
    }
    const input = parsed.data
    const persistedCase = loaded.state?.cases.find(({ caseId }) => caseId === input.caseId)
    if (persistedCase === undefined) {
      return Object.freeze({ status: 'CASE_NOT_FOUND', caseId: input.caseId })
    }
    if (persistedCase.application.state === 'LOCKED') {
      return deepFreeze({
        status: 'APPLICATION_ALREADY_SUBMITTED',
        operation: 'SubmitApplication',
        caseId: persistedCase.caseId,
        revision: persistedCase.revision,
        applicationState: 'LOCKED',
        idempotentReplay: true,
      })
    }
    if (existingIdempotentEvent(persistedCase, input.idempotencyKey) !== undefined) {
      return invalidCommand(
        'SubmitApplication',
        1,
        'IDEMPOTENCY_CONFLICT',
        persistedCase.caseId,
      )
    }
    const evaluation = evaluatePinnedDocumentPolicy(persistedCase)
    if ('status' in evaluation) {
      return evaluation
    }
    const projection = buildReviewSummary(persistedCase, evaluation)
    if (!projection.accepted) {
      return reviewPrerequisiteRejection(
        'SubmitApplication',
        persistedCase,
        projection.missingQuestionIds,
        projection.missingRequirementIds,
      )
    }
    const mutation = applyReviewSubmission({
      persistedCase,
      evaluation,
      idempotencyKey: input.idempotencyKey,
      metadata: dependencies.metadata,
    })
    if (!mutation.accepted) {
      return deepFreeze({
        status: 'COMMAND_REJECTED',
        operation: 'SubmitApplication',
        reasonCode: mutation.reasonCode,
        caseId: persistedCase.caseId,
        diagnostic: { currentState: persistedCase.application.state },
      })
    }
    const envelope = loaded.state
    if (envelope === null) {
      throw new Error('A located Case must belong to a loaded persistence envelope.')
    }
    const saved = saveEnvelope(
      dependencies,
      replaceCase(envelope, mutation.persistedCase),
      'SubmitApplication',
      persistedCase.caseId,
    )
    if ('status' in saved) {
      return saved
    }
    return deepFreeze({
      status: 'APPLICATION_SUBMITTED',
      operation: 'SubmitApplication',
      caseId: persistedCase.caseId,
      revision: mutation.persistedCase.revision,
      applicationState: 'LOCKED',
      submittedDocumentVersionIds: mutation.submittedDocumentVersionIds,
      emittedEventTypes: mutation.events.map(({ eventType }) => eventType),
      emittedEventIds: mutation.events.map(({ eventId }) => eventId),
    })
  }

  function inspectPayment(candidate: unknown): RuntimePaymentInspectResult {
    const parsed = paymentInputSchema.safeParse(candidate)
    if (!parsed.success) {
      return invalidCommand('InspectPayment', parsed.error.issues.length)
    }
    const loaded = loadForMutation(dependencies)
    if (loaded.status !== 'READY') {
      return loaded
    }
    const persistedCase = loaded.state?.cases.find(
      ({ caseId }) => caseId === parsed.data.caseId,
    )
    if (persistedCase === undefined) {
      return Object.freeze({ status: 'CASE_NOT_FOUND', caseId: parsed.data.caseId })
    }
    const evaluation = evaluatePinnedPaymentPolicy(persistedCase)
    if ('status' in evaluation) {
      return evaluation
    }
    const projection = buildPaymentSummary(persistedCase, evaluation)
    if (!projection.accepted) {
      return deepFreeze({
        status: 'COMMAND_REJECTED',
        operation: 'InspectPayment',
        reasonCode: 'PAYMENT_PREREQUISITES_NOT_MET',
        caseId: persistedCase.caseId,
        diagnostic: {
          currentState: persistedCase.application.state,
          requiredState: 'LOCKED',
          paymentState: persistedCase.payment.state,
        },
      })
    }
    return projection.summary
  }

  function startMockPayment(candidate: unknown): RuntimePaymentMutationResult {
    const parsed = paymentInputSchema.safeParse(candidate)
    if (!parsed.success) {
      return invalidCommand('StartMockPayment', parsed.error.issues.length)
    }
    const loaded = loadForMutation(dependencies)
    if (loaded.status !== 'READY') {
      return loaded
    }
    const persistedCase = loaded.state?.cases.find(
      ({ caseId }) => caseId === parsed.data.caseId,
    )
    if (persistedCase === undefined) {
      return Object.freeze({ status: 'CASE_NOT_FOUND', caseId: parsed.data.caseId })
    }
    const evaluation = evaluatePinnedPaymentPolicy(persistedCase)
    if ('status' in evaluation) {
      return evaluation
    }
    const projection = buildPaymentSummary(persistedCase, evaluation)
    if (!projection.accepted) {
      return invalidCommand(
        'StartMockPayment',
        1,
        'PAYMENT_PREREQUISITES_NOT_MET',
        persistedCase.caseId,
      )
    }
    if (persistedCase.payment.state !== 'NOT_STARTED') {
      return paymentExisting('StartMockPayment', persistedCase)
    }

    const amount = evaluation.syntheticFee?.amount
    if (amount !== 41 && amount !== 73) {
      return invalidCommand(
        'StartMockPayment',
        1,
        'PAYMENT_PREREQUISITES_NOT_MET',
        persistedCase.caseId,
      )
    }
    const attemptId = dependencies.metadata.paymentAttemptId(persistedCase.caseId)
    const syntheticReference = dependencies.metadata.paymentReference(persistedCase.caseId)
    const idempotencyKey = paymentIdempotencyKey(persistedCase.caseId, 'START')
    const evidence = dependencies.adapters.payment.execute({
      requestReference: syntheticReference,
      correlationId: paymentCorrelationId(persistedCase.caseId),
      caseId: persistedCase.caseId,
      applicationId: persistedCase.application.applicationDraftId,
      amount,
      unit: 'SYNTHETIC_DEMO_CREDITS',
      idempotencyKey,
      scenario: 'PAYMENT_AMBIGUOUS_RECONCILIATION',
    })
    if (
      evidence.status !== 'MOCK_OUTCOME' ||
      evidence.outcome !== 'RECONCILIATION_REQUIRED'
    ) {
      return invalidCommand(
        'StartMockPayment',
        1,
        'PAYMENT_ADAPTER_REJECTED',
        persistedCase.caseId,
      )
    }
    if (
      !paymentEvidenceMatches({
        metadata: evidence.metadata,
        persistedCase,
        amount,
        idempotencyKey,
        syntheticReference,
      })
    ) {
      return invalidCommand(
        'StartMockPayment',
        1,
        'PAYMENT_EVIDENCE_MISMATCH',
        persistedCase.caseId,
      )
    }

    const mutation = applyAmbiguousPaymentStart({
      persistedCase,
      amount,
      attemptId,
      syntheticReference,
      idempotencyKey,
      adapterReasonCode: evidence.reasonCode,
      metadata: dependencies.metadata,
    })
    if (!mutation.accepted) {
      return invalidCommand(
        'StartMockPayment',
        1,
        mutation.reasonCode,
        persistedCase.caseId,
      )
    }
    const envelope = loaded.state
    if (envelope === null) {
      throw new Error('A located Case must belong to a loaded persistence envelope.')
    }
    const saved = saveEnvelope(
      dependencies,
      replaceCase(envelope, mutation.persistedCase),
      'StartMockPayment',
      persistedCase.caseId,
    )
    if ('status' in saved) {
      return saved
    }
    return deepFreeze({
      status: 'PAYMENT_RECONCILIATION_REQUIRED',
      operation: 'StartMockPayment',
      caseId: persistedCase.caseId,
      revision: mutation.persistedCase.revision,
      paymentState: 'RECONCILIATION_REQUIRED',
      mockPaymentAttemptId: attemptId,
      syntheticReference,
      emittedEventTypes: mutation.events.map(({ eventType }) => eventType),
      emittedEventIds: mutation.events.map(({ eventId }) => eventId),
    })
  }

  function checkMockPaymentStatus(candidate: unknown): RuntimePaymentMutationResult {
    const parsed = paymentInputSchema.safeParse(candidate)
    if (!parsed.success) {
      return invalidCommand('CheckMockPaymentStatus', parsed.error.issues.length)
    }
    const loaded = loadForMutation(dependencies)
    if (loaded.status !== 'READY') {
      return loaded
    }
    const persistedCase = loaded.state?.cases.find(
      ({ caseId }) => caseId === parsed.data.caseId,
    )
    if (persistedCase === undefined) {
      return Object.freeze({ status: 'CASE_NOT_FOUND', caseId: parsed.data.caseId })
    }
    const evaluation = evaluatePinnedPaymentPolicy(persistedCase)
    if ('status' in evaluation) {
      return evaluation
    }
    const projection = buildPaymentSummary(persistedCase, evaluation)
    if (!projection.accepted) {
      return invalidCommand(
        'CheckMockPaymentStatus',
        1,
        'PAYMENT_PREREQUISITES_NOT_MET',
        persistedCase.caseId,
      )
    }
    if (persistedCase.payment.state === 'CONFIRMED') {
      return paymentExisting('CheckMockPaymentStatus', persistedCase)
    }
    if (persistedCase.payment.state !== 'RECONCILIATION_REQUIRED') {
      return invalidCommand(
        'CheckMockPaymentStatus',
        1,
        'GUARD_FAILED',
        persistedCase.caseId,
      )
    }
    const attemptId = persistedCase.payment.mockPaymentAttemptId
    const syntheticReference = persistedCase.payment.syntheticReference
    const amount = evaluation.syntheticFee?.amount
    if (
      attemptId === null ||
      syntheticReference === null ||
      (amount !== 41 && amount !== 73)
    ) {
      return invalidCommand(
        'CheckMockPaymentStatus',
        1,
        'PERSISTENCE_VALIDATION_FAILED',
        persistedCase.caseId,
      )
    }
    const idempotencyKey = paymentIdempotencyKey(persistedCase.caseId, 'RECONCILE')
    const evidence = dependencies.adapters.payment.execute({
      requestReference: syntheticReference,
      correlationId: paymentCorrelationId(persistedCase.caseId),
      caseId: persistedCase.caseId,
      applicationId: persistedCase.application.applicationDraftId,
      amount,
      unit: 'SYNTHETIC_DEMO_CREDITS',
      idempotencyKey,
      scenario: 'PAYMENT_RECONCILIATION_CONFIRMED',
    })
    if (
      evidence.status !== 'MOCK_OUTCOME' ||
      evidence.outcome !== 'RECONCILIATION_CONFIRMED'
    ) {
      return invalidCommand(
        'CheckMockPaymentStatus',
        1,
        'PAYMENT_ADAPTER_REJECTED',
        persistedCase.caseId,
      )
    }
    if (
      !paymentEvidenceMatches({
        metadata: evidence.metadata,
        persistedCase,
        amount,
        idempotencyKey,
        syntheticReference,
      })
    ) {
      return invalidCommand(
        'CheckMockPaymentStatus',
        1,
        'PAYMENT_EVIDENCE_MISMATCH',
        persistedCase.caseId,
      )
    }

    const mutation = applyPaymentReconciliation({
      persistedCase,
      attemptId,
      syntheticReference,
      idempotencyKey,
      adapterReasonCode: evidence.reasonCode,
      metadata: dependencies.metadata,
    })
    if (!mutation.accepted) {
      return invalidCommand(
        'CheckMockPaymentStatus',
        1,
        mutation.reasonCode,
        persistedCase.caseId,
      )
    }
    const envelope = loaded.state
    if (envelope === null) {
      throw new Error('A located Case must belong to a loaded persistence envelope.')
    }
    const saved = saveEnvelope(
      dependencies,
      replaceCase(envelope, mutation.persistedCase),
      'CheckMockPaymentStatus',
      persistedCase.caseId,
    )
    if ('status' in saved) {
      return saved
    }
    const event = mutation.events[0]
    if (event === undefined || event.eventType !== 'PaymentReconciledConfirmed') {
      throw new Error('Payment reconciliation must produce its approved confirmation event.')
    }
    return deepFreeze({
      status: 'PAYMENT_CONFIRMED',
      operation: 'CheckMockPaymentStatus',
      caseId: persistedCase.caseId,
      revision: mutation.persistedCase.revision,
      paymentState: 'CONFIRMED',
      mockPaymentAttemptId: attemptId,
      syntheticReference,
      emittedEventType: event.eventType,
      emittedEventId: event.eventId,
    })
  }

  return Object.freeze({
    inspectState,
    evaluateScenario,
    createCase,
    beginDraft,
    saveDraftSnapshot,
    resumeCase,
    inspectDocuments,
    prepareDocumentFixture,
    inspectReview,
    prepareReview,
    submitApplication,
    inspectPayment,
    startMockPayment,
    checkMockPaymentStatus,
  })
}
