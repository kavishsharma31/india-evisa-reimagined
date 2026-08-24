import { deepFreeze } from '../policy/schema'
import {
  syntheticApplicantFixtureSchema,
  type SyntheticApplicantFixture,
} from './schema'

function parseApplicant(input: unknown): SyntheticApplicantFixture {
  return deepFreeze(syntheticApplicantFixtureSchema.parse(input))
}

export const medicalApplicantFixture = parseApplicant({
  applicantId: 'SYN-APPLICANT-MED-001',
  displayName: 'Demo Medical Applicant',
  contactEmail: 'demo-applicant@example.com',
  syntheticIdentityReference: 'SYN-IDENTITY-MED-001',
  syntheticOnly: true,
  provenanceNote: 'Project-created synthetic applicant metadata; no real person.',
})

export const touristApplicantFixture = parseApplicant({
  applicantId: 'SYN-APPLICANT-TOURIST-001',
  displayName: 'Demo Tourist Applicant',
  contactEmail: 'demo-applicant@example.com',
  syntheticIdentityReference: 'SYN-IDENTITY-TOURIST-001',
  syntheticOnly: true,
  provenanceNote: 'Project-created synthetic applicant metadata; no real person.',
})

export const canonicalApplicantFixtures = deepFreeze([
  medicalApplicantFixture,
  touristApplicantFixture,
])
