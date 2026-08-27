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
    description: 'Representative ordinary-tourism demo path.',
    scopeNote: 'Short courses, short voluntary work and mountaineering can involve additional official requirements.',
  },
  {
    id: 'SYN-BUSINESS-001', slug: 'business', name: 'Business', pageTitle: 'Business e-Visa',
    officialCategory: 'e-Business Visa', description: 'Representative ordinary business-visit demo path.',
    scopeNote: 'Specialised sports, GIAN, conference and film-related purposes can require additional evidence or clearances.',
  },
  {
    id: 'SYN-MEDICAL-001', slug: 'medical', name: 'Medical treatment', pageTitle: 'Medical e-Visa',
    officialCategory: 'e-Medical Visa', description: 'Representative medical-treatment demo path.',
    scopeNote: 'Medical remains the deep synthetic payment and hospital-letter recovery demonstration.',
  },
  {
    id: 'SYN-MEDICAL-ATTENDANT-001', slug: 'medical-attendant', name: 'Accompanying a medical patient', pageTitle: 'Medical Attendant e-Visa',
    officialCategory: 'e-Medical Attendant Visa', description: 'Representative attendant path using a synthetic patient reference; no linked Medical case is required.',
    scopeNote: 'This demo does not model legal entitlement or linked-case eligibility.',
  },
  {
    id: 'SYN-STUDENT-001', slug: 'student', name: 'Study', pageTitle: 'Student e-Visa',
    officialCategory: 'e-Student Visa', description: 'Representative general non-medical academic-study demo path.',
    scopeNote: 'Medical or paramedical study can have additional official requirements; this representative demo does not model that subtype.',
  },
  {
    id: 'SYN-FAMILY-001', slug: 'family', name: 'Joining a student family member', pageTitle: 'Family e-Visa',
    officialCategory: 'e-Family Visa', description: 'Representative Student Dependent demo path—not a generic family-visiting category.',
    scopeNote: 'This path uses a synthetic student reference and does not determine dependent entitlement.',
  },
  {
    id: 'SYN-TRANSIT-001', slug: 'transit', name: 'Transit through India', pageTitle: 'Transit e-Visa',
    officialCategory: 'e-Transit Visa', description: 'Representative transit demo path with onward-journey evidence.',
    scopeNote: 'This prototype does not determine destination admission or legal transit eligibility.',
  },
  {
    id: 'SYN-MISCELLANEOUS-001', slug: 'miscellaneous', name: 'Entry / another eligible purpose', pageTitle: 'Miscellaneous e-Visa',
    officialCategory: 'e-Miscellaneous Visa', description: 'Representative relationship-based e-Entry demo path—not a generic legal catch-all.',
    scopeNote: 'This prototype does not determine relationship-based legal eligibility.',
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
