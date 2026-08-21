# Project Instructions

## Purpose and source of truth

- This project is a hackathon proof of concept reimagining India’s e-Visa experience.
- `docs/evisa-system-dissection.md` is the authoritative system-reference document.

## Safety boundaries

- Use synthetic data only.
- Never connect to, submit data to, scrape, or automate the live government, payment, APIS, biometric, or IVFRT systems.
- Never present inferred private architecture as fact.
- Keep external systems behind mock adapters.

## Product and architecture principles

- Represent eligibility, documents, fees, dates, and visa conditions as versioned policy data—not hard-coded UI branches.
- Model application, document, payment, scrutiny, and ETA states explicitly.
- Prioritize mobile usability, accessibility, privacy, security, and clear failure recovery.

## Working practices

- Plan before implementing; make small, reviewable changes.
- Add and run appropriate tests, linting, and type checks for every implementation task.
- Show changes and verification results after each task.
- Never commit unless explicitly instructed.
