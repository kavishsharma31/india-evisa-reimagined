import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'

import type { SyntheticId } from '../domain'
import type { RuntimeReviewSummary } from '../runtime'
import {
  applicantAnswerLabel,
  applicantQuestionPrompt,
  applicantReference,
  DOCUMENT_NAMES,
  PURPOSE_NAMES,
} from './applicant-labels'
import type { AppRuntimeServices } from './create-app-runtime'
import styles from './ReviewApplication.module.css'

type ReviewApplicationProps = Readonly<{
  services: AppRuntimeServices
  caseId: SyntheticId
  applicationPath: string
  documentsPath: string
  paymentPath: string
  onSubmitted(): void
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
  const location = useLocation()
  const demoEnabled = new URLSearchParams(location.search).get('demo') === '1'
  const [review, setReview] = useState(() => readReview(props.services, props.caseId))
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function submitDemoApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!confirmed || review === null) {
      setError('Confirm the declaration before submitting.')
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
        'This application could not be submitted safely. Review your saved details and documents before trying again.',
      )
      document.getElementById('review-heading')?.focus()
      return
    }

    const refreshed = readReview(props.services, props.caseId)
    if (refreshed === null) {
      setError('The submitted application could not be reloaded safely.')
      return
    }
    setReview(refreshed)
    setConfirmed(false)
    props.onSubmitted()
  }

  if (review === null) {
    return (
      <section className={styles.reviewPanel} aria-labelledby="review-heading">
        <p className={styles.eyebrow}>Review · Step 4 of 6</p>
        <h2 id="review-heading" tabIndex={-1}>Review is unavailable</h2>
        <p role="alert">
          The saved application could not produce a complete review.
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
        <h2 id="review-heading" tabIndex={-1}>Application submitted</h2>
        <p>Your application has been submitted and is now read-only.</p>
        <dl className={styles.submissionFacts}>
          <div>
            <dt>Purpose</dt>
            <dd>{purposeName}</dd>
          </div>
          <div>
            <dt>Application reference</dt>
            <dd>{applicantReference(review.caseId)}</dd>
          </div>
        </dl>
        <div className={styles.nextStep}>
          <span>Next</span>
          <strong>Payment</strong>
          <p>Continue to the visa fee step.</p>
          <Link className={styles.nextStepButton} to={props.paymentPath}>
            Continue to payment <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.reviewPanel} aria-labelledby="review-heading">
      <Link className={styles.backLink} to={props.documentsPath}>
        <span aria-hidden="true">←</span> Back to documents
      </Link>
      <header className={styles.reviewHeader}>
        <p className={styles.eyebrow}>Review · Step 4 of 6</p>
        <h2 id="review-heading" tabIndex={-1}>Review your application</h2>
        <p>Check your application details before submitting.</p>
        <p className={styles.caseReference}>Application reference {applicantReference(review.caseId)}</p>
      </header>

      <div className={styles.summaryList}>
        <section className={styles.summarySection} aria-labelledby="review-purpose-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionLabel}>Purpose</p>
              <h3 id="review-purpose-heading">{purposeName}</h3>
            </div>
          </div>
          {demoEnabled ? <p className={styles.policyLine}>Policy version {review.policyQualifiedVersion}</p> : null}
        </section>

        <section className={styles.summarySection} aria-labelledby="review-answers-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionLabel}>Application details</p>
              <h3 id="review-answers-heading">Your answers</h3>
            </div>
            <Link className={styles.editButton} to={props.applicationPath}>
              Edit application details
            </Link>
          </div>
          <dl className={styles.answerList}>
            {review.answers.map((answer) => (
              <div key={answer.questionId}>
                <dt>{applicantQuestionPrompt(answer.questionId, answer.prompt)}</dt>
                <dd>{applicantAnswerLabel(answer.answerValue)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={styles.summarySection} aria-labelledby="review-documents-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionLabel}>Documents</p>
              <h3 id="review-documents-heading">Required documents</h3>
            </div>
            <Link className={styles.editButton} to={props.documentsPath} state={{ editDocuments: true }}>
              Edit documents
            </Link>
          </div>
          <ul className={styles.documentList}>
            {review.documents.map((document) => (
              <li key={document.requirementId}>
                <div>
                  <strong>{DOCUMENT_NAMES[document.documentType] ?? 'Document'}</strong>
                </div>
                <span className={styles.readyStatus}>Ready</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.feePanel} aria-labelledby="review-fee-heading">
          <div>
            <p className={styles.sectionLabel}>Visa fee</p>
            <h3 id="review-fee-heading">Not calculated in this prototype</h3>
          </div>
          <strong>Visa fees vary by nationality and visa category.</strong>
        </section>
      </div>

      <form className={styles.confirmationPanel} onSubmit={submitDemoApplication}>
        <div>
          <p className={styles.sectionLabel}>Final confirmation</p>
          <h3>Ready to submit your application?</h3>
          <p>Submitting will lock your application details and documents.</p>
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
          <span>I confirm these application details are complete and ready to submit.</span>
        </label>
        {error ? (
          <p className={styles.inlineError} id="submission-error" role="alert">{error}</p>
        ) : null}
        <button className={styles.submitButton} type="submit" disabled={!confirmed}>
          Submit application <span aria-hidden="true">→</span>
        </button>
        <p className={styles.submissionNote}>You can review your submitted application before payment.</p>
      </form>
    </section>
  )
}
