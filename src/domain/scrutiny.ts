import type { PolicyQualifiedVersion, SyntheticId } from './ids'
import {
  freezeTransitionTable,
  transitionState,
  type TransitionResult,
  type TransitionTable,
} from './transitions'

export const SCRUTINY_STATES = Object.freeze([
  'NOT_STARTED',
  'QUEUED',
  'IN_REVIEW',
  'ACTION_REQUIRED',
  'RESUBMITTED',
  'APPROVED',
] as const)

export type ScrutinyState = (typeof SCRUTINY_STATES)[number]

export type ScrutinyRecordContract = Readonly<{
  scrutinyRecordId: SyntheticId
  caseId: SyntheticId
  state: ScrutinyState
  policyQualifiedVersion: PolicyQualifiedVersion
  submittedDocumentVersionIds: readonly SyntheticId[]
}>

const scrutinyTransitions: TransitionTable<ScrutinyState> = freezeTransitionTable<ScrutinyState>({
  NOT_STARTED: ['QUEUED'],
  QUEUED: ['IN_REVIEW'],
  IN_REVIEW: ['ACTION_REQUIRED', 'APPROVED'],
  ACTION_REQUIRED: ['RESUBMITTED'],
  RESUBMITTED: ['IN_REVIEW'],
  APPROVED: [],
})

export function transitionScrutinyState(
  currentState: ScrutinyState,
  requestedState: ScrutinyState,
): TransitionResult<ScrutinyState> {
  return transitionState('SCRUTINY', scrutinyTransitions, currentState, requestedState)
}
