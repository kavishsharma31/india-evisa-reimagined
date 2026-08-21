# Proof-of-Concept Scenario Selection

> **Status:** `APPROVED`. The user explicitly approved `SYN-MEDICAL-001` as the primary golden path and `SYN-TOURIST-001` as the secondary validation scenario. No AI capability, model, provider, technology stack or implementation is selected.

This comparison uses [`docs/evisa-system-dissection.md`](../docs/evisa-system-dissection.md) as the authoritative system reference, [`TARGET_USERS_AND_PROBLEMS.md`](TARGET_USERS_AND_PROBLEMS.md) as the approved Step 2 prioritization, and [`AI_FEATURE_EVALUATION.md`](AI_FEATURE_EVALUATION.md) plus [`SYNTHETIC_DATA_AND_INTEGRATION_BOUNDARIES.md`](SYNTHETIC_DATA_AND_INTEGRATION_BOUNDARIES.md) as mandatory evaluation and safety boundaries.

## 1. Decision objective and guardrails

The objective is to recommend one primary proof-of-concept scenario and one secondary validation scenario that together maximize human relevance, systems depth, hackathon differentiation and credible end-to-end demonstrability while remaining safe and buildable.

Important claims retain the project evidence labels:

- `OBSERVED` — directly visible in the public application or delivered public code.
- `OFFICIAL` — stated in cited Government of India material.
- `INFERRED` — the smallest conclusion consistent with observed or official behavior, but not publicly confirmed.
- `ASSUMPTION` — a prioritization or scenario hypothesis requiring validation.

The decision guardrails are:

- The user has explicitly approved Medical primary and Tourist secondary; the selection is bounded by the recorded scores, exclusions and safety controls.
- All applicant, document, photograph, payment, health, declaration, review, ETA and travel-event data must be synthetic.
- No real nationality is selected. Each outline uses a visibly fictional policy cohort; any later real-country example would be sourced policy context, not applicant data or an unsourced rule.
- Requirements, fees, dates, duration, entries and conditions come only from an approved, versioned policy fixture with provenance and effective context.
- Payment, notification, document inspection, external clearance, APIS, biometric, border and IVFRT behavior remains behind local mock adapters.
- Reviewer, support and policy-administration views are deliberately minimal and conceptual; no private government workflow, payload, interface or adjudication logic is invented.
- AI contributes only 5 of 100 possible points. It cannot make or break the recommendation, and all six candidates remain `UNDER EVALUATION` against deterministic baselines.
- Accessibility, mobile usability, privacy, security, language comprehension and unreliable-connectivity recovery remain non-negotiable.
- No technology stack, model, provider or production integration is selected.

## 2. Candidate journey summaries

| Finalist | Human situation | Systems represented | Evidence and principal uncertainty |
|---|---|---|---|
| First-time e-Tourist applicant | A first-time applicant needs to translate an ordinary leisure trip into the correct purpose, requirements and next actions without losing work or misreading payment/status. | Guided purpose selection, shared application fields, core photograph/passport evidence, save/resume, payment, scrutiny, status and ETA. | `OBSERVED`: tourist purposes and the shared journey exist (§§6, 9). `ASSUMPTION`: audience reach, first-time confusion and failure rates are not measured. |
| e-Medical/Ayush patient journey, with attendant as a related sub-persona | A patient facing time-sensitive treatment travel must choose between medical/Ayush purposes, prepare hospital evidence and recover from delays; an attendant needs related but separately bounded guidance. | High-consequence purpose guidance, date and evidence policy, synthetic health-data minimization, hospital-letter readiness, shared lifecycle and a related attendant sub-persona. | `OBSERVED`/`OFFICIAL`: purposes, nationality-dependent behavior and hospital-letter/admission-date requirements are documented (§§8–10). Reach, urgency distribution and patient-attendant linkage are unknown. |
| e-Business/Production Investment traveller | A traveller must map a specific commercial intent to a granular purpose, prepare invitation or sponsorship evidence and understand that external-clearance dependencies may exist. | Rich purpose taxonomy, sponsor/evidence rules, shared lifecycle and a conceptual mock external-clearance boundary. | `OBSERVED`/`OFFICIAL`: business variants, documents and production-investment sponsorship are documented (§§9–10, 16). Private clearance contracts, routing and operational coordination are unknown (§25). |

## 3. Weighted selection criteria

Weights total exactly 100.

| Criterion | Weight | What a high raw score means |
|---|---:|---|
| Human need and consequence | 15 | Failure can materially affect health, money, time-sensitive travel or another important human outcome. |
| Likely reach and audience recognizability | 10 | The scenario is plausibly broad and immediately understandable to applicants and hackathon evaluators. |
| Strength of available evidence | 10 | Public or official evidence directly supports the journey, requirements and problem. |
| Representation of the wider e-Visa system | 10 | The scenario exercises reusable policy, application, document, payment, scrutiny, status and ETA capabilities. |
| Policy, document and workflow richness | 15 | The scenario exposes meaningful conditional policy, evidence variants and lifecycle behavior without invented complexity. |
| Hackathon differentiation | 15 | The scenario makes policy-as-data, explicit state and recovery visibly more than a cosmetic redesign. |
| End-to-end demonstration clarity | 10 | A short audience can understand the applicant problem, transitions, failures, recovery and outcome. |
| Proof-of-concept feasibility and safety | 10 | The scenario can be built with bounded synthetic fixtures and mock-only integrations without implying private-system fidelity. |
| Credible optional AI opportunity | 5 | At least one advisory AI candidate could be evaluated fairly against a strong deterministic baseline without gaining authority. |
| **Total** | **100** | |

## 4. Scored comparison

### 4.1 Method

Each candidate receives a raw score from 1 to 5. Weighted points are calculated as:

`weighted points = criterion weight × raw score ÷ 5`

All results are exact integers for the selected weights and scores. Confidence is not added to the total:

- `HIGH` — repeated `OBSERVED` or `OFFICIAL` evidence directly supports the score.
- `MEDIUM` — the mechanism is evidenced, but reach, user behavior, outcomes or safe fidelity remains uncertain.
- `LOW` — the score depends materially on an unvalidated assumption or unknown private workflow.

Totals support judgment; they do not replace it.

### 4.2 Weighted comparison matrix

| Criterion | Weight | Tourist raw | Tourist points | Medical/Ayush raw | Medical/Ayush points | Business/Production raw | Business/Production points |
|---|---:|---:|---:|---:|---:|---:|---:|
| Human need and consequence | 15 | 4 | 12 | 5 | 15 | 4 | 12 |
| Likely reach and audience recognizability | 10 | 4 | 8 | 3 | 6 | 3 | 6 |
| Strength of available evidence | 10 | 4 | 8 | 5 | 10 | 5 | 10 |
| Representation of the wider e-Visa system | 10 | 5 | 10 | 4 | 8 | 5 | 10 |
| Policy, document and workflow richness | 15 | 3 | 9 | 5 | 15 | 5 | 15 |
| Hackathon differentiation | 15 | 4 | 12 | 5 | 15 | 4 | 12 |
| End-to-end demonstration clarity | 10 | 5 | 10 | 4 | 8 | 4 | 8 |
| Proof-of-concept feasibility and safety | 10 | 5 | 10 | 3 | 6 | 4 | 8 |
| Credible optional AI opportunity | 5 | 3 | 3 | 4 | 4 | 4 | 4 |
| **Weighted total** | **100** | | **82** | | **87** | | **85** |

| Candidate | Total without AI, out of 95 | AI points, out of 5 | Weighted total, out of 100 | Score rank | Overall confidence |
|---|---:|---:|---:|---:|---|
| e-Medical/Ayush patient journey | 83 | 4 | **87** | 1 | `MEDIUM` |
| e-Business/Production Investment traveller | 81 | 4 | **85** | 2 | `MEDIUM` |
| First-time e-Tourist applicant | 79 | 3 | **82** | 3 | `MEDIUM` |

Removing AI leaves the score order unchanged, so AI does not determine the result. The one-point difference in AI contribution between tourist and the other scenarios also cannot reverse any non-AI score gap.

### 4.3 Rationale and confidence for every score

#### First-time e-Tourist applicant

| Criterion | Raw | Weighted | Confidence | Rationale |
|---|---:|---:|---|---|
| Human need and consequence | 4 | 12 | `MEDIUM` | `INFERRED`: errors can cause financial loss, disrupted travel or case failure, but the consequences are generally less acute than treatment-linked travel. |
| Likely reach and audience recognizability | 4 | 8 | `LOW` | `ASSUMPTION`: leisure travel is highly recognizable to a demo audience, but public applicant-volume data is unavailable, so the score is deliberately below 5. |
| Strength of available evidence | 4 | 8 | `MEDIUM` | `OBSERVED`: tourist purposes and the common journey are visible (§§6, 9); first-time behavior and measured friction are not directly studied. |
| Representation of the wider e-Visa system | 5 | 10 | `HIGH` | `OBSERVED`: the journey can exercise purpose, application, core documents, payment, scrutiny, status and ETA (§§6, 10–14). |
| Policy, document and workflow richness | 3 | 9 | `HIGH` | `OBSERVED`/`INFERRED`: it covers the common lifecycle well but has fewer documented specialist evidence and clearance branches than the other finalists. |
| Hackathon differentiation | 4 | 12 | `MEDIUM` | `INFERRED`: adaptive guidance and explicit recovery can exceed a form redesign, although a simple tourist story could be presented too cosmetically. |
| End-to-end demonstration clarity | 5 | 10 | `MEDIUM` | `ASSUMPTION`: the trip is immediately legible and the shared journey is straightforward to narrate; evaluator research is absent. |
| Proof-of-concept feasibility and safety | 5 | 10 | `HIGH` | `INFERRED`: core synthetic identity, portrait, passport and travel-context fixtures can remain bounded with no sensitive health or clearance dependency. |
| Credible optional AI opportunity | 3 | 3 | `LOW` | `ASSUMPTION`: intent, explanation, multilingual, readiness and support assistance may be testable, but deterministic interviews, templates and state messages may already solve most needs. |

#### e-Medical/Ayush patient journey

| Criterion | Raw | Weighted | Confidence | Rationale |
|---|---:|---:|---|---|
| Human need and consequence | 5 | 15 | `MEDIUM` | `INFERRED`: delay or misunderstanding can disrupt time-sensitive treatment and attendant travel; actual consequence distribution is not measured. |
| Likely reach and audience recognizability | 3 | 6 | `LOW` | `ASSUMPTION`: the need is understandable, but category volume and evaluator familiarity are unknown. |
| Strength of available evidence | 5 | 10 | `HIGH` | `OBSERVED`/`OFFICIAL`: medical/Ayush purposes, conditional behavior and hospital-letter/admission-date requirements are documented (§§8–10). |
| Representation of the wider e-Visa system | 4 | 8 | `MEDIUM` | `INFERRED`: it exercises the shared lifecycle and rich evidence policy, but its health context is more specialized than a general tourist path. |
| Policy, document and workflow richness | 5 | 15 | `HIGH` | `OBSERVED`/`OFFICIAL`: purpose variation, dates, hospital evidence, an attendant sub-persona, scrutiny and recovery provide meaningful documented richness (§§8–12). |
| Hackathon differentiation | 5 | 15 | `MEDIUM` | `INFERRED`: combining high-consequence guidance, document readiness, privacy minimization and recovery strongly demonstrates a systems product rather than visual polish. |
| End-to-end demonstration clarity | 4 | 8 | `MEDIUM` | `ASSUMPTION`: a treatment deadline, hospital letter and recovery form a coherent narrative, but patient-attendant context requires more explanation than tourism and representative-user validation is absent. |
| Proof-of-concept feasibility and safety | 3 | 6 | `MEDIUM` | `OFFICIAL`/`INFERRED`: it is buildable only with tightly controlled fictional health and hospital fixtures, no free-text disclosure and no invented patient-attendant linkage. |
| Credible optional AI opportunity | 4 | 4 | `LOW` | `ASSUMPTION`: policy explanation, multilingual help, readiness and status support could be evaluated, but AI must not interpret health or make policy decisions. |

#### e-Business/Production Investment traveller

| Criterion | Raw | Weighted | Confidence | Rationale |
|---|---:|---:|---|---|
| Human need and consequence | 4 | 12 | `MEDIUM` | `INFERRED`: misclassification or delay can disrupt consequential commercial activity, although severity varies and is not measured. |
| Likely reach and audience recognizability | 3 | 6 | `LOW` | `ASSUMPTION`: business travel is understandable, but production-investment demand and purpose distribution are unknown. |
| Strength of available evidence | 5 | 10 | `HIGH` | `OBSERVED`/`OFFICIAL`: granular business purposes, invitation/sponsor documents and the production-investment sponsorship module are documented (§§9–10, 16). |
| Representation of the wider e-Visa system | 5 | 10 | `MEDIUM` | `INFERRED`: it spans shared lifecycles plus external evidence and a mock clearance boundary, while the real coordination remains unknown. |
| Policy, document and workflow richness | 5 | 15 | `HIGH` | `OBSERVED`/`OFFICIAL`: the purpose taxonomy and documented evidence variants are exceptionally rich (§§9–10, 16). |
| Hackathon differentiation | 4 | 12 | `MEDIUM` | `INFERRED`: sponsor evidence, policy explanation and a fail-closed mock clearance show orchestration beyond a prettier form, but unknown private coordination can weaken the claim. |
| End-to-end demonstration clarity | 4 | 8 | `MEDIUM` | `ASSUMPTION`: the narrative is coherent but granular business distinctions and external dependencies require more explanation than tourist or medical. |
| Proof-of-concept feasibility and safety | 4 | 8 | `MEDIUM` | `INFERRED`: fictional company evidence and a local deterministic dependency fixture are feasible if no real organization, endpoint, schema or clearance workflow is represented (§§16, 25). |
| Credible optional AI opportunity | 4 | 4 | `LOW` | `ASSUMPTION`: intent interpretation, policy explanation and case summarization may help with the dense taxonomy, but no measurable AI advantage is established. |

## 5. Synthetic scenario outlines

Every fixture below is deterministic, obviously fictitious and resettable. Documents and ETA artifacts are visibly watermarked `SYNTHETIC — NOT VALID`. The neutral fixture `SYN-POLICY-COHORT-A` stands in for an eligible policy context and is not a real nationality or a claim about one.

### 5.1 First-time e-Tourist applicant — `SYN-TOURIST-001`

- **Applicant situation:** A fictional first-time applicant plans a short leisure visit and is unsure how ordinary travel intent maps to the public purpose taxonomy.
- **Purpose-selection challenge:** A deterministic guided interview distinguishes leisure/sightseeing from other nearby intents, explains the result and requires applicant confirmation.
- **Required policy branching:** The versioned fixture evaluates policy cohort, passport type, purpose, arrival window, permitted port, document set, fee rule, duration, entries and conditions. No concrete rule value is asserted without sourced policy provenance.
- **Document preparation:** Bundled synthetic portrait and passport-page fixtures receive deterministic format, size, dimension and watermark preflight. Optional itinerary context is not treated as an official requirement unless the approved fixture sources it.
- **Save/resume:** The applicant stops after travel details, receives visible saved-state evidence and resumes the same deterministic draft without re-entering completed fields.
- **Mock payment:** A local scenario adapter confirms a synthetic payment intent and receipt; the required ambiguous-payment recovery remains available as a separate case.
- **Scrutiny/re-upload:** The first portrait fixture is deliberately unclear; a conceptual reviewer requests replacement, the applicant selects a corrected bundled fixture and review resumes.
- **Status and next action:** One timeline shows draft, submitted, payment, scrutiny, re-upload, decision and ETA states with a deterministic next action.
- **Synthetic ETA:** A clearly unofficial, watermarked artifact is issued only after the mock granted state and states that it is not a valid travel document or guarantee of admission.
- **Minimal reviewer/policy-administration demonstration:** Show the pinned policy version and reason codes, one document-version comparison, one re-upload action and a policy change preview. Do not simulate private risk screening or real adjudication logic.

### 5.2 e-Medical/Ayush patient journey — `SYN-MEDICAL-001`

- **Applicant situation:** A fictional patient has a planned admission at a fictional care institution and may travel with an attendant represented only as a related sub-persona.
- **Purpose-selection challenge:** Deterministic questions distinguish a medical-treatment path from an Ayush-treatment path and explain why the approved primary fixture uses e-Medical. The attendant receives separate guidance; no linked-application architecture is claimed.
- **Required policy branching:** The versioned fixture evaluates policy cohort, medical versus Ayush purpose, proposed admission date, application/arrival window, hospital-evidence requirement, fee rule, duration, entries and conditions.
- **Document preparation:** Bundled synthetic portrait, passport page and hospital letter are preflighted. The hospital letter contains only minimal fictional treatment context and a synthetic proposed admission date; every page is watermarked.
- **Save/resume:** The applicant pauses before the hospital-letter step and resumes with prior answers and the pinned policy version intact.
- **Mock payment:** A local adapter produces a confirmed synthetic payment for the main path; the pending/ambiguous variant proves safe verification without duplicate payment.
- **Scrutiny/re-upload:** The first hospital-letter fixture has an intentionally unclear admission date. A conceptual re-upload request identifies the specific issue; a corrected version replaces it without erasing history.
- **Status and next action:** The timeline distinguishes payment confirmation, scrutiny, re-upload requested, replacement received, review resumed and synthetic decision, with urgency-aware but non-promissory guidance.
- **Synthetic ETA:** A watermarked, non-valid ETA fixture is generated after the mock granted state and explicitly separates ETA from final border admissibility.
- **Minimal reviewer/policy-administration demonstration:** Show only structured synthetic facts, sourced policy results, evidence versions, the re-upload request and a versioned hospital-letter rule preview. Do not simulate medical judgment, risk screening or private adjudication.

### 5.3 e-Business/Production Investment traveller — `SYN-BUSINESS-001`

- **Applicant situation:** A fictional professional plans a short commercial visit involving a production-investment intent and a fictional sponsor.
- **Purpose-selection challenge:** Deterministic questions distinguish the relevant granular business intent from meetings, trade, specialist work and other documented business purposes.
- **Required policy branching:** The versioned fixture evaluates policy cohort, exact purpose, sponsor/evidence requirements, fee rule, duration, entries and any publicly sourced clearance dependency. A local mock state represents only that a dependency exists.
- **Document preparation:** Bundled synthetic portrait, passport page, invitation and applicable sponsor/undertaking fixtures are preflighted against the selected sourced requirement set.
- **Save/resume:** The applicant pauses while reviewing sponsor evidence and later resumes the same policy-pinned draft.
- **Mock payment:** A local adapter supplies a synthetic confirmed result for the main path and the shared pending/ambiguous recovery scenario.
- **Scrutiny/re-upload:** A deliberately incomplete sponsor fixture produces a precise re-upload request; the corrected bundled version restores review without claiming a real approval workflow.
- **Status and next action:** The timeline may show `MOCK CLEARANCE PENDING` as a predeclared scenario state, but it exposes no ministry, mission, NSWS or private payload and makes no timing promise.
- **Synthetic ETA:** A visibly non-valid ETA fixture is generated only after predeclared mock clearance and mock grant states.
- **Minimal reviewer/policy-administration demonstration:** Show the selected policy version, sponsor-document reasons, one mock dependency state, evidence replacement and an audit event. Do not reproduce or imply a real sponsor, clearance or reviewer interface.

## 6. Essential recovery cases required regardless of category

| Recovery case | Deterministic scenario | Required visible proof |
|---|---|---|
| Interrupted draft | Interrupt after a completed step, reload or resume with the synthetic draft ID, and preserve the pinned policy version. | Saved time, restored answers, current step, no duplicate draft and no lost work. |
| Invalid or unclear document | Select a bundled fixture with a known format, size, framing, legibility or required-field defect. | Preflight or scrutiny reason identifies the defect, preserves the prior version and offers a safe replacement action. |
| Payment pending or ambiguous | Return a local mock result where the payment attempt exists but confirmation is delayed or contradictory. | Applicant sees `PENDING` or `RECONCILIATION REQUIRED`, verifies rather than paying again, and reaches a deterministic resolved state without duplicate charge. |
| Re-upload requested | A conceptual reviewer requests one replacement with a controlled reason. | Notification and status agree, the corrected bundled fixture becomes a new version, and review resumes with history intact. |
| Status/next-action confusion | Enter a synthetic case through the wrong recovery entry point or with an unfamiliar state label. | One authoritative timeline explains the state, identifier, next safe action, unavailable actions and recovery route in plain language. |

These cases are acceptance requirements for the eventual selected scenario, not optional extras.

## 7. AI opportunity comparison

AI remains optional and advisory. The deterministic baseline must complete every core task when AI is absent, slow, unavailable or rejected. No row below selects an AI capability.

| Existing AI candidate | Deterministic baseline | Tourist opportunity | Medical/Ayush opportunity | Business/Production opportunity | Status |
|---|---|---|---|---|---|
| Applicant-intent to visa-purpose assistance | Structured guided questions evaluate versioned purpose rules, show reasons and require applicant confirmation. | Interpret varied synthetic descriptions of leisure intent before deterministic confirmation. | Clarify synthetic treatment intent and medical-versus-Ayush wording without interpreting health or deciding eligibility. | Clarify varied commercial intent across granular business purposes without inventing a purpose or clearance. | `UNDER EVALUATION` |
| Grounded policy explanation and simplification | Controlled templates render policy results, reason codes, provenance and effective context. | Rephrase arrival, document and condition explanations while preserving the deterministic result. | Explain hospital-letter, date and condition rules in plain language without changing their meaning. | Explain dense sponsor, purpose and mock-dependency rules while citing the pinned fixture. | `UNDER EVALUATION` |
| Multilingual assistance | Reviewed translations and controlled terminology cover the bounded selected journey. | Handle varied leisure phrasing beyond fixed translated content. | Explain sensitive instructions consistently without inviting real health disclosure. | Clarify specialized business terminology while preserving defined terms. | `UNDER EVALUATION` |
| Document and photograph readiness assistance | Deterministic preflight checks fixture identity, type, size, dimensions, aspect ratio, watermark and required metadata. | Advisory feedback might identify portrait framing or legibility issues beyond thresholds. | Advisory feedback might identify an unclear synthetic hospital-letter field, never medical validity or identity. | Advisory feedback might identify presentation issues in synthetic invitation/sponsor evidence, never authenticity or clearance. | `UNDER EVALUATION` |
| Reviewer case summarization | Structured fields, policy reasons, document versions and a sortable synthetic event timeline. | Summarize the simple case with direct links to each source field. | Summarize minimal synthetic facts and unresolved evidence without recommendation or medical inference. | Summarize purpose, sponsor evidence and mock dependency state without implying adjudicative advice. | `UNDER EVALUATION` |
| Applicant status/support assistance | Deterministic state-to-message mappings provide approved meaning, next action and recovery. | Rephrase draft, payment, re-upload and ETA guidance conversationally. | Explain the same authoritative state with urgency-aware wording but no timing or grant prediction. | Explain mock dependency, payment and re-upload states without inventing clearance status. | `UNDER EVALUATION` |

For every candidate, any possible AI output must be evaluated on the same synthetic scenarios as its deterministic baseline, validated against authoritative policy/state, communicate uncertainty and fail safely back to the baseline. None may determine eligibility, requirements, fees, payment, scrutiny, visa, ETA, biometric, admissibility or border outcomes.

## 8. Scope and safety risks

| Risk | Scenario exposure | Required control or deliberate limit |
|---|---|---|
| Real or realistic applicant data | All | Use only deterministic, obviously fictitious fixtures and reserved identifiers; public demo accepts no persisted arbitrary upload. |
| Sensitive health disclosure | Medical/Ayush | Use a pre-authored minimal fictional treatment fixture; provide no free-text health intake and never infer health status. |
| Invented patient-attendant linkage | Medical/Ayush | Treat the attendant as a related sub-persona with separate guidance; do not claim linked applications, shared decisions or private case relationships. |
| Invented sponsor or clearance workflow | Business/Production | Use one local predeclared dependency state with no real endpoint, payload, role, sequence or timing claim. |
| Unsourced or stale policy | All | Pin a small versioned policy fixture with provenance, effective context and visible non-authoritative demo labeling. |
| Real-nationality implication or bias | All | Use a neutral synthetic policy cohort in fixtures; any later country example must be sourced context and separately reviewed. |
| Document or photograph misuse | All | Use only bundled project-created fixtures with required watermarks; no real faces, passports, hospital letters or business records. |
| Payment or ETA mistaken for real | All | Use scenario-only payment references and visibly unofficial ETA artifacts; no card values, payment credentials, seals, barcodes or travel-valid output. |
| Private reviewer workflow presented as fact | All | Limit the workbench to conceptual case state, evidence versions, sourced policy results and synthetic actions; label inference and unknowns. |
| Scope explosion | Medical/Ayush and Business/Production | Build only one approved primary journey plus one bounded secondary validation path; keep other branches as policy fixtures or paper tests. |
| AI authority, hallucination or data exposure | All | Keep all candidates `UNDER EVALUATION`, advisory, synthetic-only, deterministically validated and optional with safe fallback. |
| Accessibility, mobile or connectivity failure | All | Require mobile-first, semantic, keyboard-operable flows, plain language, visible save state, retry without loss and equivalent recovery. |

## 9. Approved selection

### Primary golden path

**Approved primary golden path:** `SYN-MEDICAL-001`, a first-time e-Medical patient journey with the attendant as a related sub-persona.

It has the highest weighted score, `87/100`, driven by human consequence, strong official evidence, policy/document richness, a clear re-upload story and strong differentiation. The approved main path uses the e-Medical treatment fixture; Ayush remains a documented comparison branch rather than a second golden path. Synthetic-health boundaries and the prohibition on invented patient-attendant linkage are acceptance gates.

### Secondary validation scenario

**Approved secondary validation scenario:** `SYN-TOURIST-001`, a first-time e-Tourist applicant.

Although e-Business/Production Investment scores three points higher overall, the purpose of the secondary scenario is not to duplicate the richest primary path. Tourist provides a more recognizable, safer and simpler test that the same policy, save/resume, document, payment, scrutiny, recovery, status and ETA architecture generalizes beyond a sensitive medical case. This is an explicit judgment informed by—not mechanically dictated by—the totals.

### Business/Production Investment treatment and deliberate exclusions

- e-Business/Production Investment remains a policy stress test, not an initial full journey, because its sponsor and external-clearance dependencies add scope and private-workflow ambiguity already represented sufficiently by the medical primary.
- Ayush is not a second golden path; it remains a policy-branch comparison unless later scope is explicitly approved.
- The attendant is not a linked application or co-decision workflow; it remains a related sub-persona.
- No exhaustive nationality, category, port, fee, document, duration or exception coverage is proposed.
- No real payment, notification, document inspection, government clearance, APIS, biometric, border or IVFRT integration is included.
- No real reviewer queue, risk screening, adjudication logic, medical judgment or production policy-authoring workflow is reproduced.
- No AI capability, model, provider, technology stack or implementation approach is selected.

The overall policy and lifecycle architecture remains category-agnostic. Versioned policy evaluation, application/document/payment/scrutiny/ETA lifecycles, recovery behavior and mock-adapter boundaries are reusable across visa categories; the approved scenario bounds the initial fixture and demonstration story, not the architecture.

The user explicitly approved Medical primary and Tourist secondary. This approval establishes the Phase 1 Step 3 scenario selection subject to all recorded scores, recovery requirements, safety boundaries and exclusions.

## 10. Approved decision record

- **Primary golden path:** `SYN-MEDICAL-001` using the e-Medical treatment fixture.
- **Medical attendant:** Related sub-persona without invented linked-case architecture, shared decision state or coupled payment.
- **Secondary validation:** `SYN-TOURIST-001`.
- **Business/Production Investment:** Policy stress test rather than an initial full journey.
- **Architecture:** Category-agnostic policy, lifecycle, recovery and integration boundaries.
- **Recovery:** All five mandatory recovery cases remain required regardless of category.
- **AI:** All six candidates remain `UNDER EVALUATION`; AI did not determine the ranking.
- **Deferred choices:** No AI capability, model, provider, technology stack, real nationality, private workflow or implementation is selected.

`PLANS.md` records Phase 1 Step 3 as `COMPLETE`, with the approval and accepted decision `D-008` as evidence. Phase 1 Step 4 remains `NOT STARTED`.
