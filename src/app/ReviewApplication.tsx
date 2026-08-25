import { useState, type FormEvent } from 'react'

import type { SyntheticId } from '../domain'
import type { RuntimeReviewSummary } from '../runtime'
import {
  applicantAnswerLabel,
  DOCUMENT_FIXTURE_LABELS,
  DOCUMENT_NAMES,
  PURPOSE_NAMES,
} from './applicant-labels'
import type { AppRuntimeServices } from './create-app-runtime'
import styles from './ReviewApplication.module.css'

type ReviewApplicationProps = Readonly<{
  services: AppRuntimeServices
  caseId: SyntheticId
  onEditApplication(): void
  onEditDocuments(): void
  onRecoveryRequired(status: 'STORAGE_REQUIRES_RESET' | 'STORAGE_UNAVAILABLE'): void
}>

function submissionIdempotencyKey(caseId: SyntheticId): SyntheticId {
  return `SYN-IDEMPOTENCY-A05-UI-SUBMIT-${caseId.slice('SYN-'.length)}`
}

function readReview(
  services: AppRuntimeServices,
  caseId: SyntheticId,
): RuntimeReviewSummary | null {
  const result = services.runtime.inspectReview({ caseId })
  return result.status === 'REVIEW_INSPECTED' ? result : null
}

export function ReviewApplication(props: ReviewApplicationProps) {
  const [review, setReview] = useState(() => readReview(props.services, props.caseId))
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function submitDemoApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!confirmed || review === null) {
      setError('Confirm the synthetic demo declaration before submitting.')
      document.getElementById('demo-submission-confirmation')?.focus()
      return
    }

    setError(null)
    const result = props.services.runtime.submitApplication({
      caseId: props.caseId,
      idempotencyKey: submissionIdempotencyKey(props.caseId),
    })
    if (result.status === 'STORAGE_REQUIRES_RESET' || result.status === 'STORAGE_UNAVAILABLE') {
      props.onRecoveryRequired(result.status)
      return
    }
    if (
      result.status !== 'APPLICATION_SUBMITTED' &&
      result.status !== 'APPLICATION_ALREADY_SUBMITTED'
    ) {
      setError(
        'This demo application could not be submitted safely. Review your saved details and documents before trying again.',
      )
      document.getElementById('review-heading')?.focus()
      return
    }

    const refreshed = readReview(props.services, props.caseId)
    if (refreshed === null) {
      setError('The submitted demo application could not be reloaded safely.')
      return
    }
    setReview(refreshed)
    setConfirmed(false)
    document.getElementById('review-heading')?.focus()
  }

  if (review === null) {
    return (
      <section className={styles.reviewPanel} aria-labelledby="review-heading">
        <p className={styles.eyebrow}>Review · Step 4 of 6</p>
        <h2 id="review-heading" tabIndex={-1}>Review is unavailable</h2>
        <p role="alert">
          The saved demo application could not produce a complete, policy-consistent review.
        </p>
      </section>
    )
  }

  const purposeName = PURPOSE_NAMES[review.purposeFamily]

  if (review.locked) {
    return (
      <section
        className={styles.submittedPanel}
        aria-labelledby="review-heading"
        aria-live="polite"
      >
        <div className={styles.completionMarker} aria-hidden="true">✓</div>
        <p className={styles.eyebrow}>Review · Step 4 of 6</p>
        <h2 id="review-heading" tabIndex={-1}>Application submitted in demo</h2>
        <p>
          This synthetic application was submitted and locked locally. Nothing was sent to a government system.
        </p>
        <dl className={styles.submissionFacts}>
          <div>
            <dt>Purpose</dt>
            <dd>{purposeName}</dd>
          </div>
          <div>
            <dt>Synthetic case reference</dt>
            <dd>{review.caseId}</dd>
          </div>
        </dl>
        <div className={styles.nextStep}>
          <span>Next</span>
          <strong>Payment</strong>
          <p>The next step will use a local simulated payment. No money or payment details are involved.</p>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.reviewPanel} aria-labelledby="review-heading">
      <header className={styles.reviewHeader}>
        <p className={styles.eyebrow}>Review · Step 4 of 6</p>
        <h2 id="review-heading" tabIndex={-1}>Review your demo application</h2>
        <p>Check the synthetic application details before simulated submission.</p>
        <p className={styles.caseReference}>Synthetic case {review.caseId}</p>
      </header>

      <div className={styles.summaryList}>
        <section className={styles.summarySection} aria-labelledby="review-purpose-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionLabel}>Purpose</p>
              <h3 id="review-purpose-heading">{purposeName}</h3>
            </div>
          </div>
          <p className={styles.policyLine}>Pinned demo policy {review.policyQualifiedVersion}</p>
        </section>

        <section className={styles.summarySection} aria-labelledby="review-answers-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionLabel}>Application details</p>
              <h3 id="review-answers-heading">Your synthetic answers</h3>
            </div>
            <button className={styles.editButton} type="button" onClick={props.onEditApplication}>
              Edit application details
            </button>
          </div>
          <dl className={styles.answerList}>
            {review.answers.map((answer) => (
              <div key={answer.questionId}>
                <dt>{answer.prompt}</dt>
                <dd>{applicantAnswerLabel(answer.answerValue)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={styles.summarySection} aria-labelledby="review-documents-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionLabel}>Documents</p>
              <h3 id="review-documents-heading">Required demo documents</h3>
            </div>
            <button className={styles.editButton} type="button" onClick={props.onEditDocuments}>
              Edit documents
            </button>
          </div>
          <ul className={styles.documentList}>
            {review.documents.map((document) => (
              <li key={document.requirementId}>
                <div>
                  <strong>{DOCUMENT_NAMES[document.documentType] ?? 'Synthetic document'}</strong>
                  <span>{DOCUMENT_FIXTURE_LABELS[document.fixtureId] ?? 'Bundled synthetic fixture'}</span>
                </div>
                <span className={styles.readyStatus}>Ready</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.feePanel} aria-labelledby="review-fee-heading">
          <div>
            <p className={styles.sectionLabel}>Demo fee</p>
            <h3 id="review-fee-heading">
              {review.syntheticFee.amount} {review.syntheticFee.unit}
            </h3>
          </div>
          <strong>{review.syntheticFee.label}</strong>
        </section>
      </div>

      <form className={styles.confirmationPanel} onSubmit={submitDemoApplication}>
        <div>
          <p className={styles.sectionLabel}>Final confirmation</p>
          <h3>Ready for simulated submission?</h3>
          <p>This action is local to the prototype and will lock ordinary editing.</p>
        </div>
        <label className={styles.confirmationControl}>
          <input
            id="demo-submission-confirmation"
            type="checkbox"
            checked={confirmed}
            aria-describedby={error === null ? undefined : 'submission-error'}
            onChange={(event) => {
              setConfirmed(event.currentTarget.checked)
              if (event.currentTarget.checked) {
                setError(null)
              }
            }}
          />
          <span>I confirm these synthetic demo details are ready for simulated submission.</span>
        </label>
        {error ? (
          <p className={styles.inlineError} id="submission-error" role="alert">{error}</p>
        ) : null}
        <button className={styles.submitButton} type="submit" disabled={!confirmed}>
          Submit demo application <span aria-hidden="true">→</span>
        </button>
        <p className={styles.submissionNote}>Synthetic submission only. Nothing is sent.</p>
      </form>
    </section>
  )
}
