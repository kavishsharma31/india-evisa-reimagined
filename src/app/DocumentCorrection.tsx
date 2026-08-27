import { useState } from 'react'
import { Link } from 'react-router-dom'

import type { SyntheticId } from '../domain'
import type { RuntimeCorrectionSummary } from '../runtime'
import type { AppRuntimeServices } from './create-app-runtime'
import styles from './DocumentCorrection.module.css'

type DocumentCorrectionProps = Readonly<{
  services: AppRuntimeServices
  caseId: SyntheticId
  statusPath: string
  onCorrectionSubmitted(): void
  onRecoveryRequired(status: 'STORAGE_REQUIRES_RESET' | 'STORAGE_UNAVAILABLE'): void
}>

function versionLabel(fixtureId: SyntheticId): string {
  return fixtureId === 'SYN-FIXTURE-HOSPITAL-LETTER-V2-001'
    ? 'Hospital letter V2 — corrected demo'
    : 'Hospital letter V1'
}

export function DocumentCorrection(props: DocumentCorrectionProps) {
  const [correction, setCorrection] = useState<RuntimeCorrectionSummary | null>(() => {
    const inspected = props.services.runtime.inspectCorrection({ caseId: props.caseId })
    return inspected.status === 'CORRECTION_INSPECTED' ? inspected : null
  })
  const [message, setMessage] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  function refreshCorrection(): boolean {
    const inspected = props.services.runtime.inspectCorrection({ caseId: props.caseId })
    if (inspected.status === 'CORRECTION_INSPECTED') {
      setCorrection(inspected)
      return true
    }
    if (
      inspected.status === 'STORAGE_REQUIRES_RESET' ||
      inspected.status === 'STORAGE_UNAVAILABLE'
    ) {
      props.onRecoveryRequired(inspected.status)
      return false
    }
    setMessage('The saved correction could not be read safely.')
    return false
  }

  function prepareReplacement() {
    if (correction === null) {
      return
    }
    setWorking(true)
    setMessage(null)
    const result = props.services.runtime.prepareCorrection({
      caseId: props.caseId,
      fixtureId: correction.replacementOption.fixtureId,
    })
    setWorking(false)
    if (result.status === 'STORAGE_REQUIRES_RESET' || result.status === 'STORAGE_UNAVAILABLE') {
      props.onRecoveryRequired(result.status)
      return
    }
    if (
      result.status === 'CORRECTION_REPLACEMENT_READY' ||
      result.status === 'CORRECTION_EXISTING'
    ) {
      refreshCorrection()
      setMessage('The corrected bundled letter passed the local technical check.')
      return
    }
    setMessage('The corrected demo letter could not be prepared safely. No version was forced.')
  }

  function submitCorrection() {
    setWorking(true)
    setMessage(null)
    const result = props.services.runtime.submitCorrection({ caseId: props.caseId })
    setWorking(false)
    if (result.status === 'STORAGE_REQUIRES_RESET' || result.status === 'STORAGE_UNAVAILABLE') {
      props.onRecoveryRequired(result.status)
      return
    }
    if (result.status === 'CORRECTION_SUBMITTED' || result.status === 'CORRECTION_EXISTING') {
      props.onCorrectionSubmitted()
      return
    }
    setMessage('The correction could not be submitted safely. Synthetic review has not resumed.')
  }

  if (correction === null) {
    return (
      <section className={styles.correctionPage} aria-labelledby="correction-heading">
        <p className={styles.eyebrow}>Status · Step 6 of 6</p>
        <h2 id="correction-heading" tabIndex={-1}>Correction is unavailable</h2>
        <p role="alert">The authoritative synthetic Case could not provide a safe correction.</p>
        <Link className={styles.secondaryButton} to={props.statusPath}>
          Back to status
        </Link>
      </section>
    )
  }

  const replacementReady = correction.stage === 'REPLACEMENT_READY'
  const v1 = correction.versionHistory.find(
    ({ fixtureId }) => fixtureId === 'SYN-FIXTURE-HOSPITAL-LETTER-V1-001',
  )

  return (
    <section className={styles.correctionPage} aria-labelledby="correction-heading">
      <Link className={styles.backButton} to={props.statusPath}>
        <span aria-hidden="true">←</span> Back to status
      </Link>

      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Status · Step 6 of 6</p>
        <h2 id="correction-heading" tabIndex={-1}>Replace your hospital letter</h2>
        <p>
          Use the one corrected bundled demo fixture. Nothing is selected from your device.
        </p>
        <p className={styles.caseReference}>Synthetic case {correction.caseId}</p>
      </header>

      <section className={styles.reasonPanel} aria-labelledby="correction-reason-heading">
        <p className={styles.sectionLabel}>Why this is needed</p>
        <h3 id="correction-reason-heading">One controlled correction</h3>
        <p>
          The admission date on the demo hospital letter could not be confirmed during synthetic review.
        </p>
        <p>This correction is for the bundled fixture only. It is not a visa finding.</p>
      </section>

      <section className={styles.versionCard} aria-labelledby="current-version-heading">
        <div className={styles.versionHeading}>
          <div>
            <p className={styles.sectionLabel}>Current version</p>
            <h3 id="current-version-heading">
              {versionLabel(correction.currentVersion.fixtureId)}
            </h3>
          </div>
          <span data-state={correction.currentVersion.state}>
            {replacementReady ? 'Ready' : 'Needs correction'}
          </span>
        </div>

        {!replacementReady ? (
          <div className={styles.replacementChoice}>
            <p className={styles.sectionLabel}>Corrected bundled replacement</p>
            <strong>{versionLabel(correction.replacementOption.fixtureId)}</strong>
            <p>{correction.replacementOption.watermark}</p>
            <button
              className={styles.primaryButton}
              type="button"
              disabled={working}
              onClick={prepareReplacement}
            >
              {working ? 'Checking corrected letter…' : 'Use corrected demo letter'}
            </button>
          </div>
        ) : (
          <div className={styles.readyPanel} role="status">
            <strong>Correction ready</strong>
            <p>The corrected bundled letter passed the local technical check.</p>
            <button
              className={styles.primaryButton}
              type="button"
              disabled={working}
              onClick={submitCorrection}
            >
              {working ? 'Submitting correction…' : 'Submit correction'}
            </button>
          </div>
        )}

        {v1?.state === 'SUPERSEDED' ? (
          <p className={styles.historyNote}>Hospital letter V1 remains preserved in version history as superseded.</p>
        ) : null}
        {message ? (
          <p className={message.startsWith('The corrected bundled') ? styles.successMessage : styles.inlineError} role="status">
            {message}
          </p>
        ) : null}
      </section>

      <aside className={styles.prototypeContext} aria-label="Synthetic re-upload boundary">
        <strong>Synthetic re-upload</strong>
        <p>No file picker, upload, real hospital record, or external review system is used.</p>
      </aside>
    </section>
  )
}
