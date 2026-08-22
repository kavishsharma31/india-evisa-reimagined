import { describe, expect, it } from 'vitest'

import {
  COMMAND_TYPES,
  DOMAIN_EVENT_TYPES,
  transitionApplicationState,
  transitionDocumentVersionState,
  transitionEtaState,
  transitionPaymentState,
  transitionScrutinyState,
  type TransitionResult,
} from './index'

function acceptedNextState<State extends string>(result: TransitionResult<State>): State {
  expect(result.accepted).toBe(true)
  if (!result.accepted) {
    throw new Error(`Expected ${result.domain} transition to be accepted.`)
  }

  return result.nextState
}

function expectRejected<State extends string>(result: TransitionResult<State>): void {
  expect(result.accepted).toBe(false)
  if (result.accepted) {
    throw new Error(`Expected ${result.domain} transition to be rejected.`)
  }

  expect(result.reasonCode).toBe('INVALID_LIFECYCLE_TRANSITION')
  expect(result.currentState).not.toBe(result.requestedState)
}

describe('application lifecycle', () => {
  it('progresses through every guarded state to LOCKED', () => {
    let state = acceptedNextState(transitionApplicationState('DRAFT_CREATED', 'IN_PROGRESS'))
    state = acceptedNextState(transitionApplicationState(state, 'READY_FOR_REVIEW'))
    state = acceptedNextState(transitionApplicationState(state, 'READY_TO_SUBMIT'))
    state = acceptedNextState(transitionApplicationState(state, 'SUBMITTED'))
    state = acceptedNextState(transitionApplicationState(state, 'LOCKED'))

    expect(state).toBe('LOCKED')
  })

  it('rejects skipped and backward application transitions without changing current state', () => {
    const skipped = transitionApplicationState('IN_PROGRESS', 'SUBMITTED')
    const backward = transitionApplicationState('SUBMITTED', 'IN_PROGRESS')

    expectRejected(skipped)
    expectRejected(backward)
    expect(skipped).toMatchObject({ currentState: 'IN_PROGRESS' })
    expect(backward).toMatchObject({ currentState: 'SUBMITTED' })
  })
})

describe('document-version lifecycle', () => {
  it('accepts deterministic preflight success and failure paths', () => {
    expect(acceptedNextState(transitionDocumentVersionState('CREATED', 'PREFLIGHT_PASSED'))).toBe(
      'PREFLIGHT_PASSED',
    )
    expect(acceptedNextState(transitionDocumentVersionState('CREATED', 'PREFLIGHT_FAILED'))).toBe(
      'PREFLIGHT_FAILED',
    )
  })

  it('preserves the V1 re-upload path while a corrected V2 is submitted and V1 is superseded', () => {
    let versionOne = acceptedNextState(
      transitionDocumentVersionState('CREATED', 'PREFLIGHT_PASSED'),
    )
    versionOne = acceptedNextState(transitionDocumentVersionState(versionOne, 'SUBMITTED'))
    versionOne = acceptedNextState(transitionDocumentVersionState(versionOne, 'UNDER_REVIEW'))
    versionOne = acceptedNextState(
      transitionDocumentVersionState(versionOne, 'REUPLOAD_REQUESTED'),
    )

    let versionTwo = acceptedNextState(
      transitionDocumentVersionState('CREATED', 'PREFLIGHT_PASSED'),
    )
    versionTwo = acceptedNextState(transitionDocumentVersionState(versionTwo, 'SUBMITTED'))
    versionOne = acceptedNextState(transitionDocumentVersionState(versionOne, 'SUPERSEDED'))

    expect(versionOne).toBe('SUPERSEDED')
    expect(versionTwo).toBe('SUBMITTED')
  })

  it('rejects submission before preflight', () => {
    const result = transitionDocumentVersionState('CREATED', 'SUBMITTED')

    expectRejected(result)
    expect(result).toMatchObject({ currentState: 'CREATED' })
  })
})

describe('mock-payment lifecycle', () => {
  it('requires pending reconciliation before the canonical confirmation path', () => {
    let state = acceptedNextState(transitionPaymentState('NOT_STARTED', 'INITIATED'))
    state = acceptedNextState(transitionPaymentState(state, 'PENDING'))
    state = acceptedNextState(transitionPaymentState(state, 'RECONCILIATION_REQUIRED'))
    state = acceptedNextState(transitionPaymentState(state, 'CONFIRMED'))

    expect(state).toBe('CONFIRMED')
  })

  it('rejects a duplicate or new payment progression while pending', () => {
    const duplicateProgression = transitionPaymentState('PENDING', 'INITIATED')

    expectRejected(duplicateProgression)
    expect(duplicateProgression).toMatchObject({ currentState: 'PENDING' })
  })
})

describe('synthetic scrutiny lifecycle', () => {
  it('supports action-required correction, resubmission and resumed review', () => {
    let state = acceptedNextState(transitionScrutinyState('NOT_STARTED', 'QUEUED'))
    state = acceptedNextState(transitionScrutinyState(state, 'IN_REVIEW'))
    state = acceptedNextState(transitionScrutinyState(state, 'ACTION_REQUIRED'))
    state = acceptedNextState(transitionScrutinyState(state, 'RESUBMITTED'))
    state = acceptedNextState(transitionScrutinyState(state, 'IN_REVIEW'))
    state = acceptedNextState(transitionScrutinyState(state, 'APPROVED'))

    expect(state).toBe('APPROVED')
  })

  it('permits approval only from IN_REVIEW and rejects it from ACTION_REQUIRED', () => {
    expect(acceptedNextState(transitionScrutinyState('IN_REVIEW', 'APPROVED'))).toBe('APPROVED')
    expectRejected(transitionScrutinyState('ACTION_REQUIRED', 'APPROVED'))
  })
})

describe('synthetic ETA lifecycle', () => {
  it('rejects premature issue and accepts ready-to-issue progression', () => {
    expectRejected(transitionEtaState('NOT_READY', 'ISSUED'))

    let state = acceptedNextState(transitionEtaState('NOT_READY', 'READY_TO_ISSUE'))
    state = acceptedNextState(transitionEtaState(state, 'ISSUED'))

    expect(state).toBe('ISSUED')
  })
})

describe('command and event contracts', () => {
  it('exposes stable command and event names without a stateful processor', () => {
    expect(COMMAND_TYPES).toContain('SaveSnapshot')
    expect(COMMAND_TYPES).toContain('RequestReupload')
    expect(COMMAND_TYPES).toContain('ReconcileConfirmed')
    expect(COMMAND_TYPES).toContain('IssueSyntheticETA')
    expect(DOMAIN_EVENT_TYPES).toContain('DraftSnapshotSaved')
    expect(DOMAIN_EVENT_TYPES).toContain('DocumentVersionSuperseded')
    expect(DOMAIN_EVENT_TYPES).toContain('PaymentReconciledConfirmed')
    expect(DOMAIN_EVENT_TYPES).toContain('SyntheticETAIssued')
  })
})
