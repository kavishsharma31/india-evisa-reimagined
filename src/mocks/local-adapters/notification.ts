import { z } from 'zod'

import { syntheticIdSchema, type SyntheticId } from '../../domain/ids'
import type { LocalMockAdapter } from '../contracts'
import { createMockOutcome, validateMockRequest, type MockAdapterResult } from '../result'
import { NOTIFICATION_SCENARIOS, type NotificationScenario } from '../scenarios'

const NOTIFICATION_SCENARIO_NAMES = [
  'NOTIFICATION_QUEUED',
  'NOTIFICATION_DELIVERED',
  'NOTIFICATION_DELIVERY_FAILED',
  'NOTIFICATION_RETRY_QUEUED',
  'NOTIFICATION_RETRY_DELIVERED',
] as const satisfies readonly NotificationScenario[]

const notificationRequestSchema = z
  .object({
    requestReference: syntheticIdSchema,
    correlationId: syntheticIdSchema,
    caseId: syntheticIdSchema,
    template: z.enum(['APPLICATION_UPDATE', 'ACTION_REQUIRED', 'ETA_AVAILABLE']),
    recipient: z.literal('demo-applicant@example.com'),
    scenario: z.enum(NOTIFICATION_SCENARIO_NAMES),
  })
  .strict()

type NotificationOutcome =
  (typeof NOTIFICATION_SCENARIOS)[keyof typeof NOTIFICATION_SCENARIOS]['outcome']
type NotificationEvidence = Readonly<{
  caseId: SyntheticId
  template: 'APPLICATION_UPDATE' | 'ACTION_REQUIRED' | 'ETA_AVAILABLE'
  recipient: 'demo-applicant@example.com'
  deliveryChannel: 'LOCAL_OUTBOX_SIMULATION'
}>

export type NotificationAdapterResult = MockAdapterResult<
  NotificationOutcome,
  NotificationEvidence
>
export type LocalNotificationAdapter = LocalMockAdapter<NotificationAdapterResult>

export function createLocalNotificationAdapter(): LocalNotificationAdapter {
  function execute(candidate: unknown): NotificationAdapterResult {
    const validated = validateMockRequest({
      adapter: 'NOTIFICATION',
      schema: notificationRequestSchema,
      candidate,
      supportedScenarios: NOTIFICATION_SCENARIO_NAMES,
    })
    if (!validated.success) {
      return validated.result
    }

    const request = validated.data
    const configured = NOTIFICATION_SCENARIOS[request.scenario]
    return createMockOutcome({
      adapter: 'NOTIFICATION',
      requestReference: request.requestReference,
      correlationId: request.correlationId,
      outcome: configured.outcome,
      classification: configured.classification,
      reasonCode: configured.reasonCode,
      metadata: {
        caseId: request.caseId,
        template: request.template,
        recipient: request.recipient,
        deliveryChannel: 'LOCAL_OUTBOX_SIMULATION',
      },
    })
  }

  return Object.freeze({ execute })
}
