# Service Blueprint and UX Wireflow

## A. Status, authority and experience principles

> **Status:** `DRAFT — DAY 1 SPRINT MINIMUM AWAITING USER REVIEW`

This implementation-ready experience contract derives from the approved [`PHASE_1_BRIEF.md`](PHASE_1_BRIEF.md) and [`DOMAIN_POLICY_AND_LIFECYCLE_CONTRACT.md`](DOMAIN_POLICY_AND_LIFECYCLE_CONTRACT.md), under `D-009`. It freezes the minimum service and UX behavior for the P0 without completing Phases 3 or 4, selecting technology or describing private IVFRT workflows.

Experience principles are locked:

1. Applicant-first; institutional views exist only to support the applicant story.
2. Explain before asking, then ask only what the case's pinned policy manifest requires.
3. Continuously show current progress and saved state.
4. Keep editable application progress separate from post-submission case status.
5. Expose exactly one safe next action or an explicit waiting explanation.
6. Make unofficial, synthetic and mock behavior unmistakable.
7. Never imply legal eligibility, approval, advice, admissibility or a processing promise.
8. Never require AI; deterministic policy and state are authoritative.
9. Accept no real personal information or arbitrary uploads.
10. Be mobile-first, keyboard-operable and understandable without color.
11. Keep reviewer and policy-administration views deliberately thin.

The visual direction is calm, modern and civic-service-oriented but clearly unofficial: high contrast, generous spacing and restrained color. It must not copy official branding or use an Indian government emblem, seal or Ashoka Chakra. Final identity and exact design tokens remain deferred.

## B. Actors and service lanes

| Lane | Responsibilities | May read | May act | Prohibited | Visible demo evidence |
|---|---|---|---|---|---|
| 1. Synthetic applicant | Complete and recover one fictional journey | Approved fixture values, explanations, progress, status, timeline | Choose scenario/options, save, submit synthetic commands, select bundled fixtures | Real PII, health disclosure, passport data, uploads, credentials or authoritative decisions | Applicant screens, saved evidence and one next action |
| 2. Applicant interface | Explain, collect bounded input and render projections | Question/document manifests, policy result, case projection, privacy-safe events | Issue guarded commands; never write status directly | Hard-coded category rules, hidden state mutation, fake authentication or live submission | Six-step progress, form, cards, timeline and notices |
| 3. Deterministic policy/state layer | Evaluate pinned policy, validate transitions and derive status/action | Minimum scenario facts, bundle, aggregate states and idempotency keys | Return reasons/manifests; accept or reject commands; emit audit events | AI authority, legal conclusions, unsupported rule answers or editable projection flags | Version/reasons, exact states, rejected-action explanations |
| 4. Local fail-closed mock adapters | Simulate payment, notification, inspection and downstream outcomes | Namespaced IDs, scenario flags and minimum safe metadata | Return predeclared local outcomes and failures | Network fallback, live endpoint, credential, document body or biometric material | `MOCK`/`SIMULATED` labels, deterministic references and failure states |
| 5. Conceptual reviewer/policy administrator | Demonstrate one correction and one policy preview | One synthetic case, versions, reasons, safe timeline; active/candidate bundle | Request one controlled re-upload; run read-only preview | Queues, risk scores, real roles, adjudication, publishing or migration | `R01` correction and `P01` non-mutating impact preview |
| 6. Audit, timeline and reset layer | Preserve privacy-safe evidence, project status and restore fixtures | Audit envelope, canonical manifest and aggregate states | Append events, rebuild projections, seed/reset canonical scenarios | Edit history, log content/images/declarations or silently mutate cases | Ordered domain-labeled timeline and confirmed deterministic reset |

## C. End-to-end service blueprint

The stages describe POC behavior, not private institutional processes.

| # / stage | Applicant goal and frontstage | Deterministic/backstage behavior | Lifecycle states/events | Mock boundary | Likely failure → recovery | Audit evidence | Safety/non-claim copy |
|---|---|---|---|---|---|---|---|
| 1. Prototype entry and scenario choice | Goal: understand the service. UI: persistent notice, Medical/Tourist cards, demo help | Load canonical scenario catalogue; no case yet | No case transition | Local seed/reset control | Unknown route → return to chooser without data loss | Fixture/reset verification, not a case event | “Prototype only; no application is submitted.” |
| 2. Purpose guidance | Goal: map intent safely. UI: bounded questions, reasons and provenance | Evaluate minimum facts against active `SYN-EVISA-POLICY@1.0.0`; fail closed | Immutable `PolicyEvaluation`; no case mutation | None | Missing/conflict → `NEEDS_MORE_INFORMATION`, `NOT_SUPPORTED_IN_DEMO` or `POLICY_CONFLICT` | Evaluation ID, version, rules, reasons, provenance | “Supported by this demo is not legal eligibility.” |
| 3. Draft creation | Goal: start a recoverable case. UI: result confirmation and case receipt | Create one `Case`, pin policy, select manifest | `CreateDraft`: — → `DRAFT_CREATED`; `DraftCreated` | None | Retry → same case by idempotency key | Case ID, policy pin, event | “Fictional case; cannot reach government systems.” |
| 4. Adaptive application | Goal: answer only relevant questions. UI: controlled form and saved indicator | Render pinned manifest; validate bounded answers; snapshot each step | `BeginDraft` → `IN_PROGRESS`; `DraftWorkStarted`, `DraftSnapshotSaved` | None | Invalid/missing answer → linked error; retain last snapshot | Snapshot sequence, step, synthetic time | “Use only the displayed synthetic values.” |
| 5. Interruption and resume | Goal: return without lost work. UI: resume receipt and restored step | Read latest snapshot for same case and pin; create nothing | No resume transition; prior `DraftSnapshotSaved` remains | Local interruption control | Missing snapshot → safe unavailable message; reset option | Same case, answers, step, version; no duplicate event | “Resume restores a demo fixture, not personal data.” |
| 6. Document preparation | Goal: prepare required evidence. UI: policy-derived cards and bundled selector | Create immutable version; deterministic preflight by profile | `CREATED` → `PREFLIGHT_PASSED` or `PREFLIGHT_FAILED`; `DocumentVersionCreated`, `DocumentPreflightPassed` or `DocumentPreflightFailed` | Local document inspection | Controlled defect → exact reason and new version; no advance | Version/inspection IDs, reasons, watermark check | “Bundled synthetic document — not identity verification.” |
| 7. Review and submission | Goal: verify before locking. UI: summary, modify and submit | Check answers/manifest; submit latest passed document versions; lock application | Documents `PREFLIGHT_PASSED` → `SUBMITTED` (`DocumentVersionSubmitted`); application `IN_PROGRESS` → `READY_FOR_REVIEW` → `READY_TO_SUBMIT` → `SUBMITTED` → `LOCKED` (`DraftReadyForReview`, `ApplicationReadyToSubmit`, `ApplicationSubmitted`, `ApplicationLocked`) | None | Unmet requirement → return to exact field/card | Snapshot, submitted version refs and named transition events | “Synthetic submission only; nothing is sent.” |
| 8. Mock payment and reconciliation | Goal: resolve the demo fee safely. UI: scenario choice, attempt and status | Create one attempt; block duplicate; reconcile predeclared ambiguity exactly once | `NOT_STARTED` → `INITIATED` → `PENDING` → `RECONCILIATION_REQUIRED` → `CONFIRMED`; `MockPaymentInitiated`, `MockPaymentPending`, `PaymentReconciliationRequired`, `PaymentReconciledConfirmed` | Local payment adapter | Ambiguous result → one status check; same key returns prior, new key rejected | One attempt/reference, idempotency and named events | “No money, card or real charge exists.” |
| 9. Synthetic scrutiny | Goal: know review started. UI: status/timeline; reviewer switch | Queue only after lock, confirmed payment and submitted documents | Scrutiny `NOT_STARTED` → `QUEUED` → `IN_REVIEW` (`ScrutinyQueued`, `ScrutinyStarted`); documents `SUBMITTED` → `UNDER_REVIEW` (`DocumentReviewStarted`) | Conceptual reviewer action | Unsupported action → reject with no state change | Named scrutiny/document start events | “Synthetic review; no official adjudication.” |
| 10. Re-upload | Goal: understand one precise defect. UI: reason, V1 and replacement action | Correlate separately guarded request commands; preserve V1; do not resume yet | Scrutiny `IN_REVIEW` → `ACTION_REQUIRED` (`ScrutinyActionRequired`); V1 `UNDER_REVIEW` → `REUPLOAD_REQUESTED` (`DocumentReuploadRequested`) | Conceptual reviewer action | Unsupported reason → reject both transitions | Exact reason, request and action-required projection | “Correction is for this fixture only, not a visa finding.” |
| 11. Status and notification recovery | Goal: recover despite delivery failure. UI: projected header, retry and replacement | Keep status visible; retry locally; create/submit V2; supersede V1; resume scrutiny | `APPLICANT_ACTION_REQUIRED`; notification `QUEUED` → `DELIVERY_SIMULATION_FAILED` → `RETRY_QUEUED` → `DELIVERED_SIMULATED` (`NotificationQueued`, `NotificationDeliverySimulationFailed`, `NotificationRetryQueued`, `NotificationDeliveredSimulated`); V2 `CREATED` → `PREFLIGHT_PASSED` → `SUBMITTED` (`DocumentVersionCreated`, `DocumentPreflightPassed`, `DocumentVersionSubmitted`); V1 → `SUPERSEDED` (`DocumentVersionSuperseded`); scrutiny `ACTION_REQUIRED` → `RESUBMITTED` → `IN_REVIEW` (`ScrutinyResubmitted`, `ScrutinyResumed`) | Local notification and inspection mocks | Delivery or wrong fixture fails → preserve action-required state until valid V2 | Exact named notification, V2, supersession, resubmission and resume events; then `UNDER_SCRUTINY` | “Delivery failed; your synthetic case state is unchanged.” |
| 12. Synthetic ETA | Goal: view the non-valid outcome. UI: status and watermarked artifact | Deterministically accept the unchanged portrait and passport plus corrected hospital-letter V2; record synthetic scrutiny result; recheck dual issuance guard | Portrait/passport and V2 `UNDER_REVIEW` → `ACCEPTED` (`DocumentAccepted`), with V2 first moving `SUBMITTED` → `UNDER_REVIEW` (`DocumentReviewStarted`); scrutiny `IN_REVIEW` → `APPROVED` (`SyntheticScrutinyApproved`); ETA `NOT_READY` → `READY_TO_ISSUE` → `ISSUED` (`SyntheticETAReadyToIssue`, `SyntheticETAIssued`); projected `GRANTED_SYNTHETIC` | Local review/artifact simulation | Any required document not accepted, or guard/watermark missing → remain not ready; no artifact | Named acceptance, scrutiny and ETA events | “SYNTHETIC — NOT VALID; not permission to travel.” |
| 13. Mock downstream events | Goal: understand ETA/admission separation. UI: APIS, biometric reference, border and entry strip | Append named synthetic outcomes without changing ETA meaning | Append-only `DownstreamSimulationEvent` records | Local APIS, biometrics, border and IVFRT-ledger mocks | Adapter unavailable → labeled simulated failure; no fallback | Correlated event IDs and order | “ETA does not guarantee or simulate real admission.” |
| 14. Tourist reuse proof | Goal: see generalization quickly. UI: Tourist summary/manifest toggle | Evaluate `SYN-TOURIST-001` through the same contracts; no copied machine | Same application/document/payment/scrutiny/ETA definitions | Same local adapters | Category-only branch detected → fail acceptance check | Shared transition names plus Tourist reasons | “Lightweight synthetic reuse, not full policy coverage.” |
| 15. Policy-version preview | Goal: see governed change impact. UI: active vs candidate read-only comparison | Run `PREVIEW` against a predeclared candidate; never repin cases | Immutable preview `PolicyEvaluation`; no lifecycle transition | None | Conflict/unsupported preview → fail closed; active remains unchanged | Candidate version, changed rule/reason, Medical impact, Tourist unaffected | “Preview only; not published policy or legal guidance.” |

## D. Primary medical journey — FULL FUNCTIONAL REHEARSAL / INTERNAL QA WALKTHROUGH

The exact `SYN-MEDICAL-001` full functional rehearsal uses canonical `SYN-CASE-MED-001` and fits within 6 minutes 45 seconds. This is **not** the submission-video duration. It exists to verify the complete end-to-end Medical journey and required recovery behavior from deterministic reset without manual state editing. The product must support this complete journey even though the submission video shows only a compressed, truthful subset.

| # | Surface and applicant/demo action | Required visible result |
|---:|---|---|
| 1 | `A00`: enter the clearly labeled prototype | Persistent unofficial/synthetic/cannot-submit notice |
| 2 | `A00`: select Medical synthetic scenario | `SYN-MEDICAL-001` and reset seed confirmed |
| 3 | `A01`: answer bounded travel-intent questions | No free text or real health data |
| 4 | `A01`: view purpose result | `SUPPORTED_BY_DEMO`, suggested synthetic Medical purpose, `SYN-EVISA-POLICY@1.0.0`, reasons/provenance and “not legal eligibility” |
| 5 | `A02`: create canonical fictional case | One `Case`; policy version pinned |
| 6 | `A03`: inspect identity/passport summary | Obviously synthetic fields are locked |
| 7 | `A03`: complete shared and Medical questions | Only `QM-MEDICAL-1` questions appear |
| 8 | `A03`: continue a step | “Saved just now” plus controlled synthetic time |
| 9 | Demo control: simulate interruption | No transition or lost snapshot |
| 10 | `A02`: resume | Same case, step, answers and policy version; no duplicate draft |
| 11 | `A04`: select bundled portrait, passport and hospital-letter V1 | Every preview shows `SYNTHETIC — NOT VALID` |
| 12 | `A04`: run deterministic preflight | All main-story fixtures pass basic checks with exact inspection evidence |
| 13 | `A05`: review and submit | Document versions `PREFLIGHT_PASSED` → `SUBMITTED`; application reaches `LOCKED`; submission is explicitly synthetic |
| 14 | `A06`: start mock payment | `73 SYNTHETIC_DEMO_CREDITS`, one attempt/reference, no credential fields |
| 15 | `A06`: choose pending/ambiguous outcome | `PENDING` then `RECONCILIATION_REQUIRED` |
| 16 | `A06`: attempt duplicate, then check status | Duplicate blocked; one reconciliation reaches `CONFIRMED` |
| 17 | `A07`: enter synthetic scrutiny | Scrutiny `QUEUED` then `IN_REVIEW`; documents `SUBMITTED` → `UNDER_REVIEW`; waiting explanation |
| 18 | Switch to conceptual `R01` | Same case, policy reasons, versions and safe timeline |
| 19 | `R01`: request hospital-letter re-upload | Controlled `DOC_HOSPITAL_ADMISSION_DATE_UNCLEAR_SYNTHETIC` reason; one action |
| 20 | Return to `A07` | `APPLICANT_ACTION_REQUIRED`; replace-document action only |
| 21 | `A07`: show local notification failure and retry | Failure never hides case status; simulated delivery recovers |
| 22 | `A08`: select corrected bundled hospital-letter V2 | V2 `CREATED` → `PREFLIGHT_PASSED`; no arbitrary upload |
| 23 | `A08`/`A07`: submit correction | V2 → `SUBMITTED`; V1 retained as `SUPERSEDED`; scrutiny `ACTION_REQUIRED` → `RESUBMITTED` → `IN_REVIEW` |
| 24 | Deterministic review simulation | Portrait/passport `UNDER_REVIEW` → `ACCEPTED`; V2 `SUBMITTED` → `UNDER_REVIEW` → `ACCEPTED`; synthetic scrutiny `IN_REVIEW` → `APPROVED` |
| 25 | `A09`: system issues ETA after guards pass; applicant views it | ETA `ISSUED`, visibly watermarked; applicant has no issue command |
| 26 | `A10`: reveal downstream strip | Separate mock APIS, biometric reference, border outcome and entry event |
| 27 | `A10`: close the story | Explicitly state ETA does not imply real border admission |

| Rehearsal band | Maximum |
|---|---:|
| Entry, purpose and case | `0:45` |
| Application, save and resume | `1:20` |
| Documents, review and submission | `0:50` |
| Ambiguous payment recovery | `0:55` |
| Scrutiny, notification and re-upload | `1:30` |
| Completion, ETA and downstream distinction | `1:25` |
| **Total** | **`6:45`** |

## D.1. TWO-MINUTE HACKATHON SUBMISSION CUT

The submission video is at most 120 seconds. Minute 1 is entirely the applicant/service-user experience; it requires no reviewer or policy-administration interface. Minute 2 explains how the proof of concept was built and why its product and technical boundaries were chosen. Canonical synthetic prefilled values, deterministic commands and disclosed fixture states keep the capture fast. A cut may bridge an explicit lifecycle boundary only when the destination is a canonical state the deployed prototype can load and visibly identify; cuts and narration must never imply an unimplemented action or feature.

### Minute 1 — applicant/service-user demonstration (`0:00`–`1:00`)

| Time | Applicant-facing capture | Truthfulness requirement |
|---|---|---|
| `0:00`–`0:05` | `A00`: show the persistent unofficial/synthetic notice and choose Medical | The notice remains legible; the selected scenario is `SYN-MEDICAL-001` |
| `0:05`–`0:12` | `A01`: answer bounded intent choices and reveal purpose guidance | Show the pinned `SYN-EVISA-POLICY@1.0.0`, reasons/provenance and “not legal eligibility” |
| `0:12`–`0:20` | `A02`/`A03`: create the canonical case, show prefilled locked identity and complete one adaptive step | Show visible `Saved just now` evidence; do not imply arbitrary PII entry |
| `0:20`–`0:29` | `A04`: show policy-derived portrait, passport and hospital-letter cards; select bundled fixtures and run preflight | Show the policy reason, watermark and actual deterministic preflight result |
| `0:29`–`0:34` | `A05`: review and simulate submission | Show the cannot-submit notice and the real `LOCKED` transition |
| `0:34`–`0:43` | `A06`: run the ambiguous mock-payment path | Show one attempt, `RECONCILIATION_REQUIRED`, duplicate prevention and deterministic confirmation |
| `0:43`–`0:51` | `A07`: show the unified projected status and its one safe next action | If a canonical recovery state is loaded at a cut, identify it visibly; do not imply an unseen reviewer action happened on camera |
| `0:51`–`0:56` | `A08` or `A07`: show corrected bundled evidence or the resolved recovery state | Use the deployed applicant surface and preserve version/recovery evidence; no reviewer view is required |
| `0:56`–`1:00` | `A09`: reveal the issued, watermarked synthetic ETA | Keep `SYNTHETIC — NOT VALID` visible and do not imply admission |

The entire first minute stays applicant-facing. It demonstrates a compressed but truthful Medical story, not the entire internal QA walkthrough. Every interaction shown must execute in the deployed prototype; deterministic seeding accelerates the capture but never substitutes for missing behavior.

### Minute 2 — build and product reasoning (`1:00`–`2:00`)

| Time | Explanation | Required distinction |
|---|---|---|
| `1:00`–`1:08` | The current e-Visa experience is a systems problem: policy, questions, documents, payment and recovery can disagree when treated as separate pages | Position the work as service and state redesign, not cosmetic reskinning |
| `1:08`–`1:16` | Versioned policy-as-data selects purpose guidance, question manifests, document requirements and synthetic fee results with reasons | Policy is deterministic and explainable; it is not legal eligibility |
| `1:16`–`1:24` | Application, document, payment, scrutiny and ETA use explicit independent lifecycles | The unified status is a projection, not one editable flag |
| `1:24`–`1:31` | Snapshots pin the policy version and make save/resume and recovery deterministic | Resume preserves the same case, answers, step and policy pin |
| `1:31`–`1:38` | Mock payment models ambiguity, idempotency and reconciliation rather than pretending every redirect succeeds | One attempt confirms exactly once; no money or credential exists |
| `1:38`–`1:45` | Documents, notifications, payment and downstream dependencies are synthetic, local and fail-closed behind mock adapters | Clearly name what is mocked and confirm there is no live-system access |
| `1:45`–`1:51` | Mobile-first layout, keyboard operation, explicit labels, linked errors and non-color status cues shape the experience | Accessibility and recovery are product requirements, not polish |
| `1:51`–`1:56` | Applicant experience is the primary product; thin reviewer and policy views show that it is backed by coherent policy and lifecycle behavior | These supporting views are not what reviewers must test in minute 1 |
| `1:56`–`2:00` | Close with what is real versus mocked | Real: deterministic policy, state transitions, recovery, projection and UI behavior. Mocked: external delivery, inspection, payment, scrutiny, ETA and downstream outcomes |

Submission readiness requires a truthful applicant-facing demonstration of no more than 60 seconds and a complete video of no more than 120 seconds. Every feature shown must work in the deployed prototype. Minute 2 must accurately distinguish implemented product behavior from simulated dependencies.

## E. Lightweight tourist validation

`SYN-TOURIST-001` is a shortened comparison, not a second rehearsed journey. A scenario toggle shows its `SUPPORTED_BY_DEMO` result, `QM-TOURIST-1` shared-plus-tourist questions, portrait/passport requirements, absence of a hospital letter and `41 SYNTHETIC_DEMO_CREDITS`. It then displays a contract-reuse panel proving the same purpose evaluator, shared question renderer, document cards, lifecycle definitions, timeline/status projection and mock adapters are referenced; there is no Tourist state machine or copied interface path. The evaluator can inspect the manifest diff and a canonical straight-through event timeline rebuilt by the same projector in under 30 seconds without replaying the Medical recovery story.

## F. Information architecture

These are logical surfaces and state boundaries, not a requirement for fourteen routes or pages. During the four-day sprint, implementation may consolidate adjacent surfaces into one rendered page when their authoritative inputs, lifecycle boundaries, actions and acceptance behavior remain explicit and testable. Paths and grouping may be refined after stack selection. Every surface inherits the exact global notice in Section G.

| ID | User and purpose | Required content; authoritative inputs | Actions: primary; secondary | States | Entry → exit | Mobile; empty/loading/error | Additional persistent label |
|---|---|---|---|---|---|---|---|
| `A00` | Applicant/evaluator; understand and choose | Name, boundary, scenarios, help; fixture catalogue | Start Medical; Tourist, help, reset | No case | Entry → `A01` | Stacked cards; missing catalogue fails closed | `DEMO SCENARIOS` |
| `A01` | Applicant; resolve purpose | Bounded intent, version, result, reasons/provenance; `PolicyEvaluation` | Confirm result; change scenario | Four `scenarioSupport` values | `A00` → `A02` or safe stop | One question/group; loading skeleton; conflict explanation | `DEMO POLICY GUIDANCE — NOT ELIGIBILITY` |
| `A02` | Applicant; create/resume | Case ID, snapshot, step, pin; `Case`/`DraftSnapshot` | Create or resume; back to guidance | `DRAFT_CREATED`, `IN_PROGRESS` | `A01` or shortcut → `A03` | Receipt stacks; no snapshot offers reset, not a new case | `SYNTHETIC CASE` |
| `A03` | Applicant; complete adaptive form | Six-step progress, manifest groups, save evidence; pinned manifest/snapshot | Save and continue; completed-step edit | `IN_PROGRESS`, `READY_FOR_REVIEW` | `A02` → `A04` | One column; field errors plus summary; retained values | `SYNTHETIC VALUES ONLY` |
| `A04` | Applicant; prepare documents | Requirement cards, reasons, preflight, versions; policy requirements/inspections | Select bundled fixture; replace defect | Document version states | `A03` → `A05` | Stacked cards; inspection loading; exact failure | `BUNDLED FIXTURES ONLY` |
| `A05` | Applicant; review and submit | Answers, policy result, document versions, notice; canonical case | Simulate submission; edit unlocked section | Application review through `LOCKED` | `A04` → `A06` | Section summaries; incomplete item links back | `SIMULATED SUBMISSION` |
| `A06` | Applicant; resolve mock payment | Quote, one attempt/history, state/reason; payment aggregate | Start mock payment or check status; return to case | Payment states | `A05` → `A07` | No credential form; pending/error preserves attempt | `MOCK — NO MONEY` |
| `A07` | Applicant/support demo; understand status | Projected header, policy pin, timeline, notification; lifecycle facts/events | Exactly one projected action; inspect event | `DRAFT`, `READY_TO_SUBMIT`, payment, scrutiny, applicant-action, synthetic outcome and ETA projections | Any recovery entry → next surface/wait | Header first; events stack; inconsistency is unavailable | `SIMULATED CASE STATUS` |
| `A08` | Applicant; correct evidence | Exact request, V1/V2, fixture selector; scrutiny/document state | Select and submit corrected fixture; cancel | `REUPLOAD_REQUESTED`, `ACTION_REQUIRED`, `RESUBMITTED` | `A07` → `A07` | Version cards; stale/wrong fixture rejected | `SYNTHETIC RE-UPLOAD` |
| `A09` | Applicant; view outcome | ETA ID, fictional conditions/dates, watermark; issued artifact | View/print synthetic ETA; status | `NOT_READY`, `READY_TO_ISSUE`, `ISSUED` | `A07` → `A10` | Artifact reflows; missing watermark blocks rendering | `SYNTHETIC — NOT VALID` |
| `A10` | Evaluator; separate downstream outcomes | APIS, biometric ref, border, entry strip; append-only simulation events | Reveal next event; return to status | Named simulated outcomes only | `A09` → close | Labeled cards; unavailable adapter shows local failure | `SIMULATED — NOT ADMISSION` |
| `R01` | Conceptual reviewer; request one correction | Case summary, policy reasons, states, versions, safe timeline | Request synthetic re-upload; return | `IN_REVIEW`, `ACTION_REQUIRED` | View switcher → `A07` | Tables become cards; no-case state explains seed | `CONCEPTUAL REVIEWER DEMO` |
| `P01` | Conceptual policy admin; preview change | Active/candidate versions, provenance, rules/manifests, impact | Preview candidate; inspect active | `PREVIEW`; no lifecycle write | View switcher → prior view | Comparisons stack; conflict fails closed | `READ-ONLY POLICY DEMO` |
| `D01` | Evaluator; seed/reset | Seven shortcuts, IDs, clock, pin, confirmation; canonical manifest | Seed/reset with confirmation; cancel | Canonical fixture states | Global utility → selected surface | Full-width control; failure leaves current state intact | `DEMO CONTROLS` |

### Sprint implementation priority

| Priority | Surfaces | Sprint rule |
|---|---|---|
| P0 — submission-critical citizen experience | `A00`–`A09` | Implement the applicant story deeply enough for the truthful 60-second capture and the full deterministic rehearsal. Adjacent logical surfaces may share one rendered page. All five recovery mechanisms remain required product behavior and are not contingency cuts. Medical remains primary; Tourist remains lightweight shared-contract validation through the same surfaces. |
| Supporting end-to-end proof | `R01`, `P01` | Keep the minimum conceptual re-upload action and read-only policy preview that prove the applicant journey is backed by coherent lifecycle and policy architecture. They are not the primary product story and are not required in minute 1. |
| Boundary proof / cut first if schedule is threatened | `A10`; visual depth or extra interactions in `R01`/`P01` | Preserve the contracts and minimum non-claim boundary, but cut downstream visual depth and institutional-view breadth before applicant functionality, accessibility or recovery behavior. |

`D01` is a sprint-enabling QA control: its minimal deterministic reset and seed behavior supports rehearsal and truthful capture, but it is not a citizen-facing product destination or a substitute for implementing the behaviors shown.

## G. Navigation and global shell

The clear project name is `India e-Visa Reimagined`. Every surface persistently displays: `UNOFFICIAL HACKATHON PROTOTYPE — SYNTHETIC DATA ONLY — CANNOT SUBMIT A VISA APPLICATION`. Repeat it verbatim at entry, before simulated submission and on every printable or downloadable artifact. The shell provides Applicant, `Conceptual reviewer demo` and `Conceptual policy demo` views; “How this demo works”; a keyboard skip link; and, when present, synthetic case ID, saved status and policy pin. There is no authentication fiction. Reset is accessible and confirmed. Mobile navigation wraps without horizontal overflow. No modal blocks understanding at entry.

## H. Applicant progress model

The six steps are **Purpose, Application, Documents, Review, Mock payment, Status**. ETA and arrival simulation sit inside Status. Desktop uses an ordered labeled stepper; mobile uses `Step N of 6 — [label]`. Completed, current and upcoming use text plus icons, never color alone. Progress never replaces lifecycle status. Completed steps are editable only before `LOCKED`; locked/unavailable steps remain focusable as explanations, not actions.

## I. Controlled synthetic form design

| Group | Bounded content |
|---|---|
| Shared | Locked fictional identity/passport summary; reserved `example.com` contact; fictional arrival date and synthetic port; controlled declarations |
| Medical | Synthetic treatment intent, fictional care centre/admission date and attendant-guidance choice |
| Tourist | Synthetic leisure intent, fictional exit date and bounded itinerary choice |

Identity, passport and contact are visibly synthetic and locked. Other fields use controlled options or canonical dates; no arbitrary PII, health-detail or passport-number text box exists. Requiredness comes only from the manifest. Every field has a visible label, help where needed and deterministic error. Newly added conditional questions are announced. The UI shows `Saved just now — 2099-03-01 09:12 synthetic time`, an error summary linked to fields, and an explanation beside every unavailable action.

## J. Document preparation interaction

Medical shows portrait, passport-page and hospital-letter cards; Tourist omits the letter through policy data. Every card shows requirement reason/version, accepted bundled fixtures, watermarked preview, technical checks, current version/state, exact defect and safe replacement. There is no file picker, drop zone, camera or arbitrary upload. Fixtures include: a valid set; one controlled technical defect returning `DOC_PREFLIGHT_UNCLEAR_SYNTHETIC`; hospital-letter V1 that passes preflight but later receives `DOC_HOSPITAL_ADMISSION_DATE_UNCLEAR_SYNTHETIC`; and corrected V2. Every preview reads `SYNTHETIC — NOT VALID`.

## K. Payment and reconciliation interaction

No card, bank or credential field exists. Every displayed fee quote reads `SYNTHETIC — NOT PAYABLE`. The user chooses `Mock confirmation` (`INITIATED` → `CONFIRMED`) or `Mock pending/ambiguous`. The latter shows one synthetic reference, `73 SYNTHETIC_DEMO_CREDITS`, `PENDING` then `RECONCILIATION_REQUIRED`, why retry is unavailable, and one `Check mock payment status` action. Deterministic reconciliation reaches `CONFIRMED`; history shows exactly one attempt. Copy never mentions “your money” or a real charge.

## L. Status, recovery and timeline interaction

The header contains projected status, plain explanation, exactly one action or wait, policy version and last synthetic update. The ordered timeline combines domain-labeled application, document, payment, scrutiny, notification, ETA and downstream events without merging their state machines.

| Recovery | Entry | Screen/message | Allowed action | Unavailable | Successful evidence |
|---|---|---|---|---|---|
| Interrupted draft | `D01` seed/resume link | `A02`: “Your saved synthetic draft is ready.” | Resume same case | Create duplicate, pay, submit | Same answers, step, pin and case |
| Invalid/unclear document | `D01`/`A04` | `A04`: exact preflight reason | Select corrected bundled version | Advance or arbitrary upload | New version; old retained; pass reason |
| Pending/ambiguous payment | `D01`/`A06` | “Mock result unclear; do not start another.” | Check mock payment status | New attempt, scrutiny, ETA | One attempt; one confirmation |
| Re-upload requested | `R01` or `D01` | `A07`/`A08`: exact hospital-letter reason | Replace required document | Pay, submit, issue ETA | V2 submitted, V1 superseded, scrutiny resumes |
| Status/next-action confusion | Any stale link | `A07`: authoritative explanation | Projected single action or wait | Every stale action | Timeline and projection agree |

## M. Reviewer demo

`R01` shows only the synthetic case summary, pinned result/reasons, lifecycle status, submitted versions, privacy-safe timeline, controlled hospital-letter reason and `Request synthetic re-upload`. After V2 returns, deterministic simulation may complete review. It has no queue, risk score/source, recommendation, real adjudication, staff identity or role-management claim. It is supporting evidence, not the primary product story and not required in submission minute 1. If sprint time is threatened, its visual polish and breadth are cut before applicant functionality or any recovery behavior.

## N. Policy preview demo

`P01` is read-only: active bundle/version, fictional effective period, synthetic provenance, Medical/Tourist summaries, reason codes and affected manifests. Candidate `SYN-EVISA-POLICY@1.1.0-preview` remains `DRAFT` and changes only Medical hospital-letter guidance to require the fictional admission date to be visibly identified. Preview shows Medical impact and Tourist unaffected; `1.0.0` stays active and existing cases stay pinned. Publish, migration and real workflow controls do not exist. This supporting view exists to prove the applicant experience has governed policy behind it; it is not the primary product story or required in minute 1. Its visual polish and breadth are cut before applicant functionality or recovery behavior.

## O. Demo controls

`D01` offers seven explicit seeds: Medical start, Interrupted draft, Controlled document defect, Ambiguous payment, Re-upload requested, Status/next-action recovery and Tourist start. Each first confirms reset, then restores canonical IDs, timestamps and `SYN-EVISA-POLICY@1.0.0`, labels the operation as demo-only and confirms the seeded state. It never silently mutates a real-looking case.

## P. Mobile and accessibility contract

At `360×800`, use one column, zero horizontal page overflow, readable default text, safely wrapping labels and minimum `44×44` targets. Use semantic headings/landmarks, logical tab order, visible focus, named icons, appropriate live regions, linked error summaries and focus on the error summary or new page heading. Color is never the sole cue; reduced motion is honored; reviewer/admin tables become labeled cards. Use no inaccessible custom control, CAPTCHA, paste prevention or browser-navigation suppression.

## Q. Critical content strings

| Situation | Approved draft copy |
|---|---|
| Persistent notice | `UNOFFICIAL HACKATHON PROTOTYPE — SYNTHETIC DATA ONLY — CANNOT SUBMIT A VISA APPLICATION` |
| Purpose result | `This purpose is supported by the selected demo scenario. It is not a legal eligibility decision.` |
| Saved | `Saved just now — synthetic demo time.` |
| Payment pending | `Mock payment is pending. No real payment was made.` |
| Fee quote | `SYNTHETIC — NOT PAYABLE` |
| Duplicate prevention | `Do not start another mock payment. Check mock payment status instead.` |
| Scrutiny re-upload | `Synthetic review needs a clearer hospital-letter fixture. Replace only this document.` |
| Notification failure | `Simulated delivery failed. Your synthetic case status is unchanged.` |
| Waiting | `No action is needed now. Synthetic scrutiny is continuing.` |
| ETA warning | `SYNTHETIC — NOT VALID. This is not a visa or travel document.` |
| Border distinction | `This mock border outcome is separate from ETA issuance and is not real admission.` |
| Reset | `Reset this demo? All current synthetic state will return to the canonical fixture.` |

## R. Acceptance and approval checklist

Applicant coverage is deep; institutional and downstream coverage remains deliberately thin. Hackathon reviewers test the citizen-facing experience, not an admin panel. Reviewer and policy surfaces provide supporting architectural evidence and never replace applicant acceptance evidence.

| Scope | Surface IDs | Domain states/events | Metrics | Implementation acceptance evidence |
|---|---|---|---|---|
| Entry/notices | `A00`, global | No case | `M12` | Notice on 100% of routes; no official identity |
| Medical purpose/attendant | `A01` | Policy evaluation/reasons | `M01`, `M04` | Version and reason always visible |
| Case/resume | `A02` | `DraftCreated`, snapshot read | `M03`, `M06` | `5/5` restores; zero duplicate drafts |
| Adaptive form | `A03` | `IN_PROGRESS`, `DraftSnapshotSaved` | `M01`, `M05` | Exact manifest; zero cross-scenario questions |
| Documents | `A04` | Preflight/version events | `M07`, `M12` | Valid/defect outcomes and watermark pass |
| Review/submission | `A05` | Review → `LOCKED` | `M01`, `M07`, `M09` | Ordered guarded transitions visible |
| Payment | `A06` | Pending/reconciliation → `CONFIRMED` | `M03`, `M08` | `10/10` resolutions; zero duplicates |
| Status/notification | `A07` | Projection and notification events | `M03`, `M09`, `M14` | Every nonterminal state has one action/wait |
| Re-upload | `A08`, `R01` | `ACTION_REQUIRED`, V2, `RESUBMITTED` | `M03`, `M07`, `M10` | Request/replacement passes `3/3` |
| ETA | `A09` | `READY_TO_ISSUE` → `ISSUED` | `M01`, `M12` | Guarded, watermarked artifact |
| Downstream strip | `A10` | Append-only simulation events | `M12`, `M14` | Four local labeled events; no ETA mutation |
| Reviewer thin slice | `R01` | One guarded request | `M10` | `3/3`; no private workflow |
| Policy preview | `P01` | Non-mutating `PREVIEW` | `M04`, `M10` | `3/3`; active/pin unchanged |
| Reset/safety | `D01`, global | Canonical reset | `M12`, `M13` | `5/5` exact resets; no PII/live calls |
| Full functional Medical rehearsal | `A00`–`A10`, `R01` | All approved lifecycles and five recovery mechanisms | `M01`, `M03`, `M14` | Complete primary flow and required recoveries exercise deterministically from reset without manual state editing; duration is an internal QA concern, not the submission limit |
| Submission readiness | `A00`–`A09`; minute-2 evidence | Implemented applicant commands/projections plus accurate mock-boundary explanation | `M01`–`M14` | Truthful applicant capture ≤60 seconds; full video ≤120 seconds; every shown feature works in the deployed prototype; minute 2 distinguishes implemented behavior from mocked dependencies |
| Tourist reuse | `A00`–`A09` | Same lifecycle definitions | `M02`, `M04`, `M05` | `3/3`; zero Tourist-specific lifecycle |
| Interrupted draft | `A02`, `A03` | `DraftSnapshotSaved`; resume read | `M03`, `M06` | `3/3` recovery oracle |
| Invalid document | `A04` | `PREFLIGHT_FAILED`/new version | `M03`, `M07` | `3/3` exact reason/history |
| Ambiguous payment | `A06` | `RECONCILIATION_REQUIRED` | `M03`, `M08` | `3/3`; duplicate unavailable |
| Re-upload recovery | `A07`, `A08`, `R01` | Request, supersede, resume | `M03`, `M07`, `M10` | `3/3`; all domains agree |
| Next-action confusion | `A07` | Deterministic projection | `M03`, `M09` | `3/3`; stale actions unavailable |
| Mobile/accessibility | All applicant surfaces | Accessible state announcements | `M03`, `M11` | Keyboard `6/6`; zero serious/critical; zero overflow |
| Safety/fallback | All surfaces | Fail-closed mocks/audit | `M01`–`M14` | Full regression, scans, reset, fallback and smoke evidence |

AI remains unnecessary and unselected: all six candidates stay `UNDER EVALUATION`, and every P0 outcome has a deterministic path. No AI surface, model, provider or dependency exists.

> **USER REVIEW REQUEST:** Approve or request changes to the service lanes; Medical and Tourist journeys; IA; progress; controlled inputs; document, payment and status interactions; reviewer/policy thin slices; demo controls; mobile/accessibility behavior; and critical content.

Approval closes only Day 1 Sprint Task 3. Phases 3 and 4 remain `NOT STARTED` under the sprint overlay because their original full gates are not claimed complete.
