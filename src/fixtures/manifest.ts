import { legacyPolicyBundle, LEGACY_POLICY_QUALIFIED_VERSION } from '../policy'
import { deepFreeze } from '../policy/schema'
import { P0_FIXTURE_VERSION, P0_STORAGE_SCHEMA_VERSION } from '../persistence'
import { canonicalApplicantFixtures } from './applicants'
import { MEDICAL_CASE_ID, TOURIST_CASE_ID } from './cases'
import { canonicalDocumentFixtures } from './documents'
import { canonicalRecoverySeeds } from './recovery-seeds'
import {
  FIXTURE_MANIFEST_TIMESTAMP,
  P0_FIXTURE_MANIFEST_VERSION,
  parseFixtureManifest,
  type FixtureManifest,
} from './schema'

const canonicalFixtureManifest = parseFixtureManifest({
  version: P0_FIXTURE_MANIFEST_VERSION,
  generatedAt: FIXTURE_MANIFEST_TIMESTAMP,
  storageSchemaVersion: P0_STORAGE_SCHEMA_VERSION,
  persistenceFixtureVersion: P0_FIXTURE_VERSION,
  activePolicy: {
    qualifiedVersion: LEGACY_POLICY_QUALIFIED_VERSION,
    digest: legacyPolicyBundle.digest,
  },
  provenance: {
    provenanceId: 'PROV-SYN-P0-FIXTURES-001',
    syntheticOnly: true,
    sourceMethod: 'PROJECT_CREATED_SYNTHETIC',
    note: 'Canonical P0 demo worlds; never production or applicant data.',
  },
  scenarioRoots: [
    {
      scenarioId: 'SYN-MEDICAL-001',
      caseId: MEDICAL_CASE_ID,
      applicantId: 'SYN-APPLICANT-MED-001',
      orientation: 'PRIMARY',
      policyQualifiedVersion: LEGACY_POLICY_QUALIFIED_VERSION,
      questionManifestId: 'QM-MEDICAL-1',
      documentManifestId: 'DM-MEDICAL-1',
      purposeFamily: 'SYNTHETIC_MEDICAL_PURPOSE',
      syntheticFee: { amount: 73, unit: 'SYNTHETIC_DEMO_CREDITS' },
    },
    {
      scenarioId: 'SYN-TOURIST-001',
      caseId: TOURIST_CASE_ID,
      applicantId: 'SYN-APPLICANT-TOURIST-001',
      orientation: 'SHARED_CONTRACT_VALIDATION',
      policyQualifiedVersion: LEGACY_POLICY_QUALIFIED_VERSION,
      questionManifestId: 'QM-TOURIST-1',
      documentManifestId: 'DM-TOURIST-1',
      purposeFamily: 'SYNTHETIC_TOURIST_PURPOSE',
      syntheticFee: { amount: 41, unit: 'SYNTHETIC_DEMO_CREDITS' },
    },
  ],
  applicants: canonicalApplicantFixtures,
  documents: canonicalDocumentFixtures,
  seeds: canonicalRecoverySeeds,
})

export function getFixtureManifest(): FixtureManifest {
  return canonicalFixtureManifest
}

export const fixtureManifest = deepFreeze(canonicalFixtureManifest)
