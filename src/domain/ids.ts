import { z } from 'zod'

export type SyntheticId = `SYN-${string}`
export type PolicyQualifiedVersion = `SYN-EVISA-POLICY@${string}`
export type ReasonCode = `R-SYN-${string}`
export type ProvenanceId = `PROV-SYN-${string}`
export type SyntheticDate = `${number}-${number}-${number}`
export type SyntheticTimestamp = `${number}-${number}-${number}T${string}Z`

export const syntheticIdSchema = z.custom<SyntheticId>(
  (value) => typeof value === 'string' && /^SYN-[A-Z0-9-]+$/.test(value),
  { message: 'Expected a namespaced synthetic identifier.' },
)

export const policyQualifiedVersionSchema = z.custom<PolicyQualifiedVersion>(
  (value) => typeof value === 'string' && /^SYN-EVISA-POLICY@\d+\.\d+\.\d+(?:-preview)?$/.test(value),
  { message: 'Expected a qualified synthetic policy version.' },
)

export const reasonCodeSchema = z.custom<ReasonCode>(
  (value) => typeof value === 'string' && /^R-SYN-[A-Z0-9-]+$/.test(value),
  { message: 'Expected a synthetic policy reason code.' },
)

export const provenanceIdSchema = z.custom<ProvenanceId>(
  (value) => typeof value === 'string' && /^PROV-SYN-[A-Z0-9-]+$/.test(value),
  { message: 'Expected a synthetic provenance identifier.' },
)

export const syntheticDateSchema = z.custom<SyntheticDate>(
  (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value),
  { message: 'Expected a controlled synthetic date.' },
)

export const syntheticTimestampSchema = z.custom<SyntheticTimestamp>(
  (value) =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value),
  { message: 'Expected a controlled synthetic UTC timestamp.' },
)
