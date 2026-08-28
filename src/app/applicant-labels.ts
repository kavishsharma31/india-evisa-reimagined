import { APPLICANT_OPTION_LABELS } from '../policy/catalogues/applicant-options.js'

const ANSWER_LABELS: Readonly<Record<string, string>> = Object.freeze({
  'SYN-POLICY-COHORT-A': 'United Kingdom',
  SYNTHETIC_STANDARD_PASSPORT: 'Ordinary passport',
  SYNTHETIC_MEDICAL_TREATMENT: 'Hospital treatment',
  SYNTHETIC_TOURISM: 'Tourism and leisure',
  YES_SYNTHETIC: 'Yes',
  NO_SYNTHETIC: 'No',
  SYNTHETIC_ORDINARY_BUSINESS_VISIT: 'Business meetings and related activities',
  SYNTHETIC_INDIA_ORGANISATION: 'India-based company',
  SYNTHETIC_BENGALURU: 'Bengaluru',
  SYNTHETIC_PATIENT_REFERENCE_001: 'Patient application reference provided',
  SYNTHETIC_CLOSE_RELATIVE: 'Close relative',
  SYNTHETIC_INDIA_HOSPITAL: 'Hospital in India',
  SYNTHETIC_CHENNAI: 'Chennai',
  SYNTHETIC_INDIA_INSTITUTION: 'Educational institution in India',
  SYNTHETIC_GENERAL_ACADEMIC_COURSE: 'General academic programme',
  SYNTHETIC_ONE_ACADEMIC_TERM: 'One academic term',
  SYNTHETIC_SELF_FUNDED: 'Self-funded',
  SYNTHETIC_STUDENT_REFERENCE_001: 'Student application reference provided',
  SYNTHETIC_STUDENT_DEPENDENT: 'Dependent family member',
  SYNTHETIC_DELHI_AIRPORT: 'Delhi airport',
  SYNTHETIC_ONWARD_COUNTRY: 'Singapore',
  SYNTHETIC_TICKET_REFERENCE_001: 'Confirmed itinerary reference provided',
  SYNTHETIC_DESTINATION_PERMISSION: 'Valid visa or entry permission',
  SYNTHETIC_RELATIONSHIP_BASED_ENTRY: 'Relationship-based e-Entry',
  SYNTHETIC_ELIGIBLE_RELATIONSHIP: 'Eligible family relationship',
  SYNTHETIC_INDIAN_STATUS_BASIS: 'Indian or OCI status connection',
  YES: 'Yes',
  NO: 'No',
  'TOURIST-LEISURE': 'Tourism and leisure',
  'TOURIST-FRIENDS-RELATIVES': 'Visit friends or relatives',
  'TOURIST-SHORT-YOGA': 'Short-term yoga programme',
  'TOURIST-SHORT-COURSE': 'Eligible short-term course',
  'TOURIST-SHORT-VOLUNTEERING': 'Eligible short-term voluntary work',
  'BUSINESS-MEETINGS': 'Business meetings and related activities',
  'BUSINESS-TRADE-FAIR': 'Trade fair or exhibition',
  'BUSINESS-EXPERT-SPECIALIST': 'Expert or specialist assignment',
  'BUSINESS-RECRUITMENT': 'Recruitment activity',
  'BUSINESS-VENTURE-SETUP': 'Establishing an industrial or business venture',
  'RELATIONSHIP-SPOUSE': 'Spouse',
  'RELATIONSHIP-PARENT': 'Parent',
  'RELATIONSHIP-CHILD': 'Child',
  'RELATIONSHIP-SIBLING': 'Sibling',
  'RELATIONSHIP-OTHER-CLOSE-RELATIVE': 'Other close relative',
  'FUNDING-SELF': 'Self-funded',
  'FUNDING-FAMILY': 'Family-funded',
  'FUNDING-SCHOLARSHIP': 'Scholarship',
  'FUNDING-SPONSOR': 'Organisation or other sponsor',
  'PORT-AHMEDABAD-AIRPORT': 'Ahmedabad Airport',
  'PORT-BENGALURU-AIRPORT': 'Bengaluru Airport',
  'PORT-CHENNAI-AIRPORT': 'Chennai Airport',
  'PORT-COCHIN-AIRPORT': 'Cochin Airport',
  'PORT-DELHI-AIRPORT': 'Delhi Airport',
  'PORT-GOA-DABOLIM-AIRPORT': 'Goa (Dabolim) Airport',
  'PORT-GOA-MOPA-AIRPORT': 'Goa (Mopa) Airport',
  'PORT-HYDERABAD-AIRPORT': 'Hyderabad Airport',
  'PORT-KOLKATA-AIRPORT': 'Kolkata Airport',
  'PORT-MUMBAI-AIRPORT': 'Mumbai Airport',
  'PORT-OTHER-PERMITTED': 'Another permitted e-Visa port',
  'DESTINATION-VISA': 'Valid visa',
  'DESTINATION-VISA-FREE': 'Visa-free entry',
  'DESTINATION-RESIDENCE-PERMIT': 'Residence permit',
  'DESTINATION-OTHER-PERMISSION': 'Other valid entry permission',
  'ENTRY-RELATIONSHIP': 'Relationship-based e-Entry',
  'ENTRY-INDIAN-OCI-CONNECTION': 'Indian or OCI status connection',
})

const QUESTION_PROMPTS: Readonly<Record<string, string>> = Object.freeze({
  'Q-SHARED-POLICY-COHORT': 'Country of nationality',
  'Q-SHARED-PASSPORT-CLASS': 'Passport type',
  'Q-SHARED-ARRIVAL-DATE': 'Expected date of arrival',
  'Q-MEDICAL-TREATMENT-INTENT': 'Type of medical treatment required',
  'Q-MEDICAL-ADMISSION-DATE': 'Proposed hospital admission date',
  'Q-MEDICAL-ATTENDANT-GUIDANCE': 'Will a medical attendant travel with you?',
  'Q-TOURIST-LEISURE-INTENT': 'Purpose of visit',
  'Q-TOURIST-EXIT-DATE': 'Expected date of departure',
  'Q-BUSINESS-ACTIVITY': 'Business purpose or activity',
  'Q-BUSINESS-INDIAN-ORGANISATION': 'Indian organisation or company',
  'Q-BUSINESS-ORGANISATION-CITY': 'Organisation city',
  'Q-BUSINESS-ARRIVAL-DATE': 'Expected date of arrival',
  'Q-BUSINESS-DEPARTURE-DATE': 'Expected date of departure',
  'Q-MEDICAL-ATTENDANT-PATIENT-REFERENCE': 'Patient application reference',
  'Q-MEDICAL-ATTENDANT-RELATIONSHIP': 'Relationship to the patient',
  'Q-MEDICAL-ATTENDANT-HOSPITAL': 'Indian hospital',
  'Q-MEDICAL-ATTENDANT-HOSPITAL-CITY': 'Hospital city',
  'Q-MEDICAL-ATTENDANT-ARRIVAL-DATE': 'Expected date of arrival',
  'Q-STUDENT-INSTITUTION': 'Educational institution',
  'Q-STUDENT-PROGRAMME': 'Programme or course',
  'Q-STUDENT-COURSE-DURATION': 'Course duration',
  'Q-STUDENT-FUNDING-SOURCE': 'Funding source',
  'Q-STUDENT-ARRIVAL-DATE': 'Expected date of arrival',
  'Q-FAMILY-STUDENT-REFERENCE': 'Student application reference',
  'Q-FAMILY-RELATIONSHIP': 'Relationship to the student',
  'Q-FAMILY-INSTITUTION': 'Student’s educational institution',
  'Q-FAMILY-ARRIVAL-DATE': 'Expected date of arrival',
  'Q-FAMILY-DEPARTURE-DATE': 'Expected date of departure',
  'Q-TRANSIT-ARRIVAL-PORT': 'Port of arrival in India',
  'Q-TRANSIT-ONWARD-COUNTRY': 'Onward destination country',
  'Q-TRANSIT-DEPARTURE-DATE': 'Onward departure date',
  'Q-TRANSIT-TICKET-REFERENCE': 'Confirmed ticket reference',
  'Q-TRANSIT-DESTINATION-ENTRY-BASIS': 'Permission to enter your destination country',
  'Q-MISC-ENTRY-BASIS': 'Basis for your e-Entry application',
  'Q-MISC-RELATIONSHIP': 'Relationship to the relevant person',
  'Q-MISC-RELATED-PERSON-BASIS': 'Related person or Indian/OCI status basis',
  'Q-MISC-ARRIVAL-DATE': 'Expected date of arrival',
  'Q-MISC-DEPARTURE-DATE': 'Expected date of departure',
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
  SYNTHETIC_PORTRAIT: 'Recent photograph',
  SYNTHETIC_PASSPORT_PAGE: 'Passport bio page',
  SYNTHETIC_HOSPITAL_LETTER: 'Hospital letter',
  SYNTHETIC_BUSINESS_CARD: 'Business card',
  SYNTHETIC_ADMISSION_LETTER: 'Admission letter',
  SYNTHETIC_FINANCIAL_SUPPORT: 'Proof of financial support',
  SYNTHETIC_TRANSIT_TICKETS: 'Confirmed travel tickets',
  SYNTHETIC_DESTINATION_ENTRY_EVIDENCE: 'Proof of permission to enter destination country',
  SYNTHETIC_RELATIONSHIP_EVIDENCE: 'Proof supporting your relationship or Indian/OCI status basis',
  SYNTHETIC_CIVIL_CERTIFICATE: 'Birth or marriage certificate',
})

export const DOCUMENT_GUIDANCE: Readonly<Record<string, string>> = Object.freeze({
  SYNTHETIC_PORTRAIT: 'Provide a clear, recent colour photograph.',
  SYNTHETIC_PASSPORT_PAGE: 'Provide a clear copy of the page showing your photograph and passport details.',
  SYNTHETIC_HOSPITAL_LETTER: 'Provide a letter from the hospital confirming your planned treatment and admission details.',
  SYNTHETIC_BUSINESS_CARD: 'Provide a business card showing your professional contact details.',
  SYNTHETIC_ADMISSION_LETTER: 'Provide the admission letter issued by your educational institution.',
  SYNTHETIC_FINANCIAL_SUPPORT: 'Provide evidence showing how your studies and stay will be funded.',
  SYNTHETIC_TRANSIT_TICKETS: 'Provide confirmed tickets for your journey through India.',
  SYNTHETIC_DESTINATION_ENTRY_EVIDENCE: 'Provide evidence that you may enter your onward destination country.',
  SYNTHETIC_RELATIONSHIP_EVIDENCE: 'Provide evidence supporting the relationship or Indian/OCI status basis for this application.',
  SYNTHETIC_CIVIL_CERTIFICATE: 'Provide the relevant birth or marriage certificate.',
})

export const DOCUMENT_FIXTURE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  'SYN-FIXTURE-PORTRAIT-VALID-001': 'Provided photograph',
  'SYN-FIXTURE-PASSPORT-VALID-001': 'Clear passport bio page',
  'SYN-FIXTURE-PASSPORT-UNCLEAR-001': 'Unclear passport bio page',
  'SYN-FIXTURE-HOSPITAL-LETTER-V1-001': 'Provided hospital letter',
  'SYN-FIXTURE-BUSINESS-CARD-VALID-001': 'Provided business card',
  'SYN-FIXTURE-STUDENT-ADMISSION-LETTER-VALID-001': 'Provided admission letter',
  'SYN-FIXTURE-STUDENT-FINANCIAL-SUPPORT-VALID-001': 'Provided proof of financial support',
  'SYN-FIXTURE-TRANSIT-TICKETS-VALID-001': 'Provided confirmed travel tickets',
  'SYN-FIXTURE-DESTINATION-ENTRY-VALID-001': 'Provided destination-entry evidence',
  'SYN-FIXTURE-MISC-RELATION-PROOF-VALID-001': 'Provided relationship evidence',
  'SYN-FIXTURE-MISC-CIVIL-CERTIFICATE-VALID-001': 'Provided birth or marriage certificate',
})

export function applicantQuestionPrompt(questionId: string, fallback: string): string {
  return QUESTION_PROMPTS[questionId] ?? fallback
}

export function applicantAnswerLabel(value: string): string {
  const knownLabel = APPLICANT_OPTION_LABELS[value] ?? ANSWER_LABELS[value]
  if (knownLabel !== undefined) {
    return knownLabel
  }

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (dateMatch !== null) {
    const [, year, monthText, dayText] = dateMatch
    const month = monthText === undefined ? undefined : MONTH_NAMES[Number(monthText) - 1]
    if (year !== undefined && dayText !== undefined && month !== undefined) {
      return `${Number(dayText)} ${month} ${year}`
    }
  }

  return value
    .replace(/^SYN(?:THETIC)?[-_]/, '')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^./, (firstCharacter) => firstCharacter.toUpperCase())
}

const REFERENCE_PREFIXES = Object.freeze([
  ['SYN-PAYMENT-REFERENCE-', 'PAY-'],
  ['SYN-CASE-', 'EV-'],
  ['SYN-ETA-', 'ETA-'],
] as const)

export function applicantReference(value: string): string {
  const mapping = REFERENCE_PREFIXES.find(([prefix]) => value.startsWith(prefix))
  return mapping === undefined ? value : `${mapping[1]}${value.slice(mapping[0].length)}`
}
