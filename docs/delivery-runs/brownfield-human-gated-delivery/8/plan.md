# Implementation plan

## Acceptance mapping

| Acceptance | Planned coverage |
|---|---|
| AC-1 | TASK-1 defines the executable healthy-readiness Red assertion; TASK-2 implements a dynamic `GET /api/ready` handler that obtains the existing singleton `TicketStore` and invokes an existing ticket query; TASK-3 verifies the exact 200 response, header, and query invocation. |
| AC-2 | TASK-1 defines a genuine initialization/read failure fixture; TASK-2 maps thrown storage failures to the exact 503 contract; TASK-3 verifies the response and `no-store` header. |
| AC-3 | TASK-1 captures logging and injects sensitive exception content; TASK-2 emits only a fixed, bounded readiness-failure message; TASK-3 verifies that neither response nor log contains the injected path, credentials, ticket data, exception text, or stack trace. |
| AC-4 | TASK-1 defines a same-process failure-then-repair scenario; TASK-2 evaluates the accessor and query on every request without retaining a failed initialization; TASK-3 verifies a later request returns the recovered 200 result. |
| AC-5 | TASK-1 defines repeated-success assertions that count storage reads; TASK-2 disables route prerendering/caching and executes the query in every handler invocation; TASK-3 verifies one real read per request and `Cache-Control: no-store`. |
| AC-6 | TASK-1 snapshots every persisted ticket field around repeated probes; TASK-3 verifies byte-for-byte value preservation for ticket, ownership, status, priority, content, and timestamp fields. |
| AC-7 | TASK-1 prepares new, legacy-schema, and empty-database fixtures; TASK-2 reuses existing initialization rather than adding migration logic; TASK-3 verifies schema creation, the existing ownership-column migration, optional seeding, and successful readiness. |
| AC-8 | TASK-1 adds an unchanged liveness assertion under broken storage; TASK-3 verifies `GET /api/health` remains HTTP 200 with exactly `{"status":"ok"}` and has no store dependency. |
| AC-9 | TASK-3 runs the existing dashboard, ticket, status, search, filter, detail, and ownership coverage unchanged after readiness probes; TASK-5 repeats the healthy-dashboard and ownership-preservation checks against the immutable image. |
| AC-10 | TASK-4 updates the application runbook with exact contracts, commands, diagnosis, repair/restart guidance, and the local-demonstration limitation. |
| AC-11 | TASK-5 validates one immutable image digest in separate healthy and fault-injected instances, including readiness, liveness, ownership-data preservation, and healthy-dashboard behavior without attaching an accepted volume. |

## Tasks

### TASK-1: Establish controlled readiness Red evidence

Depends on: none  
Acceptance: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9  
Surfaces: `demos/it-service-desk` test suite and test fixtures; existing HTTP test harness; existing `GET /api/health` route; existing `getTicketStore()` and `TicketStore` initialization/query behavior; existing ownership regression tests remain unmodified  
Validation: Add a new readiness-focused test file that compiles and runs before the route exists, drives `/api/ready` through the existing public HTTP harness, and fails on an explicit status/body/header assertion rather than a missing import, missing module, dynamic-import failure, or collection error. Record assertion-level Red output before implementation. Add staged failing assertions for healthy and thrown-failure responses, fixed sanitized logging, recovery, repeated query execution, first-use initialization, row non-mutation, and liveness compatibility before implementing each corresponding behavior.

Use isolated temporary databases and application instances so tests cannot touch accepted or developer data. Exercise a real initialization failure with an unusable path and a real recovery by repairing the same underlying condition before a later request. For query-count assertions, use the repository’s existing module-mocking or test-seam convention around the store accessor; do not introduce a second database implementation. Capture a full persisted-row snapshot before repeated probes and compare all stored columns afterward. Do not edit the approved ownership tests.

### TASK-2: Implement the database-backed readiness route

Depends on: TASK-1  
Acceptance: AC-1, AC-2, AC-3, AC-4, AC-5, AC-7  
Surfaces: new `GET /api/ready` route beside the existing health route; existing `getTicketStore()` singleton accessor; existing `TicketStore` query API and initialization path  
Validation: Turn the TASK-1 route-contract tests Green with HTTP 200 and exactly `{"status":"ready"}` after a successful real ticket-store query, or HTTP 503 and exactly `{"status":"unavailable"}` when accessor initialization or the query throws. Verify both outcomes include `Cache-Control: no-store`, and verify repeated requests invoke the query repeatedly.

Implement the route as request-time execution and explicitly opt it out of Next.js prerendering or route caching. Obtain the application store through `getTicketStore()` and call the smallest existing read-only ticket query that exercises ticket storage; do not use a static value, direct SQLite access, or standalone `SELECT 1`. Reusing a successfully initialized singleton is compatible, but the query itself must run for every readiness request.

Catch failures only at the readiness HTTP boundary. Log one fixed, bounded generic message without passing the thrown object or interpolating any exception property, then return the exact unavailable response. If application inspection shows that `getTicketStore()` retains a failed initialization, make the narrowest accessor correction needed so only a successfully constructed store is retained and a later request can retry; do not alter successful singleton behavior or create a parallel store path.

### TASK-3: Verify data, liveness, and service compatibility

Depends on: TASK-2  
Acceptance: AC-4, AC-5, AC-6, AC-7, AC-8, AC-9  
Surfaces: existing SQLite schema initialization and ownership migration; seed behavior; health route; dashboard; ticket list and detail flows; create, status, search, filter, assignment, clearing, and ownership-persistence tests  
Validation: Run the new readiness tests and the complete existing application test suite. Confirm failure followed by repaired storage becomes ready without process-level cached output; repeated successful requests each perform a storage read; initialized rows compare equal before and after probes; new and legacy databases retain the existing schema/migration/seed outcomes; broken storage does not change the exact health response; and all existing service-desk behavior remains Green.

Keep readiness read-only after initialization. Do not add readiness-specific writes, timestamps, markers, or migrations. Allow only the schema creation, nullable ownership-column migration, and optional empty-database seeding already performed by current initialization. Preserve the approved ownership tests without modification and add any new regression coverage in separate readiness-focused files.

### TASK-4: Document local liveness and readiness operation

Depends on: TASK-2  
Acceptance: AC-10  
Surfaces: existing IT service desk application runbook and its local configuration/probe guidance  
Validation: Review each documented command and expected result against the implemented route. Confirm the runbook shows the exact liveness, ready, and unavailable bodies; HTTP statuses; `Cache-Control: no-store`; healthy and fault-injected local probe commands; protected-log diagnosis; configuration repair and restart steps; and an explicit statement that the checks are a local demonstration rather than production availability certification.

Explain that liveness reports the Node.js process state and remains successful during database failure, while readiness exercises the existing ticket-storage path before traffic is sent. Warn operators not to expose protected logs or use an accepted data volume for fault injection. Do not claim an outage, customer impact, SLO, production readiness, or independent Human validation.

### TASK-5: Verify the published immutable delivery image

Depends on: TASK-3, TASK-4  
Acceptance: AC-9, AC-11  
Surfaces: existing demo image build and publication path; application container runtime configuration; documented delivery-evidence location; healthy dashboard and HTTP endpoints  
Validation: Build and publish through the existing delivery process, record the resulting immutable digest, and run that same digest in two isolated disposable instances. In the healthy instance, verify readiness is HTTP 200 with exactly `{"status":"ready"}`, liveness is HTTP 200 with exactly `{"status":"ok"}`, repeated probes preserve a populated ownership dataset, and the dashboard remains usable. In the separately fault-injected instance, verify readiness is HTTP 503 with exactly `{"status":"unavailable"}` while liveness remains the exact HTTP 200 contract. Confirm both readiness responses have `Cache-Control: no-store`.

Use disposable data only and do not attach, copy over, or modify an accepted volume. Preserve earlier lifecycle and run artifacts by writing evidence to the maintenance iteration’s designated location. Do not change shared delivery automation, repository settings, credentials, approval rules, or the previously accepted image record.

## Risks and migrations

- **Failed singleton initialization may be retained:** If the current accessor caches a failed construction or rejected initialization, recovery cannot occur on a later request. TASK-2 must retain only successful initialization while preserving the normal singleton path; TASK-1 and TASK-3 verify failure followed by same-process recovery.
- **Framework caching may mask current storage state:** A response header alone may not prevent prerendering or server-side route caching. The route must be explicitly dynamic, execute the store query in each handler invocation, and return `Cache-Control: no-store`; call-count and recovery tests verify behavior rather than configuration alone.
- **Failure diagnostics may leak sensitive data:** Passing an exception to the logger can disclose paths, credentials, ticket content, messages, or stacks. The route must log only a fixed generic message, with tests injecting recognizable sensitive values and asserting their absence.
- **Readiness initialization can legitimately mutate an uninitialized database:** Existing schema creation, ownership-column migration, and optional seeding are approved first-use behaviors. There is no new migration. Tests must distinguish those permitted initialization changes from the requirement that subsequent readiness probes leave every persisted ticket field unchanged.
- **Concurrent first requests may expose singleton or migration races:** Exercise the existing initialization path rather than adding another connection or migration mechanism. Include concurrent or closely repeated readiness requests if the existing test infrastructure supports them, and verify no duplicate seeding, partial migration, or failed-store retention.
- **Compatibility regression:** Coupling health to store initialization, changing shared store behavior, or editing approved ownership tests would violate the accepted baseline. Keep the health route untouched, constrain any accessor adjustment to failed-initialization retry semantics, and run the complete existing suite.
- **Fault injection could damage accepted data:** All automated and image-level failure checks must use isolated disposable paths and instances. No accepted volume may be attached to either delivery instance.
- **Delivery evidence could be mistaken for availability certification:** Evidence is limited to the tested immutable image and local isolated conditions. Documentation and records must avoid production, SLO, outage, customer-impact, or independent-validation claims.
- **Migration approach:** No readiness-specific schema or data migration is proposed. Existing databases remain compatible; the only permitted changes are those already performed by `TicketStore` initialization for schema creation, the nullable ownership column, and optional seeding.

## Validation

1. **Controlled Red:** Run the new test through the existing test runner before adding the route. It must compile, collect, send `GET /api/ready`, and fail an explicit assertion showing the missing contract, such as expected HTTP 200 versus actual 404. Missing-module, dynamic-import, syntax, startup, or collection failures do not qualify. Add subsequent behavior assertions before their implementation and retain assertion-level Red evidence.
2. **Targeted Green:** Run the readiness tests after TASK-2. Verify exact status codes, bodies with no extra fields, `Cache-Control: no-store`, a genuine existing-store query, fixed generic logging, sensitive-detail exclusion, same-process recovery, and one read per request.
3. **Storage compatibility:** Exercise new, empty, populated, legacy ownership-schema, unusable, and repaired database conditions using disposable fixtures. Snapshot and compare every persisted ticket column around repeated probes, while separately confirming only existing first-use initialization behavior occurs.
4. **Regression Green:** Run the complete IT service desk tests, lint, and production build using the repository-documented Node.js version. Existing health, dashboard, ticket creation, status, search, filtering, details, assignment, clearing, ownership persistence, and approved ownership tests must remain Green without modifying those approved tests.
5. **Runbook verification:** Execute or inspect each local probe sequence against the built application and confirm the documented exact outputs, safe diagnosis path, configuration repair/restart guidance, and local-demonstration limitation.
6. **Immutable-image verification:** Publish one immutable image and use its recorded digest for both isolated instances. Capture healthy readiness 200, fault-injected readiness 503, liveness 200 in both, no-store headers, sanitized failure logging, repeated-probe ownership preservation, and healthy-dashboard operation. Keep this maintenance evidence separate from previous run artifacts.

## Revision summary

This is the initial implementation-plan draft for Human Intent #8; no previous plan document exists, so no task IDs or prior behavior mappings require preservation.

**Human decisions reflected from the approved Specification:** readiness is a separate database-backed endpoint; liveness remains exactly unchanged; readiness must use the existing `TicketStore` initialization and query path; success and failure have exact status/body/header contracts; failures are generically logged without disclosure; each request is re-evaluated; existing first-use initialization remains permitted; persisted ticket data and accepted ownership behavior remain compatible; documentation and immutable-image evidence are required; production claims, new infrastructure, dependencies, shared automation changes, and accepted-volume fault injection remain out of scope.

**Plan proposals:** TASK-1 through TASK-5 define the engineering sequence, with assertion-level Red evidence preceding route behavior, targeted Green verification followed by full compatibility checks, explicit framework cache prevention, isolated data fixtures, and same-digest delivery checks. The plan proposes using the smallest suitable existing read-only `TicketStore` query; this is an implementation selection within the Human-approved requirement, not a new product decision.

## Open questions

None. The approved Specification leaves no product decision unresolved, and this plan does not identify a consequential contradiction requiring a Specification revision. Any later application inspection that reveals the existing accessor cannot retry failed initialization, the existing query API cannot provide a genuine read-only storage check, or the current delivery process cannot test one digest in isolated healthy and fault-injected instances must be raised to the Human as a Spec conflict rather than silently changing the approved contract.

