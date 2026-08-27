import { useState } from 'react'
import { Link } from 'react-router-dom'

import type { SyntheticId } from '../domain'
import type { RuntimePaymentSummary } from '../runtime'
import { applicantReference, PURPOSE_NAMES } from './applicant-labels'
import type { AppRuntimeServices } from './create-app-runtime'
import styles from './PaymentApplication.module.css'

type PaymentApplicationProps = Readonly<{
  services: AppRuntimeServices
  caseId: SyntheticId
  reviewPath: string
  statusPath: string
  onRecoveryRequired(status: 'STORAGE_REQUIRES_RESET' | 'STORAGE_UNAVAILABLE'): void
}>

function readPayment(
  services: AppRuntimeServices,
  caseId: SyntheticId,
): RuntimePaymentSummary | null {
  const result = services.runtime.inspectPayment({ caseId })
  return result.status === 'PAYMENT_INSPECTED' ? result : null
}

export function PaymentApplication(props: PaymentApplicationProps) {
  const [payment, setPayment] = useState(() => readPayment(props.services, props.caseId))
  const [error, setError] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  function refreshPayment(): boolean {
    const refreshed = readPayment(props.services, props.caseId)
    if (refreshed === null) {
      setError('The saved payment status could not be reloaded safely.')
      return false
    }
    setPayment(refreshed)
    return true
  }

  function startPayment() {
    setError(null)
    const result = props.services.runtime.startMockPayment({ caseId: props.caseId })
    if (result.status === 'STORAGE_REQUIRES_RESET' || result.status === 'STORAGE_UNAVAILABLE') {
      props.onRecoveryRequired(result.status)
      return
    }
    if (
      result.status !== 'PAYMENT_RECONCILIATION_REQUIRED' &&
      result.status !== 'PAYMENT_EXISTING'
    ) {
      setError('The payment step could not start safely. No payment details were processed.')
      return
    }
    if (refreshPayment()) {
      setAnnouncement('Payment status pending. Check the existing payment instead of starting again.')
      document.getElementById('payment-status-heading')?.focus()
    }
  }

  function checkPaymentStatus() {
    setError(null)
    const result = props.services.runtime.checkMockPaymentStatus({ caseId: props.caseId })
    if (result.status === 'STORAGE_REQUIRES_RESET' || result.status === 'STORAGE_UNAVAILABLE') {
      props.onRecoveryRequired(result.status)
      return
    }
    if (result.status !== 'PAYMENT_CONFIRMED' && result.status !== 'PAYMENT_EXISTING') {
      setError('The existing payment status could not be checked. No second attempt was created.')
      return
    }
    if (refreshPayment()) {
      setAnnouncement('Payment confirmed. No real payment was processed.')
      document.getElementById('payment-status-heading')?.focus()
    }
  }

  if (payment === null) {
    return (
      <section className={styles.paymentPage} aria-labelledby="payment-heading">
        <p className={styles.eyebrow}>Payment · Step 5 of 6</p>
        <h2 id="payment-heading" tabIndex={-1}>Payment is unavailable</h2>
        <p role="alert">The application could not provide a payment summary.</p>
      </section>
    )
  }

  const purposeName = PURPOSE_NAMES[payment.purposeFamily]
  const isNotStarted = payment.paymentState === 'NOT_STARTED'
  const isUncertain = payment.paymentState === 'RECONCILIATION_REQUIRED'
  const isConfirmed = payment.paymentState === 'CONFIRMED'
  const isIntermediate = payment.paymentState === 'INITIATED' || payment.paymentState === 'PENDING'

  return (
    <section className={styles.paymentPage} aria-labelledby="payment-heading">
      <Link className={styles.backLink} to={props.reviewPath}>
        <span aria-hidden="true">←</span> Back to review
      </Link>
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Payment · Step 5 of 6</p>
        <h2 id="payment-heading" tabIndex={-1}>Pay visa fee</h2>
        <p>No real payment will be processed in this prototype.</p>
        <p className={styles.caseReference}>Application reference {applicantReference(payment.caseId)}</p>
      </header>

      <section className={styles.summaryPanel} aria-labelledby="payment-summary-heading">
        <div>
          <p className={styles.sectionLabel}>Payment summary</p>
          <h3 id="payment-summary-heading">Application submitted</h3>
        </div>
        <dl className={styles.summaryFacts}>
          <div>
            <dt>Purpose</dt>
            <dd>{purposeName}</dd>
          </div>
          <div>
            <dt>Visa fee</dt>
            <dd>Not calculated in this prototype</dd>
          </div>
        </dl>
        <strong className={styles.nonPayable}>No real payment will be processed</strong>
      </section>

      <div className={styles.statusAnnouncement} aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {isNotStarted ? (
        <section className={styles.actionPanel} aria-labelledby="payment-action-heading">
          <p className={styles.sectionLabel}>Visa fee</p>
          <h3 id="payment-action-heading">Continue to payment</h3>
          <p>No card, bank account, or payment information is required.</p>
          {error ? <p className={styles.inlineError} role="alert">{error}</p> : null}
          <button className={styles.primaryButton} type="button" onClick={startPayment}>
            Pay visa fee <span aria-hidden="true">→</span>
          </button>
          <Link className={styles.secondaryButton} to={props.reviewPath}>
            Back to submitted application
          </Link>
        </section>
      ) : null}

      {isUncertain ? (
        <section className={styles.uncertainPanel} aria-labelledby="payment-status-heading">
          <div className={styles.statusMarker} aria-hidden="true">!</div>
          <p className={styles.sectionLabel}>Payment update</p>
          <h3 id="payment-status-heading" tabIndex={-1}>Payment status pending</h3>
          <p>We have not yet confirmed this payment.</p>
          <p className={styles.duplicateGuidance}>Do not make another payment.</p>
          {payment.syntheticReference ? (
            <p className={styles.paymentReference}>Payment reference {applicantReference(payment.syntheticReference)}</p>
          ) : null}
          {error ? <p className={styles.inlineError} role="alert">{error}</p> : null}
          <button className={styles.primaryButton} type="button" onClick={checkPaymentStatus}>
            Check payment status <span aria-hidden="true">→</span>
          </button>
        </section>
      ) : null}

      {isIntermediate ? (
        <section className={styles.uncertainPanel} aria-labelledby="payment-status-heading">
          <div className={styles.statusMarker} aria-hidden="true">…</div>
          <p className={styles.sectionLabel}>Payment update</p>
          <h3 id="payment-status-heading" tabIndex={-1}>Payment status pending</h3>
          <p>We have not yet confirmed this payment. Do not make another payment.</p>
          {error ? <p className={styles.inlineError} role="alert">{error}</p> : null}
        </section>
      ) : null}

      {isConfirmed ? (
        <section className={styles.confirmedPanel} aria-labelledby="payment-status-heading" aria-live="polite">
          <div className={styles.completionMarker} aria-hidden="true">✓</div>
          <p className={styles.sectionLabel}>Payment update</p>
          <h3 id="payment-status-heading" tabIndex={-1}>Payment confirmed</h3>
          <p>Your application can now move to the review status stage.</p>
          <dl className={styles.confirmedFacts}>
            <div>
              <dt>Visa fee</dt>
              <dd>Payment confirmed</dd>
            </div>
          </dl>
          <div className={styles.nextStep}>
            <span>Next</span>
            <strong>Status</strong>
            <p>Track your application and review its current status.</p>
          </div>
          <Link className={styles.primaryButton} to={props.statusPath}>
            Continue to status <span aria-hidden="true">→</span>
          </Link>
        </section>
      ) : null}
    </section>
  )
}
