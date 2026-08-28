import { parsePolicyBundle } from '../schema'
import { createExpandedPolicyBundleData } from './expanded-policy-data'

export const EXPANDED_POLICY_QUALIFIED_VERSION = 'SYN-EVISA-POLICY@2.0.0' as const

export const expandedPolicyBundle = parsePolicyBundle(createExpandedPolicyBundleData())
