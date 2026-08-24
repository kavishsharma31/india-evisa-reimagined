import { deepFreeze } from '../policy/schema'

export const CONTROLLED_MOCK_TIMESTAMP = '2099-03-01T10:00:00Z' as const

export const PAYMENT_SCENARIOS = deepFreeze({
  PAYMENT_IMMEDIATE_CONFIRMATION: {
    outcome: 'CONFIRMED',
    classification: 'SUCCESS',
    reasonCode: 'MOCK_PAYMENT_CONFIRMED',
  },
  PAYMENT_DECLINED: {
    outcome: 'DECLINED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_PAYMENT_DECLINED',
  },
  PAYMENT_PENDING: {
    outcome: 'PENDING',
    classification: 'SUCCESS',
    reasonCode: 'MOCK_PAYMENT_PENDING',
  },
  PAYMENT_AMBIGUOUS_RECONCILIATION: {
    outcome: 'RECONCILIATION_REQUIRED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_PAYMENT_RECONCILIATION_REQUIRED',
  },
  PAYMENT_RECONCILIATION_CONFIRMED: {
    outcome: 'RECONCILIATION_CONFIRMED',
    classification: 'SUCCESS',
    reasonCode: 'MOCK_PAYMENT_RECONCILED_CONFIRMED',
  },
  PAYMENT_RECONCILIATION_NOT_CONFIRMED: {
    outcome: 'RECONCILIATION_NOT_CONFIRMED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_PAYMENT_RECONCILIATION_NOT_CONFIRMED',
  },
  PAYMENT_REFUND_PENDING: {
    outcome: 'REFUND_PENDING',
    classification: 'SUCCESS',
    reasonCode: 'MOCK_PAYMENT_REFUND_PENDING',
  },
  PAYMENT_REFUNDED: {
    outcome: 'REFUNDED',
    classification: 'SUCCESS',
    reasonCode: 'MOCK_PAYMENT_REFUNDED',
  },
} as const)

export const DOCUMENT_INSPECTION_SCENARIOS = deepFreeze({
  DOCUMENT_PASS: {
    outcome: 'PREFLIGHT_PASSED',
    classification: 'SUCCESS',
    reasonCode: 'MOCK_DOCUMENT_PREFLIGHT_PASSED',
  },
  DOCUMENT_TECHNICAL_DEFECT: {
    outcome: 'PREFLIGHT_FAILED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'DOC_PREFLIGHT_UNCLEAR_SYNTHETIC',
  },
  DOCUMENT_REVIEW_REQUIRED: {
    outcome: 'SYNTHETIC_REVIEW_REQUIRED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_DOCUMENT_REVIEW_REQUIRED',
  },
  DOCUMENT_UNAVAILABLE: {
    outcome: 'UNAVAILABLE',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_DOCUMENT_INSPECTION_UNAVAILABLE',
  },
} as const)

export const NOTIFICATION_SCENARIOS = deepFreeze({
  NOTIFICATION_QUEUED: {
    outcome: 'QUEUED',
    classification: 'SUCCESS',
    reasonCode: 'MOCK_NOTIFICATION_QUEUED',
  },
  NOTIFICATION_DELIVERED: {
    outcome: 'DELIVERED_SIMULATED',
    classification: 'SUCCESS',
    reasonCode: 'MOCK_NOTIFICATION_DELIVERED',
  },
  NOTIFICATION_DELIVERY_FAILED: {
    outcome: 'DELIVERY_SIMULATION_FAILED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_NOTIFICATION_DELIVERY_FAILED',
  },
  NOTIFICATION_RETRY_QUEUED: {
    outcome: 'RETRY_QUEUED',
    classification: 'SUCCESS',
    reasonCode: 'MOCK_NOTIFICATION_RETRY_QUEUED',
  },
  NOTIFICATION_RETRY_DELIVERED: {
    outcome: 'RETRY_DELIVERED_SIMULATED',
    classification: 'SUCCESS',
    reasonCode: 'MOCK_NOTIFICATION_RETRY_DELIVERED',
  },
} as const)

export const CLEARANCE_SCENARIOS = deepFreeze({
  CLEARANCE_APPROVED: {
    outcome: 'APPROVED_SIMULATED',
    classification: 'SUCCESS',
    reasonCode: 'MOCK_CLEARANCE_APPROVED',
  },
  CLEARANCE_PENDING: {
    outcome: 'PENDING_SIMULATED',
    classification: 'SUCCESS',
    reasonCode: 'MOCK_CLEARANCE_PENDING',
  },
  CLEARANCE_REJECTED: {
    outcome: 'REJECTED_SIMULATED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_CLEARANCE_REJECTED',
  },
  CLEARANCE_MORE_INFORMATION: {
    outcome: 'MORE_INFORMATION_SIMULATED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_CLEARANCE_MORE_INFORMATION',
  },
  CLEARANCE_UNAVAILABLE: {
    outcome: 'UNAVAILABLE_SIMULATED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_CLEARANCE_UNAVAILABLE',
  },
} as const)

export const APIS_SCENARIOS = deepFreeze({
  APIS_MATCHED: {
    outcome: 'MATCHED_SIMULATED',
    classification: 'SUCCESS',
    reasonCode: 'MOCK_APIS_MATCHED',
  },
  APIS_UNMATCHED: {
    outcome: 'UNMATCHED_SIMULATED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_APIS_UNMATCHED',
  },
  APIS_DELAYED: {
    outcome: 'DELAYED_SIMULATED',
    classification: 'SUCCESS',
    reasonCode: 'MOCK_APIS_DELAYED',
  },
  APIS_DUPLICATE: {
    outcome: 'DUPLICATE_SIMULATED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_APIS_DUPLICATE',
  },
  APIS_UNAVAILABLE: {
    outcome: 'UNAVAILABLE_SIMULATED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_APIS_UNAVAILABLE',
  },
} as const)

export const BIOMETRIC_SCENARIOS = deepFreeze({
  BIOMETRIC_MATCH: {
    outcome: 'MATCH_SIMULATED',
    classification: 'SUCCESS',
    reasonCode: 'MOCK_BIOMETRIC_MATCH',
  },
  BIOMETRIC_MISMATCH: {
    outcome: 'MISMATCH_SIMULATED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_BIOMETRIC_MISMATCH',
  },
  BIOMETRIC_QUALITY_FAILURE: {
    outcome: 'QUALITY_FAILURE_SIMULATED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_BIOMETRIC_QUALITY_FAILURE',
  },
  BIOMETRIC_UNAVAILABLE: {
    outcome: 'UNAVAILABLE_SIMULATED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_BIOMETRIC_UNAVAILABLE',
  },
  BIOMETRIC_MANUAL_REFERRAL: {
    outcome: 'MANUAL_REFERRAL_SIMULATED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_BIOMETRIC_MANUAL_REFERRAL',
  },
} as const)

export const BORDER_SCENARIOS = deepFreeze({
  BORDER_ADMITTED: {
    outcome: 'ADMITTED_SIMULATED',
    classification: 'SUCCESS',
    reasonCode: 'MOCK_BORDER_ADMITTED',
  },
  BORDER_DENIED: {
    outcome: 'DENIED_SIMULATED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_BORDER_DENIED',
  },
  BORDER_REFERRED: {
    outcome: 'REFERRED_SIMULATED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_BORDER_REFERRED',
  },
  BORDER_PENDING: {
    outcome: 'PENDING_SIMULATED',
    classification: 'SUCCESS',
    reasonCode: 'MOCK_BORDER_PENDING',
  },
  BORDER_UNAVAILABLE: {
    outcome: 'UNAVAILABLE_SIMULATED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_BORDER_UNAVAILABLE',
  },
} as const)

export const IVFRT_LEDGER_SCENARIOS = deepFreeze({
  IVFRT_RECORDED: {
    outcome: 'RECORDED_SIMULATED',
    classification: 'SUCCESS',
    reasonCode: 'MOCK_IVFRT_RECORDED',
  },
  IVFRT_DUPLICATE: {
    outcome: 'DUPLICATE_SIMULATED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_IVFRT_DUPLICATE',
  },
  IVFRT_ORDERING_CONFLICT: {
    outcome: 'ORDERING_CONFLICT_SIMULATED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_IVFRT_ORDERING_CONFLICT',
  },
  IVFRT_REJECTED: {
    outcome: 'REJECTED_SIMULATED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_IVFRT_REJECTED',
  },
  IVFRT_UNAVAILABLE: {
    outcome: 'UNAVAILABLE_SIMULATED',
    classification: 'CONTROLLED_FAILURE',
    reasonCode: 'MOCK_IVFRT_UNAVAILABLE',
  },
} as const)

export type PaymentScenario = keyof typeof PAYMENT_SCENARIOS
export type DocumentInspectionScenario = keyof typeof DOCUMENT_INSPECTION_SCENARIOS
export type NotificationScenario = keyof typeof NOTIFICATION_SCENARIOS
export type ClearanceScenario = keyof typeof CLEARANCE_SCENARIOS
export type ApisScenario = keyof typeof APIS_SCENARIOS
export type BiometricScenario = keyof typeof BIOMETRIC_SCENARIOS
export type BorderScenario = keyof typeof BORDER_SCENARIOS
export type IvfrtLedgerScenario = keyof typeof IVFRT_LEDGER_SCENARIOS
