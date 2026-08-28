import type { SyntheticId } from '../domain'
import type { RuntimeResumeResult } from '../runtime'
import type { AppRuntimeServices } from './create-app-runtime'

export const SCENARIOS = [
  {
    id: 'SYN-TOURIST-001',
    slug: 'tourist',
    name: 'Tourism',
    pageTitle: 'Tourist e-Visa',
    officialCategory: 'e-Tourist Visa',
    description: 'Visit India for tourism and leisure.',
    scopeNote: 'Short courses, short voluntary work and mountaineering can involve additional official requirements.',
  },
  {
    id: 'SYN-BUSINESS-001', slug: 'business', name: 'Business', pageTitle: 'Business e-Visa',
    officialCategory: 'e-Business Visa', description: 'Visit India for business meetings and related commercial activities.',
    scopeNote: 'Specialised sports, GIAN, conference and film-related purposes can require additional evidence or clearances.',
  },
  {
    id: 'SYN-MEDICAL-001', slug: 'medical', name: 'Medical treatment', pageTitle: 'Medical e-Visa',
    officialCategory: 'e-Medical Visa', description: 'Travel to India for medical treatment at a hospital or healthcare provider.',
    scopeNote: 'You will need details of your planned treatment and hospital admission.',
  },
  {
    id: 'SYN-MEDICAL-ATTENDANT-001', slug: 'medical-attendant', name: 'Accompanying a medical patient', pageTitle: 'Medical Attendant e-Visa',
    officialCategory: 'e-Medical Attendant Visa', description: 'Accompany a patient travelling to India for medical treatment.',
    scopeNote: 'You will need the patient’s application reference and details of their hospital.',
  },
  {
    id: 'SYN-STUDENT-001', slug: 'student', name: 'Study', pageTitle: 'Student e-Visa',
    officialCategory: 'e-Student Visa', description: 'Study at an eligible educational institution in India.',
    scopeNote: 'Medical or paramedical study can have additional official requirements; this simplified flow does not cover that subtype.',
  },
  {
    id: 'SYN-FAMILY-001', slug: 'family', name: 'Joining a student family member', pageTitle: 'Family e-Visa',
    officialCategory: 'e-Family Visa', description: 'Join a student in India as their dependent family member.',
    scopeNote: 'This is the Student Dependent category. It is not for general family visits.',
  },
  {
    id: 'SYN-TRANSIT-001', slug: 'transit', name: 'Transit through India', pageTitle: 'Transit e-Visa',
    officialCategory: 'e-Transit Visa', description: 'Pass through India on the way to another country.',
    scopeNote: 'You will need confirmed onward travel and proof that you may enter your destination country.',
  },
  {
    id: 'SYN-MISCELLANEOUS-001', slug: 'miscellaneous', name: 'Entry / another eligible purpose', pageTitle: 'Miscellaneous e-Visa',
    officialCategory: 'e-Miscellaneous Visa', description: 'Apply through the relationship-based e-Entry route represented in this service.',
    scopeNote: 'This route is based on a qualifying relationship or Indian/OCI status connection; it is not a general-purpose category.',
  },
] as const

export type Scenario = (typeof SCENARIOS)[number]
export type ScenarioId = Scenario['id']
export type ScenarioSlug = Scenario['slug']
export type ResumedCase = Extract<RuntimeResumeResult, { status: 'CASE_RESUMED' }>
export type CaseStage =
  | 'application'
  | 'documents'
  | 'review'
  | 'payment'
  | 'status'
  | 'correction'
  | 'eta'

export type CaseNavigationProjection = Readonly<{
  status: 'READY'
  caseId: SyntheticId
  scenario: Scenario
  resumedCase: ResumedCase
  available: Readonly<Record<CaseStage, boolean>>
  completed: Readonly<Record<'application' | 'documents' | 'review' | 'payment' | 'status', boolean>>
  furthestPath: string
}>

export type CaseNavigationResult =
  | CaseNavigationProjection
  | Readonly<{ status: 'CASE_NOT_FOUND' }>
  | Readonly<{ status: 'RESET_REQUIRED' }>
  | Readonly<{ status: 'STORAGE_UNAVAILABLE' }>

export function scenarioFromSlug(slug: string | undefined): Scenario | null {
  return SCENARIOS.find((scenario) => scenario.slug === slug) ?? null
}

export function scenarioFromId(id: SyntheticId): Scenario | null {
  return SCENARIOS.find((scenario) => scenario.id === id) ?? null
}

export function applicationPath(caseId: SyntheticId, stage?: Exclude<CaseStage, 'application'>): string {
  const base = `/application/${caseId}`
  return stage === undefined ? base : `${base}/${stage}`
}

export function withPreservedDemo(path: string, search: string): string {
  return new URLSearchParams(search).get('demo') === '1' ? `${path}?demo=1` : path
}

function storageFailure(status: string): CaseNavigationResult | null {
  if (status === 'STORAGE_REQUIRES_RESET') {
    return { status: 'RESET_REQUIRED' }
  }
  if (status === 'STORAGE_UNAVAILABLE') {
    return { status: 'STORAGE_UNAVAILABLE' }
  }
  return null
}

export function projectCaseNavigation(
  services: AppRuntimeServices,
  rawCaseId: string | undefined,
): CaseNavigationResult {
  if (rawCaseId === undefined) {
    return { status: 'CASE_NOT_FOUND' }
  }

  const resumed = services.runtime.resumeCase({ caseId: rawCaseId })
  const resumeFailure = storageFailure(resumed.status)
  if (resumeFailure !== null) {
    return resumeFailure
  }
  if (resumed.status !== 'CASE_RESUMED') {
    return { status: 'CASE_NOT_FOUND' }
  }

  const scenario = scenarioFromId(resumed.scenarioId)
  if (scenario === null) {
    return { status: 'CASE_NOT_FOUND' }
  }

  const documents = services.runtime.inspectDocuments({ caseId: resumed.caseId })
  const review = services.runtime.inspectReview({ caseId: resumed.caseId })
  const payment = services.runtime.inspectPayment({ caseId: resumed.caseId })
  const status = services.runtime.inspectStatus({ caseId: resumed.caseId })
  const correction = services.runtime.inspectCorrection({ caseId: resumed.caseId })

  for (const inspection of [documents, review, payment, status, correction]) {
    const inspectionFailure = storageFailure(inspection.status)
    if (inspectionFailure !== null) {
      return inspectionFailure
    }
  }

  const applicationAvailable =
    resumed.applicationState === 'DRAFT_CREATED' || resumed.applicationState === 'IN_PROGRESS'
  const documentsAvailable = documents.status === 'DOCUMENTS_INSPECTED'
  const reviewAvailable = review.status === 'REVIEW_INSPECTED'
  const paymentAvailable = payment.status === 'PAYMENT_INSPECTED'
  const statusAvailable = status.status === 'STATUS_INSPECTED'
  const correctionAvailable = correction.status === 'CORRECTION_INSPECTED'
  const etaAvailable = status.status === 'STATUS_INSPECTED' && status.etaState === 'ISSUED'

  const available = Object.freeze({
    application: applicationAvailable,
    documents: documentsAvailable,
    review: reviewAvailable,
    payment: paymentAvailable,
    status: statusAvailable,
    correction: correctionAvailable,
    eta: etaAvailable,
  })

  const applicationCompleted =
    resumed.applicationState === 'LOCKED' ||
    resumed.currentStep === 'DOCUMENTS' ||
    resumed.currentStep === 'REVIEW'
  const documentsCompleted = resumed.applicationState === 'LOCKED' || resumed.currentStep === 'REVIEW'
  const reviewCompleted = resumed.applicationState === 'LOCKED'
  const paymentCompleted = status.status === 'STATUS_INSPECTED'

  const furthestPath = etaAvailable
    ? applicationPath(resumed.caseId, 'eta')
    : statusAvailable
      ? applicationPath(resumed.caseId, 'status')
      : paymentAvailable
        ? applicationPath(resumed.caseId, 'payment')
        : reviewAvailable
          ? applicationPath(resumed.caseId, 'review')
          : documentsAvailable
            ? applicationPath(resumed.caseId, 'documents')
            : applicationPath(resumed.caseId)

  return Object.freeze({
    status: 'READY',
    caseId: resumed.caseId,
    scenario,
    resumedCase: resumed,
    available,
    completed: Object.freeze({
      application: applicationCompleted,
      documents: documentsCompleted,
      review: reviewCompleted,
      payment: paymentCompleted,
      status: etaAvailable,
    }),
    furthestPath,
  })
}

export function projectScenarioNavigation(
  services: AppRuntimeServices,
  scenarioId: ScenarioId,
): CaseNavigationResult {
  const inspected = services.runtime.inspectState()
  const inspectionFailure = storageFailure(inspected.status)
  if (inspectionFailure !== null) {
    return inspectionFailure
  }
  if (inspected.status !== 'VALID_STATE') {
    return { status: 'CASE_NOT_FOUND' }
  }

  const persistedCase = inspected.state.cases.find(
    (candidate) => candidate.scenarioId === scenarioId,
  )
  return projectCaseNavigation(services, persistedCase?.caseId)
}

export function guardedDestination(
  projection: CaseNavigationProjection,
  requestedStage: CaseStage,
): string | null {
  if (projection.available[requestedStage]) {
    return null
  }
  if (requestedStage === 'correction' && projection.available.status) {
    return applicationPath(projection.caseId, 'status')
  }
  if (
    (requestedStage === 'application' || requestedStage === 'documents') &&
    projection.available.review
  ) {
    return applicationPath(projection.caseId, 'review')
  }
  return projection.furthestPath
}
