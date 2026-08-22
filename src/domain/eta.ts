import type { PolicyQualifiedVersion, SyntheticId } from './ids'
import {
  freezeTransitionTable,
  transitionState,
  type TransitionResult,
  type TransitionTable,
} from './transitions'

export const ETA_STATES = Object.freeze(['NOT_READY', 'READY_TO_ISSUE', 'ISSUED'] as const)

export type EtaState = (typeof ETA_STATES)[number]

export type SyntheticEtaContract = Readonly<{
  syntheticEtaId: SyntheticId
  caseId: SyntheticId
  state: EtaState
  policyQualifiedVersion: PolicyQualifiedVersion
  watermark: 'SYNTHETIC — NOT VALID'
}>

const etaTransitions: TransitionTable<EtaState> = freezeTransitionTable<EtaState>({
  NOT_READY: ['READY_TO_ISSUE'],
  READY_TO_ISSUE: ['ISSUED'],
  ISSUED: [],
})

export function transitionEtaState(
  currentState: EtaState,
  requestedState: EtaState,
): TransitionResult<EtaState> {
  return transitionState('ETA', etaTransitions, currentState, requestedState)
}
