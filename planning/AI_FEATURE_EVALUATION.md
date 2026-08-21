# AI Feature Evaluation Framework

## 1. Purpose and authority

This framework governs whether any AI-assisted capability should be included in the proof of concept. It implements accepted decision `D-007` in [`DECISIONS.md`](DECISIONS.md) and must be applied with `AGENTS.md`, [`PROJECT_CHARTER.md`](PROJECT_CHARTER.md), [`SYNTHETIC_DATA_AND_INTEGRATION_BOUNDARIES.md`](SYNTHETIC_DATA_AND_INTEGRATION_BOUNDARIES.md) and the authoritative [`docs/evisa-system-dissection.md`](../docs/evisa-system-dissection.md).

Evaluation is not authorization to build or deploy an AI capability. No AI feature, model, provider, external service, technology stack or implementation approach is selected by this document.

## 2. AI only when necessary

AI is optional and must earn its place. It may be considered only when it materially improves a defined user or institutional outcome beyond a deterministic approach.

The burden of proof rests with the AI proposal. Novelty, conversational presentation or perceived sophistication is not sufficient. If an AI approach cannot demonstrate a meaningful advantage after accounting for risk, reliability, latency, cost, accessibility and fallback behavior, the deterministic approach remains the product choice.

AI output is advisory. Wherever an AI output could affect policy interpretation or application data, the authoritative value must come from versioned policy data, explicit lifecycle state and deterministic validation.

## 3. Mandatory evaluation gates

Every candidate must pass all gates before it can be proposed for selection:

1. **Outcome gate:** Identify the target user, specific problem, intended outcome and measurable evidence of improvement.
2. **Deterministic-baseline gate:** Define and evaluate a non-AI solution capable of completing the same core task safely.
3. **Necessity gate:** Demonstrate a material advantage over the baseline under the same representative synthetic scenarios.
4. **Authority gate:** Prove that the capability is advisory and cannot make or override a prohibited authoritative decision.
5. **Grounding and validation gate:** Identify the allowed source material and deterministic checks that reject unsupported, stale, malformed or policy-inconsistent output.
6. **Data and privacy gate:** Use only the minimum synthetic fixture data allowed by the project’s synthetic-data specification; real applicant data and arbitrary public-demo uploads remain prohibited.
7. **Reliability and uncertainty gate:** Define expected failure modes, uncertainty communication, refusal behavior, consistency checks and safe recovery.
8. **Accessibility and equity gate:** Demonstrate an equivalent accessible non-AI path and evaluate language, disability, literacy and bias-related harms.
9. **Operational gate:** Measure whether latency, availability and cost are proportionate to the demonstrated benefit and do not block the core journey.
10. **Evaluation gate:** Define representative scenarios, quality and safety measures, acceptance thresholds and regression evidence before approval. Numeric targets are not selected in this framework.
11. **Approval gate:** Record a separate accepted decision before selecting or implementing an AI feature, model, provider or external integration in the appropriate later phase.

Failure of any gate means the candidate remains unselected, is deferred or is rejected. It must not be introduced informally through another feature.

## 4. Deterministic baseline and comparison

Every AI candidate requires a deterministic baseline that:

- Serves the same defined user or institutional outcome.
- Uses versioned policy data, explicit states, controlled content and ordinary validation where relevant.
- Is safe, accessible and usable without AI availability.
- Is evaluated with the same synthetic scenarios and outcome measures as the AI candidate.
- Remains available as the operational fallback if an AI-assisted version is later approved.
- Does not depend on an AI output to recover, explain authoritative state or complete the core workflow.

Comparison must consider correctness, comprehension, task completion, harmful or unsupported output, reliability, latency, cost, accessibility and user confidence. A candidate must not proceed when its benefit is marginal, unmeasurable or outweighed by these costs and risks. Candidate-specific numeric targets and acceptance thresholds are deferred to the appropriate later Phase 1 steps.

## 5. Prohibited AI responsibilities

AI must never make, approve, reject, override or present itself as the authority for:

- Eligibility.
- Fees.
- Visa duration, validity, entries or conditions.
- Document requirements.
- Payment state, reconciliation or financial outcome.
- Visa scrutiny, grant, rejection, revocation or ETA issuance.
- Biometric capture, quality, matching or identity.
- Admissibility.
- Border decisions.

AI must also never:

- Create or silently change policy or lifecycle state.
- Persist changes to application data without deterministic schema and policy validation and an explicit authorized action.
- Claim knowledge of private IVFRT or other government architecture.
- Process real applicant, document, photograph, payment, health, declaration, biometric or travel data in the proof of concept.
- Contact or fall back to a live government, payment, APIS, biometric, border, IVFRT or unapproved model service.

## 6. Cross-cutting requirements

### Privacy and data boundaries

- Use synthetic-only, data-minimized fixtures.
- Apply the project’s fixture provenance, retention, reset, watermark and privacy-safe logging rules.
- Do not send complete document content, images, declarations, applicant records or unnecessary fields to an AI boundary.
- The public demo must not persist arbitrary user-supplied files.
- No external model or provider may receive data unless a later accepted decision and explicit authorization establish that boundary.

### Reliability and validation

- Ground output in approved, versioned sources and retain enough provenance to identify those sources.
- Validate structured or consequential output deterministically before it can affect application data or displayed policy results.
- Detect unsupported output and fail closed to the deterministic baseline.
- Communicate uncertainty and limitations without implying official authority.
- Test malformed, contradictory, unavailable, inconsistent and confidently incorrect output.

### Latency and availability

- Define a response-time budget appropriate to the user task before approval.
- Do not make the core journey depend on AI availability.
- Timeouts and outages must return the user to the deterministic path without lost work or ambiguous state.
- Measure degraded and unavailable scenarios as part of evaluation.

### Cost

- Estimate and measure cost per completed user task, not merely per request.
- Include retries, validation, monitoring, evaluation and fallback operations.
- Reject an AI approach whose total cost is disproportionate to its measured benefit.
- Do not select a commercial provider or pricing model in this phase.

### Accessibility and inclusion

- Preserve an understandable, operable non-AI path.
- Do not rely on AI output as the only source of instructions, errors or next actions.
- Make AI involvement and uncertainty perceivable without relying on color alone.
- Test assistive-technology use, plain-language comprehension and multilingual consistency.
- Provide accessible correction, retry and fallback controls.

### Fallback and recovery

- Every capability must define a safe fallback before approval.
- Fallback must use the deterministic baseline and authoritative project state.
- AI failure must not erase data, advance lifecycle state, weaken validation or trigger a live-system call.
- The interface must explain what remains available and the user’s next safe action.

## 7. Candidate register

All candidates remain `UNDER EVALUATION`. Their inclusion, implementation and priority are undecided.

| Candidate | User problem | Deterministic baseline | Possible AI advantage | Principal risks | Current status |
|---|---|---|---|---|---|
| Applicant-intent to visa-purpose assistance | Applicants struggle to map ordinary travel intent to a large, granular purpose taxonomy. | A structured guided interview uses versioned purpose and eligibility data to narrow choices, explain differences and require applicant confirmation. | Advisory interpretation of varied synthetic free-text intent could suggest relevant purposes or clarifying questions before deterministic policy evaluation. | Misclassification, invented purposes, omitted constraints, language bias, false confidence and the appearance of an eligibility decision. | `UNDER EVALUATION` |
| Grounded policy explanation and simplification | Dense, changing and duplicated rules make eligibility, requirements, dates, fees and conditions difficult to understand. | Controlled templates turn versioned policy results and reason codes into sourced explanations at defined reading levels. | Grounded assistance could rephrase or answer contextual questions while preserving citations to the policy version and deterministic result. | Hallucinated or stale rules, omitted exceptions, changed legal meaning, unsupported certainty and inconsistency between answers. | `UNDER EVALUATION` |
| Multilingual assistance | English-only or complex terminology can block comprehension and error recovery. | Reviewed translations, controlled terminology and locale-specific content cover the selected proof-of-concept journey. | Advisory language assistance could broaden conversational clarification and accommodate varied phrasing beyond fixed content. | Mistranslated policy or declarations, dialect and literacy bias, inconsistent terminology, inaccessible output and disclosure to an external service. | `UNDER EVALUATION` |
| Document and photograph readiness assistance | Applicants may not understand whether a file meets technical and presentation requirements before scrutiny. | Deterministic preflight checks file type, size, dimensions, aspect ratio, fixture identity and required synthetic watermark, supported by a clear checklist. | Advisory analysis of bundled synthetic fixtures might identify legibility, framing, lighting or presentation problems that simple thresholds miss. | False pass/fail results, treatment as identity or biometric verification, image-data exposure, bias, inaccessible feedback and conflict with authoritative scrutiny. | `UNDER EVALUATION` |
| Reviewer case summarization | Institutional users may need to understand a long synthetic case, its state history, evidence and unresolved actions quickly. | A structured view assembles explicit fields, state transitions, policy reasons, document versions and a sortable event timeline. | An advisory narrative could synthesize relevant synthetic facts for a defined review question while linking every statement to source fields. | Omission, fabrication, decision anchoring, hidden contradictions, sensitive-data expansion and summaries being mistaken for adjudication recommendations. | `UNDER EVALUATION` |
| Applicant status/support assistance | Fragmented states and technical language make it difficult to understand current status, next action and recovery options. | An explicit state-to-message map provides approved explanations, next actions and recovery paths from the authoritative lifecycle state. | Advisory conversational assistance could explain the same state in context, rephrase guidance and answer supported follow-up questions. | Invented status or timing, contradiction of authoritative state, unsupported legal or travel advice, exposure of case data and overreliance during outages. | `UNDER EVALUATION` |

## 8. Current decision boundary

The register identifies areas for comparison only. None of the six candidates is selected or approved for implementation.

Any later proposal must present its completed gate evidence, deterministic baseline, measurable advantage, risks and fallback for review. Selecting an AI feature, model, provider, external service or production integration requires a separate accepted decision in the appropriate technical phase. Until then, any AI/model boundary remains mock-only, synthetic-only and fail-closed.
