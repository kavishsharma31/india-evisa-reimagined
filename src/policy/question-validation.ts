import type { QuestionManifest } from './schema'

export type PolicyQuestion = QuestionManifest['questions'][number]
export type QuestionAnswers = Readonly<Record<string, string>>

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isoDateFromLocalDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addLocalDays(date: Date, days: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  result.setDate(result.getDate() + days)
  return result
}

export function isIsoCalendarDate(value: string): boolean {
  const match = ISO_DATE.exec(value)
  if (match === null) {
    return false
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(year, month - 1, day)
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  )
}

export function questionDateBounds(
  question: PolicyQuestion,
  answers: QuestionAnswers,
  today = new Date(),
): Readonly<{ min?: string; max?: string }> {
  if (question.control !== 'DATE') {
    return {}
  }
  const constraints = question.dateConstraints
  const offsetMinimum =
    constraints?.minOffsetDays === undefined
      ? undefined
      : isoDateFromLocalDate(addLocalDays(today, constraints.minOffsetDays))
  const relatedMinimum =
    constraints?.notBeforeQuestionId === undefined
      ? undefined
      : answers[constraints.notBeforeQuestionId]
  const minima = [offsetMinimum, relatedMinimum].filter(
    (value): value is string => value !== undefined && isIsoCalendarDate(value),
  )
  const maximum =
    constraints?.maxOffsetDays === undefined
      ? undefined
      : isoDateFromLocalDate(addLocalDays(today, constraints.maxOffsetDays))
  return {
    ...(minima.length === 0 ? {} : { min: minima.sort().at(-1) }),
    ...(maximum === undefined ? {} : { max: maximum }),
  }
}

export function validateQuestionAnswerShape(
  question: PolicyQuestion,
  answer: string,
): string | null {
  if (answer.length === 0) {
    return question.required ? 'Enter an answer for this required question.' : null
  }
  if (question.legacyAllowedValues?.includes(answer) === true) {
    return null
  }
  if (
    question.control === 'SINGLE_SELECT' ||
    question.control === 'SYNTHETIC_DATE' ||
    question.control === 'BOOLEAN_CHOICE' ||
    question.control === 'SELECT' ||
    question.control === 'YES_NO'
  ) {
    return question.allowedValues.includes(answer)
      ? null
      : 'Choose one of the available options.'
  }
  if (question.control === 'DATE') {
    return isIsoCalendarDate(answer) ? null : 'Enter a valid date.'
  }
  if (answer.trim().length === 0) {
    return 'Enter an answer for this required question.'
  }
  if (question.maxLength !== undefined && answer.length > question.maxLength) {
    return `Enter ${question.maxLength} characters or fewer.`
  }
  return null
}

export function validateQuestionAnswer(
  question: PolicyQuestion,
  answer: string,
  answers: QuestionAnswers,
  today = new Date(),
): string | null {
  const shapeError = validateQuestionAnswerShape(question, answer)
  if (shapeError !== null || question.control !== 'DATE') {
    return shapeError
  }
  if (question.legacyAllowedValues?.includes(answer) === true) {
    return null
  }
  const bounds = questionDateBounds(question, answers, today)
  if (bounds.min !== undefined && answer < bounds.min) {
    if (question.dateConstraints?.notBeforeQuestionId !== undefined) {
      return 'Proposed hospital admission date cannot be before expected date of arrival.'
    }
    if ((question.dateConstraints?.minOffsetDays ?? 0) > 0) {
      return `Choose a date at least ${question.dateConstraints?.minOffsetDays} days from today.`
    }
    return 'Choose today or a future date.'
  }
  if (bounds.max !== undefined && answer > bounds.max) {
    return `Choose a date no more than ${question.dateConstraints?.maxOffsetDays} days from today.`
  }
  return null
}

export function validateQuestionAnswers(
  questions: readonly PolicyQuestion[],
  answers: QuestionAnswers,
  options: Readonly<{ requireAll: boolean; today?: Date }> = { requireAll: true },
): Readonly<Record<string, string>> {
  const errors: Record<string, string> = {}
  for (const question of questions) {
    const answer = answers[question.id]
    if (answer === undefined || answer.length === 0) {
      if (options.requireAll && question.required) {
        errors[question.id] =
          question.control === 'SELECT' ||
          question.control === 'YES_NO' ||
          question.control === 'SINGLE_SELECT' ||
          question.control === 'BOOLEAN_CHOICE'
            ? 'Choose an answer for this required question.'
            : 'Enter an answer for this required question.'
      }
      continue
    }
    const error = validateQuestionAnswer(question, answer, answers, options.today)
    if (error !== null) {
      errors[question.id] = error
    }
  }
  return errors
}
