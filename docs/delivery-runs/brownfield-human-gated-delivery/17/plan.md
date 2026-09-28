# Implementation plan

## Acceptance mapping

| Acceptance scenario | Planned coverage |
|---|---|
| AC-1 | TASK-1 defines the healthy-readiness assertions; TASK-3 adds the dynamic readiness route; TASK-4 verifies the exact success contract. |
| AC-2 | TASK-1 covers initialization failure and singleton retry behavior; TASK-3 handles initialization exceptions; TASK-4 verifies the exact unavailable response. |
| AC-3 | TASK-1 covers a throwing `summary()`; TASK-3 handles read exceptions; TASK-4 verifies the unavailable response. |
| AC-4 | TASK-1 asserts one fixed sanitized log entry per failure; TASK-3 implements bounded generic logging; TASK-4 checks that sensitive exception content is absent. |
| AC-5 | TASK-1 covers failure followed by successful repair; TASK-3 performs per-request evaluation; TASK-4 verifies recovery without cached failure state. |
| AC-6 | TASK-1 covers successive successful requests; TASK-3 performs the accessor and summary call for every request; TASK-4 verifies call counts and uncached results. |
| AC-7 | TASK-1 covers health and readiness during database failure; TASK-3 leaves liveness untouched; TASK-4 verifies the exact contracts together. |
| AC-8 | TASK-1 covers unchanged application behavior and populated ownership data; TASK-4 runs the 37-test baseline and affected application checks; TASK-7 validates the healthy UI. |
| AC-9 | TASK-1 exercises first-use schema creation, nullable ownership migration, and seeding in isolated file-backed databases; TASK-4 verifies readiness only after a successful summary. |
| AC-10 | TASK-1 captures complete rows before and after repeated probes using a fresh observer; TASK-4 verifies every persisted field remains identical. |
| AC-11 | TASK-1 covers an invalid database location, including `/dev/null/service-desk.db`; TASK-4 and TASK-7 verify exact readiness, liveness, and sanitized logging behavior. |
| AC-12 | TASK-1 builds the guarded route-existence assertions; TASK-2 records controlled Red evidence and the exact expected-failure manifest. |
| AC-13 | TASK-1 applies the corrected hook, SQLite-observer, and cleanup patterns; TASK-2 reviews their behavior during Red; TASK-4 confirms them during Green. |
| AC-14 | TASK-5 updates and checks the application runbook. |
| AC-15 | TASK-7 validates one immutable image digest in separate healthy, fault-injected, and repaired conditions. |
| AC-16 | TASK-6 reviews the repository and lifecycle boundaries; TASK-7 preserves accepted volumes and prior evidence during delivery validation. |

## Tasks

### TASK-1: Add the corrected readiness contract tests

Depends on: none  
Acceptance: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13  
Surfaces: the IT service desk's existing direct-module Vitest tests, route modules for `/api/health` and the proposed `/api/ready`, existing ticket-store test helpers, SQLite fixtures, and the run-specific expected-failure manifest  
Validation: inspect the new readiness test file for all required assertions, guarded dynamic imports, non-returning `beforeEach`, fresh or schema-refreshed SQLite observation, and cleanup that closes every test-owned handle

Create one new readiness test file using the application's existing direct-module route conventions; do not introduce an HTTP server harness. Define named scenarios covering exact status codes, exact JSON bodies, `Cache-Control: no-store`, accessor and `summary()` invocation, initialization failure, summary-read failure, sanitized fixed logging, failure-to-success recovery, successive successful reads, dynamic route evaluation, unchanged liveness, invalid storage configuration, and existing healthy behavior.

Add real isolated file-backed cases for first-use schema creation, nullable ownership migration, seeding, and complete-row non-mutation. Capture all supported fields before repeated readiness probes and compare them with data obtained afterward through a newly opened read-only connection or an explicit schema refresh. Close observers, stores, temporary database handles, and other test-owned resources in cleanup.

In every named pre-implementation scenario, first assert route existence inside the test body and only then perform a guarded dynamic import. Use a block-bodied `beforeEach` that returns no mock or cleanup value. Review the deeper test bodies for asynchronous lifecycle, singleton isolation, stale SQLite metadata, and observer reuse defects before freezing the Tests-stage evidence.

### TASK-2: Establish controlled Red evidence

Depends on: TASK-1  
Acceptance: AC-12, AC-13  
Surfaces: the new readiness Vitest file, existing test runner configuration, and the run-specific expected-failure manifest  
Validation: run the readiness test file before production implementation and confirm each recorded failure is an in-test route-existence assertion failure, with no import, collection, hook, startup, cleanup, or skipped-test substitute

Execute the new test file while `/api/ready` is absent. Record every and only the actually observed assertion-failing test names in the expected-failure manifest. Do not predict names, carry forward Intent #8 results, or count failures caused by collection, guarded import, setup, cleanup, startup, or skipped execution.

Confirm that the corrected `beforeEach` does not register a mock as Vitest cleanup, all test-owned handles close, and the file-backed cases can reach their route-existence assertions without stale SQLite observer metadata. If an isolated pre-approval harness experiment is used against the unmerged candidate from PR #14, label and retain it only as harness evidence; it is not controlled stage Green, production delivery, or permission to place production code in the Tests commit.

### TASK-3: Implement per-request database readiness

Depends on: TASK-2  
Acceptance: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-11  
Surfaces: the IT service desk Node.js API route components, the existing `getTicketStore()` accessor, the existing ticket-store `summary()` operation, and application logging  
Validation: exercise the route module directly for success, initialization failure, summary failure, recovery, and successive requests; verify exact responses, call counts, no-store headers, and sanitized logging

Add `/api/ready` following the existing API-route structure. On every request, call the unchanged `getTicketStore()` accessor and then `summary()`. Return HTTP 200 with exactly `{"status":"ready"}` only after both operations succeed, and attach `Cache-Control: no-store`.

Catch initialization and summary-read exceptions at the readiness boundary. For each failed request, emit exactly one fixed, bounded, generic readiness-failure message and return HTTP 503 with exactly `{"status":"unavailable"}` and `Cache-Control: no-store`. Do not interpolate, serialize, or otherwise expose the exception, path, credentials, ticket contents, or stack trace.

Do not cache readiness results, retain failed initialization state, add a second store abstraction, add a standalone `SELECT 1`, or modify the accessor's singleton assignment behavior. Leave `/api/health` unchanged and database-independent.

### TASK-4: Verify Green behavior and data compatibility

Depends on: TASK-3  
Acceptance: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-13  
Surfaces: the new readiness tests, all 37 baseline tests, ticket-store initialization and migration components, dashboard and ownership components, and isolated SQLite test databases  
Validation: obtain a fully passing readiness test file and baseline suite, with no expected-failure entries remaining applicable and with complete persisted-row comparisons passing

Run the frozen readiness tests against the implementation and verify that the same scenarios captured during controlled Red now pass for the intended behavior rather than through changed or weakened assertions. Confirm both initialization and read failures return the exact unavailable contract and only the fixed generic log message, while later requests retry the accessor and summary path.

Verify normal first use can still create the schema, apply the existing nullable ownership migration, and seed data. After initialization, perform repeated probes and compare every row and supported field through a fresh read-only observer or explicit schema refresh. Confirm no readiness-specific schema or data migration is introduced.

Run all 37 baseline tests and the applicable application checks to establish compatibility with ownership, dashboard, persistence, and liveness behavior. Any necessary correction to a frozen readiness test requires returning to controlled Red evidence rather than editing tests merely to obtain Green.

### TASK-5: Document readiness operation and recovery

Depends on: TASK-3  
Acceptance: AC-14  
Surfaces: the IT service desk application README and its existing local operation, configuration, and troubleshooting sections  
Validation: follow the documented commands and recovery sequence in an isolated local setup, and review the text for exact endpoint contracts and absence of instructions to disclose private values

Document `/api/health` as database-independent HTTP 200 with exactly `{"status":"ok"}` and `/api/ready` as dynamically evaluated readiness with the exact ready and unavailable bodies, status codes, and `Cache-Control: no-store`.

Add local commands for both endpoints, generic failure diagnosis, private inspection of database configuration, storage access repair, and restart when required. Include isolation warnings, prohibit use of accepted volumes for fault injection, and state the local-demo/non-production limitations. Keep sensitive paths, credentials, ticket data, and exception details private rather than instructing operators to paste them into logs or reports.

### TASK-6: Enforce delivery compatibility boundaries

Depends on: TASK-4, TASK-5  
Acceptance: AC-8, AC-16  
Surfaces: the complete proposed change set, application dependency manifests and lockfiles, shared automation, infrastructure configuration, lifecycle artifacts, ownership behavior, and accepted-volume references  
Validation: review the final diff and repository status to confirm that only readiness tests, the readiness route, and related application documentation changed

Confirm that the delivery introduces no dependency, shared automation, infrastructure, authentication, metrics, alerting, review-policy, ownership-contract, or accepted-volume change. Preserve all prior artifacts, branches, pull requests, run records, and evidence.

Confirm the implementation does not alter `/api/health`, the existing accessor, ownership tests, or unrelated application behavior. Treat any consequential requirement that cannot be met inside these boundaries as a specification conflict requiring an explicit Human-approved Spec revision, not as authority to expand implementation scope.

### TASK-7: Validate the published immutable image

Depends on: TASK-6  
Acceptance: AC-8, AC-11, AC-14, AC-15, AC-16  
Surfaces: the published IT service desk image, separate isolated runtime instances, readiness and health endpoints, application logs, dashboard and ownership UI, persisted ticket data, and the documented recovery procedure  
Validation: record digest-bound observations from healthy, fault-injected, and repaired instances using the same immutable image digest and no accepted volume

After protected merge and publication, start separate healthy and deliberately fault-injected instances from the same immutable digest. Do not attach, copy, or modify an accepted volume. Use the specified invalid storage condition, including `/dev/null/service-desk.db`, only in an isolated instance.

Verify healthy readiness is HTTP 200 with exactly `{"status":"ready"}`, faulted readiness is HTTP 503 with exactly `{"status":"unavailable"}`, both include `Cache-Control: no-store`, and health remains HTTP 200 with exactly `{"status":"ok"}` in both instances. Confirm each failed probe emits exactly one fixed sanitized message without revealing the configured path or other sensitive content.

On the healthy instance, repeat readiness probes, inspect populated ownership rows without mutation, and exercise the dashboard and ownership UI. Follow the documented storage repair and restart procedure for the faulted instance and verify a later readiness request succeeds. Submit digest-bound development-test acceptance only after all observations pass; do not represent the result as production certification, an SLO, independent Human review, or Demo Ready status.

## Risks and migrations

- **False Red evidence:** A missing module, setup failure, returned mock cleanup, or skipped test could appear to establish Red without testing behavior. TASK-1 and TASK-2 require an in-body route-existence assertion for every named scenario and an exact observed-failure manifest.
- **Stale SQLite observation:** A connection opened before migration can retain obsolete `SELECT *` column metadata and produce misleading comparisons. File-backed tests must reopen a fresh read-only observer or explicitly refresh schema metadata after migration.
- **Leaked test resources:** Open SQLite handles can lock temporary databases or contaminate later scenarios. Every test-owned handle must be tracked and closed, including on failed assertions.
- **Singleton contamination:** Module caching or a failed initialization could make later tests and requests observe stale state. Tests must isolate modules as existing conventions require, while production continues using the unchanged accessor whose singleton is assigned only after successful construction.
- **Sensitive failure disclosure:** Logging the caught exception, passing it to a logger as metadata, or returning framework-generated details would violate the contract. The implementation and tests must enforce one literal generic message and exact response bodies.
- **Accidental data mutation:** Normal first use may create schema, apply the existing nullable ownership migration, and seed data, but later probes must be read-only in effect. Complete-row snapshots through a fresh observer provide the compatibility check.
- **Migration boundary:** No new readiness-specific database migration is proposed. Existing databases remain compatible through the current schema creation and nullable ownership migration paths; readiness invokes those paths only as normal store initialization already does.
- **Existing-data compatibility:** Populated ownership and ticket records must retain every supported field. Validation must include migrated, seeded, and populated file-backed databases rather than relying only on mocks or row counts.
- **Image drift:** Healthy and faulted checks against different builds would not prove the required behavior. Delivery validation must pin one immutable digest for all instances and resulting evidence.
- **Accepted-volume damage:** Fault injection against an accepted volume could destroy trusted evidence. All image validation must use newly isolated storage and preserve accepted volumes untouched.
- **Scope expansion:** Readiness work could inadvertently change liveness, dependencies, shared automation, or ownership behavior. TASK-6 makes the allowed boundary an explicit delivery gate.
- **Deferred claims:** The approved Spec explicitly does not establish a production incident, customer benefit, SLO, availability certification, independent Human review, or Demo Ready status. Successful testing or image validation must not be used to imply any of those outcomes.

## Validation

**Controlled TDD Red:** Run only the new direct-module readiness test file before `/api/ready` exists. Each named scenario must reach and fail its own route-existence assertion before guarded import. Review the output for zero collection, hook, startup, cleanup, or skip substitutes, then write the expected-failure manifest from the observed assertion-failing names only.

**Harness verification:** During Red and Green, confirm block-bodied `beforeEach` hooks return nothing, post-migration inspection uses a fresh read-only connection or explicit schema refresh, and every test-owned database handle closes. An optional isolated experiment against PR #14 may validate the harness but cannot replace either stage result.

**Green verification:** Run the unchanged readiness tests after implementation and verify exact statuses, bodies, headers, invocation counts, retries, fixed logging, sanitization, dynamic success and failure evaluation, first-use initialization, and complete-row non-mutation. Then run all 37 baseline tests and the repository-prescribed test, lint, and build checks for the IT service desk.

**Compatibility review:** Inspect the final proposed changes for modifications outside the readiness route, one new readiness test file and its required run evidence, and the application README. Verify dependencies, shared automation, infrastructure, authentication, metrics, alerting, review policy, ownership behavior, previous lifecycle artifacts, and accepted volumes remain unchanged.

**Published-image validation:** After protected merge and publication, use the same immutable digest for isolated healthy and fault-injected instances. Check exact readiness and liveness contracts, no-store headers, fixed sanitized logs, repeated-probe data preservation, dashboard and ownership UI behavior, and documented repair/restart recovery before submitting digest-bound development-test acceptance.

## Revision summary

This is the initial implementation-plan draft for Human Intent #17; no previous plan document was supplied, so there are no retained TASK identifiers to compare or behavior changes to enumerate.

The Human-approved Specification v1 is treated as the governing decision. Human decisions carried into this plan are the separate `/api/ready` endpoint, unchanged database-independent `/api/health`, per-request use of the unchanged `getTicketStore().summary()` path, exact response and logging contracts, corrected test-harness requirements, preservation of existing data and delivery boundaries, documentation scope, and same-digest isolated image validation. The explicit risk deferments and non-goals remain deferments and are not represented as resolved facts.

The task decomposition, TASK identifiers, dependency order, controlled Red/Green sequencing, and validation grouping are plan proposals for Human review. They do not revise the approved Spec, authorize implementation, approve delivery, or establish engineering handoff. Only explicit Human approval of this implementation-plan version permits that handoff.

## Open questions

None. The approved Spec declares no unresolved product choice, and the proposed plan does not identify a contradiction requiring Spec revision. The optional pre-approval harness experiment remains optional evidence rather than a delivery decision or substitute for controlled Red and Green validation.

