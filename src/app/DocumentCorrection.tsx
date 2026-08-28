import { useState } from 'react'
import { Link } from 'react-router-dom'

import type { SyntheticId } from '../domain'
import { formatFileSize, inspectLocalDocumentFile, localFileRequirement } from '../documents'
import type { RuntimeCorrectionSummary } from '../runtime'
import { applicantReference } from './applicant-labels'
import type { AppRuntimeServices } from './create-app-runtime'
import styles from './DocumentCorrection.module.css'

type DocumentCorrectionProps = Readonly<{
  services: AppRuntimeServices
  caseId: SyntheticId
  demoEnabled: boolean
  statusPath: string
  onCorrectionSubmitted(): void
  onRecoveryRequired(status: 'STORAGE_REQUIRES_RESET' | 'STORAGE_UNAVAILABLE'): void
}>

function versionLabel(fixtureId: SyntheticId): string {
  return fixtureId === 'SYN-FIXTURE-HOSPITAL-LETTER-V2-001'
    ? 'Corrected hospital letter'
    : 'Current hospital letter'
}

export function DocumentCorrection(props: DocumentCorrectionProps) {
  const [correction, setCorrection] = useState<RuntimeCorrectionSummary | null>(() => {
    const inspected = props.services.runtime.inspectCorrection({ caseId: props.caseId })
    return inspected.status === 'CORRECTION_INSPECTED' ? inspected : null
  })
  const [message, setMessage] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [fileSummary, setFileSummary] = useState<Readonly<{ name: string; sizeBytes: number }> | null>(null)
  const [fileErrors, setFileErrors] = useState<readonly string[]>([])

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
      setMessage('The corrected letter is ready.')
      return
    }
    setMessage('The corrected letter could not be checked safely. The current document was not changed.')
  }

  async function prepareLocalReplacement(file: File) {
    setWorking(true)
    setMessage(null)
    setFileErrors([])
    setFileSummary({ name: file.name, sizeBytes: file.size })
    const validation = await inspectLocalDocumentFile('SYNTHETIC_HOSPITAL_LETTER', file)
    if (!validation.valid) {
      setFileErrors(validation.errors)
      setWorking(false)
      return
    }
    const result = props.services.runtime.prepareLocalCorrection({
      caseId: props.caseId,
      fileName: file.name,
      mimeType: validation.metadata.mimeType,
      sizeBytes: validation.metadata.sizeBytes,
      idempotencyKey: `SYN-IDEMPOTENCY-CORRECTION-${props.caseId.slice('SYN-'.length)}-LOCAL-V2`,
    })
    setWorking(false)
    if (result.status === 'STORAGE_REQUIRES_RESET' || result.status === 'STORAGE_UNAVAILABLE') {
      props.onRecoveryRequired(result.status)
      return
    }
    if (result.status === 'CORRECTION_REPLACEMENT_READY' || result.status === 'CORRECTION_EXISTING') {
      refreshCorrection()
      setMessage('The corrected letter is ready.')
      return
    }
    setMessage('The corrected letter could not be checked safely. The current document was not changed.')
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
    setMessage('The correction could not be submitted safely. Review has not resumed.')
  }

  if (correction === null) {
    return (
      <section className={styles.correctionPage} aria-labelledby="correction-heading">
        <p className={styles.eyebrow}>Status · Step 6 of 6</p>
        <h2 id="correction-heading" tabIndex={-1}>Correction is unavailable</h2>
        <p role="alert">The application could not provide the requested correction.</p>
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
          Check the corrected document, then submit it for review.
        </p>
        <p>{props.demoEnabled
          ? 'For this prototype, a sample corrected document is provided.'
          : 'Files are checked in your browser for this prototype and are not uploaded.'}</p>
        <p className={styles.caseReference}>Application reference {applicantReference(correction.caseId)}</p>
      </header>

      <section className={styles.reasonPanel} aria-labelledby="correction-reason-heading">
        <p className={styles.sectionLabel}>Action required</p>
        <h3 id="correction-reason-heading">What needs to be corrected</h3>
        <p>The admission date on the hospital letter could not be confirmed during review.</p>
      </section>

      <section className={styles.versionCard} aria-labelledby="current-version-heading">
        <div className={styles.versionHeading}>
          <div>
            <p className={styles.sectionLabel}>Current document</p>
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
            <p className={styles.sectionLabel}>Corrected replacement</p>
            <strong>Corrected hospital letter</strong>
            {props.demoEnabled ? <button
              className={styles.primaryButton}
              type="button"
              disabled={working}
              onClick={prepareReplacement}
            >
              {working ? 'Checking document…' : 'Use corrected letter'}
            </button> : <>
              <label className={styles.fileLabel} htmlFor="corrected-hospital-letter">
                Choose corrected hospital letter
              </label>
              <input
                className={styles.fileInput}
                id="corrected-hospital-letter"
                type="file"
                accept={localFileRequirement('SYNTHETIC_HOSPITAL_LETTER').accept}
                aria-describedby={`corrected-hospital-status${fileErrors.length > 0 ? ' corrected-hospital-errors' : ''}`}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0]
                  if (file !== undefined) void prepareLocalReplacement(file)
                }}
              />
              {fileSummary === null ? <p id="corrected-hospital-status">Not uploaded</p> : (
                <div className={styles.fileSummary} id="corrected-hospital-status">
                  <strong>Selected file</strong>
                  <span>{fileSummary.name}</span>
                  <span>PDF · {formatFileSize(fileSummary.sizeBytes)}</span>
                </div>
              )}
              {fileErrors.length > 0 ? (
                <div className={styles.inlineError} id="corrected-hospital-errors" role="alert">
                  <ul>
                    {fileErrors.map((error) => <li key={error}>{error}</li>)}
                  </ul>
                </div>
              ) : null}
            </>}
          </div>
        ) : (
          <div className={styles.readyPanel} role="status">
            <strong>Correction ready</strong>
            <p>The corrected letter is ready to submit.</p>
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
          <p className={styles.historyNote}>The previous hospital letter remains in the application history.</p>
        ) : null}
        {message ? (
          <p className={message.startsWith('The corrected letter is ready') ? styles.successMessage : styles.inlineError} role="status">
            {message}
          </p>
        ) : null}
      </section>

    </section>
  )
}
