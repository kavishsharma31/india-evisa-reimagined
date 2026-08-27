import type { ProvenanceId } from '../domain/ids'
import type { z } from 'zod'

import type { documentManifestSchema, questionManifestSchema } from './schema'

type QuestionManifestInput = z.input<typeof questionManifestSchema>
type DocumentManifestInput = z.input<typeof documentManifestSchema>
type DocumentRequirementInput = DocumentManifestInput['requirements'][number]

function createSharedQuestions(): QuestionManifestInput['questions'] {
  return [
    {
      id: 'Q-SHARED-POLICY-COHORT',
      scope: 'SHARED',
      prompt: 'Choose the synthetic policy cohort.',
      control: 'SINGLE_SELECT',
      allowedValues: ['SYN-POLICY-COHORT-A'],
      required: true,
      reasonCode: 'R-SYN-SCENARIO-SUPPORTED',
      policySourceId: 'PROV-SYN-FROZEN-P0',
    },
    {
      id: 'Q-SHARED-PASSPORT-CLASS',
      scope: 'SHARED',
      prompt: 'Choose the synthetic passport class.',
      control: 'SINGLE_SELECT',
      allowedValues: ['SYNTHETIC_STANDARD_PASSPORT'],
      required: true,
      reasonCode: 'R-SYN-SCENARIO-SUPPORTED',
      policySourceId: 'PROV-SYN-FROZEN-P0',
    },
    {
      id: 'Q-SHARED-ARRIVAL-DATE',
      scope: 'SHARED',
      prompt: 'Choose the fictional planned arrival date.',
      control: 'SYNTHETIC_DATE',
      allowedValues: ['2099-04-14', '2099-05-10'],
      required: true,
      reasonCode: 'R-SYN-SCENARIO-SUPPORTED',
      policySourceId: 'PROV-SYN-FROZEN-P0',
    },
  ]
}

export function createQuestionManifests(): readonly QuestionManifestInput[] {
  return [
    {
      id: 'QM-MEDICAL-1',
      questions: [
        ...createSharedQuestions(),
        {
          id: 'Q-MEDICAL-TREATMENT-INTENT',
          scope: 'MEDICAL',
          prompt: 'Confirm the synthetic Medical treatment intent.',
          control: 'SINGLE_SELECT',
          allowedValues: ['SYNTHETIC_MEDICAL_TREATMENT'],
          required: true,
          reasonCode: 'R-SYN-MEDICAL-INTENT',
          policySourceId: 'PROV-SYN-P1-MEDICAL',
        },
        {
          id: 'Q-MEDICAL-ADMISSION-DATE',
          scope: 'MEDICAL',
          prompt: 'Choose the fictional proposed admission date.',
          control: 'SYNTHETIC_DATE',
          allowedValues: ['2099-04-18'],
          required: true,
          reasonCode: 'R-SYN-MEDICAL-INTENT',
          policySourceId: 'PROV-SYN-P1-MEDICAL',
        },
        {
          id: 'Q-MEDICAL-ATTENDANT-GUIDANCE',
          scope: 'MEDICAL',
          prompt: 'Show synthetic attendant guidance?',
          control: 'BOOLEAN_CHOICE',
          allowedValues: ['YES_SYNTHETIC', 'NO_SYNTHETIC'],
          required: true,
          reasonCode: 'R-SYN-ATTENDANT-ONLY',
          policySourceId: 'PROV-SYN-P1-MEDICAL',
        },
      ],
    },
    {
      id: 'QM-TOURIST-1',
      questions: [
        ...createSharedQuestions(),
        {
          id: 'Q-TOURIST-LEISURE-INTENT',
          scope: 'TOURIST',
          prompt: 'Confirm the synthetic tourism intent.',
          control: 'SINGLE_SELECT',
          allowedValues: ['SYNTHETIC_TOURISM'],
          required: true,
          reasonCode: 'R-SYN-TOURIST-INTENT',
          policySourceId: 'PROV-SYN-P1-TOURIST',
        },
        {
          id: 'Q-TOURIST-EXIT-DATE',
          scope: 'TOURIST',
          prompt: 'Choose the fictional planned exit date.',
          control: 'SYNTHETIC_DATE',
          allowedValues: ['2099-05-17'],
          required: true,
          reasonCode: 'R-SYN-TOURIST-INTENT',
          policySourceId: 'PROV-SYN-P1-TOURIST',
        },
      ],
    },
  ]
}

const expandedQuestionDefinitions = [
  ['BUSINESS', 'QM-BUSINESS-1', [
    ['Q-BUSINESS-ACTIVITY', 'Choose the representative business activity.', 'SYNTHETIC_ORDINARY_BUSINESS_VISIT'],
    ['Q-BUSINESS-INDIAN-ORGANISATION', 'Choose the fictional Indian organisation.', 'SYNTHETIC_INDIA_ORGANISATION'],
    ['Q-BUSINESS-ORGANISATION-CITY', 'Choose the organisation city.', 'SYNTHETIC_BENGALURU'],
    ['Q-BUSINESS-ARRIVAL-DATE', 'Choose the fictional expected arrival date.', '2099-05-10'],
    ['Q-BUSINESS-DEPARTURE-DATE', 'Choose the fictional expected departure date.', '2099-05-17'],
  ]],
  ['MEDICAL_ATTENDANT', 'QM-MEDICAL-ATTENDANT-1', [
    ['Q-MEDICAL-ATTENDANT-PATIENT-REFERENCE', 'Choose the synthetic patient application reference.', 'SYNTHETIC_PATIENT_REFERENCE_001'],
    ['Q-MEDICAL-ATTENDANT-RELATIONSHIP', 'Choose the relationship to the patient.', 'SYNTHETIC_CLOSE_RELATIVE'],
    ['Q-MEDICAL-ATTENDANT-HOSPITAL', 'Choose the fictional Indian hospital.', 'SYNTHETIC_INDIA_HOSPITAL'],
    ['Q-MEDICAL-ATTENDANT-HOSPITAL-CITY', 'Choose the hospital city.', 'SYNTHETIC_CHENNAI'],
    ['Q-MEDICAL-ATTENDANT-ARRIVAL-DATE', 'Choose the fictional expected arrival date.', '2099-04-14'],
  ]],
  ['STUDENT', 'QM-STUDENT-1', [
    ['Q-STUDENT-INSTITUTION', 'Choose the fictional institution.', 'SYNTHETIC_INDIA_INSTITUTION'],
    ['Q-STUDENT-PROGRAMME', 'Choose the representative programme or course.', 'SYNTHETIC_GENERAL_ACADEMIC_COURSE'],
    ['Q-STUDENT-COURSE-DURATION', 'Choose the fictional course duration.', 'SYNTHETIC_ONE_ACADEMIC_TERM'],
    ['Q-STUDENT-FUNDING-SOURCE', 'Choose the synthetic funding source.', 'SYNTHETIC_SELF_FUNDED'],
    ['Q-STUDENT-ARRIVAL-DATE', 'Choose the fictional expected arrival date.', '2099-05-10'],
  ]],
  ['FAMILY', 'QM-FAMILY-1', [
    ['Q-FAMILY-STUDENT-REFERENCE', 'Choose the synthetic student application reference.', 'SYNTHETIC_STUDENT_REFERENCE_001'],
    ['Q-FAMILY-RELATIONSHIP', 'Choose the relationship to the student.', 'SYNTHETIC_STUDENT_DEPENDENT'],
    ['Q-FAMILY-INSTITUTION', 'Choose the fictional student institution.', 'SYNTHETIC_INDIA_INSTITUTION'],
    ['Q-FAMILY-ARRIVAL-DATE', 'Choose the fictional expected arrival date.', '2099-05-10'],
    ['Q-FAMILY-DEPARTURE-DATE', 'Choose the fictional expected departure date.', '2099-05-17'],
  ]],
  ['TRANSIT', 'QM-TRANSIT-1', [
    ['Q-TRANSIT-ARRIVAL-PORT', 'Choose the fictional Indian arrival port.', 'SYNTHETIC_DELHI_AIRPORT'],
    ['Q-TRANSIT-ONWARD-COUNTRY', 'Choose the fictional onward destination country.', 'SYNTHETIC_ONWARD_COUNTRY'],
    ['Q-TRANSIT-DEPARTURE-DATE', 'Choose the fictional onward departure date.', '2099-05-11'],
    ['Q-TRANSIT-TICKET-REFERENCE', 'Choose the synthetic ticket reference.', 'SYNTHETIC_TICKET_REFERENCE_001'],
    ['Q-TRANSIT-DESTINATION-ENTRY-BASIS', 'Choose the destination-entry permission basis.', 'SYNTHETIC_DESTINATION_PERMISSION'],
  ]],
  ['MISCELLANEOUS', 'QM-MISCELLANEOUS-1', [
    ['Q-MISC-ENTRY-BASIS', 'Choose the representative e-Entry basis.', 'SYNTHETIC_RELATIONSHIP_BASED_ENTRY'],
    ['Q-MISC-RELATIONSHIP', 'Choose the fictional relationship.', 'SYNTHETIC_ELIGIBLE_RELATIONSHIP'],
    ['Q-MISC-RELATED-PERSON-BASIS', 'Choose the related person or status basis.', 'SYNTHETIC_INDIAN_STATUS_BASIS'],
    ['Q-MISC-ARRIVAL-DATE', 'Choose the fictional expected arrival date.', '2099-05-10'],
    ['Q-MISC-DEPARTURE-DATE', 'Choose the fictional expected departure date.', '2099-05-17'],
  ]],
] as const

export function createExpandedQuestionManifests(): readonly QuestionManifestInput[] {
  return [
    ...createQuestionManifests(),
    ...expandedQuestionDefinitions.map(([scope, id, questions]) => ({
      id,
      questions: questions.map(([questionId, prompt, value]) => ({
        id: questionId,
        scope,
        prompt,
        control: /^2099-/.test(value) ? 'SYNTHETIC_DATE' as const : 'SINGLE_SELECT' as const,
        allowedValues: [value],
        required: true,
        reasonCode: `R-SYN-${scope.replace('_', '-')}-INTENT` as const,
        policySourceId: `PROV-SYN-P2-${scope.replace('_', '-')}` as const,
      })),
    })),
  ]
}

export function createDocumentManifests(
  hospitalLetterGuidance: string,
  hospitalLetterSourceId: ProvenanceId,
): readonly DocumentManifestInput[] {
  return [
    {
      id: 'DM-MEDICAL-1',
      requirements: [
        {
          id: 'REQ-PORTRAIT-1',
          documentType: 'SYNTHETIC_PORTRAIT',
          required: true,
          reasonCode: 'R-SYN-MEDICAL-DOCUMENTS',
          acceptedFixtureCategories: ['SYNTHETIC_PORTRAIT_FIXTURE'],
          policySourceId: 'PROV-SYN-P1-MEDICAL',
          guidance: 'Use the bundled project-created synthetic portrait fixture.',
        },
        {
          id: 'REQ-PASSPORT-PAGE-1',
          documentType: 'SYNTHETIC_PASSPORT_PAGE',
          required: true,
          reasonCode: 'R-SYN-MEDICAL-DOCUMENTS',
          acceptedFixtureCategories: ['SYNTHETIC_PASSPORT_PAGE_FIXTURE'],
          policySourceId: 'PROV-SYN-P1-MEDICAL',
          guidance: 'Use the bundled project-created synthetic passport-page fixture.',
        },
        {
          id: 'REQ-HOSPITAL-LETTER-1',
          documentType: 'SYNTHETIC_HOSPITAL_LETTER',
          required: true,
          reasonCode: 'R-SYN-HOSPITAL-LETTER-REQUIRED',
          acceptedFixtureCategories: ['SYNTHETIC_HOSPITAL_LETTER_FIXTURE'],
          policySourceId: hospitalLetterSourceId,
          guidance: hospitalLetterGuidance,
        },
      ],
    },
    {
      id: 'DM-TOURIST-1',
      requirements: [
        {
          id: 'REQ-PORTRAIT-1',
          documentType: 'SYNTHETIC_PORTRAIT',
          required: true,
          reasonCode: 'R-SYN-TOURIST-DOCUMENTS',
          acceptedFixtureCategories: ['SYNTHETIC_PORTRAIT_FIXTURE'],
          policySourceId: 'PROV-SYN-P1-TOURIST',
          guidance: 'Use the bundled project-created synthetic portrait fixture.',
        },
        {
          id: 'REQ-PASSPORT-PAGE-1',
          documentType: 'SYNTHETIC_PASSPORT_PAGE',
          required: true,
          reasonCode: 'R-SYN-TOURIST-DOCUMENTS',
          acceptedFixtureCategories: ['SYNTHETIC_PASSPORT_PAGE_FIXTURE'],
          policySourceId: 'PROV-SYN-P1-TOURIST',
          guidance: 'Use the bundled project-created synthetic passport-page fixture.',
        },
      ],
    },
  ]
}

type ExpandedDocument = readonly [
  string,
  DocumentRequirementInput['documentType'],
  string,
  string,
]

const sharedDocuments: readonly ExpandedDocument[] = [
  ['REQ-PORTRAIT-1', 'SYNTHETIC_PORTRAIT', 'SYNTHETIC_PORTRAIT_FIXTURE', 'Synthetic portrait'],
  ['REQ-PASSPORT-PAGE-1', 'SYNTHETIC_PASSPORT_PAGE', 'SYNTHETIC_PASSPORT_PAGE_FIXTURE', 'Synthetic passport page'],
]

const expandedDocumentDefinitions: readonly (readonly [string, string, readonly ExpandedDocument[]])[] = [
  ['BUSINESS', 'DM-BUSINESS-1', [...sharedDocuments, ['REQ-BUSINESS-CARD-1', 'SYNTHETIC_BUSINESS_CARD', 'SYNTHETIC_BUSINESS_CARD_FIXTURE', 'Synthetic business card']]],
  ['MEDICAL_ATTENDANT', 'DM-MEDICAL-ATTENDANT-1', sharedDocuments],
  ['STUDENT', 'DM-STUDENT-1', [...sharedDocuments, ['REQ-ADMISSION-LETTER-1', 'SYNTHETIC_ADMISSION_LETTER', 'SYNTHETIC_ADMISSION_LETTER_FIXTURE', 'Synthetic admission letter'], ['REQ-FINANCIAL-SUPPORT-1', 'SYNTHETIC_FINANCIAL_SUPPORT', 'SYNTHETIC_FINANCIAL_SUPPORT_FIXTURE', 'Synthetic financial-support evidence']]],
  ['FAMILY', 'DM-FAMILY-1', sharedDocuments],
  ['TRANSIT', 'DM-TRANSIT-1', [...sharedDocuments, ['REQ-TRANSIT-TICKETS-1', 'SYNTHETIC_TRANSIT_TICKETS', 'SYNTHETIC_TRANSIT_TICKETS_FIXTURE', 'Synthetic confirmed journey tickets'], ['REQ-DESTINATION-ENTRY-1', 'SYNTHETIC_DESTINATION_ENTRY_EVIDENCE', 'SYNTHETIC_DESTINATION_ENTRY_FIXTURE', 'Synthetic destination-entry evidence']]],
  ['MISCELLANEOUS', 'DM-MISCELLANEOUS-1', [...sharedDocuments, ['REQ-RELATIONSHIP-PROOF-1', 'SYNTHETIC_RELATIONSHIP_EVIDENCE', 'SYNTHETIC_RELATIONSHIP_EVIDENCE_FIXTURE', 'Synthetic relationship or Indian-status evidence'], ['REQ-CIVIL-CERTIFICATE-1', 'SYNTHETIC_CIVIL_CERTIFICATE', 'SYNTHETIC_CIVIL_CERTIFICATE_FIXTURE', 'Synthetic birth or marriage certificate']]],
] as const

export function createExpandedDocumentManifests(): readonly DocumentManifestInput[] {
  return [
    ...createDocumentManifests(
      'Use the bundled project-created synthetic hospital-letter fixture.',
      'PROV-SYN-P1-MEDICAL',
    ),
    ...expandedDocumentDefinitions.map(([scope, id, documents]) => ({
      id,
      requirements: documents.map(([requirementId, documentType, fixtureCategory, label]) => ({
        id: requirementId,
        documentType,
        required: true,
        reasonCode: `R-SYN-${scope.replace('_', '-')}-DOCUMENTS` as const,
        acceptedFixtureCategories: [fixtureCategory],
        policySourceId: `PROV-SYN-P2-${scope.replace('_', '-')}` as const,
        guidance: `Use the bundled project-created ${label.toLowerCase()} fixture.`,
      })),
    })),
  ]
}
