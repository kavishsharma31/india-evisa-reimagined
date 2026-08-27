import type { z } from 'zod'

import type { provenanceDefinitionSchema, reasonDefinitionSchema } from './schema'

type ReasonDefinitionInput = z.input<typeof reasonDefinitionSchema>
type ProvenanceDefinitionInput = z.input<typeof provenanceDefinitionSchema>

export function createReasonCatalogue(): readonly ReasonDefinitionInput[] {
  return [
    {
      code: 'R-SYN-SCENARIO-SUPPORTED',
      summary: 'Scenario supported by this demonstration',
      explanation: 'The controlled scenario is supported by this synthetic demo policy only.',
      legalAdvice: false,
    },
    {
      code: 'R-SYN-MEDICAL-INTENT',
      summary: 'Synthetic Medical purpose selected',
      explanation: 'The bounded scenario facts select the synthetic Medical purpose family.',
      legalAdvice: false,
    },
    {
      code: 'R-SYN-MEDICAL-DOCUMENTS',
      summary: 'Synthetic Medical evidence set required',
      explanation: 'The Medical demo manifest requires its three bundled evidence categories.',
      legalAdvice: false,
    },
    {
      code: 'R-SYN-HOSPITAL-LETTER-REQUIRED',
      summary: 'Synthetic hospital letter required',
      explanation: 'The Medical demo manifest includes one bundled synthetic hospital-letter fixture.',
      legalAdvice: false,
    },
    {
      code: 'R-SYN-ATTENDANT-ONLY',
      summary: 'Attendant information is guidance only',
      explanation: 'This demo does not create a linked attendant case or shared decision state.',
      legalAdvice: false,
    },
    {
      code: 'R-SYN-TOURIST-INTENT',
      summary: 'Synthetic Tourist purpose selected',
      explanation: 'The bounded scenario facts select the synthetic Tourist purpose family.',
      legalAdvice: false,
    },
    {
      code: 'R-SYN-TOURIST-DOCUMENTS',
      summary: 'Synthetic Tourist evidence set required',
      explanation: 'The Tourist demo manifest reuses the shared portrait and passport-page categories.',
      legalAdvice: false,
    },
    {
      code: 'R-SYN-NO-HOSPITAL-LETTER',
      summary: 'No hospital letter in the Tourist demo',
      explanation: 'The Tourist demo manifest does not include a hospital-letter requirement.',
      legalAdvice: false,
    },
    {
      code: 'R-SYN-FEE-POLICY',
      summary: 'Synthetic fee derived from demo policy',
      explanation: 'The displayed demo-credit amount is fictional, deterministic and not payable.',
      legalAdvice: false,
    },
    {
      code: 'R-SYN-MISSING-MINIMUM-FACT',
      summary: 'More controlled information is required',
      explanation: 'A required bounded scenario fact is missing, so dependent policy effects are withheld.',
      legalAdvice: false,
    },
    {
      code: 'R-SYN-NOT-SUPPORTED',
      summary: 'Scenario is outside this demo',
      explanation: 'No versioned rule supports the supplied controlled scenario facts.',
      legalAdvice: false,
    },
    {
      code: 'R-SYN-POLICY-CONFLICT',
      summary: 'Demo policy conflict',
      explanation: 'Multiple matching rules produced incompatible effects, so the evaluator failed closed.',
      legalAdvice: false,
    },
    {
      code: 'R-SYN-INVALID-INPUT',
      summary: 'Invalid synthetic policy input',
      explanation: 'The input did not match the bounded runtime schema and was not trusted.',
      legalAdvice: false,
    },
    {
      code: 'R-SYN-DRAFT-PREVIEW-ONLY',
      summary: 'Draft policy is preview only',
      explanation: 'A draft policy bundle can be evaluated only in explicit preview mode.',
      legalAdvice: false,
    },
    {
      code: 'R-SYN-BUNDLE-NOT-EFFECTIVE',
      summary: 'Policy bundle is not effective at the controlled time',
      explanation: 'The controlled evaluation time falls outside this synthetic bundle period.',
      legalAdvice: false,
    },
  ]
}

export function createProvenanceCatalogue(): readonly ProvenanceDefinitionInput[] {
  return [
    {
      id: 'PROV-SYN-FROZEN-P0',
      sourceLabel: 'Approved frozen P0 contract',
      note: 'Synthetic demonstration scope; not current legal policy.',
    },
    {
      id: 'PROV-SYN-P1-MEDICAL',
      sourceLabel: 'Approved Medical scenario contract',
      note: 'Medical-first synthetic fixture and manifest expectations.',
    },
    {
      id: 'PROV-SYN-P1-TOURIST',
      sourceLabel: 'Approved Tourist validation contract',
      note: 'Lightweight reuse fixture through the shared evaluator.',
    },
    {
      id: 'PROV-SYN-UX-PREVIEW',
      sourceLabel: 'Approved read-only policy preview contract',
      note: 'Draft Medical hospital-letter guidance comparison only.',
    },
  ]
}

const EXPANDED_SCOPES = Object.freeze([
  ['BUSINESS', 'Business'],
  ['MEDICAL-ATTENDANT', 'Medical Attendant'],
  ['STUDENT', 'Student'],
  ['FAMILY', 'Student Dependent'],
  ['TRANSIT', 'Transit'],
  ['MISCELLANEOUS', 'Miscellaneous e-Entry'],
] as const)

export function createExpandedReasonCatalogue(): readonly ReasonDefinitionInput[] {
  return [
    ...createReasonCatalogue(),
    ...EXPANDED_SCOPES.flatMap(([codePart, label]) => [
      {
        code: `R-SYN-${codePart}-INTENT` as const,
        summary: `Synthetic ${label} purpose selected`,
        explanation: `The bounded scenario facts select the representative synthetic ${label} purpose family.`,
        legalAdvice: false as const,
      },
      {
        code: `R-SYN-${codePart}-DOCUMENTS` as const,
        summary: `Synthetic ${label} evidence set required`,
        explanation: `The representative ${label} demo manifest requires its policy-defined synthetic evidence categories.`,
        legalAdvice: false as const,
      },
    ]),
  ]
}

export function createExpandedProvenanceCatalogue(): readonly ProvenanceDefinitionInput[] {
  return [
    ...createProvenanceCatalogue(),
    ...EXPANDED_SCOPES.map(([codePart, label]) => ({
      id: `PROV-SYN-P2-${codePart}` as const,
      sourceLabel: `Approved representative ${label} demo contract`,
      note: 'Synthetic representative scope only; not a complete statement of official requirements.',
    })),
  ]
}
