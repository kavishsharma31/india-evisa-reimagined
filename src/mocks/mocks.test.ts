import { describe, expect, it } from 'vitest'

import { createLocalMockAdapters, CONTROLLED_MOCK_TIMESTAMP } from './index'

function paymentRequest() {
  return {
    requestReference: 'SYN-PAYMENT-REQUEST-001',
    correlationId: 'SYN-CORRELATION-PAYMENT-001',
    caseId: 'SYN-CASE-MEDICAL-001',
    applicationId: 'SYN-APPLICATION-MEDICAL-001',
    amount: 73,
    unit: 'SYNTHETIC_DEMO_CREDITS',
    idempotencyKey: 'SYN-IDEMPOTENCY-PAYMENT-001',
    scenario: 'PAYMENT_IMMEDIATE_CONFIRMATION',
  } as const
}

function documentRequest() {
  return {
    requestReference: 'SYN-DOCUMENT-REQUEST-001',
    correlationId: 'SYN-CORRELATION-DOCUMENT-001',
    caseId: 'SYN-CASE-MEDICAL-001',
    fixtureId: 'SYN-FIXTURE-PORTRAIT-VALID-001',
    expectedDocumentType: 'SYNTHETIC_PORTRAIT',
    scenario: 'DOCUMENT_PASS',
  } as const
}

function notificationRequest() {
  return {
    requestReference: 'SYN-NOTIFICATION-REQUEST-001',
    correlationId: 'SYN-CORRELATION-NOTIFICATION-001',
    caseId: 'SYN-CASE-MEDICAL-001',
    template: 'APPLICATION_UPDATE',
    recipient: 'demo-applicant@example.com',
    scenario: 'NOTIFICATION_DELIVERED',
  } as const
}

function clearanceRequest() {
  return {
    requestReference: 'SYN-CLEARANCE-REQUEST-001',
    correlationId: 'SYN-CORRELATION-CLEARANCE-001',
    caseId: 'SYN-CASE-MEDICAL-001',
    clearanceType: 'SYNTHETIC_GENERIC_CLEARANCE',
    purposeReference: 'SYN-PURPOSE-MEDICAL-001',
    scenario: 'CLEARANCE_APPROVED',
  } as const
}

function apisRequest() {
  return {
    requestReference: 'SYN-APIS-REQUEST-001',
    correlationId: 'SYN-CORRELATION-APIS-001',
    travellerReference: 'SYN-TRAVELLER-MEDICAL-001',
    itineraryEventReference: 'SYN-ITINERARY-EVENT-001',
    syntheticEtaReference: 'SYN-ETA-MEDICAL-001',
    scenario: 'APIS_MATCHED',
  } as const
}

function biometricRequest() {
  return {
    requestReference: 'SYN-BIOMETRIC-REQUEST-001',
    correlationId: 'SYN-CORRELATION-BIOMETRIC-001',
    caseId: 'SYN-CASE-MEDICAL-001',
    biometricReferenceId: 'SYN-BIOMETRIC-REFERENCE-001',
    scenario: 'BIOMETRIC_MATCH',
  } as const
}

function borderRequest() {
  return {
    requestReference: 'SYN-BORDER-REQUEST-001',
    correlationId: 'SYN-CORRELATION-BORDER-001',
    caseId: 'SYN-CASE-MEDICAL-001',
    syntheticEtaReference: 'SYN-ETA-MEDICAL-001',
    apisResultReference: 'SYN-APIS-RESULT-001',
    biometricResultReference: 'SYN-BIOMETRIC-RESULT-001',
    portEventReference: 'SYN-PORT-EVENT-001',
    scenario: 'BORDER_ADMITTED',
  } as const
}

function ivfrtLedgerRequest() {
  return {
    requestReference: 'SYN-IVFRT-REQUEST-001',
    correlationId: 'SYN-CORRELATION-IVFRT-001',
    caseId: 'SYN-CASE-MEDICAL-001',
    syntheticEtaReference: 'SYN-ETA-MEDICAL-001',
    eventType: 'SYNTHETIC_ENTRY_EVENT',
    eventReference: 'SYN-FOREIGNER-EVENT-001',
    scenario: 'IVFRT_RECORDED',
  } as const
}

function createAdapterCases() {
  const adapters = createLocalMockAdapters()

  return [
    {
      name: 'PAYMENT',
      execute: adapters.payment.execute,
      request: paymentRequest(),
      idField: 'caseId',
      sensitiveField: 'cardNumber',
    },
    {
      name: 'DOCUMENT_INSPECTION',
      execute: adapters.documentInspection.execute,
      request: documentRequest(),
      idField: 'caseId',
      sensitiveField: 'fileContent',
    },
    {
      name: 'NOTIFICATION',
      execute: adapters.notification.execute,
      request: notificationRequest(),
      idField: 'caseId',
      sensitiveField: 'providerCredential',
    },
    {
      name: 'CLEARANCE',
      execute: adapters.clearance.execute,
      request: clearanceRequest(),
      idField: 'caseId',
      sensitiveField: 'privatePayload',
    },
    {
      name: 'APIS',
      execute: adapters.apis.execute,
      request: apisRequest(),
      idField: 'travellerReference',
      sensitiveField: 'passportNumber',
    },
    {
      name: 'BIOMETRICS',
      execute: adapters.biometrics.execute,
      request: biometricRequest(),
      idField: 'caseId',
      sensitiveField: 'embedding',
    },
    {
      name: 'BORDER',
      execute: adapters.border.execute,
      request: borderRequest(),
      idField: 'caseId',
      sensitiveField: 'riskScore',
    },
    {
      name: 'IVFRT_LEDGER',
      execute: adapters.ivfrtLedger.execute,
      request: ivfrtLedgerRequest(),
      idField: 'caseId',
      sensitiveField: 'privateRecordId',
    },
  ] as const
}

describe('local mock adapter boundary', () => {
  it('exposes exactly the eight approved local adapter families', () => {
    expect(Object.keys(createLocalMockAdapters())).toEqual([
      'payment',
      'documentInspection',
      'notification',
      'clearance',
      'apis',
      'biometrics',
      'border',
      'ivfrtLedger',
    ])
  })

  it('returns deterministic, marked evidence for every known adapter scenario', () => {
    for (const adapterCase of createAdapterCases()) {
      const first = adapterCase.execute(adapterCase.request)
      const repeated = adapterCase.execute(adapterCase.request)

      expect(first).toEqual(repeated)
      expect(first).toMatchObject({
        status: 'MOCK_OUTCOME',
        adapter: adapterCase.name,
        mock: true,
        occurredAt: CONTROLLED_MOCK_TIMESTAMP,
      })
    }
  })

  it('fails closed on an unknown named scenario for every adapter', () => {
    for (const adapterCase of createAdapterCases()) {
      const result = adapterCase.execute({
        ...adapterCase.request,
        scenario: 'SYNTHETIC_UNKNOWN_SCENARIO',
      })

      expect(result).toMatchObject({
        status: 'REJECTED',
        rejectionKind: 'UNSUPPORTED_SCENARIO',
        adapter: adapterCase.name,
        reasonCode: 'MOCK_UNSUPPORTED_SCENARIO',
      })
    }
  })

  it('rejects malformed synthetic identifiers for every adapter', () => {
    for (const adapterCase of createAdapterCases()) {
      const result = adapterCase.execute({
        ...adapterCase.request,
        [adapterCase.idField]: 'INVALID-SYNTHETIC-NAMESPACE',
      })

      expect(result).toMatchObject({
        status: 'REJECTED',
        rejectionKind: 'INVALID_REQUEST',
        adapter: adapterCase.name,
      })
    }
  })

  it('rejects unexpected sensitive fields without echoing their values', () => {
    for (const adapterCase of createAdapterCases()) {
      const result = adapterCase.execute({
        ...adapterCase.request,
        [adapterCase.sensitiveField]: 'SYNTHETIC-FORBIDDEN-VALUE',
      })

      expect(result).toMatchObject({
        status: 'REJECTED',
        rejectionKind: 'INVALID_REQUEST',
      })
      expect(JSON.stringify(result)).not.toContain('SYNTHETIC-FORBIDDEN-VALUE')
    }
  })

  it('contains no runtime network primitive or external-address configuration', () => {
    const runtimeSources = import.meta.glob<string>(
      ['./*.ts', './local-adapters/*.ts', '!./mocks.test.ts'],
      { eager: true, import: 'default', query: '?raw' },
    )
    const source = Object.values(runtimeSources).join('\n')

    expect(source).not.toMatch(/\bfetch\s*\(/)
    expect(source).not.toMatch(/\bXMLHttpRequest\b/)
    expect(source).not.toMatch(/\bWebSocket\b/)
    expect(source).not.toMatch(/https?:\/\//)
    expect(source).not.toMatch(/(?:process|import\.meta)\.env/)
  })
})

describe('mock payment adapter', () => {
  it('supports every approved synthetic payment and reconciliation outcome', () => {
    const adapter = createLocalMockAdapters().payment
    const scenarios = [
      ['PAYMENT_IMMEDIATE_CONFIRMATION', 'CONFIRMED'],
      ['PAYMENT_DECLINED', 'DECLINED'],
      ['PAYMENT_PENDING', 'PENDING'],
      ['PAYMENT_AMBIGUOUS_RECONCILIATION', 'RECONCILIATION_REQUIRED'],
      ['PAYMENT_RECONCILIATION_CONFIRMED', 'RECONCILIATION_CONFIRMED'],
      ['PAYMENT_RECONCILIATION_NOT_CONFIRMED', 'RECONCILIATION_NOT_CONFIRMED'],
      ['PAYMENT_REFUND_PENDING', 'REFUND_PENDING'],
      ['PAYMENT_REFUNDED', 'REFUNDED'],
    ] as const

    for (const [index, [scenario, expectedOutcome]] of scenarios.entries()) {
      const result = adapter.execute({
        ...paymentRequest(),
        requestReference: `SYN-PAYMENT-REQUEST-${index + 1}`,
        correlationId: `SYN-CORRELATION-PAYMENT-${index + 1}`,
        idempotencyKey: `SYN-IDEMPOTENCY-PAYMENT-${index + 1}`,
        scenario,
      })

      expect(result).toMatchObject({ status: 'MOCK_OUTCOME', outcome: expectedOutcome })
    }
  })

  it('returns the original logical result and rejects conflicting idempotency-key reuse', () => {
    const adapter = createLocalMockAdapters().payment
    const first = adapter.execute(paymentRequest())
    const repeated = adapter.execute(paymentRequest())
    const conflict = adapter.execute({
      ...paymentRequest(),
      amount: 41,
      scenario: 'PAYMENT_PENDING',
    })

    expect(repeated).toEqual(first)
    expect(conflict).toMatchObject({
      status: 'REJECTED',
      rejectionKind: 'IDEMPOTENCY_CONFLICT',
      reasonCode: 'MOCK_PAYMENT_IDEMPOTENCY_CONFLICT',
    })

    adapter.reset()
    expect(
      adapter.execute({ ...paymentRequest(), amount: 41, scenario: 'PAYMENT_PENDING' }),
    ).toMatchObject({ status: 'MOCK_OUTCOME', outcome: 'PENDING' })
  })
})

describe('synthetic document inspection adapter', () => {
  it('maps known fixture metadata to pass, defect, review and unavailable outcomes', () => {
    const adapter = createLocalMockAdapters().documentInspection
    const cases = [
      [
        'SYN-FIXTURE-PORTRAIT-VALID-001',
        'SYNTHETIC_PORTRAIT',
        'DOCUMENT_PASS',
        'PREFLIGHT_PASSED',
      ],
      [
        'SYN-FIXTURE-PASSPORT-UNCLEAR-001',
        'SYNTHETIC_PASSPORT_PAGE',
        'DOCUMENT_TECHNICAL_DEFECT',
        'PREFLIGHT_FAILED',
      ],
      [
        'SYN-FIXTURE-PASSPORT-REVIEW-001',
        'SYNTHETIC_PASSPORT_PAGE',
        'DOCUMENT_REVIEW_REQUIRED',
        'SYNTHETIC_REVIEW_REQUIRED',
      ],
      [
        'SYN-FIXTURE-DOCUMENT-UNAVAILABLE-001',
        'SYNTHETIC_PASSPORT_PAGE',
        'DOCUMENT_UNAVAILABLE',
        'UNAVAILABLE',
      ],
    ] as const

    for (const [fixtureId, expectedDocumentType, scenario, outcome] of cases) {
      const result = adapter.execute({
        ...documentRequest(),
        fixtureId,
        expectedDocumentType,
        scenario,
      })

      expect(result).toMatchObject({ status: 'MOCK_OUTCOME', outcome })
    }
  })

  it('uses the exact technical-defect reason without creating a scrutiny decision', () => {
    const result = createLocalMockAdapters().documentInspection.execute({
      ...documentRequest(),
      fixtureId: 'SYN-FIXTURE-PASSPORT-UNCLEAR-001',
      expectedDocumentType: 'SYNTHETIC_PASSPORT_PAGE',
      scenario: 'DOCUMENT_TECHNICAL_DEFECT',
    })

    expect(result).toMatchObject({
      status: 'MOCK_OUTCOME',
      reasonCode: 'DOC_PREFLIGHT_UNCLEAR_SYNTHETIC',
      metadata: { reviewerDecisionMade: false },
    })
  })

  it('allows hospital-letter V1 to pass technical preflight', () => {
    const result = createLocalMockAdapters().documentInspection.execute({
      ...documentRequest(),
      fixtureId: 'SYN-FIXTURE-HOSPITAL-LETTER-V1-001',
      expectedDocumentType: 'SYNTHETIC_HOSPITAL_LETTER',
      scenario: 'DOCUMENT_PASS',
    })

    expect(result).toMatchObject({
      status: 'MOCK_OUTCOME',
      outcome: 'PREFLIGHT_PASSED',
      metadata: { reviewerDecisionMade: false },
    })
    expect(JSON.stringify(result)).not.toContain(
      'DOC_HOSPITAL_ADMISSION_DATE_UNCLEAR_SYNTHETIC',
    )
  })

  it('rejects unknown fixtures, fixture mismatches and arbitrary content fields', () => {
    const adapter = createLocalMockAdapters().documentInspection

    expect(
      adapter.execute({ ...documentRequest(), fixtureId: 'SYN-FIXTURE-UNKNOWN-001' }),
    ).toMatchObject({ status: 'REJECTED', rejectionKind: 'INVALID_REQUEST' })
    expect(
      adapter.execute({
        ...documentRequest(),
        expectedDocumentType: 'SYNTHETIC_HOSPITAL_LETTER',
      }),
    ).toMatchObject({ status: 'REJECTED', rejectionKind: 'UNSUPPORTED_COMBINATION' })
    expect(
      adapter.execute({ ...documentRequest(), fileBytes: 'SYNTHETIC-FORBIDDEN' }),
    ).toMatchObject({ status: 'REJECTED', rejectionKind: 'INVALID_REQUEST' })
  })
})

describe('notification adapter', () => {
  it('supports delivery failure and explicit retry recovery outcomes', () => {
    const adapter = createLocalMockAdapters().notification
    const scenarios = [
      ['NOTIFICATION_QUEUED', 'QUEUED'],
      ['NOTIFICATION_DELIVERY_FAILED', 'DELIVERY_SIMULATION_FAILED'],
      ['NOTIFICATION_RETRY_QUEUED', 'RETRY_QUEUED'],
      ['NOTIFICATION_RETRY_DELIVERED', 'RETRY_DELIVERED_SIMULATED'],
      ['NOTIFICATION_DELIVERED', 'DELIVERED_SIMULATED'],
    ] as const

    for (const [scenario, outcome] of scenarios) {
      expect(adapter.execute({ ...notificationRequest(), scenario })).toMatchObject({
        status: 'MOCK_OUTCOME',
        outcome,
      })
    }
  })

  it('rejects every recipient outside the reserved example-domain fixture', () => {
    const result = createLocalMockAdapters().notification.execute({
      ...notificationRequest(),
      recipient: 'not-a-demo-recipient@invalid.test',
    })

    expect(result).toMatchObject({ status: 'REJECTED', rejectionKind: 'INVALID_REQUEST' })
  })
})

describe('clearance, APIS and biometric adapters', () => {
  it('keeps generic clearance outcomes conceptual and fails closed on an unsupported type', () => {
    const adapter = createLocalMockAdapters().clearance

    expect(adapter.execute(clearanceRequest())).toMatchObject({
      status: 'MOCK_OUTCOME',
      outcome: 'APPROVED_SIMULATED',
      metadata: { workflowRepresentation: 'CONCEPTUAL_BOUNDARY_ONLY' },
    })
    expect(
      adapter.execute({ ...clearanceRequest(), scenario: 'CLEARANCE_PENDING' }),
    ).toMatchObject({ status: 'MOCK_OUTCOME', outcome: 'PENDING_SIMULATED' })
    expect(
      adapter.execute({ ...clearanceRequest(), clearanceType: 'SYNTHETIC_UNKNOWN_CLEARANCE' }),
    ).toMatchObject({ status: 'REJECTED', rejectionKind: 'INVALID_REQUEST' })
  })

  it('returns deterministic matched, delayed and unavailable APIS evidence', () => {
    const adapter = createLocalMockAdapters().apis
    const cases = [
      ['APIS_MATCHED', 'MATCHED_SIMULATED'],
      ['APIS_DELAYED', 'DELAYED_SIMULATED'],
      ['APIS_UNAVAILABLE', 'UNAVAILABLE_SIMULATED'],
    ] as const

    for (const [scenario, outcome] of cases) {
      const result = adapter.execute({ ...apisRequest(), scenario })
      expect(result).toMatchObject({
        status: 'MOCK_OUTCOME',
        outcome,
        metadata: { passengerDataIncluded: false },
      })
    }
  })

  it('returns metadata-only biometric outcomes and rejects material-like fields', () => {
    const adapter = createLocalMockAdapters().biometrics

    expect(adapter.execute(biometricRequest())).toMatchObject({
      status: 'MOCK_OUTCOME',
      outcome: 'MATCH_SIMULATED',
      metadata: { biometricMaterialIncluded: false, computationPerformed: false },
    })
    expect(
      adapter.execute({ ...biometricRequest(), scenario: 'BIOMETRIC_MISMATCH' }),
    ).toMatchObject({ status: 'MOCK_OUTCOME', outcome: 'MISMATCH_SIMULATED' })
    expect(
      adapter.execute({ ...biometricRequest(), scenario: 'BIOMETRIC_MANUAL_REFERRAL' }),
    ).toMatchObject({ status: 'MOCK_OUTCOME', outcome: 'MANUAL_REFERRAL_SIMULATED' })
    expect(
      adapter.execute({ ...biometricRequest(), imageBytes: 'SYNTHETIC-FORBIDDEN' }),
    ).toMatchObject({ status: 'REJECTED', rejectionKind: 'INVALID_REQUEST' })
  })
})

describe('border and IVFRT ledger adapters', () => {
  it('keeps border simulation separate from ETA issuance and any admission guarantee', () => {
    const adapter = createLocalMockAdapters().border
    const cases = [
      ['BORDER_ADMITTED', 'ADMITTED_SIMULATED'],
      ['BORDER_DENIED', 'DENIED_SIMULATED'],
      ['BORDER_REFERRED', 'REFERRED_SIMULATED'],
    ] as const

    for (const [scenario, outcome] of cases) {
      expect(adapter.execute({ ...borderRequest(), scenario })).toMatchObject({
        status: 'MOCK_OUTCOME',
        outcome,
        metadata: {
          separateFromEtaIssuance: true,
          admissionGuaranteedByEta: false,
        },
      })
    }
  })

  it('models record, duplicate and ordering conflict as explicit local ledger evidence', () => {
    const adapter = createLocalMockAdapters().ivfrtLedger
    const cases = [
      ['IVFRT_RECORDED', 'RECORDED_SIMULATED'],
      ['IVFRT_DUPLICATE', 'DUPLICATE_SIMULATED'],
      ['IVFRT_ORDERING_CONFLICT', 'ORDERING_CONFLICT_SIMULATED'],
    ] as const

    for (const [scenario, outcome] of cases) {
      const request = { ...ivfrtLedgerRequest(), scenario }
      const result = adapter.execute(request)
      expect(result).toEqual(adapter.execute(request))
      expect(result).toMatchObject({
        status: 'MOCK_OUTCOME',
        outcome,
        metadata: { appendEvidenceOnly: true, privateWorkflowClaimed: false },
      })
    }
  })
})
