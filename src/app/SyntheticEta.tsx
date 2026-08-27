import { Link, useLocation } from 'react-router-dom'

import type { SyntheticId } from '../domain'
import { applicantReference, OFFICIAL_CATEGORY_NAMES, PURPOSE_NAMES } from './applicant-labels'
import type { AppRuntimeServices } from './create-app-runtime'
import styles from './StatusApplication.module.css'

export function SyntheticEta(props: {
  services: AppRuntimeServices
  caseId: SyntheticId
  statusPath: string
}) {
  const location = useLocation()
  const demoEnabled = new URLSearchParams(location.search).get('demo') === '1'
  const inspected = props.services.runtime.inspectStatus({ caseId: props.caseId })
  const status =
    inspected.status === 'STATUS_INSPECTED' && inspected.etaState === 'ISSUED'
      ? inspected
      : null

  if (status === null || status.syntheticEtaReference === null) {
    return (
      <section className={styles.statusPage} aria-labelledby="eta-heading">
        <h2 id="eta-heading" tabIndex={-1}>Electronic Travel Authorization unavailable</h2>
        <p role="alert">An Electronic Travel Authorization is not available for this application.</p>
      </section>
    )
  }

  return (
    <section className={styles.statusPage} aria-labelledby="eta-heading">
      <Link className={styles.backLink} to={props.statusPath}>
        <span aria-hidden="true">←</span> Back to status
      </Link>

      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Application outcome</p>
        <h2 id="eta-heading" tabIndex={-1}>Electronic Travel Authorization issued</h2>
        <p>Your application has been approved.</p>
        <p className={styles.caseReference}>Application reference {applicantReference(status.caseId)}</p>
      </header>

      <section className={styles.etaArtifact} aria-labelledby="eta-artifact-heading">
        <p className={styles.etaWatermark} aria-hidden="true">SAMPLE — NOT VALID</p>
        <div className={styles.etaContent}>
          <p className={styles.sectionLabel}>Application outcome</p>
          <h3 id="eta-artifact-heading">Electronic Travel Authorization</h3>
          <p className={styles.etaWarning}>
            <strong>SAMPLE — NOT VALID. This is not a visa or travel document.</strong>
          </p>
          <p className={styles.borderDisclaimer}>
            Entry into India is decided separately at the border.
          </p>
          <dl className={styles.etaMetadata}>
            <div>
              <dt>Application reference</dt>
              <dd>{applicantReference(status.caseId)}</dd>
            </div>
            <div>
              <dt>Purpose</dt>
              <dd>{PURPOSE_NAMES[status.purposeFamily]}</dd>
            </div>
            <div>
              <dt>e-Visa category</dt>
              <dd>{OFFICIAL_CATEGORY_NAMES[status.purposeFamily]}</dd>
            </div>
            <div>
              <dt>ETA reference</dt>
              <dd>{applicantReference(status.syntheticEtaReference)}</dd>
            </div>
            {demoEnabled ? (
              <div>
                <dt>Policy version</dt>
                <dd>{status.policyQualifiedVersion}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </section>
    </section>
  )
}
