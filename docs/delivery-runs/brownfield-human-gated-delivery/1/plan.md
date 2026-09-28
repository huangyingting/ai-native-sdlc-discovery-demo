# Implementation plan

## Acceptance mapping

| Acceptance scenario | Tasks | Planned evidence |
|---|---|---|
| AC-1: Migrate existing tickets without data loss | TASK-1, TASK-2, TASK-7 | A file-backed old-schema SQLite fixture is upgraded in place; row snapshots, timestamps, fixture identities, summary counts, and existing queue behavior are unchanged while ownership becomes null/Unassigned. |
| AC-2: Assign, reassign, clear, and repeat ownership on ticket detail | TASK-1, TASK-3, TASK-4, TASK-7 | Store, server-action, and rendered-page tests cover both roster members, null normalization, persistence after close/reopen, restricted field changes, and write-free no-ops. |
| AC-3: Combine owner filtering with existing queue criteria | TASK-1, TASK-5, TASK-7 | Store and dashboard tests assert every exact fixture result set, conjunctive filtering, preserved non-owner criteria, unfiltered summaries, and synchronized navigation state. |
| AC-4: Provide accessible controls and reject invalid ownership requests | TASK-1, TASK-3, TASK-4, TASK-5, TASK-7 | Action/storage tests prove invalid requests mutate no rows; component and rendered-page checks prove labels, exposed values, fixed options, and keyboard operation. |
| AC-5: Preserve ticket creation and status behavior | TASK-1, TASK-2, TASK-3, TASK-6, TASK-7 | Regression tests verify unchanged creation inputs/defaults and status behavior, null ownership for new tickets, and preservation of ownership during status updates. |

## Tasks

### TASK-1: Establish controlled Red acceptance coverage

Depends on: none  
Acceptance: AC-1, AC-2, AC-3, AC-4, AC-5  
Surfaces: `src/lib/ticket-store.test.ts`, `src/app/page.test.tsx`, `src/app/custom-select.test.tsx`, new focused tests beside `src/app/actions.ts` and `src/app/tickets/[id]/page.tsx` where needed  
Validation: Add acceptance-focused tests and run only the affected Vitest files to record expected failures caused by the absent owner schema, ownership operations, detail control, queue display, and owner filtering; confirm unrelated existing tests remain Green and retain the controlled Red evidence before implementation begins.

Create reusable test setup for the four fixed fixtures and a file-backed legacy database built with the current ownerless `tickets` schema. Snapshot every legacy column before upgrade, including identifiers and timestamps, and assert the initial summary `{ open: 2, inProgress: 1, resolved: 1, urgent: 2 }`.

Cover assignment, reassignment, empty-input clearing, persistence across store close/reopen, unchanged non-owner fields, and nondecreasing `updatedAt`. Prove a repeated normalized owner is write-free, rather than checking only an unchanged timestamp, by using SQLite change/trigger evidence that would detect an attempted `UPDATE`. Snapshot all rows before forged-owner and nonexistent-ticket requests and assert exact equality afterward.

Add the AC-3 fixture ownership states and exact result-set assertions. Extend rendered UI coverage for owner visibility, labels, current values, keyboard-compatible fixed options, preserved query criteria, unfiltered cards, and control remounting/state synchronization after navigation. Preserve the existing `CustomSelect` behavior tests rather than replacing them with ownership-only tests.

### TASK-2: Add the nullable ownership model and in-place migration

Depends on: TASK-1  
Acceptance: AC-1, AC-5  
Surfaces: `src/lib/ticket.ts`, `src/lib/ticket-store.ts`, SQLite schema initialization and row mapping  
Validation: Run the migration and model tests from TASK-1 against both a real ownerless database file and a newly created database; compare pre-upgrade and post-upgrade legacy-column snapshots and summary counts exactly.

Define the fixed owner identifiers and display names in the ticket domain, add nullable ownership to `Ticket` and `TicketRow`, and centralize owner formatting so the queue and detail consistently display Unassigned, Avery Stone, or Jordan Lee.

Extend `TicketStore` initialization with an idempotent schema migration that detects the missing ownership column before adding a nullable column constrained to the approved identifiers. Existing rows must acquire null ownership without rebuilding, reseeding, or rewriting legacy values. Ensure repeated startup is safe and that seeding and `create()` continue to omit ownership, producing null.

Do not introduce a default owner, attribution mapping, creation-form field, external roster table, or new dependency.

### TASK-3: Implement validated ownership persistence and server action

Depends on: TASK-2  
Acceptance: AC-2, AC-4, AC-5  
Surfaces: `src/lib/ticket.ts`, `src/lib/ticket-store.ts`, `src/app/actions.ts`  
Validation: Run focused store and action tests for valid changes, empty-input normalization, invalid owners, missing ticket IDs, no-op writes, row snapshots, timestamp behavior, status compatibility, and file-backed restart persistence.

Add an ownership request schema that coerces a positive ticket ID, maps empty ownership input to null, and accepts only `avery-stone` or `jordan-lee` otherwise. Revalidate at the storage boundary so direct or forged calls cannot bypass the server-action schema.

Implement a store operation that first resolves the target ticket and normalized requested owner. Return an explicit nonexistent-ticket error before mutation; reject a forged nonempty owner explicitly; return successful no-op state without executing an `UPDATE` when the normalized owner is already current. For a real change, update only ownership and an `updated_at` value no earlier than the stored timestamp.

Add a detail-page server action following the existing status-action pattern, with explicit ownership-specific failures and revalidation of the queue and target detail page. Keep ownership updates independent from status updates so each workflow preserves the other field.

### TASK-4: Add ownership visibility and the detail handoff control

Depends on: TASK-3  
Acceptance: AC-2, AC-4  
Surfaces: `src/app/tickets/[id]/page.tsx`, `src/app/page.tsx`, `src/app/custom-select.tsx`, `src/app/globals.css`  
Validation: Render assigned and unassigned queue/detail states, inspect programmatic labels and exposed current values, and exercise assignment, reassignment, and clearing with keyboard input through the existing combobox behavior.

Display formatted ownership in each queue row and in the ticket detail record. Add a separate ownership form on ticket detail with a labeled `CustomSelect` containing exactly Unassigned, Avery Stone, and Jordan Lee, a hidden ticket ID, and a save control wired to the ownership action.

Reuse the existing keyboard-operable `CustomSelect`; change the shared component only if acceptance tests expose an ownership-specific synchronization or accessibility defect. Keep ownership absent from `src/app/ticket-form.tsx` and the new-ticket page.

Adjust queue columns and responsive styling only as needed to accommodate ownership without changing queue ordering or obscuring existing status, priority, and update information.

### TASK-5: Add conjunctive owner filtering

Depends on: TASK-2, TASK-4  
Acceptance: AC-3, AC-4  
Surfaces: `src/lib/ticket.ts`, `src/lib/ticket-store.ts`, `src/app/page.tsx`, `src/app/globals.css`  
Validation: Run store and dashboard tests asserting the four exact owner result sets, Avery plus open/high/`inc-1`, Avery plus critical, preserved non-owner criteria, existing search normalization, unfiltered summaries, and navigation-state synchronization.

Extend `TicketStore.list()` with an owner criterion that adds an `IS NULL` clause for Unassigned, an equality clause for roster members, and no clause for All owners. Append it to the existing status, priority, and search clauses so all criteria remain conjunctive without changing reference matching or queue ordering.

Parse only the approved owner query values in the dashboard; treat absent or unsupported navigation state as All owners rather than displaying a stale selection. Add a labeled owner `CustomSelect` containing exactly All owners, Unassigned, Avery Stone, and Jordan Lee. Key it from the normalized active criterion, following the existing status and priority remount pattern.

Submitting All owners must preserve the current search, status, and priority form values while removing the ownership restriction. Continue calling `summary()` without filters so cards remain independent of queue criteria.

### TASK-6: Lock down creation, status, and documentation compatibility

Depends on: TASK-3, TASK-5  
Acceptance: AC-1, AC-5  
Surfaces: `src/lib/ticket-store.test.ts`, `src/app/ticket-form.tsx`, `src/app/actions.ts`, `src/app/tickets/new/page.tsx`, `README.md`  
Validation: Run regression tests showing that creation still yields the existing identifier, open status, defaults, and timestamp behavior; that no owner input is rendered or accepted; and that status changes preserve assigned and unassigned ownership.

Retain the current creation schema and form fields, allowing the database default/null behavior to leave new tickets unassigned. Verify that ownership data supplied outside the supported creation fields is not consumed. Exercise status updates for Avery-owned, Jordan-owned, and unassigned tickets and compare all fields not owned by the status workflow.

Revise the application documentation to describe ownership visibility, detail-based handoff, filtering, migration behavior, and fixed roster. Remove the statement that assignment remains a future feature while keeping unrelated follow-up limitations intact.

### TASK-7: Complete Green verification and delivery checks

Depends on: TASK-1, TASK-2, TASK-3, TASK-4, TASK-5, TASK-6  
Acceptance: AC-1, AC-2, AC-3, AC-4, AC-5  
Surfaces: complete `demos/it-service-desk` application, test suite, TypeScript compilation, lint configuration, production build  
Validation: Convert all controlled Red acceptance tests to Green through implementation, rerun the focused tests, then run `npm test`, `npm run lint`, `npx tsc --noEmit --incremental false`, and `npm run build` from `demos/it-service-desk`.

Review the final test evidence against each AC rather than treating compilation or a fresh database as a migration proxy. Repeat the file-backed migration and restart cases using isolated temporary databases; do not use or commit `data/service-desk.db`.

Confirm the final diff contains no ownership control on ticket creation, no unrelated feature work, no generated build output, no local database, and no dependency change unless implementation reveals a requirement that is separately justified.

## Risks and migrations

- **Legacy data rewrite:** Recreating the table or rerunning seed logic could alter IDs, values, timestamps, or fixture counts. Use schema introspection and an additive nullable-column migration, then compare every pre-existing column before and after upgrade.
- **Migration idempotency:** Startup currently performs schema initialization in the `TicketStore` constructor. The migration must tolerate both old and already-upgraded files and must not issue repeated `ALTER TABLE` operations.
- **False migration confidence:** Existing tests use in-memory databases created from the latest schema. A separately constructed file-backed old-schema database with persisted rows is mandatory evidence for AC-1.
- **No-op writes:** SQLite may report or execute an update even when values are equal. Compare normalized ownership before preparing/executing the update, and verify the absence of an update through write-sensitive test evidence.
- **Timestamp regression:** Wall-clock skew or future persisted timestamps could make a naïve current timestamp decrease. A real ownership change must select an update value that is not earlier than the stored `updatedAt`.
- **Validation bypass:** TypeScript unions and client controls do not protect the runtime boundary. Validate forged input in the server action and again in the store operation before any SQL mutation.
- **Cross-workflow clobbering:** Ownership and status use separate forms and updates. Their SQL statements and regression snapshots must prove that each changes only its approved fields.
- **Filter-state drift:** `CustomSelect` owns client state initialized from `defaultValue`. The owner control must follow the existing keyed remount approach so browser navigation or changed query parameters cannot leave a stale visible selection.
- **Queue layout regression:** Adding an owner column may compress or clip the responsive ticket list and filter menus. Preserve the existing horizontal overflow and visible dropdown behavior with rendered CSS checks.
- **Deferred product evidence:** The approved discovery brief records no customer interviews, measured baseline, productivity target, ROI evidence, or completed live scenarios. Delivery must use observable acceptance behavior only and must not present these deferred evidence gaps as resolved.
- **Rollback:** Because ownership is additive and nullable, older application binaries would ignore the added column while retaining legacy data. Removing the column is not part of this delivery; any destructive downgrade would require a separately approved migration plan.

## Validation

1. **Controlled Red:** Add the acceptance tests first and run only the affected Vitest files. Preserve evidence that failures correspond to missing ownership behavior, while existing unrelated tests remain Green. Do not weaken existing assertions or mark expected failures as skipped.
2. **Migration Green:** Build an old-schema database directly with persisted fixture rows, open it through the upgraded `TicketStore`, and verify null ownership, Unassigned display, exact legacy-column equality, exact timestamps, all four fixtures, and summary counts `{ open: 2, inProgress: 1, resolved: 1, urgent: 2 }`.
3. **Ownership Green:** Verify assign, reassign, clear, empty-to-null normalization, repeat/no-op behavior, changed-field boundaries, nondecreasing `updatedAt`, and persistence after closing and reopening the same file.
4. **Invalid-input Green:** Submit a forged nonempty owner and a nonexistent ticket ID through the server/storage boundary. Assert explicit errors and byte-for-value row snapshots showing that no ticket or other database row changed.
5. **Filter Green:** Assert All owners returns exactly `INC-0001` through `INC-0004`; Avery returns exactly `INC-0001` and `INC-0003`; Jordan returns exactly `INC-0002`; Unassigned returns exactly `INC-0004`; Avery plus open/high/`inc-1` returns only `INC-0001`; and Avery plus critical returns none.
6. **UI and accessibility Green:** Render queue and detail states for every owner value. Verify associated labels, exposed selected values, exact options, keyboard operation, owner visibility, preserved non-owner filters when ownership is cleared, unfiltered cards, and no stale owner selection after navigation.
7. **Compatibility Green:** Re-run existing search/reference, queue ordering, summary, creation, status, and `CustomSelect` regressions. Confirm creation has no ownership control and creates null ownership; confirm status changes preserve ownership.
8. **Complete application checks:** From `demos/it-service-desk`, run `npm test`, `npm run lint`, `npx tsc --noEmit --incremental false`, and `npm run build` under Node.js 24 or newer.

## Revision summary

This is the initial implementation-plan revision; no previous Plan document was supplied, so there are no stable task IDs to retain from an earlier revision.

Human decisions from approved Spec v5 are preserved: optional ownership; null/Unassigned legacy and newly created tickets; the fixed Avery Stone and Jordan Lee roster; assignment, reassignment, and clearing only on ticket detail; explicit invalid-request handling; write-free no-ops; exact intersecting owner-filter behavior; unfiltered summary cards; and migration proof using a real old-schema database.

This Plan proposes implementation placement within the observed application: domain and schemas in `src/lib/ticket.ts`, additive migration and persistence in `src/lib/ticket-store.ts`, server handling in `src/app/actions.ts`, queue behavior in `src/app/page.tsx`, and detail handoff in `src/app/tickets/[id]/page.tsx`. It also proposes write-sensitive no-op tests, keyed owner-control synchronization, and an additive nullable-column migration. These are engineering proposals, not additional Human product decisions and not revisions to the approved Spec.

Only explicit Human approval of this Plan version permits engineering handoff. Any required change to an approved acceptance scenario or Human decision requires an explicit Spec revision and invalidates this draft Plan.

## Open questions

None. The existing application surfaces support the approved behavior without exposing a consequential conflict, and Q-1 through Q-4 are recorded as resolved. The absence of business metrics and completed live-scenario evidence remains an explicitly deferred risk, not a resolved fact or an implementation blocker.

