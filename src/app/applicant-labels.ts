const ANSWER_LABELS: Readonly<Record<string, string>> = Object.freeze({
  'SYN-POLICY-COHORT-A': 'Synthetic policy cohort A',
  SYNTHETIC_STANDARD_PASSPORT: 'Synthetic standard passport',
  SYNTHETIC_MEDICAL_TREATMENT: 'Synthetic Medical treatment',
  SYNTHETIC_TOURISM: 'Synthetic tourism',
  YES_SYNTHETIC: 'Yes',
  NO_SYNTHETIC: 'No',
})

const MONTH_NAMES = Object.freeze([
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const)

export const PURPOSE_NAMES = Object.freeze({
  SYNTHETIC_MEDICAL_PURPOSE: 'Medical treatment',
  SYNTHETIC_TOURIST_PURPOSE: 'Tourism',
} as const)

export const DOCUMENT_NAMES: Readonly<Record<string, string>> = Object.freeze({
  SYNTHETIC_PORTRAIT: 'Synthetic portrait',
  SYNTHETIC_PASSPORT_PAGE: 'Synthetic passport page',
  SYNTHETIC_HOSPITAL_LETTER: 'Synthetic hospital letter',
})

export const DOCUMENT_FIXTURE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  'SYN-FIXTURE-PORTRAIT-VALID-001': 'Bundled demo portrait',
  'SYN-FIXTURE-PASSPORT-VALID-001': 'Clear demo passport page',
  'SYN-FIXTURE-PASSPORT-UNCLEAR-001': 'Unclear demo passport page — recovery example',
  'SYN-FIXTURE-HOSPITAL-LETTER-V1-001': 'Bundled demo hospital letter',
})

export function applicantAnswerLabel(value: string): string {
  const knownLabel = ANSWER_LABELS[value]
  if (knownLabel !== undefined) {
    return knownLabel
  }

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (dateMatch !== null) {
    const [, year, monthText, dayText] = dateMatch
    const month = monthText === undefined ? undefined : MONTH_NAMES[Number(monthText) - 1]
    if (year !== undefined && dayText !== undefined && month !== undefined) {
      return `${Number(dayText)} ${month} ${year} (fictional)`
    }
  }

  return value
    .replace(/^SYN(?:THETIC)?[-_]/, 'Synthetic ')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^./, (firstCharacter) => firstCharacter.toUpperCase())
}
