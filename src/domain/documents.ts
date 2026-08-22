import type { SyntheticId } from './ids'
import {
  freezeTransitionTable,
  transitionState,
  type TransitionResult,
  type TransitionTable,
} from './transitions'

export const DOCUMENT_VERSION_STATES = Object.freeze([
  'CREATED',
  'PREFLIGHT_PASSED',
  'PREFLIGHT_FAILED',
  'SUBMITTED',
  'UNDER_REVIEW',
  'REUPLOAD_REQUESTED',
  'ACCEPTED',
  'SUPERSEDED',
] as const)

export type DocumentVersionState = (typeof DOCUMENT_VERSION_STATES)[number]

export type DocumentVersionContract = Readonly<{
  documentVersionId: SyntheticId
  documentAssetId: SyntheticId
  caseId: SyntheticId
  sequence: number
  state: DocumentVersionState
  predecessorVersionId?: SyntheticId
}>

const documentTransitions: TransitionTable<DocumentVersionState> =
  freezeTransitionTable<DocumentVersionState>({
  CREATED: ['PREFLIGHT_PASSED', 'PREFLIGHT_FAILED'],
  PREFLIGHT_PASSED: ['SUBMITTED', 'SUPERSEDED'],
  PREFLIGHT_FAILED: ['SUPERSEDED'],
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['REUPLOAD_REQUESTED', 'ACCEPTED'],
  REUPLOAD_REQUESTED: ['SUPERSEDED'],
  ACCEPTED: [],
  SUPERSEDED: [],
  })

export function transitionDocumentVersionState(
  currentState: DocumentVersionState,
  requestedState: DocumentVersionState,
): TransitionResult<DocumentVersionState> {
  return transitionState('DOCUMENT', documentTransitions, currentState, requestedState)
}
