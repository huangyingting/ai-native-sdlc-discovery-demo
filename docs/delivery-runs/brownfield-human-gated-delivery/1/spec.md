# Specification

## Intent

Enable support agents and team leads to see, manage, and filter ticket ownership in the existing SQLite-backed IT service desk.

Ownership is optional. Existing and newly created tickets start unassigned. After triage, users can assign, reassign, or clear ownership from ticket detail using the fixed local roster of Avery Stone (`avery-stone`) and Jordan Lee (`jordan-lee`). The ticket creation form remains unchanged and does not request or accept ownership.

Ownership must be visible in the queue and ticket detail. The queue must support an owner filter that intersects with the existing search, status, and priority filters. Ownership changes must persist when the application restarts with the same database volume.

The application currently creates tickets with an `open` status, supports status updates, searches by title, requester, reference, or numeric identifier, combines search with status and priority filters, and calculates summary counts from ticket status and priority. These behaviors must remain compatible.

## Discovery

```json
{
  "problem": "Support agents and team leads using the IT service desk cannot see who is responsible for a ticket or identify assigned and unassigned work in the queue, making ownership during handoff unclear.",
  "evidence": "The existing SQLite-backed demonstration application has no owner field in its ticket model, database schema, creation workflow, queue, or ticket detail. This source baseline demonstrates the missing capability. Customer interviews, measured business baselines, verified productivity claims, and evidence from completed live scenarios are missing.",
  "successMeasure": "Observable success means a real old-schema database migrates without changing persisted ticket data or initial summary counts; existing and newly created tickets begin unassigned; ownership can be assigned, reassigned, and cleared from ticket detail using the fixed local roster; ownership is visible in the queue and detail; the owner filter produces the specified exact fixture result sets while intersecting with existing criteria; valid changes persist after restarting with the same database volume; invalid input leaves every stored row unchanged; no-op submissions do not write; summary cards remain unfiltered; and existing ticket workflows remain compatible. No business-metric baseline or target is available.",
  "alternatives": "Do nothing and retain the current handoff process, which avoids migration risk but leaves responsibility invisible. Add ownership display and detail-based handoff without filtering, which is a smaller change but does not support finding work by owner. Add display, handoff, and the agreed intersecting owner filter, which supports queue discovery but adds UI and query complexity.",
  "questions": [
    {
      "id": "Q-1",
      "question": "May tickets remain unassigned (including existing and new tickets), or must every ticket have an owner?",
      "options": "Allow unassigned tickets, preserving a visible unassigned state and permitting ownership to be cleared / require every ticket to have an owner, preventing creation or clearing without a valid owner."
    },
    {
      "id": "Q-2",
      "question": "Should owners come from the fixed local roster Avery Stone (avery-stone) and Jordan Lee (jordan-lee), or be entered as free text?",
      "options": "Use the fixed local roster for consistent identities and controlled validation / accept free text for flexibility, with greater risk of inconsistent names and matching."
    },
    {
      "id": "Q-3",
      "question": "Is displaying ownership sufficient, or should the queue also filter by owner in combination with existing search, status, and priority filters?",
      "options": "Display ownership without adding a filter for the smaller change / add an owner filter that intersects with search, status, and priority for stronger queue discovery."
    },
    {
      "id": "Q-4",
      "question": "If every ticket must have an owner, how should existing ownerless tickets be handled during migration?",
      "options": "Backfill a Human-selected default owner for all existing tickets / require an explicit migration mapping for existing tickets / retain existing tickets as unassigned exceptions while requiring ownership for new and subsequently edited tickets; each option trades migration simplicity against attribution accuracy and policy consistency."
    }
  ],
  "decisionMapping": [
    {
      "questionId": "Q-1",
      "commentId": 5862237360,
      "acceptanceIds": [
        "AC-1",
        "AC-2",
        "AC-5"
      ],
      "explanation": "AC-1 requires existing tickets to migrate as unassigned without changing their existing values or timestamps; AC-2 permits assignment, reassignment, and clearing from ticket detail; AC-5 requires newly created tickets to remain unassigned without adding ownership to creation."
    },
    {
      "questionId": "Q-2",
      "commentId": 5862260763,
      "acceptanceIds": [
        "AC-2",
        "AC-4"
      ],
      "explanation": "AC-2 limits assignment to Avery Stone and Jordan Lee, normalizes empty input to null, makes an already-current owner a write-free successful no-op, and restricts real changes to ownership plus a nondecreasing updatedAt. AC-4 rejects forged nonempty owner values and nonexistent ticket identifiers without mutating data."
    },
    {
      "questionId": "Q-3",
      "commentId": 5862281080,
      "acceptanceIds": [
        "AC-3"
      ],
      "explanation": "AC-3 requires the four-option owner filter, exact fixture result sets, conjunctive filtering, preservation of other criteria when ownership is cleared, unfiltered summary cards, and prevention of stale owner selections after navigation."
    },
    {
      "questionId": "Q-4",
      "commentId": 5862300128,
      "acceptanceIds": [
        "AC-1"
      ],
      "explanation": "AC-1 makes the mandatory-ownership branch inapplicable, requires existing rows to migrate to null without a default owner or attribution mapping, preserves every pre-existing field and timestamp and the initial fixture summary counts, and requires migration coverage using a persisted old-schema database rather than fresh seeding."
    }
  ]
}
```

## Scope

- Add optional, persisted ownership to tickets.
- Migrate a real old-schema SQLite database so every existing ticket receives null ownership and displays as Unassigned.
- Preserve every pre-existing ticket identifier, field value, and timestamp exactly during migration.
- Preserve all four fixed scenario fixtures and their initial summary counts during migration.
- Keep newly created tickets unassigned and omit ownership controls from ticket creation.
- Display Avery Stone, Jordan Lee, or Unassigned in the queue and ticket detail.
- Permit assignment, reassignment, and clearing from ticket detail through labeled, keyboard-usable controls.
- Restrict nonempty ownership values to `avery-stone` and `jordan-lee`.
- Normalize empty ownership form input to database null.
- Treat an already-current normalized owner as a successful, write-free no-op that preserves `updatedAt`.
- For a real ownership change, update only ownership and a nondecreasing `updatedAt`.
- Persist ownership changes across application restarts using the same database volume.
- Add an owner filter containing All owners, Unassigned, Avery Stone, and Jordan Lee.
- Intersect owner filtering with existing search, status, and priority criteria.
- Preserve active search, status, and priority criteria when only the owner filter is cleared.
- Keep summary cards independent of queue filters.
- Return explicit errors for forged nonempty owner values and nonexistent ticket identifiers without mutating any row.
- Preserve existing creation, status-update, search, filtering, summary, queue, and ticket-detail behavior except for the specified ownership additions.

## Non-goals

- Requiring ownership during ticket creation.
- Adding ownership controls to the creation form.
- Assigning a default owner or deriving attribution for migrated tickets.
- Free-text owner names or owners outside the fixed local roster.
- Authentication, authorization, or role-based ownership permissions.
- External identity integration or remote roster management.
- Notifications, subscriptions, escalations, or service-level agreements.
- Bulk assignment or bulk reassignment.
- Free-text audit history or a general event log.
- Filtering or recalculating summary cards according to queue filters.
- New dashboards or unrelated reporting.
- Claims about customer demand, productivity, return on investment, or completed live-scenario validation.
- Copying implementation from a previously completed demonstration repository.

## Actors

- **Support agent:** Views ownership, filters the queue by owner, and assigns, reassigns, or clears ownership after triage.
- **Team lead:** Uses ownership visibility and filtering to identify work assigned to each roster member or left unassigned.
- **Ticket requester:** Continues to create tickets without choosing an owner.
- **Roster member:** Avery Stone (`avery-stone`) or Jordan Lee (`jordan-lee`), the only permitted nonempty ownership identities.
- **Existing ticket data:** Must remain readable and retain every pre-existing identifier, value, and timestamp while gaining null ownership during migration.
- **Application and SQLite database:** Validate and persist ownership, reject invalid requests without mutation, avoid writes for no-op submissions, apply intersecting queue filters, and preserve data across restart.

Authentication and authorization are out of scope, so support agents and team leads have no distinct technical permissions in this specification.

## Constraints

- This must remain a focused brownfield extension of the existing application.
- Ownership is nullable. Existing and newly created tickets start unassigned, and assigned tickets may be returned to Unassigned.
- Ownership changes occur only from ticket detail, not from ticket creation.
- The only valid nonempty owner identifiers are `avery-stone` and `jordan-lee`.
- Empty ownership form input must normalize to database null.
- Migration must use null ownership; it must not assign a default owner or apply an attribution mapping.
- Migration verification must use a real old-schema database containing persisted rows, not only a newly seeded database using the new schema.
- Migration must preserve every pre-existing ticket field and timestamp exactly.
- Migration must preserve the four fixed scenario fixtures and their initial summary counts.
- Existing ticket creation must continue to produce an `open` ticket using the current identifier, default-value, and timestamp behavior.
- Existing status updates, queue ordering, reference formatting, summary calculations, and search by title, requester, reference, or numeric identifier must remain compatible.
- Ownership controls must have programmatically associated labels, expose their current values, and be keyboard operable.
- Client-provided owner values are untrusted and must be validated at the server or storage boundary.
- A forged nonempty owner or nonexistent ticket identifier must produce an explicit error without mutating the targeted row or any other row.
- Submitting the current normalized ownership state must succeed without a database write and preserve `updatedAt`.
- A real ownership change may modify only ownership and a nondecreasing `updatedAt`.
- A real ownership change must survive restart when the same database volume is reused.
- The owner filter must contain exactly All owners, Unassigned, Avery Stone, and Jordan Lee.
- All owners imposes no ownership restriction; each other selection returns only tickets in that ownership state.
- Owner, search, status, and priority criteria combine conjunctively.
- Clearing only ownership must set the owner filter to All owners while preserving the other active criteria.
- Summary cards must retain their existing unfiltered behavior.
- Navigation must not display an owner selection that differs from the active owner criterion.
- Candidate fixtures, checklists, scripted rehearsal statements, validation results, earlier approval commands, and AI comments do not approve this specification.

## Acceptance scenarios

### AC-1: Migrate existing tickets without data loss

**Given** a real old-schema SQLite database contains persisted ticket rows, including the four fixed scenario fixtures and their existing initial summary counts  
**When** the application upgrades and loads that database  
**Then** every existing ticket has ownership stored as null and displays as Unassigned  
**And** no default owner or attribution mapping is applied  
**And** every pre-existing identifier, field value, creation timestamp, and update timestamp remains exactly unchanged  
**And** all four fixtures and their initial summary counts remain unchanged  
**And** existing queue, detail, search, status, priority, and summary behavior remains compatible.

### AC-2: Assign, reassign, clear, and repeat ownership on ticket detail

**Given** an unassigned ticket is open on its ticket-detail page  
**When** a user selects Avery Stone or Jordan Lee and saves  
**Then** the selected owner appears on the ticket detail and queue  
**And** only ownership and a nondecreasing `updatedAt` may change  
**And** the assignment remains after restarting with the same database volume.

**Given** a ticket is assigned to one roster member  
**When** a user selects the other roster member and saves  
**Then** the new owner replaces the previous owner on the ticket detail and queue  
**And** only ownership and a nondecreasing `updatedAt` may change  
**And** the reassignment remains after restart.

**Given** a ticket is assigned to Avery Stone or Jordan Lee  
**When** a user selects Unassigned or submits empty ownership form input  
**Then** ownership is stored as database null and displays as Unassigned  
**And** only ownership and a nondecreasing `updatedAt` may change  
**And** the unassigned state remains after restart.

**Given** a ticket has a current normalized ownership state  
**When** a user saves the same owner, or submits empty input while the ticket is already unassigned  
**Then** the request succeeds as a no-op  
**And** no database write occurs  
**And** `updatedAt` and every ticket field remain unchanged.

### AC-3: Combine owner filtering with existing queue criteria

**Given** `INC-0001` and `INC-0003` are assigned to Avery Stone, `INC-0002` is assigned to Jordan Lee, and `INC-0004` is unassigned  
**When** the owner filter is set to All owners  
**Then** the queue returns exactly `INC-0001`, `INC-0002`, `INC-0003`, and `INC-0004`.

**Given** the same four fixture tickets and ownership states  
**When** the owner filter is set to Avery Stone  
**Then** the queue returns exactly `INC-0001` and `INC-0003`.

**Given** the same four fixture tickets and ownership states  
**When** the owner filter is set to Jordan Lee  
**Then** the queue returns exactly `INC-0002`.

**Given** the same four fixture tickets and ownership states  
**When** the owner filter is set to Unassigned  
**Then** the queue returns exactly `INC-0004`.

**Given** `INC-0001` matches status `open`, priority `high`, and search text `inc-1`  
**When** Avery Stone, `open`, `high`, and `inc-1` are selected together  
**Then** the queue returns only `INC-0001`  
**And** every result satisfies every active criterion.

**Given** no Avery Stone ticket has critical priority  
**When** Avery Stone and `critical` are selected together  
**Then** the queue returns no tickets.

**Given** an owner criterion and one or more search, status, or priority criteria are active  
**When** the user clears only the owner criterion  
**Then** the owner filter becomes All owners  
**And** the active search, status, and priority selections remain unchanged  
**And** existing search normalization and reference matching remain unchanged.

**Given** queue filters are active  
**When** the application displays the summary cards  
**Then** the cards retain their existing unfiltered counts.

**Given** navigation changes or restores the active queue criteria  
**When** the queue controls are displayed  
**Then** the owner control represents the active owner criterion  
**And** it does not display a stale owner selection.

### AC-4: Provide accessible controls and reject invalid ownership requests

**Given** the ownership control is displayed on ticket detail  
**When** a keyboard user navigates to and operates it  
**Then** it has a programmatically associated label, exposes the current ownership value, and supports assignment, reassignment, and clearing without pointer input.

**Given** the owner filter is displayed in the queue  
**When** a keyboard user navigates to and operates it  
**Then** it has a programmatically associated label, exposes its current selection, and permits selection of All owners, Unassigned, Avery Stone, and Jordan Lee without pointer input.

**Given** an ownership request supplies a forged nonempty value other than `avery-stone` or `jordan-lee`  
**When** the application processes the request  
**Then** it returns an explicit invalid-owner error  
**And** no ticket row or other database row is mutated.

**Given** an ownership request identifies a ticket that does not exist  
**When** the application processes the request  
**Then** it returns an explicit nonexistent-ticket error  
**And** no database row is mutated.

### AC-5: Preserve ticket creation and status behavior

**Given** a user supplies the fields required by the existing ticket-creation workflow  
**When** the user creates a ticket  
**Then** the ticket is created with its existing identifier, `open` status, default values, and timestamp behavior  
**And** ownership is stored as null and displays as Unassigned  
**And** the creation form does not request or accept an owner.

**Given** an existing ticket is assigned to Avery Stone, assigned to Jordan Lee, or unassigned  
**When** a user performs a previously supported status update  
**Then** the status update behaves as before  
**And** ownership, the ticket identifier, and fields unrelated to the status workflow remain unchanged  
**And** timestamps change only as already required by the existing status workflow.

## Revision summary

This revision incorporates the recorded Q-4 outcome while retaining the Q-1, Q-2, and Q-3 requirements and stable AC-1 through AC-5 identifiers.

AC-1 now explicitly requires migration verification against a real old-schema database containing persisted rows rather than relying on fresh seeding. It confirms that the mandatory-ownership branch does not apply, prohibits default ownership and attribution mapping, requires null/Unassigned ownership for migrated tickets, and preserves every pre-existing field, timestamp, fixed fixture, and initial summary count.

The alternatives recorded in the Discovery question register remain historical options, not current requirements. The recorded outcomes establish optional ownership, the fixed roster, detail-based handoff, and intersecting owner filtering. This revised specification still requires Human inspection and explicit approval; earlier approval commands, decisions, checklists, AI comments, or validation do not approve this version.

## Open questions

None. Q-1 through Q-4 have recorded decisions, and there are no recorded deferments or newly discovered consequential conflicts. This revised specification remains unapproved until the Human inspects and explicitly approves this version.

