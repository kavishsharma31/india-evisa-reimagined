# Four-Day Hackathon Sprint Plan

> **Execution mode:** `FOUR-DAY HACKATHON SPRINT` under accepted decision `D-009`. This is a scheduling overlay; [`PLANS.md`](../PLANS.md) remains the authoritative tracker, and no phase or step becomes complete merely because it appears here.

This plan applies the boundaries in [`AGENTS.md`](../AGENTS.md), the approved [`POC_SCENARIO_SELECTION.md`](POC_SCENARIO_SELECTION.md), the [`AI_FEATURE_EVALUATION.md`](AI_FEATURE_EVALUATION.md), and the [`SYNTHETIC_DATA_AND_INTEGRATION_BOUNDARIES.md`](SYNTHETIC_DATA_AND_INTEGRATION_BOUNDARIES.md). It selects no technology stack, AI capability, model, provider or production integration.

## 1. Deadline and four-working-day constraint

- **Submission deadline:** 27 August.
- **Maximum delivery time:** Four focused working days.
- **Planning convention:** Each day contains eight relative one-hour focus blocks, `H0–H1` through `H7–H8`, for a maximum planning envelope of 32 focused hours. These are sequencing blocks, not calendar times. If fewer hours are available, apply the contingency cuts in Section 14 without weakening the non-negotiable controls.
- **Functional deadline:** The frozen MVP must be functionally complete and integrated by the end of Day 3.
- **Final-day restriction:** Day 4 is reserved for testing, accessibility and safety verification, defect correction, polish, deployment and submission. It is not a feature-development day.
- **Integration boundary:** All external systems remain mocked, local and fail-closed.
- **Governance rule:** Accepted decision `D-009` permits one explicitly approved sprint task to package sequenced minimum outputs from multiple phases. Each work block requires evidence before the next block advances, but a sprint minimum does not satisfy or change an underlying phase’s full completion gate; every unmet remainder stays recorded for later completion.

## 2. Definition of demo-ready

The proof of concept is demo-ready only when all of the following are true:

1. `SYN-MEDICAL-001` runs as one coherent primary journey from guided purpose resolution through adaptive application, durable draft, document preparation, mock payment, scrutiny/re-upload, status and synthetic ETA.
2. `SYN-TOURIST-001` proves lightweight reuse of the same category-agnostic policy and lifecycle concepts rather than introducing a second architecture.
3. All five mandatory recovery cases are repeatable with deterministic fixtures and clear next actions.
4. The applicant experience is deep enough to carry the product story; reviewer and policy-administration views provide only the minimum conceptual evidence of end-to-end feasibility.
5. A minimal post-ETA simulation visibly distinguishes mock APIS, synthetic biometric reference and mock border outcome from the visa application and from real admissibility.
6. Every external boundary is local and mocked; runtime failure cannot discover, contact or fall back to a live government, payment, notification, APIS, biometric, border, IVFRT or model service.
7. Every case, document, photograph, payment, decision, ETA and downstream event is synthetic and resettable. Documents and ETA artifacts remain visibly watermarked `SYNTHETIC — NOT VALID`.
8. The persistent notice states that the prototype is unofficial, synthetic-only and unable to submit a visa application.
9. The primary journey is usable on the supported mobile viewport and by keyboard, presents understandable focus and errors, and preserves work through the demonstrated interruption path.
10. The documented tests, linting, type checks, build checks, synthetic-data scans, network-deny checks, reset checks and critical end-to-end scenarios pass.
11. A deployed demonstration, deterministic reset procedure, concise runbook and fallback recording or captured walkthrough are ready for evaluation.
12. The demonstration makes no production-readiness, government-endorsement, real-policy completeness or private-backend-fidelity claim.

## 3. Frozen MVP scope

| Surface | Frozen minimum scope |
|---|---|
| Primary applicant journey | `SYN-MEDICAL-001`: deterministic guided purpose resolution; a bounded, policy-derived adaptive application; visible save/resume; bundled synthetic portrait, passport and hospital-letter preparation; submission; explicit mock payment; scrutiny and hospital-letter re-upload; unified status/next action; synthetic ETA. |
| Medical attendant | Related sub-persona guidance only. No linked application, shared decision state, coupled payment or invented private relationship architecture. |
| Tourist validation | `SYN-TOURIST-001`: one lightweight straight-through path reusing the same policy evaluation, question selection, document, payment, status and ETA lifecycle concepts with tourist fixtures. |
| Policy | A small versioned synthetic policy set with provenance, effective context, explainable results and fixtures for medical and tourist. It is not an exhaustive or authoritative current policy catalog. |
| Documents | Bundled, visibly watermarked synthetic fixtures; deterministic requirement, type, size, presentation-metadata and expected-defect checks; explicit document versions and one precise re-upload reason. No arbitrary persisted public upload. |
| Payment | Local scenarios for confirmed and pending/ambiguous outcomes, including reconciliation and duplicate-attempt prevention. No real card value, credential or gateway. |
| Status and communication | One authoritative synthetic case timeline, deterministic next actions and a local notification/outbox representation for the re-upload or ETA event. |
| Reviewer | One synthetic case view with pinned policy reasons, state history, document versions and one controlled re-upload action. No real queue, role model, risk screen or adjudication logic. |
| Policy administration | Read-only inspection of the active synthetic policy version plus one controlled change preview showing affected guidance or requirements. No claim about real authoring, approval or publication workflow. |
| Downstream simulation | One clearly labeled mock event strip covering APIS state, synthetic biometric reference, mock border outcome and resulting synthetic entry event. No real protocol or operational interface. |
| Cross-cutting quality | Mobile-first layout, keyboard operation, accessible notices and errors, unreliable-connectivity recovery, privacy-safe logs, deterministic reset, local-only mocks and the required quality checks. |

The applicant experience receives the design and implementation depth. Institutional and downstream surfaces exist only to demonstrate coherent shared policy and case state.

## 4. Explicit deferred scope

The sprint does not include:

- Production implementation, accreditation, scaling, high availability, disaster-recovery guarantees or production operations.
- Live government, payment, notification, APIS, biometric, border, IVFRT or AI/model integration.
- Real applicants, nationalities, passport data, documents, photographs, health disclosures, payment credentials, biometrics or travel events.
- A full Ayush journey, a linked medical-attendant case or a complete Business/Production Investment journey.
- Exhaustive visa categories, purposes, countries, ports, dates, fees, document rules, exceptions or languages.
- A full reviewer queue, workload model, role/permission system, risk screening, decision-support model or private adjudication workflow.
- A full policy-authoring, multi-stage approval, publication, rollback or production-content-management system.
- A dedicated support/operations workbench; the unified timeline provides the minimum shared diagnostic demonstration.
- Multiple downstream border cases, real arrival matching, biometric processing or foreigner-record fidelity.
- Arbitrary public uploads, real notification delivery, real payment methods or travel-valid ETA output.
- Advanced analytics, broad personalization, final branding, extensive animation or presentation-only flourishes.
- Any AI feature by default. AI remains governed by Section 10 and accepted decision `D-007`.
- A complete Phase 16 government handoff package; the submission includes only a concise authorized-discovery next-step note.

Deferred items must be named as deferred in the demonstration and submission; they must not be implied complete.

## 5. Four-day schedule with hour-level work blocks

The schedule assumes rapid review at every required gate. Approval delay is a critical-path risk, not permission to bypass a gate.

### Day 1 — Freeze the product and establish the foundation

| Block | Focus | Required output |
|---|---|---|
| `H0–H1` | Freeze the applicant-first thesis and demonstration narrative under the accelerated mode. | Concise approved product thesis linking the medical primary, tourist validation, policy governance and explicit state. |
| `H1–H2` | Freeze MVP scope, non-goals, feature priorities, success measures and the demo script. | Reviewed Phase 1 scope plus a metric, baseline or baseline-collection method, numeric target, evaluation method and acceptance threshold for each selected success measure, followed by the consolidated Phase 1 approval. |
| `H2–H3` | Define the minimum domain, versioned policy concepts and explicit application/document/payment/scrutiny/ETA states. | Reviewable domain and lifecycle model with the five recovery paths. |
| `H3–H4` | Map the medical journey, tourist comparison and service interactions. | One service blueprint covering applicant, local mocks, thin institutional actions and failures. |
| `H4–H5` | Freeze mobile information architecture, key wireflow, content hierarchy and accessibility behavior. | Reviewable flow from purpose resolution to ETA, including interruption and correction. |
| `H5–H6` | Evaluate the minimum technical architecture and technology options only after the preceding gates. | Separate recorded and approved Phase 5 architecture/stack decision; this sprint plan itself makes no selection. |
| `H6–H7` | Establish the project foundation, quality commands, local mock boundaries and default-deny runtime assumptions. | Reproducible foundation with initial automated checks and no live endpoint configuration. |
| `H7–H8` | Seed deterministic medical/tourist fixtures, reset behavior and a thin vertical smoke path. | Fixture manifest, reset proof and first policy-to-state smoke test passing. |

### Day 2 — Build the deep medical applicant path

| Block | Focus | Required output |
|---|---|---|
| `H0–H1` | Implement the bounded versioned-policy fixture and deterministic evaluation reasons. | Medical and tourist policy scenarios evaluate reproducibly with pinned versions. |
| `H1–H2` | Implement guided purpose resolution for the medical fixture. | Applicant reaches the e-Medical result with plain-language reasons and confirmation. |
| `H2–H3` | Implement the minimum adaptive medical application and validation. | Only applicable fixture questions appear; authoritative results remain deterministic. |
| `H3–H4` | Implement explicit draft state, visible save evidence and resume. | Interrupted draft resumes without lost answers, duplicate case or policy-version change. |
| `H4–H5` | Implement bundled portrait, passport and hospital-letter readiness and preflight. | Valid and controlled-defect fixtures produce precise deterministic results and watermarks remain visible. |
| `H5–H6` | Implement submission and application/document lifecycle transitions. | Valid fixture becomes a submitted synthetic case with traceable state history. |
| `H6–H7` | Implement local mock payment, including confirmed and pending/ambiguous reconciliation. | The applicant verifies an ambiguous result without a duplicate attempt and reaches a deterministic resolution. |
| `H7–H8` | Integrate and test the medical path through confirmed payment. | One repeatable journey from reset through paid state, with implementation-task quality checks passing. |

### Day 3 — Complete the end-to-end demo and freeze features

| Block | Focus | Required output |
|---|---|---|
| `H0–H1` | Implement scrutiny, precise re-upload request and document-version replacement. | Unclear hospital letter is replaced, history is preserved and scrutiny resumes. |
| `H1–H2` | Implement unified status, local notification failure/retry and synthetic ETA. | Timeline explains every exposed state and next action; one local delivery failure recovers deterministically; ETA is visibly non-valid. |
| `H2–H3` | Add the minimum reviewer coverage. | One conceptual case view and one controlled re-upload action over shared synthetic state. |
| `H3–H4` | Add the minimum policy-administration coverage. | Active version and one change preview demonstrate provenance and consistent impact without a full authoring workflow. |
| `H4–H5` | Add lightweight tourist generalization. | `SYN-TOURIST-001` reuses the same policy and lifecycle concepts in a recognizable straight-through path. |
| `H5–H6` | Add the minimal downstream simulation. | Mock APIS, synthetic biometric reference, mock border result and entry event remain visibly simulated and local. |
| `H6–H7` | Run the five recovery cases, reset, mock-boundary and accessibility smoke checks. | Mandatory scenarios pass without live access, lost work, duplicate payment or ambiguous next action. |
| `H7–H8` | Rehearse the full demonstration, resolve critical integration defects and freeze features. | Frozen, functionally complete MVP with a recorded Day 3 gate result. |

### Day 4 — Assure, polish, deploy and submit

| Block | Focus | Required output |
|---|---|---|
| `H0–H1` | Audit the frozen build, triage defects and remove or roll back incomplete optional work. | Only release-blocking defects remain eligible for correction. |
| `H1–H2` | Run full automated tests, linting, type checks and build verification. | All required commands pass on the frozen revision. |
| `H2–H3` | Verify mobile layout, keyboard path, focus, errors, notices and interrupted-connection recovery. | Accessibility and mobile checklist passes or critical defects are corrected and re-tested. |
| `H3–H4` | Run privacy, security, secret, realistic-PII, watermark, network-isolation, logging and reset checks. | Synthetic-only and local-mock evidence is recorded; no prohibited finding remains. |
| `H4–H5` | Polish interaction, copy, hierarchy, loading/error states and demonstration performance. | No scope growth; only verified clarity, reliability and visual-quality improvements. |
| `H5–H6` | Deploy the frozen demonstration and run deployed smoke/reset checks. | Public demo is reachable, labeled, resettable and free of prohibited egress. |
| `H6–H7` | Finalize submission materials, demo runbook, architecture/safety explanation and fallback capture. | Submission package and deterministic backup walkthrough are complete. |
| `H7–H8` | Run the final rehearsal, submit and verify receipt or confirmation. | Submission is complete before the deadline with remaining time treated as contingency buffer. |

## 6. End-of-day deliverables and verification gates

| Day | Deliverables | Exit gate |
|---|---|---|
| Day 1 | Approved consolidated Phase 1 brief, including scope and complete success-measure definitions; minimum domain, policy, lifecycle, service and UX outputs; approved Phase 5 decision; reproducible foundation; deterministic fixtures and reset. | The sprint task and dependent outputs were reviewed in block order; Phase 1’s original completion gate is satisfied before its consolidated approval; foundation quality checks pass; no live configuration exists; one policy-to-state smoke path works. Later cross-phase outputs remain sprint minimums unless their full phase gates are separately verified. |
| Day 2 | Deep medical applicant path through confirmed mock payment, including adaptive questions, save/resume and document preflight. | Reset-to-paid journey is repeatable on the supported mobile viewport; interruption, controlled document defect and ambiguous payment behave deterministically; implementation checks pass. |
| Day 3 | Scrutiny/re-upload, status/ETA, thin reviewer/admin, tourist validation, minimal downstream simulation and all five recovery cases. | Frozen MVP is functionally complete; full rehearsal and recovery matrix pass; reset, labeling and mock-only boundaries are verified; no required feature remains unfinished. |
| Day 4 | Tested and polished frozen build, deployed demo, submission package, fallback walkthrough and confirmed submission. | Automated and manual release checks pass on the deployed revision; critical defects are closed or the affected optional scope is cut; final rehearsal and submission confirmation are recorded. |

Failure of an end-of-day gate triggers immediate critical-path recovery and the Section 14 cut order. It never authorizes cutting safety, synthetic-data, accessibility or non-official labeling requirements.

## 7. Critical path

`Sprint approval → frozen product and MVP → domain/policy/lifecycle model → service and UX flow → Phase 5 architecture decision and foundation → medical applicant path → document/payment/scrutiny recovery → status and synthetic ETA → thin institutional views and tourist reuse → minimal downstream boundary proof → five-case recovery verification → Day 3 feature freeze → Day 4 assurance → deployment → submission`

| Critical dependency | Why it blocks downstream work | Recovery action if late |
|---|---|---|
| Rapid exit-condition review and approval | Later phase work cannot start safely or lawfully without its governing output. | Present the smallest reviewable artifact, record the unresolved choice and cut dependent optional scope rather than assume approval. |
| Versioned policy and explicit state model | Every adaptive question, requirement, status and recovery path depends on deterministic policy and lifecycle truth. | Reduce policy breadth to the two approved synthetic fixtures; do not hard-code interface exceptions. |
| Safe project foundation and mock boundaries | Implementation cannot proceed credibly without repeatable checks and prohibited-live-access controls. | Cut external-looking presentation and retain only local deterministic adapters; never relax isolation. |
| Medical path through document and payment state | It is the primary applicant story and carries the highest-value systems proof. | Cut tourist and institutional extras first; retain the medical end-to-end path and five recoveries. |
| Scrutiny/re-upload, timeline and ETA | Without correction and clear state, the demo becomes a conventional form. | Reduce visual depth, not lifecycle or recovery behavior. |
| Minimal downstream boundary proof | Demo readiness requires a visible distinction between ETA, simulated arrival checks and final admissibility. | Retain one local APIS/biometric/border/entry strip; cut additional outcomes and detail. |
| Day 3 integrated freeze | Day 4 quality work requires stable behavior. | Roll back incomplete optional features and freeze the last verified core revision. |
| Deployed smoke and fallback capture | A local-only success is insufficient for submission-day reliability. | Use the verified fallback walkthrough while correcting deployment only; do not add features. |

## 8. Minimum applicant, reviewer and policy-admin coverage

### Applicant — deep coverage

- Complete `SYN-MEDICAL-001` from reset to synthetic ETA and minimal downstream handoff.
- Explain the selected purpose, policy version and reasons.
- Ask only the bounded applicable questions.
- Demonstrate durable save/resume and all five recovery cases.
- Prepare bundled synthetic documents, show precise defects and preserve replacement history.
- Distinguish mock payment, scrutiny, status, ETA and final mock admissibility state.
- Keep mobile, keyboard, plain-language, privacy and non-official behavior visible throughout.

### Reviewer — deliberately thin coverage

- Open one synthetic medical case.
- See structured facts, pinned policy reasons, current lifecycle state, event history and document versions.
- Record one predeclared re-upload request and observe the replacement return to scrutiny.
- Do not implement or imply queues, workload routing, real roles, risk sources, recommendations or adjudication logic.

### Policy administrator — deliberately thin coverage

- Inspect the active synthetic policy version, provenance and effective context.
- Preview one controlled fixture change and its effect on applicant guidance or a document requirement.
- Show that applicant and institutional explanations consume the same result.
- Do not implement or imply the real authoring, multi-party approval, publication, rollback or access-control process.

A dedicated support interface is deferred. The unified timeline must nevertheless be clear enough to demonstrate how an applicant or conceptual support role would identify the next safe action.

## 9. Mandatory failure and recovery cases

| Required case | Minimum demonstration proof |
|---|---|
| Interrupted draft | Stop after a completed medical step, resume the same deterministic case and show saved time, restored answers, current step and unchanged policy version without a duplicate draft. |
| Invalid or unclear document | Use a bundled controlled-defect fixture and show the precise preflight or scrutiny reason, preserved earlier version and safe replacement action. |
| Payment pending or ambiguous | Show `PENDING` or `RECONCILIATION REQUIRED`, prevent an unsafe repeat attempt and reach a deterministic resolved state without a duplicate mock charge. |
| Re-upload requested | Align local notification and case status, add the corrected bundled fixture as a new version and return the case to scrutiny with history intact. |
| Status/next-action confusion | Enter through an unfamiliar state or recovery route and use one timeline to explain the state, available actions, unavailable actions and next safe step. |

These cases are frozen acceptance requirements. They cannot be traded for additional happy-path breadth or presentation polish.

## 10. AI stretch-feature rule

- AI is excluded from the critical path and from the frozen MVP.
- A candidate may be considered only after the entire core demo—including medical, tourist validation, thin reviewer/admin coverage, five recovery cases, reset and safety checks—is stable ahead of the Day 3 feature-freeze block.
- Any implementation receives a hard maximum of four focused hours. The budget must come only from time recovered before the Day 3 freeze; it cannot extend the sprint, displace required work or consume Day 4.
- The proposal must first pass the gates in [`AI_FEATURE_EVALUATION.md`](AI_FEATURE_EVALUATION.md), demonstrate material improvement over its deterministic baseline and receive the separate accepted decision required by `D-007`.
- It must remain advisory, synthetic-only, uncertainty-aware, deterministically validated where policy or application data is affected, and removable without breaking the core journey.
- No model, provider or remote integration may be selected informally. If safe selection and verification cannot fit inside the same four-hour cap and existing phase gate, the candidate is not implemented.
- At the first regression, reliability concern, accessibility issue, privacy concern or schedule threat, remove the AI work and restore the verified deterministic baseline.

No AI time is reserved by default. If the core becomes stable only at the planned feature-freeze block, the permitted AI budget is zero.

## 11. Original-phase-to-sprint mapping

This mapping compresses scheduling under the explicit `D-009` exception. Approval of a larger sprint task permits its documented cross-phase minimum outputs to be produced in block order, but a mapped block does not start or complete an underlying phase in the tracker. Many sprint minimums intentionally fall short of the original full phase gates; those phases retain their existing status and their unmet gate remainder must be recorded. Only Phase 1 is scheduled to satisfy its full completion gate before cross-phase implementation work begins.

| Original phase | Minimum sprint treatment | Scheduled block |
|---|---|---|
| Phase 0 — Project grounding | Preserve the completed baseline and accepted guardrails. | Before Day 1; no new completion action. |
| Phase 1 — Product thesis and scope | Complete the applicant thesis, scope, non-goals, feature priorities, success measures with baselines and numeric targets, validation thresholds and consolidated approval. | Day 1 `H0–H2`. |
| Phase 2 — Domain model and policy engine | Define only the entities, versioned policy concepts and explicit lifecycles needed by the two fixtures and five recoveries. | Day 1 `H2–H3`; implemented Day 2. |
| Phase 3 — Service blueprint and user journeys | Map the medical path, tourist comparison, mocks, thin institutional actions and failure paths. | Day 1 `H3–H4`. |
| Phase 4 — Information architecture and UX design | Freeze one mobile-first, accessible wireflow and state/next-action content hierarchy. | Day 1 `H4–H5`. |
| Phase 5 — Technical architecture and foundation | Evaluate and record the minimum architecture/stack decision at its gate; establish reproducible quality and mock-only foundations. | Day 1 `H5–H8`. |
| Phase 6 — Golden-path vertical slice | Integrate the primary medical journey end to end. | Days 2–3. |
| Phase 7 — Adaptive application system | Implement bounded purpose guidance, applicable questions, deterministic validation and resume. | Day 2 `H0–H4`. |
| Phase 8 — Document and photograph system | Implement bundled-fixture preflight, versions, defect reason and replacement. | Day 2 `H4–H5`; Day 3 `H0–H1`. |
| Phase 9 — Payment and reconciliation system | Implement confirmed and pending/ambiguous local scenarios with reconciliation. | Day 2 `H6–H7`. |
| Phase 10 — Reviewer and administration workbench | Deliver one thin reviewer case and one policy-version/change-preview view. | Day 3 `H2–H4`. |
| Phase 11 — Status, communication and ETA | Deliver one unified timeline, one local notification failure/retry and synthetic ETA; broader notification coverage remains an unmet full-gate remainder. | Day 3 `H1–H2`. |
| Phase 12 — Downstream immigration simulation | Deliver one clearly mocked APIS/biometric/border/entry event strip. | Day 3 `H5–H6`. |
| Phase 13 — Security, privacy and quality hardening | Enforce synthetic boundaries continuously; run the concentrated release audit after freeze. | Day 3 `H6–H8`; Day 4 `H0–H4`. |
| Phase 14 — Testing and user validation | Exercise the full scenario, recoveries, mobile/accessibility and release checks with synthetic tasks. | Day 3 `H6–H8`; Day 4 `H0–H4`. |
| Phase 15 — Deployment and hackathon submission | Deploy, smoke-test, rehearse, package and submit. | Day 4 `H5–H8`. |
| Phase 16 — Government handoff roadmap | Include only a concise next-step note that calls for authorized discovery and preserves unknowns; defer the full roadmap. | Day 4 `H6–H7`. |

## 12. Day 3 feature freeze

The feature freeze begins when the Day 3 `H7–H8` gate passes or at the end of Day 3, whichever comes first.

After freeze:

- No new applicant, institutional, downstream or AI capability may be added.
- Only release-blocking defect correction, accessibility fixes, safety fixes, test repairs, content clarification, performance stabilization and submission polish are allowed.
- Any incomplete optional feature is removed or rolled back to the last verified deterministic behavior.
- The frozen scenario IDs, policy versions, fixture hashes, expected states and demo script cannot change without re-running the complete affected verification set.
- A change that alters scope or an accepted decision requires explicit approval and must not consume the Day 4 submission buffer.
- Day 4 begins from a reproducible frozen revision with a clean reset and recorded gate result.

## 13. Day 4 submission checklist

### Frozen-build verification

- [ ] Confirm the revision and working tree used for release are known and reproducible.
- [ ] Run all automated tests, linting, type checks and build checks.
- [ ] Run the primary medical path, tourist validation and all five recovery cases from a clean reset.
- [ ] Verify application, document, payment, scrutiny and ETA transitions and audit history.

### Safety and quality

- [ ] Confirm persistent `UNOFFICIAL HACKATHON PROTOTYPE — SYNTHETIC DATA ONLY — CANNOT SUBMIT A VISA APPLICATION` labeling.
- [ ] Confirm every document and ETA page/view shows `SYNTHETIC — NOT VALID`.
- [ ] Scan for secrets, realistic PII, real identifiers, prohibited domains and undeclared network calls.
- [ ] Verify local-only mocks fail closed and no arbitrary public upload persists.
- [ ] Run complete reset and compare the result with the canonical fixture manifest.
- [ ] Inspect privacy-safe logs and confirm they contain no document bodies or unnecessary applicant data.
- [ ] Verify supported mobile layout, keyboard operation, focus, notices, errors and interruption recovery.

### Deployment and submission

- [ ] Deploy the frozen revision and repeat smoke, reset, labeling and network checks in the deployed environment.
- [ ] Prepare the concise problem, thesis, medical story, tourist-generalization, architecture, safety and non-claim narrative.
- [ ] Prepare the deterministic demo runbook and a fallback recording or captured walkthrough.
- [ ] Confirm the demo never implies official status, real eligibility, medical advice, grant, admissibility or government endorsement.
- [ ] Verify submission links and artifacts from an evaluator-accessible context.
- [ ] Run one uninterrupted timed rehearsal and one recovery rehearsal.
- [ ] Submit before 27 August and record the submission receipt or confirmation.

Any failed safety or synthetic-data check blocks deployment and submission until corrected. Optional scope must be cut before a non-negotiable check is waived.

## 14. Contingency cuts if work slips

Apply cuts in this order. Each cut must be recorded; nothing removed may be implied complete.

| Cut order | Remove or reduce | Minimum that remains |
|---:|---|---|
| 1 | All AI evaluation or implementation work. | Complete deterministic baseline and all core journeys. |
| 2 | Animation, decorative transitions, custom illustration and nonessential presentation flourish. | Clear, coherent, accessible hierarchy and state feedback. |
| 3 | Additional tourist branches and tourist-specific recovery variants. | One straight-through `SYN-TOURIST-001` path proving shared policy and lifecycle concepts. |
| 4 | Editable policy-administration interactions. | Read-only active version, provenance and one precomputed impact preview. |
| 5 | Reviewer filters, queues, comparisons and extra actions. | One synthetic medical case, document versions, policy reasons and one re-upload action. |
| 6 | Multiple downstream outcomes or detailed post-entry history. | One clearly simulated APIS/biometric/border/entry event strip separating ETA from admissibility. |
| 7 | Additional document/photo quality heuristics and optional fixture variants. | Deterministic required checks, one controlled defect, watermark verification and safe replacement. |
| 8 | Extra notification templates, status prose variants and secondary presentation views. | One local re-upload or ETA notification plus the authoritative timeline and next action. |

Never cut:

- The primary medical end-to-end journey.
- All five mandatory failure/recovery cases.
- Explicit versioned policy and lifecycle state.
- Synthetic-only data, bundled fixtures, watermarks, reset and privacy-safe logging.
- Mock-only external boundaries and prohibited-live-access checks.
- Persistent non-official/cannot-submit labeling.
- The minimum mobile, keyboard and understandable-error path.
- Required tests, linting, type checks, deployment smoke and submission verification.

If the plan still cannot fit after Cut 8, reduce narrative breadth and institutional visual depth further; do not weaken the applicant core or any safety gate.
