import { Link } from 'react-router-dom'

import type { SyntheticId } from '../domain'
import { OFFICIAL_CATEGORY_NAMES, PURPOSE_NAMES } from './applicant-labels'
import type { AppRuntimeServices } from './create-app-runtime'
import styles from './StatusApplication.module.css'

export function SyntheticEta(props: {
  services: AppRuntimeServices
  caseId: SyntheticId
  statusPath: string
}) {
  const inspected = props.services.runtime.inspectStatus({ caseId: props.caseId })
  const status =
    inspected.status === 'STATUS_INSPECTED' && inspected.etaState === 'ISSUED'
      ? inspected
      : null

  if (status === null || status.syntheticEtaReference === null) {
    return (
      <section className={styles.statusPage} aria-labelledby="eta-heading">
        <h2 id="eta-heading" tabIndex={-1}>Synthetic ETA is unavailable</h2>
        <p role="alert">This route cannot issue or reveal an ETA before the authoritative case is ready.</p>
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
        <h2 id="eta-heading" tabIndex={-1}>Synthetic ETA issued</h2>
        <p>This non-valid prototype artifact reflects the authoritative local demo outcome.</p>
        <p className={styles.caseReference}>Synthetic case {status.caseId}</p>
      </header>

      <section className={styles.etaArtifact} aria-labelledby="synthetic-eta-heading">
        <p className={styles.etaWatermark} aria-hidden="true">SYNTHETIC — NOT VALID</p>
        <div className={styles.etaContent}>
          <p className={styles.sectionLabel}>Prototype outcome</p>
          <h3 id="synthetic-eta-heading">Synthetic ETA details</h3>
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
              <dt>e-Visa category</dt>
              <dd>{OFFICIAL_CATEGORY_NAMES[status.purposeFamily]}</dd>
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
    </section>
  )
}
