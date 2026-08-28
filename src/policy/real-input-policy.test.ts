import { describe, expect, it } from 'vitest'

import {
  EVISA_ELIGIBLE_NATIONALITIES,
  NATIONALITY_NOT_LISTED,
  PASSPORT_TYPES,
} from './catalogues/applicant-options'
import {
  ACTIVE_POLICY_QUALIFIED_VERSION,
  activePolicyBundle,
  expandedPolicyBundle,
  resolvePolicyBundle,
} from './index'
import { questionDateBounds } from './question-validation'

function question(questionId: string) {
  const result = activePolicyBundle.questionManifests
    .flatMap(({ questions }) => questions)
    .find(({ id }) => id === questionId)
  if (result === undefined) {
    throw new Error(`Missing active question ${questionId}.`)
  }
  return result
}

describe('real applicant input policy', () => {
  it('publishes the complete unique official nationality/region catalogue in alphabetical order', () => {
    expect(EVISA_ELIGIBLE_NATIONALITIES).toHaveLength(173)
    expect(new Set(EVISA_ELIGIBLE_NATIONALITIES.map(({ value }) => value)).size).toBe(173)
    expect(EVISA_ELIGIBLE_NATIONALITIES.map(({ label }) => label)).toEqual(
      [...EVISA_ELIGIBLE_NATIONALITIES.map(({ label }) => label)].sort((left, right) =>
        left.localeCompare(right, 'en'),
      ),
    )
    expect(EVISA_ELIGIBLE_NATIONALITIES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Albania' }),
        expect.objectContaining({ label: 'Kenya' }),
        expect.objectContaining({ label: 'Zimbabwe' }),
      ]),
    )

    const nationalityQuestion = question('Q-SHARED-POLICY-COHORT')
    expect(nationalityQuestion.allowedValues).toHaveLength(174)
    expect(nationalityQuestion.allowedValues.at(-1)).toBe(NATIONALITY_NOT_LISTED.value)
    expect(nationalityQuestion.searchable).toBe(true)
  })

  it('publishes all five passport types and only the supported ineligibility guidance', () => {
    expect(PASSPORT_TYPES.map(({ label }) => label)).toEqual([
      'Ordinary Passport',
      'Official Passport',
      'Diplomatic Passport',
      'Service Passport',
      'Special Passport',
    ])
    const passportQuestion = question('Q-SHARED-PASSPORT-CLASS')
    expect(passportQuestion.allowedValues).toEqual(PASSPORT_TYPES.map(({ value }) => value))
    expect(passportQuestion.guidanceByValue).toHaveProperty('PASSPORT-OFFICIAL')
    expect(passportQuestion.guidanceByValue).toHaveProperty('PASSPORT-DIPLOMATIC')
    expect(passportQuestion.guidanceByValue).not.toHaveProperty('PASSPORT-SERVICE')
    expect(passportQuestion.guidanceByValue).not.toHaveProperty('PASSPORT-SPECIAL')
  })

  it('uses generic real control types across all eight manifests', () => {
    expect(activePolicyBundle.questionManifests).toHaveLength(8)
    const questions = activePolicyBundle.questionManifests.flatMap(({ questions }) => questions)
    expect(questions.some(({ control }) => control === 'SELECT')).toBe(true)
    expect(questions.some(({ control }) => control === 'DATE')).toBe(true)
    expect(questions.some(({ control }) => control === 'TEXT')).toBe(true)
    expect(questions.some(({ control }) => control === 'YES_NO')).toBe(true)
    expect(questions.some(({ control }) => control === 'SYNTHETIC_DATE')).toBe(false)
    expect(questions.some(({ prompt }) => /fictional|synthetic/i.test(prompt))).toBe(false)
    for (const dateQuestion of questions.filter(({ id }) => /DATE$/.test(id))) {
      expect(dateQuestion.control).toBe('DATE')
    }
  })

  it('models Medical text, yes/no, and the 4-to-120-day arrival window as policy data', () => {
    expect(question('Q-MEDICAL-TREATMENT-INTENT')).toMatchObject({
      control: 'TEXT',
      maxLength: 240,
    })
    expect(question('Q-MEDICAL-ADMISSION-DATE')).toMatchObject({
      control: 'DATE',
      dateConstraints: { notBeforeQuestionId: 'Q-SHARED-ARRIVAL-DATE' },
    })
    expect(question('Q-MEDICAL-ATTENDANT-GUIDANCE')).toMatchObject({
      control: 'YES_NO',
      allowedValues: ['YES', 'NO'],
    })
    const medicalManifest = activePolicyBundle.questionManifests.find(
      ({ id }) => id === 'QM-MEDICAL-1',
    )
    const medicalArrivalQuestion = medicalManifest?.questions.find(
      ({ id }) => id === 'Q-SHARED-ARRIVAL-DATE',
    )
    expect(medicalArrivalQuestion).toBeDefined()
    const bounds = questionDateBounds(
      medicalArrivalQuestion!,
      {},
      new Date(2026, 7, 28),
    )
    expect(bounds).toEqual({ min: '2026-09-01', max: '2026-12-26' })
  })

  it('keeps the 2.0.0 question manifests registered and immutable for old cases', () => {
    expect(ACTIVE_POLICY_QUALIFIED_VERSION).toBe('SYN-EVISA-POLICY@2.1.0')
    expect(resolvePolicyBundle('SYN-EVISA-POLICY@2.0.0')).toBe(expandedPolicyBundle)
    expect(
      expandedPolicyBundle.questionManifests[0]?.questions.some(
        ({ control }) => control === 'SYNTHETIC_DATE',
      ),
    ).toBe(true)
  })
})
