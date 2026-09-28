# Specification

## Intent

Enable support agents and team leads to see and manage ticket ownership in the existing SQLite-backed IT service desk. Ownership must be visible in the ticket queue and ticket detail, support post-triage handoff from ticket detail, and persist after restarting the application with the same database volume.

Ownership is optional. Existing and newly created tickets start unassigned. Users can assign, reassign, and clear ownership from ticket detail using only the fixed local roster: Avery Stone (`avery-stone`) and Jordan Lee (`jordan-lee`), plus Unassigned. The existing creation form remains unchanged and does not request or accept an owner.

The existing application currently stores no owner field. It creates tickets with an `open` status, supports status updates, searches by title, requester, reference, or numeric identifier, combines search with status and priority filters, and derives summary counts from ticket status and priority. These behaviors must remain compatible.

## Discovery

```json
{
  "problem": "Support agents and team leads using the IT service desk cannot see who is responsible for a ticket or identify unassigned work, making ownership during handoff unclear.",
  "evidence": "The existing SQLite-backed demonstration application has no owner field in its ticket model, database schema, creation workflow, queue, or ticket detail. This source baseline demonstrates the missing capability. Customer interviews, measured business baselines, verified productivity claims, and evidence from completed live scenarios are missing.",
  "successMeasure": "Observable success means existing and newly created tickets begin unassigned, ownership can be assigned, reassigned, and cleared from ticket detail using the fixed local roster, ownership is visible on the queue and detail, valid changes persist after restarting with the same database volume, invalid input leaves every stored row unchanged, no-op submissions do not write, and existing ticket data and workflows remain compatible. If owner filtering is selected, exact fixture result sets must satisfy every active criterion. No business-metric baseline or target is available.",
  "alternatives": "Do nothing and retain the current handoff process, which avoids migration risk but leaves responsibility invisible. Add ownership display and detail-based handoff without filtering, which is the smaller change but does not directly support finding work by owner. Add display, handoff, and an intersecting owner filter, which improves queue discovery but increases UI and query complexity.",
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
      "explanation": "AC-1 requires migration to leave existing tickets unassigned without changing their existing data or timestamps; AC-2 requires assignment, reassignment, and clearing from ticket detail; AC-5 requires newly created tickets to start unassigned without adding ownership to the creation form."
    },
    {
      "questionId": "Q-2",
      "commentId": 5862260763,
      "acceptanceIds": [
        "AC-2",
        "AC-4"
      ],
      "explanation": "AC-2 limits assignment to Avery Stone and Jordan Lee, normalizes empty ownership input to null, makes an already-current owner a write-free successful no-op, and constrains real changes to ownership plus a nondecreasing updatedAt. AC-4 requires forged nonempty owner values and nonexistent ticket IDs to produce explicit errors without mutating any row."
    }
  ]
}
```

## Scope

- Add optional, persisted ownership data to tickets without changing existing ticket identifiers, field values, or timestamps during migration.
- Migrate every existing ticket to an unassigned ownership state without fabricating attribution.
- Keep newly created tickets unassigned and leave the creation form free of ownership controls.
- Display Avery Stone, Jordan Lee, or a clear Unassigned state in the ticket queue and ticket detail.
- Allow assignment, reassignment, and clearing from ticket detail through labeled, keyboard-usable controls.
- Restrict nonempty ownership values to `avery-stone` and `jordan-lee`.
- Normalize empty ownership form input to database null.
- Treat selection of the already-current owner, including the current unassigned state, as a successful no-op that performs no write and preserves `updatedAt`.
- For a real ownership change, update only ownership and a nondecreasing `updatedAt`.
- If Q-3 selects filtering, add an owner filter containing Avery Stone, Jordan Lee, and Unassigned that intersects with existing search, status, and priority criteria.
- Persist real ownership changes in SQLite so they remain visible after restarting with the same database volume.
- Return explicit errors for forged nonempty owner values and nonexistent ticket identifiers without mutating any row.
- Preserve existing creation, status-update, search, filtering, summary, queue, and ticket-detail behavior except for the specified ownership additions.

## Non-goals

- Requiring an owner during ticket creation or adding ownership controls to the creation form.
- Free-text owner names or owners outside the fixed local roster.
- Authentication, authorization, or role-based ownership permissions.
- External identity providers, directory synchronization, or remote roster management.
- Notifications, subscriptions, escalation rules, or service-level agreements.
- Bulk assignment or bulk reassignment.
- Free-text audit history or a general ticket event log.
- New dashboards or unrelated reporting.
- Claims about customer demand, productivity, return on investment, or completed live-scenario validation.
- Copying implementation from a previously completed demonstration repository.

## Actors

- **Support agent:** Views ownership in the queue and ticket detail and assigns, reassigns, or clears ownership after triage.
- **Team lead:** Uses the same ownership visibility and handoff behavior to understand responsibility and, if selected through Q-3, filters the queue by owner or Unassigned.
- **Ticket requester:** Continues to submit tickets through the existing creation workflow without selecting an owner.
- **Roster member:** Avery Stone (`avery-stone`) or Jordan Lee (`jordan-lee`), the only permitted nonempty ownership identities.
- **Existing ticket data:** Must remain readable, retain all pre-existing identifiers, values, and timestamps, and begin unassigned after migration.
- **Application and SQLite database:** Validate and persist ownership changes, reject invalid requests without mutating rows, avoid writes for no-op ownership submissions, and return consistent ticket data after restart.

Authentication and authorization are out of scope, so support agents and team leads have no different technical permissions in this specification.

## Constraints

- This is a focused brownfield extension of the existing IT service desk.
- Ownership is nullable: existing and newly created tickets start unassigned, and an assigned ticket may be returned to Unassigned.
- Ownership changes occur on ticket detail, not on the creation form.
- The only valid nonempty owner identifiers are `avery-stone` and `jordan-lee`.
- Empty ownership form input must normalize to database null.
- Existing ticket identifiers, titles, descriptions, categories, priorities, statuses, requester information, creation timestamps, and update timestamps must not be rewritten during migration.
- Existing ticket creation must continue to produce an `open` ticket using the current identifier, default-value, and timestamp behavior.
- Existing status updates, summary calculations, queue ordering, reference formatting, and search by title, requester, reference, or numeric identifier must remain compatible.
- Ownership controls must have programmatically associated labels, expose their current value, and be operable by keyboard.
- Client-provided ownership values are not trusted; roster validation must also occur at the server or storage boundary.
- A forged nonempty owner value or nonexistent ticket identifier must produce an explicit error and must not mutate the targeted row or any other row.
- Submitting an ownership value equal to the current normalized ownership state must succeed without a database write and must preserve `updatedAt`.
- A real ownership change must modify only ownership and a nondecreasing `updatedAt`; all other ticket fields must remain unchanged.
- A real ownership change must survive application restart when the same database volume is reused.
- If an owner filter is selected, it must combine conjunctively with active search, status, and priority criteria and return all and only tickets satisfying every active criterion.
- Candidate fixtures, checklists, scripted rehearsal statements, successful validation, and AI comments do not constitute Human approval.

## Acceptance scenarios

### AC-1: Migrate existing tickets without data loss

**Given** an existing SQLite database containing tickets created before ownership support  
**When** the application upgrades the database and loads those tickets  
**Then** every existing ticket has ownership stored as null and is displayed as Unassigned  
**And** every ticket retains its identifier, title, description, category, priority, status, requester information, creation timestamp, and update timestamp exactly  
**And** migration does not assign a roster member or alter existing summary, queue, detail, search, status, or priority behavior.

### AC-2: Assign, reassign, clear, and repeat ownership on ticket detail

**Given** an unassigned ticket is open on its ticket-detail page  
**When** a user selects Avery Stone or Jordan Lee and saves the change  
**Then** the selected roster member is displayed on both the ticket detail and queue  
**And** only ownership and a nondecreasing `updatedAt` may change  
**And** the owner remains displayed after restarting the application with the same database volume.

**Given** a ticket is assigned to one roster member  
**When** a user selects the other roster member and saves the change  
**Then** the new owner replaces the previous owner on the ticket detail and queue  
**And** only ownership and a nondecreasing `updatedAt` may change  
**And** the reassignment remains after restart.

**Given** a ticket is assigned to Avery Stone or Jordan Lee  
**When** a user selects Unassigned or submits empty ownership form input  
**Then** ownership is stored as database null and displayed as Unassigned on the ticket detail and queue  
**And** only ownership and a nondecreasing `updatedAt` may change  
**And** the unassigned state remains after restart.

**Given** a ticket has a current normalized ownership state  
**When** a user saves that same owner, or submits empty ownership input while the ticket is already unassigned  
**Then** the request succeeds as a no-op  
**And** no database write occurs  
**And** `updatedAt` and every ticket field remain unchanged.

### AC-3: Combine owner filtering with existing queue criteria

**Given** Q-3 selects an owner filter and fixture tickets have different ownership states, statuses, priorities, and searchable text  
**When** a user selects Avery Stone, Jordan Lee, or Unassigned and applies any combination of search, status, and priority criteria  
**Then** the queue contains all and only fixture tickets matching the selected ownership state and every other active criterion  
**And** clearing the owner filter preserves the other active criteria  
**And** existing search normalization and reference matching remain unchanged.

**Given** Q-3 selects display-only ownership  
**When** a user views the queue  
**Then** each ticket displays Avery Stone, Jordan Lee, or Unassigned without an owner-filter control  
**And** existing search, status, and priority filtering remains unchanged.

### AC-4: Provide accessible controls and reject invalid ownership requests

**Given** the ownership control is displayed on ticket detail  
**When** a keyboard user navigates to and operates it  
**Then** the control has a programmatically associated label, exposes the current ownership value, and supports assignment, reassignment, and clearing without pointer input.

**Given** an ownership request supplies a forged nonempty owner value other than `avery-stone` or `jordan-lee`  
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
**And** ownership is stored as null and displayed as Unassigned  
**And** the creation form does not request or accept an owner.

**Given** an existing ticket is assigned to Avery Stone, assigned to Jordan Lee, or unassigned  
**When** a user performs a previously supported status update  
**Then** the status update behaves as before  
**And** ownership, the ticket identifier, and all fields unrelated to the status workflow remain unchanged  
**And** timestamps change only as already required by the existing status workflow.

## Revision summary

This revision incorporates the recorded Q-2 outcome while retaining the previously incorporated Q-1 outcome. Ownership remains optional: migration leaves existing tickets unassigned, new tickets start unassigned, and assignment, reassignment, and clearing occur only on ticket detail.

The owner policy is no longer conditional on Q-2. The permitted roster is exactly Avery Stone (`avery-stone`) and Jordan Lee (`jordan-lee`), plus Unassigned. Empty ownership form input normalizes to database null. AC-2 now distinguishes real changes from already-current no-ops: no-ops succeed without a write and preserve `updatedAt`, while real changes may update only ownership and a nondecreasing `updatedAt`. AC-4 now explicitly requires forged nonempty owner values and nonexistent ticket identifiers to fail without mutating any row.

Q-3 remains unanswered, so AC-3 continues to describe both proposed alternatives without selecting one. Q-4 is retained exactly as registered. Its mandatory-ownership premise conflicts with the recorded optional-ownership policy and is therefore inapplicable to the current proposed behavior, but it has not been formally decided or deferred and cannot be silently removed.

## Open questions

- **Q-3:** Is displaying ownership sufficient, or should the queue also filter by owner in combination with existing search, status, and priority filters? The display-only option is the smaller change; the filter option improves queue discovery but adds UI and query behavior.
- **Q-4:** If every ticket must have an owner, how should existing ownerless tickets be handled during migration? The recorded optional-ownership policy makes this conditional branch inapplicable to the current proposed behavior, but the registered question remains unanswered and requires an explicit decision or deferment.

There are no recorded deferments. Q-3 and Q-4 remain blocking until dispositioned, and the resulting specification must then be inspected and explicitly approved by the Human.

