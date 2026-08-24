import type { PersistedDomainEvent } from '../persistence'
import { deepFreeze } from '../policy/schema'
import {
  MEDICAL_APPLICATION_DRAFT_ID,
  MEDICAL_CASE_ID,
  MEDICAL_CONTROLLED_ANSWERS,
  MEDICAL_ETA_ID,
  MEDICAL_PAYMENT_ATTEMPT_ID,
  MEDICAL_PAYMENT_REFERENCE,
  MEDICAL_SCRUTINY_RECORD_ID,
  TOURIST_APPLICATION_DRAFT_ID,
  TOURIST_CASE_ID,
  TOURIST_ETA_ID,
  TOURIST_SCRUTINY_RECORD_ID,
  createDraftSnapshot,
  createSeedCase,
  createSeedDocument,
  createSeedEnvelope,
  createSeedEventFactory,
} from './cases'
import {
  hospitalLetterV1Fixture,
  unclearPassportPageFixture,
  validPassportPageFixture,
  validPortraitFixture,
} from './documents'
import {
  recoverySeedSchema,
  type DocumentFixture,
  type RecoverySeed,
  type RecoverySeedId,
} from './schema'

const PORTRAIT_VERSION_ID = 'SYN-DOCVER-PORTRAIT-V1' as const
const PASSPORT_VERSION_ID = 'SYN-DOCVER-PASSPORT-V1' as const
const PASSPORT_DEFECT_VERSION_ID = 'SYN-DOCVER-PASSPORT-DEFECT-V1' as const
const HOSPITAL_V1_VERSION_ID = 'SYN-DOCVER-HOSPITAL-V1' as const
const PAYMENT_IDEMPOTENCY_KEY = 'SYN-IDEMPOTENCY-MEDICAL-PAYMENT-001' as const

type SeedEventFactory = ReturnType<typeof createSeedEventFactory>

function parseSeed(input: unknown): RecoverySeed {
  return deepFreeze(recoverySeedSchema.parse(input))
}

function createMedicalSnapshot(input: {
  snapshotId: `SYN-${string}`
  sequence: number
  currentStep: 'APPLICATION' | 'DOCUMENTS' | 'REVIEW'
  answers: Readonly<Record<string, string>>
  savedAtMinute: number
}) {
  return createDraftSnapshot({
    snapshotId: input.snapshotId,
    caseId: MEDICAL_CASE_ID,
    sequence: input.sequence,
    currentStep: input.currentStep,
    answers: input.answers,
    savedAtMinute: input.savedAtMinute,
  })
}

function addDraftCreated(event: SeedEventFactory, scenarioId: string): PersistedDomainEvent {
  return event({
    eventType: 'DraftCreated',
    domain: 'APPLICATION',
    aggregateId: MEDICAL_APPLICATION_DRAFT_ID,
    actor: 'APPLICANT',
    newState: 'DRAFT_CREATED',
    payload: { scenarioId },
  })
}

function addMedicalApplicationStarted(
  event: SeedEventFactory,
  snapshots: readonly ReturnType<typeof createMedicalSnapshot>[],
): PersistedDomainEvent[] {
  const events: PersistedDomainEvent[] = [
    addDraftCreated(event, 'SYN-MEDICAL-001'),
    event({
      eventType: 'DraftWorkStarted',
      domain: 'APPLICATION',
      aggregateId: MEDICAL_APPLICATION_DRAFT_ID,
      actor: 'APPLICANT',
      previousState: 'DRAFT_CREATED',
      newState: 'IN_PROGRESS',
      payload: {},
    }),
  ]

  for (const snapshot of snapshots) {
    events.push(
      event({
        eventType: 'DraftSnapshotSaved',
        domain: 'APPLICATION',
        aggregateId: MEDICAL_APPLICATION_DRAFT_ID,
        actor: 'APPLICANT',
        payload: {
          snapshotId: snapshot.snapshotId,
          stepId: snapshot.currentStep,
          sequence: snapshot.sequence,
        },
      }),
    )
  }
  return events
}

function addLockedApplicationEvidence(
  event: SeedEventFactory,
  snapshot: ReturnType<typeof createMedicalSnapshot>,
): PersistedDomainEvent[] {
  return [
    event({
      eventType: 'DraftSnapshotSaved',
      domain: 'APPLICATION',
      aggregateId: MEDICAL_APPLICATION_DRAFT_ID,
      actor: 'APPLICANT',
      payload: {
        snapshotId: snapshot.snapshotId,
        stepId: snapshot.currentStep,
        sequence: snapshot.sequence,
      },
    }),
    event({
      eventType: 'ApplicationLocked',
      domain: 'APPLICATION',
      aggregateId: MEDICAL_APPLICATION_DRAFT_ID,
      actor: 'SYSTEM',
      previousState: 'SUBMITTED',
      newState: 'LOCKED',
      payload: {},
    }),
  ]
}

function addDocumentCreated(
  event: SeedEventFactory,
  fixture: DocumentFixture,
  documentVersionId: `SYN-${string}`,
): PersistedDomainEvent {
  return event({
    eventType: 'DocumentVersionCreated',
    domain: 'DOCUMENT',
    aggregateId: fixture.fixtureId,
    actor: 'APPLICANT',
    newState: 'CREATED',
    payload: {
      documentAssetId: fixture.fixtureId,
      documentVersionId,
      fixtureCategory: fixture.fixtureCategory,
      sequence: 1,
    },
  })
}

function addDocumentSubmittedEvidence(
  event: SeedEventFactory,
  fixture: DocumentFixture,
  documentVersionId: `SYN-${string}`,
): PersistedDomainEvent {
  return event({
    eventType: 'DocumentVersionSubmitted',
    domain: 'DOCUMENT',
    aggregateId: fixture.fixtureId,
    actor: 'APPLICANT',
    previousState: 'PREFLIGHT_PASSED',
    newState: 'SUBMITTED',
    payload: { documentAssetId: fixture.fixtureId, documentVersionId },
  })
}

function addMedicalSubmittedDocumentEvents(event: SeedEventFactory): PersistedDomainEvent[] {
  return [
    addDocumentSubmittedEvidence(event, validPortraitFixture, PORTRAIT_VERSION_ID),
    addDocumentSubmittedEvidence(event, validPassportPageFixture, PASSPORT_VERSION_ID),
    addDocumentSubmittedEvidence(event, hospitalLetterV1Fixture, HOSPITAL_V1_VERSION_ID),
  ]
}

function addAmbiguousPaymentEvents(event: SeedEventFactory): PersistedDomainEvent[] {
  return [
    event({
      eventType: 'MockPaymentInitiated',
      domain: 'PAYMENT',
      aggregateId: MEDICAL_PAYMENT_ATTEMPT_ID,
      actor: 'PAYMENT_MOCK',
      previousState: 'NOT_STARTED',
      newState: 'INITIATED',
      idempotencyKey: PAYMENT_IDEMPOTENCY_KEY,
      payload: { attemptId: MEDICAL_PAYMENT_ATTEMPT_ID, outcomeCode: 'INITIATED' },
    }),
    event({
      eventType: 'MockPaymentPending',
      domain: 'PAYMENT',
      aggregateId: MEDICAL_PAYMENT_ATTEMPT_ID,
      actor: 'PAYMENT_MOCK',
      previousState: 'INITIATED',
      newState: 'PENDING',
      idempotencyKey: PAYMENT_IDEMPOTENCY_KEY,
      payload: { attemptId: MEDICAL_PAYMENT_ATTEMPT_ID, outcomeCode: 'PENDING' },
    }),
    event({
      eventType: 'PaymentReconciliationRequired',
      domain: 'PAYMENT',
      aggregateId: MEDICAL_PAYMENT_ATTEMPT_ID,
      actor: 'PAYMENT_MOCK',
      previousState: 'PENDING',
      newState: 'RECONCILIATION_REQUIRED',
      idempotencyKey: PAYMENT_IDEMPOTENCY_KEY,
      payload: {
        attemptId: MEDICAL_PAYMENT_ATTEMPT_ID,
        outcomeCode: 'RECONCILIATION_REQUIRED',
      },
    }),
  ]
}

function addPaymentConfirmedEvidence(event: SeedEventFactory): PersistedDomainEvent {
  return event({
    eventType: 'PaymentReconciledConfirmed',
    domain: 'PAYMENT',
    aggregateId: MEDICAL_PAYMENT_ATTEMPT_ID,
    actor: 'PAYMENT_MOCK',
    previousState: 'RECONCILIATION_REQUIRED',
    newState: 'CONFIRMED',
    idempotencyKey: PAYMENT_IDEMPOTENCY_KEY,
    payload: { attemptId: MEDICAL_PAYMENT_ATTEMPT_ID, outcomeCode: 'CONFIRMED' },
  })
}

function addScrutinyStarted(event: SeedEventFactory): PersistedDomainEvent[] {
  return [
    event({
      eventType: 'ScrutinyQueued',
      domain: 'SCRUTINY',
      aggregateId: MEDICAL_SCRUTINY_RECORD_ID,
      actor: 'SYSTEM',
      previousState: 'NOT_STARTED',
      newState: 'QUEUED',
      payload: { scrutinyRecordId: MEDICAL_SCRUTINY_RECORD_ID },
    }),
    event({
      eventType: 'ScrutinyStarted',
      domain: 'SCRUTINY',
      aggregateId: MEDICAL_SCRUTINY_RECORD_ID,
      actor: 'REVIEWER',
      previousState: 'QUEUED',
      newState: 'IN_REVIEW',
      payload: { scrutinyRecordId: MEDICAL_SCRUTINY_RECORD_ID },
    }),
  ]
}

function addDocumentReviewStarted(
  event: SeedEventFactory,
  fixture: DocumentFixture,
  documentVersionId: `SYN-${string}`,
): PersistedDomainEvent {
  return event({
    eventType: 'DocumentReviewStarted',
    domain: 'DOCUMENT',
    aggregateId: fixture.fixtureId,
    actor: 'REVIEWER',
    previousState: 'SUBMITTED',
    newState: 'UNDER_REVIEW',
    payload: { documentAssetId: fixture.fixtureId, documentVersionId },
  })
}

function createFreshMedicalSeed(): RecoverySeed {
  const event = createSeedEventFactory({ seedTag: 'MEDICAL-START', caseId: MEDICAL_CASE_ID })
  const auditEvents = [addDraftCreated(event, 'SYN-MEDICAL-001')]
  const persistedCase = createSeedCase({
    caseId: MEDICAL_CASE_ID,
    scenarioId: 'SYN-MEDICAL-001',
    applicationDraftId: MEDICAL_APPLICATION_DRAFT_ID,
    applicationState: 'DRAFT_CREATED',
    applicationRevision: 0,
    snapshots: [],
    documents: [],
    paymentState: 'NOT_STARTED',
    scrutinyRecordId: MEDICAL_SCRUTINY_RECORD_ID,
    scrutinyState: 'NOT_STARTED',
    submittedDocumentVersionIds: [],
    syntheticEtaId: MEDICAL_ETA_ID,
    etaState: 'NOT_READY',
    auditEvents,
    updatedAtMinute: 1,
  })

  return parseSeed({
    seedId: 'SEED-MEDICAL-START',
    label: 'Medical primary scenario — fresh start',
    seedKind: 'SCENARIO_ROOT',
    scenarioId: 'SYN-MEDICAL-001',
    caseId: MEDICAL_CASE_ID,
    recoveryOracle: 'BEGIN_FRESH_CASE',
    expectedState: {
      application: 'DRAFT_CREATED',
      documents: [],
      payment: 'NOT_STARTED',
      scrutiny: 'NOT_STARTED',
      eta: 'NOT_READY',
      currentStep: null,
      outcomeCode: null,
    },
    envelope: createSeedEnvelope(persistedCase),
  })
}

function createFreshTouristSeed(): RecoverySeed {
  const event = createSeedEventFactory({ seedTag: 'TOURIST-START', caseId: TOURIST_CASE_ID })
  const auditEvents = [
    event({
      eventType: 'DraftCreated',
      domain: 'APPLICATION',
      aggregateId: TOURIST_APPLICATION_DRAFT_ID,
      actor: 'APPLICANT',
      newState: 'DRAFT_CREATED',
      payload: { scenarioId: 'SYN-TOURIST-001' },
    }),
  ]
  const persistedCase = createSeedCase({
    caseId: TOURIST_CASE_ID,
    scenarioId: 'SYN-TOURIST-001',
    applicationDraftId: TOURIST_APPLICATION_DRAFT_ID,
    applicationState: 'DRAFT_CREATED',
    applicationRevision: 0,
    snapshots: [],
    documents: [],
    paymentState: 'NOT_STARTED',
    scrutinyRecordId: TOURIST_SCRUTINY_RECORD_ID,
    scrutinyState: 'NOT_STARTED',
    submittedDocumentVersionIds: [],
    syntheticEtaId: TOURIST_ETA_ID,
    etaState: 'NOT_READY',
    auditEvents,
    updatedAtMinute: 1,
  })

  return parseSeed({
    seedId: 'SEED-TOURIST-START',
    label: 'Tourist shared-contract validation — fresh start',
    seedKind: 'SCENARIO_ROOT',
    scenarioId: 'SYN-TOURIST-001',
    caseId: TOURIST_CASE_ID,
    recoveryOracle: 'BEGIN_FRESH_CASE',
    expectedState: {
      application: 'DRAFT_CREATED',
      documents: [],
      payment: 'NOT_STARTED',
      scrutiny: 'NOT_STARTED',
      eta: 'NOT_READY',
      currentStep: null,
      outcomeCode: null,
    },
    envelope: createSeedEnvelope(persistedCase),
  })
}

function createInterruptedDraftSeed(): RecoverySeed {
  const event = createSeedEventFactory({ seedTag: 'MEDICAL-DRAFT', caseId: MEDICAL_CASE_ID })
  const firstSnapshot = createMedicalSnapshot({
    snapshotId: 'SYN-SNAPSHOT-MED-001',
    sequence: 1,
    currentStep: 'APPLICATION',
    answers: {
      'Q-SHARED-POLICY-COHORT': MEDICAL_CONTROLLED_ANSWERS['Q-SHARED-POLICY-COHORT'],
      'Q-SHARED-PASSPORT-CLASS': MEDICAL_CONTROLLED_ANSWERS['Q-SHARED-PASSPORT-CLASS'],
      'Q-SHARED-ARRIVAL-DATE': MEDICAL_CONTROLLED_ANSWERS['Q-SHARED-ARRIVAL-DATE'],
      'Q-MEDICAL-TREATMENT-INTENT': MEDICAL_CONTROLLED_ANSWERS['Q-MEDICAL-TREATMENT-INTENT'],
    },
    savedAtMinute: 3,
  })
  const latestSnapshot = createMedicalSnapshot({
    snapshotId: 'SYN-SNAPSHOT-MED-002',
    sequence: 2,
    currentStep: 'DOCUMENTS',
    answers: MEDICAL_CONTROLLED_ANSWERS,
    savedAtMinute: 4,
  })
  const auditEvents = addMedicalApplicationStarted(event, [firstSnapshot, latestSnapshot])
  const persistedCase = createSeedCase({
    caseId: MEDICAL_CASE_ID,
    scenarioId: 'SYN-MEDICAL-001',
    applicationDraftId: MEDICAL_APPLICATION_DRAFT_ID,
    applicationState: 'IN_PROGRESS',
    applicationRevision: 2,
    snapshots: [firstSnapshot, latestSnapshot],
    documents: [],
    paymentState: 'NOT_STARTED',
    scrutinyRecordId: MEDICAL_SCRUTINY_RECORD_ID,
    scrutinyState: 'NOT_STARTED',
    submittedDocumentVersionIds: [],
    syntheticEtaId: MEDICAL_ETA_ID,
    etaState: 'NOT_READY',
    auditEvents,
    updatedAtMinute: 4,
  })

  return parseSeed({
    seedId: 'SEED-MEDICAL-INTERRUPTED-DRAFT',
    label: 'Medical interrupted draft — deterministic resume',
    seedKind: 'RECOVERY',
    scenarioId: 'SYN-MEDICAL-001',
    caseId: MEDICAL_CASE_ID,
    recoveryOracle: 'RESUME_SAME_DRAFT',
    expectedState: {
      application: 'IN_PROGRESS',
      documents: [],
      payment: 'NOT_STARTED',
      scrutiny: 'NOT_STARTED',
      eta: 'NOT_READY',
      currentStep: 'DOCUMENTS',
      outcomeCode: null,
    },
    envelope: createSeedEnvelope(persistedCase),
  })
}

function createDocumentDefectSeed(): RecoverySeed {
  const event = createSeedEventFactory({ seedTag: 'MEDICAL-DOC-DEFECT', caseId: MEDICAL_CASE_ID })
  const snapshot = createMedicalSnapshot({
    snapshotId: 'SYN-SNAPSHOT-MED-DOC-DEFECT-001',
    sequence: 1,
    currentStep: 'DOCUMENTS',
    answers: MEDICAL_CONTROLLED_ANSWERS,
    savedAtMinute: 3,
  })
  const auditEvents = [
    ...addMedicalApplicationStarted(event, [snapshot]),
    addDocumentCreated(event, unclearPassportPageFixture, PASSPORT_DEFECT_VERSION_ID),
    event({
      eventType: 'DocumentPreflightFailed',
      domain: 'DOCUMENT',
      aggregateId: unclearPassportPageFixture.fixtureId,
      actor: 'SYSTEM',
      previousState: 'CREATED',
      newState: 'PREFLIGHT_FAILED',
      payload: {
        documentAssetId: unclearPassportPageFixture.fixtureId,
        documentVersionId: PASSPORT_DEFECT_VERSION_ID,
        outcomeCode: 'DOC_PREFLIGHT_UNCLEAR_SYNTHETIC',
      },
    }),
  ]
  const documents = [
    createSeedDocument({
      fixture: unclearPassportPageFixture,
      documentVersionId: PASSPORT_DEFECT_VERSION_ID,
      state: 'PREFLIGHT_FAILED',
    }),
  ]
  const persistedCase = createSeedCase({
    caseId: MEDICAL_CASE_ID,
    scenarioId: 'SYN-MEDICAL-001',
    applicationDraftId: MEDICAL_APPLICATION_DRAFT_ID,
    applicationState: 'IN_PROGRESS',
    applicationRevision: 2,
    snapshots: [snapshot],
    documents,
    paymentState: 'NOT_STARTED',
    scrutinyRecordId: MEDICAL_SCRUTINY_RECORD_ID,
    scrutinyState: 'NOT_STARTED',
    submittedDocumentVersionIds: [],
    syntheticEtaId: MEDICAL_ETA_ID,
    etaState: 'NOT_READY',
    auditEvents,
    updatedAtMinute: 5,
  })

  return parseSeed({
    seedId: 'SEED-MEDICAL-DOCUMENT-DEFECT',
    label: 'Medical controlled document technical defect',
    seedKind: 'RECOVERY',
    scenarioId: 'SYN-MEDICAL-001',
    caseId: MEDICAL_CASE_ID,
    recoveryOracle: 'SELECT_CORRECTED_BUNDLED_FIXTURE',
    expectedState: {
      application: 'IN_PROGRESS',
      documents: [
        {
          fixtureId: unclearPassportPageFixture.fixtureId,
          activeVersionState: 'PREFLIGHT_FAILED',
        },
      ],
      payment: 'NOT_STARTED',
      scrutiny: 'NOT_STARTED',
      eta: 'NOT_READY',
      currentStep: 'DOCUMENTS',
      outcomeCode: 'DOC_PREFLIGHT_UNCLEAR_SYNTHETIC',
    },
    envelope: createSeedEnvelope(persistedCase),
  })
}

function createSubmittedDocuments(finalHospitalState: 'SUBMITTED' | 'UNDER_REVIEW' | 'REUPLOAD_REQUESTED') {
  return [
    createSeedDocument({
      fixture: validPortraitFixture,
      documentVersionId: PORTRAIT_VERSION_ID,
      state: finalHospitalState === 'SUBMITTED' ? 'SUBMITTED' : 'UNDER_REVIEW',
    }),
    createSeedDocument({
      fixture: validPassportPageFixture,
      documentVersionId: PASSPORT_VERSION_ID,
      state: finalHospitalState === 'SUBMITTED' ? 'SUBMITTED' : 'UNDER_REVIEW',
    }),
    createSeedDocument({
      fixture: hospitalLetterV1Fixture,
      documentVersionId: HOSPITAL_V1_VERSION_ID,
      state: finalHospitalState,
    }),
  ]
}

function createAmbiguousPaymentSeed(): RecoverySeed {
  const event = createSeedEventFactory({ seedTag: 'MEDICAL-PAYMENT', caseId: MEDICAL_CASE_ID })
  const snapshot = createMedicalSnapshot({
    snapshotId: 'SYN-SNAPSHOT-MED-PAYMENT-001',
    sequence: 1,
    currentStep: 'REVIEW',
    answers: MEDICAL_CONTROLLED_ANSWERS,
    savedAtMinute: 1,
  })
  const auditEvents = [
    ...addLockedApplicationEvidence(event, snapshot),
    ...addMedicalSubmittedDocumentEvents(event),
    ...addAmbiguousPaymentEvents(event),
  ]
  const documents = createSubmittedDocuments('SUBMITTED')
  const persistedCase = createSeedCase({
    caseId: MEDICAL_CASE_ID,
    scenarioId: 'SYN-MEDICAL-001',
    applicationDraftId: MEDICAL_APPLICATION_DRAFT_ID,
    applicationState: 'LOCKED',
    applicationRevision: 5,
    snapshots: [snapshot],
    documents,
    paymentState: 'RECONCILIATION_REQUIRED',
    paymentAttemptId: MEDICAL_PAYMENT_ATTEMPT_ID,
    paymentReference: MEDICAL_PAYMENT_REFERENCE,
    scrutinyRecordId: MEDICAL_SCRUTINY_RECORD_ID,
    scrutinyState: 'NOT_STARTED',
    submittedDocumentVersionIds: [],
    syntheticEtaId: MEDICAL_ETA_ID,
    etaState: 'NOT_READY',
    auditEvents,
    updatedAtMinute: auditEvents.length,
  })

  return parseSeed({
    seedId: 'SEED-MEDICAL-AMBIGUOUS-PAYMENT',
    label: 'Medical ambiguous mock payment — reconciliation required',
    seedKind: 'RECOVERY',
    scenarioId: 'SYN-MEDICAL-001',
    caseId: MEDICAL_CASE_ID,
    recoveryOracle: 'CHECK_MOCK_PAYMENT_STATUS',
    expectedState: {
      application: 'LOCKED',
      documents: documents.map((document) => ({
        fixtureId: document.documentAssetId,
        activeVersionState: 'SUBMITTED',
      })),
      payment: 'RECONCILIATION_REQUIRED',
      scrutiny: 'NOT_STARTED',
      eta: 'NOT_READY',
      currentStep: 'REVIEW',
      outcomeCode: null,
    },
    envelope: createSeedEnvelope(persistedCase),
  })
}

function createReuploadRequestedSeed(): RecoverySeed {
  const event = createSeedEventFactory({ seedTag: 'MEDICAL-REUPLOAD', caseId: MEDICAL_CASE_ID })
  const snapshot = createMedicalSnapshot({
    snapshotId: 'SYN-SNAPSHOT-MED-REUPLOAD-001',
    sequence: 1,
    currentStep: 'REVIEW',
    answers: MEDICAL_CONTROLLED_ANSWERS,
    savedAtMinute: 1,
  })
  const auditEvents: PersistedDomainEvent[] = [
    ...addLockedApplicationEvidence(event, snapshot),
    ...addMedicalSubmittedDocumentEvents(event),
    addPaymentConfirmedEvidence(event),
    ...addScrutinyStarted(event),
    addDocumentReviewStarted(event, validPortraitFixture, PORTRAIT_VERSION_ID),
    addDocumentReviewStarted(event, validPassportPageFixture, PASSPORT_VERSION_ID),
    addDocumentReviewStarted(event, hospitalLetterV1Fixture, HOSPITAL_V1_VERSION_ID),
  ]
  auditEvents.push(
    event({
      eventType: 'ScrutinyActionRequired',
      domain: 'SCRUTINY',
      aggregateId: MEDICAL_SCRUTINY_RECORD_ID,
      actor: 'REVIEWER',
      previousState: 'IN_REVIEW',
      newState: 'ACTION_REQUIRED',
      payload: {
        scrutinyRecordId: MEDICAL_SCRUTINY_RECORD_ID,
        documentAssetId: hospitalLetterV1Fixture.fixtureId,
        documentVersionId: HOSPITAL_V1_VERSION_ID,
        outcomeCode: 'DOC_HOSPITAL_ADMISSION_DATE_UNCLEAR_SYNTHETIC',
      },
    }),
    event({
      eventType: 'DocumentReuploadRequested',
      domain: 'DOCUMENT',
      aggregateId: hospitalLetterV1Fixture.fixtureId,
      actor: 'REVIEWER',
      previousState: 'UNDER_REVIEW',
      newState: 'REUPLOAD_REQUESTED',
      payload: {
        documentAssetId: hospitalLetterV1Fixture.fixtureId,
        documentVersionId: HOSPITAL_V1_VERSION_ID,
        outcomeCode: 'DOC_HOSPITAL_ADMISSION_DATE_UNCLEAR_SYNTHETIC',
      },
    }),
  )
  const documents = createSubmittedDocuments('REUPLOAD_REQUESTED')
  const submittedDocumentVersionIds = [
    PORTRAIT_VERSION_ID,
    PASSPORT_VERSION_ID,
    HOSPITAL_V1_VERSION_ID,
  ]
  const persistedCase = createSeedCase({
    caseId: MEDICAL_CASE_ID,
    scenarioId: 'SYN-MEDICAL-001',
    applicationDraftId: MEDICAL_APPLICATION_DRAFT_ID,
    applicationState: 'LOCKED',
    applicationRevision: 5,
    snapshots: [snapshot],
    documents,
    paymentState: 'CONFIRMED',
    paymentAttemptId: MEDICAL_PAYMENT_ATTEMPT_ID,
    paymentReference: MEDICAL_PAYMENT_REFERENCE,
    scrutinyRecordId: MEDICAL_SCRUTINY_RECORD_ID,
    scrutinyState: 'ACTION_REQUIRED',
    submittedDocumentVersionIds,
    syntheticEtaId: MEDICAL_ETA_ID,
    etaState: 'NOT_READY',
    auditEvents,
    updatedAtMinute: auditEvents.length,
  })

  return parseSeed({
    seedId: 'SEED-MEDICAL-REUPLOAD-REQUESTED',
    label: 'Medical hospital-letter correction requested',
    seedKind: 'RECOVERY',
    scenarioId: 'SYN-MEDICAL-001',
    caseId: MEDICAL_CASE_ID,
    recoveryOracle: 'SUBMIT_CORRECTED_HOSPITAL_LETTER',
    expectedState: {
      application: 'LOCKED',
      documents: [
        { fixtureId: validPortraitFixture.fixtureId, activeVersionState: 'UNDER_REVIEW' },
        { fixtureId: validPassportPageFixture.fixtureId, activeVersionState: 'UNDER_REVIEW' },
        {
          fixtureId: hospitalLetterV1Fixture.fixtureId,
          activeVersionState: 'REUPLOAD_REQUESTED',
        },
      ],
      payment: 'CONFIRMED',
      scrutiny: 'ACTION_REQUIRED',
      eta: 'NOT_READY',
      currentStep: 'REVIEW',
      outcomeCode: 'DOC_HOSPITAL_ADMISSION_DATE_UNCLEAR_SYNTHETIC',
    },
    envelope: createSeedEnvelope(persistedCase),
  })
}

function createStatusRecoverySeed(): RecoverySeed {
  const event = createSeedEventFactory({ seedTag: 'MEDICAL-STATUS', caseId: MEDICAL_CASE_ID })
  const snapshot = createMedicalSnapshot({
    snapshotId: 'SYN-SNAPSHOT-MED-STATUS-001',
    sequence: 1,
    currentStep: 'REVIEW',
    answers: MEDICAL_CONTROLLED_ANSWERS,
    savedAtMinute: 1,
  })
  const auditEvents = [
    ...addLockedApplicationEvidence(event, snapshot),
    ...addMedicalSubmittedDocumentEvents(event),
    addPaymentConfirmedEvidence(event),
    ...addScrutinyStarted(event),
    addDocumentReviewStarted(event, validPortraitFixture, PORTRAIT_VERSION_ID),
    addDocumentReviewStarted(event, validPassportPageFixture, PASSPORT_VERSION_ID),
    addDocumentReviewStarted(event, hospitalLetterV1Fixture, HOSPITAL_V1_VERSION_ID),
  ]
  const documents = createSubmittedDocuments('UNDER_REVIEW')
  const submittedDocumentVersionIds = [
    PORTRAIT_VERSION_ID,
    PASSPORT_VERSION_ID,
    HOSPITAL_V1_VERSION_ID,
  ]
  const persistedCase = createSeedCase({
    caseId: MEDICAL_CASE_ID,
    scenarioId: 'SYN-MEDICAL-001',
    applicationDraftId: MEDICAL_APPLICATION_DRAFT_ID,
    applicationState: 'LOCKED',
    applicationRevision: 5,
    snapshots: [snapshot],
    documents,
    paymentState: 'CONFIRMED',
    paymentAttemptId: MEDICAL_PAYMENT_ATTEMPT_ID,
    paymentReference: MEDICAL_PAYMENT_REFERENCE,
    scrutinyRecordId: MEDICAL_SCRUTINY_RECORD_ID,
    scrutinyState: 'IN_REVIEW',
    submittedDocumentVersionIds,
    syntheticEtaId: MEDICAL_ETA_ID,
    etaState: 'NOT_READY',
    auditEvents,
    updatedAtMinute: auditEvents.length,
  })

  return parseSeed({
    seedId: 'SEED-MEDICAL-STATUS-RECOVERY',
    label: 'Medical status recovery — scrutiny continuing',
    seedKind: 'RECOVERY',
    scenarioId: 'SYN-MEDICAL-001',
    caseId: MEDICAL_CASE_ID,
    recoveryOracle: 'WAIT_FOR_SYNTHETIC_SCRUTINY',
    expectedState: {
      application: 'LOCKED',
      documents: documents.map((document) => ({
        fixtureId: document.documentAssetId,
        activeVersionState: 'UNDER_REVIEW',
      })),
      payment: 'CONFIRMED',
      scrutiny: 'IN_REVIEW',
      eta: 'NOT_READY',
      currentStep: 'REVIEW',
      outcomeCode: null,
    },
    envelope: createSeedEnvelope(persistedCase),
  })
}

export const canonicalRecoverySeeds = deepFreeze([
  createFreshMedicalSeed(),
  createFreshTouristSeed(),
  createInterruptedDraftSeed(),
  createDocumentDefectSeed(),
  createAmbiguousPaymentSeed(),
  createReuploadRequestedSeed(),
  createStatusRecoverySeed(),
])

export function listSeeds(): readonly RecoverySeed[] {
  return canonicalRecoverySeeds
}

export function getSeed(seedId: RecoverySeedId): RecoverySeed {
  const seed = canonicalRecoverySeeds.find((candidate) => candidate.seedId === seedId)
  if (seed === undefined) {
    throw new Error(`Canonical recovery seed is missing: ${seedId}`)
  }
  return seed
}
