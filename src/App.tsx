import { useEffect, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useNavigationType,
  useParams,
} from 'react-router-dom'

import { AdaptiveApplication } from './app/AdaptiveApplication'
import { DemoControls } from './app/DemoControls'
import { DocumentCorrection } from './app/DocumentCorrection'
import { DocumentPreparation } from './app/DocumentPreparation'
import { JourneyNavigation } from './app/JourneyNavigation'
import { PaymentApplication } from './app/PaymentApplication'
import { ReviewApplication } from './app/ReviewApplication'
import { StatusApplication } from './app/StatusApplication'
import { SyntheticEta } from './app/SyntheticEta'
import { applicantQuestionPrompt, applicantReference, DOCUMENT_NAMES, PURPOSE_NAMES } from './app/applicant-labels'
import { createAppRuntime, type AppRuntimeServices } from './app/create-app-runtime'
import {
  SCENARIOS,
  applicationPath,
  guardedDestination,
  projectCaseNavigation,
  scenarioFromSlug,
  withPreservedDemo,
  type CaseNavigationProjection,
  type CaseStage,
  type ScenarioId,
  type Scenario,
} from './app/navigation'
import type { SyntheticId } from './domain'
import { getSeed, type RecoverySeed, type RecoverySeedId } from './fixtures'
import type { PolicyEvaluationResult } from './policy'
import styles from './App.module.css'

const PROTOTYPE_NOTICE =
  'UNOFFICIAL HACKATHON PROTOTYPE — NO REAL APPLICATIONS OR PAYMENTS'

type AppProps = Readonly<{ services?: AppRuntimeServices }>

function createCaseIdempotencyKey(scenarioId: ScenarioId): SyntheticId {
  return `SYN-IDEMPOTENCY-UI-CREATE-${scenarioId.slice('SYN-'.length)}-001`
}

function beginDraftIdempotencyKey(caseId: SyntheticId): SyntheticId {
  return `SYN-IDEMPOTENCY-UI-BEGIN-${caseId.slice('SYN-'.length)}-001`
}

function PrototypeNotice() {
  return (
    <p className={styles.prototypeNotice} role="note">
      <span>{PROTOTYPE_NOTICE}</span>
    </p>
  )
}

function ScenarioSelection({ services }: { services: AppRuntimeServices }) {
  const location = useLocation()
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const selectedScenario = scenarioFromSlug(selectedSlug ?? undefined)
  const selectedSupported = selectedScenario !== null &&
    services.runtime.evaluateScenario({ scenarioId: selectedScenario.id }).status === 'POLICY_EVALUATED'
  const continuePath = !selectedSupported || selectedScenario === null
    ? null
    : withPreservedDemo(`/apply/${selectedScenario.slug}`, location.search)

  return (
    <section className={styles.entryLayout} aria-labelledby="scenario-heading">
      <div className={styles.entryIntroduction}>
        <p className={styles.eyebrow}>Purpose guidance</p>
        <h2 id="scenario-heading" tabIndex={-1}>Why are you travelling to India?</h2>
        <p className={styles.lead}>
          Choose the purpose that best matches your trip.
        </p>
      </div>

      <fieldset className={styles.scenarioFieldset}>
        <legend className={styles.visuallyHidden}>Choose one travel purpose</legend>
        {SCENARIOS.map((scenario) => (
          <label
            className={styles.scenarioCard}
            key={scenario.id}
          >
            <input
              type="radio"
              name="scenario"
              value={scenario.slug}
              checked={selectedSlug === scenario.slug}
              onChange={() => {
                setSelectedSlug(scenario.slug)
                const result = services.runtime.evaluateScenario({ scenarioId: scenario.id })
                setSelectionError(
                  result.status === 'POLICY_EVALUATED'
                    ? null
                    : 'We could not confirm that purpose. No application has been created.',
                )
              }}
            />
            <span className={styles.scenarioCopy}>
              <span className={styles.scenarioTopline}>
                <strong>{scenario.name}</strong>
              </span>
              <span>{scenario.officialCategory}</span>
            </span>
            <span className={styles.radioIndicator} aria-hidden="true" />
          </label>
        ))}
        <p className={styles.selectionHint}>Select a purpose, then continue to view the requirements.</p>
        {selectionError ? <p className={styles.inlineError} role="alert">{selectionError}</p> : null}
        {continuePath === null ? (
          <button className={styles.primaryButton} type="button" disabled>Continue</button>
        ) : (
          <Link className={styles.primaryButton} to={continuePath}>
            Continue <span aria-hidden="true">→</span>
          </Link>
        )}
      </fieldset>

    </section>
  )
}

function PurposeGuidance(props: {
  scenario: Scenario
  evaluation: PolicyEvaluationResult
  backPath: string
  error: string | null
  onContinue(): void
}) {
  const location = useLocation()
  const demoEnabled = new URLSearchParams(location.search).get('demo') === '1'
  const purposeName = props.evaluation.suggestedPurposeFamily
    ? PURPOSE_NAMES[props.evaluation.suggestedPurposeFamily]
    : 'Selected purpose'
  const questions = props.evaluation.questionManifest?.questions ?? []
  const requirements = props.evaluation.documentManifest?.requirements ?? []
  const feeAvailable = props.evaluation.syntheticFee !== undefined

  return (
    <section className={styles.guidance} aria-labelledby="guidance-heading">
      <Link className={styles.textButton} to={props.backPath}>
        <span aria-hidden="true">←</span> Back to visa purposes
      </Link>
      <div className={styles.guidanceHeader}>
        <p className={styles.eyebrow}>Purpose guidance · Step 1 of 6</p>
        <h2 id="guidance-heading" tabIndex={-1}>{purposeName}</h2>
        <p><strong>{props.scenario.officialCategory}</strong></p>
        <p>{props.scenario.description}</p>
        <p className={styles.demoDisclaimer}>{props.scenario.scopeNote}</p>
        <p className={styles.demoDisclaimer}>Requirements shown here are simplified and do not determine eligibility.</p>
      </div>

      <div className={styles.guidanceGrid}>
        <section className={styles.guidanceSection} aria-labelledby="questions-heading">
          <div className={styles.sectionHeading}>
            <span className={styles.sectionNumber} aria-hidden="true">01</span>
            <div><h3 id="questions-heading">What you’ll need to provide</h3><p>Information about your travel plans and the purpose of your visit.</p></div>
          </div>
          <ul className={styles.plainList}>{questions.map((question) => <li key={question.id}>{applicantQuestionPrompt(question.id, question.prompt)}</li>)}</ul>
        </section>

        <section className={styles.guidanceSection} aria-labelledby="documents-heading">
          <div className={styles.sectionHeading}>
            <span className={styles.sectionNumber} aria-hidden="true">02</span>
            <div><h3 id="documents-heading">Required documents</h3><p>Prepare clear copies of each document before you continue.</p></div>
          </div>
          <ul className={styles.requirementList}>
            {requirements.map((requirement) => (
              <li key={requirement.id}><span aria-hidden="true">✓</span>{DOCUMENT_NAMES[requirement.documentType] ?? requirement.documentType}</li>
            ))}
          </ul>
        </section>

        {feeAvailable ? (
          <section className={styles.feePanel} aria-labelledby="fee-heading">
            <div>
              <p className={styles.feeLabel} id="fee-heading">Visa fee</p>
              <p className={styles.feeAmount}>Varies by nationality and category</p>
            </div>
            <strong>Visa fees vary by nationality and visa category.</strong>
          </section>
        ) : null}
      </div>

      {demoEnabled ? (
        <details className={styles.policyDetails}>
          <summary>Demo policy details</summary>
          <div className={styles.policyDetailBody}>
            <p>Policy version <strong>{props.evaluation.policy.qualifiedVersion}</strong></p>
            <ul>{props.evaluation.reasons.map((reason) => <li key={reason.code}>{reason.explanation}</li>)}</ul>
            <p className={styles.provenanceLine}>Sources: {props.evaluation.provenance.map(({ sourceLabel }) => sourceLabel).join(' · ')}</p>
          </div>
        </details>
      ) : null}

      {props.error ? <p className={styles.inlineError} role="alert">{props.error}</p> : null}
      <div className={styles.actions}>
        <button className={styles.primaryButton} type="button" onClick={props.onContinue}>
          Continue application <span aria-hidden="true">→</span>
        </button>
        <Link className={styles.secondaryButton} to={props.backPath}>Choose a different purpose</Link>
      </div>
    </section>
  )
}

function CaseStart(props: {
  projection: CaseNavigationProjection
  created: boolean
  error: string | null
  onStart(): void
}) {
  const location = useLocation()
  const demoEnabled = new URLSearchParams(location.search).get('demo') === '1'
  return (
    <section className={props.created ? styles.outcomePanel : styles.resumePanel} aria-labelledby="case-created-heading">
      {props.created ? <div className={styles.outcomeMarker} aria-hidden="true">✓</div> : null}
      <p className={styles.eyebrow}>Application · Step 2 of 6</p>
      <h2 id="case-created-heading" tabIndex={-1}>{props.created ? 'Your application has been created' : 'Continue your application'}</h2>
      <p>Your {props.projection.scenario.name.toLowerCase()} application is saved in this browser.</p>
      <dl className={styles.caseFacts}>
        <div><dt>Purpose</dt><dd>{props.projection.scenario.name}</dd></div>
        <div><dt>Application reference</dt><dd>{applicantReference(props.projection.caseId)}</dd></div>
        {demoEnabled ? <div><dt>Policy version</dt><dd>{props.projection.resumedCase.policyQualifiedVersion}</dd></div> : null}
      </dl>
      {props.error ? <p className={styles.inlineError} role="alert">{props.error}</p> : null}
      <button className={styles.primaryButton} type="button" onClick={props.onStart}>Start application <span aria-hidden="true">→</span></button>
      <p className={styles.actionNote}>This starts the saved draft. It does not submit anything.</p>
    </section>
  )
}

function RecoveryPanel(props: { storageUnavailable: boolean; error?: string | null; onReset(): void }) {
  return (
    <section className={styles.recoveryPanel} aria-labelledby="recovery-heading">
      <p className={styles.eyebrow}>Saved application</p>
      <h2 id="recovery-heading" tabIndex={-1}>{props.storageUnavailable ? 'Progress cannot be saved in this browser' : 'Saved application data cannot be read'}</h2>
      <p>{props.storageUnavailable
        ? 'This browser cannot save your progress right now.'
        : 'The saved application data is incompatible or corrupted. It has not been trusted or changed.'}</p>
      {props.error ? <p className={styles.inlineError} role="alert">{props.error}</p> : null}
      {!props.storageUnavailable ? <button className={styles.primaryButton} type="button" onClick={props.onReset}>Clear saved application data</button> : null}
    </section>
  )
}

function pageTitle(pathname: string): string {
  const scenarioMatch = pathname.match(/^\/apply\/([^/]+)$/)
  if (scenarioMatch) return `${scenarioFromSlug(scenarioMatch[1])?.pageTitle ?? 'Purpose'} — India e-Visa Reimagined`
  if (pathname.endsWith('/documents')) return 'Documents — India e-Visa Reimagined'
  if (pathname.endsWith('/review')) return 'Review — India e-Visa Reimagined'
  if (pathname.endsWith('/payment')) return 'Payment — India e-Visa Reimagined'
  if (pathname.endsWith('/correction')) return 'Correction — India e-Visa Reimagined'
  if (pathname.endsWith('/status')) return 'Status — India e-Visa Reimagined'
  if (pathname.endsWith('/eta')) return 'Electronic Travel Authorization — India e-Visa Reimagined'
  if (pathname.startsWith('/application/')) return 'Application — India e-Visa Reimagined'
  return 'India e-Visa Reimagined'
}

function RouteEffects() {
  const location = useLocation()
  const navigationType = useNavigationType()
  useEffect(() => {
    document.title = pageTitle(location.pathname)
    if (navigationType !== 'POP') {
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
    document.querySelector<HTMLElement>('main h2[tabindex="-1"]')?.focus({ preventScroll: true })
  }, [location.pathname, navigationType])
  return null
}

function seedDestination(seed: RecoverySeed): string {
  if (seed.expectedState.eta === 'ISSUED') return applicationPath(seed.caseId, 'eta')
  if (seed.expectedState.payment === 'CONFIRMED') return applicationPath(seed.caseId, 'status')
  if (seed.expectedState.application === 'LOCKED') return applicationPath(seed.caseId, 'payment')
  if (seed.expectedState.currentStep === 'DOCUMENTS') return applicationPath(seed.caseId, 'documents')
  if (seed.expectedState.currentStep === 'REVIEW') return applicationPath(seed.caseId, 'review')
  return applicationPath(seed.caseId)
}

function CaseBoundary(props: {
  services: AppRuntimeServices
  refreshVersion: number
  stage: CaseStage
  onReset(): void
  children(projection: CaseNavigationProjection): ReactNode
}) {
  const { caseId } = useParams()
  const location = useLocation()
  void props.refreshVersion
  const projection = projectCaseNavigation(props.services, caseId)
  if (projection.status === 'CASE_NOT_FOUND') {
    return (
      <section className={styles.recoveryPanel} aria-labelledby="case-not-found-heading">
        <p className={styles.eyebrow}>Application lookup</p>
        <h2 id="case-not-found-heading" tabIndex={-1}>Application not found</h2>
        <p>No saved application matches this address. Nothing was created or changed.</p>
        <Link className={styles.primaryButton} to={withPreservedDemo('/', location.search)}>
          Back to visa purposes
        </Link>
      </section>
    )
  }
  if (projection.status === 'RESET_REQUIRED') return <RecoveryPanel storageUnavailable={false} onReset={props.onReset} />
  if (projection.status === 'STORAGE_UNAVAILABLE') return <RecoveryPanel storageUnavailable onReset={props.onReset} />
  const redirect = guardedDestination(projection, props.stage)
  if (redirect !== null) return <Navigate to={withPreservedDemo(redirect, location.search)} replace />
  return <><JourneyNavigation projection={projection} currentStage={props.stage} />{props.children(projection)}</>
}

function PurposeRoute(props: { services: AppRuntimeServices }) {
  const { scenarioSlug } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const scenario = scenarioFromSlug(scenarioSlug)
  if (scenario === null) return <Navigate to={withPreservedDemo('/', location.search)} replace />
  const evaluated = props.services.runtime.evaluateScenario({ scenarioId: scenario.id })
  if (evaluated.status !== 'POLICY_EVALUATED') return <Navigate to={withPreservedDemo('/', location.search)} replace />

  function createCase() {
    if (scenario === null) return
    setError(null)
    const result = props.services.runtime.createCase({ scenarioId: scenario.id, idempotencyKey: createCaseIdempotencyKey(scenario.id) })
    if (result.status === 'COMMAND_ACCEPTED' || result.status === 'EXISTING_CASE') {
      navigate(withPreservedDemo(applicationPath(result.caseId), location.search), { state: { created: result.status === 'COMMAND_ACCEPTED' } })
      return
    }
    setError('The application could not be created safely. Your saved data was not changed.')
  }

  return <PurposeGuidance scenario={scenario} evaluation={evaluated.evaluation} backPath={withPreservedDemo('/', location.search)} error={error} onContinue={createCase} />
}

function LandingRoute(props: { services: AppRuntimeServices; onReset(): void }) {
  const inspected = props.services.runtime.inspectState()
  if (inspected.status === 'STORAGE_REQUIRES_RESET') {
    return <RecoveryPanel storageUnavailable={false} onReset={props.onReset} />
  }
  if (inspected.status === 'STORAGE_UNAVAILABLE') {
    return <RecoveryPanel storageUnavailable onReset={props.onReset} />
  }
  return <ScenarioSelection services={props.services} />
}

type SharedRouteProps = {
  services: AppRuntimeServices
  refreshVersion: number
  onStateChanged(): void
  onReset(): void
}

function ApplicationRoute(props: SharedRouteProps) {
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  return (
    <CaseBoundary {...props} stage="application">
      {(projection) => {
        if (projection.resumedCase.applicationState === 'DRAFT_CREATED') {
          return <CaseStart projection={projection} created={Boolean((location.state as { created?: boolean } | null)?.created)} error={error} onStart={() => {
            const result = props.services.runtime.beginDraft({ caseId: projection.caseId, idempotencyKey: beginDraftIdempotencyKey(projection.caseId) })
            if (result.status === 'COMMAND_ACCEPTED') {
              setError(null)
              window.scrollTo({ top: 0 })
              props.onStateChanged()
            }
            else setError('The draft could not be started safely. No application state was changed.')
          }} />
        }
        const evaluated = props.services.runtime.evaluateScenario({ scenarioId: projection.scenario.id })
        if (evaluated.status !== 'POLICY_EVALUATED') return <p role="alert">The application form could not be loaded safely.</p>
        return <AdaptiveApplication
          services={props.services}
          resumedCase={projection.resumedCase}
          evaluation={evaluated.evaluation}
          purposeName={projection.scenario.name}
          backPath={withPreservedDemo(`/apply/${projection.scenario.slug}`, location.search)}
          documentsPath={withPreservedDemo(applicationPath(projection.caseId, 'documents'), location.search)}
        />
      }}
    </CaseBoundary>
  )
}

function DocumentsRoute(props: SharedRouteProps) {
  const location = useLocation()
  return (
    <CaseBoundary {...props} stage="documents">
      {(projection) => <DocumentPreparation
        services={props.services}
        caseId={projection.caseId}
        purposeName={projection.scenario.name}
        editMode={Boolean((location.state as { editDocuments?: boolean } | null)?.editDocuments)}
        demoEnabled={new URLSearchParams(location.search).get('demo') === '1'}
        applicationPath={withPreservedDemo(applicationPath(projection.caseId), location.search)}
        reviewPath={withPreservedDemo(applicationPath(projection.caseId, 'review'), location.search)}
        onPrepareReview={() => {
          const current = props.services.runtime.resumeCase({ caseId: projection.caseId })
          if (current.status === 'CASE_RESUMED' && current.currentStep === 'REVIEW') return true
          if (current.status !== 'CASE_RESUMED') return false
          const result = props.services.runtime.prepareReview({
            caseId: projection.caseId,
            idempotencyKey: `SYN-IDEMPOTENCY-A05-UI-REVIEW-${projection.caseId.slice('SYN-'.length)}-${String(current.revision + 1).padStart(3, '0')}`,
          })
          if (result.status === 'REVIEW_PREPARED') { props.onStateChanged(); return true }
          return false
        }}
        onRecoveryRequired={props.onStateChanged}
      />}
    </CaseBoundary>
  )
}

function ReviewRoute(props: SharedRouteProps) {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <CaseBoundary {...props} stage="review">
      {(projection) => {
        const paymentPath = withPreservedDemo(applicationPath(projection.caseId, 'payment'), location.search)
        return <ReviewApplication
          services={props.services}
          caseId={projection.caseId}
          applicationPath={withPreservedDemo(applicationPath(projection.caseId), location.search)}
          documentsPath={withPreservedDemo(applicationPath(projection.caseId, 'documents'), location.search)}
          paymentPath={paymentPath}
          onSubmitted={() => { props.onStateChanged(); navigate(paymentPath) }}
          onRecoveryRequired={props.onStateChanged}
        />
      }}
    </CaseBoundary>
  )
}

function PaymentRoute(props: SharedRouteProps) {
  const location = useLocation()
  return (
    <CaseBoundary {...props} stage="payment">
      {(projection) => <PaymentApplication
        services={props.services}
        caseId={projection.caseId}
        reviewPath={withPreservedDemo(applicationPath(projection.caseId, 'review'), location.search)}
        statusPath={withPreservedDemo(applicationPath(projection.caseId, 'status'), location.search)}
        onRecoveryRequired={props.onStateChanged}
      />}
    </CaseBoundary>
  )
}

function StatusRoute(props: SharedRouteProps) {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <CaseBoundary {...props} stage="status">
      {(projection) => {
        const etaPath = withPreservedDemo(applicationPath(projection.caseId, 'eta'), location.search)
        return <StatusApplication
          services={props.services}
          caseId={projection.caseId}
          paymentPath={withPreservedDemo(applicationPath(projection.caseId, 'payment'), location.search)}
          correctionPath={withPreservedDemo(applicationPath(projection.caseId, 'correction'), location.search)}
          etaPath={etaPath}
          onEtaIssued={() => { props.onStateChanged(); navigate(etaPath) }}
          onRecoveryRequired={props.onStateChanged}
        />
      }}
    </CaseBoundary>
  )
}

function CorrectionRoute(props: SharedRouteProps) {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <CaseBoundary {...props} stage="correction">
      {(projection) => {
        const statusPath = withPreservedDemo(applicationPath(projection.caseId, 'status'), location.search)
        return <DocumentCorrection
          services={props.services}
          caseId={projection.caseId}
          demoEnabled={new URLSearchParams(location.search).get('demo') === '1'}
          statusPath={statusPath}
          onCorrectionSubmitted={() => { props.onStateChanged(); navigate(statusPath) }}
          onRecoveryRequired={props.onStateChanged}
        />
      }}
    </CaseBoundary>
  )
}

function EtaRoute(props: SharedRouteProps) {
  const location = useLocation()
  return (
    <CaseBoundary {...props} stage="eta">
      {(projection) => <SyntheticEta
        services={props.services}
        caseId={projection.caseId}
        statusPath={withPreservedDemo(applicationPath(projection.caseId, 'status'), location.search)}
      />}
    </CaseBoundary>
  )
}

function RoutedApp({ services }: { services: AppRuntimeServices }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [demoControlFeedback, setDemoControlFeedback] = useState<string | null>(null)
  const [loadingDemoSeed, setLoadingDemoSeed] = useState(false)
  const demoEnabled = new URLSearchParams(location.search).get('demo') === '1'
  const onStateChanged = () => setRefreshVersion((current) => current + 1)

  function resetDemoData() {
    const result = services.resetDemoData()
    if (result.status === 'RESET') {
      setDemoControlFeedback('Reset to the canonical clean demo state.')
      navigate(withPreservedDemo('/', location.search))
    } else setDemoControlFeedback('Demo data could not be reset because local browser storage is unavailable.')
  }

  function loadDemoSeed(seedId: RecoverySeedId) {
    flushSync(() => setLoadingDemoSeed(true))
    const result = services.loadDemoSeed(seedId)
    if (result.status === 'SAVED') {
      const seed = getSeed(seedId)
      setDemoControlFeedback(`Loaded ${seedId}.`)
      setTimeout(() => {
        navigate(withPreservedDemo(seedDestination(seed), location.search))
      }, 0)
    } else setDemoControlFeedback('The canonical seed could not be saved to local demo storage.')
    setLoadingDemoSeed(false)
  }

  const sharedRouteProps = { services, refreshVersion, onStateChanged, onReset: resetDemoData }
  return (
    <div className={styles.appShell} data-testid="app-shell">
      <RouteEffects />
      <header className={styles.siteHeader}>
        <PrototypeNotice />
        <div className={styles.headerInner}>
          <div className={styles.wordmark} aria-hidden="true">EV</div>
          <div><p className={styles.headerLabel}>e-Visa service</p><h1>India e-Visa Reimagined</h1><p>A simpler way to understand, prepare and track an e-Visa application.</p></div>
        </div>
      </header>
      {demoEnabled ? <DemoControls feedback={demoControlFeedback} onLoadSeed={loadDemoSeed} onReset={resetDemoData} /> : null}
      <main className={styles.mainContent} data-testid="app-main">
        {loadingDemoSeed ? <p role="status">Loading selected demo state…</p> : <Routes>
          <Route path="/" element={<LandingRoute services={services} onReset={resetDemoData} />} />
          <Route path="/apply/:scenarioSlug" element={<PurposeRoute services={services} />} />
          <Route path="/application/:caseId" element={<ApplicationRoute {...sharedRouteProps} />} />
          <Route path="/application/:caseId/documents" element={<DocumentsRoute {...sharedRouteProps} />} />
          <Route path="/application/:caseId/review" element={<ReviewRoute {...sharedRouteProps} />} />
          <Route path="/application/:caseId/payment" element={<PaymentRoute {...sharedRouteProps} />} />
          <Route path="/application/:caseId/status" element={<StatusRoute {...sharedRouteProps} />} />
          <Route path="/application/:caseId/correction" element={<CorrectionRoute {...sharedRouteProps} />} />
          <Route path="/application/:caseId/eta" element={<EtaRoute {...sharedRouteProps} />} />
          <Route path="*" element={<Navigate to={withPreservedDemo('/', location.search)} replace />} />
        </Routes>}
      </main>
      <footer className={styles.siteFooter}>
        <div className={styles.footerInner}>
          <p>Hackathon prototype. Not an official Government of India service.</p>
        </div>
      </footer>
    </div>
  )
}

function App({ services: providedServices }: AppProps) {
  const [services] = useState(() => providedServices ?? createAppRuntime())
  return <BrowserRouter><RoutedApp services={services} /></BrowserRouter>
}

export default App
