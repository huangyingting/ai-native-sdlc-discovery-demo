# Specification

## Intent

Continue the database-readiness maintenance work after cancelled Intent #8 without rewriting the accepted ownership contract or altering liveness behavior.

The application must retain `/api/health` as a database-independent liveness endpoint and add `/api/ready` as a dynamically evaluated database-readiness endpoint. Readiness must use the existing ticket-store accessor and summary operation, report failures without exposing sensitive details, recover after storage repair, and avoid mutating persisted ticket data.

This specification is grounded in the reported behavior of the existing Node.js service-desk application: `/api/health` currently returns HTTP 200, ticket persistence is accessed through `getTicketStore()`, and `summary()` exercises initialization and database reads. The accepted ownership baseline remains commit `a2004d37bab5d4dbc758f3bdf9599547b4a45ad0`.

## Discovery

```json
{
  "problem": "Operators cannot distinguish a live application process from an instance whose ticket database cannot be initialized or read. Deliberate fault injection demonstrated that liveness can remain healthy while the dashboard fails, leaving no dedicated routing-readiness signal.",
  "evidence": "An isolated replica of image ghcr.io/huangyingting/ai-native-sdlc-discovery-demo-it-service-desk@sha256:09bf8f338aaccaacb0290eafc6fe65c7f917cd8642688406aef93d24b0eb36a2 returned health 200, dashboard 500, and readiness 404 when SERVICE_DESK_DB_PATH=/dev/null/service-desk.db. Intent #8 and implementation PR #14 also exposed two test-harness defects during Green validation. This is deliberate fault-injection and test evidence, not a production incident; production usage evidence, customer research, SLO data, and an availability baseline are explicitly missing.",
  "successMeasure": "Using the same immutable image digest in isolated healthy and fault-injected instances, each readiness request returns the exact status, body, and no-store header required by this specification; health remains unchanged; failures produce only the fixed sanitized log message; repaired storage becomes ready on a later request; repeated probes preserve complete persisted rows; and the dashboard and ownership UI continue to work. No customer-benefit, SLO, or availability target is asserted.",
  "alternatives": "Continue manual dashboard checks, which avoids a new endpoint but provides no dedicated routing signal; repurpose /api/health, which is smaller but breaks established liveness compatibility; or add the separate /api/ready endpoint, which preserves liveness while providing the requested database signal and is the explicit Intent choice.",
  "questions": [],
  "decisionMapping": []
}
```

## Scope

- Add a Node.js `/api/ready` route whose result is evaluated independently on every request through `getTicketStore().summary()`.
- Return HTTP 200 with exactly `{"status":"ready"}` when ticket-store initialization and the summary read succeed.
- Return HTTP 503 with exactly `{"status":"unavailable"}` when initialization or the summary read throws.
- Include `Cache-Control: no-store` on both readiness outcomes.
- Emit one fixed, bounded, generic readiness-failure log message for each failed readiness request without including exception details or sensitive application data.
- Preserve recovery behavior so a later request reflects repaired storage rather than a cached result.
- Permit the existing first-use schema creation, nullable ownership migration, and seeding behavior while ensuring subsequent readiness probes do not alter persisted rows or fields.
- Add direct-module Vitest coverage for the readiness contract, failure handling, repeated evaluation, recovery, real file-backed migration and seeding behavior, complete-row non-mutation, and unchanged liveness.
- Correct the readiness test harness by preventing `beforeEach` from returning a mock value, observing post-migration data through a fresh read-only connection or explicit schema refresh, and closing all test-owned handles.
- Update the application README with the liveness and readiness contracts, local commands, generic failure diagnosis, private configuration inspection, repair and restart guidance, isolation warnings, and local-demo/non-production limitations.
- Validate the published immutable image in separate healthy and deliberately fault-injected instances without attaching an accepted volume.

## Non-goals

- Changing `/api/health`, approved ownership behavior, ownership tests, or any other existing application behavior.
- Replacing or modifying the existing `getTicketStore()` accessor or introducing another store abstraction or standalone `SELECT 1` probe.
- Changing dependencies, shared automation, infrastructure, authentication, metrics, alerting, review policy, or previous lifecycle artifacts.
- Rewriting frozen tests from the cancelled run or weakening production behavior or checks to accommodate a defective harness.
- Modifying accepted volumes or treating fault injection as a production outage.
- Claiming a production incident, customer benefit, SLO attainment, availability certification, independent Human review, or Demo Ready status.
- Treating an isolated pre-approval harness experiment as stage Green, production delivery, or permission to place production code in a Tests commit.
- Treating successful validation, an AI comment, or a checklist as Human approval.

## Actors

- **Routing or orchestration system:** Calls `/api/ready` to decide whether the application can currently serve database-dependent traffic.
- **Operator or maintainer:** Diagnoses a generic readiness failure, privately inspects configuration, repairs storage access, restarts when required, and confirms recovery without exposing sensitive values.
- **Application user:** Continues using the dashboard and ownership UI with no behavioral change when storage is healthy.
- **Application runtime:** Evaluates readiness through the existing ticket-store accessor and summary operation on every request.
- **Specification reviewer:** Reviews the behavioral contract and unresolved decisions; only an explicit configured Human approval can approve the specification.
- **Delivery validator:** Exercises the same immutable image digest in isolated healthy and fault-injected environments and records only behavior actually observed.

## Constraints

- `/api/health` must remain HTTP 200 with exactly `{"status":"ok"}` and must remain independent of database availability.
- `/api/ready` must invoke the existing `getTicketStore().summary()` path on every request.
- The existing accessor must remain unchanged; its singleton continues to be assigned only after successful construction.
- Readiness responses must use exact JSON bodies and must include `Cache-Control: no-store`.
- Failure responses and logs must not expose exception text, filesystem paths, ticket data, credentials, stack traces, or other sensitive details.
- Failure logging must consist of one fixed, bounded, generic readiness-failure message per failed request.
- Readiness must not cache either success or failure.
- Existing schema creation, nullable ownership migration, and seeding may occur through normal first use. Once established, repeated probes must preserve every persisted row and field.
- All 37 baseline tests and existing ownership and application behavior must remain compatible.
- New readiness tests must follow the existing direct-module Vitest conventions rather than introducing an HTTP test harness.
- Before the route exists, every named Red scenario must assert route existence within its own test body before a guarded dynamic import. Import, collection, hook, or startup failures and skipped tests do not count as controlled Red.
- The expected-failure manifest must contain every and only assertion-failing test name actually observed in this run.
- `beforeEach` in the new test file must use a block body that returns no mock or cleanup value.
- Tests observing migration from another SQLite connection must use a fresh read-only connection or explicitly refresh schema metadata.
- Every test-owned database handle must be closed during cleanup.
- A pre-approval experiment against an unmerged candidate must be isolated and explicitly labelled; all normal stage checks remain required.
- Published-image validation must use the same immutable digest for healthy and fault-injected instances, and neither instance may attach an accepted volume.
- Prior artifacts, branches, pull requests, accepted volumes, and evidence must be preserved.

## Acceptance scenarios

### AC-1: Report a healthy database as ready

**Given** the application can successfully initialize the existing ticket store and execute `getTicketStore().summary()`  
**When** `/api/ready` is requested  
**Then** the application invokes the accessor and summary operation for that request and returns HTTP 200 with exactly `{"status":"ready"}` and `Cache-Control: no-store`

### AC-2: Report initialization failure as unavailable

**Given** the configured database location or environment prevents the existing ticket store from being initialized  
**When** `/api/ready` is requested  
**Then** the application returns HTTP 503 with exactly `{"status":"unavailable"}` and `Cache-Control: no-store`, without returning exception details or partially caching a store instance

### AC-3: Report summary-read failure as unavailable

**Given** ticket-store construction succeeds but `summary()` throws while reading storage  
**When** `/api/ready` is requested  
**Then** the application returns HTTP 503 with exactly `{"status":"unavailable"}` and `Cache-Control: no-store`

### AC-4: Sanitize readiness failure reporting

**Given** initialization or summary reading fails with an exception containing sensitive text  
**When** `/api/ready` handles the failure  
**Then** it emits exactly one fixed, bounded, generic readiness-failure log message for that request, and neither the response nor the log contains error text, paths, ticket data, credentials, or stack traces

### AC-5: Re-evaluate readiness after repair

**Given** one readiness request failed because storage was unavailable and the underlying storage access is subsequently repaired  
**When** `/api/ready` is requested again  
**Then** the application calls `getTicketStore().summary()` again and returns the current healthy result rather than reusing the earlier failure

### AC-6: Re-evaluate successive successful probes

**Given** storage is healthy and one readiness request has succeeded  
**When** another readiness request is made  
**Then** the application performs another accessor and summary evaluation rather than returning a cached success

### AC-7: Preserve liveness compatibility during database failure

**Given** the application process is live but its database cannot be initialized or read  
**When** `/api/health` and `/api/ready` are requested  
**Then** `/api/health` remains HTTP 200 with exactly `{"status":"ok"}`, while `/api/ready` returns HTTP 503 with exactly `{"status":"unavailable"}`

### AC-8: Preserve existing healthy application behavior

**Given** a healthy database containing populated ownership rows  
**When** readiness is probed repeatedly and the dashboard and ownership UI are used  
**Then** all existing application behavior remains functional, including ownership behavior, and the 37 baseline tests remain compatible

### AC-9: Allow first-use initialization without data loss

**Given** an isolated file-backed database requires existing first-use schema creation, nullable ownership migration, or seeding  
**When** `/api/ready` first evaluates the store  
**Then** the normal initialization behavior may complete and readiness returns HTTP 200 only after `summary()` succeeds

### AC-10: Preserve complete persisted rows across probes

**Given** an isolated file-backed database contains seeded, migrated, and populated ticket records with all supported fields  
**When** readiness is requested repeatedly  
**Then** fresh observation of the database shows that every pre-existing row and field remains unchanged after normal first-use initialization has completed

### AC-11: Reject an invalid storage configuration safely

**Given** `SERVICE_DESK_DB_PATH` points to a location that cannot host or open the service-desk database, including the deliberate `/dev/null/service-desk.db` fault  
**When** the application receives readiness and liveness requests  
**Then** readiness returns the exact unavailable contract, liveness returns the unchanged healthy contract, and no sensitive configuration value is exposed in either response or readiness-failure log

### AC-12: Establish controlled Red evidence

**Given** the readiness route does not yet exist and the new readiness test file follows the existing direct-module Vitest conventions  
**When** each named readiness scenario runs before implementation  
**Then** that test body first asserts route existence before guarded dynamic import, fails through an observed assertion rather than import, collection, hook, startup failure, or skip, and the expected-failure manifest records every and only the names that actually failed by assertion

### AC-13: Avoid lifecycle and SQLite observer defects in tests

**Given** the new readiness tests install mocks, migrate a real SQLite database, and inspect persisted data  
**When** setup, observation, and cleanup execute  
**Then** `beforeEach` returns no mock or cleanup value, post-migration observation uses a fresh read-only connection or explicit schema refresh, and all test-owned handles are closed

### AC-14: Document operation and recovery

**Given** an operator needs to distinguish process liveness from database readiness  
**When** the operator follows the application README  
**Then** the documentation provides the exact endpoint contracts, local commands, generic failure diagnosis, private configuration inspection, storage repair and restart steps, isolation warnings, and local-demo/non-production limitations without instructing the operator to disclose private values

### AC-15: Validate the published immutable image

**Given** a protected merge has produced a published immutable image and isolated healthy and fault-injected instances can be created without accepted volumes  
**When** both instances run the same image digest and the documented repair procedure is exercised  
**Then** the healthy instance returns ready 200, the faulted instance returns ready 503, both readiness responses have exact bodies and `no-store`, health returns 200 in both, failure logging is fixed and sanitized, populated ownership rows remain unchanged across repeated probes, the dashboard and ownership UI work in the healthy instance, and the repaired instance demonstrates the documented recovery behavior before digest-bound development-test acceptance is submitted

### AC-16: Preserve delivery compatibility boundaries

**Given** the readiness work is delivered  
**When** repository changes and lifecycle evidence are reviewed  
**Then** there are no changes to dependencies, shared automation, infrastructure, authentication, metrics, alerting, review policy, accepted ownership behavior, previous lifecycle artifacts, or accepted volumes

## Revision summary

This is the initial specification for Human Intent #17; there is no previous specification revision and no recorded Human decision to map.

The proposal carries forward the explicit product outcome from the Intent: retain database-independent liveness and add a separate dynamically evaluated readiness endpoint. It incorporates the corrected test-harness requirements identified after the cancelled Intent #8 attempt, including non-returning `beforeEach` setup, fresh or refreshed SQLite observation, and complete handle cleanup. It also preserves the requested delivery boundary, immutable-image validation, documentation obligations, and compatibility with the accepted ownership baseline.

No alternative is presented as an unresolved product choice: retaining manual dashboard checks and repurposing health are documented alternatives, while the separate readiness endpoint is the explicit Intent choice. This initial draft is a candidate for Human review, not an approval or implementation authorization.

## Open questions

None. The supplied discovery register contains no questions or recorded decisions, and the Intent explicitly selects the separate readiness endpoint and defines its externally observable behavior.

