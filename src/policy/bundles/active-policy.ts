import { parsePolicyBundle } from '../schema'
import { createExpandedPolicyBundleData } from './expanded-policy-data'

export const ACTIVE_POLICY_QUALIFIED_VERSION = 'SYN-EVISA-POLICY@2.0.0' as const

export const activePolicyBundle = parsePolicyBundle(createExpandedPolicyBundleData())
