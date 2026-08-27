import { useState } from 'react'
import { Link } from 'react-router-dom'

import type { SyntheticId } from '../domain'
import type {
  RuntimeDocumentRequirementView,
  RuntimeDocumentsInspected,
} from '../runtime'
import type { AppRuntimeServices } from './create-app-runtime'
import {
  DOCUMENT_FIXTURE_LABELS,
  DOCUMENT_GUIDANCE,
  DOCUMENT_NAMES,
} from './applicant-labels'
import styles from './DocumentPreparation.module.css'

type DocumentPreparationProps = Readonly<{
  services: AppRuntimeServices
  caseId: SyntheticId
  purposeName: string
  editMode?: boolean
  applicationPath: string
  reviewPath: string
  onPrepareReview(): boolean
  onRecoveryRequired(status: 'STORAGE_REQUIRES_RESET' | 'STORAGE_UNAVAILABLE'): void
}>

type RequirementMessages = Readonly<Record<string, string>>
type FixtureSelections = Readonly<Record<string, SyntheticId>>

function documentName(requirement: RuntimeDocumentRequirementView): string {
  return DOCUMENT_NAMES[requirement.documentType] ?? 'Document'
}

function initialSelections(documents: RuntimeDocumentsInspected): FixtureSelections {
  return Object.freeze(
    Object.fromEntries(
      documents.requirements.flatMap((requirement) => {
        const fixtureId =
          requirement.currentVersion?.fixtureId ?? requirement.fixtureOptions[0]?.fixtureId
        return fixtureId === undefined ? [] : [[requirement.requirementId, fixtureId]]
      }),
    ),
  )
}

function prepareIdempotencyKey(
  caseId: SyntheticId,
  requirementId: string,
  fixtureId: SyntheticId,
): SyntheticId {
  return `SYN-IDEMPOTENCY-A04-UI-${caseId.slice('SYN-'.length)}-${requirementId}-${fixtureId}`
}

function statusLabel(status: RuntimeDocumentRequirementView['status']): string {
  if (status === 'READY') {
    return 'Ready'
  }
  if (status === 'NEEDS_ATTENTION') {
    return 'Needs attention'
  }
  return 'Not checked'
}

function inspectionMessage(requirement: RuntimeDocumentRequirementView): string | null {
  if (
    requirement.currentVersion?.inspectionReasonCode ===
    'DOC_PREFLIGHT_UNCLEAR_SYNTHETIC'
  ) {
    return 'This passport bio page is too unclear to check. Choose the clearer copy and try again.'
  }
  if (requirement.status === 'READY') {
    return 'This document is ready.'
  }
  return null
}

export function DocumentPreparation(props: DocumentPreparationProps) {
  const [documents, setDocuments] = useState(() => {
    const inspected = props.services.runtime.inspectDocuments({ caseId: props.caseId })
    return inspected.status === 'DOCUMENTS_INSPECTED' ? inspected : null
  })
  const [selections, setSelections] = useState<FixtureSelections>(() =>
    documents === null ? Object.freeze({}) : initialSelections(documents),
  )
  const [messages, setMessages] = useState<RequirementMessages>({})
  const [activeRequirementId, setActiveRequirementId] = useState<string | null>(null)
  const [reviewPrepared, setReviewPrepared] = useState(() => {
    const resumed = props.services.runtime.resumeCase({ caseId: props.caseId })
    return resumed.status === 'CASE_RESUMED' && resumed.currentStep === 'REVIEW'
  })

  function refreshDocuments() {
    const inspected = props.services.runtime.inspectDocuments({ caseId: props.caseId })
    if (inspected.status === 'DOCUMENTS_INSPECTED') {
      setDocuments(inspected)
      setSelections((currentSelections) =>
        Object.freeze({ ...initialSelections(inspected), ...currentSelections }),
      )
      return inspected
    }
    if (
      inspected.status === 'STORAGE_REQUIRES_RESET' ||
      inspected.status === 'STORAGE_UNAVAILABLE'
    ) {
      props.onRecoveryRequired(inspected.status)
      return null
    }
    setMessages({ general: 'The document checklist could not be refreshed safely.' })
    return null
  }

  function prepareReview(): boolean {
    const prepared = props.onPrepareReview()
    if (prepared) {
      setReviewPrepared(true)
      return true
    }
    setMessages({ general: 'The review could not be prepared safely.' })
    return false
  }

  function selectFixture(requirementId: string, fixtureId: SyntheticId) {
    setSelections((currentSelections) =>
      Object.freeze({ ...currentSelections, [requirementId]: fixtureId }),
    )
    setMessages((currentMessages) => {
      const { [requirementId]: _removed, ...remainingMessages } = currentMessages
      return remainingMessages
    })
  }

  function checkDocument(requirement: RuntimeDocumentRequirementView) {
    const fixtureId = selections[requirement.requirementId]
    if (fixtureId === undefined) {
      setMessages((currentMessages) => ({
        ...currentMessages,
        [requirement.requirementId]: 'Choose a provided document before checking it.',
      }))
      return
    }

    setActiveRequirementId(requirement.requirementId)
    setMessages((currentMessages) => {
      const { [requirement.requirementId]: _removed, ...remainingMessages } = currentMessages
      return remainingMessages
    })
    const result = props.services.runtime.prepareDocumentFixture({
      caseId: props.caseId,
      requirementId: requirement.requirementId,
      fixtureId,
      idempotencyKey: prepareIdempotencyKey(
        props.caseId,
        requirement.requirementId,
        fixtureId,
      ),
    })

    if (result.status === 'STORAGE_REQUIRES_RESET' || result.status === 'STORAGE_UNAVAILABLE') {
      setActiveRequirementId(null)
      props.onRecoveryRequired(result.status)
      return
    }
    if (result.status === 'DOCUMENT_PREPARED' || result.status === 'DOCUMENT_EXISTING') {
      const refreshed = refreshDocuments()
      if (refreshed?.allReady) {
        prepareReview()
      }
      setActiveRequirementId(null)
      return
    }

    const message =
      result.status === 'COMMAND_REJECTED' &&
      result.reasonCode === 'DOCUMENT_INSPECTION_UNAVAILABLE'
        ? 'The document check is unavailable. Nothing was marked Ready.'
        : 'This document could not be checked safely. Its status was not changed.'
    setMessages((currentMessages) => ({
      ...currentMessages,
      [requirement.requirementId]: message,
    }))
    setActiveRequirementId(null)
  }

  if (documents === null) {
    return (
      <section className={styles.documentsPanel} aria-labelledby="documents-heading">
        <p className={styles.eyebrow}>Documents · Step 3 of 6</p>
        <h2 id="documents-heading" tabIndex={-1}>Document preparation is unavailable</h2>
        <p role="alert">The saved application could not provide a document checklist.</p>
        <Link className={styles.secondaryButton} to={props.applicationPath}>
          Back to application details
        </Link>
      </section>
    )
  }

  if (documents.allReady && !props.editMode) {
    return (
      <section className={styles.completionPanel} aria-labelledby="documents-heading" aria-live="polite">
        <div className={styles.completionMarker} aria-hidden="true">✓</div>
        <p className={styles.eyebrow}>Documents · Step 3 of 6</p>
        <h2 id="documents-heading" tabIndex={-1}>Documents ready</h2>
        <p>All required documents are ready.</p>
        <div className={styles.nextStep}>
          <span>Next</span>
          <strong>Review</strong>
          <p>Review and submission begin in the next applicant step.</p>
        </div>
        <div className={styles.completionActions}>
          {reviewPrepared ? (
            <Link className={styles.checkButton} to={props.reviewPath}>
              Review application <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <button className={styles.checkButton} type="button" onClick={prepareReview}>
              Prepare review
            </button>
          )}
          <Link className={styles.secondaryButton} to={props.applicationPath}>
            Back to application details
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.documentsPanel} aria-labelledby="documents-heading">
      <Link className={styles.backButton} to={props.applicationPath}>
        <span aria-hidden="true">←</span> Back to application details
      </Link>

      <header className={styles.documentsHeader}>
        <p className={styles.eyebrow}>Documents · Step 3 of 6</p>
        <h2 id="documents-heading" tabIndex={-1}>Prepare your documents</h2>
        <p>Check each required document before continuing.</p>
        <p>For this prototype, sample documents are provided instead of real uploads.</p>
        <div className={styles.purposeContext}>
          <span>Selected purpose</span>
          <strong>{props.purposeName}</strong>
        </div>
        <p className={styles.progressSummary} aria-live="polite">
          {documents.readyCount} of {documents.requiredCount} required documents ready
        </p>
      </header>

      {messages.general ? <p className={styles.inlineError} role="alert">{messages.general}</p> : null}

      <div className={styles.documentList}>
        {documents.requirements.map((requirement, index) => {
          const selectedFixtureId = selections[requirement.requirementId] ?? ''
          const currentMessage = inspectionMessage(requirement)
          const errorMessage = messages[requirement.requirementId]
          const statusId = `document-status-${index + 1}`
          const errorId = `document-error-${index + 1}`
          const selectedAlreadyChecked =
            requirement.currentVersion?.fixtureId === selectedFixtureId &&
            (requirement.status === 'READY' || requirement.status === 'NEEDS_ATTENTION')
          return (
            <article className={styles.documentCard} key={requirement.requirementId}>
              <div className={styles.documentHeading}>
                <div>
                  <span className={styles.documentNumber}>{String(index + 1).padStart(2, '0')}</span>
                  <h3>{documentName(requirement)}</h3>
                </div>
                <span className={styles.status} data-status={requirement.status} id={statusId}>
                  {statusLabel(requirement.status)}
                </span>
              </div>
              <p className={styles.guidance}>{DOCUMENT_GUIDANCE[requirement.documentType] ?? 'Provide a clear copy of this document.'}</p>

              <label className={styles.fixtureLabel} htmlFor={`document-fixture-${index + 1}`}>
                Sample document
              </label>
              <select
                id={`document-fixture-${index + 1}`}
                value={selectedFixtureId}
                aria-describedby={`${statusId}${errorMessage ? ` ${errorId}` : ''}`}
                onChange={(event) => {
                  const fixture = requirement.fixtureOptions.find(
                    ({ fixtureId }) => fixtureId === event.currentTarget.value,
                  )
                  if (fixture !== undefined) {
                    selectFixture(requirement.requirementId, fixture.fixtureId)
                  }
                }}
              >
                {requirement.fixtureOptions.map((option) => (
                  <option value={option.fixtureId} key={option.fixtureId}>
                    {DOCUMENT_FIXTURE_LABELS[option.fixtureId] ?? option.label}
                  </option>
                ))}
              </select>
              {currentMessage ? (
                <p
                  className={requirement.status === 'NEEDS_ATTENTION' ? styles.attention : styles.readyMessage}
                >
                  {currentMessage}
                </p>
              ) : null}
              {errorMessage ? <p className={styles.inlineError} id={errorId} role="alert">{errorMessage}</p> : null}

              <button
                className={styles.checkButton}
                type="button"
                disabled={selectedAlreadyChecked || activeRequirementId === requirement.requirementId}
                onClick={() => checkDocument(requirement)}
              >
                {activeRequirementId === requirement.requirementId
                  ? 'Checking…'
                  : selectedAlreadyChecked
                    ? requirement.status === 'READY'
                      ? 'Document checked'
                      : 'Choose a replacement to retry'
                    : requirement.currentVersion === null
                      ? 'Check document'
                      : 'Check replacement'}
              </button>
            </article>
          )
        })}
      </div>
      {documents.allReady ? (
        <div className={styles.returnToReview}>
          <p>All required documents remain ready.</p>
          <Link className={styles.checkButton} to={props.reviewPath}>
            Return to review <span aria-hidden="true">→</span>
          </Link>
        </div>
      ) : null}
    </section>
  )
}
