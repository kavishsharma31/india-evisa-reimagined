import {
  transitionApplicationState,
  transitionDocumentVersionState,
  type DomainCommand,
  type SyntheticId,
} from '../domain'
import { syntheticIdSchema } from '../domain/ids'
import type { PolicyEvaluationResult } from '../policy'
import { deepFreeze } from '../policy/schema'
import { validateQuestionAnswerShape } from '../policy/question-validation'
import {
  persistedCaseSchema,
  persistedDomainEventSchema,
  type PersistedCase,
  type PersistedDomainEvent,
} from '../persistence'
import type {
  RuntimeMetadataSource,
  RuntimeReviewSummary,
} from './contracts'
import { documentFixtureForVersionId } from './document-runtime'

type ApplicationSubmissionCommand = Extract<
  DomainCommand,
  {
    type:
      | 'MarkReadyForReview'
      | 'ConfirmReview'
      | 'SubmitApplication'
      | 'LockSubmission'
  }
>
type SubmitDocumentVersionCommand = Extract<
  DomainCommand,
  { type: 'SubmitDocumentVersion' }
>

export type ReviewPrerequisiteFailure = Readonly<{
  accepted: false
  missingQuestionIds: readonly string[]
  missingRequirementIds: readonly string[]
}>

export type ReviewProjectionResult =
  | Readonly<{ accepted: true; summary: RuntimeReviewSummary }>
  | ReviewPrerequisiteFailure

export type SubmissionMutation = Readonly<{
  accepted: true
  persistedCase: PersistedCase
  events: readonly PersistedDomainEvent[]
  submittedDocumentVersionIds: readonly SyntheticId[]
}>

export type SubmissionMutationRejection = Readonly<{
  accepted: false
  reasonCode: 'GUARD_FAILED' | 'INVALID_LIFECYCLE_TRANSITION'
}>

function childIdempotencyKey(
  idempotencyKey: SyntheticId,
  suffix: string,
): SyntheticId {
  return syntheticIdSchema.parse(`${idempotencyKey}-${suffix}`)
}

function currentDocumentVersion(
  persistedCase: PersistedCase,
  requirementId: string,
) {
  const aggregate = persistedCase.documents.find(
    (candidate) => candidate.requirementId === requirementId,
  )
  if (aggregate?.activeVersionId === null || aggregate?.activeVersionId === undefined) {
    return null
  }
  const version = aggregate.versions.find(
    (candidate) => candidate.documentVersionId === aggregate.activeVersionId,
  )
  return version === undefined ? null : { aggregate, version }
}

export function buildReviewSummary(
  persistedCase: PersistedCase,
  evaluation: PolicyEvaluationResult,
): ReviewProjectionResult {
  const questionManifest = evaluation.questionManifest
  const documentManifest = evaluation.documentManifest
  const syntheticFee = evaluation.syntheticFee
  const purposeFamily = evaluation.suggestedPurposeFamily
  const latestSnapshot = persistedCase.application.draftSnapshots.at(-1)

  if (
    evaluation.scenarioSupport !== 'SUPPORTED_BY_DEMO' ||
    evaluation.policy.qualifiedVersion !== persistedCase.policyPin.qualifiedVersion ||
    questionManifest === undefined ||
    documentManifest === undefined ||
    syntheticFee === undefined ||
    purposeFamily === undefined ||
    latestSnapshot === undefined
  ) {
    return deepFreeze({
      accepted: false,
      missingQuestionIds: questionManifest?.questions.map(({ id }) => id) ?? [],
      missingRequirementIds:
        documentManifest?.requirements.map(({ id }) => id) ?? [],
    })
  }

  const missingQuestionIds = questionManifest.questions.flatMap((question) => {
    const answer = latestSnapshot.answers[question.id]
    return answer !== undefined && validateQuestionAnswerShape(question, answer) === null
      ? []
      : question.required
        ? [question.id]
        : []
  })
  const requiredDocumentState =
    persistedCase.application.state === 'LOCKED' ? 'SUBMITTED' : 'PREFLIGHT_PASSED'
  const missingRequirementIds = documentManifest.requirements.flatMap(
    (requirement) => {
      const current = currentDocumentVersion(persistedCase, requirement.id)
      return current?.version.state === requiredDocumentState ? [] : [requirement.id]
    },
  )

  if (missingQuestionIds.length > 0 || missingRequirementIds.length > 0) {
    return deepFreeze({
      accepted: false,
      missingQuestionIds,
      missingRequirementIds,
    })
  }

  const answers = questionManifest.questions.map((question) => {
    const answerValue = latestSnapshot.answers[question.id]
    if (answerValue === undefined) {
      throw new Error('A validated review answer unexpectedly became unavailable.')
    }
    return deepFreeze({
      questionId: question.id,
      prompt: question.prompt,
      answerValue,
      allowedValues: question.allowedValues,
    })
  })
  const documents = documentManifest.requirements.map((requirement) => {
    const current = currentDocumentVersion(persistedCase, requirement.id)
    if (current === null) {
      throw new Error('A validated review document unexpectedly became unavailable.')
    }
    const fixture = documentFixtureForVersionId(current.version.documentVersionId)
    if (fixture === undefined || fixture.requirementId !== requirement.id) {
      throw new Error('A review document version did not resolve to its bundled fixture.')
    }
    return deepFreeze({
      requirementId: requirement.id,
      documentType: requirement.documentType,
      documentVersionId: current.version.documentVersionId,
      fixtureId: fixture.fixtureId,
      state: current.version.state,
    })
  })

  return deepFreeze({
    accepted: true,
    summary: {
      status: 'REVIEW_INSPECTED',
      caseId: persistedCase.caseId,
      scenarioId: persistedCase.scenarioId,
      purposeFamily,
      policyQualifiedVersion: persistedCase.policyPin.qualifiedVersion,
      applicationState: persistedCase.application.state,
      revision: persistedCase.revision,
      answers,
      documents,
      syntheticFee,
      locked: persistedCase.application.state === 'LOCKED',
    },
  })
}

function applyApplicationTransition(input: {
  persistedCase: PersistedCase
  command: ApplicationSubmissionCommand
  eventType:
    | 'DraftReadyForReview'
    | 'ApplicationReadyToSubmit'
    | 'ApplicationSubmitted'
    | 'ApplicationLocked'
  nextState: 'READY_FOR_REVIEW' | 'READY_TO_SUBMIT' | 'SUBMITTED' | 'LOCKED'
  metadata: RuntimeMetadataSource
}): Readonly<{
  accepted: true
  persistedCase: PersistedCase
  event: PersistedDomainEvent
}> | SubmissionMutationRejection {
  const transition = transitionApplicationState(
    input.persistedCase.application.state,
    input.nextState,
  )
  if (!transition.accepted) {
    return deepFreeze({ accepted: false, reasonCode: transition.reasonCode })
  }
  const nextRevision = input.persistedCase.revision + 1
  const timestamp = input.metadata.nextTimestamp(input.persistedCase.updatedAt)
  const event = persistedDomainEventSchema.parse({
    eventId: input.metadata.eventId(
      input.persistedCase.caseId,
      input.eventType,
      nextRevision,
    ),
    caseId: input.persistedCase.caseId,
    eventType: input.eventType,
    domain: 'APPLICATION',
    aggregateId: input.persistedCase.application.applicationDraftId,
    previousState: transition.previousState,
    newState: transition.nextState,
    actor: input.command.actor,
    syntheticTimestamp: timestamp,
    policyQualifiedVersion: input.persistedCase.policyPin.qualifiedVersion,
    idempotencyKey: input.command.idempotencyKey,
    payload: {},
  })
  return deepFreeze({
    accepted: true,
    persistedCase: persistedCaseSchema.parse({
      ...input.persistedCase,
      revision: nextRevision,
      updatedAt: timestamp,
      application: {
        ...input.persistedCase.application,
        state: transition.nextState,
        revision: input.persistedCase.application.revision + 1,
      },
      auditEvents: [...input.persistedCase.auditEvents, event],
    }),
    event,
  })
}

function submitDocumentVersion(input: {
  persistedCase: PersistedCase
  requirementId: string
  command: SubmitDocumentVersionCommand
  metadata: RuntimeMetadataSource
}): Readonly<{
  accepted: true
  persistedCase: PersistedCase
  event: PersistedDomainEvent
}> | SubmissionMutationRejection {
  const current = currentDocumentVersion(input.persistedCase, input.requirementId)
  if (current === null || current.version.documentVersionId !== input.command.payload.documentVersionId) {
    return deepFreeze({ accepted: false, reasonCode: 'GUARD_FAILED' })
  }
  const transition = transitionDocumentVersionState(current.version.state, 'SUBMITTED')
  if (!transition.accepted) {
    return deepFreeze({ accepted: false, reasonCode: transition.reasonCode })
  }
  const nextRevision = input.persistedCase.revision + 1
  const timestamp = input.metadata.nextTimestamp(input.persistedCase.updatedAt)
  const event = persistedDomainEventSchema.parse({
    eventId: input.metadata.eventId(
      input.persistedCase.caseId,
      'DocumentVersionSubmitted',
      nextRevision,
    ),
    caseId: input.persistedCase.caseId,
    eventType: 'DocumentVersionSubmitted',
    domain: 'DOCUMENT',
    aggregateId: current.aggregate.documentAssetId,
    previousState: transition.previousState,
    newState: transition.nextState,
    actor: input.command.actor,
    syntheticTimestamp: timestamp,
    policyQualifiedVersion: input.persistedCase.policyPin.qualifiedVersion,
    idempotencyKey: input.command.idempotencyKey,
    payload: {
      documentAssetId: current.aggregate.documentAssetId,
      documentVersionId: current.version.documentVersionId,
    },
  })
  const documents = input.persistedCase.documents.map((aggregate) =>
    aggregate.requirementId === input.requirementId
      ? {
          ...aggregate,
          versions: aggregate.versions.map((version) =>
            version.documentVersionId === current.version.documentVersionId
              ? { ...version, state: transition.nextState }
              : version,
          ),
        }
      : aggregate,
  )
  return deepFreeze({
    accepted: true,
    persistedCase: persistedCaseSchema.parse({
      ...input.persistedCase,
      revision: nextRevision,
      updatedAt: timestamp,
      documents,
      auditEvents: [...input.persistedCase.auditEvents, event],
    }),
    event,
  })
}

export function applyReviewSubmission(input: {
  persistedCase: PersistedCase
  evaluation: PolicyEvaluationResult
  idempotencyKey: SyntheticId
  metadata: RuntimeMetadataSource
}): SubmissionMutation | SubmissionMutationRejection {
  if (
    input.persistedCase.application.state !== 'IN_PROGRESS' ||
    input.persistedCase.application.draftSnapshots.at(-1)?.currentStep !== 'REVIEW'
  ) {
    return deepFreeze({ accepted: false, reasonCode: 'GUARD_FAILED' })
  }
  const projection = buildReviewSummary(input.persistedCase, input.evaluation)
  if (!projection.accepted) {
    return deepFreeze({ accepted: false, reasonCode: 'GUARD_FAILED' })
  }

  const events: PersistedDomainEvent[] = []
  let currentCase = input.persistedCase

  const readyRevision = currentCase.revision + 1
  const readyTimestamp = input.metadata.nextTimestamp(currentCase.updatedAt)
  const markReadyCommand: Extract<DomainCommand, { type: 'MarkReadyForReview' }> = deepFreeze({
    commandId: input.metadata.commandId(currentCase.caseId, 'SubmitApplication', readyRevision),
    type: 'MarkReadyForReview',
    caseId: currentCase.caseId,
    actor: 'SYSTEM',
    syntheticTimestamp: readyTimestamp,
    idempotencyKey: childIdempotencyKey(input.idempotencyKey, 'READY-FOR-REVIEW'),
    payload: { applicationDraftId: currentCase.application.applicationDraftId },
  })
  const ready = applyApplicationTransition({
    persistedCase: currentCase,
    command: markReadyCommand,
    eventType: 'DraftReadyForReview',
    nextState: 'READY_FOR_REVIEW',
    metadata: input.metadata,
  })
  if (!ready.accepted) {
    return ready
  }
  currentCase = ready.persistedCase
  events.push(ready.event)

  const submittedDocumentVersionIds: SyntheticId[] = []
  for (const document of projection.summary.documents) {
    const revision = currentCase.revision + 1
    const timestamp = input.metadata.nextTimestamp(currentCase.updatedAt)
    const command: SubmitDocumentVersionCommand = deepFreeze({
      commandId: input.metadata.commandId(currentCase.caseId, 'SubmitApplication', revision),
      type: 'SubmitDocumentVersion',
      caseId: currentCase.caseId,
      actor: 'APPLICANT',
      syntheticTimestamp: timestamp,
      idempotencyKey: childIdempotencyKey(
        input.idempotencyKey,
        `DOCUMENT-${document.requirementId}`,
      ),
      payload: { documentVersionId: document.documentVersionId },
    })
    const submitted = submitDocumentVersion({
      persistedCase: currentCase,
      requirementId: document.requirementId,
      command,
      metadata: input.metadata,
    })
    if (!submitted.accepted) {
      return submitted
    }
    currentCase = submitted.persistedCase
    events.push(submitted.event)
    submittedDocumentVersionIds.push(document.documentVersionId)
  }

  const transitions: readonly Readonly<{
    commandType: 'ConfirmReview' | 'SubmitApplication' | 'LockSubmission'
    eventType:
      | 'ApplicationReadyToSubmit'
      | 'ApplicationSubmitted'
      | 'ApplicationLocked'
    nextState: 'READY_TO_SUBMIT' | 'SUBMITTED' | 'LOCKED'
    actor: 'APPLICANT' | 'SYSTEM'
    suffix: string
  }>[] = [
    {
      commandType: 'ConfirmReview',
      eventType: 'ApplicationReadyToSubmit',
      nextState: 'READY_TO_SUBMIT',
      actor: 'APPLICANT',
      suffix: 'CONFIRM-REVIEW',
    },
    {
      commandType: 'SubmitApplication',
      eventType: 'ApplicationSubmitted',
      nextState: 'SUBMITTED',
      actor: 'APPLICANT',
      suffix: 'SUBMIT',
    },
    {
      commandType: 'LockSubmission',
      eventType: 'ApplicationLocked',
      nextState: 'LOCKED',
      actor: 'SYSTEM',
      suffix: 'LOCK',
    },
  ]

  for (const transitionDefinition of transitions) {
    const revision = currentCase.revision + 1
    const timestamp = input.metadata.nextTimestamp(currentCase.updatedAt)
    const common = {
      commandId: input.metadata.commandId(currentCase.caseId, 'SubmitApplication', revision),
      caseId: currentCase.caseId,
      syntheticTimestamp: timestamp,
      idempotencyKey: childIdempotencyKey(
        input.idempotencyKey,
        transitionDefinition.suffix,
      ),
      payload: { applicationDraftId: currentCase.application.applicationDraftId },
    }
    const command: ApplicationSubmissionCommand =
      transitionDefinition.commandType === 'ConfirmReview'
        ? deepFreeze({ ...common, type: 'ConfirmReview', actor: 'APPLICANT' })
        : transitionDefinition.commandType === 'SubmitApplication'
          ? deepFreeze({ ...common, type: 'SubmitApplication', actor: 'APPLICANT' })
          : deepFreeze({ ...common, type: 'LockSubmission', actor: 'SYSTEM' })
    const transitioned = applyApplicationTransition({
      persistedCase: currentCase,
      command,
      eventType: transitionDefinition.eventType,
      nextState: transitionDefinition.nextState,
      metadata: input.metadata,
    })
    if (!transitioned.accepted) {
      return transitioned
    }
    currentCase = transitioned.persistedCase
    events.push(transitioned.event)
  }

  const finalCase = persistedCaseSchema.parse({
    ...currentCase,
    scrutiny: {
      ...currentCase.scrutiny,
      submittedDocumentVersionIds,
    },
  })
  return deepFreeze({
    accepted: true,
    persistedCase: finalCase,
    events,
    submittedDocumentVersionIds,
  })
}
