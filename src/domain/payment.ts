import type { SyntheticId } from './ids'
import {
  freezeTransitionTable,
  transitionState,
  type TransitionResult,
  type TransitionTable,
} from './transitions'

export const PAYMENT_STATES = Object.freeze([
  'NOT_STARTED',
  'INITIATED',
  'PENDING',
  'RECONCILIATION_REQUIRED',
  'CONFIRMED',
] as const)

export type PaymentState = (typeof PAYMENT_STATES)[number]

export type MockPaymentAttemptContract = Readonly<{
  mockPaymentAttemptId: SyntheticId
  caseId: SyntheticId
  state: PaymentState
  amount: number
  unit: 'SYNTHETIC_DEMO_CREDITS'
  syntheticReference: SyntheticId
}>

const paymentTransitions: TransitionTable<PaymentState> = freezeTransitionTable<PaymentState>({
  NOT_STARTED: ['INITIATED'],
  INITIATED: ['PENDING', 'CONFIRMED'],
  PENDING: ['RECONCILIATION_REQUIRED', 'CONFIRMED'],
  RECONCILIATION_REQUIRED: ['CONFIRMED'],
  CONFIRMED: [],
})

export function transitionPaymentState(
  currentState: PaymentState,
  requestedState: PaymentState,
): TransitionResult<PaymentState> {
  return transitionState('PAYMENT', paymentTransitions, currentState, requestedState)
}
