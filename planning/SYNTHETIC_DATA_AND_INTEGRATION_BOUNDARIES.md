# Synthetic Data and Integration Boundaries

## 1. Purpose and authority

This specification is the authoritative project boundary for demonstration data, fixtures, mock integrations, network behavior and accidental-data handling. It applies to development, testing, review, recorded demonstrations and any publicly accessible proof of concept.

It implements the constraints in `AGENTS.md`, `PLANS.md`, [`PROJECT_CHARTER.md`](PROJECT_CHARTER.md) and accepted decisions `D-001` through `D-006` in [`DECISIONS.md`](DECISIONS.md). [`docs/evisa-system-dissection.md`](../docs/evisa-system-dissection.md) remains the authoritative reference for the existing system and for the distinction between observed, official, inferred and unknown facts.

The prototype is unofficial. It uses synthetic data and mock integrations only, cannot submit a visa application and must not connect to or reproduce IVFRT’s private backend. If requirements conflict, the more restrictive safety and privacy boundary applies until an explicit reviewed decision resolves the conflict.

## 2. Allowed synthetic-data classes

Only deliberately fabricated, clearly labeled data may represent an applicant or case:

| Class | Allowed synthetic content | Required characteristic |
|---|---|---|
| Identity and contact | Fictitious names, addresses, email addresses and non-routable contact placeholders | Obviously fictitious and unsuitable for contacting or identifying a person |
| Case identifiers | Synthetic applicant, draft, application, document, payment, review, ETA and event references | Deterministic, namespaced and visibly synthetic |
| Documents and photographs | Project-created sample files and fictional avatar-style images bundled with the project | No source material from a real person; visible synthetic labeling |
| Policy scenarios | Versioned test facts and expected decisions for bounded fictional cases | Traceable to a fixture manifest and separated from claims about current official policy |
| Payment scenarios | Named mock outcomes and synthetic transaction references | No card number, bank account, wallet, credential or real processor token |
| Health and declarations | Prewritten fictional answer sets | Scenario-controlled; never collected as a real disclosure |
| Biometrics | Opaque synthetic references and named mock outcomes | No image, fingerprint, template, embedding or measurement from a person |
| Travel and border events | Fictional itinerary, APIS, arrival, decision, entry and exit events | Scenario-tagged and unconnected to a real traveller or booking |
| Review and audit events | Synthetic assignments, actions, reasons and state transitions | Limited to fixture IDs and privacy-safe event metadata |

Publicly sourced policy facts may be stored separately as versioned reference data with provenance and confidence labels. They are not applicant fixtures and must not be represented as current official truth without an authoritative source and effective context.

## 3. Prohibited real-data classes

The project must never request, accept, store, transmit, derive, display or log:

- Real names, aliases, dates of birth, addresses, telephone numbers, personal email addresses or other identifying/contact data.
- Real passport numbers, passport scans, national identifiers, visa/application identifiers, citizenship records or travel-document data.
- Real portrait photographs, selfies, signatures, supporting documents, tickets, invitation letters, bank statements, medical letters or government records.
- Real card numbers, bank details, payment credentials, authentication values, transaction references or financial-account data.
- Real health, symptom, exposure, treatment, disability or medical information.
- Real criminal, immigration, asylum, political, security, terrorism or other sensitive declarations.
- Real fingerprints, face images used for identification, iris data, voiceprints, biometric templates, embeddings or match results.
- Real itineraries, passenger-name records, booking references, APIS records, border decisions, entry/exit events or foreigner records.
- Live-system credentials, secrets, session tokens, cookies, private endpoints, private schemas or copied private payloads.
- Data that is merely pseudonymized, redacted or hashed from a real person; derived real data remains prohibited.

If a value could reasonably belong to a real person or account, it is prohibited unless it is replaced by an obviously fictitious fixture that follows this specification.

## 4. Synthetic identity and identifier conventions

- Names, addresses and identifiers must be obviously fictitious. Prefer visible markers such as `Demo`, `Example`, `Synthetic` or `Test` rather than plausible real-world combinations.
- Email addresses must use reserved domains such as `example.com`, `example.org` or `example.net`. No fixture may use a deliverable mailbox.
- Telephone values must be clearly non-routable placeholders and must not be generated from valid national numbering ranges.
- Addresses must contain unmistakable fixture terms and must not resolve to a real residence, workplace, hotel, hospital or institution.
- Identifiers must be deterministic and namespaced, for example `SYN-SCENARIO-001-APPLICANT-001`, `SYN-PASSPORT-001`, `SYN-APPLICATION-001` and `SYN-PAYMENT-001`.
- Synthetic passport and government-style identifiers must not imitate real formats, checksums, prefixes or lengths closely enough to be mistaken for issued identifiers.
- Seed scenarios must produce the same identifiers, state and expected outcomes on every reset. Randomness, if used for presentation, must not alter fixture identity or expected results.
- Scenario time must use a controlled demonstration clock or relative offsets. It must not incorporate a real person’s dates or itinerary.
- Every stored or logged case reference must retain its synthetic prefix so it cannot be confused with a live identifier.

## 5. Synthetic content rules by data class

| Data class | Required rule |
|---|---|
| Documents | Use only bundled, project-created fixtures. Every page must be visibly watermarked `SYNTHETIC — NOT VALID`. Do not copy an authentic identity, financial, medical, institutional or government document and merely change its fields. The public demo must not persist arbitrary user-supplied files. |
| Photographs | Use only bundled fictional avatars or purpose-created synthetic illustrations with no source image from a real person. Label them visibly as synthetic. Never use a real face, selfie, stock portrait of an identifiable person or identity-document photograph. |
| Payments | Drive payment behavior through named scenarios such as success, decline, pending, abandoned, ambiguous, reconciled and refunded. Use synthetic references only; never request, display or store card numbers, bank details, payment credentials or processor tokens, including realistic test-card values. |
| Health information | Use pre-authored fictional scenario answers. Do not invite free-text real disclosures, infer health status from user behavior or persist a user’s answers as personal health information. |
| Legal and security declarations | Use pre-authored fictional yes/no and explanation fixtures. Never ask a public-demo user to disclose real criminal, immigration, asylum, political or security history. |
| Biometrics | Use synthetic biometric references and named outcomes only, such as unavailable, simulated match or simulated mismatch. Never ingest or generate real images, fingerprints, biometric templates, embeddings or device captures. |
| Travel events | Use fictional, deterministic itineraries and event sequences that are not tied to a real person, booking or carrier record. Public place names may appear only as sourced reference context; the case and journey remain visibly synthetic. |
| ETA artifacts | Generate clearly non-official fixtures with synthetic identifiers. Every page or rendered view must be visibly watermarked `SYNTHETIC — NOT VALID`; no fixture may contain a functional official-looking seal, barcode, QR code or travel credential. |

Bundled upload fixtures are the only files available to a public demonstration. A development-only file-input experiment, if later authorized, must be disabled in public builds, must never persist the selected file and must reject rather than forward unexpected content.

## 6. Fixture provenance, reset, retention and logging rules

### Provenance

Every bundled fixture must have a manifest record containing:

- Deterministic fixture and scenario IDs.
- Data class and short purpose.
- Method of creation and confirmation that no real-person source data was used.
- Source or license information for any non-personal reusable asset.
- Fixture version and integrity hash.
- Expected states, mock outcomes and failure scenarios.
- Required watermark or synthetic-label verification result.
- Review status and responsible project role.

Fixtures copied from live applications, user submissions, real documents, scraped data, production logs or leaked datasets are prohibited.

### Reset and retention

- Provide one documented, complete and repeatable reset operation for all demonstration state.
- Reset must restore the canonical seed scenarios and deterministic IDs and remove all derived cases, state transitions, mock payments, outbox messages, review actions, generated artifacts, temporary files, caches and demonstration logs.
- Reset must be idempotent and must produce the same verified baseline every time.
- Bundled seed fixtures may persist as project assets. Runtime demonstration state is disposable and must not outlive the environment or session policy defined for the demo.
- Arbitrary user-supplied files must never enter persistent storage, backups or fixture collections.
- Reset completeness must be automatically tested by mutating every state store, running reset and comparing the result with the canonical fixture manifest.

### Logging

- Logs may contain synthetic correlation IDs, scenario IDs, state transitions, mock outcome codes and privacy-safe diagnostic metadata.
- Logs must never contain complete document content, image data, declaration text, payment details, biometric material or unnecessary applicant fields.
- Do not log request/response bodies for case, document, payment, health, declaration, biometric, ETA or downstream interactions.
- Redact unexpected values before logging and cap error details so rejected input is not echoed.
- Keep public-demo analytics disabled unless an explicitly approved, privacy-safe development service is documented; never send fixture case content to analytics.

## 7. Public-demo labeling requirements

- Display a persistent, prominent and accessible notice: `UNOFFICIAL HACKATHON PROTOTYPE — SYNTHETIC DATA ONLY — CANNOT SUBMIT A VISA APPLICATION`.
- Repeat the notice at entry, before simulated submission and on every downloaded or printable artifact.
- Mark payment, scrutiny, notification, biometric, border, APIS and IVFRT-related views as `MOCK` or `SIMULATED`.
- Watermark every document and ETA fixture `SYNTHETIC — NOT VALID` in a way that remains visible in previews, exports, screenshots and print.
- Label all synthetic decisions and status values as demonstrations; never imply government approval, rejection, admissibility or endorsement.
- Do not use official seals, official visual identity or final branding in a way that could make the prototype appear genuine.
- Notices must be understandable without relying on color alone and must remain visible on mobile and assistive-technology paths.

## 8. Mock integration contract matrix

The contracts below are conceptual proof-of-concept boundaries, not descriptions of real private APIs, endpoints, payloads or schemas.

| Boundary | Purpose | Synthetic inputs | Possible mock outputs | Failure scenarios | Guarantee preventing live-system access |
|---|---|---|---|---|---|
| Payment gateway | Exercise payment intent, idempotency, asynchronous result and reconciliation behavior. | Synthetic application ID, policy-derived demo amount/currency, mock method label, scenario ID and synthetic idempotency reference. | Initiated, abandoned, declined, pending, confirmed, ambiguous, reconciled, receipt issued, refund pending or refunded, with synthetic references. | Timeout, duplicate request, delayed result, contradictory return, reconciliation unavailable or refund failure. | A local deterministic mock owns every result; it has no live endpoint, credential or real payment method. Default-deny egress and prohibited-domain checks block any fallback. |
| Email/notification delivery | Demonstrate ETA, status, query, re-upload and failure communication. | Reserved-domain recipient, synthetic case ID, template ID, locale choice and scenario state. | Queued, delivered to local outbox, delayed, bounced, suppressed or failed, plus a rendered mock message. | Template failure, outbox unavailable, delay, bounce, duplicate suppression or retry exhaustion. | Delivery terminates in a local capture/outbox. No SMTP, messaging provider, mailbox or live notification credential is configured or reachable. |
| Document inspection | Simulate format, size, quality, safety and manual-scrutiny outcomes. | Bundled fixture ID, synthetic metadata, expected document class and scenario flags. | Accepted, rejected with synthetic reason, needs replacement, simulated quarantine or inspection pending. | Unsupported fixture, corrupted sample, simulated scanner unavailable, timeout or conflicting result. | Inspection operates only on bundled fixtures through local deterministic rules. No file is sent to an external scanner, OCR, storage or analysis service. |
| External government/sectoral clearances | Show that some purposes may depend on external approval without claiming a real interface. | Synthetic case/purpose reference, mock clearance type, bundled evidence reference and scenario ID. | Approved, rejected, pending, expired, unavailable or more evidence required. | Service unavailable, stale result, identifier mismatch, conflicting clearance or manual review required. | Results come from local scenario fixtures. The mock defines no ministry, mission, sectoral, NSWS or other government endpoint, credential, private field or payload. |
| APIS | Simulate pre-arrival passenger-event matching and timing. | Synthetic traveller reference, fictional itinerary/event reference, synthetic ETA/passport references and scenario state. | Matched, unmatched, delayed, duplicate, rejected or unavailable event. | Missing event, late event, identity mismatch, duplicate feed or simulated transport failure. | A local event adapter and fixture ledger are the only source and sink. No airline, carrier, APIS or border-network endpoint is present or permitted. |
| Biometrics | Represent the fact and outcome of a biometric step without handling biometrics. | Synthetic biometric reference, case reference and named scenario outcome; never an image, fingerprint, template or embedding. | Simulated capture available/unavailable, quality pass/fail, match/mismatch or manual referral. | Device unavailable, quality failure, mismatch, timeout or operator referral. | The adapter accepts metadata-only synthetic references and cannot access a camera, scanner, sensor, biometric file or matching service. Network and content-type checks reject any biometric material. |
| Border decision | Demonstrate final-admissibility state and recovery behavior. | Synthetic ETA/passport references, mock APIS result, mock biometric result, fictional port/event and scenario flags. | Admitted, denied, referred, pending, revoked credential detected or system unavailable. | Conflicting identity, revoked ETA, missing event, degraded operation or manual referral. | A local rules/scenario mock produces the outcome. It has no immigration-post connection and cannot transmit, record or influence a real border decision. |
| IVFRT/foreigner-record interaction | Demonstrate a controlled handoff and downstream entry/exit record lifecycle. | Synthetic case, ETA and event references plus mock decision state. | Recorded, pending, duplicate, rejected, conflicted, unavailable, entry recorded or exit recorded. | Unavailable service, duplicate event, ordering conflict, invalid transition or reconciliation required. | A local mock ledger stores synthetic events only. No IVFRT identifier format, private schema, endpoint, credential or protocol is reproduced or contacted. |
| Any future AI/model service | Preserve a safe boundary if later exploration proposes model-assisted explanation, classification or content support. | Minimal synthetic text or metadata from an approved fixture; no document body, image, PII, declaration, credential or biometric content. | Mock suggestion, classification, explanation, confidence marker, refusal or unavailable result, always subject to deterministic validation and human review. | Timeout, refusal, malformed result, unsupported request, inconsistent output or simulated hallucination. | The proof of concept uses a local stub only and contains no remote model endpoint or key. Any external use requires a new reviewed decision, explicit approval and continued synthetic-only isolation; otherwise network controls fail closed. |

## 9. Network-isolation and fail-closed requirements

- Public-demo runtime egress is denied by default. Mock adapters, fixtures, assets and outputs must resolve locally within the demonstration boundary.
- Do not include live base URLs, production modes, government/payment/APIS/biometric/IVFRT endpoint switches or live credentials in code, configuration, documentation fixtures or deployment settings.
- Maintain an explicit allow-list for any approved development service. Such services may support development operations only, must never receive case/fixture content and must not be required by the public-demo runtime.
- Unexpected DNS, HTTP, socket, redirect, form-post or embedded-resource access must be blocked, recorded with privacy-safe metadata and surfaced as a controlled local failure.
- A mock timeout, missing fixture, configuration error or adapter failure must return a safe mock-unavailable state. It must never retry against, discover or fall back to a live service.
- Bundle public-demo assets locally so fonts, scripts, analytics, media and document previews do not create undeclared third-party calls.
- Separate every boundary behind an interface that can be tested with a network-deny harness; the POC implementation must provide mock behavior only.
- Treat any future remote integration proposal as out of scope until a new accepted decision and explicit authorization exist. Never infer or probe a private endpoint.

## 10. Verification checklist

The following checks are required before each public demonstration and as automated quality gates once an implementation exists:

- [ ] **Automated — prohibited live domains:** Scan source, configuration, built artifacts, documentation examples and runtime requests for live government, payment, APIS, biometric, border and IVFRT domains or endpoint patterns; fail on any match not explicitly approved as inert documentation.
- [ ] **Automated — accidental secrets:** Scan the repository, build output and runtime configuration for credentials, private keys, tokens, cookies, card/account values and high-entropy secrets; fail closed on findings.
- [ ] **Automated — realistic PII:** Validate fixture names, addresses, emails, phones, passport-like values and identifiers against synthetic conventions and realistic-PII detectors; require reserved domains and synthetic prefixes.
- [ ] **Automated — missing watermarks:** Render or inspect every bundled document and ETA fixture and fail if `SYNTHETIC — NOT VALID` is absent or not visibly persistent on every page/view.
- [ ] **Automated — network calls:** Run the demo and integration tests under network observation; fail on calls outside the documented approved-development-service allow-list and prove that public-demo runtime needs no external egress.
- [ ] **Automated — incomplete reset:** Mutate every demonstration store and artifact class, run the complete reset, compare against the canonical fixture manifest and fail on residual or non-deterministic state.
- [ ] **Automated — fixture integrity:** Verify fixture hashes, manifest coverage, deterministic IDs, reproducible seeds, expected outcomes and synthetic labels.
- [ ] **Automated — upload boundary:** Verify that only bundled fixtures are selectable in the public demo and that arbitrary user-supplied files cannot persist, enter backups or reach another adapter.
- [ ] **Automated — privacy-safe logging:** Exercise success and failure paths and fail if logs contain document/image bodies, declaration text, payment or biometric content, secrets or unnecessary applicant fields.
- [ ] **Automated — biometric boundary:** Reject images, fingerprints, templates, embeddings and sensor data at the biometric mock boundary; accept only namespaced synthetic references and scenario outcomes.
- [ ] **Automated — adapter failures:** Test every output and failure listed in the nine-boundary matrix and prove that no failure path attempts live discovery or fallback.
- [ ] **Manual — public labeling:** Confirm the unofficial/cannot-submit notice is persistent and accessible and that all mock/simulated views and downloads remain unmistakable.
- [ ] **Manual — reset and inspection:** Run reset, inspect the public journey, local outbox, mock ledgers, generated artifacts and logs, and confirm that only canonical synthetic seed data remains.

Evidence from these checks must be recorded with the task that introduces or changes an implementation. A missing or failed check blocks public demonstration.

## 11. Procedure if real data is accidentally supplied

1. **Stop and contain.** Stop processing immediately. Do not inspect more than necessary, reproduce the value, copy it into an issue, paste it into chat, upload it to an AI/model service or forward it to another integration.
2. **Reject public-demo input.** If an arbitrary file or value reaches the public demo, reject it, prevent persistence and display a neutral instruction not to provide real information.
3. **Isolate the affected path.** Disable the relevant intake or demonstration component and block access to affected storage, logs, caches, artifacts and sessions.
4. **Record minimal incident metadata.** Record only a non-sensitive incident reference, affected component, data-class category and containment state. Do not include the supplied content or unnecessary applicant fields.
5. **Notify through the approved channel.** Inform the project owner and designated security/privacy contact. Tell the supplier not to resend the data. Escalate any legal or notification determination to authorized personnel rather than guessing.
6. **Trace propagation safely.** Use identifiers and storage metadata—not the sensitive content—to determine whether the data reached logs, caches, generated artifacts, backups, outboxes or mock adapters.
7. **Remove or secure the data.** Under authorized incident handling, purge it and derived copies from demonstration systems. If preservation is required by an authorized security process, move it to an approved restricted location; never retain it in fixtures or ordinary project storage.
8. **Rotate exposed credentials.** If the supplied material includes a secret or credential, revoke or rotate it through its owner’s approved process and remove all copies from the project.
9. **Reset and verify.** Run the complete demo-data reset, repeat secret/PII/log/network scans and confirm no residual real data remains.
10. **Correct the cause before resuming.** Document a privacy-safe root cause, strengthen validation or isolation, add a regression check and resume the affected path only after explicit review confirms containment and prevention.
