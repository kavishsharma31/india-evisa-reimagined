import { useEffect, useRef, useState } from 'react'

import type { SyntheticId } from '../domain'
import type { RuntimeStatusSummary } from '../runtime'
import { PURPOSE_NAMES } from './applicant-labels'
import type { AppRuntimeServices } from './create-app-runtime'
import styles from './StatusApplication.module.css'

type StatusApplicationProps = Readonly<{
  services: AppRuntimeServices
  caseId: SyntheticId
  onOpenCorrection(): void
  onRecoveryRequired(status: 'STORAGE_REQUIRES_RESET' | 'STORAGE_UNAVAILABLE'): void
}>

export function StatusApplication(props: StatusApplicationProps) {
  const [, setRefreshIndex] = useState(0)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const focusIssuedStatus = useRef(false)
  const projectedStatusHeading = useRef<HTMLHeadingElement>(null)
  const inspected = props.services.runtime.inspectStatus({ caseId: props.caseId })
  const status: RuntimeStatusSummary | null =
    inspected.status === 'STATUS_INSPECTED' ? inspected : null

  useEffect(() => {
    if (
      inspected.status === 'STORAGE_REQUIRES_RESET' ||
      inspected.status === 'STORAGE_UNAVAILABLE'
    ) {
      props.onRecoveryRequired(inspected.status)
    }
  }, [inspected.status, props])

  useEffect(() => {
    if (focusIssuedStatus.current && status?.etaState === 'ISSUED') {
      projectedStatusHeading.current?.focus()
      focusIssuedStatus.current = false
    }
  }, [status?.etaState])

  function requestCorrection() {
    setActionMessage(null)
    const result = props.services.runtime.requestMedicalCorrection({ caseId: props.caseId })
    if (result.status === 'STORAGE_REQUIRES_RESET' || result.status === 'STORAGE_UNAVAILABLE') {
      props.onRecoveryRequired(result.status)
      return
    }
    if (
      result.status === 'CORRECTION_REQUESTED' ||
      result.status === 'CORRECTION_REQUEST_EXISTING'
    ) {
      if (result.status === 'CORRECTION_REQUESTED') {
        setActionMessage(
          'Simulated delivery failed. Your synthetic case status is unchanged. A local retry then delivered the demo notice.',
        )
      }
      setRefreshIndex((current) => current + 1)
      return
    }
    setActionMessage('The synthetic review outcome could not be recorded safely.')
  }

  function completeSyntheticReview() {
    setActionMessage(null)
    const result = props.services.runtime.completeSyntheticReview({ caseId: props.caseId })
    if (result.status === 'STORAGE_REQUIRES_RESET' || result.status === 'STORAGE_UNAVAILABLE') {
      props.onRecoveryRequired(result.status)
      return
    }
    if (
      result.status === 'SYNTHETIC_REVIEW_COMPLETED' ||
      result.status === 'SYNTHETIC_REVIEW_EXISTING'
    ) {
      focusIssuedStatus.current = true
      setRefreshIndex((current) => current + 1)
      return
    }
    setActionMessage('The local synthetic review could not be completed safely.')
  }

  if (status === null) {
    return (
      <section className={styles.statusPage} aria-labelledby="status-heading">
        <p className={styles.eyebrow}>Status · Step 6 of 6</p>
        <h2 id="status-heading" tabIndex={-1}>Status is unavailable</h2>
        <p role="alert">The authoritative synthetic Case could not provide a safe status.</p>
      </section>
    )
  }

  return (
    <section className={styles.statusPage} aria-labelledby="status-heading">
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Status · Step 6 of 6</p>
        <h2 id="status-heading" tabIndex={-1}>Track your demo application</h2>
        <p>Follow the authoritative local status of this synthetic application.</p>
        <p className={styles.caseReference}>Synthetic case {status.caseId}</p>
      </header>

      <section className={styles.primaryStatus} aria-labelledby="projected-status-heading">
        <div className={styles.statusMarker} aria-hidden="true">
          {status.etaState === 'ISSUED' ? '✓' : '···'}
        </div>
        <p className={styles.sectionLabel}>Current status</p>
        <h3 id="projected-status-heading" ref={projectedStatusHeading} tabIndex={-1}>
          {status.headline}
        </h3>
        <p>{status.explanation}</p>
        {status.actionGuidance ? <p className={styles.actionGuidance}>{status.actionGuidance}</p> : null}
        {status.nextAction === 'REPLACE_HOSPITAL_LETTER' ? (
          <button className={styles.primaryAction} type="button" onClick={props.onOpenCorrection}>
            Replace hospital letter
          </button>
        ) : null}
        {status.waitMessage ? (
          <div className={styles.noActionPanel} role="status">
            <strong>Nothing needed from you</strong>
            <p>{status.waitMessage}</p>
          </div>
        ) : null}
      </section>

      {status.etaState === 'ISSUED' && status.syntheticEtaReference !== null ? (
        <section className={styles.etaArtifact} aria-labelledby="synthetic-eta-heading">
          <p className={styles.etaWatermark} aria-hidden="true">SYNTHETIC — NOT VALID</p>
          <div className={styles.etaContent}>
            <p className={styles.sectionLabel}>Prototype outcome</p>
            <h3 id="synthetic-eta-heading">Synthetic ETA issued</h3>
            <p className={styles.etaWarning}>
              <strong>SYNTHETIC — NOT VALID. This is not a visa or travel document.</strong>
            </p>
            <p className={styles.borderDisclaimer}>
              Entry into India is decided separately at the border.
            </p>
            <dl className={styles.etaMetadata}>
              <div>
                <dt>Synthetic Case reference</dt>
                <dd>{status.caseId}</dd>
              </div>
              <div>
                <dt>Purpose</dt>
                <dd>{PURPOSE_NAMES[status.purposeFamily]}</dd>
              </div>
              <div>
                <dt>Synthetic ETA reference</dt>
                <dd>{status.syntheticEtaReference}</dd>
              </div>
              <div>
                <dt>Policy version</dt>
                <dd>{status.policyQualifiedVersion}</dd>
              </div>
            </dl>
          </div>
        </section>
      ) : null}

      {actionMessage ? (
        <p
          className={actionMessage.startsWith('Simulated') ? styles.notificationEvidence : styles.inlineError}
          role={actionMessage.startsWith('Simulated') ? 'status' : 'alert'}
        >
          {actionMessage}
        </p>
      ) : null}

      {status.demoReviewAction === 'REQUEST_MEDICAL_CORRECTION' ? (
        <details className={styles.demoControl}>
          <summary>Demo review control</summary>
          <p>
            Exercise the one approved fictional hospital-letter correction. This is not a reviewer interface.
          </p>
          <button type="button" onClick={requestCorrection}>
            Simulate hospital-letter review outcome
          </button>
        </details>
      ) : null}

      {status.demoReviewAction === 'COMPLETE_SYNTHETIC_REVIEW' ? (
        <details className={styles.demoControl}>
          <summary>Demo review control</summary>
          <p>
            Finish the deterministic local review simulation. This is not an applicant action,
            government review, or government decision.
          </p>
          <button type="button" onClick={completeSyntheticReview}>
            Complete synthetic review
          </button>
        </details>
      ) : null}

      <section className={styles.journeySection} aria-labelledby="journey-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionLabel}>Journey summary</p>
            <h3 id="journey-heading">What is happening now</h3>
          </div>
          <span className={styles.purposeTag}>{PURPOSE_NAMES[status.purposeFamily]}</span>
        </div>
        <dl className={styles.journeyFacts}>
          {status.journeyFacts.map((fact) => (
            <div key={fact.id} data-state={fact.state}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <aside className={styles.prototypeContext} aria-label="Simulation boundary">
        <strong>Local synthetic review only</strong>
        <p>
          This does not establish legal eligibility, government visa issuance, guaranteed entry,
          or a processing promise.
        </p>
        <p>Policy pin: {status.policyQualifiedVersion}</p>
      </aside>
    </section>
  )
}
