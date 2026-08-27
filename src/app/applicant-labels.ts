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
  SYNTHETIC_TOURIST_PURPOSE: 'Tourism',
  SYNTHETIC_BUSINESS_PURPOSE: 'Business',
  SYNTHETIC_MEDICAL_PURPOSE: 'Medical treatment',
  SYNTHETIC_MEDICAL_ATTENDANT_PURPOSE: 'Accompanying a medical patient',
  SYNTHETIC_STUDENT_PURPOSE: 'Study',
  SYNTHETIC_FAMILY_PURPOSE: 'Joining a student family member',
  SYNTHETIC_TRANSIT_PURPOSE: 'Transit through India',
  SYNTHETIC_MISCELLANEOUS_PURPOSE: 'Entry / another eligible purpose',
} as const)

export const OFFICIAL_CATEGORY_NAMES = Object.freeze({
  SYNTHETIC_TOURIST_PURPOSE: 'e-Tourist Visa',
  SYNTHETIC_BUSINESS_PURPOSE: 'e-Business Visa',
  SYNTHETIC_MEDICAL_PURPOSE: 'e-Medical Visa',
  SYNTHETIC_MEDICAL_ATTENDANT_PURPOSE: 'e-Medical Attendant Visa',
  SYNTHETIC_STUDENT_PURPOSE: 'e-Student Visa',
  SYNTHETIC_FAMILY_PURPOSE: 'e-Family Visa',
  SYNTHETIC_TRANSIT_PURPOSE: 'e-Transit Visa',
  SYNTHETIC_MISCELLANEOUS_PURPOSE: 'e-Miscellaneous Visa',
} as const)

export const DOCUMENT_NAMES: Readonly<Record<string, string>> = Object.freeze({
  SYNTHETIC_PORTRAIT: 'Synthetic portrait',
  SYNTHETIC_PASSPORT_PAGE: 'Synthetic passport page',
  SYNTHETIC_HOSPITAL_LETTER: 'Synthetic hospital letter',
  SYNTHETIC_BUSINESS_CARD: 'Synthetic business card',
  SYNTHETIC_ADMISSION_LETTER: 'Synthetic admission letter',
  SYNTHETIC_FINANCIAL_SUPPORT: 'Synthetic financial-support evidence',
  SYNTHETIC_TRANSIT_TICKETS: 'Synthetic confirmed journey tickets',
  SYNTHETIC_DESTINATION_ENTRY_EVIDENCE: 'Synthetic destination-entry evidence',
  SYNTHETIC_RELATIONSHIP_EVIDENCE: 'Synthetic relationship or Indian-status evidence',
  SYNTHETIC_CIVIL_CERTIFICATE: 'Synthetic birth or marriage certificate',
})

export const DOCUMENT_FIXTURE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  'SYN-FIXTURE-PORTRAIT-VALID-001': 'Bundled demo portrait',
  'SYN-FIXTURE-PASSPORT-VALID-001': 'Clear demo passport page',
  'SYN-FIXTURE-PASSPORT-UNCLEAR-001': 'Unclear demo passport page — recovery example',
  'SYN-FIXTURE-HOSPITAL-LETTER-V1-001': 'Bundled demo hospital letter',
  'SYN-FIXTURE-BUSINESS-CARD-VALID-001': 'Bundled demo business card',
  'SYN-FIXTURE-STUDENT-ADMISSION-LETTER-VALID-001': 'Bundled demo admission letter',
  'SYN-FIXTURE-STUDENT-FINANCIAL-SUPPORT-VALID-001': 'Bundled demo financial-support evidence',
  'SYN-FIXTURE-TRANSIT-TICKETS-VALID-001': 'Bundled demo confirmed journey tickets',
  'SYN-FIXTURE-DESTINATION-ENTRY-VALID-001': 'Bundled demo destination-entry evidence',
  'SYN-FIXTURE-MISC-RELATION-PROOF-VALID-001': 'Bundled demo relationship evidence',
  'SYN-FIXTURE-MISC-CIVIL-CERTIFICATE-VALID-001': 'Bundled demo civil certificate',
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
