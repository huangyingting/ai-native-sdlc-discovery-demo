# Specification

## Intent

Enable support agents and team leads to see and manage ticket ownership in the existing SQLite-backed IT service desk. Ownership must be visible in the ticket queue and ticket detail, support post-triage handoff from the ticket detail, and persist when the application restarts with the same database volume.

Ownership is optional. Existing tickets and newly created tickets start unassigned. Users can assign, reassign, and clear ownership from ticket detail, while the existing creation form remains unchanged and does not request an owner.

The current application stores no owner field. It creates tickets with an `open` status, supports status updates, searches by title, requester, reference, or numeric identifier, combines search with status and priority filters, and derives summary counts from ticket status and priority. These behaviors must remain compatible.

## Discovery

```json
{
  "problem": "Support agents and team leads using the IT service desk cannot see who is responsible for a ticket or identify unassigned work, making ownership during handoff unclear.",
  "evidence": "The existing SQLite-backed demonstration application has no owner field in its ticket model, database schema, creation workflow, queue, or ticket detail. This source baseline demonstrates the missing capability. Customer interviews, measured business baselines, verified productivity claims, and evidence from completed live scenarios are missing.",
  "successMeasure": "Observable success means existing and newly created tickets begin unassigned, ownership can be assigned, reassigned, and cleared from ticket detail, ownership is visible on the queue and detail, valid changes persist after restarting with the same database volume, invalid input leaves stored data unchanged, and existing ticket data and workflows remain compatible. If owner filtering is selected, exact fixture result sets must satisfy every active criterion. No business-metric baseline or target is available.",
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
      "explanation": "AC-1 now requires migration to leave every existing ticket unassigned without changing its existing data; AC-2 requires assignment, reassignment, and clearing from ticket detail; AC-5 requires newly created tickets to start unassigned without adding ownership to the creation form."
    }
  ]
}
```

## Scope

- Add optional, persisted ownership data to tickets without changing existing ticket identifiers, field values, or timestamps during migration.
- Migrate every existing ticket to an unassigned ownership state without fabricating attribution.
- Keep newly created tickets unassigned and leave the creation form free of ownership controls.
- Display either the current owner or a clear unassigned state in the ticket queue and ticket detail.
- Allow assignment, reassignment, and clearing from the ticket-detail page through labeled, keyboard-usable controls.
- Apply the owner source selected through Q-2: either the fixed local roster or free-text ownership.
- If Q-3 selects filtering, add an owner filter, including an unassigned choice, that intersects with existing search, status, and priority criteria.
- Persist valid ownership changes in SQLite so they remain visible after restarting the application with the same database volume.
- Return explicit validation errors for invalid ownership input without partially changing the ticket.
- Preserve existing creation, status-update, search, filtering, summary, queue, and ticket-detail behavior except for the specified addition of ownership information.

## Non-goals

- Requiring an owner during ticket creation or adding ownership controls to the creation form.
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
- **Team lead:** Uses the same ownership visibility and handoff behavior to understand responsibility and, if selected through Q-3, filter the queue by owner or unassigned state.
- **Ticket requester:** Continues to submit tickets through the existing creation workflow without selecting an owner.
- **Existing ticket data:** Must remain readable, retain all pre-existing identifiers, values, and timestamps, and begin with no owner after migration.
- **Application and SQLite database:** Validate and persist ownership changes and return consistent ticket data after restart.

Authentication and authorization are out of scope, so support agents and team leads have no different technical permissions in this specification.

## Constraints

- This is a focused brownfield extension of the existing IT service desk.
- Ownership is nullable: existing and newly created tickets start unassigned, and an assigned ticket may be returned to the unassigned state.
- Ownership changes occur on ticket detail, not on the creation form.
- Existing ticket identifiers, titles, descriptions, categories, priorities, statuses, requester information, and timestamps must not be rewritten during migration.
- Existing ticket creation must continue to produce an `open` ticket using the current identifier, default-value, and timestamp behavior.
- Existing status updates, summary calculations, queue ordering, reference formatting, and search by title, requester, reference, or numeric identifier must remain compatible.
- Ownership controls must have programmatically associated labels, expose their current value, and be operable by keyboard.
- Server-side validation must reject ownership values that are invalid under the selected Q-2 policy.
- Invalid ownership input must produce an explicit error and must not partially persist an ownership or unrelated ticket change.
- A successful ownership change must survive application restart when the same database volume is reused.
- If an owner filter is selected, it must combine conjunctively with active search, status, and priority criteria and return all and only tickets satisfying every active criterion.
- If the fixed-roster option is selected, the roster identities are exactly Avery Stone (`avery-stone`) and Jordan Lee (`jordan-lee`).
- Candidate fixtures, checklists, scripted rehearsal statements, and successful validation do not constitute Human approval.

## Acceptance scenarios

### AC-1: Migrate existing tickets without data loss

**Given** an existing SQLite database containing tickets created before ownership support  
**When** the application upgrades the database and loads those tickets  
**Then** every existing ticket has an unassigned ownership state  
**And** every ticket retains its identifier, title, description, category, priority, status, requester information, creation timestamp, and update timestamp exactly  
**And** migration does not assign a person or alter existing summary, queue, detail, search, status, or priority behavior.

### AC-2: Assign, reassign, and clear ownership on ticket detail

**Given** an unassigned ticket is open on its ticket-detail page  
**When** a user selects or enters a valid owner under the Q-2 policy and saves the change  
**Then** the owner is displayed on both the ticket detail and queue  
**And** no field unrelated to the ownership update is changed  
**And** the owner remains displayed after restarting the application with the same database volume.

**Given** a ticket already has an owner  
**When** a user replaces that owner with another valid owner from the ticket-detail page  
**Then** the new owner replaces the previous owner on the ticket detail and queue  
**And** the reassignment remains after restart.

**Given** a ticket already has an owner  
**When** a user clears ownership from the ticket-detail page  
**Then** the ticket becomes visibly unassigned on the ticket detail and queue  
**And** the unassigned state remains after restart.

### AC-3: Combine owner filtering with existing queue criteria

**Given** Q-3 selects an owner filter and fixture tickets have different ownership states, statuses, priorities, and searchable text  
**When** a user selects an owner or the unassigned state and applies any combination of search, status, and priority criteria  
**Then** the queue contains all and only fixture tickets matching the selected ownership state and every other active criterion  
**And** clearing the owner filter preserves the other active criteria  
**And** existing search normalization and reference matching remain unchanged.

**Given** Q-3 selects display-only ownership  
**When** a user views the queue  
**Then** each ticket displays its owner or unassigned state without an owner-filter control  
**And** existing search, status, and priority filtering remains unchanged.

### AC-4: Provide accessible controls and reject invalid ownership input

**Given** the ownership control is displayed on ticket detail  
**When** a keyboard user navigates to and operates it  
**Then** the control has a programmatically associated label, exposes the current ownership value, and supports assignment, reassignment, and clearing without pointer input.

**Given** the fixed-roster policy is selected and a request supplies an owner identifier other than `avery-stone`, `jordan-lee`, or the supported unassigned value  
**When** the application processes the request  
**Then** it returns an explicit invalid-owner error  
**And** the stored owner and every unrelated ticket value remain unchanged.

**Given** an ownership request contains an invalid ticket identifier or an ownership value invalid under the selected Q-2 policy  
**When** the application processes the request  
**Then** it returns an explicit validation error  
**And** it does not partially persist any ownership or unrelated ticket change.

### AC-5: Preserve ticket creation and status behavior

**Given** a user supplies the fields required by the existing ticket-creation workflow  
**When** the user creates a ticket  
**Then** the ticket is created with its existing identifier, `open` status, default values, and timestamp behavior  
**And** the ticket starts visibly unassigned  
**And** the creation form does not request or accept an owner.

**Given** an existing ticket has either an owner or an unassigned state  
**When** a user performs a previously supported status update  
**Then** the status update behaves as before  
**And** the ticket owner, identifier, and other field values are unchanged  
**And** timestamps change only as already required by the existing status workflow.

## Revision summary

This revision incorporates the recorded Q-1 outcome. Ownership is now explicitly optional: migration leaves all existing tickets unassigned, new tickets start unassigned, and assignment, reassignment, and clearing occur only on ticket detail. AC-1, AC-2, and AC-5 were revised accordingly, removing the previous conditional branches for mandatory ownership and creation-time assignment.

The specification is also grounded in the current application behavior: SQLite currently stores no owner field; creation produces open tickets; status changes update tickets; queue filters are conjunctive; search covers title, requester, reference, and numeric identifier; and summaries depend on status and priority. These behaviors remain compatibility requirements.

Q-2 and Q-3 remain undecided. Q-4 is retained exactly as registered; its mandatory-ownership premise does not apply to the recorded Q-1 outcome, but it still requires an explicit Human decision or deferment and has not been silently removed. This revised specification still requires Human inspection and explicit approval after the remaining questions are dispositioned.

## Open questions

- **Q-2:** Should owners come from the fixed local roster Avery Stone (`avery-stone`) and Jordan Lee (`jordan-lee`), or be entered as free text?
- **Q-3:** Is displaying ownership sufficient, or should the queue also filter by owner in combination with existing search, status, and priority filters?
- **Q-4:** If every ticket must have an owner, how should existing ownerless tickets be handled during migration? The recorded optional-ownership outcome makes this branch inapplicable to the current proposed behavior, but the registered question remains unanswered and must be explicitly decided or deferred.

There are no recorded deferments. Q-2, Q-3, and Q-4 remain blocking until the Human records a decision or deferment and inspects the resulting revised specification.

