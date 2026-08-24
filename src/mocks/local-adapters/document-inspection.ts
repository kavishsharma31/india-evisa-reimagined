import { z } from 'zod'

import { syntheticIdSchema, type SyntheticId } from '../../domain/ids'
import type { LocalMockAdapter } from '../contracts'
import {
  createMockOutcome,
  createMockRejection,
  validateMockRequest,
  type MockAdapterResult,
} from '../result'
import {
  DOCUMENT_INSPECTION_SCENARIOS,
  type DocumentInspectionScenario,
} from '../scenarios'

const DOCUMENT_INSPECTION_SCENARIO_NAMES = [
  'DOCUMENT_PASS',
  'DOCUMENT_TECHNICAL_DEFECT',
  'DOCUMENT_REVIEW_REQUIRED',
  'DOCUMENT_UNAVAILABLE',
] as const satisfies readonly DocumentInspectionScenario[]

const DOCUMENT_FIXTURE_IDS = [
  'SYN-FIXTURE-PORTRAIT-VALID-001',
  'SYN-FIXTURE-PASSPORT-VALID-001',
  'SYN-FIXTURE-HOSPITAL-LETTER-V1-001',
  'SYN-FIXTURE-HOSPITAL-LETTER-V2-001',
  'SYN-FIXTURE-PASSPORT-UNCLEAR-001',
  'SYN-FIXTURE-PASSPORT-REVIEW-001',
  'SYN-FIXTURE-DOCUMENT-UNAVAILABLE-001',
] as const

const DOCUMENT_TYPES = [
  'SYNTHETIC_PORTRAIT',
  'SYNTHETIC_PASSPORT_PAGE',
  'SYNTHETIC_HOSPITAL_LETTER',
] as const

type DocumentFixtureId = (typeof DOCUMENT_FIXTURE_IDS)[number]
type DocumentType = (typeof DOCUMENT_TYPES)[number]

const documentRequestSchema = z
  .object({
    requestReference: syntheticIdSchema,
    correlationId: syntheticIdSchema,
    caseId: syntheticIdSchema,
    fixtureId: z.enum(DOCUMENT_FIXTURE_IDS),
    expectedDocumentType: z.enum(DOCUMENT_TYPES),
    scenario: z.enum(DOCUMENT_INSPECTION_SCENARIO_NAMES),
  })
  .strict()

const fixtureContracts = Object.freeze({
  'SYN-FIXTURE-PORTRAIT-VALID-001': {
    documentType: 'SYNTHETIC_PORTRAIT',
    scenario: 'DOCUMENT_PASS',
  },
  'SYN-FIXTURE-PASSPORT-VALID-001': {
    documentType: 'SYNTHETIC_PASSPORT_PAGE',
    scenario: 'DOCUMENT_PASS',
  },
  'SYN-FIXTURE-HOSPITAL-LETTER-V1-001': {
    documentType: 'SYNTHETIC_HOSPITAL_LETTER',
    scenario: 'DOCUMENT_PASS',
  },
  'SYN-FIXTURE-HOSPITAL-LETTER-V2-001': {
    documentType: 'SYNTHETIC_HOSPITAL_LETTER',
    scenario: 'DOCUMENT_PASS',
  },
  'SYN-FIXTURE-PASSPORT-UNCLEAR-001': {
    documentType: 'SYNTHETIC_PASSPORT_PAGE',
    scenario: 'DOCUMENT_TECHNICAL_DEFECT',
  },
  'SYN-FIXTURE-PASSPORT-REVIEW-001': {
    documentType: 'SYNTHETIC_PASSPORT_PAGE',
    scenario: 'DOCUMENT_REVIEW_REQUIRED',
  },
  'SYN-FIXTURE-DOCUMENT-UNAVAILABLE-001': {
    documentType: 'SYNTHETIC_PASSPORT_PAGE',
    scenario: 'DOCUMENT_UNAVAILABLE',
  },
} as const satisfies Readonly<
  Record<DocumentFixtureId, { documentType: DocumentType; scenario: DocumentInspectionScenario }>
>)

type DocumentInspectionOutcome =
  (typeof DOCUMENT_INSPECTION_SCENARIOS)[keyof typeof DOCUMENT_INSPECTION_SCENARIOS]['outcome']
type DocumentInspectionEvidence = Readonly<{
  caseId: SyntheticId
  fixtureId: DocumentFixtureId
  documentType: DocumentType
  inspectedFixtureMetadataOnly: true
  reviewerDecisionMade: false
}>

export type DocumentInspectionAdapterResult = MockAdapterResult<
  DocumentInspectionOutcome,
  DocumentInspectionEvidence
>
export type LocalDocumentInspectionAdapter = LocalMockAdapter<DocumentInspectionAdapterResult>

export function createLocalDocumentInspectionAdapter(): LocalDocumentInspectionAdapter {
  function execute(candidate: unknown): DocumentInspectionAdapterResult {
    const validated = validateMockRequest({
      adapter: 'DOCUMENT_INSPECTION',
      schema: documentRequestSchema,
      candidate,
      supportedScenarios: DOCUMENT_INSPECTION_SCENARIO_NAMES,
    })
    if (!validated.success) {
      return validated.result
    }

    const request = validated.data
    const fixture = fixtureContracts[request.fixtureId]
    if (
      fixture.documentType !== request.expectedDocumentType ||
      fixture.scenario !== request.scenario
    ) {
      return createMockRejection({
        adapter: 'DOCUMENT_INSPECTION',
        rejectionKind: 'UNSUPPORTED_COMBINATION',
        reasonCode: 'MOCK_DOCUMENT_FIXTURE_MISMATCH',
        requestReference: request.requestReference,
        correlationId: request.correlationId,
        issueCount: 1,
      })
    }

    const configured = DOCUMENT_INSPECTION_SCENARIOS[request.scenario]
    return createMockOutcome({
      adapter: 'DOCUMENT_INSPECTION',
      requestReference: request.requestReference,
      correlationId: request.correlationId,
      outcome: configured.outcome,
      classification: configured.classification,
      reasonCode: configured.reasonCode,
      metadata: {
        caseId: request.caseId,
        fixtureId: request.fixtureId,
        documentType: request.expectedDocumentType,
        inspectedFixtureMetadataOnly: true,
        reviewerDecisionMade: false,
      },
    })
  }

  return Object.freeze({ execute })
}
