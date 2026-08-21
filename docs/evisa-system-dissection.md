# India e-Visa: full system dissection

**Research snapshot:** 21 August 2026  
**System examined:** Government of India's public e-Visa service at [indianvisaonline.gov.in](https://indianvisaonline.gov.in/evisa/tvoa.html), its publicly reachable applicant/recovery surfaces, its shipped browser code, official policy material, and official descriptions of the wider Immigration, Visa, Foreigners Registration & Tracking system (IVFRT).

## The bottom line

The e-Visa website is not simply a long online form. It is the public intake edge of a stateful, security-sensitive case-management and border-control ecosystem.

The visible application is a traditional server-rendered, multi-page web application built with an older jQuery/Bootstrap-era front end. It creates a resumable draft, applies nationality- and purpose-specific rules, collects unusually sensitive biographical and risk data, accepts a photograph and category-dependent PDFs, hands payment to one of two bank gateways, places the case into scrutiny, supports document re-upload, issues an Electronic Travel Authorization (ETA), and then feeds into the much larger IVFRT environment used by immigration posts, FRRO/FRO offices, missions, passenger-information systems, and border officers.

The strongest architectural finding is the way policy is represented in the public page. The registration response inspected on 21 August 2026 was approximately **1.41 million characters**, of which approximately **1.27 million characters were inline JavaScript**. A document-selection function alone was approximately **1.16 million characters**, with **544 repeated conditional branches**, **102 distinct purpose codes**, and more than **80 document labels**. This looks like a large policy matrix flattened into generated client code. It is direct evidence of high policy complexity and duplication; it is not proof of the private database or server language.

The public system can be dissected with high confidence. The private adjudication application, exact database, deployment topology, screening integrations, encryption controls, reviewer interface, and internal APIs cannot be determined from the public internet. Those are explicitly marked as **inferred** or **unknown** below.

---

## 1. Evidence and confidence model

Every architectural statement in this report belongs to one of four classes.

| Label | Meaning | Examples |
|---|---|---|
| **Observed** | Directly visible in the live public application, DOM, browser-delivered scripts, or a public request/response | HTML form method, field names, JavaScript libraries, public JSON lookup routes, input limits |
| **Official** | Stated in Government of India material | IVFRT's role, biometrics at arrival, payment rules, permitted ports |
| **Inferred** | The smallest architecture consistent with the observed behavior, but not publicly confirmed | A case store behind temporary IDs; a reviewer work queue; payment callback/reconciliation processing |
| **Unknown** | Cannot be established without authorized internal access | Runtime language, database product, queue technology, encryption implementation, risk-list providers |

This distinction matters. A public page can reveal the client and its contract with public endpoints, but it does not reveal the source code or deployment of the protected backend.

---

## 2. System boundary and ownership

### What the applicant sees

The public site says the e-Visa process has four headline steps:

1. Apply online and upload a photo and passport page.
2. Pay the fee online.
3. Receive the ETA by email.
4. Print the ETA and present it at an immigration post, where the e-Visa is stamped.

That summary hides several additional states: an epidemiological gate, a resumable temporary application, several pages of biographical data, dynamic category rules, category-dependent document uploads, final verification, an external payment round trip, payment reconciliation, scrutiny, possible document re-upload, status lookup, ETA printing, airline pre-arrival data, and biometric/final-admissibility checks at the border. The official public process is described on the [e-Visa portal](https://indianvisaonline.gov.in/evisa/tvoa.html).

### Organizations and systems involved

| Actor or system | Publicly established role |
|---|---|
| Applicant | Supplies the application, declarations, photo, documents, and fee; tracks the case; travels with the granted ETA |
| Bureau of Immigration (BoI), Ministry of Home Affairs | Manages the public e-Visa service and immigration operations |
| National Informatics Centre (NIC) | Credited by the portal as designer/developer |
| Indian missions/posts | Part of the wider IVFRT visa-issuance network; exact e-Visa routing is not public |
| SBIePay and Axis Bank gateway | External payment acquisition/authentication and return to the portal |
| MHA/MEA and sectoral bodies | Supply or verify special approvals for conference, sports, film, mountaineering, medical, and other purposes |
| IVFRT central environment | Interlinks immigration, visa issuance, registration, case files, entry/exit, and agency sharing |
| Airlines and APIS | Supply passenger/crew data before arrival |
| Immigration Check Posts | Verify passport/ETA, collect biometrics, determine final admissibility, and record entry/exit |
| FRRO/FRO offices | Handle foreigner registration and post-entry services where applicable |
| Email channel | Sends ETA and scrutiny/re-upload communication |

The Cabinet's March 2026 continuation of IVFRT explicitly says the platform interlinks immigration, visa issuance, and foreigner registration, and covers immigration posts, FRROs/FROs, and data centres. The new five-year programme has a budget outlay of ₹1,800 crore and includes revamped core architecture, infrastructure, mobile services, and self-service kiosks. See the [official IVFRT continuation release](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2245101).

---

## 3. End-to-end logical architecture

The following is a logical reconstruction, not a claim about the exact private deployment.

~~~mermaid
flowchart TD
    A["Applicant browser"] --> B["Public e-Visa web application"]
    B --> C["Eligibility, purpose and document rules"]
    B --> D["Draft and application case store"]
    B --> E["Photo and PDF intake"]
    B --> F["External payment gateway"]
    F --> G["Payment callback and reconciliation"]
    C --> H["Scrutiny and adjudication"]
    D --> H
    E --> H
    G --> H
    H --> I["ETA, email, status and re-upload"]
    I --> J["Airline APIS and arrival"]
    J --> K["Immigration post and biometrics"]
    K --> L["IVFRT entry, exit and foreigner record"]
    L --> M["FRRO/FRO and authorized agencies"]
~~~

The boxes for a case store, review queue, callback handler, and file storage are inferred from the behavior. Their exact number, technologies, and physical boundaries are unknown.

---

## 4. Layer map

| Layer | What exists | Evidence | Confidence |
|---|---|---|---|
| Policy/legal | Visa categories, eligibility, duration, entries, documentary evidence, fee and border conditions | Portal, MHA material, Immigration and Foreigners Act/Rules pages | Official |
| Discovery/content | Eligibility, instructions, FAQs, payment help, document requirements, permitted ports | Landing-page tabs and modals | Observed |
| Presentation | Multi-page HTML, forms, modal gate, dropdown enhancement, date picker, CAPTCHA | Live DOM and delivered assets | Observed |
| Session/case state | Temporary application ID, resume flow, permanent application ID, distinct downstream statuses | Public application and recovery pages | Observed; backing implementation inferred |
| Rules | Nationality/service eligibility, duration, fee, documents, arrival windows, special cases | Browser code and public JSON lookups | Observed |
| Data capture | Identity, passport, contact, family, travel, visa history, security declarations, health screening | Live first page and official sample form | Observed/official |
| Media | JPEG photograph plus purpose-specific PDFs and re-upload | Portal and upload/re-upload flows | Observed |
| Payment | Choice of bank gateway, 3DS/2FA, redirect, status check, receipt, reconciliation/refund handling | Official payment instructions and public payment page | Official/observed |
| Adjudication | Scrutiny, request for replacement media, grant/rejection, ETA | Portal and status journey | Official; internal mechanics unknown |
| Notification/recovery | Email, partial completion, payment verification, status, print, re-upload | Public routes | Observed |
| Border | APIS, ETA/passport check, mandatory photograph/fingerprints, final admissibility, stamp | MHA/portal material | Official |
| Central record | Unique case file, central data centres, entry/exit updates, agency sharing | Official IVFRT descriptions | Official, with historical/current caveat |
| Infrastructure/operations | NIC/government-hosted service and IVFRT data-centre programme | Portal credits and government releases | Official at a high level; topology unknown |
| Security/privacy | HTTPS, CAPTCHA, hidden form tokens, external card capture; sensitive identity/documents/health data | Live site and official process | Some observed; most internal controls unknown |
| Support | Visa helpdesk, gateway helpdesks, chatbot, recovery pages | Portal | Observed |

---

## 5. Public product surface

The e-Visa experience is split across several routes rather than one account dashboard.

| Surface | Purpose | Credentials or inputs observed |
|---|---|---|
| Landing/instructions | Eligibility, categories, requirements, FAQ, payments, ports, help | None |
| New registration | Health gate and initial case creation | Name, passport number, nationality, passport type, port, DOB, email twice, purpose, arrival date, CAPTCHA, instruction acknowledgment |
| Complete partially filled form | Resume a draft | Temporary Application ID and CAPTCHA |
| Verify payment/pay fee | Resolve or continue payment | Application ID, DOB, CAPTCHA; receipt action |
| Print application/ETA-related output | Reprint and, for regular visa, appointment functions | Visa type, port/mission, Application ID, DOB, passport, CAPTCHA |
| Status enquiry | Case and payment status; ETA access | Application ID, passport, CAPTCHA; advanced e-Visa search |
| Re-upload data | Replace a rejected/unclear document or image | Application ID, passport, CAPTCHA |
| Document upload | Specification and submission of required files | Application context, selected files |
| e-Arrival card | Separate arrival-information service, not a visa | Linked from the e-Visa portal |
| Afghan portal | Separate application route for Afghan nationals | Linked from landing page |
| Help channels | e-Visa, SBIePay and Axis support | Phone/email/chat interfaces |

This fragmentation is an architectural fact: different pieces of the same case are exposed through separate credential tuples and separate form posts. It provides recovery without requiring an applicant account, but makes the user's mental model and support burden much harder.

---

## 6. Full applicant journey

### 6.1 Discovery and preparation

The applicant must first resolve:

- whether the passport nationality is eligible;
- whether the passport/document type is allowed;
- which of the many visa purposes applies;
- the earliest and latest permissible arrival date;
- the permitted duration and number of entries;
- which port is valid for entry;
- which photograph and PDFs are required;
- whether special ministry, federation, hospital, institution, organizer, sponsor, or destination evidence is needed;
- the country-specific fee and processing timing.

The current landing page presents high-level category names, detailed instructions, and required-document lists. These are not perfectly synchronized with each other or with the application itself; the drift is analyzed later.

### 6.2 Pre-application public-health gate

Before exposing the initial application, the live site opens a mandatory modal asking for:

- applicant name;
- passport number;
- nationality;
- whether the applicant visited the Democratic Republic of Congo, Uganda, or South Sudan during the preceding 21 days;
- if yes, whether 21 days have elapsed since exit;
- whether the applicant suffered Ebola or specified symptoms during the preceding 21 days;
- a symptom selection including fever, muscle pain, headache, vomiting, diarrhoea, sore throat, and rash.

The delivered JavaScript validates name and passport syntax, branches on the answers, and sends gate information to a public same-origin JSON route before or while unlocking the main form. Some answer paths block the applicant until the 21-day or recovery condition is met.

This is not merely UI: identity and health information can be transmitted before a visa application has been created. The client code also showed an asymmetry in one allowed answer path where the save call was not visible. That could be intentional or a client-side defect; the server behavior was not tested because no personal data was submitted.

### 6.3 Initial registration and case creation

The first application form is an ordinary HTML POST with autocomplete disabled. It asks for:

- passport type;
- nationality;
- port of arrival;
- date of birth;
- email and re-entered email;
- visa service/purpose;
- expected arrival date;
- CAPTCHA;
- confirmation that instructions and required documents have been read.

The main dropdown contained 67 selectable purpose choices plus a placeholder in the inspected snapshot. The port dropdown contained 85 selectable ports plus its placeholder. The choice of nationality and purpose changes available services, dates, durations, documentary requirements, and fee text.

The server issues a **Temporary Application ID** for a draft. The public resume page expects an ID up to 15 characters. A submitted case uses a separate **Application ID**, exposed by later services as a 12-character value. The formats are observed; their generation algorithm and entropy are unknown.

### 6.4 Applicant and passport details

The official sample journey shows collection of:

- surname and given names exactly as the passport;
- whether the applicant changed name and the previous details;
- sex/gender;
- date and city/town of birth;
- country of birth;
- citizenship/national identification number;
- religion;
- visible identification mark;
- educational qualification;
- present nationality;
- whether nationality was acquired by birth or naturalization;
- whether the applicant has lived at least two years in the country from which they are applying;
- passport number, place/date of issue, and expiry;
- any other valid passport or identity certificate, its issuing country, number, date/place, and nationality.

### 6.5 Address and family details

The next logical section captures:

- present house/street, city, country, state/district, and postal code;
- telephone, mobile number, and email;
- whether permanent address is the same, and the separate permanent address if not;
- father's and mother's names, current/previous nationalities, birthplaces, and countries of birth;
- marital status;
- whether parents or grandparents were Pakistani nationals or belonged to an area held by Pakistan, with details.

### 6.6 Visit, visa-history and reference details

The sample form then collects:

- chosen visa type/service;
- places to be visited;
- tour operator or hotel details where relevant;
- duration, number of entries, entry port, expected exit port;
- prior travel to India;
- previous Indian address and cities visited;
- previous/current visa number, type, place/date of issue;
- whether permission to visit or extend stay was refused, and details;
- countries visited in the preceding ten years;
- SAARC countries visited in the preceding three years;
- a reference in India with address and telephone;
- a reference in the applicant's home country with address and telephone.

### 6.7 Security and legal declarations

The public sample asks yes/no questions and details about:

- arrest, prosecution, charge, or conviction;
- refusal of entry or deportation;
- human trafficking, drug trafficking, child abuse, other crime, economic offence, or financial fraud;
- cybercrime, terrorism, sabotage, espionage, genocide, political killing, or other violence;
- expressing views that justify or glorify terrorist violence;
- seeking asylum in another country.

The applicant accepts a declaration concerning accuracy and the legal consequences of false information, refusal, deportation, and blacklisting.

### 6.8 Photograph and document upload

The applicant uploads:

- a recent front-facing JPEG portrait;
- the passport biographical page as a PDF;
- zero or more purpose-dependent PDFs.

The application generates the required-document set from the selected purpose and related answers. A separate re-upload journey handles files that fail scrutiny.

### 6.9 Final verification

The sample journey presents a read-only summary and offers a choice equivalent to **Modify** or **Verified and Continue**. After the final submission, the applicant can no longer treat the case as an ordinary editable draft.

### 6.10 Payment

The applicant can pay immediately or later. Payment is handed to an external gateway, where card/wallet/PayPal availability, authentication, and acquisition occur. The browser is returned to Indian Visa Online and a receipt/reference is generated when the result is recognized.

### 6.11 Scrutiny and re-upload

The portal states that the submitted application and media are scrutinized. If a document or image is not appropriate, the applicant may receive an email asking for re-upload, normally within 24 hours. The public re-upload route uses Application ID, passport, and CAPTCHA.

### 6.12 Decision and ETA

The case moves to grant or rejection. A granted ETA is emailed and is also available through the status/print surfaces. The applicant is told to confirm that the status is **GRANTED** before travel.

### 6.13 Pre-arrival and border

The ETA is not the final decision to admit the traveller. Airline/passenger information reaches immigration through APIS; the applicant presents the passport and ETA at an authorized immigration post; a photograph and fingerprints are mandatorily captured; an immigration officer performs the final admissibility check; and the e-Visa is stamped in the passport. Entry and later exit become part of the wider immigration record.

---

## 7. Domain and data model

The following domain model is reconstructed from the public fields and workflow. It is not the private database schema.

### Case identity and lifecycle

| Entity | Representative attributes |
|---|---|
| Draft application | Temporary ID, created/updated times, session/form token, current step, completion flags |
| Submitted application | Application ID, visa service/purpose, status, submission time, selected port, expected arrival |
| Applicant | Names, former name, sex/gender, birth details, nationality/citizenship, religion, education, identification mark |
| Passport/travel document | Type, number, issuing place/country, issue/expiry dates, other passport/identity certificate |
| Contact/address | Email, phone/mobile, present/permanent address |
| Family | Parents' details, marital status, Pakistan-origin/history declarations |
| Travel intent | Places, host/operator/hotel, proposed entry/exit, duration, entries |
| Travel and visa history | Prior India visits, prior visas, refusals/extensions, ten-year country history, SAARC history |
| Reference | Indian reference and home-country reference |
| Security declaration | Question code, yes/no answer, explanatory text, attestation |
| Health gate record | Identity keys, travel-exposure answers, symptom/recovery answer, gate result |
| Document requirement | Purpose/rule version, document type, mandatory/optional status, accepted format/size |
| Uploaded asset | Asset type, filename, MIME/size metadata, upload time, version, scrutiny state, rejection reason |
| Payment | Amount/currency, fee rule, gateway, transaction reference, state, timestamps, attempts, reconciliation/refund state |
| Review | Queue/routing, reviewer/action, document query, decision, reason codes, timestamps; exact fields unknown |
| ETA | Authorization number/document, validity, entries, purpose, issue/revocation state |
| Border event | Port, carrier/flight, passport/ETA match, biometric capture, officer decision, entry/exit time |

### Sensitivity

This system combines:

- passport and national-identity data;
- contact and address information;
- family and origin information;
- travel history;
- criminal, immigration, terrorism, asylum, and political-violence declarations;
- public-health information;
- portrait and supporting records such as hospital, bank, admission, birth, marriage, business, sponsor, and government-clearance documents;
- payment transaction metadata;
- downstream photographs, fingerprints, and entry/exit history.

That combination makes the case record materially more sensitive than a normal consumer checkout. Even a partial draft can contain enough information for identity fraud, profiling, social engineering, or physical-safety harm.

---

## 8. Policy and rules engine

### What the rules determine

The public system applies at least these rule dimensions:

1. Passport nationality/region eligibility.
2. Passport type and professional-background exclusions.
3. Applicant origin/history exceptions.
4. Visa family, subtype, and granular purpose.
5. Arrival window and advance-application requirement.
6. Visa duration and entries.
7. Maximum continuous or annual stay.
8. Entry port.
9. Category- and purpose-specific documents.
10. Country-specific fees.
11. Special ministry/organizer/federation/sponsor clearances.
12. Nationality-specific availability and advisories.
13. Date-effective policy changes.
14. Health-gate eligibility.

### Observable implementation

The live registration page uses both:

- browser-side conditional logic; and
- same-origin JSON POST lookups for allowed services, service duration, special duration, duration/entry/fee descriptions, mission/service availability, and the health-gate save.

Publicly visible route names included operations equivalent to:

- fetch allowed e-Visa services for a nationality;
- fetch standard and special service duration;
- fetch duration, entries, and fee-description information;
- fetch visa services for a mission/nationality;
- save the health gate.

The browser then disables or hides purpose options, calculates date windows, displays eligibility/advisory messages, selects documentary requirements, and changes later form behavior.

Several rules are visibly special-cased in the delivered code, including nationality-dependent medical choices, Sri Lanka restrictions, Canadian official/defence advisories, China/Hong Kong/Macao treatment for production-investment purposes, and hard-coded arrival windows. This does not establish whether the server independently revalidates the same rules. It must do so for security and correctness, but that server-side implementation is unknown.

### Size and shape of the client policy matrix

Snapshot measurements from the live registration response on 21 August 2026:

| Measure | Approximate observed value |
|---|---:|
| HTML response characters | 1,410,413 |
| DOM elements | 819 |
| Option elements | 561 |
| Inline JavaScript characters | 1,268,221 |
| External script assets | 7 |
| Stylesheets | 5 |
| Dialog/modal elements | 5 |
| One generated document-rule function | 1,164,769 characters |
| Repeated purpose condition branches | 544 |
| Distinct purpose codes referenced by document logic | 102 |
| Distinct document labels | More than 80 |

The initially visible purpose dropdown had 67 choices, while the generated document logic referenced 102 purpose codes. That could reflect hidden nationality-specific choices, old/future codes, shared rules, or dead branches. Only internal source data could distinguish them.

### Architectural diagnosis

The rule system behaves like a multidimensional policy table, but a large part of it is delivered as repetitive imperative JavaScript. The likely failure modes are:

- the same rule represented in content, client code, backend validation, reviewer guidance, and fee tables;
- slow change propagation;
- stale or unreachable branches;
- inconsistent effective dates;
- a large initial response and parse cost;
- difficult automated testing across nationality × purpose × date × document combinations;
- mismatches between what the UI allows and what adjudication expects.

A modern implementation should treat policy as versioned data with one authoritative evaluation service and generated explanations. That is a redesign implication, not a claim about the current private backend.

---

## 9. Visa and purpose taxonomy

The public site uses several overlapping taxonomies:

- broad marketing/category labels;
- formal visa codes such as e-T1, e-B1, e-M1, and e-TR;
- granular numeric purpose codes in the form;
- document rules keyed to purpose;
- separate durations and fee variants.

The inspected purpose selector included tourist, business, film, conference, medical, medical-attendant, Ayush, student, student-dependent/family, miscellaneous/entry, production-investment, mountaineering, and transit purposes. Business alone included activities such as trade, venture setup, fairs, sports, vessel crew/operations, GIAN lectures, recruitment, tours, meetings, specialist work, conference activity, and production-investment subtypes.

This is why “visa type” cannot be modeled as one dropdown value. A robust domain model needs:

- visa family;
- statutory/service code;
- applicant-facing purpose;
- validity/duration variant;
- allowed nationality set;
- effective-date range;
- document requirement set;
- fee rule;
- stay/entry conditions;
- external-clearance requirements.

---

## 10. Document and image subsystem

### Published constraints

The current portal specifies a photograph that is:

- JPEG;
- 10 KB to 1 MB;
- square;
- front-facing, full face, eyes open, no spectacles;
- centered;
- on a plain light or white background;
- without facial/background shadows or borders.

The passport bio page and other supporting documents are PDFs in English. The portal landing material observed through web retrieval states a 10–300 KB range, while a separate official upload-information page has stated a 10–500 KB range. The official sample form also uses the older 300 KB ceiling. The contradiction is itself a user-facing defect; the live server's actual validation is the final authority but was not tested with uploads.

### Purpose-dependent evidence

Examples from the current official document list:

| Purpose | Additional evidence beyond passport |
|---|---|
| Short course | Institution/organization/hospital letter |
| Voluntary work | Organization letter |
| Medical/Ayush | Indian hospital letter including proposed admission date |
| Business | Business card; invitation where applicable |
| Sports | Sports Ministry approval, federation invitation, prior tax compliance where relevant, and MHA/MEA/Sports clearances for restricted/protected-area events |
| GIAN lecture | Host invitation, sanction order, course synopsis |
| Conference | Organizer invitation, MEA political clearance, MHA event clearance |
| Student | Admission letter, financial support/bank evidence, and health-ministry NOC for medical/paramedical study |
| Entry/family connection | Indian relative's ID/passport/OCI or surrendered-passport evidence plus birth/marriage evidence |
| Film | Information & Broadcasting clearance and detailed shooting intent/schedule |
| Mountaineering | Indian Mountaineering Foundation clearance |
| Transit | Inward/onward tickets and destination visa/permit or destination-country passport |
| Production investment | Sponsor/employer/Indian-company undertakings and purpose-specific proformas; exact combination varies |

### Observable workflow

1. Rules calculate the required document set.
2. Applicant selects JPEG/PDF files.
3. Client and/or server checks format/size.
4. Assets are associated with the draft/application.
5. Applicant confirms uploads.
6. Assets enter scrutiny.
7. A rejected/unclear asset creates a re-upload request.
8. Applicant submits a replacement version.
9. Review resumes.

### What the public system does not reveal

The following cannot be confirmed:

- object storage or database technology;
- whether files are encrypted with separate per-object keys;
- virus/malware scanning;
- PDF active-content sanitization;
- MIME/magic-byte verification;
- decompression-bomb protection;
- image recompression or metadata stripping;
- OCR or passport machine-readable-zone extraction;
- facial-quality or liveness automation;
- perceptual-hash duplicate checks;
- retention and deletion schedules;
- reviewer redaction and download controls.

These are necessary design questions for a rebuild, not facts about the existing system.

---

## 11. Payment architecture

### Verified public behavior

The portal offers SBIePay and Axis Bank. Official instructions say:

- the user is redirected to the chosen external gateway;
- international card methods are supported, with PayPal available through SBIePay;
- 3-D Secure/OTP or other two-factor authentication can apply;
- the gateway returns the user to Indian Visa Online;
- the portal exposes payment verification and fee-receipt actions;
- country-specific processing fees are non-refundable regardless of grant/rejection;
- an additional bank transaction charge applies;
- payment status can take up to two hours to update after a network/technical delay;
- if money is deducted but status is not updated, the applicant should verify rather than immediately pay again;
- gateway/portal connectivity failures can trigger later reconciliation or refund;
- repeated failed attempts can eventually force a new application.

### Smallest consistent architecture

~~~mermaid
sequenceDiagram
    participant A as Applicant
    participant V as Visa portal
    participant G as Bank gateway
    participant R as Reconciliation
    A->>V: Choose gateway
    V->>G: Payment order and return context
    G->>A: Card/wallet authentication
    G-->>V: Browser return and/or server result
    V->>R: Record pending/result
    R-->>V: Confirm, fail, or refund
    V-->>A: Status and receipt
~~~

The existence of an order/transaction record and reconciliation process is inferred from the published behavior. It is not known:

- whether the authoritative result arrives by browser POST, server-to-server callback, polling, settlement file, or a combination;
- how messages are signed;
- how replay/idempotency is implemented;
- which internal service owns the payment state;
- whether payment and application data share a database;
- how long financial records are retained.

### Failure semantics

Payment is not a binary synchronous step. It needs at least:

- not initiated;
- initiated;
- user abandoned;
- gateway pending;
- gateway success, portal not yet confirmed;
- confirmed success;
- failed;
- ambiguous/under reconciliation;
- refund initiated;
- refunded;
- receipt issued.

Collapsing those into “paid/unpaid” creates double-payment and support problems.

---

## 12. Scrutiny and adjudication

### What is established

The portal confirms that:

- submitted applications and media are scrutinized;
- applicants can be asked by email to replace an inappropriate document/image;
- the final public outcomes include grant and rejection;
- a granted case produces an ETA;
- the ETA can be checked online;
- grant does not remove the border officer's final admissibility decision.

The March 2026 IVFRT continuation release says **91.24% of e-Visa applications were cleared within 72 hours during the preceding five years**. “Cleared” should not be read as “approved”; it is an official processing-timeliness measure.

### Likely internal capabilities

Any operational system that produces the observed outcomes requires capabilities equivalent to:

- intake and deduplication;
- assignment/routing by nationality, purpose, risk or workload;
- structured view of application and prior records;
- document and photograph review;
- request-for-information/re-upload action;
- policy and eligibility checks;
- connections or workflows for external clearances;
- watch/risk/immigration-history checks where authorized;
- grant/reject/refer/hold actions;
- reason codes and notes;
- separation of duties for sensitive decisions;
- timestamped audit history;
- ETA generation and revocation.

These capabilities may be one application or many. Their exact implementation is unknown. No public evidence justifies claims that decisions are made by AI, that OCR is used, or that a particular watch-list or database product is integrated.

---

## 13. Status, communication and recovery

The system uses an applicant's email plus public self-service forms rather than a conventional username/password account.

### Recovery methods

| Need | Public recovery mechanism |
|---|---|
| Continue an unfinished application | Temporary Application ID + CAPTCHA |
| Pay later or resolve ambiguous payment | Application ID + DOB + CAPTCHA |
| Generate a fee receipt | Same payment-check surface |
| Check application and payment status | Application ID + passport + CAPTCHA |
| Print/reprint | Application ID + DOB + passport + port/mission + CAPTCHA |
| Replace a rejected document/image | Application ID + passport + CAPTCHA |
| Receive ETA or query | Email plus status/print surface |

### Architectural implications

- There is no single authenticated workspace in the public experience.
- IDs plus personal facts operate as knowledge factors; CAPTCHA limits automated abuse but is not identity proof.
- Recovery routes must query the same underlying case and payment state.
- Email deliverability becomes part of the critical path.
- Applicant support must reconcile several identifiers and separate portals.
- Rate limiting, enumeration resistance, consistent generic errors, and strict authorization are essential; their internal implementation is unknown.

---

## 14. State machine

The externally visible and logically required states can be modeled as follows.

~~~mermaid
stateDiagram-v2
    [*] --> Gate
    Gate --> Blocked: exposure or symptoms
    Gate --> Draft: eligible
    Draft --> Submitted: verify application
    Submitted --> PaymentPending
    PaymentPending --> PaymentFailed
    PaymentFailed --> PaymentPending: retry
    PaymentPending --> Paid: confirmed
    PaymentPending --> Reconciliation: result ambiguous
    Reconciliation --> Paid
    Reconciliation --> Refunded
    Paid --> Scrutiny
    Scrutiny --> ReuploadRequired
    ReuploadRequired --> Scrutiny: replacement
    Scrutiny --> Granted
    Scrutiny --> Rejected
    Granted --> ETAIssued
    ETAIssued --> ArrivalCheck
    ArrivalCheck --> Admitted
    ArrivalCheck --> EntryDenied
    Admitted --> Exited
    ETAIssued --> Revoked
~~~

Additional internal states almost certainly exist: duplicate/referred/held, clearance pending, manual escalation, email failed, document quarantined, and expired/abandoned. They are not all publicly exposed.

---

## 15. IVFRT and downstream immigration

### Historical architecture that remains relevant

Official 2012 descriptions of IVFRT identify:

- a central IVFRT processing office as the “nerve centre”;
- a central data centre;
- a Unique Case File for a foreign national;
- mission, Immigration Check Post, FRRO, and FRO connectivity;
- passport/document scanners and biometrics;
- automatic updates when visas are granted and when a traveller enters/exits;
- a centralized mechanism for authorized agency sharing;
- passenger profiling and alerts for risk, overstay, or failure to register;
- convergence with e-passports, e-migration, and criminal-justice systems.

See the official historical descriptions of the [IVFRT central processing office](https://www.pib.gov.in/newsite/PrintRelease.aspx?relid=84440) and [IVFRT project](https://www.pib.gov.in/newsite/PrintRelease.aspx?relid=84483). These sources establish the programme's design, not every detail of today's deployment.

### Current programme

The 2026–2031 continuation programme says IVFRT covers:

- 117 Immigration Check Posts;
- 15 FRROs;
- 854 FRO/SP/DCP offices;
- core applications and nationwide data-centre/infrastructure modernization;
- unified digital platforms, mobile services, and self-service kiosks.

This is important evidence that the existing system is actively being re-architected. A hackathon prototype should therefore position itself as a modular applicant-experience and policy-orchestration concept, not as a guessed replacement for every classified/private system behind IVFRT.

### APIS

MHA's public APIS description says airlines electronically transmit passenger and crew information shortly after departure from a foreign port so Indian immigration can process it before arrival. The public description has historically referred to a flat-file mechanism and a 15-minute timing window. Treat that as a legacy official interface description; the current private transport/protocol is not established. See the [MHA APIS page](https://www.mha.gov.in/en/divisionofmha/foreigners-division/advance-passenger-information-system-apis).

### Arrival

At the border:

1. The traveller presents the same passport used for the application, or follows the published old/new passport condition.
2. The ETA is checked.
3. Passenger/flight information is available to immigration.
4. A photograph and fingerprints are captured.
5. The officer makes the final admissibility decision.
6. Entry is recorded; later exit updates the foreigner's record.
7. Longer-stay or special conditions may create FRRO/FRO obligations.

The portal explicitly says biometrics are mandatory on arrival and the applicant should verify **GRANTED** before travel.

---

## 16. External integrations

| Integration | Direction | Data or function | Confidence |
|---|---|---|---|
| SBIePay/Axis | Portal ↔ gateway | Payment order, result/reference, settlement/reconciliation | Public behavior verified; protocol unknown |
| Email | Portal → applicant; possibly inbound support | ETA, re-upload/query, status communication | Verified |
| CAPTCHA service | Browser ↔ portal | Human challenge and validation | Observed; implementation unknown |
| MHA conference system | Organizer/MHA ↔ visa process | Event and political/security clearance context | Official dependency; exact API unknown |
| MEA and sectoral ministries | Documents/workflow ↔ adjudication | Conference, sports, film and other clearances | Official requirements; integration may be manual or digital |
| NSWS production-investment module | Indian sponsor → visa evidence | Digitally generated sponsorship letter for e-B4 | Official; exact verification interface unknown |
| Hospital/institution/federation/operator | Applicant supplies evidence | Invitation/admission/treatment/approval records | Official document dependency |
| APIS/airlines | Airline → immigration | Passenger, crew and journey data | Official |
| Immigration posts | Border ↔ IVFRT | Identity, biometric, admissibility, entry/exit | Official |
| FRRO/FRO | Office ↔ IVFRT | Registration and post-entry foreigner services | Official |
| Authorized government systems | IVFRT ↔ agencies | Risk, identity, investigation or status data | High-level official; exact feeds classified/private |

In December 2025, the government announced an NSWS module that lets Indian companies generate sponsorship letters for the e-Production Investment Visa. This is a concrete example of the visa application depending on another digital government workflow. See the [official e-B4 sponsorship-module release](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2205592).

---

## 17. Observable front-end technology

### Rendering model

The application is a traditional multi-page server-rendered web application:

- ordinary HTML forms;
- full-page POST submissions;
- same-origin JSON/AJAX lookups for selected dynamic rules;
- no observable React, Angular, or Vue application root;
- server-issued hidden fields and case identifiers;
- browser-delivered, page-specific scripts.

### Libraries and assets observed

The landing/application pages load combinations of:

- jQuery;
- jQuery UI;
- Bootstrap;
- Chosen for enhanced selects;
- Owl Carousel;
- Easy Responsive Tabs;
- Prism;
- Font Awesome;
- portal-specific declaration, blur-validation, submit, and custom scripts;
- portal-specific CSS.

Prism is normally a code-highlighting library; its reason for being included on the registration page is not apparent.

### HTML/form characteristics

Observed characteristics include:

- the registration form posts to a same-name server route;
- autocomplete is disabled;
- many mandatory constraints are enforced through JavaScript/visual asterisks rather than native HTML required attributes;
- email fields use text inputs rather than the browser's email input type;
- the expected-arrival input is read-only and controlled by a jQuery date picker;
- the purpose selector is enhanced by Chosen and given a fixed pixel width;
- hidden values include visa/application model fields, a token, and an opaque form-state value;
- the body calls functions to interfere with browser Back, paste, and refresh behavior;
- the registration page did not expose a language attribute or a modern mobile viewport declaration in the inspected DOM.

Disabling paste, Back, or F5 is a UX control, not a security control. It can also make password-manager/accessibility use and recovery from errors worse.

### What naming does and does not reveal

Field names in an “appl.property” shape and action-style routes are consistent with several Java MVC/Struts/Spring-era patterns, but are **not proof** of Java, Struts, Spring, or any specific backend. A server can generate those names in any language.

The exact server runtime, framework, template engine, web server, and application container remain unknown.

---

## 18. Network and application mechanisms

### Request patterns observed

- HTTPS on the government domain.
- Full-page form POSTs for major steps and public recovery actions.
- JSON POST lookups for eligibility/service/duration/fee/gate behavior.
- External redirects for payment.
- Client-side validation and branching.
- CAPTCHA on initial and recovery/status surfaces.
- Opaque hidden token/form-state values.
- Temporary and permanent application IDs.

### Browser security directives observed in markup

The landing markup contained meta directives corresponding to no-cache, frame denial, content-type protection, XSS protection, and a Content Security Policy. The CSP text allowed same-origin/data/blob resources, a chatbot frame, inline styles, and inline/eval script execution.

Two cautions:

1. A meta element is not the same evidence as an HTTP response header. Actual response headers were not established in this inspection.
2. “unsafe-inline” and “unsafe-eval” materially weaken the defensive value of CSP, but do not by themselves prove a vulnerability.

### Session and consistency model

The resume journey proves durable draft state exists beyond one page. The smallest consistent model is:

- a browser session and anti-forgery/form-state context;
- a durable draft keyed by Temporary Application ID;
- transition to a submitted case keyed by Application ID;
- payment state that can temporarily disagree with the bank;
- asynchronous scrutiny and document-version states;
- an ETA/decision record read by status and border systems.

Whether sessions are stored in memory, a database, distributed cache, or signed cookies is unknown. JavaScript's visible cookie string cannot reveal HttpOnly cookies and should not be used to conclude that no session cookie exists.

---

## 19. Infrastructure and operations

### Established facts

- The service is under the indianvisaonline.gov.in government domain.
- The portal says it is managed by the Bureau of Immigration/MHA.
- The portal credits NIC for design/development.
- Official IVFRT material describes central processing and data-centre capabilities.
- The 2026 programme funds core architecture, data centres, network/deployment, resilience, scalability, mobile services, and kiosks.

### Reasonable but unverified components

At this scale, the service needs equivalents of:

- traffic termination and routing;
- multiple application instances or another availability strategy;
- persistent relational/case storage;
- document storage;
- backup and disaster recovery;
- asynchronous jobs for email, reconciliation and workflow;
- audit logging;
- operational monitoring and alerting;
- privileged administrative and reviewer access;
- configuration/policy deployment.

These are architectural necessities, not evidence of a particular cloud, database, queue, WAF, CDN, or observability vendor.

### Exact unknowns

Public inspection does not establish:

- cloud vs government data centre placement;
- number and geography of sites;
- load balancer, reverse proxy, CDN, or WAF;
- OS, container, VM, or bare-metal model;
- database engine and replication;
- cache and queue products;
- file-store technology;
- network zones and service-to-service authentication;
- deployment pipeline and release cadence;
- SLOs, peak throughput, capacity model, or autoscaling;
- backup RPO/RTO and disaster-recovery tests;
- logging/APM/SIEM stack.

The hard-coded IP allowed by the markup's object-source policy is a sign of a legacy dependency/configuration, not enough information to map the private network.

---

## 20. Security, privacy and abuse analysis

This is a defensive threat model based only on public behavior.

### Security-relevant controls visible from outside

- HTTPS.
- CAPTCHA on case creation and public lookup/recovery surfaces.
- hidden token/form-state fields.
- autocomplete/no-cache intentions.
- external payment gateways, reducing direct card-data handling by the visa portal.
- final biometric and officer verification at arrival.
- separate identifiers for drafts and submitted cases.

The strength, consistency, and server-side enforcement of these controls were not penetration-tested and cannot be inferred from their presence.

### Primary assets

- applicant identity and passport data;
- family, address, reference, travel, health, legal, and political-risk declarations;
- supporting PDFs and photograph;
- decision/reviewer history;
- payment references;
- ETA artifacts;
- biometric and entry/exit records in the wider IVFRT system;
- rule and clearance data;
- reviewer/admin credentials and audit trails.

### Threat and control requirements

| Threat class | Risk in this domain | Required defensive property |
|---|---|---|
| Case enumeration/IDOR | Public status and recovery routes operate on IDs plus personal facts | High-entropy IDs, generic errors, strong server authorization, rate limits, anomaly detection |
| Draft theft or tampering | Temporary ID resumes a sensitive draft | Expiry, secondary verification, step-up for changes, immutable audit |
| Cross-site scripting | Large inline/eval-capable browser code and sensitive form context | Output encoding, strict sanitization, nonce/hash CSP, dependency governance |
| Request forgery/replay | Form posts, payment returns, re-upload actions | CSRF protection, signed/expiring state, idempotency, replay rejection |
| Malicious document | Applicants upload PDFs/JPEGs | Type/magic validation, AV/CDR sandboxing, limits, safe rendering, no direct browser execution |
| Payment spoof/double charge | Redirect, callback loss and retries | Signed callbacks, idempotent order state, reconciliation, visible pending state |
| PII leakage | Extensive data can reach logs, analytics, URLs, email, support | Data minimization, redaction, no secrets in URLs, encrypted channels/storage, retention controls |
| Insider misuse | Reviewers need access to highly sensitive cases | Least privilege, case-based access, maker-checker, immutable audit, monitoring |
| Credential compromise | Reviewer/admin access can alter immigration outcomes | Phishing-resistant MFA, managed devices, PAM, short sessions |
| Availability attack | Time-bound travel applications and payment create urgency | Rate limiting, isolation, queues, graceful degradation, tested recovery |
| Policy tampering | A bad rule can wrongly permit/block whole nationalities/categories | Signed/versioned policy, approvals, simulations, rollback, audit |
| Supply-chain compromise | Multiple old browser libraries and custom scripts | Asset inventory, SCA, pinned builds, integrity controls, rapid patching |

### Privacy-specific observations

- The health gate collects identity and exposure/symptom information before the main application.
- The site asks for more than identity: it collects family, references, travel history, legal/security declarations and numerous supporting records.
- Separate recovery pages reproduce sensitive case access at several points.
- A prominent end-to-end privacy/retention explanation was not observed in the inspected application flow; that is not proof that no policy exists elsewhere.
- Public information does not reveal retention, deletion, applicant-access, correction, cross-agency sharing boundaries, or biometric governance.

The service operates under India's immigration legal framework, including the Immigration and Foreigners Act 2025 and related Rules/Orders listed by MHA. A full privacy/compliance opinion would require the actual data flows, notices, contracts, retention schedules, and applicable data-protection commencement rules. See [MHA's acts, rules and regulations page](https://www.mha.gov.in/en/divisionofmha/foreigners-division/acts-rules-and-regulations-pertaining-foreigners-division).

---

## 21. Accessibility, internationalization and device behavior

This was not a formal WCAG audit, but the inspected implementation exposes risks:

- no language attribute or modern viewport metadata was observed on the registration document;
- fixed-width enhanced selects can overflow small screens;
- modal gating and suppressed Escape/Back/refresh behavior can trap users;
- CAPTCHA creates visual/cognitive/access barriers unless an equivalent accessible path exists;
- JavaScript-only requiredness and error handling can be poorly announced by screen readers;
- disabling paste harms assistive workflows and increases retyping errors;
- dropdowns contain very long, domain-heavy options;
- the process is primarily English and requires all documents in English;
- date formats, names, addresses and passport conventions vary globally;
- a multi-page process on unstable international/mobile connections needs reliable autosave and explicit recovery.

The landing page claims compatibility with modern browsers plus legacy Internet Explorer 9 and Adobe Reader 7-era requirements. That breadth is another sign of a long-lived front end with compatibility constraints.

---

## 22. Reliability and performance

### Observable pressure points

1. **Very large registration response.** A 1.41-million-character page and 1.27 million characters of inline script increase transfer, parse, compile and memory cost.
2. **Client-heavy policy matrix.** Hundreds of duplicated branches increase the chance that one browser path diverges from server/reviewer policy.
3. **Full-page POST flow.** Network or validation failure can cost an entire step unless draft state is committed carefully.
4. **Browser navigation suppression.** Back/F5 interception can turn recoverable navigation into confusion.
5. **Strict file limits.** Applicants must resize/compress official documents before upload, often on mobile.
6. **Asynchronous payment truth.** The gateway can charge the user before the portal recognizes success.
7. **Email dependency.** Scrutiny and ETA communication can be delayed or filtered.
8. **Fragmented recovery.** Users must know which ID and personal-data tuple belongs to which recovery page.
9. **Time-bound policy.** Arrival windows, country eligibility, ports and fees change frequently.
10. **Global traffic.** Latency and connectivity vary widely; travel deadlines create bursts and support urgency.

### Required operational behaviors

A robust system needs:

- idempotent submissions;
- step-level autosave with visible saved time;
- resumable/chunk-safe uploads or at least retry without losing the form;
- pending payment as a first-class state;
- automated bank reconciliation;
- transactional outbox or equivalent for reliable email/events;
- policy-version pinning per application;
- immutable audit history;
- graceful degradation when downstream clearance/payment systems are unavailable;
- operational dashboards by stage, nationality, purpose, gateway and error class;
- synthetic end-to-end monitoring that does not create real cases;
- tested disaster recovery.

Whether the existing backend implements these mechanisms is unknown.

---

## 23. Content and configuration drift

The public system contains several independently maintained representations of the same policy.

| Topic | Conflicting public representations observed |
|---|---|
| Category count | Landing “admissible” list, detailed instructions, PIB descriptions, and the granular form do not use one consistent count/taxonomy |
| Eligibility countries | The portal's numbered list contains 174 positions and a duplicated Kenya entry, while 2026 government releases describe 175 countries |
| Ports | A 10 August 2026 official release says 88 ports: 37 airports, 38 seaports, 13 land ports; the live form inspected on 21 August exposed 85 selectable ports: 36, 38, 11 |
| Document size | Official landing/sample material says 300 KB for PDFs; another official upload page has said 500 KB |
| Purpose count | The initial form showed 67 selectable purposes; its delivered document-rule code referenced 102 distinct purpose codes |
| Recency | The landing footer says last updated in 2019 even though it contains categories and rules added years later |
| Sample journey | The official eight-page sample PDF depicts older categories, screens and file limits |

The current 88-port total is in the [10 August 2026 PIB release](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2297227&lang=2&reg=48). The mismatch eleven days later suggests release/configuration propagation lag or different definitions—not necessarily that any one backend table is wrong.

### Root cause pattern

This is the most important systemic diagnosis:

> Policy appears to be copied into multiple surfaces—content, dropdown configuration, generated JavaScript, validation, document instructions, sample PDF, reviewer practice, and external announcements—without one public, versioned source of truth.

That pattern explains more friction than visual design alone.

---

## 24. Friction mapped to likely technical causes

| User-facing friction | Likely underlying cause |
|---|---|
| “Which visa do I choose?” | Granular policy taxonomy exposed as long purpose labels instead of a guided eligibility decision |
| Conflicting requirements | Multiple policy copies and delayed publication/configuration propagation |
| Long repetitive form | Case schema organized around agency review rather than progressive applicant questions or reusable identity |
| Lost work/navigation anxiety | Multi-page POSTs, browser controls, weak saved-state feedback |
| File rejected | Strict size/format rules, unclear preflight, unknown difference between technical validation and manual scrutiny |
| Payment deducted but unpaid | Distributed transaction across portal and external gateway with delayed reconciliation |
| No clear next action | Status values spread across payment, scrutiny, re-upload, ETA and print surfaces |
| Re-entering IDs and personal facts | Accountless recovery design and fragmented routes |
| Unclear decision delay | Hidden review/clearance queue and limited stage-level status |
| Mobile difficulty | Fixed-width/legacy controls, dense forms, upload preparation on phones |
| Helpdesk dependency | Errors describe the failure rather than resolving it in context |

---

## 25. What is definitely not knowable from the public site

The following claims would be speculation unless the government supplies architecture documents, code, or authorized interviews:

- exact programming language and backend framework;
- exact source repositories and build pipeline;
- database product, tables and query patterns;
- internal service boundaries or whether it is a monolith;
- reviewer application and roles;
- screening/watch-list sources and matching algorithms;
- OCR, face matching, fraud scoring, or other automation;
- payment message schema and signing;
- API gateway, WAF, CDN, load balancer, network zones;
- cloud/data-centre placement and topology;
- encryption algorithms, key management, secrets storage;
- document malware-scanning/sanitization controls;
- RBAC/ABAC and privileged-access implementation;
- full audit schema;
- retention and deletion;
- observability stack, SLOs and incident history;
- backup/DR objectives and test results;
- throughput, peak concurrency and unit costs.

The correct next step for any of those is an authorized technical discovery session with BoI/NIC/MHA, not deeper scraping.

---

## 26. Implications for a hackathon proof of concept

The [Build What Moves India brief](https://buildwhatmovesindia.com/brief) and [FAQ](https://buildwhatmovesindia.com/faq) require a proof of concept and prohibit unauthorized reverse engineering of private systems. The safe and persuasive boundary is therefore:

- use synthetic applicants and documents;
- do not connect to or automate the live e-Visa endpoints;
- do not present the prototype as an official government service;
- model payments, screening, review, email, APIS and biometrics as explicit mocked adapters;
- keep the policy engine versioned and data-driven;
- demonstrate an applicant journey and a reviewer/operations view without claiming access to the real backend;
- show exactly where an authorized production integration would attach.

The best technical thesis is not “a prettier form.” It is:

> A policy-as-data application orchestrator that asks only applicable questions, preflights evidence before submission, makes saved/payment/review state explicit, and integrates with IVFRT through controlled adapters.

That thesis targets the actual architectural source of the friction while staying within a credible proof-of-concept scope.

---

## 27. A clean reference architecture for modeling the POC

This section is a reference model, not a description of the current implementation.

| Component | Responsibility |
|---|---|
| Applicant web app | Guided interview, localization/accessibility, save/resume, status timeline |
| Application orchestrator | Step transitions, completeness, idempotency, policy-version pinning |
| Versioned policy service | Eligibility, purpose, duration, port, document and fee rules with human-readable reasons |
| Case service | Draft/submitted case, applicant data, references, declarations |
| Document service | Direct upload, preflight, malware/safe-render boundary, versions, review state |
| Payment adapter | Mock gateway in POC; idempotent intent/result/reconciliation interface |
| Review workbench | Synthetic cases, document compare, query/re-upload, grant/reject simulation, audit |
| Notification service | Mock email/event templates and delivery state |
| ETA service | Synthetic authorization artifact and status |
| Integration adapters | Mock MHA/MEA/NSWS/APIS/IVFRT/biometric contracts |
| Audit/observability | Append-only action history, metrics, trace/correlation ID, privacy-safe logs |

Key domain events could include:

- DraftCreated
- StepSaved
- EligibilityEvaluated
- RequirementsCalculated
- DocumentUploaded
- ApplicationSubmitted
- PaymentPending
- PaymentConfirmed
- PaymentReconciliationRequired
- ScrutinyStarted
- ReuploadRequested
- DocumentReplaced
- DecisionRecorded
- ETAIssued
- ETARevoked
- ArrivalChecked
- EntryRecorded
- ExitRecorded

An event list is useful even if the POC remains a modular monolith. It forces explicit state and prevents “payment succeeded but UI says unpaid” from becoming an unmodelled exception.

---

## 28. Technical discovery questions for an authorized government workshop

If the project reaches BoI/NIC/MHA reviewers, these are the highest-value questions:

1. Which system is authoritative for eligibility, purpose, port, duration, fees and documents?
2. How are policy changes authored, approved, tested, versioned and rolled back?
3. Is the 1.16-million-character document rule generated? From what source?
4. Where does a Temporary Application ID live, and what is its retention/expiry?
5. Which validation happens in the browser, portal backend and reviewer system?
6. How are uploaded files scanned, normalized, stored, versioned and rendered safely?
7. What are the actual adjudication states, queues, routing rules and clearance dependencies?
8. Which checks are automatic, manual or hybrid?
9. What information may safely be exposed as stage-level status to the applicant?
10. How do SBIePay/Axis callbacks, polling and settlement reconciliation work?
11. Which cases cause payment to detach from an application, and how are they repaired?
12. What is the contract between e-Visa, the Unique Case File and the border system?
13. How is APIS matched to ETA/passport/application identity?
14. What happens when passport data changes after ETA issuance?
15. What are the retention and access rules for drafts, rejected cases, documents and health data?
16. What are the peak volumes, latency budgets, SLOs and top incident categories?
17. Which browsers/devices/languages/accessibility standards are required now?
18. Which modernization interfaces are planned under IVFRT 2026–2031?

These questions convert a hackathon prototype into a serious institutional conversation.

---

## 29. Public route and client-asset inventory

This inventory records only routes and assets delivered to an ordinary applicant browser. It is useful for understanding the application shape; it is not an invitation to automate or probe the live service.

### Applicant-facing routes

| Relative path | Role |
|---|---|
| /evisa/tvoa.html | Main e-Visa landing, policy, instructions, FAQs, payment and port information |
| /evisa/Registration | Health gate and initial application registration |
| /evisa/CompletePartially | Resume a saved draft |
| /evisa/PaymentCheck | Verify/pay and generate fee receipt |
| /evisa/PrintApplication | Reprint/print-related flow |
| /evisa/StatusEnquiry | Application/payment/ETA status |
| /evisa/ReuploadData | Start replacement document/image flow |
| /visa/DocumentUpload | Official upload specifications/information |
| /evisa/images/SampleForm.pdf | Official sample application journey |

All inspected recovery forms were server-rendered POST forms with CAPTCHA. Registration and recovery pages included opaque hidden token/form-state values.

### Same-origin JSON operations visible in registration code

| Operation name | Apparent responsibility from its caller |
|---|---|
| json/evisaServiceAllowed | Return nationality-dependent allowed service IDs |
| json/fetchServiceDuration | Return normal service-duration choices |
| json/fetchSpecialServiceDuration | Return special duration choices |
| json/fetchDurationEntryFees | Return/display duration, entry and fee description for selected context |
| json/fetchVisaServiceRegis | Return service choices by mission/visa/nationality context |
| json/saveGateKeep | Persist health-gate identity and answers |

The input/output meanings above come from public caller logic. No attempt was made to enumerate data, bypass controls, submit a real case, or characterize backend authorization.

### Named browser assets observed

| Asset family | Examples |
|---|---|
| Core libraries | jquery.js, jquery-ui.js, bootstrap.js |
| Select and UI helpers | chosen.jquery.js, owl.carousel.js, easyResponsiveTabs.js |
| Other library | prism.js |
| Application logic | declarations.js, blur_functions.js, submit_functions.js, custom.js |
| Styles | bootstrap.css, Online_tvoa.css, Chosen/Prism/jQuery UI styles, e-Visa-specific CSS |

Several application scripts carried revision query parameters, which is a basic cache-busting mechanism. The enormous generated document-rule function was inline rather than a separately cacheable asset in the inspected response.

### Public HTML contract details

- Registration used method POST and autocomplete off.
- Passport input in the health gate accepted up to 14 characters.
- Name accepted up to 100 characters.
- Initial email fields accepted up to 50 characters and were ordinary text inputs.
- The CAPTCHA input accepted up to six characters.
- The resume page accepted a Temporary Application ID up to 15 characters.
- Payment/status/re-upload surfaces accepted a 12-character Application ID.
- Passport lookup inputs accepted up to 14 characters.
- Expected arrival was a read-only text field controlled by a date picker.
- The inspected nationality selector had 177 selectable values plus its placeholder.
- The inspected passport-type selector had five choices plus its placeholder.
- The inspected purpose selector had 67 choices plus its placeholder.
- The inspected port selector had 85 choices plus its placeholder.

These are browser contract limits, not proof of database column sizes. Correct server validation may be stricter or normalize values differently.

---

## 30. Source set

### Primary official sources

- [Indian e-Visa portal](https://indianvisaonline.gov.in/evisa/tvoa.html)
- [Official e-Visa sample application PDF](https://indianvisaonline.gov.in/evisa/images/SampleForm.pdf)
- [Official document-upload guidance](https://indianvisaonline.gov.in/visa/DocumentUpload)
- [MHA e-Visa page](https://www.mha.gov.in/en/commoncontent/e-visa)
- [MHA Foreigners Division](https://www.mha.gov.in/en/divisionofmha/foreigners-division-1)
- [MHA acts, rules and regulations](https://www.mha.gov.in/en/divisionofmha/foreigners-division/acts-rules-and-regulations-pertaining-foreigners-division)
- [IVFRT continuation, 25 March 2026](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2245101)
- [88 authorized e-Visa ports, 10 August 2026](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2297227&lang=2&reg=48)
- [Historical IVFRT central processing office description](https://www.pib.gov.in/newsite/PrintRelease.aspx?relid=84440)
- [Historical IVFRT project description](https://www.pib.gov.in/newsite/PrintRelease.aspx?relid=84483)
- [MHA APIS page](https://www.mha.gov.in/en/divisionofmha/foreigners-division/advance-passenger-information-system-apis)
- [MHA conference FAQ and central-database behavior](https://conference.mha.gov.in/events/FAQ.aspx)
- [e-Production Investment Visa sponsorship module](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2205592)
- [2026 international-arrivals/e-Visa context](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2223763)

### Product brief

- [Build What Moves India brief](https://buildwhatmovesindia.com/brief)
- [Build What Moves India FAQ](https://buildwhatmovesindia.com/faq)

### User-friction corroboration

These do not establish architecture; they corroborate recurring symptoms such as crashes, validation/upload trouble and confusing recovery:

- [Reddit: e-Visa website always crashing](https://www.reddit.com/r/travel/comments/1plnlwh/india_evisa_website_always_crashing/)
- [Reddit: e-Visa website challenges](https://www.reddit.com/r/visas/comments/1lkaov6/india_evisa_website_challenges/)
- [Reddit: application website issue](https://www.reddit.com/r/visas/comments/1i7kte9/india_evisa_application_website_issue/)
- [Tripadvisor: photograph upload problems](https://www.tripadvisor.com/ShowTopic-g293860-i511-k14096481-Can_t_upload_photo_on_Indian_e_visa-India.html)
- [Tripadvisor: PDF upload problems](https://www.tripadvisor.com/ShowTopic-g293860-i511-k14573960-Help_E_visa_application_pdf_not_uploading-India.html)

---

## Final assessment

The Indian e-Visa service is a compelling modernization target because its visible friction comes from real systems complexity: policy volatility, cross-ministry evidence, sensitive identity data, resumable state, untrusted file intake, distributed payment, human scrutiny, asynchronous communication, border authentication, and central immigration records.

The current public front end exposes that complexity directly to the applicant and appears to encode a substantial part of the policy as large, duplicated browser logic. The surrounding IVFRT system is much larger and more consequential than the site, and its private internals should not be guessed. A winning proof of concept should therefore demonstrate mastery of the full system boundary while rebuilding only the public orchestration layer with synthetic integrations.
