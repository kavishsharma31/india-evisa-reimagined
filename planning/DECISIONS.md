# Architectural and Product Decision Log

This is the project’s append-only record of architectural and product decisions.

## Entry structure

Every decision entry contains:

- **Decision ID**
- **Title**
- **Status:** `PROPOSED`, `ACCEPTED`, `REJECTED`, or `SUPERSEDED`
- **Context**
- **Decision**
- **Rationale**
- **Alternatives considered**
- **Consequences and trade-offs**
- **Evidence/source**
- **Approval**
- **Supersedes or is superseded by**

## Append-only rules

- Append new entries in Decision ID order; never reuse an ID or delete an entry.
- Accepted decisions are never silently edited. If an accepted decision changes, create a new Decision ID that identifies the earlier entry it supersedes.
- Preserve the earlier entry’s substantive text. Its status and supersession reference may be changed only through an explicit, reviewed update that links to the new decision.
- Retain proposed, rejected and superseded entries so the reasoning history remains inspectable.

## D-001 — Treat the system dissection as the authoritative technical reference

- **Decision ID:** `D-001`
- **Title:** Treat the system dissection as the authoritative technical reference.
- **Status:** `ACCEPTED`
- **Context:** The public e-Visa surface supports strong conclusions about observable behavior and official system boundaries, but IVFRT’s private implementation remains partly inferred or unknown. The project needs one durable reference that preserves those confidence distinctions.
- **Decision:** Use [`docs/evisa-system-dissection.md`](../docs/evisa-system-dissection.md) as the authoritative technical reference for the existing system, its public behavior, its official context and the limits of what is knowable. Preserve its `Observed`, `Official`, `Inferred` and `Unknown` distinctions in downstream work.
- **Rationale:** A single evidence base prevents research drift, conflicting claims and accidental presentation of private-system inference as fact.
- **Alternatives considered:** Use ad hoc research during each task; treat the charter as the technical source; infer private architecture from public implementation clues.
- **Consequences and trade-offs:** Project work must trace system claims back to the dissection and clearly qualify uncertainty. New evidence may require a reviewed update, but convenience cannot override the reference boundary.
- **Evidence/source:** `AGENTS.md`; `planning/PROJECT_CHARTER.md` Sections 2, 7 and 8; system dissection Sections 1, 25 and Final assessment.
- **Approval:** Accepted by explicit user instruction and established project guidance.
- **Supersedes or is superseded by:** None.

## D-002 — Use synthetic data and mock external integrations exclusively

- **Decision ID:** `D-002`
- **Title:** Use synthetic data and mock external integrations exclusively.
- **Status:** `ACCEPTED`
- **Context:** Visa workflows involve highly sensitive identity, document, payment, health, security, biometric and travel data, plus government and financial systems that are outside the authorized proof-of-concept boundary.
- **Decision:** Use synthetic data exclusively. Keep government, payment, notification, APIS, biometric, border and IVFRT-facing behavior behind mock adapters. Never connect to, submit data to, scrape or automate the corresponding live systems.
- **Rationale:** This keeps the hackathon work safe, lawful, privacy-preserving and credible without requiring or implying access to protected services.
- **Alternatives considered:** Use real applicant data; call public live endpoints; integrate a real payment service; assume or emulate undocumented private protocols.
- **Consequences and trade-offs:** The proof of concept cannot establish production integration behavior or real-world adjudication fidelity. It must instead make simulation boundaries visible and design adapter contracts that can support later authorized discovery.
- **Evidence/source:** `AGENTS.md` Safety boundaries; `planning/PROJECT_CHARTER.md` Sections 1, 6, 7 and 8; system dissection Sections 20, 25, 26 and 27.
- **Approval:** Accepted by explicit user instruction and established project guidance.
- **Supersedes or is superseded by:** None.

## D-003 — Represent policy as versioned, explainable data

- **Decision ID:** `D-003`
- **Title:** Represent policy as versioned, explainable data rather than hard-coded UI conditions.
- **Status:** `ACCEPTED`
- **Context:** Eligibility, purposes, documents, fees, dates, ports and visa conditions vary across multiple dimensions and effective periods. The dissection found duplicated public policy representations and a very large client-side condition matrix, creating drift and testing risk.
- **Decision:** Represent policy in versioned data with provenance, effective bounds and human-readable evaluation reasons. Application interfaces consume evaluation results; they do not encode policy through hard-coded UI branches.
- **Rationale:** One explainable policy model improves consistency, auditability, testability, change control and applicant understanding.
- **Alternatives considered:** Hard-code rules in interface components; maintain separate client and server rule copies; publish static guidance without executable policy; expose the existing granular taxonomy directly.
- **Consequences and trade-offs:** Policy modeling, governance, version pinning and scenario testing require deliberate upfront work. In return, rule changes become reviewable data changes and every result can identify the policy version and reason that produced it.
- **Evidence/source:** `AGENTS.md` Product and architecture principles; `planning/PROJECT_CHARTER.md` Sections 5, 6 and 8; system dissection Sections 8, 9, 23, 26 and 27.
- **Approval:** Accepted by explicit user instruction and established project guidance.
- **Supersedes or is superseded by:** None.

## D-004 — Model core lifecycles explicitly

- **Decision ID:** `D-004`
- **Title:** Model application, document, payment, scrutiny and ETA lifecycles explicitly.
- **Status:** `ACCEPTED`
- **Context:** The journey is stateful and asynchronous. Draft recovery, document replacement, ambiguous payment results, scrutiny, decisions, ETA issuance and revocation cannot be represented safely as one linear form or a few booleans.
- **Decision:** Define explicit states, allowed transitions, failure states and recovery paths for application, document, payment, scrutiny and ETA lifecycles.
- **Rationale:** Explicit lifecycle models prevent invalid transitions, make ambiguous outcomes visible, support idempotency and recovery, and give applicants and institutional users a shared account of current state and next action.
- **Alternatives considered:** Treat the journey as a linear page sequence; infer state from completed fields; use only paid/unpaid and approved/rejected flags; handle exceptions as interface-only messages.
- **Consequences and trade-offs:** More states and transitions increase modeling and test effort. They also make failure behavior, audit history, status communication and cross-workflow coordination deterministic and reviewable.
- **Evidence/source:** `AGENTS.md` Product and architecture principles; `planning/PROJECT_CHARTER.md` Sections 5, 6 and 8; system dissection Sections 6, 10, 11, 12, 13, 14 and 27.
- **Approval:** Accepted by explicit user instruction and established project guidance.
- **Supersedes or is superseded by:** None.

## D-005 — Follow the gated execution plan

- **Decision ID:** `D-005`
- **Title:** Follow the gated, one-step-at-a-time execution plan.
- **Status:** `ACCEPTED`
- **Context:** The project spans policy, product, domain, experience, architecture, implementation, assurance and handoff work. Starting dependent work early would hide assumptions and make changes harder to review.
- **Decision:** Treat `PLANS.md` as the authoritative execution tracker. Work on one phase and one numbered step at a time, verify the active step’s exit condition before advancing, and obtain explicit user approval before beginning a new phase.
- **Rationale:** Gated progress keeps scope controlled, evidence visible and changes small enough to review while preventing assumed completion.
- **Alternatives considered:** Run phases in parallel; use an informal task list; mark work complete from intent; advance phases without explicit approval.
- **Consequences and trade-offs:** Sequential gates can reduce apparent speed and expose blockers earlier. They provide clearer accountability, safer sequencing and a durable record of why progress advanced.
- **Evidence/source:** `AGENTS.md` Working practices; `PLANS.md` Operating rules and phase gates.
- **Approval:** Accepted by explicit user instruction and established project guidance.
- **Supersedes or is superseded by:** None.

## D-006 — Defer technology-stack selection until Phase 5

- **Decision ID:** `D-006`
- **Title:** Defer technology-stack selection until Phase 5.
- **Status:** `ACCEPTED`
- **Context:** Product scope, domain boundaries, service journeys and experience requirements precede the technical-foundation phase. Choosing technologies before those constraints are established would turn untested assumptions into project structure.
- **Decision:** Make no technology-stack selection before Phase 5. Evaluate and record the choice during Phase 5 using requirements and evidence produced by the completed preceding phases.
- **Rationale:** Deferral preserves technology neutrality, avoids premature lock-in and ensures the eventual choice serves verified product and operational needs.
- **Alternatives considered:** Select a familiar stack during grounding; allow implementation defaults to become an implicit decision; scaffold application code before architecture evaluation.
- **Consequences and trade-offs:** Application scaffolding and stack-specific implementation wait until the proper gate. Earlier phases must express needs without relying on framework-specific assumptions, producing clearer evaluation criteria for Phase 5.
- **Evidence/source:** `PLANS.md` Operating rules and Phase 5; `planning/PROJECT_CHARTER.md` Sections 7, 10 and 11; `AGENTS.md` Working practices.
- **Approval:** Accepted by explicit user instruction and established project guidance.
- **Supersedes or is superseded by:** None.

## D-007 — AI is optional and must earn its place

- **Decision ID:** `D-007`
- **Title:** AI is optional and must earn its place
- **Status:** `ACCEPTED`
- **Context:** The proof of concept may encounter language, intent, document-readiness and case-understanding problems where AI could offer value, but the e-Visa domain is policy-sensitive, privacy-sensitive and consequential. Authoritative policy and lifecycle behavior must remain deterministic, explainable and testable. The user has explicitly approved AI only where it is required to produce a material improvement over a deterministic approach.
- **Decision:** AI may be used only when it materially improves a defined user or institutional outcome beyond a deterministic approach. Every AI feature requires a non-AI baseline for comparison. AI output must be advisory and deterministically validated wherever it affects policy or application data; it must never directly become authoritative case state. AI must never make authoritative eligibility, fee, duration, document-requirement, payment, visa, biometric, admissibility or border decisions. Every AI capability requires a safe fallback, uncertainty handling, measurable evaluation and synthetic-only proof-of-concept data. Selecting an external model, provider or production integration is deferred until the appropriate technical phase and requires a separate accepted decision. This decision selects no AI feature, model, provider or implementation.
- **Rationale:** Deterministic policy and lifecycle models provide the traceability, consistency and auditability required for authoritative outcomes. Requiring AI to demonstrate measurable advantage prevents novelty from displacing simpler, safer and more accessible solutions while permitting bounded advisory assistance where a deterministic approach cannot adequately achieve the defined outcome. Baselines, validation, fallbacks and uncertainty handling make usefulness and failure behavior reviewable.
- **Alternatives considered:** Adopt AI as a default product differentiator; prohibit AI entirely; allow AI features without a deterministic comparison or measurable evaluation; permit AI to make or silently influence authoritative decisions; select a model or provider before product, safety and technical requirements are established.
- **Consequences and trade-offs:** AI candidates begin as evaluation subjects rather than committed features and may be rejected when the deterministic baseline is sufficient. Evaluation, validation, fallback design and monitoring add work and may narrow the demonstration’s AI scope. In return, the project reduces policy error, privacy exposure, unexplained behavior, accessibility failure, operational dependence, cost uncertainty and premature provider lock-in while preserving a safe path to evidence-backed assistance.
- **Evidence/source:** Explicit user instruction approving AI only where required; `AGENTS.md` Safety boundaries and Product and architecture principles; `planning/PROJECT_CHARTER.md` Sections 5, 7, 8 and 9; accepted decisions `D-002`, `D-003`, `D-004` and `D-006`; `planning/SYNTHETIC_DATA_AND_INTEGRATION_BOUNDARIES.md` Sections 8–10; `planning/AI_FEATURE_EVALUATION.md`; system dissection Sections 8, 12, 20, 25–27 and Final assessment.
- **Approval:** Accepted by explicit user instruction approving AI only where required and subject to the safeguards recorded in this decision.
- **Supersedes or is superseded by:** None.

## D-008 — Select e-Medical as the primary POC scenario and e-Tourist as secondary validation

- **Decision ID:** `D-008`
- **Title:** Select e-Medical as the primary POC scenario and e-Tourist as secondary validation
- **Status:** `ACCEPTED`
- **Context:** Phase 1 Step 2 established an applicant-first product orientation and identified first-time tourist, Medical/Ayush patient and Business/Production Investment journeys as finalists. Phase 1 Step 3 compared them with nine weighted criteria totalling 100, score-level confidence, bounded synthetic outlines, mandatory recovery cases and the existing AI-evaluation framework. The comparison scored Medical/Ayush `87`, Business/Production Investment `85` and Tourist `82`. A primary golden path and complementary secondary validation scenario are required before the product thesis and scope can advance.
- **Decision:** Select `SYN-MEDICAL-001`, using the e-Medical treatment fixture, as the primary proof-of-concept golden path. Treat the medical attendant as a related sub-persona without inventing linked-case architecture, shared decision state or coupled payment. Select `SYN-TOURIST-001` as the secondary validation scenario. Retain e-Business/Production Investment as a policy stress test rather than an initial full journey. Require the five approved cross-category recovery cases in the later vertical slice. Keep the overall versioned-policy, application, document, payment, scrutiny, ETA, recovery and mock-adapter architecture category-agnostic. All six AI candidates remain `UNDER EVALUATION`.
- **Rationale:** Medical provides the strongest combination of human consequence, direct and official evidence, document complexity, recovery urgency and hackathon differentiation. A synthetic hospital-letter replacement and time-sensitive but non-promissory status journey make the policy-as-data and explicit-lifecycle thesis tangible without requiring a live or private integration. Tourist is the best secondary test because its familiar, lower-sensitivity journey can show whether the same policy, accessibility, mobile, save/resume, document, payment, scrutiny, recovery, status and ETA capabilities generalize beyond medical complexity. Business/Production Investment remains valuable for testing granular policy, sponsor evidence and a mocked external dependency, but a complete initial journey would add overlapping complexity and create greater risk of implying unknown private clearance workflows. AI contributed too little to determine the ranking: removing the AI criterion preserves the same score order, and the primary/secondary judgment is grounded in human, evidence, systems, differentiation and feasibility criteria.
- **Alternatives considered:** Select Tourist as the primary because it is most recognizable and safest; select Business/Production Investment as the primary because it exposes the richest commercial taxonomy; use Business/Production Investment as the secondary because it has the second-highest weighted total; build all three finalists end to end; defer selection until real volume or institutional-workflow evidence becomes available.
- **Consequences and trade-offs:** The primary journey requires strict synthetic-health minimization, fictional hospital evidence and careful language that never implies medical triage, urgency prioritization or an official decision. The attendant remains a bounded sub-persona rather than a second linked case, and Ayush remains a policy comparison rather than another golden path. Tourist adds a complementary generalization and accessibility check but does not maximize specialist workflow richness. Business/Production Investment will not initially prove a complete sponsor/clearance journey, reducing scope and private-workflow speculation while preserving it as a policy stress test. The scenario selection bounds fixtures and demonstration narrative; it does not make the architecture medical-specific or select an AI feature, model, provider, technology stack, real nationality or implementation.
- **Evidence/source:** Explicit user approval of “Medical primary, Tourist secondary”; `planning/POC_SCENARIO_SELECTION.md` Sections 1–10; `planning/TARGET_USERS_AND_PROBLEMS.md` Sections 2–10; accepted decisions `D-002` through `D-007`; system dissection Sections 6, 8–16 and 23–27.
- **Approval:** Accepted by explicit user instruction approving Medical as the primary scenario and Tourist as the secondary validation scenario.
- **Supersedes or is superseded by:** None.

## D-009 — Adopt a four-working-day hackathon execution mode

- **Decision ID:** `D-009`
- **Title:** Adopt a four-working-day hackathon execution mode
- **Status:** `ACCEPTED`
- **Context:** The submission deadline is 27 August, and the project must become demo-ready within no more than four focused working days. Phase 1 Step 3 has established `SYN-MEDICAL-001` as the primary golden path and `SYN-TOURIST-001` as secondary validation, but later product, design, architecture, implementation, assurance, deployment and submission work remains. The existing phase structure remains necessary for governance, evidence and approval, while the delivery cadence must now minimize critical-path risk and reserve time for final verification.
- **Decision:** Adopt a `FOUR-DAY HACKATHON SPRINT` execution mode whose output is a polished end-to-end proof of concept, not a production implementation. Use the medical vertical slice, `SYN-MEDICAL-001`, as the primary demonstration and `SYN-TOURIST-001` as a lightweight generalization test. Make the applicant experience deep while keeping reviewer and policy-administration coverage deliberately thin and conceptual. Keep every external system behind a mock adapter. Require functional completeness of the frozen MVP by the end of Day 3 and reserve Day 4 for testing, accessibility and safety verification, polish, deployment and submission. Treat AI as stretch-only unless a later evaluation proves that a bounded capability can be added without threatening the critical path; accepted decision `D-007`, including its deterministic baseline and separate-approval requirements, continues to apply. Safety, synthetic-data controls, accessibility and persistent non-official labeling remain non-negotiable. For this sprint only, replace `D-005`’s ordinary one-phase/one-numbered-step execution unit with one explicitly approved sprint task at a time; that task may package sequenced minimum outputs from multiple phases. `PLANS.md` phases and numbered steps remain the governance structure for full scope, evidence and status. Cross-phase sprint work does not satisfy a full phase gate, authorize a completion status or hide the unmet remainder.
- **Rationale:** A narrow, complete and well-rehearsed applicant journey demonstrates the project’s policy-as-data and explicit-lifecycle thesis more credibly than broad but unfinished coverage. Medical offers the strongest combination of human consequence, evidence, document complexity, recovery urgency and differentiation, while tourist efficiently tests that the architecture generalizes. Completing functionality before the final day protects time for the checks, recovery behavior, deployment and presentation quality required for a safe public demonstration.
- **Alternatives considered:** Continue the full plan at its original level of detail before implementation; attempt production-level completeness; build medical, tourist and Business/Production Investment as equally deep journeys; allocate substantial reviewer and administration scope; make AI a required differentiator; continue adding functionality through Day 4.
- **Consequences and trade-offs:** The sprint deliberately narrows breadth, institutional fidelity and optional capabilities. Reviewer and policy-administration views will prove end-to-end feasibility but will not reproduce real roles, queues, authoring processes or adjudication. Tourist will validate reuse without becoming a second full journey, and Business/Production Investment remains a policy stress test. Some cross-phase minimum outputs may be built while their original phases remain incomplete; every unsatisfied completion-gate remainder must stay recorded rather than being implied complete. Day 3 feature freeze reduces late flexibility but protects testing and submission quality. No production-readiness, government-endorsement or private-system-fidelity claim follows from a successful demo. No AI feature, model, provider, technology stack or implementation is selected by this decision.
- **Evidence/source:** Explicit user instruction establishing the 27 August deadline, the four-working-day limit and the required execution mode; accepted decisions `D-002` through `D-008`; `planning/POC_SCENARIO_SELECTION.md`, especially Sections 6, 8–10; `planning/AI_FEATURE_EVALUATION.md`; `planning/SYNTHETIC_DATA_AND_INTEGRATION_BOUNDARIES.md`; `AGENTS.md`; `PLANS.md`; and system dissection Sections 25–27 and Final assessment.
- **Approval:** Accepted by explicit user instruction to adopt the four-working-day hackathon execution mode and record it as `D-009`.
- **Supersedes or is superseded by:** Partially supersedes `D-005` only for the duration of the four-working-day sprint by replacing the ordinary one-phase/one-numbered-step execution unit with one explicitly approved cross-phase sprint task at a time. `D-005` continues to govern evidence, status integrity and explicit approval; full tracker completion still requires the original verified exit conditions.

## D-010 — Select the P0 technical architecture and stack

- **Decision ID:** `D-010`
- **Title:** Select the P0 technical architecture and stack
- **Status:** `ACCEPTED`
- **Context:** Day 1 Sprint Task 4A under accepted decision `D-009` requires the `H5–H6` architecture gate to identify the smallest architecture that can deliver the frozen P0 by the end of Day 3. The applicant-first Medical journey, lightweight Tourist reuse, five mandatory recoveries, versioned deterministic policy, separate explicit lifecycles, bundled synthetic documents, local fail-closed mocks, exact reset, mobile accessibility, privacy-safe audit timeline, synthetic ETA, thin reviewer/policy views and truthful 60-second applicant demonstration are binding. There is no authorized real data, arbitrary upload, authentication, live integration, AI dependency or production-scale requirement.
- **Decision:** Select Option B from [`TECHNICAL_ARCHITECTURE_AND_STACK.md`](TECHNICAL_ARCHITECTURE_AND_STACK.md): a static Vite + React + strict TypeScript modular monolith, styled with CSS Modules and global CSS tokens; framework-independent policy, domain-command, lifecycle, projection, audit and local mock-adapter modules; one runtime-validated, versioned `localStorage` envelope for disposable synthetic state; bundled versioned policy/fixture data and synthetic assets; no backend, route handler, serverless function, external database or live service; Vitest and React Testing Library for unit/component contracts; Playwright plus axe for browser, recovery, mobile and accessibility checks; and static Vercel deployment with no application secret and rollback to a known deployment. Use React Context/reducer only for validated render state and the single command facade; add no routing or state-management dependency. This decision accepts the hackathon P0 architecture only; implementation remains separately gated.
- **Rationale:** The weighted comparison scores the selected option `96/100`, compared with `87/100` for a unified Next.js application with browser persistence and `66/100` for Next.js with hosted persistence. A static client is the minimum sufficient authority for an entirely synthetic, single-browser POC: pure TypeScript modules preserve deterministic policy, lifecycle guards, idempotency, audit and projections, while one validated browser-store value supports reload/resume and exact reset. Removing the server, database, credentials and remote runtime reduces critical-path work and makes mock-only isolation and static deployment easier to prove. A same-origin handler adds a second runtime without a durable server authority, and hosted persistence solves multi-user/cross-device problems outside the frozen P0.
- **Alternatives considered:** Option A, Next.js/React/TypeScript with local browser persistence and possible same-origin Route Handlers; Option C, Next.js/TypeScript with an external hosted database/backend; React state without durable storage; `sessionStorage`; IndexedDB; a separate state-management/state-machine library; Tailwind; and a fourth vanilla-JavaScript approach. Next.js remains viable but adds unused client/server decisions; dynamic Route Handlers conflict with pure static export and do not improve client-owned P0 authority. Hosted persistence adds disproportionate schedule, deployment, isolation and operational risk. React-only/session storage does not meet durable resume, IndexedDB is unnecessary for small metadata with no uploads, and the additional libraries do not earn their P0 cost.
- **Consequences and trade-offs:** The P0 has one browser-local, single-tab synthetic authority and can be deployed as immutable static assets with no database, function or secret. Components cannot mutate state directly; the command layer validates transitions and emits privacy-safe events before the validated store is persisted, while projections derive status and next action. The architecture is fast to build, test and reset, but it does not provide cross-device resume, multi-user concurrency, trusted tamper resistance, real authentication or production persistence. A later real or shared system would require a separately approved server/persistence architecture. Exact package versions and a lockfile are created only in an approved foundation task. Phase 5 remains `NOT STARTED` and cannot be claimed complete from this decision.
- **Evidence/source:** [`TECHNICAL_ARCHITECTURE_AND_STACK.md`](TECHNICAL_ARCHITECTURE_AND_STACK.md); [`PHASE_1_BRIEF.md`](PHASE_1_BRIEF.md); [`DOMAIN_POLICY_AND_LIFECYCLE_CONTRACT.md`](DOMAIN_POLICY_AND_LIFECYCLE_CONTRACT.md); [`SERVICE_BLUEPRINT_AND_UX_WIREFLOW.md`](SERVICE_BLUEPRINT_AND_UX_WIREFLOW.md); [`SYNTHETIC_DATA_AND_INTEGRATION_BOUNDARIES.md`](SYNTHETIC_DATA_AND_INTEGRATION_BOUNDARIES.md); [`HACKATHON_SPRINT_PLAN.md`](HACKATHON_SPRINT_PLAN.md); accepted decisions `D-001` through `D-009`; `AGENTS.md`; `PLANS.md`; and the authoritative system dissection Sections 25–27 and Final assessment.
- **Approval:** Accepted by explicit user instruction approving Option B — the static Vite + React + strict TypeScript P0 architecture and its recorded persistence, testing, deployment and safety boundaries. This approval authorizes the P0 architecture decision only; implementation, package installation, scaffolding and deployment remain separately gated. No AI feature, model, provider, SDK or dependency is selected.
- **Supersedes or is superseded by:** None. This accepted decision satisfies only the sprint’s Day 1 `H5–H6` architecture-choice gate; it does not complete Phase 5 or supersede any accepted safety, product, policy, lifecycle, UX or sprint boundary.
