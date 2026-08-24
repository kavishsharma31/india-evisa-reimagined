import { createLocalApisAdapter, type LocalApisAdapter } from './apis'
import { createLocalBiometricAdapter, type LocalBiometricAdapter } from './biometrics'
import { createLocalBorderAdapter, type LocalBorderAdapter } from './border'
import { createLocalClearanceAdapter, type LocalClearanceAdapter } from './clearance'
import {
  createLocalDocumentInspectionAdapter,
  type LocalDocumentInspectionAdapter,
} from './document-inspection'
import { createLocalIvfrtLedgerAdapter, type LocalIvfrtLedgerAdapter } from './ivfrt-ledger'
import { createLocalNotificationAdapter, type LocalNotificationAdapter } from './notification'
import { createLocalPaymentAdapter, type LocalPaymentAdapter } from './payment'

export type LocalMockAdapters = Readonly<{
  payment: LocalPaymentAdapter
  documentInspection: LocalDocumentInspectionAdapter
  notification: LocalNotificationAdapter
  clearance: LocalClearanceAdapter
  apis: LocalApisAdapter
  biometrics: LocalBiometricAdapter
  border: LocalBorderAdapter
  ivfrtLedger: LocalIvfrtLedgerAdapter
}>

export function createLocalMockAdapters(): LocalMockAdapters {
  return Object.freeze({
    payment: createLocalPaymentAdapter(),
    documentInspection: createLocalDocumentInspectionAdapter(),
    notification: createLocalNotificationAdapter(),
    clearance: createLocalClearanceAdapter(),
    apis: createLocalApisAdapter(),
    biometrics: createLocalBiometricAdapter(),
    border: createLocalBorderAdapter(),
    ivfrtLedger: createLocalIvfrtLedgerAdapter(),
  })
}

export { createLocalApisAdapter, type ApisAdapterResult, type LocalApisAdapter } from './apis'
export {
  createLocalBiometricAdapter,
  type BiometricAdapterResult,
  type LocalBiometricAdapter,
} from './biometrics'
export {
  createLocalBorderAdapter,
  type BorderAdapterResult,
  type LocalBorderAdapter,
} from './border'
export {
  createLocalClearanceAdapter,
  type ClearanceAdapterResult,
  type LocalClearanceAdapter,
} from './clearance'
export {
  createLocalDocumentInspectionAdapter,
  type DocumentInspectionAdapterResult,
  type LocalDocumentInspectionAdapter,
} from './document-inspection'
export {
  createLocalIvfrtLedgerAdapter,
  type IvfrtLedgerAdapterResult,
  type LocalIvfrtLedgerAdapter,
} from './ivfrt-ledger'
export {
  createLocalNotificationAdapter,
  type LocalNotificationAdapter,
  type NotificationAdapterResult,
} from './notification'
export {
  createLocalPaymentAdapter,
  type LocalPaymentAdapter,
  type PaymentAdapterResult,
} from './payment'
