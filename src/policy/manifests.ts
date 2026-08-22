import type { ProvenanceId } from '../domain/ids'
import type { z } from 'zod'

import type { documentManifestSchema, questionManifestSchema } from './schema'

type QuestionManifestInput = z.input<typeof questionManifestSchema>
type DocumentManifestInput = z.input<typeof documentManifestSchema>

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
