import { useEffect } from 'react'

import type { SyntheticId } from '../domain'
import type { RuntimeStatusSummary } from '../runtime'
import { PURPOSE_NAMES } from './applicant-labels'
import type { AppRuntimeServices } from './create-app-runtime'
import styles from './StatusApplication.module.css'

type StatusApplicationProps = Readonly<{
  services: AppRuntimeServices
  caseId: SyntheticId
  onRecoveryRequired(status: 'STORAGE_REQUIRES_RESET' | 'STORAGE_UNAVAILABLE'): void
}>

export function StatusApplication(props: StatusApplicationProps) {
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
        <div className={styles.statusMarker} aria-hidden="true">···</div>
        <p className={styles.sectionLabel}>Current status</p>
        <h3 id="projected-status-heading">{status.headline}</h3>
        <p>{status.explanation}</p>
        {status.waitMessage ? (
          <div className={styles.noActionPanel} role="status">
            <strong>Nothing needed from you</strong>
            <p>{status.waitMessage}</p>
          </div>
        ) : null}
      </section>

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
        <p>This does not represent government scrutiny, a decision, or a processing promise.</p>
        <p>Policy pin: {status.policyQualifiedVersion}</p>
      </aside>
    </section>
  )
}
