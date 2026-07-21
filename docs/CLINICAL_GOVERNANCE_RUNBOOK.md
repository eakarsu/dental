# Clinical governance and regulated-data runbook

## Supported journey

The production-supported high-risk journey is **FHIR R4 Patient intake → deterministic identity match → recorded clinical-care consent → safety screening → independent clinician decision**. The intake endpoint accepts only a constrained Patient resource, records source/version provenance and a digest, encrypts the source payload, and creates a review that cannot be approved by its author. Missing medication/allergy data escalates the record. Contraindications and high-risk cases cannot be approved and require a dentist.

This workflow is clinical decision support, not autonomous diagnosis or treatment. Before launch, the deploying clinic must complete the representative-user validation in `docs/CLINICAL_VALIDATION_PLAN.md` and have its clinical and privacy officers approve the configured rules, retention period, consent language, and escalation roster.

## Access and field boundaries

- Every user and patient belongs to one `Clinic`; API queries include the authenticated `clinicId`.
- `RECEPTIONIST` may record identity/consent intake but cannot read medical history, recommendations, contraindications, evidence, or provenance.
- `HYGIENIST` and `DENTIST` may read clinical records. High/critical decisions require `DENTIST`.
- `ADMIN` administers the clinic but cannot bypass independent review or approve high-risk output.
- Sensitive FHIR and recommendation bodies use AES-256-GCM with `REGULATED_DATA_KEY`. Database/storage encryption, TLS, backups, and key custody remain deployment responsibilities.

Rotate the data key using a controlled re-encryption job; do not simply replace it while ciphertext exists. Keep the old key offline until every row has been verified. Never log request bodies, decrypted payloads, access tokens, or patient identifiers.

## Deploy and migrate

1. Provision PostgreSQL with TLS, encrypted backups, point-in-time recovery, and a least-privilege application role.
2. Put `DATABASE_URL`, `AUTH_SECRET`, and `REGULATED_DATA_KEY` in the platform secret manager. `OPENROUTER_API_KEY` is optional and is never required for the governed workflow.
3. Run `./start.sh migrate` as a one-off release job. It only runs checked-in forward migrations.
4. Build the immutable image and run `./start.sh production`. Startup never installs packages, kills processes, resets, pushes, migrates, or seeds the database.
5. Verify tenant denial, field redaction, independent review, consent revocation, missing-data escalation, backup restore, alert delivery, and audit export in staging.

Rollback the application image independently of the database. Migrations are forward-only; restore from a tested backup if a data rollback is necessary.

## Audit and retention

Clinical events form a per-clinic SHA-256 hash chain and store a `retentionUntil` timestamp derived from `Clinic.retentionDays` (default seven years). Database roles must deny UPDATE/DELETE on `ClinicalAuditEvent` to the application role in production; use a dedicated retention job and authorized privacy role for expiry. Export and verify the hash chain before legal hold or archival. Consent revocation prevents future authorization but does not erase records subject to clinical/legal retention.

## Incident procedure

1. Page the clinic security/privacy leads; open a `SecurityIncident` without copying raw PHI into tickets.
2. Contain: revoke sessions and provider tokens, disable affected tenant/API paths, preserve database/audit/log snapshots, and record timestamps.
3. Determine clinics, subjects, fields, time window, and access paths. Verify the audit hash chain and infrastructure access logs.
4. Rotate exposed credentials and keys. Re-encrypt only through a reviewed, resumable migration with counts and digests.
5. Have privacy/legal owners determine regulatory and patient notification duties and deadlines; engineering must not make that determination.
6. Restore service only after tenant isolation, access tests, and clinical owner sign-off. Record corrective actions and close the incident with evidence.

## Provider failure

AI/provider calls fail closed and are not part of the governed workflow. Do not retry clinical requests blindly. Record a new review with explicit provenance after recovery. FHIR imports are idempotent on clinic, source, resource ID, and payload digest; a duplicate receives HTTP 409.
