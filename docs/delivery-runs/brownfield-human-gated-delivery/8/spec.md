# Specification

## Intent

Add a database-backed readiness signal to the Northstar IT Service Desk without changing its existing process-liveness contract.

`GET /api/ready` must exercise the existing `TicketStore` initialization and ticket-query path so operators can determine whether the application can serve ticket traffic. `GET /api/health` remains the lightweight liveness endpoint and continues to return HTTP 200 with exactly `{"status":"ok"}`, even when ticket storage cannot initialize.

This maintenance iteration extends the accepted delivery baseline without changing the previously accepted ownership contract or claiming a production incident, customer impact, SLO, or availability certification.

## Discovery

```json
{
  "problem": "Operators can confirm that the Node.js process is alive through GET /api/health, but cannot determine through a dedicated probe whether the SQLite-backed ticket store can initialize and answer application reads. An isolated fault-injected replica demonstrated that liveness can remain successful while the dashboard fails, so routing ticket traffic based only on liveness can send requests to an unusable instance.",
  "evidence": "On 2026-09-28, an isolated disposable replica of the accepted image digest was started with SERVICE_DESK_DB_PATH=/dev/null/service-desk.db. GET /api/health returned HTTP 200 with {\"status\":\"ok\"}; GET / returned HTTP 500 with logs identifying database initialization failure; GET /api/ready returned HTTP 404 because no readiness route exists. No production incident, customer impact, or accepted-volume modification is claimed. Broader production evidence and availability measurements are missing.",
  "successMeasure": "A healthy instance returns the exact readiness success contract after a real TicketStore-backed read; an instance whose ticket storage initialization or read throws returns the exact unavailable contract without disclosing sensitive details; liveness remains unchanged in both cases; readiness is evaluated on every request, can reflect recovery, and repeated probes do not modify existing ticket rows. No production baseline or SLO target is asserted.",
  "alternatives": "Do nothing and retain manual dashboard checks, which avoids code change but provides no dedicated routing signal. Change GET /api/health into a database check, which is smaller in endpoint count but breaks established liveness semantics. The proposed separate GET /api/ready endpoint preserves compatibility while adding a storage-aware signal.",
  "questions": [],
  "decisionMapping": []
}
```

## Scope

- Add a Node.js `GET /api/ready` route.
- Evaluate readiness on every request by obtaining the existing application `TicketStore` and performing an actual ticket-storage read through its existing query behavior.
- Return HTTP 200 with exactly `{"status":"ready"}` when storage initialization and the read succeed.
- Return HTTP 503 with exactly `{"status":"unavailable"}` when storage initialization or the read throws.
- Include `Cache-Control: no-store` on both readiness responses.
- Log readiness failures with a bounded, generic message that does not reveal database paths, ticket data, credentials, exception messages, or stack traces.
- Permit the existing first-use schema migration and seed behavior when readiness initializes a healthy store.
- Add executable coverage for healthy, failing, recovery, no-store, non-mutation, and liveness-compatibility behavior without altering the approved ownership tests.
- Update the application runbook with the liveness/readiness distinction, exact responses, local probe commands, safe diagnosis and configuration repair/restart guidance, and the limitation that this is a local demonstration rather than production availability certification.
- At delivery, collect evidence from healthy and separately fault-injected instances of the published immutable image, including readiness, liveness, ownership-data preservation, and healthy-dashboard behavior.

## Non-goals

- Changing `GET /api/health` into a database-readiness check.
- Replacing or duplicating the existing `TicketStore` or built-in `node:sqlite` implementation.
- Using a static readiness value or a standalone database query such as `SELECT 1` that bypasses ticket storage.
- Changing ticket creation, status transitions, search, filtering, ownership assignment, ownership persistence, or the fixed owner roster.
- Adding infrastructure, application dependencies, authentication, authorization, external identities, metrics platforms, alerting services, or hosted monitoring.
- Changing shared delivery automation, approved lifecycle artifacts, approved ownership tests, or previous run artifacts.
- Claiming a production outage, customer impact, business benefit, SLO compliance, production readiness, or independent Human validation.

## Actors

- **Operator:** Uses liveness to determine whether the process is running and readiness to determine whether the instance can initialize and read ticket storage before receiving ticket traffic.
- **Probe or traffic-routing system:** Calls the HTTP endpoints and relies on their exact status, body, and cache-control contracts.
- **Service desk user:** Continues using the dashboard and existing ticket and ownership workflows without behavioral changes.
- **Application:** Uses the existing singleton `getTicketStore()` initialization path and existing `TicketStore` query behavior. The current store creates or migrates the `tickets` table, adds the nullable ownership column when needed, optionally seeds an empty database, and exposes ticket reads through methods such as `list`, `find`, and `summary`.
- **Maintainer:** Diagnoses generic readiness failures using protected application logs and repairs configuration or restarts the local demonstration without exposing sensitive details through the endpoint.

## Constraints

- The application remains a Node.js 24-or-newer Next.js application using the built-in `node:sqlite` storage implementation.
- Readiness must perform a genuine application storage read. Merely constructing a response, checking process state, opening an unrelated database connection, or issuing a standalone query outside `TicketStore` is insufficient.
- The readiness response body must contain only the specified JSON status object for its outcome.
- Both readiness outcomes must prevent caching with `Cache-Control: no-store`.
- Failures must be visible in logs but sanitized at the readiness boundary. HTTP responses and bounded generic log messages must not contain database paths, ticket contents, credentials, exception text, or stack traces.
- A failed initialization must not be retained as a successful store. A later request must evaluate readiness again so repaired storage can become ready.
- Existing initialization may perform schema creation, migration, and initial seeding. After initialization, readiness probes must be read-only with respect to ticket fields, ownership, timestamps, and all other persisted rows.
- Existing `GET /api/health` status and body are an exact compatibility contract and must not depend on database availability.
- Existing ownership behavior and all create, status, search, filter, dashboard, and ticket-detail behavior must remain compatible.
- Tests for the new route must be executable and compilable before implementation. The meaningful Red state must come from an explicit assertion about missing readiness behavior, not a missing-module, dynamic-import, or test-collection failure.
- Delivery evidence must use the published immutable image in isolated healthy and fault-injected instances and must not modify an accepted data volume.

## Acceptance scenarios

### AC-1: Report readiness when ticket storage is usable

**Given** the application has a usable SQLite configuration and the existing `TicketStore` can initialize and complete a real ticket-storage query  
**When** a client sends `GET /api/ready`  
**Then** the response is HTTP 200 with exactly `{"status":"ready"}`, includes `Cache-Control: no-store`, and derives success from the existing ticket-storage path rather than a static value or standalone database check

### AC-2: Reject readiness when database configuration is unusable

**Given** the configured database path is invalid or otherwise causes existing ticket-store initialization or the ticket read to throw  
**When** a client sends `GET /api/ready`  
**Then** the response is HTTP 503 with exactly `{"status":"unavailable"}` and includes `Cache-Control: no-store`

### AC-3: Sanitize and log readiness failures

**Given** ticket-store initialization or its readiness read throws an error that may contain a database path, exception message, stack trace, credentials, or ticket information  
**When** `GET /api/ready` handles the failure  
**Then** the application explicitly records a bounded generic readiness-failure message, while neither the HTTP response nor that generic message exposes the sensitive error details

### AC-4: Re-evaluate readiness and reflect recovery

**Given** one readiness request failed because ticket storage was unavailable and the underlying configuration or storage condition is subsequently repaired  
**When** a later request sends `GET /api/ready`  
**Then** the application performs the readiness evaluation again and returns the current result, including HTTP 200 with exactly `{"status":"ready"}` when the existing store can now initialize and read, rather than replaying a cached failure

### AC-5: Do not cache successful readiness

**Given** a readiness request has succeeded  
**When** another request sends `GET /api/ready`  
**Then** the application performs another real storage read, returns the current outcome, and does not reuse a prerendered or cached success response

### AC-6: Preserve persisted ticket and ownership data

**Given** a healthy initialized database contains tickets with populated ownership and other persisted values  
**When** readiness is requested repeatedly  
**Then** the ticket rows remain unchanged, including owner, status, priority, content, creation time, update time, and other persisted fields

### AC-7: Allow existing first-use initialization

**Given** a usable database target requires the schema creation, existing ownership-column migration, or empty-database seeding already performed by `TicketStore` initialization  
**When** the first `GET /api/ready` request initializes the application store and completes a ticket read  
**Then** those existing initialization behaviors may occur and the endpoint returns HTTP 200 with exactly `{"status":"ready"}` after the read succeeds

### AC-8: Preserve liveness during database failure

**Given** ticket storage initialization or reading fails  
**When** a client sends `GET /api/health`  
**Then** the response remains HTTP 200 with exactly `{"status":"ok"}` and does not depend on readiness or database state

### AC-9: Preserve existing service desk behavior

**Given** a healthy database containing existing tickets and ownership data  
**When** users access the dashboard, create tickets, change ticket status, search, filter, assign or clear ownership, or view ticket details after readiness probes have run  
**Then** all previously accepted behavior remains available and compatible, including ownership persistence and an unmodified healthy dashboard

### AC-10: Document safe local operation

**Given** an operator needs to distinguish process liveness from database readiness in the local demonstration  
**When** the operator follows the updated runbook  
**Then** the runbook provides the exact endpoint responses and local probe commands, explains safe failure diagnosis and configuration repair/restart, and states that these checks do not certify production availability

### AC-11: Verify the immutable delivery image

**Given** the published immutable image is run in one healthy isolated instance and one separately fault-injected instance without attaching or modifying an accepted data volume  
**When** the documented delivery checks are performed  
**Then** healthy readiness is HTTP 200, fault-injected readiness is HTTP 503, liveness is HTTP 200 in both instances, repeated healthy probes preserve a populated ownership dataset, and the dashboard remains usable in the healthy instance

## Revision summary

This is the initial specification proposal for Human Intent #8; there is no previous specification revision and no recorded Human decision to map.

The proposal translates the Intent into explicit readiness, failure, caching, recovery, non-mutation, compatibility, documentation, and immutable-image verification scenarios. It is grounded in the current application, where `GET /api/health` returns the lightweight JSON liveness response, dashboard rendering obtains the singleton store through `getTicketStore()`, and `TicketStore` performs SQLite schema initialization, ownership migration, optional seeding, and ticket queries.

The separate readiness endpoint and preservation of liveness are stated Intent requirements, not newly selected options. Keeping only manual dashboard checks and converting `/api/health` into readiness remain rejected alternatives described by the Intent. No additional product option has been selected in this revision.

## Open questions

None. The supplied discovery register contains no questions, and no consequential contradiction or feasibility issue was identified during application review.

