import type { SyntheticId, SyntheticTimestamp } from '../domain'
import { syntheticIdSchema, syntheticTimestampSchema } from '../domain/ids'
import type { RuntimeMetadataSource } from './contracts'

const timestampPartsPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/

function identifierBody(identifier: SyntheticId): string {
  return identifier.slice('SYN-'.length)
}

function sequenceSuffix(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error('Deterministic runtime sequences must be positive integers.')
  }

  return String(sequence).padStart(3, '0')
}

function nextControlledTimestamp(previousTimestamp: SyntheticTimestamp): SyntheticTimestamp {
  const match = timestampPartsPattern.exec(previousTimestamp)
  if (match === null) {
    throw new Error('Deterministic runtime metadata requires a synthetic UTC timestamp.')
  }

  const [year, month, day, hourText, minuteText, secondText] = match.slice(1)
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hourText === undefined ||
    minuteText === undefined ||
    secondText === undefined
  ) {
    throw new Error('Synthetic timestamp parts were incomplete.')
  }

  const previousSeconds =
    Number(hourText) * 3_600 + Number(minuteText) * 60 + Number(secondText)
  const nextSeconds = previousSeconds + 1
  if (nextSeconds >= 86_400) {
    throw new Error('The bounded P0 synthetic runtime clock exhausted its fixture day.')
  }

  const hour = Math.floor(nextSeconds / 3_600)
  const minute = Math.floor((nextSeconds % 3_600) / 60)
  const second = nextSeconds % 60
  return syntheticTimestampSchema.parse(
    `${year}-${month}-${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}Z`,
  )
}

export function createDeterministicRuntimeMetadata(): RuntimeMetadataSource {
  return Object.freeze({
    nextTimestamp: nextControlledTimestamp,
    commandId(caseId, operation, revision) {
      return syntheticIdSchema.parse(
        `SYN-COMMAND-${identifierBody(caseId)}-${operation.toUpperCase()}-${sequenceSuffix(revision)}`,
      )
    },
    eventId(caseId, eventType, revision) {
      return syntheticIdSchema.parse(
        `SYN-EVENT-${identifierBody(caseId)}-${eventType.toUpperCase()}-${sequenceSuffix(revision)}`,
      )
    },
    snapshotId(caseId, sequence) {
      return syntheticIdSchema.parse(
        `SYN-SNAPSHOT-${identifierBody(caseId)}-${sequenceSuffix(sequence)}`,
      )
    },
  })
}
