# Representative-user validation plan

Run this plan in a non-production clinic with synthetic patients. Capture the tester role, build digest, case ID, expected/actual result, and sign-off. Launch remains externally blocked until a licensed dentist, front-desk representative, privacy officer, security owner, and accessibility tester approve the results.

## Acceptance scenarios

1. A receptionist imports a valid FHIR Patient and consent artifact. The same identity maps to the same patient; the exact duplicate import is rejected.
2. A receptionist can see queue metadata but no name, clinical recommendation, allergies, policy numbers, or notes.
3. A dentist from another clinic cannot list, fetch, alter, or decide the case, even with a valid case ID.
4. An author cannot approve their own recommendation. An independent dentist can approve a low-risk case with rationale.
5. Blank allergy and medication status produces high risk and cannot be approved. The handoff stays pending until escalated or rejected.
6. Penicillin allergy plus amoxicillin, anticoagulant plus extraction, renal disease plus NSAID, and pregnancy plus tetracycline each trigger a critical contraindication.
7. A hygienist cannot decide high/critical cases. An independent dentist can escalate them and the reason remains visible in the audit trail.
8. Expired consent is rejected at intake. Revoked consent cannot be reused for a future import.
9. Invalid FHIR shape, missing identity, malformed dates, duplicate provider responses, database unavailability, and encryption-key mismatch fail closed without PHI in logs.
10. Two simultaneous decisions on one review produce one final decision and one HTTP 409; no double approval is created.
11. Keyboard-only and screen-reader users can complete intake, understand the safety warning, inspect risk, and record a decision.
12. Backup restore recovers ciphertext, consent, decision, and audit events; audit-chain verification and retention timestamps remain valid.

## Exit criteria

All automated checks and every scenario above pass; no critical/high security finding remains; recovery objectives are measured; operational owners and escalation contacts are named; the licensed clinical owner approves contraindication rules and wording. Record residual risks rather than relabeling them as passed.
