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
