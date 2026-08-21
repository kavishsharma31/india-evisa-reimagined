# Project Charter

## 1. Working project description

This project is an unofficial hackathon proof of concept that reimagines India’s e-Visa applicant experience and its supporting public-facing workflow. It explores a clearer, adaptive, recoverable and accessible journey using synthetic data and mock integrations only. It does not replace, connect to or claim to reproduce IVFRT’s private backend or any official adjudication capability.

## 2. Evidence basis

The authoritative system reference is [`docs/evisa-system-dissection.md`](../docs/evisa-system-dissection.md). It distinguishes observed public behavior, official statements, reasonable inference and unknown private implementation. This charter converts that evidence into a provisional product boundary; it does not turn inferred or unknown architecture into fact.

## 3. Core problem statement

Applicants must navigate volatile and duplicated policy, long forms, strict evidence preparation, fragmented save-and-recovery paths, ambiguous payment outcomes, asynchronous scrutiny and limited status guidance. Institutions must apply changing policy consistently, maintain explicit case state, protect highly sensitive information and recover safely from failures. The proof of concept addresses this public orchestration problem without guessing or reproducing the private government systems behind it.

## 4. Users

### Primary users

- Prospective applicants trying to understand eligibility, requirements, fees and visa conditions.
- Returning applicants resuming a draft, correcting evidence, resolving a mock payment or tracking a submitted case.
- Applicants using mobile devices, assistive technology or unreliable connections, including people who need especially clear language and recovery guidance.

### Secondary institutional users

- Simulated scrutiny and decision reviewers.
- Simulated policy and content administrators.
- Simulated support and operations staff investigating stalled or ambiguous cases.
- Government and delivery stakeholders evaluating the concept, governance model and future authorized integration boundaries.

## 5. Intended outcomes

### User outcomes

- Understand applicable policy and the reason for each eligibility, requirement, fee, date and condition result.
- Answer only relevant questions and know what remains before submission.
- Save, resume and recover without losing work or repeating avoidable data entry.
- Prepare documents and photographs successfully before submission and respond clearly to re-upload requests.
- Understand mock payment, scrutiny, decision, ETA and downstream-simulation states, including the next safe action after failure.
- Complete the journey with strong mobile usability, accessibility, privacy and security cues.

### Institutional outcomes

- Maintain one versioned, auditable policy representation with explainable evaluation results.
- Make application, document, payment, scrutiny and ETA states explicit and traceable.
- Reduce incomplete cases, avoidable evidence rejection, duplicate mock payments and support ambiguity.
- Demonstrate review, administration, recovery and downstream contracts without exposing or claiming private architecture.
- Provide credible evidence for an authorized future discovery and integration process.

## 6. Provisional proof-of-concept scope

- Explainable policy guidance for a deliberately limited, yet-to-be-selected set of synthetic scenarios.
- An adaptive application that derives questions, requirements, fees, dates and conditions from versioned policy data.
- Draft creation, save, resume, validation, review and submission behavior.
- Synthetic document and photograph preparation, preflight, upload state, scrutiny feedback and re-upload.
- Mock payment initiation, pending, failure, ambiguity, reconciliation, confirmation, receipt and refund states.
- Simulated scrutiny, evidence review, requests for correction and decision recording.
- Unified status visibility, mock communications and clearly non-official synthetic ETA issuance and revocation.
- Mock downstream APIS, biometric, border, admission, denial, entry and exit simulations.
- The minimum simulated reviewer, policy-administration, support and audit views needed to demonstrate the end-to-end thesis.

## 7. Explicit non-goals

- Building or presenting an official government service, production replacement or legally authoritative eligibility tool.
- Connecting to, submitting data to, scraping or automating live government, payment, APIS, biometric or IVFRT systems.
- Reproducing or claiming knowledge of IVFRT’s private backend, adjudication logic, databases, screening sources, infrastructure or internal interfaces.
- Processing real personal, passport, financial, health, security, document or biometric data.
- Taking real payments, making real visa decisions, issuing valid ETAs or influencing travel or border outcomes.
- Covering every nationality, visa category, purpose, port, exception or current legal rule in the proof of concept.
- Selecting a technology stack, final branding or final category scope in this charter.
- Claiming production readiness, regulatory approval, security accreditation or government endorsement.

## 8. Safety, privacy and integration constraints

- Use synthetic people, cases, documents, photographs, payment events, biometrics and travel events only.
- Keep every external dependency behind a mock adapter; prohibited live systems must remain unreachable by design.
- Never send data to or automate the live government, payment, APIS, biometric or IVFRT environments.
- Label the experience, communications and synthetic ETA artifacts clearly as unofficial and non-travel-valid.
- Preserve the dissection’s `Observed`, `Official`, `Inferred` and `Unknown` distinctions; never present inferred private architecture as fact.
- Represent policy as versioned data with provenance, effective bounds and explainable results, not hard-coded UI branches.
- Model application, document, payment, scrutiny and ETA lifecycles explicitly, including failure and recovery states.
- Minimize synthetic data, isolate test records, avoid realistic secrets and keep logs, fixtures and demonstrations privacy-safe.
- Prioritize mobile usability, accessibility, security, auditability, resilient save/resume and clear failure recovery.

## 9. Success-measure categories

Numeric baselines and targets are intentionally deferred to Phase 1. The categories are:

- Eligibility and requirement comprehension.
- Policy correctness, version traceability and explanation quality.
- Application completion, effort and abandonment.
- Save, resume and failure-recovery success.
- Document and photograph preparation success.
- Mock payment clarity, idempotency and reconciliation recovery.
- Status comprehension and next-action clarity.
- Accessibility and mobile usability.
- Reviewer, policy-administration and support effectiveness.
- State-transition and audit completeness.
- Privacy, security and synthetic-data compliance.
- Reliability and absence of prohibited live-system interaction.

## 10. Charter approval criteria

The charter is approved as the Phase 0 baseline when:

- All required sections are present, internally consistent and aligned with `AGENTS.md`, `PLANS.md` and the system dissection.
- The unofficial, synthetic-only, mock-only and private-backend boundaries are explicit.
- The provisional scope covers the required applicant, evidence, payment, scrutiny, status, ETA and downstream-simulation capabilities.
- Users, outcomes, non-goals, constraints and success-measure categories are sufficiently clear to begin Phase 1.
- No technology stack, final branding, final category scope or numeric success target has been selected.
- Verification evidence is recorded in `PLANS.md` and the user has explicitly authorized completion of Phase 0 Step 5.

## 11. Questions intentionally deferred to Phase 1

- Which applicant segments and secondary institutional users are highest priority?
- Which user and institutional problems are essential to the product thesis, and which are supporting concerns?
- Which visa categories, purposes and synthetic policy scenarios define the final proof-of-concept boundary?
- Which single scenario should anchor the later golden-path vertical slice?
- Which journeys, exception paths and recovery failures must the demonstration prove?
- What measurable baselines and numeric targets apply to each success-measure category?
- What mobile, accessibility, language and content-comprehension coverage is required?
- What level of reviewer, administration, support and downstream-simulation fidelity is persuasive but safe?
- Which assumptions require user research or authorized institutional validation?
- What positioning and content principles should guide later design while final branding remains unselected?
- Which product and delivery constraints should inform later architecture and technology decisions without selecting a stack before Phase 5?
