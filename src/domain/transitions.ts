export type LifecycleDomain = 'APPLICATION' | 'DOCUMENT' | 'PAYMENT' | 'SCRUTINY' | 'ETA'

export type TransitionTable<State extends string> = Readonly<{
  [CurrentState in State]: readonly State[]
}>

export type TransitionAccepted<State extends string> = Readonly<{
  accepted: true
  domain: LifecycleDomain
  previousState: State
  nextState: State
}>

export type TransitionRejected<State extends string> = Readonly<{
  accepted: false
  domain: LifecycleDomain
  currentState: State
  requestedState: State
  reasonCode: 'INVALID_LIFECYCLE_TRANSITION'
  allowedNextStates: readonly State[]
}>

export type TransitionResult<State extends string> =
  | TransitionAccepted<State>
  | TransitionRejected<State>

export function freezeTransitionTable<State extends string>(
  table: TransitionTable<State>,
): TransitionTable<State> {
  for (const nextStates of Object.values(table)) {
    Object.freeze(nextStates)
  }

  return Object.freeze(table)
}

export function transitionState<State extends string>(
  domain: LifecycleDomain,
  table: TransitionTable<State>,
  currentState: State,
  requestedState: State,
): TransitionResult<State> {
  const allowedNextStates = table[currentState]

  if (allowedNextStates.includes(requestedState)) {
    return Object.freeze({
      accepted: true,
      domain,
      previousState: currentState,
      nextState: requestedState,
    })
  }

  return Object.freeze({
    accepted: false,
    domain,
    currentState,
    requestedState,
    reasonCode: 'INVALID_LIFECYCLE_TRANSITION',
    allowedNextStates,
  })
}
