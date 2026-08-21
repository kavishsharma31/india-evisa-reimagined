# Consolidated Phase 1 Brief

## A. Status and authority

> **Status:** `APPROVED — PHASE 1 BASELINE`. By explicit user instruction, this brief closes Phase 1 Steps 4–7 under `D-009`. Phase 2 remains separately gated; this approval does not select technology or authorize implementation.

Authority comes from the [`system dissection`](../docs/evisa-system-dissection.md), [`PROJECT_CHARTER.md`](PROJECT_CHARTER.md), [`TARGET_USERS_AND_PROBLEMS.md`](TARGET_USERS_AND_PROBLEMS.md), [`POC_SCENARIO_SELECTION.md`](POC_SCENARIO_SELECTION.md), [`AI_FEATURE_EVALUATION.md`](AI_FEATURE_EVALUATION.md), [`SYNTHETIC_DATA_AND_INTEGRATION_BOUNDARIES.md`](SYNTHETIC_DATA_AND_INTEGRATION_BOUNDARIES.md), [`DECISIONS.md`](DECISIONS.md), and [`HACKATHON_SPRINT_PLAN.md`](HACKATHON_SPRINT_PLAN.md). [`PLANS.md`](../PLANS.md) controls status.

This unofficial proof of concept uses synthetic data and local, fail-closed mocks only. It cannot submit an application or claim, reproduce or connect to private IVFRT or live external systems.

## B. Locked product thesis

> **India e-Visa Reimagined turns a policy maze and fragmented transaction into an explainable, adaptive and recoverable journey, using one versioned policy model and explicit case state shared across applicant and deliberately thin institutional views.**

This applicant-first system redesign makes policy reasons, questions, evidence, progress, payment, scrutiny and recovery coherent around one case. Shared versioned policy and explicit lifecycle state make it more than a visual redesign.

It is not a chatbot wrapper, official eligibility or adjudication service, or reconstruction of private IVFRT architecture. Deterministic policy and state remain authoritative.

## C. Prioritized users and value proposition

| Audience | Role in the proof of concept | Value | Deliberate boundary |
|---|---|---|---|
| `SYN-MEDICAL-001` applicant | Primary, deep journey | Understand purpose and reasons; see applicable-only questions; prepare documents; save/resume; reconcile payment; recover from scrutiny/re-upload; see status, next action and a synthetic non-valid ETA. | Synthetic context only; no medical advice or timing promise. |
| Medical attendant | Related guidance-only sub-persona | Understand distinct attendant guidance. | No linked case, shared decision state or coupled payment. |
| `SYN-TOURIST-001` applicant | Secondary validation | Test shared policy and lifecycle concepts. | Lightweight reuse, not another full journey. |
| Conceptual scrutiny reviewer | Thin institutional user | See synthetic facts, policy reasons, state/history and request one correction. | No queue, risk screen or adjudication logic. |
| Policy/content administrator | Thin institutional user | Inspect one policy version and preview one controlled change. | No real authoring or publication workflow claim. |
| Support/operations | Indirect value | Read the unified privacy-safe timeline and next action. | No dedicated workbench or invented repair process. |
| Government/hackathon stakeholder | Evaluation audience, not persona | Judge applicant value, governance, coherence and safety. | No endorsement, official-fidelity or production claim. |

Institutional value is one versioned policy representation, consistent cross-surface explanations, explicit case/document states and traceable recovery/audit history. Reduced ambiguity and rework remains an unvalidated hypothesis.

## D. Demonstration narrative

1. Resolve medical purpose through deterministic guidance, showing policy version and reasons.
2. Ask only applicable medical questions.
3. Interrupt and resume the same case, answers, step and policy version.
4. Prepare bundled synthetic portrait, passport and hospital-letter fixtures.
5. Submit and show state history.
6. Reconcile an ambiguous mock payment without a duplicate charge.
7. Enter synthetic scrutiny and request a precise hospital-letter re-upload.
8. Add a corrected version and resume scrutiny while preserving history.
9. Show status and deterministic next action on one timeline.
10. Produce a watermarked, non-valid synthetic ETA.
11. Separately show mock APIS, biometric, border and entry events; ETA is not admissibility.
12. Run a short `SYN-TOURIST-001` reuse proof on the same architecture.
13. Briefly show reviewer correction and policy-version/change preview supporting the applicant story.

## E. Frozen MVP scope and priorities

Priorities are `P0 — REQUIRED FOR DEMO`, `P1 — POLISH ONLY AFTER P0`, `STRETCH`, and `DEFERRED`; P1 cannot expand the surface.

### Core scope

| Priority | Item | User or institutional value | Scenario coverage | Minimum acceptance evidence | Metrics |
|---|---|---|---|---|---|
| `P0 — REQUIRED FOR DEMO` | Persistent unofficial/synthetic/cannot-submit notice | Prevents official-use confusion | Every route | Accessible notice on every route | `M12` |
| `P0 — REQUIRED FOR DEMO` | Versioned medical-purpose and attendant guidance with reasons | Explains purpose and distinction | Medical; attendant | Expected purpose/version/reason; attendant stays guidance-only | `M01`, `M04` |
| `P0 — REQUIRED FOR DEMO` | Bounded adaptive medical application | Removes irrelevant questions | Medical; tourist reuse | Exact fixture-expected questions | `M01`, `M05` |
| `P0 — REQUIRED FOR DEMO` | Durable draft and visible save/resume | Prevents lost work | Medical interruption | Same case, answers, step and version | `M03`, `M06` |
| `P0 — REQUIRED FOR DEMO` | Bundled portrait, passport and hospital-letter preflight | Enables safe readiness | Medical | Valid/invalid fixtures match expected results | `M07`, `M12` |
| `P0 — REQUIRED FOR DEMO` | Submission plus application/document state history | Makes progress traceable | Medical | Ordered transitions and document versions visible | `M01`, `M07`, `M09` |
| `P0 — REQUIRED FOR DEMO` | Confirmed/ambiguous mock payment, reconciliation and duplicate prevention | Enables safe recovery | Medical | Both outcomes resolve; zero duplicate charge | `M03`, `M08` |
| `P0 — REQUIRED FOR DEMO` | Scrutiny and one precise re-upload | Makes correction actionable | Medical; reviewer | Expected reason, new version, resumed scrutiny | `M03`, `M07`, `M10` |
| `P0 — REQUIRED FOR DEMO` | Unified timeline and deterministic next action | Unifies recovery | All medical states | Every nonterminal state has an action or wait explanation | `M03`, `M09` |
| `P0 — REQUIRED FOR DEMO` | One local notification failure/retry | Proves communication recovery | Re-upload/ETA event | Retry resolves locally without state loss | `M09`, `M14` |
| `P0 — REQUIRED FOR DEMO` | Watermarked synthetic ETA | Completes the story safely | Medical | Correct state; visibly non-valid | `M01`, `M12` |
| `P0 — REQUIRED FOR DEMO` | Lightweight tourist reuse | Tests generalization | Tourist secondary | Shared policy and lifecycle complete fixture | `M02`, `M04`, `M05` |
| `P0 — REQUIRED FOR DEMO` | Thin reviewer case and re-upload action | Shows shared evidence | One medical case | Action passes without private-workflow claims | `M10` |
| `P0 — REQUIRED FOR DEMO` | Policy-version inspection and controlled change preview | Shows governed consistency | Medical/tourist | Expected impact appears | `M04`, `M10` |
| `P0 — REQUIRED FOR DEMO` | Mock APIS/biometric/border/entry strip | Separates ETA/admissibility | One sequence | Local synthetic events clearly simulated | `M12`, `M14` |
| `P0 — REQUIRED FOR DEMO` | Reset, privacy-safe logs and fail-closed local mocks | Makes demos reproducible/safe | All state/boundaries | Manifest restored; scans and network denial pass | `M12`, `M13` |
| `P0 — REQUIRED FOR DEMO` | Mobile, keyboard, understandable errors and recovery | Makes the path inclusive | Primary path; five recoveries | `M11` checks pass | `M03`, `M11` |
| `P0 — REQUIRED FOR DEMO` | Tests, safety verification, deployment and fallback walkthrough | Makes delivery resilient | Frozen demo | Checks, smoke, rehearsal and fallback pass | `M01`–`M14` |

### Mandatory recovery cases

| Priority | Recovery case | Value | Coverage | Minimum acceptance evidence | Metrics |
|---|---|---|---|---|---|
| `P0 — REQUIRED FOR DEMO` | Interrupted draft | No lost work | Medical | Correct state restored without duplicate draft | `M03`, `M06` |
| `P0 — REQUIRED FOR DEMO` | Invalid or unclear document | Precise correction | Medical | Expected reason and preserved history | `M03`, `M07` |
| `P0 — REQUIRED FOR DEMO` | Payment pending or ambiguous | No unsafe repeat payment | Medical | Expected resolution and zero duplicate charge | `M03`, `M08` |
| `P0 — REQUIRED FOR DEMO` | Re-upload requested | Coherent evidence recovery | Medical/reviewer | Status, notification, replacement and scrutiny agree | `M03`, `M07`, `M10` |
| `P0 — REQUIRED FOR DEMO` | Status/next-action confusion | Clear recovery | Medical | Timeline identifies one safe action or waiting state | `M03`, `M09` |

### Non-P0 priorities

| Priority | Item | Value | Scenario coverage | Minimum acceptance evidence | Metrics |
|---|---|---|---|---|---|
| `P1 — POLISH ONLY AFTER P0` | Copy, hierarchy and visual-consistency refinement | Improves clarity and confidence | Existing P0 routes only | P0 remains passing; no route or state added | `M11`, `M14` |
| `P1 — POLISH ONLY AFTER P0` | Loading, empty and transition-state refinement | Clarifies existing behavior | Existing P0 states only | No lifecycle change; affected checks pass | `M09`, `M14` |
| `P1 — POLISH ONLY AFTER P0` | Demo narration and boundary explanation | Improves evaluator comprehension | Frozen demo | Rehearsal stays within target and states non-claims | `M14` |
| `STRETCH` | One bounded AI capability, not yet selected | Possible advisory assistance only if it materially beats its deterministic baseline | Synthetic P0 fixture only | Separate accepted decision; `D-007` gates; maximum four hours; all core metrics still pass | `M01`–`M14` regression gates |
| `DEFERRED` | Production behavior, scale, operations and legal completeness | Avoids false readiness claims | None | Explicitly absent and disclosed | `M12`, `M14` boundary checks |
| `DEFERRED` | Full visa/nationality/language coverage, full Ayush/Business journeys and linked attendant cases | Protects critical-path focus | Only approved medical/tourist fixtures | No unsupported route or policy claim exists | `M02`, `M12` |
| `DEFERRED` | Live integrations, arbitrary public uploads, real payments, decisions, biometrics or border actions | Preserves safety and privacy | Local mocks only | Network and input checks prove absence | `M12` |
| `DEFERRED` | Complete reviewer, policy-admin and support systems | Avoids invented private workflows | Thin P0 moments only | No extra queue, role or workflow is implied | `M10`, `M14` |
| `DEFERRED` | Multilingual breadth, final branding and nonessential presentation scope | Preserves delivery time | Existing English/plain-language demo | Deferral is visible; accessibility core remains | `M11`, `M14` |

All six AI candidates remain unselected, `UNDER EVALUATION`, stretch-only and outside the critical path.

## F. Scope invariants and non-goals

- Policy and lifecycle architecture stays category-agnostic; no hard-coded medical or tourist interface exceptions.
- Only bundled synthetic fixtures are used. Mock adapters are local and fail closed.
- Deterministic versioned policy and explicit case state are authoritative.
- No policy fixture claims current legal completeness.
- No real adjudication, biometric processing, admissibility or border decision occurs.
- No production-readiness, government-endorsement or private-backend-fidelity claim is made.
- Accessibility, privacy, recovery, persistent labeling, watermarks and prohibited-live-access controls cannot be cut.

## G. Numeric success scorecard

These are hackathon acceptance measures, not production-impact claims or measured improvements over the live service.

| ID | Outcome | Baseline or collection method | Numeric target | Evaluation method | Acceptance threshold | Associated P0 features |
|---|---|---|---|---|---|---|
| `M01` | Medical golden path | Canonical seed/state ledger | `5/5` clean-reset runs reach synthetic ETA without manual state editing | E2E and state-log check | `5/5`; any failure blocks | Guidance, application, state, ETA |
| `M02` | Tourist reuse | Tourist seed and shared-concept inspection | `3/3` runs; `0` separate tourist lifecycle implementations | E2E and architecture check | Both targets met | Tourist reuse |
| `M03` | Recovery coverage | Five seeded failure/interruption oracles | All `5` cases pass `3/3` each (`15/15`) | E2E scenario matrix | `15/15`; none omitted | Five recoveries, timeline |
| `M04` | Policy explainability | Inventory displayed policy results | `100%` show pinned version and at least one deterministic reason/provenance reference | Assertion and visual check | Exactly `100%` | Guidance, tourist, preview |
| `M05` | Adaptive relevance | Both fixture question manifests | `100%` expected questions; `0` other-scenario-only questions | Fixture/render comparison | Both targets met | Medical/tourist questions |
| `M06` | Save/resume | Canonical interruption checkpoint | `5/5` restore same case, answers, step and policy version; `0` duplicate drafts | Interruption E2E | Both targets met | Draft/save/resume |
| `M07` | Document readiness | Valid/invalid fixture manifest | `100%` valid pass; `100%` invalid fail for expected reason; replacement history preserved | Preflight tests and re-upload E2E | Every assertion passes | Preflight, history, re-upload |
| `M08` | Payment safety | Ambiguous-result ledger | `0` duplicate mock charges across `10` retries; `10/10` expected resolutions | Adapter/E2E test | Both targets met | Payment/reconciliation |
| `M09` | Status/next action | Inventory exposed nonterminal states | `100%` have one safe action or explicit wait explanation | State-message test/review | Exactly `100%` | Timeline, notification, history |
| `M10` | Institutional thin slice | Reviewer/preview scenario oracles | Reviewer re-upload `3/3`; policy preview `3/3` | Scenario and audit-event tests | Both `3/3` | Reviewer/admin moments |
| `M11` | Accessibility/mobile | Automated scan and route inventory | Primary plus five recoveries keyboard-only (`6/6`); `0` critical/serious findings; `0` overflow at `360×800` | Audit and keyboard/viewport checks | All targets met | Mobile, keyboard, errors, recovery |
| `M12` | Safety/privacy | Repository/runtime and route/artifact scans | `0` realistic PII, secrets, prohibited endpoints or live requests; `100%` document/ETA views watermarked; notice on `100%` routes | Scans, network-deny and label review | Every zero/100% target met | Notices, fixtures, mocks, downstream |
| `M13` | Reset reproducibility | Canonical manifest hash/clean snapshot | `5/5` resets restore manifest and clean state | Mutate-reset-compare | `5/5` exact | Complete reset |
| `M14` | Demo readiness | Timed rehearsal/release checklist | `1/1` primary demo within `7` minutes; `1/1` recovery rehearsal; `1` fallback walkthrough; `1/1` deployed smoke | Rehearsal and deployed check | Every clause passes | Release, deployment, fallback, regression |

## H. Validation plan and evidence gaps

- **Deterministic automated checks:** policy results, question sets, transitions, fixtures, payments, state messages, reset, watermarks, secrets, realistic PII, logging and network isolation.
- **Scenario E2E tests:** medical, tourist, reviewer/admin moments and all five recovery cases from canonical seeds.
- **Manual keyboard/mobile checks:** primary journey and recovery behavior at the supported viewport, including focus, understandable errors and no horizontal overflow.
- **Small-sample synthetic usability tasks:** exploratory purpose, status and recovery comprehension only; record observations without generalizing to real populations.
- **Deployed smoke tests:** reset, primary path, labels, mock-only behavior and evaluator access in the deployed environment.
- **Final rehearsal:** one timed uninterrupted story, one recovery story and the fallback walkthrough.

Unresolved evidence includes real volumes, errors and user outcomes; policy operations; private institutional workflows; production performance; and impact on ambiguity or rework. These require later research or authorized discovery.

## I. Phase 1 approval record

> **APPROVAL RECORD — PHASE 1**
>
> By explicit user instruction, the approved baseline includes:
>
> - The locked product thesis.
> - The medical-first applicant story.
> - Lightweight tourist validation.
> - The frozen `P0 — REQUIRED FOR DEMO` scope.
> - The P1, Stretch and Deferred boundaries.
> - All 14 success metrics and targets.
> - The complete consolidated Phase 1 brief.

This approval closes Phase 1 Steps 4–7 under `D-009`. Phase 2 remains separately gated and `NOT STARTED`. No technology stack, framework, database, hosting platform, model, provider or implementation was approved. All six AI candidates remain `UNDER EVALUATION`. Future scope changes require explicit review.
