import { parsePolicyBundle } from '../schema'
import { createRealInputPolicyBundleData } from './real-input-policy-data'

export const ACTIVE_POLICY_QUALIFIED_VERSION = 'SYN-EVISA-POLICY@2.1.0' as const

export const activePolicyBundle = parsePolicyBundle(createRealInputPolicyBundleData())
