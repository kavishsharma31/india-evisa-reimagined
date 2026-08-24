import { useState, type FormEvent } from 'react'

import type { SyntheticId } from '../domain'
import type { PolicyEvaluationResult } from '../policy'
import type { RuntimeResumeResult } from '../runtime'
import type { AppRuntimeServices } from './create-app-runtime'
import styles from './AdaptiveApplication.module.css'

type ResumedCase = Extract<RuntimeResumeResult, { status: 'CASE_RESUMED' }>
type Question = NonNullable<PolicyEvaluationResult['questionManifest']>['questions'][number]
type AnswerMap = Readonly<Record<string, string>>
type SaveState = 'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'

type AdaptiveApplicationProps = Readonly<{
  services: AppRuntimeServices
  resumedCase: ResumedCase
  evaluation: PolicyEvaluationResult
  purposeName: string
  onBack(): void
}>

const ANSWER_LABELS: Readonly<Record<string, string>> = Object.freeze({
  'SYN-POLICY-COHORT-A': 'Synthetic policy cohort A',
  SYNTHETIC_STANDARD_PASSPORT: 'Synthetic standard passport',
  SYNTHETIC_MEDICAL_TREATMENT: 'Synthetic Medical treatment',
  SYNTHETIC_TOURISM: 'Synthetic tourism',
  YES_SYNTHETIC: 'Yes',
  NO_SYNTHETIC: 'No',
})

const MONTH_NAMES = Object.freeze([
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const)

function sameAnswers(left: AnswerMap, right: AnswerMap): boolean {
  const leftEntries = Object.entries(left)
  return (
    leftEntries.length === Object.keys(right).length &&
    leftEntries.every(([questionId, answer]) => right[questionId] === answer)
  )
}

function boundedAnswers(questions: readonly Question[], answers: AnswerMap): AnswerMap {
  return Object.freeze(
    Object.fromEntries(
      questions.flatMap((question) => {
        const answer = answers[question.id]
        return answer === undefined ? [] : [[question.id, answer]]
      }),
    ),
  )
}

function answerLabel(value: string): string {
  const knownLabel = ANSWER_LABELS[value]
  if (knownLabel !== undefined) {
    return knownLabel
  }

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (dateMatch !== null) {
    const [, year, monthText, dayText] = dateMatch
    const month = monthText === undefined ? undefined : MONTH_NAMES[Number(monthText) - 1]
    if (year !== undefined && dayText !== undefined && month !== undefined) {
      return `${Number(dayText)} ${month} ${year} (fictional)`
    }
  }

  return value
    .replace(/^SYN(?:THETIC)?[-_]/, 'Synthetic ')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^./, (firstCharacter) => firstCharacter.toUpperCase())
}

function snapshotIdempotencyKey(caseId: SyntheticId, nextRevision: number): SyntheticId {
  return `SYN-IDEMPOTENCY-UI-SNAPSHOT-${caseId.slice('SYN-'.length)}-${String(nextRevision).padStart(3, '0')}`
}

function controlId(index: number): string {
  return `application-question-${index + 1}`
}

function errorId(index: number): string {
  return `${controlId(index)}-error`
}

function focusQuestion(index: number): void {
  document.getElementById(controlId(index))?.focus()
}

export function AdaptiveApplication(props: AdaptiveApplicationProps) {
  const questions = props.evaluation.questionManifest?.questions ?? []
  const initialAnswers = boundedAnswers(questions, props.resumedCase.latestAnswers)
  const [answers, setAnswers] = useState<AnswerMap>(initialAnswers)
  const [authoritativeAnswers, setAuthoritativeAnswers] = useState<AnswerMap>(initialAnswers)
  const [authoritativeStep, setAuthoritativeStep] = useState(props.resumedCase.currentStep)
  const [revision, setRevision] = useState(props.resumedCase.revision)
  const [saveState, setSaveState] = useState<SaveState>(
    Object.keys(initialAnswers).length > 0 ? 'SAVED' : 'IDLE',
  )
  const [saveError, setSaveError] = useState<string | null>(null)
  const [questionErrors, setQuestionErrors] = useState<Readonly<Record<string, string>>>({})
  const [completed, setCompleted] = useState(props.resumedCase.currentStep === 'DOCUMENTS')

  function persistSnapshot(nextAnswers: AnswerMap, currentStep: 'APPLICATION' | 'DOCUMENTS') {
    if (sameAnswers(authoritativeAnswers, nextAnswers) && authoritativeStep === currentStep) {
      return true
    }

    setSaveState('SAVING')
    setSaveError(null)
    const result = props.services.runtime.saveDraftSnapshot({
      caseId: props.resumedCase.caseId,
      idempotencyKey: snapshotIdempotencyKey(props.resumedCase.caseId, revision + 1),
      currentStep,
      answers: nextAnswers,
    })

    if (result.status === 'COMMAND_ACCEPTED') {
      setAuthoritativeAnswers(nextAnswers)
      setAuthoritativeStep(currentStep)
      setRevision(result.revision)
      setSaveState('SAVED')
      return true
    }

    setSaveState('ERROR')
    setSaveError(
      result.status === 'STORAGE_UNAVAILABLE'
        ? 'Progress cannot currently be preserved in this browser.'
        : result.status === 'STORAGE_REQUIRES_RESET'
          ? 'Saved demo data can no longer be read. Reset is required before progress can be preserved.'
          : 'Could not save changes. Your current answer remains visible but is not preserved yet.',
    )
    return false
  }

  function changeAnswer(question: Question, value: string) {
    if (!question.allowedValues.includes(value)) {
      return
    }

    const nextAnswers = Object.freeze({ ...answers, [question.id]: value })
    setAnswers(nextAnswers)
    setQuestionErrors((currentErrors) => {
      if (currentErrors[question.id] === undefined) {
        return currentErrors
      }
      const { [question.id]: _removed, ...remainingErrors } = currentErrors
      return remainingErrors
    })

    if (!sameAnswers(authoritativeAnswers, nextAnswers)) {
      persistSnapshot(nextAnswers, 'APPLICATION')
    }
  }

  function submitApplicationDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    for (const question of questions) {
      const answer = answers[question.id]
      if (question.required && answer === undefined) {
        nextErrors[question.id] = 'Choose an answer for this required question.'
      } else if (answer !== undefined && !question.allowedValues.includes(answer)) {
        nextErrors[question.id] = 'Choose one of the controlled synthetic options.'
      }
    }

    setQuestionErrors(nextErrors)
    const firstInvalidIndex = questions.findIndex(
      (question) => nextErrors[question.id] !== undefined,
    )
    if (firstInvalidIndex >= 0) {
      focusQuestion(firstInvalidIndex)
      return
    }

    if (persistSnapshot(answers, 'DOCUMENTS')) {
      setCompleted(true)
    }
  }

  if (questions.length === 0) {
    return (
      <section className={styles.applicationPanel} aria-labelledby="application-heading">
        <p className={styles.eyebrow}>Application · Step 2 of 6</p>
        <h2 id="application-heading" tabIndex={-1}>Application questions are unavailable</h2>
        <p role="alert">The pinned demo policy did not provide a question manifest. No answers were saved.</p>
      </section>
    )
  }

  if (completed) {
    return (
      <section className={styles.completionPanel} aria-labelledby="application-heading" aria-live="polite">
        <div className={styles.completionMarker} aria-hidden="true">✓</div>
        <p className={styles.eyebrow}>Application · Step 2 of 6</p>
        <h2 id="application-heading" tabIndex={-1}>Application details saved</h2>
        <p>Your synthetic trip details are saved in this browser.</p>
        <div className={styles.nextStep}>
          <span>Next</span>
          <strong>Documents</strong>
          <p>Document preparation begins in A04 and is not included in this slice.</p>
        </div>
        <button className={styles.secondaryButton} type="button" onClick={props.onBack}>
          Back to saved case
        </button>
      </section>
    )
  }

  const errorCount = Object.keys(questionErrors).length
  return (
    <section className={styles.applicationPanel} aria-labelledby="application-heading">
      <button className={styles.backButton} type="button" onClick={props.onBack}>
        <span aria-hidden="true">←</span> Back to saved case
      </button>

      <div className={styles.applicationHeader}>
        <p className={styles.eyebrow}>Application · Step 2 of 6</p>
        <h2 id="application-heading" tabIndex={-1}>Tell us about this trip</h2>
        <p>Answer only the synthetic demo questions needed for this purpose.</p>
        <div className={styles.purposeContext}>
          <span>Selected purpose</span>
          <strong>{props.purposeName}</strong>
        </div>
        <p className={styles.syntheticReminder}>
          No real personal details are required. Use only the controlled synthetic choices shown here.
        </p>
      </div>

      {errorCount > 0 ? (
        <section className={styles.errorSummary} role="alert" aria-labelledby="error-summary-heading">
          <h3 id="error-summary-heading">Check your answers</h3>
          <p>
            {errorCount} required {errorCount === 1 ? 'answer needs' : 'answers need'} attention.
          </p>
          <ul>
            {questions.flatMap((question, index) =>
              questionErrors[question.id] === undefined
                ? []
                : [
                    <li key={question.id}>
                      <button type="button" onClick={() => focusQuestion(index)}>
                        {question.prompt}
                      </button>
                    </li>,
                  ],
            )}
          </ul>
        </section>
      ) : null}

      <form className={styles.applicationForm} onSubmit={submitApplicationDetails} noValidate>
        <div className={styles.questionList}>
          {questions.map((question, index) => {
            const fieldError = questionErrors[question.id]
            const describedBy = fieldError === undefined ? undefined : errorId(index)
            return question.control === 'BOOLEAN_CHOICE' ? (
              <fieldset
                className={styles.questionGroup}
                key={question.id}
                aria-describedby={describedBy}
                aria-invalid={fieldError === undefined ? undefined : true}
              >
                <legend>
                  <span className={styles.questionNumber}>{String(index + 1).padStart(2, '0')}</span>
                  <span>{question.prompt}</span>
                  {question.required ? <span className={styles.required}>Required</span> : null}
                </legend>
                <div className={styles.choiceGrid}>
                  {question.allowedValues.map((value, valueIndex) => (
                    <label className={styles.choiceControl} key={value}>
                      <input
                        id={valueIndex === 0 ? controlId(index) : undefined}
                        type="radio"
                        name={question.id}
                        value={value}
                        checked={answers[question.id] === value}
                        required={question.required}
                        onChange={() => changeAnswer(question, value)}
                      />
                      <span>{answerLabel(value)}</span>
                    </label>
                  ))}
                </div>
                {fieldError ? <p className={styles.fieldError} id={errorId(index)}>{fieldError}</p> : null}
              </fieldset>
            ) : (
              <div className={styles.questionGroup} key={question.id}>
                <label htmlFor={controlId(index)}>
                  <span className={styles.questionNumber}>{String(index + 1).padStart(2, '0')}</span>
                  <span>{question.prompt}</span>
                  {question.required ? <span className={styles.required}>Required</span> : null}
                </label>
                <select
                  id={controlId(index)}
                  name={question.id}
                  value={answers[question.id] ?? ''}
                  required={question.required}
                  aria-invalid={fieldError === undefined ? undefined : true}
                  aria-describedby={describedBy}
                  onChange={(changeEvent) => changeAnswer(question, changeEvent.currentTarget.value)}
                >
                  <option value="">Choose a synthetic option</option>
                  {question.allowedValues.map((value) => (
                    <option value={value} key={value}>{answerLabel(value)}</option>
                  ))}
                </select>
                {fieldError ? <p className={styles.fieldError} id={errorId(index)}>{fieldError}</p> : null}
              </div>
            )
          })}
        </div>

        <div className={styles.saveRegion} aria-live="polite" aria-atomic="true">
          <span className={styles.saveDot} data-state={saveState} aria-hidden="true" />
          {saveState === 'SAVING'
            ? 'Saving…'
            : saveState === 'SAVED'
              ? 'Saved in this browser'
              : saveState === 'ERROR'
                ? saveError
                : 'Changes save automatically in this browser'}
        </div>

        <div className={styles.formActions}>
          <button className={styles.primaryButton} type="submit">
            Continue to documents <span aria-hidden="true">→</span>
          </button>
          <button className={styles.secondaryButton} type="button" onClick={props.onBack}>
            Back to saved case
          </button>
        </div>
      </form>
    </section>
  )
}
