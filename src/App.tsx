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
import { DOCUMENT_NAMES, PURPOSE_NAMES } from './app/applicant-labels'
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
} from './app/navigation'
import type { SyntheticId } from './domain'
import { getSeed, type RecoverySeed, type RecoverySeedId } from './fixtures'
import type { PolicyEvaluationResult } from './policy'
import styles from './App.module.css'

const PROTOTYPE_NOTICE =
  'UNOFFICIAL HACKATHON PROTOTYPE — SYNTHETIC DATA ONLY — CANNOT SUBMIT A VISA APPLICATION'

type AppProps = Readonly<{ services?: AppRuntimeServices }>

function createCaseIdempotencyKey(scenarioId: ScenarioId): SyntheticId {
  return scenarioId === 'SYN-MEDICAL-001'
    ? 'SYN-IDEMPOTENCY-UI-CREATE-MEDICAL-001'
    : 'SYN-IDEMPOTENCY-UI-CREATE-TOURIST-001'
}

function beginDraftIdempotencyKey(caseId: SyntheticId): SyntheticId {
  return `SYN-IDEMPOTENCY-UI-BEGIN-${caseId.slice('SYN-'.length)}-001`
}

function PrototypeNotice() {
  return (
    <p className={styles.prototypeNotice} role="note">
      <span className={styles.noticeMarker} aria-hidden="true">Demo</span>
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
        <h2 id="scenario-heading" tabIndex={-1}>What are you travelling to India for?</h2>
        <p className={styles.lead}>
          Choose a controlled synthetic scenario. We’ll use its versioned demo policy to explain what comes next.
        </p>
      </div>

      <fieldset className={styles.scenarioFieldset}>
        <legend className={styles.visuallyHidden}>Choose one synthetic travel purpose</legend>
        {SCENARIOS.map((scenario, index) => (
          <label
            className={`${styles.scenarioCard} ${index === 0 ? styles.primaryScenario : ''}`}
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
                    : 'We could not confirm support for that demo scenario. No application has been created.',
                )
              }}
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
        <p className={styles.selectionHint}>Select a purpose, then continue to its demo-policy guidance.</p>
        {selectionError ? <p className={styles.inlineError} role="alert">{selectionError}</p> : null}
        {continuePath === null ? (
          <button className={styles.primaryButton} type="button" disabled>Continue</button>
        ) : (
          <Link className={styles.primaryButton} to={continuePath}>
            Continue <span aria-hidden="true">→</span>
          </Link>
        )}
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
  backPath: string
  error: string | null
  onContinue(): void
}) {
  const purposeName = props.evaluation.suggestedPurposeFamily
    ? PURPOSE_NAMES[props.evaluation.suggestedPurposeFamily]
    : 'Selected purpose'
  const questions = props.evaluation.questionManifest?.questions ?? []
  const requirements = props.evaluation.documentManifest?.requirements ?? []
  const fee = props.evaluation.syntheticFee

  return (
    <section className={styles.guidance} aria-labelledby="guidance-heading">
      <Link className={styles.textButton} to={props.backPath}>
        <span aria-hidden="true">←</span> Back to visa purposes
      </Link>
      <div className={styles.guidanceHeader}>
        <p className={styles.eyebrow}>Purpose guidance · Step 1 of 6</p>
        <h2 id="guidance-heading" tabIndex={-1}>{purposeName}</h2>
        <p className={styles.demoDisclaimer}>
          This purpose is supported by the selected demo scenario. It is not a legal eligibility decision.
        </p>
      </div>

      <div className={styles.guidanceGrid}>
        <section className={styles.guidanceSection} aria-labelledby="questions-heading">
          <div className={styles.sectionHeading}>
            <span className={styles.sectionNumber} aria-hidden="true">01</span>
            <div><h3 id="questions-heading">What we’ll ask</h3><p>Only bounded synthetic choices from this demo policy.</p></div>
          </div>
          <ul className={styles.plainList}>{questions.map((question) => <li key={question.id}>{question.prompt}</li>)}</ul>
        </section>

        <section className={styles.guidanceSection} aria-labelledby="documents-heading">
          <div className={styles.sectionHeading}>
            <span className={styles.sectionNumber} aria-hidden="true">02</span>
            <div><h3 id="documents-heading">Demo documents</h3><p>Bundled project-created fixtures only.</p></div>
          </div>
          <ul className={styles.requirementList}>
            {requirements.map((requirement) => (
              <li key={requirement.id}><span aria-hidden="true">✓</span>{DOCUMENT_NAMES[requirement.documentType] ?? requirement.documentType}</li>
            ))}
          </ul>
        </section>

        {fee ? (
          <section className={styles.feePanel} aria-labelledby="fee-heading">
            <div><p className={styles.feeLabel} id="fee-heading">Synthetic demo fee</p><p className={styles.feeAmount}>{fee.amount} {fee.unit}</p></div>
            <strong>{fee.label}</strong>
          </section>
        ) : null}
      </div>

      <details className={styles.policyDetails}>
        <summary>Why am I seeing this?</summary>
        <div className={styles.policyDetailBody}>
          <p>This guidance comes from demo policy <strong>{props.evaluation.policy.qualifiedVersion}</strong>.</p>
          <ul>{props.evaluation.reasons.map((reason) => <li key={reason.code}>{reason.explanation}</li>)}</ul>
          <p className={styles.provenanceLine}>Sources: {props.evaluation.provenance.map(({ sourceLabel }) => sourceLabel).join(' · ')}</p>
        </div>
      </details>

      {props.error ? <p className={styles.inlineError} role="alert">{props.error}</p> : null}
      <div className={styles.actions}>
        <button className={styles.primaryButton} type="button" onClick={props.onContinue}>
          Continue with this demo <span aria-hidden="true">→</span>
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
  return (
    <section className={props.created ? styles.outcomePanel : styles.resumePanel} aria-labelledby="case-created-heading">
      {props.created ? <div className={styles.outcomeMarker} aria-hidden="true">✓</div> : null}
      <p className={styles.eyebrow}>Application · Step 2 of 6</p>
      <h2 id="case-created-heading" tabIndex={-1}>{props.created ? 'Your synthetic application has been created' : 'Continue your application'}</h2>
      <p>Your {props.projection.scenario.name.toLowerCase()} demo case is saved in this browser and pinned to its policy.</p>
      <dl className={styles.caseFacts}>
        <div><dt>Purpose</dt><dd>{props.projection.scenario.name}</dd></div>
        <div><dt>Synthetic case reference</dt><dd>{props.projection.caseId}</dd></div>
        <div><dt>Demo policy</dt><dd>{props.projection.resumedCase.policyQualifiedVersion}</dd></div>
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
      <p className={styles.eyebrow}>Local demo storage</p>
      <h2 id="recovery-heading" tabIndex={-1}>{props.storageUnavailable ? 'Progress cannot be saved in this browser' : 'Saved demo data cannot be read'}</h2>
      <p>{props.storageUnavailable
        ? 'This prototype requires local browser storage to preserve synthetic progress. Storage is currently unavailable.'
        : 'The local synthetic demo state is incompatible or corrupted. It has not been trusted or changed.'}</p>
      {props.error ? <p className={styles.inlineError} role="alert">{props.error}</p> : null}
      {!props.storageUnavailable ? <button className={styles.primaryButton} type="button" onClick={props.onReset}>Reset demo data</button> : null}
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
  if (pathname.endsWith('/eta')) return 'Synthetic ETA — India e-Visa Reimagined'
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
        <p>No saved synthetic application matches this address. Nothing was created or changed.</p>
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
    setError('The synthetic case could not be created safely. Your saved demo data was not changed.')
  }

  return <PurposeGuidance evaluation={evaluated.evaluation} backPath={withPreservedDemo('/', location.search)} error={error} onContinue={createCase} />
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
        if (evaluated.status !== 'POLICY_EVALUATED') return <p role="alert">The pinned demo policy could not safely provide this application form.</p>
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
          <div><p className={styles.headerLabel}>Applicant prototype</p><h1>India e-Visa Reimagined</h1><p>A simpler way to understand, prepare and track a synthetic e-Visa application.</p></div>
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
          <p>Hackathon proof of concept · Synthetic policy and local mock boundaries only</p>
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
