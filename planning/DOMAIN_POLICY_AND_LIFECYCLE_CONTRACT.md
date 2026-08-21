# Domain, Policy and Lifecycle Contract

## A. Status, authority and boundary

> **Status:** `APPROVED — DAY 1 SPRINT MINIMUM`

This language-neutral document defines the minimum implementation contract for the frozen P0 in [`PHASE_1_BRIEF.md`](PHASE_1_BRIEF.md), under `D-009` and the [`HACKATHON_SPRINT_PLAN.md`](HACKATHON_SPRINT_PLAN.md). The [`system dissection`](../docs/evisa-system-dissection.md) is evidence, not a license to infer private IVFRT architecture.

Every person, case, document, payment and event is synthetic. Every external dependency remains behind a later local, fail-closed mock adapter. The contract represents no real legal eligibility, visa decision, biometric decision or admissibility decision. It selects no technology or implementation. Phase 2 remains `NOT STARTED`; its full gate is unmet because executable model tests do not yet exist.

## B. Modeling principles and invariants

1. The synthetic `Case` is the central aggregate identifier and correlation root.
2. Policy decisions are deterministic, versioned and explainable.
3. AI output can never become authoritative policy or lifecycle state.
4. A case pins its policy version when its draft is created.
5. Resume preserves the pinned version.
6. A policy preview never mutates an existing case.
7. Application, document, payment, scrutiny and ETA lifecycles remain separate; notification is separate too.
8. Overall case status and next action are deterministic projections of those lifecycles, never editable flags.
9. Every accepted transition emits an append-only, privacy-safe audit event.
10. Invalid transitions fail closed without changing authoritative state.
11. Every retryable command requires an idempotency key.
12. Document replacement creates a new version and never overwrites history.
13. ETA issuance requires confirmed mock payment and approved synthetic scrutiny.
14. ETA never implies mock border admission.
15. Unknown, contradictory or unsupported policy returns `NOT_SUPPORTED_IN_DEMO` or `POLICY_CONFLICT`, never an invented answer.
16. No UI-specific Medical or Tourist branch is authoritative; differences come from policy results and manifests.

`Case` centrality does not merge the state machines. Each aggregate validates its own transitions. Fail-closed rejection preserves every version and lifecycle state; it may record privacy-safe rejection diagnostics but produces no success event, financial effect or lifecycle advance.

## C. Core entities and ownership

| Entity | Purpose | Stable identifier | Important attributes | Owner/aggregate | Mutability | Synthetic/privacy constraint |
|---|---|---|---|---|---|---|
| `SyntheticApplicant` | Fictional applicant fixture | `syntheticApplicantId` | scenario, display label, synthetic country/contact/passport refs | Fixture catalogue; referenced by `Case` | Immutable seed | Obvious fiction, reserved contact, no real PII or health data |
| `Case` | Central operational correlation | `caseId` | scenario, applicant ref, created time, pinned bundle/version, aggregate refs, revision | Root of scope | Identity and policy pin immutable; commands change children | Namespaced synthetic ID; derived status is not stored |
| `ApplicationDraft` | Current application workflow | `applicationDraftId` | state, current step, active snapshot, manifest, revision | `Case` application aggregate | Transition-only until locked | Bounded synthetic answers only |
| `DraftSnapshot` | Durable save checkpoint | `draftSnapshotId` | sequence, answers, step, manifest, policy pin, saved time | `ApplicationDraft` | Append-only | No free-form sensitive disclosure |
| `PolicyBundle` | Versioned policy unit | `policyBundleId@semanticVersion` | status, effective bounds, provenance, digest, member IDs | Policy aggregate; pinned by `Case` | Immutable once active | Demo policy, never current legal truth |
| `PolicyRule` | Deterministic condition/effect rule | `ruleId` within bundle | priority, conditions, effects, reasons, references | `PolicyBundle` | Immutable within version | Declarative; no UI or executable-language branch |
| `PolicyEvaluation` | Evaluation evidence | `policyEvaluationId` | mode, minimal facts/digest, bundle/version, matched rules, result, time | `Case`, or preview context | Immutable | No AI authority or legal-result language |
| `QuestionManifest` | Policy-selected questions | `questionManifestId` | shared/additional question IDs, order, requiredness, value types | `PolicyBundle` | Immutable | No free-text health intake |
| `DocumentRequirement` | Policy-selected evidence need | `documentRequirementId` | class, required flag, fixture classes, preflight profile, reasons | `PolicyBundle` | Immutable | No claim of current official constraint |
| `DocumentAsset` | Logical evidence slot | `documentAssetId` | case, requirement, class, version refs | `Case` document aggregate | Versions append; active ref advances | Bundled synthetic assets only |
| `DocumentVersion` | Historical asset version | `documentVersionId` | sequence, fixture/hash, safe metadata, watermark, state, predecessor | `DocumentAsset` | Content never overwritten; state transitions | No arbitrary upload or real document |
| `DocumentInspection` | Deterministic inspection result | `documentInspectionId` | version, profile, outcome, reasons, fixture time | `DocumentVersion` | Append-only | No body, image, OCR or identity claim |
| `MockPaymentAttempt` | One mock financial attempt | `mockPaymentAttemptId` | quote, fictional amount/unit, state, outcome, synthetic ref, key, times | `Case` payment aggregate | Transition-only | No card, account, credential or processor token |
| `MockReconciliation` | Resolve ambiguity once | `mockReconciliationId` | attempt, key, observed mock outcomes, result, reason, times | Payment attempt | Append-only after result | Local scenario facts only |
| `ScrutinyRecord` | Synthetic review lifecycle | `scrutinyRecordId` | state, submitted version refs, defect reason, policy pin, times | `Case` scrutiny aggregate | Transition-only | No real queue, risk system, medical judgment or adjudication |
| `ReviewerAction` | Bounded conceptual action | `reviewerActionId` | action type, document version, reason, actor type, key, time | `ScrutinyRecord` | Append-only | No private identity or sensitive free-text note |
| `NotificationRecord` | Local delivery simulation | `notificationRecordId` | cause, template, reserved recipient ref, state, retry count, times | `Case` notification aggregate | Transition-only | Local outbox; no real delivery |
| `SyntheticETA` | Visibly non-valid artifact | `syntheticEtaId` | state, synthetic purpose, policy pin, artifact ref, fictional dates, watermark | `Case` ETA aggregate | Guarded transitions; issued artifact immutable | No seal, barcode, QR code or travel validity |
| `DownstreamSimulationEvent` | Mock post-ETA event | `downstreamSimulationEventId` | ETA ref, event type, named outcome, causation, fixture time | `Case` | Append-only | No biometric material, passenger record or real border action |
| `AuditEvent` | Privacy-safe transition evidence | `eventId` | Section I envelope | `Case` audit ledger | Append-only | Metadata only; prohibited content excluded |

Relationship contract:

```text
SyntheticApplicant -> Case -> pinned PolicyBundle@version
PolicyBundle -> PolicyRule, QuestionManifest, DocumentRequirement
Case -> PolicyEvaluation, ApplicationDraft -> DraftSnapshot
Case -> DocumentAsset -> DocumentVersion -> DocumentInspection
Case -> MockPaymentAttempt -> MockReconciliation
Case -> ScrutinyRecord -> ReviewerAction
Case -> NotificationRecord, SyntheticETA, DownstreamSimulationEvent, AuditEvent
```

Every operational child carries `caseId`; this is a POC relationship model, not a government database or service map.

## D. Versioned policy contract

### Bundle and rule shape

| Contract | Required fields and behavior |
|---|---|
| `PolicyBundle` | `policyBundleId`, semantic version, `DRAFT`/`ACTIVE_FOR_DEMO`/`RETIRED`, fictional inclusive `effectiveFrom` and exclusive `effectiveTo`, synthetic provenance, digest, rules, manifests and requirements |
| `PolicyRule` | `ruleId`, priority, typed fact/operator/value conditions, effects, explanation/reason codes and source/reference labels |

Evaluation uses only: mode (`NEW_CASE`, `RESUME`, `PREVIEW`), controlled evaluation time, scenario intent, synthetic policy cohort, synthetic passport class, planned arrival date, and bounded purpose facts. Medical may add proposed admission date and attendant-guidance flag; Tourist may add planned exit date. Names, passport content, document bodies, health details and payment facts are excluded.

Every output contains `policyBundleId`, `policyVersion`, `evaluatedAt`, `scenarioSupport`, suggested synthetic purpose, selected question manifest, document requirements, a visibly synthetic mock fee quote, relevant date/condition outputs, reason codes and provenance references. `scenarioSupport` is exactly one of:

- `SUPPORTED_BY_DEMO`
- `NEEDS_MORE_INFORMATION`
- `NOT_SUPPORTED_IN_DEMO`
- `POLICY_CONFLICT`

Suggested purpose and dependent effects are absent when support is incomplete, unsupported or conflicted. Policy guidance never uses `ELIGIBLE`, `INELIGIBLE`, `APPROVED`, `GRANTED` or equivalent legal language.

### Deterministic evaluation and version rules

1. A new case requires exactly one effective `ACTIVE_FOR_DEMO` bundle at the controlled fixture time; it pins that exact version.
2. An existing case resolves its pinned version, even if that version is later `RETIRED`; resume cannot repin it.
3. Preview evaluates an explicitly named candidate version without writing case, draft or lifecycle state.
4. Missing mandatory facts return `NEEDS_MORE_INFORMATION`; no matching rule returns `NOT_SUPPORTED_IN_DEMO`.
5. Matching rules order by descending priority then `ruleId`. Compatible effects merge; priority never silently overrides incompatible effects.
6. Overlapping matches with incompatible effects, multiple effective active bundles or a missing pinned bundle return `POLICY_CONFLICT` with reasons and references.
7. Bundle content is immutable once active. Any change creates a semantic version; retroactive case migration is deferred.

## E. Representative synthetic policy fixtures

The shared bundle is wholly fictional:

| Field | Value |
|---|---|
| Qualified ID | `SYN-EVISA-POLICY@1.0.0` |
| Status | `ACTIVE_FOR_DEMO` |
| Effective bounds | `2099-01-01` to `2100-01-01`, controlled fixture calendar only |
| Cohort/country | `SYN-POLICY-COHORT-A`; `SYN-COUNTRY-A — Synthetic Country Alpha` |
| Provenance | `PROV-SYN-FROZEN-P0`; approved synthetic scope, not legal policy |

| Fixture | Minimum fictional facts |
|---|---|
| `SYN-MEDICAL-001` | `scenarioIntent=SYNTHETIC_MEDICAL_TREATMENT`; `SYN-APPLICANT-MED-001` / “Demo Patient Alpha”; `SYN-PASSPORT-MED-001`; arrival `2099-04-14`; admission `2099-04-18`; “Synthetic Care Centre Alpha”; hospital-letter fixture says only “Planned synthetic admission 2099-04-18 — SYNTHETIC — NOT VALID”; fee `73 SYNTHETIC_DEMO_CREDITS`. |
| `SYN-TOURIST-001` | `scenarioIntent=SYNTHETIC_TOURISM`; `SYN-APPLICANT-TOUR-001` / “Demo Traveller Beta”; `SYN-PASSPORT-TOUR-001`; arrival `2099-05-10`; exit `2099-05-17`; fee `41 SYNTHETIC_DEMO_CREDITS`; no hospital letter. |

Both mutually exclusive intent rules have priority `100` and use the same evaluator and lifecycle contract.

| Expected output | `SYN-MEDICAL-001` | `SYN-TOURIST-001` |
|---|---|---|
| Bundle/version/time | `SYN-EVISA-POLICY`, `1.0.0`, `2099-03-01T09:00:00Z` | `SYN-EVISA-POLICY`, `1.0.0`, `2099-03-01T09:00:00Z` |
| Support/purpose | `SUPPORTED_BY_DEMO`; `SYNTHETIC_MEDICAL_PURPOSE` | `SUPPORTED_BY_DEMO`; `SYNTHETIC_TOURIST_PURPOSE` |
| Manifest | `QM-MEDICAL-1`: shared plus treatment intent, admission date and attendant-guidance questions | `QM-TOURIST-1`: shared plus leisure intent and planned-exit questions |
| Documents | `REQ-PORTRAIT-1`, `REQ-PASSPORT-PAGE-1`, `REQ-HOSPITAL-LETTER-1`; attendant guidance only, no linked case | `REQ-PORTRAIT-1`, `REQ-PASSPORT-PAGE-1`; no hospital letter |
| Fee/date conditions | `73 SYNTHETIC_DEMO_CREDITS`; fictional arrival/admission; `ATTENDANT_GUIDANCE_ONLY` | `41 SYNTHETIC_DEMO_CREDITS`; fictional arrival/exit; `NO_HOSPITAL_LETTER_IN_DEMO_FIXTURE` |
| Reasons | `R-SYN-MEDICAL-INTENT`, `R-SYN-MEDICAL-DOCUMENTS`, `R-SYN-ATTENDANT-ONLY` | `R-SYN-TOURIST-INTENT`, `R-SYN-TOURIST-DOCUMENTS`, `R-SYN-NO-HOSPITAL-LETTER` |
| Provenance | `PROV-SYN-P1-MEDICAL`, `PROV-SYN-FROZEN-P0` | `PROV-SYN-P1-TOURIST`, `PROV-SYN-FROZEN-P0` |

Every displayed result therefore carries version, reason and provenance. Both fee quotes are labeled `SYNTHETIC — NOT PAYABLE`.

## F. Explicit lifecycle definitions

`†` means contract-supported but not exercised by the frozen demo. `APPROVED` below is only a synthetic scrutiny state. Actors are `APPLICANT` (synthetic), `SYSTEM` (deterministic local), `REVIEWER` (conceptual), `PAYMENT_MOCK` and `NOTIFICATION_MOCK`. Every retryable command uses a key: same key and payload returns the prior result without another effect; changed payload returns `IDEMPOTENCY_CONFLICT`. Every rejected row fails closed without a success event or state change.

### Application

| From | Command/event | Actor | Guard | To | Audit event | Idempotency/retry | Rejection |
|---|---|---|---|---|---|---|---|
| — | `CreateDraft` | `APPLICANT` | Supported fixture; one active bundle | `DRAFT_CREATED` | `DraftCreated` | Key returns same case | Policy result; no case |
| `DRAFT_CREATED` | `BeginDraft` | `APPLICANT` | Case/pin match | `IN_PROGRESS` | `DraftWorkStarted` | Key returns prior | No change |
| `IN_PROGRESS` | `SaveSnapshot` | `APPLICANT` | Valid bounded answers/step | `IN_PROGRESS` | `DraftSnapshotSaved` | Key prevents duplicate | Retain last snapshot |
| `IN_PROGRESS` | `MarkReadyForReview` | `SYSTEM` | Required answers complete | `READY_FOR_REVIEW` | `DraftReadyForReview` | Key returns prior | Missing reasons; no change |
| `READY_FOR_REVIEW`, `READY_TO_SUBMIT` | `AmendDraft` | `APPLICANT` | Not submitted | `IN_PROGRESS` | `DraftReopened` | Key returns prior | No change |
| `READY_FOR_REVIEW` | `ConfirmReview` | `APPLICANT` | Complete snapshot; required preflight passes | `READY_TO_SUBMIT` | `ApplicationReadyToSubmit` | Key returns prior | Gap reasons; no change |
| `READY_TO_SUBMIT` | `SubmitApplication` | `APPLICANT` | Pinned evaluation agrees; manifest satisfied | `SUBMITTED` | `ApplicationSubmitted` | Key returns same submission | No submission |
| `SUBMITTED` | `LockSubmission` | `SYSTEM` | Submission persisted | `LOCKED` | `ApplicationLocked` | Causal-event dedupe | No payment access |
| `DRAFT_CREATED`, `IN_PROGRESS`, `READY_FOR_REVIEW`, `READY_TO_SUBMIT` | `WithdrawDraft†` | `APPLICANT` | Not submitted/locked | `WITHDRAWN†` | `ApplicationWithdrawn` | Key returns prior | No change |

Resume is a read: it returns the latest snapshot for the same case without creating or transitioning a draft.

### Document version

| From | Command/event | Actor | Guard | To | Audit event | Idempotency/retry | Rejection |
|---|---|---|---|---|---|---|---|
| — | `CreateDocumentVersion` | `APPLICANT` | Bundled matching fixture; next sequence | `CREATED` | `DocumentVersionCreated` | Key; never overwrite | Reject unknown/public upload |
| `CREATED` | `PreflightFailed` | `SYSTEM` | Deterministic reason exists | `PREFLIGHT_FAILED` | `DocumentPreflightFailed` | Inspection dedupe | No change |
| `CREATED` | `PreflightPassed` | `SYSTEM` | All checks pass | `PREFLIGHT_PASSED` | `DocumentPreflightPassed` | Inspection dedupe | No change |
| `PREFLIGHT_PASSED` | `SubmitDocumentVersion` | `APPLICANT` | Latest; initial/open request | `SUBMITTED` | `DocumentVersionSubmitted` | Key returns prior | Reject stale/wrong class |
| `SUBMITTED` | `StartDocumentReview` | `REVIEWER` | Scrutiny queued/in review | `UNDER_REVIEW` | `DocumentReviewStarted` | Causal dedupe | No change |
| `UNDER_REVIEW` | `RequestReupload` | `REVIEWER` | Exact supported defect | `REUPLOAD_REQUESTED` | `DocumentReuploadRequested` | Key returns prior | Reject unsupported reason |
| `UNDER_REVIEW` | `AcceptDocument` | `REVIEWER` | Declared outcome; no defect | `ACCEPTED` | `DocumentAccepted` | Key returns prior | No change |
| `UNDER_REVIEW` | `RejectDocument†` | `REVIEWER` | Declared terminal reason | `REJECTED†` | `DocumentRejected` | Key returns prior | No change |
| `PREFLIGHT_FAILED`, `PREFLIGHT_PASSED`, `REUPLOAD_REQUESTED` | `ActivateReplacement` | `SYSTEM` | Newer valid version exists | `SUPERSEDED` | `DocumentVersionSuperseded` | Replacement key | Retain old state |

### Mock payment

| From | Command/event | Actor | Guard | To | Audit event | Idempotency/retry | Rejection |
|---|---|---|---|---|---|---|---|
| `NOT_STARTED` | `StartMockPayment` | `APPLICANT` | Application locked; no unresolved/confirmed attempt | `INITIATED` | `MockPaymentInitiated` | Key returns attempt | Block duplicate |
| `FAILED†` | `StartReplacementMockPayment†` | `APPLICANT` | Prior attempt terminal; new idempotency key | `INITIATED` on a new attempt | `MockPaymentRetryInitiated` | New key creates once; failed attempt retained | Reject reused/conflicting key |
| `INITIATED` | `MockResultPending` | `PAYMENT_MOCK` | Matching attempt | `PENDING` | `MockPaymentPending` | Event dedupe | Reject mismatch |
| `INITIATED`, `PENDING` | `MockResultConfirmed` | `PAYMENT_MOCK` | Synthetic confirmation | `CONFIRMED` | `MockPaymentConfirmed` | Exactly once | Reject contradiction |
| `INITIATED`, `PENDING` | `MockResultFailed†` | `PAYMENT_MOCK` | Declared no-charge failure | `FAILED†` | `MockPaymentFailed` | Event dedupe | Reject ambiguity |
| `PENDING` | `MarkAmbiguous` | `SYSTEM` | Delayed/contradictory fixture | `RECONCILIATION_REQUIRED` | `PaymentReconciliationRequired` | Causal dedupe | Never infer result |
| `RECONCILIATION_REQUIRED` | `ReconcileConfirmed` | `PAYMENT_MOCK` | Matching reconciliation fixture | `CONFIRMED` | `PaymentReconciledConfirmed` | Key; exactly once | Reject conflict |
| `RECONCILIATION_REQUIRED` | `ReconcileFailed†` | `PAYMENT_MOCK` | Declared no-charge result | `FAILED†` | `PaymentReconciledFailed` | Key returns prior | Reject conflict |
| `CONFIRMED` | `StartMockRefund†` | `SYSTEM` | Declared reason | `REFUND_PENDING†` | `MockRefundPending` | Key returns prior | No change |
| `REFUND_PENDING†` | `ConfirmMockRefund†` | `PAYMENT_MOCK` | Matching synthetic ref | `REFUNDED†` | `MockPaymentRefunded` | Event dedupe | No change |

### Synthetic scrutiny

| From | Command/event | Actor | Guard | To | Audit event | Idempotency/retry | Rejection |
|---|---|---|---|---|---|---|---|
| `NOT_STARTED` | `QueueScrutiny` | `SYSTEM` | Locked; payment confirmed; documents submitted | `QUEUED` | `ScrutinyQueued` | Causal dedupe | No review |
| `QUEUED` | `BeginScrutiny` | `REVIEWER` | Declared fixture action | `IN_REVIEW` | `ScrutinyStarted` | Key returns prior | No change |
| `IN_REVIEW` | `RequestApplicantAction` | `REVIEWER` | Exact version/reason; correlated document transition separately guarded | `ACTION_REQUIRED` | `ScrutinyActionRequired` | Key correlates separate guarded transitions | Reject both if either guard fails |
| `ACTION_REQUIRED` | `SubmitCorrection` | `APPLICANT` | Every request has newer submitted version | `RESUBMITTED` | `ScrutinyResubmitted` | Key returns prior | Remaining reasons |
| `RESUBMITTED` | `ResumeScrutiny` | `REVIEWER` | Replacements available | `IN_REVIEW` | `ScrutinyResumed` | Key returns prior | No change |
| `IN_REVIEW` | `RecordSyntheticApproval` | `REVIEWER` | Latest required documents accepted | `APPROVED` | `SyntheticScrutinyApproved` | Key returns prior | No change |
| `IN_REVIEW` | `RecordSyntheticRejection†` | `REVIEWER` | Declared fixture reason | `REJECTED†` | `SyntheticScrutinyRejected` | Key returns prior | Reject unsupported reason |

### Synthetic ETA

| From | Command/event | Actor | Guard | To | Audit event | Idempotency/retry | Rejection |
|---|---|---|---|---|---|---|---|
| `NOT_READY` | `MarkETAReady` | `SYSTEM` | Payment `CONFIRMED`; scrutiny `APPROVED`; latest documents accepted | `READY_TO_ISSUE` | `SyntheticETAReadyToIssue` | Causal dedupe | Remain not ready |
| `READY_TO_ISSUE` | `IssueSyntheticETA` | `SYSTEM` | Guards rechecked; ID/watermark present | `ISSUED` | `SyntheticETAIssued` | Key; one artifact | No artifact |
| `ISSUED` | `RevokeSyntheticETA†` | `SYSTEM` | Declared synthetic reason | `REVOKED†` | `SyntheticETARevoked` | Key returns prior | No change |
| `ISSUED` | `FixtureClockExpired†` | `SYSTEM` | Controlled clock reaches fictional expiry | `EXPIRED†` | `SyntheticETAExpired` | Event dedupe | Reject real-time input |

ETA issuance has no border-admission effect.

### Local notification

| From | Command/event | Actor | Guard | To | Audit event | Idempotency/retry | Rejection |
|---|---|---|---|---|---|---|---|
| — | `QueueNotification` | `SYSTEM` | Reserved recipient, local template, cause | `QUEUED` | `NotificationQueued` | Case/template/cause key | Reject unsafe input |
| `QUEUED`, `RETRY_QUEUED` | `SimulatedDeliverySucceeded` | `NOTIFICATION_MOCK` | Matching local attempt | `DELIVERED_SIMULATED` | `NotificationDeliveredSimulated` | Event dedupe | No change |
| `QUEUED`, `RETRY_QUEUED` | `SimulatedDeliveryFailed` | `NOTIFICATION_MOCK` | Declared failure fixture | `DELIVERY_SIMULATION_FAILED` | `NotificationDeliverySimulationFailed` | Event dedupe | No change |
| `DELIVERY_SIMULATION_FAILED` | `QueueNotificationRetry` | `SYSTEM` | Retry budget remains | `RETRY_QUEUED` | `NotificationRetryQueued` | Key suppresses duplicate | Reject exhausted retry |

## G. Derived case status and next-action projection

Validate cross-lifecycle consistency first. Contradictory facts return an internal, non-persisted `STATUS_UNAVAILABLE` diagnostic; the applicant receives a safe unavailable explanation and no mutating action. It is not an exposed case status. Otherwise the first matching row wins. Notification and downstream events never set case status.

| Precedence/status | Triggering lifecycle facts | Applicant explanation | Exactly one action or wait | Unavailable actions |
|---|---|---|---|---|
| 1 `ETA_REVOKED_SYNTHETIC` | ETA `REVOKED` | Synthetic ETA revoked and unusable | `VIEW_CURRENT_STATUS` | ETA use, submit, pay, admission claim |
| 2 `ETA_EXPIRED_SYNTHETIC†` | ETA `EXPIRED†` | Synthetic ETA reached its fictional fixture expiry and is unusable | `VIEW_CURRENT_STATUS` | ETA use, edit, pay, re-upload, admission claim |
| 3 `NOT_GRANTED_SYNTHETIC` | Scrutiny `REJECTED` or application `WITHDRAWN` | Synthetic case closed; no legal implication | Explicitly no case action | Pay, resubmit, issue ETA |
| 4 `APPLICANT_ACTION_REQUIRED` | Scrutiny `ACTION_REQUIRED` or latest required document requests re-upload | Show exact reason | `REPLACE_REQUIRED_DOCUMENT` | Submit, pay, complete review, issue ETA |
| 5 `PAYMENT_ACTION_REQUIRED` | Payment `RECONCILIATION_REQUIRED` or `FAILED` | Mock payment needs safe resolution | `OPEN_MOCK_PAYMENT_RECOVERY` | Duplicate payment, scrutiny, ETA |
| 6 `PAYMENT_PENDING` | Locked/submitted; payment `NOT_STARTED`, `INITIATED` or `PENDING` | Mock payment has not confirmed | `OPEN_MOCK_PAYMENT_STATUS` | Repeat submit, duplicate attempt, scrutiny, ETA |
| 7 `GRANTED_SYNTHETIC` | ETA `ISSUED` and not revoked/expired | Synthetic review complete; ETA is not travel-valid | `VIEW_SYNTHETIC_ETA` | Edit, pay, re-upload, admission claim |
| 8 `UNDER_SCRUTINY` | Payment confirmed; scrutiny `NOT_STARTED`, `QUEUED`, `IN_REVIEW`, `RESUBMITTED` or `APPROVED` before ETA issue | Synthetic review/ETA preparation continues | Explicitly wait | Edit, pay, issue ETA manually |
| 9 `READY_TO_SUBMIT` | Application `READY_TO_SUBMIT` | Synthetic application is ready | `SUBMIT_SYNTHETIC_APPLICATION` | Payment, scrutiny, ETA |
| 10 `DRAFT` | Application `DRAFT_CREATED`, `IN_PROGRESS` or `READY_FOR_REVIEW` | Draft remains editable and saved | `CONTINUE_APPLICATION` | Premature submit, payment, scrutiny, ETA |

The daggered expiry projection is contract-supported but not exercised by the frozen demo. The precedence ensures re-upload cannot be hidden by older payment or notification events. Status and `nextAction` have no write command.

## H. Five mandatory recovery traces

| Recovery | Exact state/event sequence | Invariant proven |
|---|---|---|
| Interrupted draft | `DRAFT_CREATED -> IN_PROGRESS -> DraftSnapshotSaved -> interruption (no transition) -> Resume(caseId)` returns the same snapshot, case and policy pin | Same answers/step/version; repeated creation key returns same case; no duplicate draft |
| Invalid/unclear document | V1 `CREATED -> PREFLIGHT_FAILED(DOC_PREFLIGHT_UNCLEAR_SYNTHETIC)`; application does not advance; V2 `CREATED -> PREFLIGHT_PASSED`; V1 `-> SUPERSEDED` and retained | Precise reason, fail closed, corrected new version, immutable history |
| Pending/ambiguous payment | `NOT_STARTED -> INITIATED -> PENDING -> RECONCILIATION_REQUIRED`; repeat `StartMockPayment` with the original key returns the prior attempt/state, while a new key is rejected as `UNRESOLVED_ATTEMPT`; `ReconcileConfirmed -> CONFIRMED` and its repeated key returns that result | Duplicate attempt blocked without state change; one deterministic confirmation and mock effect |
| Re-upload requested | Scrutiny `IN_REVIEW -> ACTION_REQUIRED`; V1 `UNDER_REVIEW -> REUPLOAD_REQUESTED`; notification `QUEUED -> DELIVERY_SIMULATION_FAILED -> RETRY_QUEUED -> DELIVERED_SIMULATED`; V2 `CREATED -> PREFLIGHT_PASSED -> SUBMITTED`; V1 `-> SUPERSEDED`; scrutiny `ACTION_REQUIRED -> RESUBMITTED -> IN_REVIEW` | Notification recovery, retained V1, valid V2 and review resume agree |
| Status/next-action confusion | `MockPaymentConfirmed`, `ScrutinyActionRequired`, `DocumentReuploadRequested` and `NotificationDeliverySimulationFailed` events rebuild their current lifecycle facts; projection selects `APPLICANT_ACTION_REQUIRED -> REPLACE_REQUIRED_DOCUMENT`; correction/resume events then project `UNDER_SCRUTINY -> wait` | One current status/action; stale submit, pay and ETA actions unavailable |

## I. Events, audit and retry contract

Every `AuditEvent` contains: `eventId`, `caseId`, event type, aggregate type/ID, previous/new state, actor type, synthetic timestamp, policy version when relevant, reason code, idempotency key when relevant, and privacy-safe metadata only.

- Document bodies, photographs, declarations and unnecessary applicant fields never enter audit logs.
- Fixture timestamps and ordering are deterministic.
- Duplicate commands return the prior result without duplicate financial, lifecycle or audit success effects.
- Demo projections are rebuildable from canonical fixture state/events.
- Reset restores the canonical manifest exactly, including IDs, states, event order and fixture hashes.

## J. Implementation contract-test catalogue

All tests below are `TO IMPLEMENT` after the technical foundation exists. None currently passes or has been executed.

| # | Contract test | Input | Expected result | Invariant | Status |
|---:|---|---|---|---|---|
| 1 | Medical policy evaluation | Canonical Medical facts | Supported demo result, Medical manifest/docs/fee, version/reasons/provenance | Deterministic explainable policy | `TO IMPLEMENT` |
| 2 | Tourist policy evaluation | Canonical Tourist facts | Supported demo result, Tourist manifest/docs/fee, no hospital letter | Shared contract, category data | `TO IMPLEMENT` |
| 3 | Missing policy input | Medical facts without admission date | `NEEDS_MORE_INFORMATION`; dependent effects absent | No invented answer | `TO IMPLEMENT` |
| 4 | Conflicting rules | Two matching incompatible effects | `POLICY_CONFLICT` with both references | Fail closed | `TO IMPLEMENT` |
| 5 | Effective version selection | Controlled times inside/outside bundle range | Exactly one active version, otherwise safe unsupported/conflict | Deterministic versioning | `TO IMPLEMENT` |
| 6 | Draft pins version | Create, save and resume across active-version change | Same case/snapshot and `1.0.0` pin | Resume stability | `TO IMPLEMENT` |
| 7 | Invalid transition | Submit from `IN_PROGRESS` | Rejection; no state or success event | Transition guard | `TO IMPLEMENT` |
| 8 | Valid document | Valid bundled portrait/passport/letter | `PREFLIGHT_PASSED` with expected inspection | Deterministic preflight | `TO IMPLEMENT` |
| 9 | Controlled defect | Unclear hospital-letter fixture | `PREFLIGHT_FAILED` with exact reason | Precise failure | `TO IMPLEMENT` |
| 10 | Document replacement | Replace failed/requested V1 with V2 | V2 new ID; V1 retained and superseded | No overwrite | `TO IMPLEMENT` |
| 11 | Ambiguous duplicate | Repeat payment start while unresolved, once with the original key and once with a new key | Original key returns prior attempt; new key is rejected; zero duplicate mock charge | Idempotency | `TO IMPLEMENT` |
| 12 | Reconcile once | Repeat confirmation with same key | One `CONFIRMED` result/event | Exactly-once effect | `TO IMPLEMENT` |
| 13 | Re-upload resumes | Valid V2 submitted for open request | Scrutiny `RESUBMITTED -> IN_REVIEW`; history intact | Coherent recovery | `TO IMPLEMENT` |
| 14 | Premature ETA | Payment not confirmed or scrutiny not approved | Remains `NOT_READY`; no artifact | Dual guard | `TO IMPLEMENT` |
| 15 | Valid ETA issue | Both guards and watermark pass | `READY_TO_ISSUE -> ISSUED`, one artifact | Safe issuance | `TO IMPLEMENT` |
| 16 | Derived next action | Payment confirmed plus re-upload request | `APPLICANT_ACTION_REQUIRED`; replacement only | Precedence | `TO IMPLEMENT` |
| 17 | Notification retry | Declared local delivery failure | Failed -> retry queued -> delivered simulated | Local retry | `TO IMPLEMENT` |
| 18 | Shared lifecycles | Run Medical and Tourist fixture transitions | Same lifecycle definitions and commands | No category-specific state machine | `TO IMPLEMENT` |
| 19 | Audit privacy | Exercise all success/failure paths | No prohibited fields/content in events | Data minimization | `TO IMPLEMENT` |
| 20 | Canonical reset | Mutate every fixture store then reset | Exact canonical IDs, hashes, states and event order | Reproducibility | `TO IMPLEMENT` |

## K. Deferred and unknown

Deferred: full policy coverage; real fees, dates, countries, ports or legal conditions; policy-version migration; real identity/passport verification; real payment protocols; real reviewer roles, queues, risk systems or adjudication; real notifications; real APIS, biometric, border or IVFRT behavior; production event sourcing, distributed transactions or storage architecture; and all implementation technology. These remain unknown or require authorized discovery, not inference.

## L. Approval record

> **APPROVAL RECORDED**
>
> Explicit user approval confirms:
>
> - entities and ownership;
> - policy and version rules;
> - medical and tourist fixture outputs;
> - lifecycle states and guards;
> - case-status precedence;
> - all five recovery traces;
> - audit and idempotency rules; and
> - the 20-test contract catalogue.

This approval closes only Day 1 Sprint Task 2. Phase 2 remains `NOT STARTED`, and its full gate remains unmet until executable implementation and model tests pass. No technology or implementation was selected.
