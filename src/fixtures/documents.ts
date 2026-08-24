import { deepFreeze } from '../policy/schema'
import {
  documentFixtureSchema,
  type DocumentFixture,
} from './schema'

function parseDocumentFixture(input: unknown): DocumentFixture {
  return deepFreeze(documentFixtureSchema.parse(input))
}

const commonFixtureMetadata = {
  syntheticOnly: true,
  watermark: 'SYNTHETIC — NOT VALID',
  sourceLicense: 'PROJECT_CREATED_NO_EXTERNAL_SOURCE',
  reviewStatus: 'APPROVED_FOR_SYNTHETIC_P0',
  responsibleRole: 'PROJECT_FIXTURE_MAINTAINER',
  integrityScope: 'FIXTURE_ID_AND_VERSION',
  provenanceNote:
    'Project-created synthetic metadata fixture; no document body or real source material.',
} as const

export const validPortraitFixture = parseDocumentFixture({
  ...commonFixtureMetadata,
  fixtureId: 'SYN-FIXTURE-PORTRAIT-VALID-001',
  documentType: 'SYNTHETIC_PORTRAIT',
  requirementId: 'REQ-PORTRAIT-1',
  fixtureCategory: 'SYNTHETIC_PORTRAIT_FIXTURE',
  label: 'Synthetic portrait — valid demo metadata',
  expectedInspectionScenario: 'DOCUMENT_PASS',
  expectedInspectionReasonCode: 'MOCK_DOCUMENT_PREFLIGHT_PASSED',
  fixtureVersion: '1.0.0',
  integrityHash: 'sha256:a1262c781166503e95c2dfaeb869625ad7cd228c9af74c6fdb7d76ad8bbbf286',
})

export const validPassportPageFixture = parseDocumentFixture({
  ...commonFixtureMetadata,
  fixtureId: 'SYN-FIXTURE-PASSPORT-VALID-001',
  documentType: 'SYNTHETIC_PASSPORT_PAGE',
  requirementId: 'REQ-PASSPORT-PAGE-1',
  fixtureCategory: 'SYNTHETIC_PASSPORT_PAGE_FIXTURE',
  label: 'Synthetic passport page — valid demo metadata',
  expectedInspectionScenario: 'DOCUMENT_PASS',
  expectedInspectionReasonCode: 'MOCK_DOCUMENT_PREFLIGHT_PASSED',
  fixtureVersion: '1.0.0',
  integrityHash: 'sha256:ab16dd87697effbe2df75bf4be291df22769fe2f67a5980b1d2602638d823b53',
})

export const unclearPassportPageFixture = parseDocumentFixture({
  ...commonFixtureMetadata,
  fixtureId: 'SYN-FIXTURE-PASSPORT-UNCLEAR-001',
  documentType: 'SYNTHETIC_PASSPORT_PAGE',
  requirementId: 'REQ-PASSPORT-PAGE-1',
  fixtureCategory: 'SYNTHETIC_PASSPORT_PAGE_FIXTURE',
  label: 'Synthetic passport page — controlled technical defect',
  expectedInspectionScenario: 'DOCUMENT_TECHNICAL_DEFECT',
  expectedInspectionReasonCode: 'DOC_PREFLIGHT_UNCLEAR_SYNTHETIC',
  fixtureVersion: '1.0.0',
  integrityHash: 'sha256:c775093be9655fbfaeed4ebf854ef2ca1303c47e1b3c79f4107470806540b26c',
})

export const hospitalLetterV1Fixture = parseDocumentFixture({
  ...commonFixtureMetadata,
  fixtureId: 'SYN-FIXTURE-HOSPITAL-LETTER-V1-001',
  documentType: 'SYNTHETIC_HOSPITAL_LETTER',
  requirementId: 'REQ-HOSPITAL-LETTER-1',
  fixtureCategory: 'SYNTHETIC_HOSPITAL_LETTER_FIXTURE',
  label: 'Synthetic hospital letter V1 — technical preflight passes',
  expectedInspectionScenario: 'DOCUMENT_PASS',
  expectedInspectionReasonCode: 'MOCK_DOCUMENT_PREFLIGHT_PASSED',
  scrutinyOutcomeCode: 'DOC_HOSPITAL_ADMISSION_DATE_UNCLEAR_SYNTHETIC',
  fixtureVersion: '1.0.0',
  integrityHash: 'sha256:218223cc4fb45ba269aa8e7cd6b1dd466863a518dd1f13d6a57e363a12daafe4',
})

export const hospitalLetterV2Fixture = parseDocumentFixture({
  ...commonFixtureMetadata,
  fixtureId: 'SYN-FIXTURE-HOSPITAL-LETTER-V2-001',
  documentType: 'SYNTHETIC_HOSPITAL_LETTER',
  requirementId: 'REQ-HOSPITAL-LETTER-1',
  fixtureCategory: 'SYNTHETIC_HOSPITAL_LETTER_FIXTURE',
  label: 'Synthetic hospital letter V2 — corrected replacement metadata',
  expectedInspectionScenario: 'DOCUMENT_PASS',
  expectedInspectionReasonCode: 'MOCK_DOCUMENT_PREFLIGHT_PASSED',
  fixtureVersion: '1.1.0',
  replacesFixtureId: 'SYN-FIXTURE-HOSPITAL-LETTER-V1-001',
  integrityHash: 'sha256:0b662e31f1a9e5112157afea025b132aa2bcc68fa152dd2d6b09bedb7e7ec0ea',
})

export const canonicalDocumentFixtures = deepFreeze([
  validPortraitFixture,
  validPassportPageFixture,
  unclearPassportPageFixture,
  hospitalLetterV1Fixture,
  hospitalLetterV2Fixture,
])
