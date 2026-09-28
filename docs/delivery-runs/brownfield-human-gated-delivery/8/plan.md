# Implementation plan

## Acceptance mapping

| Acceptance | Planned coverage |
|---|---|
| AC-1 | TASK-1 freezes executable assertions for the exact successful response and genuine ticket-storage read. TASK-2 implements `GET /api/ready` through `getTicketStore().summary()`. TASK-3 verifies the route contract and read invocation. |
| AC-2 | TASK-1 freezes initialization- and read-failure scenarios. TASK-2 maps either thrown failure to the exact 503 response. TASK-3 verifies status, body, and header. |
| AC-3 | TASK-1 injects recognizable sensitive error details and freezes log-sanitization assertions. TASK-2 emits one bounded generic message without the thrown value. TASK-3 verifies that neither responses nor logs expose sensitive details. |
| AC-4 | TASK-1 freezes failure-then-success handler assertions and an isolated file-backed repair scenario. TASK-2 re-evaluates `getTicketStore()` and `summary()` on every request. TASK-3 verifies recovery without changing the existing accessor. |
| AC-5 | TASK-1 freezes repeated-call and dynamic-route assertions. TASK-2 prevents prerendering, returns `Cache-Control: no-store`, and performs `summary()` for every request. TASK-3 verifies successive requests execute successive reads. |
| AC-6 | TASK-1 freezes complete-row comparisons around repeated probes against an isolated populated database. TASK-3 verifies ownership and every other persisted ticket field remain unchanged. |
| AC-7 | TASK-1 freezes isolated file-backed scenarios for schema creation, the existing ownership-column migration, and empty-database seeding. TASK-2 reuses existing initialization unchanged. TASK-3 verifies readiness succeeds after each permitted first-use behavior. |
| AC-8 | TASK-1 freezes direct assertions against the existing health handler while readiness storage fails. TASK-3 verifies the exact liveness contract remains independent of storage. |
| AC-9 | TASK-3 preserves the six existing test files and their 37 baseline tests, including accepted ownership behavior. TASK-5 verifies the dashboard and populated ownership data against the immutable image. |
| AC-10 | TASK-4 updates and checks the application README with the required operational distinction, exact contracts, commands, diagnosis, repair, restart, and limitation language. |
| AC-11 | TASK-5 checks the same published image digest in separate healthy and fault-injected disposable instances, including readiness, liveness, data preservation, and dashboard operation. |

## Tasks

### TASK-1: Establish controlled readiness Red evidence

Depends on: none  
Acceptance: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9  
Surfaces: new `demos/it-service-desk/src/app/api/ready/route.test.ts`; existing `demos/it-service-desk/src/app/api/health/route.ts`; existing `getTicketStore()` and `TicketStore` modules; isolated temporary SQLite files; Tests-stage expected-failure manifest; the six existing Vitest files remain unmodified  
Validation: Run the complete new readiness-focused Vitest file on the pre-implementation baseline and record every and only named test that actually fails through an explicit in-test route-existence assertion; separately confirm the existing 37 baseline tests remain Green.

During the Tests stage, create the complete readiness-focused test file without modifying production code, adding dependencies, or introducing a server-launch or public-HTTP harness. Define a shared route-existence assertion helper, but invoke it from inside each required readiness test body before that test’s guarded dynamic import. Do not invoke the guard from `beforeEach`, `beforeAll`, module scope, or another collection-time hook, and do not skip scenarios.

Every intended readiness scenario must therefore execute as a named test and produce assertion-level Red while `src/app/api/ready/route.ts` is absent. If the route-existence assertion fails, that test must not attempt the guarded dynamic import. Once the route is present, the same named tests proceed to their already-written deeper assertions; separate placeholder tests or post-implementation replacements are not acceptable.

Author and freeze all required assertions before Implementation for:

- HTTP 200 with exactly `{"status":"ready"}` and `Cache-Control: no-store` after `summary()` succeeds.
- HTTP 503 with exactly `{"status":"unavailable"}` and `Cache-Control: no-store` when store initialization throws.
- The same exact 503 contract when `summary()` throws.
- One bounded generic failure log call that excludes injected paths, credentials, ticket data, exception text, and stack traces.
- Failure followed by success on a later direct handler call, proving re-evaluation.
- Repeated successful handler calls invoking `summary()` once per request rather than reusing a cached result.
- Dynamic route configuration preventing a prerendered success response.
- Repeated probes preserving every persisted column of populated ticket rows.
- Existing schema creation, ownership migration, and empty-database seeding remaining usable.
- The health handler returning HTTP 200 with exactly `{"status":"ok"}` while readiness storage fails.
- Existing behavior remaining covered by the unmodified six-file, 37-test baseline suite.

Create the expected-failure manifest from observed pre-implementation execution, not prediction. It must list every and only the exact names of tests that actually fail on that baseline. It must not contain hypothetical future failures, deeper assertions that were not reached, or names inferred from expected implementation behavior. Missing-module, collection, compilation, startup, hook, or skipped-test outcomes are invalid Red evidence.

Once the route exists, directly invoke its exported `GET` handler and assert the real `Response` status, parsed body, and headers using current Vitest module-mocking conventions. Use mocked `getTicketStore()` results for precise route-boundary behavior and isolated real `TicketStore` instances backed by disposable files for initialization, repair, migration, seeding, and non-mutation evidence. Freeze the complete required test file and observed expected-failure manifest before Implementation; do not alter approved ownership tests.

### TASK-2: Implement the database-backed readiness route

Depends on: TASK-1  
Acceptance: AC-1, AC-2, AC-3, AC-4, AC-5, AC-7  
Surfaces: new `demos/it-service-desk/src/app/api/ready/route.ts`; existing `getTicketStore()` accessor; existing `TicketStore.summary()` query behavior  
Validation: Turn every named expected failure from the frozen TASK-1 manifest Green while satisfying the already-written deeper assertions for exact responses, no-store headers, sanitized logging, request-time evaluation, recovery, and one `summary()` call per request.

Implement the Node.js `GET` handler by obtaining the existing singleton through `getTicketStore()` and calling `summary()`. The existing `summary()` method is the selected genuine ticket-table read; do not add another storage abstraction, open a separate SQLite connection, issue a standalone `SELECT 1`, or return static readiness.

Return HTTP 200 with only `{"status":"ready"}` after initialization and `summary()` succeed. If either operation throws, catch the failure only at the readiness boundary, emit one fixed generic readiness-failure message without passing or interpolating the thrown value, and return HTTP 503 with only `{"status":"unavailable"}`. Set `Cache-Control: no-store` in both outcomes and use the existing Next.js route convention to force dynamic request-time evaluation.

Do not change `getTicketStore()`. Application inspection confirms that its shared singleton is assigned only after `new TicketStore(...)` returns successfully, so a thrown initialization is not cached and a later request can retry. Successful singleton reuse remains compatible because `summary()` still executes on every readiness request.

### TASK-3: Verify storage and application compatibility

Depends on: TASK-2  
Acceptance: AC-4, AC-5, AC-6, AC-7, AC-8, AC-9  
Surfaces: frozen `demos/it-service-desk/src/app/api/ready/route.test.ts`; disposable SQLite fixtures; existing health route; existing six-file, 37-test Vitest baseline suite; application lint and production build  
Validation: Run the frozen readiness test file, then the complete application tests, lint, and build; confirm every manifest entry is Green and verify recovery, repeated reads, data non-mutation, first-use compatibility, unchanged liveness, and existing service-desk behavior.

Use isolated real file-backed stores to compare complete persisted ticket rows before and after repeated readiness reads, including identifiers, owner, status, priority, content, creation time, update time, and every other stored column. Separately verify current schema creation, nullable ownership-column migration, and optional empty-database seeding. These existing first-use effects are permitted and must be distinguished from the requirement that later probes leave persisted rows unchanged.

Verify directly that `GET /api/health` remains independent of the store and returns HTTP 200 with exactly `{"status":"ok"}` during readiness failure. Run the six existing test files unchanged and preserve all 37 baseline tests covering dashboard rendering, ticket creation and details, status changes, search, filtering, assignment, clearing, and ownership persistence.

Do not change the frozen required readiness suite or expected-failure manifest during Implementation. If implementation exposes a regression beyond the approved scenarios, place additional coverage in a separate new test file without editing the frozen readiness contract or approved ownership tests. Such added coverage is supplemental and must not retroactively alter the recorded Red manifest.

### TASK-4: Document local liveness and readiness operation

Depends on: TASK-2  
Acceptance: AC-10  
Surfaces: `demos/it-service-desk/README.md`  
Validation: Check every documented status, body, header, command, and recovery step against the implemented application and confirm the README makes no production, incident, SLO, business-benefit, or independent-validation claim.

Update the application README to distinguish process liveness from database-backed readiness. Document:

- `GET /api/health`: HTTP 200 with exactly `{"status":"ok"}`, including when storage is unavailable.
- Healthy `GET /api/ready`: HTTP 200 with exactly `{"status":"ready"}` and `Cache-Control: no-store`.
- Failed `GET /api/ready`: HTTP 503 with exactly `{"status":"unavailable"}` and `Cache-Control: no-store`.
- Local commands that display status, headers, and response bodies for healthy and fault-injected disposable configurations.
- Safe diagnosis through protected application logs without exposing sensitive context through HTTP.
- Repair of the database configuration or underlying path followed by the appropriate local restart and a fresh readiness probe.
- A warning never to fault-inject an accepted data volume.
- An explicit statement that the procedure is a local demonstration and does not certify production availability.

### TASK-5: Verify the published immutable delivery image

Depends on: TASK-3, TASK-4  
Acceptance: AC-9, AC-11  
Surfaces: existing IT service desk image build and publication path; application container configuration; maintenance iteration delivery-evidence location; HTTP endpoints; healthy dashboard  
Validation: Run one recorded immutable image digest in separate healthy and fault-injected disposable instances; capture exact readiness and liveness results, no-store headers, generic failure logging, healthy data preservation, and healthy dashboard operation.

Build and publish through the existing delivery process without changing shared automation, repository settings, credentials, or approval rules. Use the same resulting digest for both isolated instances and do not attach, copy, or modify an accepted data volume.

In the healthy instance, verify readiness returns HTTP 200 with exactly `{"status":"ready"}` and `Cache-Control: no-store`; liveness returns HTTP 200 with exactly `{"status":"ok"}`; the dashboard remains usable; and populated ownership rows remain unchanged after repeated readiness probes.

In the separately fault-injected instance, verify readiness returns HTTP 503 with exactly `{"status":"unavailable"}` and `Cache-Control: no-store`, while liveness remains HTTP 200 with exactly `{"status":"ok"}`. Confirm the failure produces only the bounded generic readiness log message.

Store evidence only in the maintenance iteration’s designated location and preserve previous lifecycle and run artifacts. These HTTP and immutable-digest checks belong to delivery, not the Tests-stage Vitest harness.

## Risks and migrations

- **Controlled Red could misrepresent executable coverage:** A module-scope or shared-hook guard could prevent individual scenarios from executing, while skipped tests could falsely imply coverage. Each required test must invoke the shared route-existence helper inside its own body before its guarded import.
- **The expected-failure manifest could contain unobserved failures:** Recording hypothetical or unreachable deeper assertions would overstate Red evidence. The manifest must include every and only exact test names observed failing on the pre-implementation baseline.
- **Framework caching could hide current storage state:** `Cache-Control: no-store` alone does not prove server-side request-time execution. TASK-1 freezes dynamic-route and repeated-`summary()` assertions; TASK-2 implements both safeguards.
- **Sensitive failure details could leak through logging:** Passing the caught value to a logger could disclose paths, credentials, ticket contents, exception text, or stacks. The route must log only a fixed bounded message, and tests inject recognizable sensitive values to verify their absence.
- **Initialization has permitted first-use effects:** Readiness may trigger existing schema creation, nullable ownership migration, and optional empty-database seeding. Tests must separate these approved initialization effects from the requirement that subsequent probes leave all persisted rows unchanged.
- **Shared-store behavior could be changed unnecessarily:** Inspection confirms `getTicketStore()` assigns `sharedStore` only after `TicketStore` construction succeeds, so failed initialization is already retryable. Changing the accessor would add compatibility risk and is not proposed.
- **A read that bypasses ticket behavior would provide false confidence:** The route must use existing `TicketStore.summary()` behavior rather than a static result, direct SQLite access, or an unrelated query.
- **A new HTTP test harness would expand scope:** The project runs Vitest directly and has no existing public HTTP harness. Route tests therefore invoke the handler and inspect its real `Response`; actual HTTP checks remain isolated to TASK-5.
- **Post-Red test edits could weaken evidence:** All required readiness assertions and the observed expected-failure manifest are frozen before production implementation. Later regression coverage must be separate and must not alter approved ownership tests.
- **Fault injection could damage accepted data:** File-backed tests and image checks must use explicitly isolated disposable paths and instances. No accepted volume may be attached or modified.
- **Delivery evidence could be overstated:** Results apply only to the tested immutable digest under isolated local conditions. Documentation and evidence must not claim an outage, customer impact, SLO compliance, production readiness, business benefit, or independent Human validation.
- **Migration approach:** No readiness-specific schema or data migration is proposed. Existing databases remain compatible through the current `TicketStore` schema creation, ownership-column migration, and optional seeding behavior.

## Validation

1. **Controlled Red:** During the Tests stage, author the complete readiness-focused Vitest file before creating `src/app/api/ready/route.ts`. Every required scenario must call the shared route-existence assertion helper inside its own test body before a guarded dynamic import. Run the complete file and require each intended scenario name to produce an assertion-level failure while the route is absent. Collection, compilation, missing-module, startup, shared-hook, and skipped-test outcomes are invalid evidence.
2. **Observed failure manifest:** Generate the expected-failure manifest from the actual pre-implementation run. Record every and only the exact names of tests that fail. Do not include hypothetical future failures or deeper contract failures that were not reached. Confirm separately that the six existing files and their 37 baseline tests remain Green, then freeze the new assertions and manifest before Implementation.
3. **Frozen contract Green:** After TASK-2, run the unchanged frozen readiness file. The same named tests must proceed beyond their route-existence checks and verify exact status codes, bodies with no additional fields, `Cache-Control: no-store`, dynamic route configuration, `summary()` invocation on every request, generic logging, sensitive-detail exclusion, and failure-to-success recovery.
4. **Real storage verification:** Against disposable file-backed `TicketStore` instances, verify initialization failure, repair, schema creation, ownership migration, empty-database seeding, successful `summary()` reads, and complete row equality around repeated probes. Confirm no readiness-specific table, column, timestamp, marker, or write is introduced.
5. **Compatibility Green:** From `demos/it-service-desk`, run the complete existing Vitest suite, lint, and production build with the repository-supported Node.js version. All six existing files and 37 baseline tests must remain Green without modification, preserving health, dashboard, create, status, search, filter, detail, assignment, clearing, and ownership-persistence behavior.
6. **Runbook check:** Validate the commands and expected outputs in `demos/it-service-desk/README.md` against the built application. Confirm safe diagnosis and repair/restart guidance, disposable fault injection, and the local-demonstration limitation.
7. **Immutable-image delivery check:** Publish one immutable image and use its recorded digest in both isolated instances. Capture healthy readiness 200, fault-injected readiness 503, liveness 200 in both, exact bodies, no-store headers, bounded logging, repeated-probe ownership preservation, and healthy-dashboard behavior without touching accepted data or previous evidence.

## Revision summary

This revision preserves approved Specification v1 and stable TASK-1 through TASK-5 responsibilities. It makes only the Human-requested clarification to the Tests-stage controlled Red contract; no production behavior, scope, acceptance scenario, or implementation choice has changed.

**Human decisions preserved:** readiness remains a separate database-backed endpoint; liveness remains exactly unchanged; readiness uses the existing `TicketStore` initialization and query path; and the approved status, body, cache-control, logging, recovery, non-mutation, compatibility, documentation, and immutable-image evidence contracts remain in force. Existing ownership behavior and tests, shared delivery automation, previous artifacts, dependencies, and production claims remain out of scope.

**Human-requested revision:** the expected-failure manifest now lists every and only exact named test observed failing on the pre-implementation baseline. It no longer anticipates subsequently exposed or hypothetical contract failures. Each required readiness test invokes a shared route-existence assertion helper from inside its own test body before a guarded dynamic import, allowing all intended scenario names to produce actual assertion-level Red while the route is absent. Shared setup guards and skipped tests are explicitly excluded. The same frozen named tests exercise their already-written deeper assertions once implementation exists. The existing 37 baseline tests are preserved and checked separately.

**Application-grounded proposals retained:** `TicketStore.summary()` remains the selected existing read-only ticket-table operation. The verified `getTicketStore()` assignment order already avoids caching failed construction, so no accessor change is proposed. Direct route-handler tests provide precise response and logging assertions, while isolated real file-backed stores provide initialization, repair, migration, seeding, and non-mutation evidence. These remain plan proposals within the approved Spec, not additional Human product decisions.

This remains a draft Plan. Only explicit Human approval of this version permits engineering handoff.

## Open questions

None. The requested test-contract clarification resolves the only identified plan issue without requiring a revision to approved Specification v1 or expanding product scope.

