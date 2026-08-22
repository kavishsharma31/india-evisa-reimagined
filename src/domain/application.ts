import type { PolicyQualifiedVersion, SyntheticId } from './ids'
import {
  freezeTransitionTable,
  transitionState,
  type TransitionResult,
  type TransitionTable,
} from './transitions'

export const APPLICATION_STATES = Object.freeze([
  'DRAFT_CREATED',
  'IN_PROGRESS',
  'READY_FOR_REVIEW',
  'READY_TO_SUBMIT',
  'SUBMITTED',
  'LOCKED',
] as const)

export type ApplicationState = (typeof APPLICATION_STATES)[number]

export type ApplicationDraftContract = Readonly<{
  applicationDraftId: SyntheticId
  caseId: SyntheticId
  state: ApplicationState
  policyQualifiedVersion: PolicyQualifiedVersion
  revision: number
}>

const applicationTransitions: TransitionTable<ApplicationState> =
  freezeTransitionTable<ApplicationState>({
  DRAFT_CREATED: ['IN_PROGRESS'],
  IN_PROGRESS: ['READY_FOR_REVIEW'],
  READY_FOR_REVIEW: ['IN_PROGRESS', 'READY_TO_SUBMIT'],
  READY_TO_SUBMIT: ['IN_PROGRESS', 'SUBMITTED'],
  SUBMITTED: ['LOCKED'],
  LOCKED: [],
  })

export function transitionApplicationState(
  currentState: ApplicationState,
  requestedState: ApplicationState,
): TransitionResult<ApplicationState> {
  return transitionState('APPLICATION', applicationTransitions, currentState, requestedState)
}
