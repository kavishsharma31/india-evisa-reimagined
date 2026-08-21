# Target Users and Problems — Revised Draft for User Review

> **Status:** Phase 1 Step 2 remains `IN PROGRESS`. This revision creates separate taxonomies and rankings for compatible candidate types. It identifies Step 3 finalists for comparison, but it does not select a visa category, golden path, AI candidate, technology stack or implementation.

This draft uses [`docs/evisa-system-dissection.md`](../docs/evisa-system-dissection.md) as its evidence base. It addresses the public orchestration layer only and preserves the project’s unofficial, synthetic-only and mock-only boundaries.

## 1. Evidence method and decision guardrails

Important claims use these labels:

- `OBSERVED` — directly visible in the public application, delivered browser code or public request/response documented in the dissection.
- `OFFICIAL` — stated in cited Government of India material.
- `INFERRED` — the smallest conclusion consistent with observed or official behavior, but not publicly confirmed.
- `ASSUMPTION` — a project hypothesis, estimate or prioritization judgment requiring validation.

Section references such as “§13” refer to the system dissection. Missing volumes, outcomes and private workflows are recorded as evidence gaps, never presented as facts.

The rankings use these guardrails:

- Only compatible candidates are ranked together. Applicant, institutional, journey/recovery, applicant-problem and structural-cause totals must not be compared across matrices.
- Every criterion receives an ordinal score from 1 to 5, and every score is explained.
- All eight criteria are equally weighted in this draft. The total is a navigation aid out of 40.
- `Confidence` is separate from the total: `HIGH` means the core claim has repeated direct or official support; `MEDIUM` means the mechanism is supported but important reach, outcome or persona claims remain unvalidated; `LOW` means the core work or benefit depends materially on inference about private operations.
- A high total based mostly on `INFERRED` or `ASSUMPTION` evidence cannot outrank stronger applicant evidence merely because it has high demonstrability or institutional-leverage scores.
- Totals support—not replace—judgment. Confidence, consequence, evidence gaps, safety and the provisional product orientation must be reviewed with each total.
- Ties remain ties; a one-point difference is not meaningful precision.
- Non-negotiable design constraints are not ranked and cannot be traded away by a score.

No live service was accessed or tested, and no real applicant or institutional data was used.

## 2. Working taxonomy

| Class | Defining question | Included candidates | Ranking treatment |
|---|---|---|---|
| Applicant segments | Who experiences the applicant service? | First-time tourist; Medical/Ayush patient with attendant as a related sub-persona; business or production-investment traveller; student or dependent; transit traveller | Ranked only against other applicant segments. |
| Cross-cutting contexts | Under what circumstances is an applicant using the service? | Device, language and comprehension, connectivity, accessibility, digital confidence and urgency | Described as contexts; not treated as personas or ranked priorities. |
| Journey/recovery states | What cross-category condition is the applicant trying to recover from? | Draft resume, payment ambiguity, scrutiny re-upload and status/next-action resolution | Ranked only against other recovery states and required independently of Step 3’s category choice. |
| Institutional users | Who may operate or govern the conceptual service? | Policy/content administrator, support/operations staff and scrutiny reviewer | Ranked separately with lower confidence where real private workflows are unknown. |
| Evaluation audience | Who judges the proof of concept rather than operating the service? | Government/hackathon stakeholder | Described separately and excluded from user rankings. |
| Applicant-facing problems | What difficulty does the applicant directly experience? | Purpose confusion, irrelevant questioning, lost work, document readiness, payment uncertainty, fragmented recovery/status and unclear next actions | Ranked only against other applicant-facing problems. |
| Structural root causes | What system condition produces or amplifies multiple surface problems? | Duplicated policy, contradictory content, hard-coded rules and fragmented lifecycle state | Ranked only against other structural causes. |
| Non-negotiable design constraints | What qualities must every candidate solution preserve? | Accessibility, mobile usability, language comprehension, privacy, security and unreliable-connectivity recovery | Not scored or ranked; each is mandatory. |

The same subject can appear in related classes without being conflated. For example, unreliable connectivity is an applicant context, while recovery without data loss under unreliable connectivity is a design constraint. Payment ambiguity is a journey state, while payment uncertainty is the applicant-facing problem it creates.

“Returning applicant resolving payment, re-upload or status issues” is therefore not an applicant segment. It is represented by the four cross-category journey/recovery states ranked in Section 7.3 of this draft.

## 3. Applicant segments

### 3.1 Candidate descriptions

| Applicant segment | Candidate jobs and evidence | Step 3 treatment |
|---|---|---|
| First-time tourist | Understand whether e-Visa applies, choose a purpose, prepare common evidence, save progress, pay and recognize the next state. `OBSERVED`: tourist purposes and the shared journey exist (§§6, 9). `ASSUMPTION`: first-time-user share, comprehension and failure rates are unknown. | **Finalist for Step 3 comparison; not selected.** |
| Medical/Ayush patient journey | Resolve purpose and date rules, prepare hospital evidence and recover safely from delay. The Medical/Ayush attendant is a related sub-persona whose needs include relationship-dependent guidance and coordinated travel, not a separately ranked primary segment. `OBSERVED`/`OFFICIAL`: medical/Ayush purposes and evidence are documented (§§8–10). | **Finalist for Step 3 comparison; not selected.** |
| Business or production-investment traveller | Map a specific commercial intent to a granular purpose, prepare invitation or sponsorship evidence and understand mocked clearance dependencies. `OBSERVED`/`OFFICIAL`: purpose variants, evidence and production-investment sponsorship are documented (§§9–10, 16). | **Finalist for Step 3 comparison; not selected.** |
| Student or dependent | Select an appropriate student or dependent purpose and prepare admission, support, NOC or relationship evidence. `OBSERVED`/`OFFICIAL`: relevant purposes and evidence are documented (§§9–10). | **Secondary comparator.** |
| Transit traveller | Understand whether transit applies and prepare onward-ticket and destination-authorization evidence. `OBSERVED`/`OFFICIAL`: transit requirements are documented (§§9–10). | **Secondary comparator.** |

The finalist designation is a product-judgment shortlist for Step 3, not the result of a mechanical total and not a final category decision.

### 3.2 Cross-cutting applicant contexts

| Context | Evidence-based relevance |
|---|---|
| Mobile-first use | `OBSERVED`: fixed-width controls and missing modern viewport metadata create small-screen risk (§§17, 21). `ASSUMPTION`: device share is unknown. |
| Unreliable connectivity | `OBSERVED`/`INFERRED`: full-page posts, uploads and an external payment return create lost-work and ambiguous-state exposure (§§6, 11, 17, 22). |
| Limited English or policy comprehension | `OBSERVED`: English-heavy policy and long domain-specific purpose labels are present (§§9, 21). Language and literacy distributions are unknown. |
| Low digital confidence | `OBSERVED`: multiple identifier tuples, CAPTCHA and separate recovery routes increase mental-model burden (§§5, 13, 17, 24). Prevalence is unknown. |
| Time-sensitive travel | `OFFICIAL`/`OBSERVED`: processing, delayed payment recognition and re-upload timing can affect travel (§§6.11, 11–12, 22). |
| Accessibility needs | `OBSERVED`: modal gates, CAPTCHA, JavaScript-only requiredness, fixed controls and navigation restrictions create accessibility risks (§§17, 21). No formal WCAG audit is available. |

## 4. Institutional users and evaluation audience

### 4.1 Institutional users

| Institutional user | Candidate jobs and boundary |
|---|---|
| Policy/content administrator | Author, review, version, test, publish and roll back policy/content with provenance and effective periods. `OBSERVED`: policy duplication and public drift exist (§§8, 23). `INFERRED`: a governed authoring role is needed. The real private authoring process is not known (§25). |
| Support/operations staff | Reconcile synthetic application, document, payment, notification and ETA state; explain the next safe action; identify failures from privacy-safe logs. `OBSERVED`: public help channels and fragmented recovery surfaces exist (§§4–5, 13). `INFERRED`: equivalent internal reconciliation work is necessary. |
| Scrutiny reviewer | Understand a synthetic case, inspect evidence versions, request replacement and record a simulated action with an auditable history. `OFFICIAL`: scrutiny and re-upload outcomes exist (§12). `INFERRED`: the conceptual capabilities follow from those outcomes. The actual roles, queues, interface and adjudication workflow remain unknown (§§12, 25). |

Reviewer and support functionality may demonstrate end-to-end feasibility, but it must remain deliberately limited and conceptual because the real private workflows are unknown.

### 4.2 Evaluation audience

The **government/hackathon stakeholder** is the proof-of-concept evaluation audience, not an applicant segment or operating user to rank. This audience judges applicant value, institutional leverage, evidence quality, safety boundaries and whether later authorized discovery is warranted.

`OFFICIAL`: the dissection connects the public service to IVFRT modernization and defines a proof-of-concept boundary (§§15, 26, 28). `ASSUMPTION`: the evaluator composition, criteria and decision process require confirmation. The prototype must never imply that it reproduces IVFRT’s private backend.

## 5. Jobs-to-be-done

### Applicant jobs

- `OBSERVED`: determine an applicable purpose, requirements, dates, fees, ports and conditions before investing in an application (§§6.1, 8–9).
- `OBSERVED`/`OFFICIAL`: answer only applicable questions and prepare a compliant photograph and purpose-dependent evidence (§§6, 10).
- `OBSERVED`/`INFERRED`: save and resume without lost work or uncertainty about what persisted (§§5–6, 13, 17, 22).
- `OFFICIAL`: pay once, recognize pending or ambiguous payment, verify the result and avoid unsafe retry (§11).
- `OBSERVED`/`OFFICIAL`: respond to scrutiny, re-upload evidence, track case and ETA state and understand the next safe action (§§6.11–6.12, 13–14).
- `OFFICIAL`: understand that ETA does not itself guarantee final admissibility (§§6.13, 15).

### Institutional jobs

- `INFERRED`: apply one versioned policy source consistently across guidance, validation, requirements and explanations (§§8, 23, 26–27).
- `INFERRED`: diagnose synthetic draft, payment, notification, re-upload and status failures from one privacy-safe timeline (§§11, 13–14, 27).
- `OFFICIAL`/`INFERRED`: scrutinize synthetic evidence and record simulated actions with explicit state and audit history (§§12, 14, 27).
- `INFERRED`: change policy with provenance, effective periods, simulation, approval and rollback (§§8, 20, 23).

## 6. Scoring criteria

| Code | Criterion | Score interpretation |
|---|---|---|
| `H` | Human consequence/severity | `1` means limited inconvenience; `5` means potentially severe financial, health, travel, rights or case-outcome consequences. |
| `R` | Reach or likely frequency | `1` means narrow or rare exposure; `5` means broad or recurrent exposure. Unsupported volume judgments are labeled `ASSUMPTION`. |
| `E` | Strength of evidence | `1` means mostly unsupported; `5` means repeated direct `OBSERVED` or `OFFICIAL` support. |
| `X` | Representativeness across visa categories | `1` means highly category-specific; `5` means shared across categories or a reusable system primitive. |
| `D` | Hackathon demonstrability | `1` means difficult to show credibly; `5` means clear synthetic end-to-end demonstration. |
| `I` | Institutional leverage | `1` means local benefit; `5` means leverage across policy, review, support, audit or multiple surfaces. |
| `C` | Differentiation from cosmetic redesign | `1` means mostly presentation; `5` means policy, state, recovery or institutional orchestration. |
| `S` | Safety and proof-of-concept feasibility | `1` means dependent on unsafe/private/live behavior; `5` means bounded synthetic and mock-only demonstration. |

## 7. Ranked matrices

### 7.1 Applicant segments

| Rank | Applicant segment | H | R | E | X | D | I | C | S | Total | Confidence | Step 3 treatment |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| 1= | First-time tourist | 4 | 4 | 4 | 5 | 5 | 3 | 4 | 5 | **34** | `MEDIUM` | Finalist |
| 1= | Medical/Ayush patient journey, with attendant sub-persona | 5 | 3 | 5 | 4 | 5 | 4 | 5 | 3 | **34** | `MEDIUM` | Finalist |
| 1= | Business or production-investment traveller | 4 | 3 | 5 | 5 | 4 | 4 | 5 | 4 | **34** | `MEDIUM` | Finalist |
| 4 | Student or dependent | 4 | 2 | 5 | 4 | 4 | 3 | 5 | 4 | **31** | `MEDIUM` | Secondary comparator |
| 5 | Transit traveller | 4 | 2 | 4 | 3 | 4 | 2 | 3 | 5 | **27** | `LOW` | Secondary comparator |

Score explanations:

- **Business or production-investment traveller:** `H 4` — `INFERRED`: errors can disrupt consequential commercial travel, though severity varies; `R 3` — `ASSUMPTION`: many business purposes exist but volume is unknown; `E 5` — `OBSERVED`/`OFFICIAL`: variants, documents and sponsorship are documented (§§9–10, 16); `X 5` — `INFERRED`: it exercises purpose, policy, evidence, mocked clearance and shared lifecycles; `D 4` — `INFERRED`: a bounded public-layer scenario is demonstrable, but private sponsor and clearance behavior limits fidelity; `I 4` — `INFERRED`: the journey may touch several institutions, but their real coordination is unknown; `C 5` — `INFERRED`: it exposes orchestration beyond visual changes; `S 4` — `ASSUMPTION`: safely mockable if no real clearance contract is implied.
- **First-time tourist:** `H 4` — `INFERRED`: errors can jeopardize planned travel; `R 4` — `ASSUMPTION`: tourism is prominent but category volume is unknown; `E 4` — `OBSERVED`: tourist purposes and the shared journey exist, while first-time behavior is unstudied (§§6, 9); `X 5` — `INFERRED`: the segment can exercise the shared end-to-end journey; `D 5` — `ASSUMPTION`: it is legible to a hackathon audience; `I 3` — `INFERRED`: it has fewer specialist dependencies; `C 4` — `INFERRED`: adaptation and recovery exceed restyling but could be presented superficially; `S 5` — `ASSUMPTION`: fictional tourist fixtures are straightforward.
- **Medical/Ayush patient journey:** `H 5` — `INFERRED`: delay can affect time-sensitive treatment and attendant travel; `R 3` — `ASSUMPTION`: no volume data exists; `E 5` — `OBSERVED`/`OFFICIAL`: purposes, nationality behavior and hospital evidence are documented (§§8–10); `X 4` — `INFERRED`: it represents adaptive policy and evidence but has specialized health context; `D 5` — `ASSUMPTION`: a fictional treatment journey is demonstrable; `I 4` — `INFERRED`: it links applicant, attendant, hospital evidence and review; `C 5` — `INFERRED`: conditional requirements show systemic value; `S 3` — `OFFICIAL`/`ASSUMPTION`: it requires especially strict synthetic-health-data controls.
- **Student or dependent:** `H 4` — `INFERRED`: errors can disrupt admission or family travel; `R 2` — `ASSUMPTION`: frequency is unknown and treated conservatively; `E 5` — `OBSERVED`/`OFFICIAL`: admission, support, NOC and relationship evidence are documented (§§9–10); `X 4` — `INFERRED`: it exercises relationships and document variants but is specialized; `D 4` — `ASSUMPTION`: an adaptive flow is demonstrable but less broadly legible; `I 3` — `INFERRED`: institutional leverage is narrower; `C 5` — `INFERRED`: relationship-aware policy shows more than form styling; `S 4` — `ASSUMPTION`: synthetic admission and relationship fixtures need careful controls.
- **Transit traveller:** `H 4` — `INFERRED`: an error can invalidate onward plans; `R 2` — `ASSUMPTION`: it appears narrower and volume is unknown; `E 4` — `OBSERVED`/`OFFICIAL`: purpose and evidence exist but friction evidence is sparse (§§9–10); `X 3` — `INFERRED`: it exercises fewer extended workflows; `D 4` — `ASSUMPTION`: it offers a compact but less rich scenario; `I 2` — `INFERRED`: institutional reach is comparatively narrow; `C 3` — `INFERRED`: without exceptions it may resemble a streamlined form; `S 5` — `ASSUMPTION`: fictional itinerary fixtures are safely bounded.

The first four confidence ratings are `MEDIUM` because public categories and requirements are well evidenced while reach, behavior and outcomes are not. Transit is `LOW` confidence because its prioritization depends heavily on unmeasured frequency, friction and urgency.

### 7.2 Institutional users

| Rank | Institutional user | H | R | E | X | D | I | C | S | Total | Confidence |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | Policy/content administrator | 5 | 4 | 4 | 5 | 5 | 5 | 5 | 5 | **38** | `MEDIUM` |
| 2 | Scrutiny reviewer | 5 | 4 | 3 | 5 | 4 | 5 | 5 | 3 | **34** | `LOW` |
| 3 | Support/operations staff | 4 | 3 | 3 | 5 | 4 | 5 | 5 | 4 | **33** | `LOW` |

Score explanations:

- **Policy/content administrator:** `H 5` — `OBSERVED`/`INFERRED`: a defective rule can affect whole categories (§§20, 23); `R 4` — `ASSUMPTION`: changes recur but frequency is unknown; `E 4` — `OBSERVED`: drift is direct, while the role and workflow are inferred; `X 5` — `OBSERVED`: policy spans categories; `D 5` — `INFERRED`: versioning and rollback are clearly demonstrable; `I 5` — `INFERRED`: one change can improve many surfaces; `C 5` — `OBSERVED`/`INFERRED`: governance addresses a systemic cause; `S 5` — `ASSUMPTION`: a bounded synthetic policy set is safe.
- **Scrutiny reviewer:** `H 5` — `OFFICIAL`/`INFERRED`: scrutiny affects consequential case outcomes; `R 4` — `OFFICIAL`/`ASSUMPTION`: submitted cases enter scrutiny, but task frequency and complexity are unknown (§12); `E 3` — `OFFICIAL`/`INFERRED`: scrutiny outcomes exist, while the real interface, workload and cognitive burden are unknown (§§12, 25); `X 5` — `INFERRED`: conceptual review capabilities span categories; `D 4` — `INFERRED`: a conceptual workbench is demonstrable but fidelity is limited; `I 5` — `INFERRED`: validated improvements could affect quality and audit; `C 5` — `INFERRED`: a case workbench extends beyond applicant-page styling; `S 3` — `ASSUMPTION`: synthetic review is safe only with deliberately limited fidelity and no implied adjudication logic.
- **Support/operations staff:** `H 4` — `OBSERVED`/`INFERRED`: unresolved payments and recovery can create urgent harm; `R 3` — `ASSUMPTION`: issues cross categories but contact and task volume are unknown; `E 3` — `OBSERVED`/`INFERRED`: public help and failure surfaces exist, but internal work is unknown (§§4–5, 13, 25); `X 5` — `INFERRED`: reconciliation spans shared lifecycle states; `D 4` — `INFERRED`: a limited synthetic operations timeline is demonstrable, but real repair procedures are unknown; `I 5` — `INFERRED`: recovery could reduce repeated effort; `C 5` — `INFERRED`: operational recovery is structural; `S 4` — `ASSUMPTION`: mock cases are feasible, but access and workflow fidelity must remain conceptual.

These totals cannot be compared with applicant totals. The `LOW` confidence on support and review prevents their inference-heavy leverage scores from displacing stronger applicant evidence.

### 7.3 Journey/recovery states

| Rank | Journey/recovery state | H | R | E | X | D | I | C | S | Total | Confidence |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1= | Payment ambiguity and reconciliation | 5 | 3 | 5 | 5 | 5 | 5 | 5 | 5 | **38** | `HIGH` |
| 1= | Status and next-action resolution | 4 | 4 | 5 | 5 | 5 | 5 | 5 | 5 | **38** | `HIGH` |
| 3 | Scrutiny re-upload recovery | 4 | 3 | 5 | 5 | 5 | 4 | 5 | 5 | **36** | `MEDIUM` |
| 4 | Draft resume and lost-work recovery | 4 | 4 | 4 | 5 | 5 | 4 | 4 | 5 | **35** | `MEDIUM` |

Score explanations:

- **Payment ambiguity and reconciliation:** `H 5` — `OFFICIAL`/`INFERRED`: deducted funds, repeat-payment risk and forced reapplication can cause severe harm (§11); `R 3` — `ASSUMPTION`: failures affect a subset and frequency is unknown; `E 5` — `OFFICIAL`/`OBSERVED`: handoff, delay, verification, receipt and reconciliation are documented; `X 5` — `OBSERVED`: payment is cross-category; `D 5` — `INFERRED`: pending and reconciled scenarios are clear; `I 5` — `INFERRED`: explicit state can reduce duplicate payment and repair effort; `C 5` — `OBSERVED`: this is a distributed-state problem; `S 5` — `INFERRED`: mock scenarios require no real credentials.
- **Status and next-action resolution:** `H 4` — `INFERRED`: unclear state can cause missed actions and travel uncertainty; `R 4` — `ASSUMPTION`: every case has status but recovery frequency is unknown; `E 5` — `OBSERVED`: separate status, print and recovery routes are documented (§§5, 13); `X 5` — `OBSERVED`: application, document, scrutiny, payment and ETA states cross categories; `D 5` — `INFERRED`: a unified timeline is demonstrable; `I 5` — `INFERRED`: shared visibility supports applicants and operations; `C 5` — `OBSERVED`: lifecycle fragmentation is structural; `S 5` — `INFERRED`: explicit synthetic state is safely mockable.
- **Scrutiny re-upload recovery:** `H 4` — `OFFICIAL`/`INFERRED`: missed replacement can delay or end a case; `R 3` — `ASSUMPTION`: re-upload volume is unknown; `E 5` — `OFFICIAL`/`OBSERVED`: re-upload and its public route are documented (§§6.11–6.12, 12–13); `X 5` — `INFERRED`: correction behavior applies across document-bearing categories; `D 5` — `INFERRED`: version replacement is a clear scenario; `I 4` — `INFERRED`: it may reduce review and support rework; `C 5` — `INFERRED`: explicit evidence versions go beyond styling; `S 5` — `INFERRED`: bundled synthetic fixtures are safe.
- **Draft resume and lost-work recovery:** `H 4` — `INFERRED`: loss of a long sensitive form can drive abandonment; `R 4` — `ASSUMPTION`: exposure is broad but failure frequency is unknown; `E 4` — `OBSERVED`/`INFERRED`: temporary-ID resume and full-page posts exist, while anxiety is inferred (§§5–6, 13, 17); `X 5` — `OBSERVED`: the draft journey is shared; `D 5` — `INFERRED`: interruption and resume are demonstrable; `I 4` — `INFERRED`: durable drafts can reduce re-entry and support; `C 4` — `INFERRED`: visible durable state is structural but can look like ordinary UX; `S 5` — `INFERRED`: synthetic draft state is locally testable.

All four recovery states must be considered regardless of which visa category Step 3 selects.

### 7.4 Applicant-facing problems

| Rank | Applicant-facing problem | H | R | E | X | D | I | C | S | Total | Confidence |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1= | Payment uncertainty | 5 | 3 | 5 | 5 | 5 | 5 | 5 | 5 | **38** | `HIGH` |
| 1= | Fragmented recovery/status | 4 | 4 | 5 | 5 | 5 | 5 | 5 | 5 | **38** | `HIGH` |
| 3= | Purpose confusion | 4 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | **37** | `MEDIUM` |
| 3= | Document readiness | 4 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | **37** | `HIGH` |
| 5 | Unclear next actions | 4 | 4 | 4 | 5 | 5 | 4 | 5 | 5 | **36** | `MEDIUM` |
| 6 | Lost work | 4 | 4 | 4 | 5 | 5 | 4 | 4 | 5 | **35** | `MEDIUM` |
| 7 | Irrelevant questioning | 3 | 4 | 3 | 5 | 5 | 4 | 5 | 5 | **34** | `MEDIUM` |

Score explanations:

- **Purpose confusion:** `H 4` — `INFERRED`: a wrong purpose can cause wrong requirements or delay; `R 5` — `OBSERVED`/`ASSUMPTION`: all applicants choose a purpose, while error frequency is unknown; `E 4` — `OBSERVED`/`INFERRED`: overlapping taxonomies and 67 visible versus 102 coded purposes are documented, but actual confusion is not measured (§§6.3, 8–9, 24); `X 5` — `OBSERVED`: the choice spans categories; `D 5` — `INFERRED`: deterministic guidance is demonstrable; `I 4` — `INFERRED`: clearer choices may reduce misrouting; `C 5` — `OBSERVED`: guided purpose resolution is central to the systemic thesis; `S 5` — `INFERRED`: versioned, explainable guidance is safely synthetic.
- **Payment uncertainty:** scores and evidence match the payment-ambiguity recovery state: `H 5` for potential financial and travel harm; `R 3` because failure frequency is an `ASSUMPTION`; `E 5` from direct official guidance (§11); `X 5` because payment is shared; `D 5` for a clear mock scenario; `I 5` for reconciliation leverage; `C 5` because the problem is transactional state; and `S 5` because no real gateway or credentials are needed.
- **Fragmented recovery/status:** `H 4` — `INFERRED`: fragmentation can cause missed actions and uncertainty; `R 4` — `ASSUMPTION`: all cases have state but recovery use is unknown; `E 5` — `OBSERVED`: separate routes and credentials are direct (§§5, 13); `X 5` — `OBSERVED`: lifecycle states cross categories; `D 5` — `INFERRED`: one timeline is demonstrable; `I 5` — `INFERRED`: shared visibility aids support and review; `C 5` — `OBSERVED`: the cause is lifecycle orchestration; `S 5` — `INFERRED`: explicit synthetic states are safe.
- **Document readiness:** `H 4` — `INFERRED`: poor preparation can delay or block completion; `R 5` — `OFFICIAL`/`OBSERVED`: every applicant supplies core media; `E 5` — `OFFICIAL`/`OBSERVED`: constraints, conflicting limits and re-upload are documented (§§6.8, 10–12, 22); `X 5` — `OBSERVED`: photo and passport evidence are universal; `D 5` — `INFERRED`: bundled fixture preflight is demonstrable; `I 4` — `INFERRED`: earlier feedback may reduce rework; `C 5` — `OBSERVED`: preflight and versions are workflow capabilities; `S 4` — `INFERRED`: safe fixtures are feasible but file controls remain necessary.
- **Unclear next actions:** `H 4` — `INFERRED`: unclear action can cause missed deadlines or unsafe retries; `R 4` — `ASSUMPTION`: many states need guidance but incidence is unknown; `E 4` — `OBSERVED`/`INFERRED`: routes and limited cross-state guidance are visible (§§13–14, 24); `X 5` — `INFERRED`: every lifecycle can expose a next action; `D 5` — `INFERRED`: state-to-action guidance is clear in a demo; `I 4` — `INFERRED`: it may reduce support ambiguity, but the effect is unmeasured; `C 5` — `INFERRED`: authoritative next action depends on state orchestration; `S 5` — `INFERRED`: deterministic maps and mock notices are safe.
- **Lost work:** `H 4` — `INFERRED`: repeated sensitive entry can cause abandonment; `R 4` — `ASSUMPTION`: exposure is broad but actual failures are unknown; `E 4` — `OBSERVED`/`INFERRED`: resume mechanics are direct, lost-work incidence is not (§§5–6, 13, 17); `X 5` — `OBSERVED`: all categories use drafts; `D 5` — `INFERRED`: interrupted/resumed flow is demonstrable; `I 4` — `INFERRED`: durable state can reduce re-entry; `C 4` — `INFERRED`: structural save state may be mistaken for UX polish; `S 5` — `INFERRED`: synthetic drafts are safe.
- **Irrelevant questioning:** `H 3` — `INFERRED`: excess effort and collection create burden, but legal necessity is unknown; `R 4` — `OBSERVED`/`ASSUMPTION`: the journey is long while per-segment irrelevance is unmeasured; `E 3` — `OBSERVED`/`INFERRED`: extensive capture is direct, but whether specific questions are irrelevant is not established (§§6–7, 24); `X 5` — `OBSERVED`: long sections span categories; `D 5` — `INFERRED`: adaptive omission is demonstrable; `I 4` — `INFERRED`: minimization may improve completion and privacy; `C 5` — `OBSERVED`: applicable-only questions are part of the thesis (§26); `S 5` — `INFERRED`: a deterministic synthetic question graph is safe.

### 7.5 Structural root causes

| Rank | Structural root cause | H | R | E | X | D | I | C | S | Total | Confidence |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | Duplicated policy representation | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | **40** | `HIGH` |
| 2= | Hard-coded rules in the public client | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | **39** | `HIGH` |
| 2= | Contradictory content | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | **39** | `HIGH` |
| 4 | Fragmented public lifecycle state | 4 | 4 | 4 | 5 | 5 | 5 | 5 | 5 | **37** | `MEDIUM` |

Score explanations:

- **Duplicated policy representation:** `H 5` — `INFERRED`: a bad copy can affect whole categories; `R 5` — `OBSERVED`: policy is copied across content, configuration, JavaScript, validation, documents, samples and reviewer practice; `E 5` — `OBSERVED`: duplication and measured generated logic are direct (§§8, 23); `X 5` — `OBSERVED`: policy spans all categories; `D 5` — `INFERRED`: a version change can visibly propagate; `I 5` — `INFERRED`: one source benefits many surfaces; `C 5` — `OBSERVED`: duplication is explicitly a systemic cause; `S 5` — `INFERRED`: synthetic policy data needs no live integration.
- **Hard-coded rules in the public client:** `H 4` — `INFERRED`: stale public-client branches can misstate consequential requirements, but affected outcomes are unknown; `R 5` — `OBSERVED`: generated rules cover nationality, purpose, dates, fees and evidence; `E 5` — `OBSERVED`: extensive conditional code and purpose codes are documented (§8); `X 5` — `OBSERVED`: branches span categories; `D 5` — `INFERRED`: policy-as-data can be compared directly with hard-coded behavior; `I 5` — `INFERRED`: externalized versioning improves governance and testing; `C 5` — `OBSERVED`: this is architectural, not cosmetic; `S 5` — `INFERRED`: deterministic local evaluation is safely bounded. This claim does not extend to unknown server-side rules.
- **Contradictory content:** `H 4` — `INFERRED`: contradictions can cause wrong preparation or delay; `R 5` — `OBSERVED`: conflicts span categories, countries, ports, file limits, purposes and recency; `E 5` — `OBSERVED`/`OFFICIAL`: conflicting official representations are compared (§§10, 23); `X 5` — `OBSERVED`: shared policy primitives are affected; `D 5` — `INFERRED`: sourced versioned results provide a clear contrast; `I 5` — `INFERRED`: resolution improves applicant and institutional consistency; `C 5` — `OBSERVED`: the issue is representation drift; `S 5` — `INFERRED`: sourced snapshots can remain synthetic and non-authoritative.
- **Fragmented public lifecycle state:** `H 4` — `INFERRED`: fragmentation can produce missed actions and duplicate payment; `R 4` — `OBSERVED`/`ASSUMPTION`: every case has multiple states, but use of each recovery route is unknown; `E 4` — `OBSERVED`/`INFERRED`: separate public routes, credentials and state surfaces are documented, while private state ownership is unknown (§§5, 13–14, 25); `X 5` — `OBSERVED`: application, document, payment, scrutiny and ETA state are cross-category; `D 5` — `INFERRED`: one synthetic timeline is clearly demonstrable; `I 5` — `INFERRED`: explicit state supports applicant, support and review needs; `C 5` — `OBSERVED`: public fragmentation is a lifecycle issue; `S 5` — `INFERRED`: explicit mock state is safe and deterministic.

These structural totals describe enabling architecture. They do not compete with or supersede the applicant-facing problem ranking.

## 8. Non-negotiable design constraints

These constraints are mandatory across every finalist, comparator and recovery demonstration. They are intentionally not scored.

| Constraint | Evidence and required treatment |
|---|---|
| Accessibility | `OBSERVED`: CAPTCHA, modal/navigation behavior, fixed controls and JavaScript-only requiredness create risks (§§17, 21). Require semantic, keyboard-operable, assistive-technology-compatible journeys and equivalent recovery. |
| Mobile usability | `OBSERVED`: fixed controls and missing viewport metadata create mobile risk (§§17, 21). Require mobile-first layouts and input, document and recovery flows. |
| Language comprehension | `OBSERVED`: English-heavy policy and domain terminology burden comprehension (§§9, 21). Require plain language, preserved policy meaning and accessible explanations; multilingual claims await validation. |
| Privacy | `OBSERVED`/`OFFICIAL`: the process handles sensitive identity, health, declaration, document and travel data (§§7, 20). Require synthetic-only minimization, privacy-safe logs and no arbitrary persisted public uploads. |
| Security | `OBSERVED`/`INFERRED`: sensitive workflows, uploads, state and policy create material threats (§20). Require fail-closed mock boundaries, no live-system access and deterministic authorization and validation. |
| Unreliable-connectivity recovery | `OBSERVED`/`INFERRED`: long posts, uploads and payment returns create interruption risk (§§6, 11, 17, 22). Require visible durable state, idempotent retry, no lost work and unambiguous next actions. |

## 9. Provisional prioritization summary and product orientation

### Step 3 applicant shortlist

- **Finalists for comparison, not final selections:** first-time tourist; Medical/Ayush patient journey with attendant as a related sub-persona; business or production-investment traveller.
- **Secondary comparators:** student or dependent; transit traveller.
- Step 3 must separately compare and explicitly select one bounded category/purpose and golden-path scenario. This document does not make that decision.

### Product orientation

1. **The applicant experience is the primary product story.** Purpose guidance, adaptive relevant questions, durable drafts, document readiness, payment certainty, coherent status and clear next actions should anchor the demonstration.
2. **Versioned policy governance is the enabling architectural story.** It explains how applicant guidance and requirements can remain sourced, explainable, testable and consistent without hard-coded UI branches.
3. **Reviewer and support functionality demonstrates end-to-end feasibility but remains limited.** Synthetic state, evidence versions and conceptual queues may be shown, but no claim may be made about real private roles, adjudication logic or workflows.
4. **Recovery behavior is category-independent.** Draft interruption, ambiguous payment, re-upload and status/next-action recovery must be demonstrated regardless of which finalist Step 3 selects.

The highest structural totals do not make institutional tooling the primary product. They identify the architecture needed to make the applicant story durable rather than cosmetic.

No AI candidate is selected or rejected. All six remain `UNDER EVALUATION`. No model, provider, implementation, technology stack, visa category or golden path is selected.

## 10. Evidence gaps and assumptions requiring validation

- Applicant volumes and completion rates by nationality, purpose, category and first-time/returning status.
- Purpose-selection confusion, correction, misrouting and abandonment rates.
- Field-level time, error and relevance data across application sections.
- Draft-save reliability, resume frequency, lost-work incidents and cross-device recovery.
- Photograph/document technical rejection, scrutiny rejection and re-upload rates by requirement.
- Ambiguous-payment incidence, duplicate-payment attempts, reconciliation time, refund outcomes and support burden.
- Status-page usage, email delivery failures, missed re-upload actions and support-contact reasons.
- Device, viewport, bandwidth, connectivity, language, literacy, disability and assistive-technology distributions.
- Usability evidence from representative applicants completing synthetic tasks without supplying personal case data.
- Reviewer roles, queues, handling time, evidence-comparison tasks, decision quality, workload and actual cognitive-load pain points.
- Support/operations roles, tools, escalation paths, case-access boundaries and common repair actions.
- Policy/content authoring ownership, source of truth, change frequency, approval, testing, propagation lead time, rollback and error history.
- Which public policy snapshot and effective context may safely seed Step 3’s bounded synthetic scenario.
- Government/hackathon evaluator goals, proof expectations and acceptable institutional-workflow fidelity.
- Whether equal weighting and the 1–5 thresholds reflect user priorities or require explicit weights.

Validation must use synthetic tasks and privacy-safe research. Any private-workflow claim requires authorized institutional discovery and must not be inferred through scraping or live-system automation.

## 11. Decisions requiring user approval

Before Phase 1 Step 2 can be marked `COMPLETE`, the user must decide:

1. Whether the revised taxonomy correctly separates applicants, contexts, recovery states, institutional users, evaluation audience, applicant problems, structural causes and constraints.
2. Whether the five separate matrices, scoring guardrails and confidence ratings are acceptable.
3. Whether the three Step 3 finalists and two secondary comparators are approved as the candidate set without selecting the final category.
4. Whether the applicant-first product orientation and policy-governance enabling story are correct.
5. Whether the four mandatory recovery demonstrations are correct.
6. Whether any score, confidence rating or rationale should change.
7. Which evidence gaps must be validated before Step 3 and which may remain explicit assumptions.
8. Whether this revised draft is approved as the completed output of Phase 1 Step 2.

Step 3 remains unstarted until this review is complete and explicit approval is given.
