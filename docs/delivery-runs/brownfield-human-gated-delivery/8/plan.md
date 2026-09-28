# Implementation plan

## Acceptance mapping

| Acceptance | Planned coverage |
|---|---|
| AC-1 | TASK-1 freezes assertions for the exact successful response and a genuine ticket-storage read. TASK-2 implements `GET /api/ready` through `getTicketStore().summary()`. TASK-3 verifies the route contract and read invocation. |
| AC-2 | TASK-1 freezes initialization- and read-failure cases. TASK-2 maps either thrown failure to the exact 503 response. TASK-3 verifies status, body, and header. |
| AC-3 | TASK-1 injects recognizable sensitive error details and freezes log-sanitization assertions. TASK-2 emits one bounded generic message without the error object. TASK-3 verifies response and logs contain no sensitive details. |
| AC-4 | TASK-1 freezes handler-level failure-then-success assertions and an isolated file-backed repair scenario. TASK-2 re-evaluates `getTicketStore()` and `summary()` on every call. TASK-3 verifies recovery without changing the existing accessor. |
| AC-5 | TASK-1 freezes repeated-call and route-configuration assertions. TASK-2 marks the route dynamic, returns `Cache-Control: no-store`, and performs `summary()` for every request. TASK-3 verifies successive calls execute successive reads. |
| AC-6 | TASK-1 freezes full-row comparisons around repeated probes against an isolated populated database. TASK-3 verifies ownership and every other persisted ticket field remain unchanged. |
| AC-7 | TASK-1 freezes isolated file-backed scenarios for schema creation, the existing ownership-column migration, and empty-database seeding. TASK-2 reuses existing initialization unchanged. TASK-3 verifies readiness succeeds after each permitted first-use behavior. |
| AC-8 | TASK-1 freezes direct assertions against the existing health handler while readiness storage fails. TASK-3 verifies the exact liveness contract remains independent of storage. |
| AC-9 | TASK-3 runs all six existing test files unchanged, including accepted ownership behavior, after the new readiness coverage. TASK-5 verifies the dashboard and populated ownership data against the immutable image. |
| AC-10 | TASK-4 updates and checks the application README with the required operational distinction, exact contracts, commands, diagnosis, repair, restart, and limitation language. |
| AC-11 | TASK-5 checks the same published image digest in separate healthy and fault-injected disposable instances, including readiness, liveness, data preservation, and dashboard operation. |

## Tasks

### TASK-1: Establish controlled readiness Red evidence

Depends on: none  
Acceptance: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9  
Surfaces: new `demos/it-service-desk/src/app/api/ready/route.test.ts`; existing `demos/it-service-desk/src/app/api/health/route.ts`; existing `getTicketStore()` and `TicketStore` modules; isolated temporary SQLite files; the six existing Vitest files remain unmodified  
Validation: Run the new file directly with the existing Vitest configuration from `demos/it-service-desk/package.json`; record an explicit test-body assertion failure that `src/app/api/ready/route.ts` does not yet exist, before any guarded dynamic import is attempted.

During the Tests stage, create the complete readiness test file without modifying production code, adding dependencies, or introducing a server-launch/public-HTTP harness. The first test must compute whether `src/app/api/ready/route.ts` exists, assert that it exists, and return before the guarded dynamic import when it does not. This makes the initial Red a meaningful assertion rather than a missing-module, collection, syntax, or startup failure.

Freeze all required assertions and an exact expected-failure manifest before Implementation. The manifest must identify the expected initial route-existence failure and the subsequently exposed contract failures for:

- HTTP 200 with exactly `{"status":"ready"}` and `Cache-Control: no-store` after `summary()` succeeds.
- HTTP 503 with exactly `{"status":"unavailable"}` and `Cache-Control: no-store` when store initialization or `summary()` throws.
- One bounded generic failure log call that excludes injected paths, credentials, ticket data, exception text, and stack traces.
- Failure followed by success on a later direct handler call, proving re-evaluation.
- Repeated successful handler calls invoking `summary()` once per request rather than reusing a cached result.
- Dynamic route configuration preventing prerendered success.
- Repeated probes preserving every column of populated ticket rows.
- Existing schema creation, ownership migration, and empty-database seeding remaining usable.
- The health handler returning HTTP 200 with exactly `{"status":"ok"}` while readiness storage fails.
- Existing behavior remaining covered by the unmodified six-file suite.

Once the route exists, directly invoke its exported `GET` handler and assert the real `Response` status, parsed body, and headers using current Vitest module-mocking conventions. Use mocked `getTicketStore()` results for precise route-boundary behavior and isolated real `TicketStore` instances backed by disposable files for initialization, repair, migration, seeding, and non-mutation evidence. Do not alter the approved ownership tests. Freeze this required suite and expected-failure manifest at the end of the Tests stage; Implementation must not incrementally add or weaken required assertions.

### TASK-2: Implement the database-backed readiness route

Depends on: TASK-1  
Acceptance: AC-1, AC-2, AC-3, AC-4, AC-5, AC-7  
Surfaces: new `demos/it-service-desk/src/app/api/ready/route.ts`; existing `getTicketStore()` accessor; existing `TicketStore.summary()` query behavior  
Validation: Turn the frozen TASK-1 route tests Green with exact success and failure responses, `Cache-Control: no-store`, sanitized logging, dynamic request-time evaluation, recovery, and one `summary()` call per handler invocation.

Implement the Node.js `GET` handler by obtaining the existing singleton through `getTicketStore()` and calling `summary()`. The existing `summary()` method is the selected genuine ticket-table read; do not add another storage abstraction, open a separate SQLite connection, issue a standalone `SELECT 1`, or return static readiness.

Return HTTP 200 with only `{"status":"ready"}` after both initialization and `summary()` succeed. If either throws, catch the failure only at the readiness boundary, emit one fixed generic readiness-failure message without passing or interpolating the thrown value, and return HTTP 503 with only `{"status":"unavailable"}`. Set `Cache-Control: no-store` in both outcomes and use the existing Next.js route convention to force dynamic request-time evaluation.

Do not change `getTicketStore()`. Code inspection confirms that its shared singleton is assigned only after `new TicketStore(...)` returns successfully, so a thrown initialization is not cached and a later request can retry. Successful singleton reuse remains compatible because `summary()` must still execute on every readiness request.

### TASK-3: Verify storage and application compatibility

Depends on: TASK-2  
Acceptance: AC-4, AC-5, AC-6, AC-7, AC-8, AC-9  
Surfaces: frozen `demos/it-service-desk/src/app/api/ready/route.test.ts`; disposable SQLite fixtures; existing health route; existing six-file Vitest suite; application lint and production build  
Validation: Run the frozen readiness test file, then the complete application tests, lint, and build. Confirm recovery, repeated reads, data non-mutation, first-use compatibility, unchanged liveness, and all existing service-desk behavior.

Use isolated real file-backed stores to compare complete persisted ticket rows before and after repeated readiness reads, including identifiers, owner, status, priority, content, creation time, update time, and any other stored columns. Separately verify the current schema creation, nullable ownership-column migration, and optional empty-database seeding; these existing first-use effects are permitted and must not be confused with mutation by later probes.

Verify directly that `GET /api/health` remains independent of the store and returns HTTP 200 with exactly `{"status":"ok"}` during readiness failure. Run the six existing test files unchanged to cover dashboard rendering, ticket creation and details, status changes, search, filtering, assignment, clearing, and ownership persistence.

Do not change the frozen required readiness suite during Implementation. If implementation work exposes a regression case beyond the approved scenarios, place that additional coverage in a separate new test file without editing approved ownership tests or weakening the frozen expected-failure manifest.

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
- Safe diagnosis through protected application logs without exposing those logs or their sensitive context through HTTP.
- Repair of the database configuration or underlying path followed by the appropriate local restart and a fresh readiness probe.
- A warning never to fault-inject an accepted data volume.
- An explicit statement that the procedure is a local demonstration and does not certify production availability.

### TASK-5: Verify the published immutable delivery image

Depends on: TASK-3, TASK-4  
Acceptance: AC-9, AC-11  
Surfaces: existing IT service desk image build and publication path; application container configuration; maintenance iteration delivery-evidence location; HTTP endpoints and healthy dashboard  
Validation: Run one recorded immutable image digest in separate healthy and fault-injected disposable instances; capture exact readiness and liveness results, no-store headers, generic failure logging, healthy data preservation, and healthy dashboard operation.

Build and publish through the existing delivery process without changing shared automation, repository settings, credentials, or approval rules. Use the same resulting digest for both isolated instances and do not attach, copy, or modify an accepted data volume.

In the healthy instance, verify HTTP 200 with exactly `{"status":"ready"}`, `Cache-Control: no-store`, HTTP 200 with exactly `{"status":"ok"}` from liveness, a usable dashboard, and unchanged populated ownership rows after repeated readiness probes. In the separately fault-injected instance, verify readiness is HTTP 503 with exactly `{"status":"unavailable"}` and `Cache-Control: no-store`, while liveness remains HTTP 200 with exactly `{"status":"ok"}`. Confirm the failure produces only the bounded generic readiness log message.

Store evidence only in the maintenance iteration’s designated location and preserve previous lifecycle and run artifacts. These actual HTTP and immutable-digest checks belong to delivery, not the Tests-stage Vitest harness.

## Risks and migrations

- **Framework caching could hide current storage state:** `Cache-Control: no-store` alone does not prove server-side request-time execution. TASK-1 freezes assertions for dynamic route configuration and repeated `summary()` calls; TASK-2 implements both safeguards.
- **Sensitive failure details could leak through logging:** Passing the caught value to a logger could disclose paths, credentials, ticket contents, exception text, or stacks. The route must log only a fixed bounded message, and tests inject recognizable sensitive values to verify their absence.
- **Initialization has permitted first-use effects:** Readiness may trigger existing schema creation, nullable ownership migration, and optional empty-database seeding. Tests must separate these approved initialization effects from the requirement that subsequent probes leave all persisted rows unchanged.
- **Shared-store behavior could be changed unnecessarily:** Inspection confirms `getTicketStore()` assigns `sharedStore` only after `TicketStore` construction succeeds, so failed initialization is already retryable. Changing the accessor would add compatibility risk and is not proposed.
- **A read that bypasses ticket behavior would provide false confidence:** The route must use existing `TicketStore.summary()` behavior rather than a static result, direct SQLite access, or an unrelated query.
- **Testing through a new HTTP harness would expand scope:** The project runs Vitest directly and has no existing public HTTP harness. Route tests therefore invoke the handler and inspect its real `Response`; actual HTTP checks remain isolated to TASK-5.
- **Test changes after Red could weaken evidence:** All required readiness assertions and the expected-failure manifest are frozen in TASK-1 before production implementation. Any later regression coverage must be separate and must not alter approved ownership tests.
- **Fault injection could damage accepted data:** File-backed tests and image checks must use explicitly isolated disposable paths and instances. No accepted volume may be attached or modified.
- **Delivery evidence could be overstated:** Results apply only to the tested immutable digest under isolated local conditions. Documentation and evidence must not claim an outage, customer impact, SLO compliance, production readiness, business benefit, or independent Human validation.
- **Migration approach:** No readiness-specific schema or data migration is proposed. Existing databases remain compatible through the current `TicketStore` schema creation, ownership-column migration, and optional seeding behavior.

## Validation

1. **Controlled Red:** During the Tests stage, run only the new readiness-focused Vitest file before creating `src/app/api/ready/route.ts`. It must collect and execute successfully until an explicit test-body route-existence assertion fails. The guarded dynamic import must not run when the file is absent. Record this assertion-level failure and the frozen expected-failure manifest; missing-module, collection, compilation, or startup failures are invalid evidence.
2. **Frozen contract Green:** After TASK-2, run the unchanged frozen readiness file. Direct handler calls must verify exact status codes, bodies with no additional fields, `Cache-Control: no-store`, dynamic route configuration, `summary()` invocation on every request, generic logging, sensitive-detail exclusion, and failure-to-success recovery.
3. **Real storage verification:** Against disposable file-backed `TicketStore` instances, verify initialization failure, repair, schema creation, ownership migration, empty-database seeding, successful `summary()` reads, and complete row equality around repeated probes. Confirm no readiness-specific table, column, timestamp, marker, or write is introduced.
4. **Compatibility Green:** From `demos/it-service-desk`, run the complete existing Vitest suite, lint, and production build with the repository-supported Node.js version. All six existing test files and accepted health, dashboard, create, status, search, filter, detail, assignment, clearing, and ownership-persistence behavior must remain Green without modification.
5. **Runbook check:** Validate the commands and expected outputs in `demos/it-service-desk/README.md` against the built application. Confirm safe diagnosis and repair/restart guidance, disposable fault injection, and the local-demonstration limitation.
6. **Immutable-image delivery check:** Publish one immutable image and use its recorded digest in both isolated instances. Capture healthy readiness 200, fault-injected readiness 503, liveness 200 in both, exact bodies, no-store headers, bounded logging, repeated-probe ownership preservation, and healthy-dashboard behavior without touching accepted data or previous evidence.

## Revision summary

This revision preserves approved Specification v1 and stable TASK-1 through TASK-5 responsibilities while correcting the prior plan’s assumptions about the application test environment.

**Human decisions reflected from the approved Specification:** readiness remains a separate database-backed endpoint; liveness remains exactly unchanged; readiness uses the existing `TicketStore` initialization and query path; status, body, cache-control, logging, recovery, non-mutation, compatibility, documentation, and immutable-image evidence contracts remain as approved. Existing ownership behavior and tests, shared delivery automation, previous artifacts, dependencies, and production claims remain out of scope.

**Human-requested plan revisions:** TASK-1 now uses a new readiness-focused Vitest file rather than a nonexistent public HTTP harness. Its initial Red is an explicit route-existence assertion before a guarded dynamic import. All required tests and the exact expected-failure manifest are authored and frozen during Tests, production remains untouched in that stage, route behavior is checked by directly calling the handler, and actual HTTP/digest verification is reserved for TASK-5. Concrete route, test, and README paths are specified.

**Application-grounded plan proposals:** `TicketStore.summary()` is selected as the existing read-only ticket-table operation for readiness. The verified `getTicketStore()` assignment order already avoids caching failed construction, so no accessor change is proposed. Handler mocks provide precise response and logging assertions, while isolated real file-backed stores provide initialization, repair, migration, seeding, and non-mutation evidence. These are implementation choices within the approved Spec, not new Human product decisions.

This remains a draft Plan. Only explicit Human approval of this version permits engineering handoff.

## Open questions

None. Application inspection and the supplied feedback resolve the previous harness, query-selection, and failed-initialization concerns without changing approved Specification v1 or expanding product scope.

