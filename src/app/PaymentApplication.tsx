import { useState } from 'react'

import type { SyntheticId } from '../domain'
import type { RuntimePaymentSummary } from '../runtime'
import { PURPOSE_NAMES } from './applicant-labels'
import type { AppRuntimeServices } from './create-app-runtime'
import styles from './PaymentApplication.module.css'

type PaymentApplicationProps = Readonly<{
  services: AppRuntimeServices
  caseId: SyntheticId
  onBackToSubmittedApplication(): void
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
      setError('The saved mock payment state could not be reloaded safely.')
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
      setError('The local payment simulation could not start safely. No payment details or money were involved.')
      return
    }
    if (refreshPayment()) {
      setAnnouncement('Mock payment status changed. Check the existing payment instead of starting again.')
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
      setError('The existing mock payment could not be reconciled. No second attempt was created.')
      return
    }
    if (refreshPayment()) {
      setAnnouncement('Payment confirmed in the local simulation. No money was transferred.')
      document.getElementById('payment-status-heading')?.focus()
    }
  }

  if (payment === null) {
    return (
      <section className={styles.paymentPage} aria-labelledby="payment-heading">
        <p className={styles.eyebrow}>Payment · Step 5 of 6</p>
        <h2 id="payment-heading" tabIndex={-1}>Mock payment is unavailable</h2>
        <p role="alert">The authoritative synthetic Case could not provide a safe payment summary.</p>
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
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Payment · Step 5 of 6</p>
        <h2 id="payment-heading" tabIndex={-1}>Complete the demo payment</h2>
        <p>This step uses a local payment simulation. No money or payment details are involved.</p>
        <p className={styles.caseReference}>Synthetic case {payment.caseId}</p>
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
            <dt>Demo fee</dt>
            <dd>{payment.syntheticFee.amount} {payment.syntheticFee.unit}</dd>
          </div>
        </dl>
        <strong className={styles.nonPayable}>{payment.syntheticFee.label}</strong>
      </section>

      <div className={styles.statusAnnouncement} aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {isNotStarted ? (
        <section className={styles.actionPanel} aria-labelledby="payment-action-heading">
          <p className={styles.sectionLabel}>Local simulation</p>
          <h3 id="payment-action-heading">Start one mock payment attempt</h3>
          <p>No card, bank account, or payment information is required.</p>
          {error ? <p className={styles.inlineError} role="alert">{error}</p> : null}
          <button className={styles.primaryButton} type="button" onClick={startPayment}>
            Start mock payment <span aria-hidden="true">→</span>
          </button>
          <button className={styles.secondaryButton} type="button" onClick={props.onBackToSubmittedApplication}>
            Back to submitted application
          </button>
        </section>
      ) : null}

      {isUncertain ? (
        <section className={styles.uncertainPanel} aria-labelledby="payment-status-heading">
          <div className={styles.statusMarker} aria-hidden="true">!</div>
          <p className={styles.sectionLabel}>Result needs a status check</p>
          <h3 id="payment-status-heading" tabIndex={-1}>Mock payment is pending. No real payment was made.</h3>
          <p>Your submitted demo application is safe while this local result is reconciled.</p>
          <p className={styles.duplicateGuidance}>Do not start another mock payment. Check mock payment status instead.</p>
          {payment.syntheticReference ? (
            <p className={styles.paymentReference}>Synthetic payment reference {payment.syntheticReference}</p>
          ) : null}
          {error ? <p className={styles.inlineError} role="alert">{error}</p> : null}
          <button className={styles.primaryButton} type="button" onClick={checkPaymentStatus}>
            Check mock payment status <span aria-hidden="true">→</span>
          </button>
        </section>
      ) : null}

      {isIntermediate ? (
        <section className={styles.uncertainPanel} aria-labelledby="payment-status-heading">
          <div className={styles.statusMarker} aria-hidden="true">…</div>
          <p className={styles.sectionLabel}>Existing mock payment</p>
          <h3 id="payment-status-heading" tabIndex={-1}>Mock payment status is still pending</h3>
          <p>Do not start another mock payment. The existing synthetic attempt must be resolved first.</p>
          {error ? <p className={styles.inlineError} role="alert">{error}</p> : null}
        </section>
      ) : null}

      {isConfirmed ? (
        <section className={styles.confirmedPanel} aria-labelledby="payment-status-heading" aria-live="polite">
          <div className={styles.completionMarker} aria-hidden="true">✓</div>
          <p className={styles.sectionLabel}>Local result</p>
          <h3 id="payment-status-heading" tabIndex={-1}>Payment confirmed</h3>
          <p>This payment was confirmed only inside the local simulation. No money was transferred.</p>
          <dl className={styles.confirmedFacts}>
            <div>
              <dt>Demo fee</dt>
              <dd>{payment.syntheticFee.amount} {payment.syntheticFee.unit}</dd>
            </div>
          </dl>
          <div className={styles.nextStep}>
            <span>Next</span>
            <strong>Status</strong>
            <p>Your synthetic application can now move to the status and review stage.</p>
          </div>
        </section>
      ) : null}
    </section>
  )
}
