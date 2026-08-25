import { useEffect, useState } from 'react'

import { AdaptiveApplication } from './app/AdaptiveApplication'
import { DocumentPreparation } from './app/DocumentPreparation'
import { ReviewApplication } from './app/ReviewApplication'
import { PaymentApplication } from './app/PaymentApplication'
import { StatusApplication } from './app/StatusApplication'
import { DOCUMENT_NAMES, PURPOSE_NAMES } from './app/applicant-labels'
import { createAppRuntime, type AppRuntimeServices } from './app/create-app-runtime'
import type { SyntheticId } from './domain'
import type { PolicyEvaluationResult } from './policy'
import type { RuntimeResumeResult } from './runtime'
import styles from './App.module.css'

const PROTOTYPE_NOTICE =
  'UNOFFICIAL HACKATHON PROTOTYPE — SYNTHETIC DATA ONLY — CANNOT SUBMIT A VISA APPLICATION'

const SCENARIOS = [
  {
    id: 'SYN-MEDICAL-001',
    name: 'Medical treatment',
    description: 'For a synthetic traveller visiting India for medical treatment.',
    badge: 'Recommended demo',
  },
  {
    id: 'SYN-TOURIST-001',
    name: 'Tourism',
    description: 'For a synthetic traveller visiting India for tourism.',
    badge: 'Shared journey check',
  },
] as const

type ScenarioId = (typeof SCENARIOS)[number]['id']
type ResumedCase = Extract<RuntimeResumeResult, { status: 'CASE_RESUMED' }>
type Surface =
  | 'LOADING'
  | 'SCENARIO_SELECTION'
  | 'PURPOSE_GUIDANCE'
  | 'CASE_CREATED'
  | 'RESUME_CASE'
  | 'ADAPTIVE_APPLICATION'
  | 'DOCUMENT_PREPARATION'
  | 'REVIEW_APPLICATION'
  | 'PAYMENT_APPLICATION'
  | 'STATUS_APPLICATION'
  | 'RESET_REQUIRED'
  | 'STORAGE_UNAVAILABLE'

type CreatedCase = Readonly<{
  caseId: SyntheticId
  scenarioId: ScenarioId
  policyQualifiedVersion: string
}>

type AppProps = Readonly<{
  services?: AppRuntimeServices
}>

type InitialView = Readonly<{
  surface: Surface
  resumedCase: ResumedCase | null
  evaluation: PolicyEvaluationResult | null
}>

const PAYMENT_FRAGMENT = '#payment'
const STATUS_FRAGMENT = '#status'

function paymentSurfaceRequested(): boolean {
  return typeof window !== 'undefined' && window.location.hash === PAYMENT_FRAGMENT
}

function setPaymentFragment(active: boolean): void {
  if (typeof window === 'undefined') {
    return
  }
  const nextLocation = active
    ? `${window.location.pathname}${window.location.search}${PAYMENT_FRAGMENT}`
    : `${window.location.pathname}${window.location.search}`
  window.history.replaceState(null, '', nextLocation)
}

function setStatusFragment(active: boolean): void {
  if (typeof window === 'undefined') {
    return
  }
  const nextLocation = active
    ? `${window.location.pathname}${window.location.search}${STATUS_FRAGMENT}`
    : `${window.location.pathname}${window.location.search}`
  window.history.replaceState(null, '', nextLocation)
}

function scenarioDetails(scenarioId: ScenarioId) {
  const scenario = SCENARIOS.find(({ id }) => id === scenarioId)
  if (scenario === undefined) {
    throw new Error('The selected synthetic scenario is not in the applicant catalogue.')
  }
  return scenario
}

function isScenarioId(value: SyntheticId): value is ScenarioId {
  return value === 'SYN-MEDICAL-001' || value === 'SYN-TOURIST-001'
}

function createCaseIdempotencyKey(scenarioId: ScenarioId): SyntheticId {
  return scenarioId === 'SYN-MEDICAL-001'
    ? 'SYN-IDEMPOTENCY-UI-CREATE-MEDICAL-001'
    : 'SYN-IDEMPOTENCY-UI-CREATE-TOURIST-001'
}

function beginDraftIdempotencyKey(caseId: SyntheticId): SyntheticId {
  return `SYN-IDEMPOTENCY-UI-BEGIN-${caseId.slice('SYN-'.length)}-001`
}

function inspectInitialView(services: AppRuntimeServices): InitialView {
  const inspected = services.runtime.inspectState()
  if (inspected.status === 'STORAGE_REQUIRES_RESET') {
    return { surface: 'RESET_REQUIRED', resumedCase: null, evaluation: null }
  }
  if (inspected.status === 'STORAGE_UNAVAILABLE') {
    return { surface: 'STORAGE_UNAVAILABLE', resumedCase: null, evaluation: null }
  }
  if (inspected.status === 'VALID_STATE' && inspected.state.activeCaseId !== null) {
    const resumed = services.runtime.resumeCase()
    if (resumed.status === 'CASE_RESUMED') {
      const persistedCase = inspected.state.cases.find(
        ({ caseId }) => caseId === resumed.caseId,
      )
      if (
        resumed.applicationState === 'LOCKED' &&
        persistedCase?.payment.state === 'CONFIRMED' &&
        persistedCase.scrutiny.state !== 'NOT_STARTED' &&
        isScenarioId(resumed.scenarioId)
      ) {
        const status = services.runtime.inspectStatus({ caseId: resumed.caseId })
        if (status.status === 'STATUS_INSPECTED') {
          return { surface: 'STATUS_APPLICATION', resumedCase: resumed, evaluation: null }
        }
      }
      if (
        resumed.applicationState === 'LOCKED' &&
        (paymentSurfaceRequested() ||
          (persistedCase !== undefined && persistedCase.payment.state !== 'NOT_STARTED')) &&
        isScenarioId(resumed.scenarioId)
      ) {
        const payment = services.runtime.inspectPayment({ caseId: resumed.caseId })
        if (payment.status === 'PAYMENT_INSPECTED') {
          return {
            surface: 'PAYMENT_APPLICATION',
            resumedCase: resumed,
            evaluation: null,
          }
        }
      }
      if (
        (resumed.applicationState === 'LOCKED' || resumed.currentStep === 'REVIEW') &&
        isScenarioId(resumed.scenarioId)
      ) {
        return {
          surface: 'REVIEW_APPLICATION',
          resumedCase: resumed,
          evaluation: null,
        }
      }
      if (
        resumed.resumable &&
        resumed.currentStep === 'DOCUMENTS' &&
        isScenarioId(resumed.scenarioId)
      ) {
        const evaluated = services.runtime.evaluateScenario({ scenarioId: resumed.scenarioId })
        if (
          evaluated.status === 'POLICY_EVALUATED' &&
          evaluated.evaluation.policy.qualifiedVersion === resumed.policyQualifiedVersion
        ) {
          return {
            surface: 'DOCUMENT_PREPARATION',
            resumedCase: resumed,
            evaluation: evaluated.evaluation,
          }
        }
      }
      if (resumed.resumable) {
        return { surface: 'RESUME_CASE', resumedCase: resumed, evaluation: null }
      }
    }
    if (resumed.status === 'STORAGE_REQUIRES_RESET') {
      return { surface: 'RESET_REQUIRED', resumedCase: null, evaluation: null }
    }
    if (resumed.status === 'STORAGE_UNAVAILABLE') {
      return { surface: 'STORAGE_UNAVAILABLE', resumedCase: null, evaluation: null }
    }
  }
  return { surface: 'SCENARIO_SELECTION', resumedCase: null, evaluation: null }
}

function PrototypeNotice() {
  return (
    <p className={styles.prototypeNotice} role="note">
      <span className={styles.noticeMarker} aria-hidden="true">
        Demo
      </span>
      <span>{PROTOTYPE_NOTICE}</span>
    </p>
  )
}

function ScenarioSelection(props: {
  selectedScenarioId: ScenarioId | null
  error: string | null
  onSelect(scenarioId: ScenarioId): void
}) {
  return (
    <section className={styles.entryLayout} aria-labelledby="scenario-heading">
      <div className={styles.entryIntroduction}>
        <p className={styles.eyebrow}>Purpose guidance</p>
        <h2 id="scenario-heading" tabIndex={-1}>
          What are you travelling to India for?
        </h2>
        <p className={styles.lead}>
          Choose a controlled synthetic scenario. We’ll use its versioned demo policy to explain what comes next.
        </p>
      </div>

      <fieldset className={styles.scenarioFieldset} aria-describedby={props.error ? 'scenario-error' : undefined}>
        <legend className={styles.visuallyHidden}>Choose one synthetic travel purpose</legend>
        {SCENARIOS.map((scenario, index) => (
          <label
            className={`${styles.scenarioCard} ${index === 0 ? styles.primaryScenario : ''}`}
            key={scenario.id}
          >
            <input
              type="radio"
              name="scenario"
              value={scenario.id}
              checked={props.selectedScenarioId === scenario.id}
              onChange={() => props.onSelect(scenario.id)}
            />
            <span className={styles.scenarioCopy}>
              <span className={styles.scenarioTopline}>
                <strong>{scenario.name}</strong>
                <span className={styles.scenarioBadge}>{scenario.badge}</span>
              </span>
              <span>{scenario.description}</span>
            </span>
            <span className={styles.radioIndicator} aria-hidden="true" />
          </label>
        ))}
        <p className={styles.selectionHint}>Selecting a purpose opens its demo-policy guidance.</p>
        {props.error ? (
          <p className={styles.inlineError} id="scenario-error" role="alert">
            {props.error}
          </p>
        ) : null}
      </fieldset>

      <div className={styles.safetyNote}>
        <span aria-hidden="true">✓</span>
        <p>No real details, documents, or payment information are requested.</p>
      </div>
    </section>
  )
}

function PurposeGuidance(props: {
  evaluation: PolicyEvaluationResult
  error: string | null
  onContinue(): void
  onChooseAnother(): void
}) {
  const purposeName = props.evaluation.suggestedPurposeFamily
    ? PURPOSE_NAMES[props.evaluation.suggestedPurposeFamily]
    : 'Selected purpose'
  const questions = props.evaluation.questionManifest?.questions ?? []
  const requirements = props.evaluation.documentManifest?.requirements ?? []
  const fee = props.evaluation.syntheticFee

  return (
    <section className={styles.guidance} aria-labelledby="guidance-heading">
      <button className={styles.textButton} type="button" onClick={props.onChooseAnother}>
        <span aria-hidden="true">←</span> Choose a different purpose
      </button>

      <div className={styles.guidanceHeader}>
        <p className={styles.eyebrow}>Purpose guidance · Step 1 of 6</p>
        <h2 id="guidance-heading" tabIndex={-1}>
          {purposeName}
        </h2>
        <p className={styles.demoDisclaimer}>
          This purpose is supported by the selected demo scenario. It is not a legal eligibility decision.
        </p>
      </div>

      <div className={styles.guidanceGrid}>
        <section className={styles.guidanceSection} aria-labelledby="questions-heading">
          <div className={styles.sectionHeading}>
            <span className={styles.sectionNumber} aria-hidden="true">01</span>
            <div>
              <h3 id="questions-heading">What we’ll ask</h3>
              <p>Only bounded synthetic choices from this demo policy.</p>
            </div>
          </div>
          <ul className={styles.plainList}>
            {questions.map((question) => (
              <li key={question.id}>{question.prompt}</li>
            ))}
          </ul>
        </section>

        <section className={styles.guidanceSection} aria-labelledby="documents-heading">
          <div className={styles.sectionHeading}>
            <span className={styles.sectionNumber} aria-hidden="true">02</span>
            <div>
              <h3 id="documents-heading">Demo documents</h3>
              <p>Bundled project-created fixtures only.</p>
            </div>
          </div>
          <ul className={styles.requirementList}>
            {requirements.map((requirement) => (
              <li key={requirement.id}>
                <span aria-hidden="true">✓</span>
                {DOCUMENT_NAMES[requirement.documentType] ?? requirement.documentType}
              </li>
            ))}
          </ul>
        </section>

        {fee ? (
          <section className={styles.feePanel} aria-labelledby="fee-heading">
            <div>
              <p className={styles.feeLabel} id="fee-heading">Synthetic demo fee</p>
              <p className={styles.feeAmount}>{fee.amount} {fee.unit}</p>
            </div>
            <strong>{fee.label}</strong>
          </section>
        ) : null}
      </div>

      <details className={styles.policyDetails}>
        <summary>Why am I seeing this?</summary>
        <div className={styles.policyDetailBody}>
          <p>
            This guidance comes from demo policy <strong>{props.evaluation.policy.qualifiedVersion}</strong>.
          </p>
          <ul>
            {props.evaluation.reasons.map((reason) => (
              <li key={reason.code}>{reason.explanation}</li>
            ))}
          </ul>
          <p className={styles.provenanceLine}>
            Sources: {props.evaluation.provenance.map(({ sourceLabel }) => sourceLabel).join(' · ')}
          </p>
        </div>
      </details>

      {props.error ? <p className={styles.inlineError} role="alert">{props.error}</p> : null}

      <div className={styles.actions}>
        <button className={styles.primaryButton} type="button" onClick={props.onContinue}>
          Continue with this demo
          <span aria-hidden="true">→</span>
        </button>
        <button className={styles.secondaryButton} type="button" onClick={props.onChooseAnother}>
          Choose a different purpose
        </button>
      </div>
    </section>
  )
}

function CaseCreated(props: {
  createdCase: CreatedCase
  error: string | null
  onStart(): void
}) {
  const scenario = scenarioDetails(props.createdCase.scenarioId)
  return (
    <section className={styles.outcomePanel} aria-labelledby="case-created-heading">
      <div className={styles.outcomeMarker} aria-hidden="true">✓</div>
      <p className={styles.eyebrow}>Application · Step 2 of 6</p>
      <h2 id="case-created-heading" tabIndex={-1}>
        Your synthetic application has been created
      </h2>
      <p>
        Your {scenario.name.toLowerCase()} demo case is saved in this browser and pinned to the policy used for its guidance.
      </p>
      <dl className={styles.caseFacts}>
        <div>
          <dt>Purpose</dt>
          <dd>{scenario.name}</dd>
        </div>
        <div>
          <dt>Synthetic case reference</dt>
          <dd>{props.createdCase.caseId}</dd>
        </div>
        <div>
          <dt>Demo policy</dt>
          <dd>{props.createdCase.policyQualifiedVersion}</dd>
        </div>
      </dl>
      {props.error ? <p className={styles.inlineError} role="alert">{props.error}</p> : null}
      <button className={styles.primaryButton} type="button" onClick={props.onStart}>
        Start application <span aria-hidden="true">→</span>
      </button>
      <p className={styles.actionNote}>This starts the saved draft. It does not submit anything.</p>
    </section>
  )
}

function ResumeCase(props: {
  resumedCase: ResumedCase
  error: string | null
  onResume(): void
}) {
  const scenario = isScenarioId(props.resumedCase.scenarioId)
    ? scenarioDetails(props.resumedCase.scenarioId)
    : null
  const isCreatedOnly = props.resumedCase.applicationState === 'DRAFT_CREATED'
  return (
    <section className={styles.resumePanel} aria-labelledby="resume-heading">
      <div className={styles.resumeHeader}>
        <div>
          <p className={styles.eyebrow}>Saved in this browser</p>
          <h2 id="resume-heading" tabIndex={-1}>
            Continue your application
          </h2>
        </div>
        <span className={styles.savedBadge}>Progress preserved</span>
      </div>
      <p className={styles.resumePurpose}>{scenario?.name ?? 'Synthetic application'}</p>
      <p>
        {isCreatedOnly
          ? 'Your synthetic case is ready to begin.'
          : 'Your application is in progress. Resume the same saved case without starting again.'}
      </p>
      <dl className={styles.caseFacts}>
        <div>
          <dt>Application state</dt>
          <dd>{isCreatedOnly ? 'Ready to start' : 'In progress'}</dd>
        </div>
        <div>
          <dt>Last saved</dt>
          <dd>Synthetic demo state</dd>
        </div>
        <div>
          <dt>Synthetic case reference</dt>
          <dd>{props.resumedCase.caseId}</dd>
        </div>
      </dl>
      {props.error ? <p className={styles.inlineError} role="alert">{props.error}</p> : null}
      <button className={styles.primaryButton} type="button" onClick={props.onResume}>
        {isCreatedOnly ? 'Continue setup' : 'Resume application'}
        <span aria-hidden="true">→</span>
      </button>
    </section>
  )
}

function RecoveryPanel(props: {
  storageUnavailable: boolean
  error: string | null
  onReset(): void
}) {
  return (
    <section className={styles.recoveryPanel} aria-labelledby="recovery-heading">
      <p className={styles.eyebrow}>Local demo storage</p>
      <h2 id="recovery-heading" tabIndex={-1}>
        {props.storageUnavailable ? 'Progress cannot be saved in this browser' : 'Saved demo data cannot be read'}
      </h2>
      <p>
        {props.storageUnavailable
          ? 'This prototype requires local browser storage to preserve synthetic progress. Storage is currently unavailable, so a case cannot be created safely.'
          : 'The local synthetic demo state is incompatible or corrupted. It has not been trusted or changed.'}
      </p>
      {props.error ? <p className={styles.inlineError} role="alert">{props.error}</p> : null}
      {!props.storageUnavailable ? (
        <button className={styles.primaryButton} type="button" onClick={props.onReset}>
          Reset demo data
        </button>
      ) : null}
    </section>
  )
}

function App({ services: providedServices }: AppProps) {
  const [services] = useState(() => providedServices ?? createAppRuntime())
  const [initialView] = useState(() => inspectInitialView(services))
  const [surface, setSurface] = useState<Surface>(initialView.surface)
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId | null>(null)
  const [evaluation, setEvaluation] = useState<PolicyEvaluationResult | null>(initialView.evaluation)
  const [createdCase, setCreatedCase] = useState<CreatedCase | null>(null)
  const [resumedCase, setResumedCase] = useState<ResumedCase | null>(initialView.resumedCase)
  const [error, setError] = useState<string | null>(null)
  const [documentEditMode, setDocumentEditMode] = useState(false)
  useEffect(() => {
    const headingIdBySurface: Partial<Record<Surface, string>> = {
      SCENARIO_SELECTION: 'scenario-heading',
      PURPOSE_GUIDANCE: 'guidance-heading',
      CASE_CREATED: 'case-created-heading',
      RESUME_CASE: 'resume-heading',
      ADAPTIVE_APPLICATION: 'application-heading',
      DOCUMENT_PREPARATION: 'documents-heading',
      REVIEW_APPLICATION: 'review-heading',
      PAYMENT_APPLICATION: 'payment-heading',
      STATUS_APPLICATION: 'status-heading',
      RESET_REQUIRED: 'recovery-heading',
      STORAGE_UNAVAILABLE: 'recovery-heading',
    }
    const headingId = headingIdBySurface[surface]
    if (headingId !== undefined) {
      const heading = document.getElementById(headingId)
      if (
        surface === 'ADAPTIVE_APPLICATION' ||
        surface === 'DOCUMENT_PREPARATION' ||
        surface === 'REVIEW_APPLICATION' ||
        surface === 'PAYMENT_APPLICATION'
        || surface === 'STATUS_APPLICATION'
      ) {
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
        heading?.focus({ preventScroll: true })
        return
      }
      heading?.focus()
    }
  }, [surface])

  function chooseScenario(scenarioId: ScenarioId) {
    setError(null)
    setSelectedScenarioId(scenarioId)
    const result = services.runtime.evaluateScenario({ scenarioId })
    if (result.status === 'POLICY_EVALUATED') {
      setEvaluation(result.evaluation)
      setSurface('PURPOSE_GUIDANCE')
      return
    }
    setEvaluation(null)
    setError('We could not confirm support for that demo scenario. No application has been created.')
  }

  function chooseAnotherPurpose() {
    setError(null)
    setEvaluation(null)
    setSelectedScenarioId(null)
    setSurface('SCENARIO_SELECTION')
  }

  function continueWithDemo() {
    if (selectedScenarioId === null || evaluation === null) {
      setError('Choose a supported demo purpose before continuing.')
      return
    }
    setError(null)
    const result = services.runtime.createCase({
      scenarioId: selectedScenarioId,
      idempotencyKey: createCaseIdempotencyKey(selectedScenarioId),
    })
    if (result.status === 'COMMAND_ACCEPTED') {
      setCreatedCase({
        caseId: result.caseId,
        scenarioId: selectedScenarioId,
        policyQualifiedVersion: evaluation.policy.qualifiedVersion,
      })
      setSurface('CASE_CREATED')
      return
    }
    if (result.status === 'EXISTING_CASE') {
      const resumed = services.runtime.resumeCase({ caseId: result.caseId })
      if (resumed.status === 'CASE_RESUMED') {
        setResumedCase(resumed)
        setSurface('RESUME_CASE')
        return
      }
    }
    if (result.status === 'STORAGE_REQUIRES_RESET') {
      setSurface('RESET_REQUIRED')
      return
    }
    if (result.status === 'STORAGE_UNAVAILABLE') {
      setSurface('STORAGE_UNAVAILABLE')
      return
    }
    setError('The synthetic case could not be created safely. Your saved demo data was not changed.')
  }

  function startApplication() {
    if (createdCase === null) {
      setError('The synthetic case is not available to start.')
      return
    }
    setError(null)
    const result = services.runtime.beginDraft({
      caseId: createdCase.caseId,
      idempotencyKey: beginDraftIdempotencyKey(createdCase.caseId),
    })
    if (result.status === 'COMMAND_ACCEPTED') {
      const resumed = services.runtime.resumeCase({ caseId: createdCase.caseId })
      if (resumed.status === 'CASE_RESUMED') {
        openAdaptiveApplication(resumed)
        return
      }
      setError('The started draft could not be loaded safely. Your saved demo data was not changed.')
      return
    }
    if (result.status === 'STORAGE_REQUIRES_RESET') {
      setSurface('RESET_REQUIRED')
      return
    }
    if (result.status === 'STORAGE_UNAVAILABLE') {
      setSurface('STORAGE_UNAVAILABLE')
      return
    }
    setError('The draft could not be started safely. No application state was changed.')
  }

  function resumeApplication() {
    if (resumedCase === null || !isScenarioId(resumedCase.scenarioId)) {
      setError('The saved synthetic case cannot be resumed by this demo slice.')
      return
    }
    setError(null)
    let caseToOpen = resumedCase
    if (resumedCase.applicationState === 'DRAFT_CREATED') {
      const result = services.runtime.beginDraft({
        caseId: resumedCase.caseId,
        idempotencyKey: beginDraftIdempotencyKey(resumedCase.caseId),
      })
      if (result.status !== 'COMMAND_ACCEPTED') {
        if (result.status === 'STORAGE_REQUIRES_RESET') {
          setSurface('RESET_REQUIRED')
          return
        }
        if (result.status === 'STORAGE_UNAVAILABLE') {
          setSurface('STORAGE_UNAVAILABLE')
          return
        }
        setError('The saved draft could not be started safely. No application state was changed.')
        return
      }
      const refreshed = services.runtime.resumeCase({ caseId: resumedCase.caseId })
      if (refreshed.status !== 'CASE_RESUMED') {
        setError('The started draft could not be loaded safely. Your saved demo data was not changed.')
        return
      }
      caseToOpen = refreshed
    } else if (resumedCase.applicationState === 'IN_PROGRESS') {
      const refreshed = services.runtime.resumeCase({ caseId: resumedCase.caseId })
      if (refreshed.status === 'STORAGE_REQUIRES_RESET') {
        setSurface('RESET_REQUIRED')
        return
      }
      if (refreshed.status === 'STORAGE_UNAVAILABLE') {
        setSurface('STORAGE_UNAVAILABLE')
        return
      }
      if (refreshed.status !== 'CASE_RESUMED') {
        setError('The saved draft could not be loaded safely. Your saved demo data was not changed.')
        return
      }
      caseToOpen = refreshed
    } else {
      setError('This saved synthetic case is beyond the current applicant slice.')
      return
    }
    openAdaptiveApplication(caseToOpen)
  }

  function openAdaptiveApplication(caseToOpen: ResumedCase) {
    if (!isScenarioId(caseToOpen.scenarioId)) {
      setError('The saved synthetic scenario is not supported by this applicant form.')
      return
    }
    const evaluated = services.runtime.evaluateScenario({ scenarioId: caseToOpen.scenarioId })
    if (
      evaluated.status !== 'POLICY_EVALUATED' ||
      evaluated.evaluation.policy.qualifiedVersion !== caseToOpen.policyQualifiedVersion ||
      evaluated.evaluation.questionManifest === undefined
    ) {
      setError('The pinned demo policy could not safely provide this application form.')
      return
    }
    setEvaluation(evaluated.evaluation)
    setSelectedScenarioId(caseToOpen.scenarioId)
    setCreatedCase({
      caseId: caseToOpen.caseId,
      scenarioId: caseToOpen.scenarioId,
      policyQualifiedVersion: caseToOpen.policyQualifiedVersion,
    })
    setResumedCase(caseToOpen)
    setSurface('ADAPTIVE_APPLICATION')
  }

  function backToSavedCase() {
    if (resumedCase === null) {
      return
    }
    setError(null)
    setSurface('RESUME_CASE')
  }

  function openDocumentPreparation(editMode = false) {
    if (resumedCase === null) {
      setError('The saved synthetic Case is not available for document preparation.')
      return
    }
    const refreshed = services.runtime.resumeCase({ caseId: resumedCase.caseId })
    if (refreshed.status === 'STORAGE_REQUIRES_RESET') {
      setSurface('RESET_REQUIRED')
      return
    }
    if (refreshed.status === 'STORAGE_UNAVAILABLE') {
      setSurface('STORAGE_UNAVAILABLE')
      return
    }
    if (
      refreshed.status !== 'CASE_RESUMED' ||
      (refreshed.currentStep !== 'DOCUMENTS' && refreshed.currentStep !== 'REVIEW') ||
      !isScenarioId(refreshed.scenarioId)
    ) {
      setError('Application details must be saved before demo documents can be prepared.')
      return
    }
    const inspected = services.runtime.inspectDocuments({ caseId: refreshed.caseId })
    if (inspected.status === 'STORAGE_REQUIRES_RESET') {
      setSurface('RESET_REQUIRED')
      return
    }
    if (inspected.status === 'STORAGE_UNAVAILABLE') {
      setSurface('STORAGE_UNAVAILABLE')
      return
    }
    if (inspected.status !== 'DOCUMENTS_INSPECTED') {
      setError('The pinned demo policy could not safely provide the document checklist.')
      return
    }
    setError(null)
    setDocumentEditMode(editMode)
    setResumedCase(refreshed)
    setSelectedScenarioId(refreshed.scenarioId)
    setSurface('DOCUMENT_PREPARATION')
  }

  function openReviewApplication() {
    if (resumedCase === null) {
      setError('The saved synthetic Case is not available for review.')
      return
    }
    const refreshed = services.runtime.resumeCase({ caseId: resumedCase.caseId })
    if (refreshed.status === 'STORAGE_REQUIRES_RESET') {
      setSurface('RESET_REQUIRED')
      return
    }
    if (refreshed.status === 'STORAGE_UNAVAILABLE') {
      setSurface('STORAGE_UNAVAILABLE')
      return
    }
    if (refreshed.status !== 'CASE_RESUMED' || !isScenarioId(refreshed.scenarioId)) {
      setError('The saved synthetic Case could not be loaded safely for review.')
      return
    }
    if (refreshed.applicationState !== 'LOCKED' && refreshed.currentStep !== 'REVIEW') {
      const prepared = services.runtime.prepareReview({
        caseId: refreshed.caseId,
        idempotencyKey: `SYN-IDEMPOTENCY-A05-UI-REVIEW-${refreshed.caseId.slice('SYN-'.length)}-${String(refreshed.revision + 1).padStart(3, '0')}`,
      })
      if (
        prepared.status === 'STORAGE_REQUIRES_RESET' ||
        prepared.status === 'STORAGE_UNAVAILABLE'
      ) {
        handleDocumentRecovery(prepared.status)
        return
      }
      if (prepared.status !== 'REVIEW_PREPARED') {
        setError('Every required answer and demo document must be ready before review.')
        return
      }
    }
    const review = services.runtime.inspectReview({ caseId: refreshed.caseId })
    if (review.status === 'STORAGE_REQUIRES_RESET' || review.status === 'STORAGE_UNAVAILABLE') {
      handleDocumentRecovery(review.status)
      return
    }
    if (review.status !== 'REVIEW_INSPECTED') {
      setError('The authoritative demo review could not be prepared safely.')
      return
    }
    const current = services.runtime.resumeCase({ caseId: refreshed.caseId })
    if (current.status !== 'CASE_RESUMED') {
      setError('The prepared demo review could not be reloaded safely.')
      return
    }
    setError(null)
    setResumedCase(current)
    setSelectedScenarioId(refreshed.scenarioId)
    setSurface('REVIEW_APPLICATION')
  }

  function backToApplicationDetails() {
    if (resumedCase === null) {
      return
    }
    const refreshed = services.runtime.resumeCase({ caseId: resumedCase.caseId })
    if (refreshed.status === 'STORAGE_REQUIRES_RESET') {
      setSurface('RESET_REQUIRED')
      return
    }
    if (refreshed.status === 'STORAGE_UNAVAILABLE') {
      setSurface('STORAGE_UNAVAILABLE')
      return
    }
    if (refreshed.status === 'CASE_RESUMED') {
      openAdaptiveApplication(refreshed)
    }
  }

  function openPaymentApplication() {
    if (resumedCase === null) {
      setError('The submitted synthetic Case is not available for mock payment.')
      return
    }
    const inspected = services.runtime.inspectPayment({ caseId: resumedCase.caseId })
    if (inspected.status === 'STORAGE_REQUIRES_RESET' || inspected.status === 'STORAGE_UNAVAILABLE') {
      handleDocumentRecovery(inspected.status)
      return
    }
    if (inspected.status !== 'PAYMENT_INSPECTED') {
      setError('The submitted synthetic Case is not ready for the local payment simulation.')
      return
    }
    const refreshed = services.runtime.resumeCase({ caseId: resumedCase.caseId })
    if (refreshed.status !== 'CASE_RESUMED') {
      setError('The submitted synthetic Case could not be reloaded safely for payment.')
      return
    }
    setError(null)
    setResumedCase(refreshed)
    setPaymentFragment(true)
    setSurface('PAYMENT_APPLICATION')
  }

  function backToSubmittedApplication() {
    setError(null)
    setPaymentFragment(false)
    setSurface('REVIEW_APPLICATION')
  }

  function openStatusApplication() {
    if (resumedCase === null) {
      setError('The confirmed synthetic Case is not available for status review.')
      return
    }
    const started = services.runtime.beginScrutiny({ caseId: resumedCase.caseId })
    if (started.status === 'STORAGE_REQUIRES_RESET' || started.status === 'STORAGE_UNAVAILABLE') {
      handleDocumentRecovery(started.status)
      return
    }
    if (started.status !== 'SCRUTINY_STARTED' && started.status !== 'SCRUTINY_EXISTING') {
      setError('Synthetic review could not begin safely. The saved Case was not changed.')
      return
    }
    const inspected = services.runtime.inspectStatus({ caseId: resumedCase.caseId })
    if (inspected.status !== 'STATUS_INSPECTED') {
      setError('The authoritative synthetic status could not be read safely.')
      return
    }
    const refreshed = services.runtime.resumeCase({ caseId: resumedCase.caseId })
    if (refreshed.status !== 'CASE_RESUMED') {
      setError('The synthetic Case could not be reloaded safely for status.')
      return
    }
    setError(null)
    setResumedCase(refreshed)
    setStatusFragment(true)
    setSurface('STATUS_APPLICATION')
  }

  function handleDocumentRecovery(
    status: 'STORAGE_REQUIRES_RESET' | 'STORAGE_UNAVAILABLE',
  ) {
    setSurface(status === 'STORAGE_REQUIRES_RESET' ? 'RESET_REQUIRED' : 'STORAGE_UNAVAILABLE')
  }

  function resetDemoData() {
    setError(null)
    const result = services.resetDemoData()
    if (result.status === 'RESET') {
      setPaymentFragment(false)
      setStatusFragment(false)
      setSelectedScenarioId(null)
      setEvaluation(null)
      setCreatedCase(null)
      setResumedCase(null)
      setSurface('SCENARIO_SELECTION')
      return
    }
    setError('Demo data could not be reset because local browser storage is unavailable.')
    setSurface('STORAGE_UNAVAILABLE')
  }

  return (
    <div className={styles.appShell}>
      <header className={styles.siteHeader}>
        <PrototypeNotice />
        <div className={styles.headerInner}>
          <div className={styles.wordmark} aria-hidden="true">EV</div>
          <div>
            <p className={styles.headerLabel}>Applicant prototype</p>
            <h1>India e-Visa Reimagined</h1>
            <p>A simpler way to understand, prepare and track a synthetic e-Visa application.</p>
          </div>
        </div>
      </header>

      <main className={styles.mainContent}>
        {surface === 'LOADING' ? (
          <section className={styles.loadingPanel} aria-live="polite">
            <h2>Checking saved demo progress</h2>
            <p>Validating local synthetic state before it can be used.</p>
          </section>
        ) : null}
        {surface === 'SCENARIO_SELECTION' ? (
          <ScenarioSelection
            selectedScenarioId={selectedScenarioId}
            error={error}
            onSelect={chooseScenario}
          />
        ) : null}
        {surface === 'PURPOSE_GUIDANCE' && evaluation ? (
          <PurposeGuidance
            evaluation={evaluation}
            error={error}
            onContinue={continueWithDemo}
            onChooseAnother={chooseAnotherPurpose}
          />
        ) : null}
        {surface === 'CASE_CREATED' && createdCase ? (
          <CaseCreated
            createdCase={createdCase}
            error={error}
            onStart={startApplication}
          />
        ) : null}
        {surface === 'RESUME_CASE' && resumedCase ? (
          <ResumeCase
            resumedCase={resumedCase}
            error={error}
            onResume={resumeApplication}
          />
        ) : null}
        {surface === 'ADAPTIVE_APPLICATION' && resumedCase && evaluation && isScenarioId(resumedCase.scenarioId) ? (
          <AdaptiveApplication
            services={services}
            resumedCase={resumedCase}
            evaluation={evaluation}
            purposeName={scenarioDetails(resumedCase.scenarioId).name}
            onBack={backToSavedCase}
            onPrepareDocuments={() => openDocumentPreparation()}
          />
        ) : null}
        {surface === 'DOCUMENT_PREPARATION' && resumedCase && isScenarioId(resumedCase.scenarioId) ? (
          <DocumentPreparation
            services={services}
            caseId={resumedCase.caseId}
            purposeName={scenarioDetails(resumedCase.scenarioId).name}
            editMode={documentEditMode}
            onBack={backToApplicationDetails}
            onReviewApplication={openReviewApplication}
            onRecoveryRequired={handleDocumentRecovery}
          />
        ) : null}
        {surface === 'REVIEW_APPLICATION' && resumedCase ? (
          <ReviewApplication
            services={services}
            caseId={resumedCase.caseId}
            onEditApplication={backToApplicationDetails}
            onEditDocuments={() => openDocumentPreparation(true)}
            onContinueToPayment={openPaymentApplication}
            onRecoveryRequired={handleDocumentRecovery}
          />
        ) : null}
        {surface === 'PAYMENT_APPLICATION' && resumedCase ? (
          <PaymentApplication
            services={services}
            caseId={resumedCase.caseId}
            onBackToSubmittedApplication={backToSubmittedApplication}
            onContinueToStatus={openStatusApplication}
            onRecoveryRequired={handleDocumentRecovery}
          />
        ) : null}
        {surface === 'STATUS_APPLICATION' && resumedCase ? (
          <StatusApplication
            services={services}
            caseId={resumedCase.caseId}
            onRecoveryRequired={handleDocumentRecovery}
          />
        ) : null}
        {surface === 'RESET_REQUIRED' ? (
          <RecoveryPanel
            storageUnavailable={false}
            error={error}
            onReset={resetDemoData}
          />
        ) : null}
        {surface === 'STORAGE_UNAVAILABLE' ? (
          <RecoveryPanel
            storageUnavailable
            error={error}
            onReset={resetDemoData}
          />
        ) : null}
      </main>

      <footer className={styles.siteFooter}>
        <p>Hackathon proof of concept · Synthetic policy and local mock boundaries only</p>
      </footer>
    </div>
  )
}

export default App
