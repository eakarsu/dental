# Completeness Review: dental

**Review date:** 2026-07-18

## Assessment basis

Static inspection of project-owned source and configuration only; no dependency installation, build, database migration, external-service call, or runtime launch was performed. The scan considered 111 project files (65 source files), 1 manifest(s), 4 test-like file(s), and 0 CI workflow(s), excluding dependency/generated directories.

## Classification

**Functional but incomplete**

This is a substantive but unfinished healthcare/care operations application, not just an empty scaffold. Inspection found 65 source files across `app/`, `lib/`, `test-results/`, `tests/` using Next.js, React, Prisma; however, the checked-in workflow and delivery controls do not yet demonstrate a complete, production-operable product.

## Why it is not complete

- Mock, demo, sample, fixture, or placeholder behavior remains in executable/product paths.
- No checked-in CI workflow proves builds, tests, migrations, and security checks on every change.
- No environment template documents required configuration and secret boundaries.
- No clear deployment/container configuration demonstrates a reproducible production topology.

## Needed features

1. Integrate standards-based clinical/care data (for example FHIR where applicable) with identity matching and consent.
2. Add clinician/caseworker review boundaries, provenance, contraindication/safety checks, and escalation for uncertain output.
3. Implement field-level access control, audit history, retention, encryption, and regulated-data incident procedures.
4. Validate the intended workflow with representative users and test high-risk, missing-data, and handoff scenarios.
5. Add risk-based unit, integration, and end-to-end tests in CI, including migration and failure-path coverage.

## Risks or launch blockers

- Credential/configuration exposure: environment files are present in the repository tree and must be checked against Git history and rotated if real.
- Weak/fallback secret patterns can permit forged sessions or accidental insecure deployments.
- Automation contains destructive process, filesystem, or database operations; do not run it on a shared machine without review.
- Startup appears coupled to seed/migration behavior, risking data mutation or non-repeatable launches.

## Evidence inspected

- `docs/README.md`
- `docs/README.md:92`
- `start.sh:144`
- `app/layout.tsx`
- `tests/appointment.spec.js`
- `package.json`

## Recommended next action

Choose one real healthcare/care operations journey, define acceptance criteria and external contracts, then close its persistence, permission, integration, failure, and test gaps before expanding features.

## Implementation progress

Implemented the review’s source-actionable work on 2026-07-19 around one supported journey: **FHIR R4 Patient intake → deterministic identity match → recorded consent → safety screening → independent clinical decision/escalation**.

- Added persisted clinic tenancy to users and patients and tenant-scoped every patient, appointment, treatment, claim, dashboard, staff, message, and database-backed AI query. Receptionists receive field-redacted patient and clinical-review responses; cross-clinic records return not found.
- Added constrained standards-based FHIR Patient intake with source/version provenance, SHA-256 identity matching and payload digests, explicit active/expiring/revocable clinical-care consent, idempotent import identity, AES-256-GCM envelopes for FHIR payloads and recommendations, and fail-closed encryption-key validation.
- Added persisted clinical reviews with evidence, model/authoring provenance, deterministic contraindication checks, missing-data escalation, risk levels, immutable final decisions, independent-review separation, dentist-only high-risk handling, and a prohibition on approving high/critical output. The production dashboard now exposes intake, risk evidence, and decision controls with explicit decision-support warnings.
- Added hash-chained, retention-dated clinical audit events and persisted security-incident records. `docs/CLINICAL_GOVERNANCE_RUNBOOK.md` defines field access, key custody/rotation, audit retention, provider failure, backup/rollback, and regulated-data incident handling; `docs/CLINICAL_VALIDATION_PLAN.md` defines representative-user, high-risk, missing-data, tenant-isolation, race, accessibility, and handoff acceptance scenarios.
- Replaced the product-path sample inbox with tenant-scoped persisted message list/send/read/delete APIs and UI. Removed committed stale Playwright reports/results and stripped request, response, session, identity, and clinical-content logging from authentication and AI paths.
- Replaced the destructive interactive launcher (port killing, database dropping/pushing/seeding, package installation) with an explicit fail-closed `production|development|migrate` launcher. Added `.env.example`, a non-root multi-stage image, PostgreSQL compose topology, forward-only initial migration, and CI for generate/migrate/seed/typecheck/unit/lint/build/Chromium E2E/security audit.
- Upgraded Next.js from vulnerable 16.0.3 to 16.2.10 and Prisma to 7.8.0, repaired Zod 4 and MUI 7 type incompatibilities, and left no high/critical production dependency advisory. The six remaining audit notices are moderate transitive build-tool notices for which npm proposes unsafe framework/ORM downgrades; CI fails at high severity.

Validation evidence: Prisma client generation and TypeScript typecheck pass; 11/11 deterministic policy tests pass; ESLint completes with zero errors; the Next.js 16.2.10 production build emits all 39 routes; the 505-line initial migration applied, reset, and replayed cleanly on disposable PostgreSQL 14; and the Chromium HTTP E2E passed a real two-clinic persisted journey covering receptionist redaction, FHIR intake, cross-tenant list/decision denial, prohibited high-risk approval, dentist escalation, and double-decision conflict (1 review, 2 audit events, 1 FHIR import). `npm audit --audit-level=high` reports no high or critical advisory. The launcher syntax check passes and exits 78 without required secrets. Docker configuration was statically inspected; the local Docker daemon was unavailable.

External launch gates are explicit rather than simulated: a deploying clinic must supply secret-manager credentials and regulated-data infrastructure, configure database-level encryption/append-only privileges/backups/alerts, name incident and escalation owners, and obtain licensed dental, privacy, security, accessibility, and representative-user sign-off using the checked-in validation plan. Repository history contained placeholder connection strings but no tracked `.env` or OpenRouter-shaped credential; any real credential ever used outside the repository still requires owner-controlled rotation.

## Isolated startup and login verification (2026-07-20)

`start.sh` now requires an explicit assigned port, binds only to `127.0.0.1`, refuses occupied/default ports, performs no install/schema/seed mutation during launch, and supports validator-supplied test secrets without reading the project `.env`. Initial administrator creation is a separate acknowledgement-gated, non-overwriting command; broad demo seeding is not part of runtime bootstrap.

On disposable PostgreSQL at `127.0.0.1:55643`, the application started on API/full-stack port `6096`, authenticated the persisted provisioned administrator through Auth.js credentials, established a cookie session, and passed an authenticated session API probe. The first attempt was preserved as `FAILED/login_failed` because the generic checker rejected Auth.js v5's successful 302 callback; after correcting the checker to require the subsequent session proof, the retry recorded `API_VERIFIED/startup_login_session_api`. Typecheck, 11/11 unit tests, and the Next.js 16.2.10 production build also passed. All assigned listeners were released afterward.
