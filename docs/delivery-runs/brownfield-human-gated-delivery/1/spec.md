# Specification

## Intent

Enable support agents and team leads to see and manage ticket ownership in the existing SQLite-backed IT service desk. Ownership must be visible on the queue and ticket detail, persist across application restarts using the same database volume, and preserve existing ticket workflows and data.

The ownership policy remains undecided: whether tickets may be unassigned, whether owners come from a fixed roster or free text, and whether the queue supports owner filtering. No policy option is an agreed requirement until the Human records a decision and subsequently approves the revised specification.

## Discovery

```json
{
  "problem": "Support agents and team leads using the IT service desk cannot see who is responsible for a ticket or identify unassigned work, making ownership during handoff unclear.",
  "evidence": "The existing SQLite-backed demonstration application can create, search, and update tickets but has no owner field. This source baseline demonstrates the missing capability. Customer interviews, measured business baselines, verified productivity claims, and evidence from completed live scenarios are missing.",
  "successMeasure": "Observable success means ownership is displayed and can be handed off according to the recorded policy, valid changes persist after restarting with the same database volume, filtering returns all and only matching fixture tickets when enabled, invalid input leaves stored data unchanged, and existing ticket data and workflows remain compatible. No business-metric baseline or target is available.",
  "alternatives": "Do nothing and retain the current handoff process, which avoids migration risk but leaves responsibility invisible. Add ownership display without filtering, which is smaller and makes responsibility visible but does not directly support finding work by owner. Add display, handoff, and an intersecting owner filter, which improves queue discovery but increases UI and query complexity.",
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
  "decisionMapping": []
}
```

## Scope

- Add persisted ownership data to tickets without changing existing ticket identifiers, values, or timestamps.
- Display the current owner, or the policy-defined unassigned state, in the ticket queue and ticket detail.
- Allow ownership assignment and reassignment through labeled, keyboard-usable controls.
- Allow clearing ownership only if the recorded Q-1 decision permits unassigned tickets.
- Restrict owner selection to Avery Stone (`avery-stone`) and Jordan Lee (`jordan-lee`) if the fixed-roster option is selected; otherwise use the Human-selected free-text policy.
- If Q-3 selects filtering, add an owner filter that intersects with the existing search, status, and priority criteria rather than replacing them.
- Persist valid ownership changes in SQLite so they remain visible after restarting the application with the same database volume.
- Preserve existing create, status-update, search, summary, queue, and ticket-detail behavior except where a recorded ownership policy explicitly changes creation requirements.
- Return explicit validation errors for invalid ownership input without partially changing the ticket.

## Non-goals

- Authentication, authorization, or role-based ownership permissions.
- External identity providers, directory synchronization, or remote roster management.
- Notifications, subscriptions, escalation rules, or service-level agreements.
- Bulk assignment or bulk reassignment.
- Free-text audit history or a general ticket event log.
- New dashboards or unrelated reporting.
- Claims about customer demand, productivity, return on investment, or completed live-scenario validation.
- Copying implementation from a previously completed demonstration repository.

## Actors

- **Support agent:** Views queue and ticket ownership, opens ticket details, and assigns or reassigns tickets.
- **Team lead:** Uses the same ownership visibility and handoff behavior to understand responsibility and, if enabled, filter the queue by owner.
- **Existing ticket data:** Must remain readable and retain all pre-existing identifiers, field values, and timestamps after migration.
- **Application and SQLite database:** Validate and persist ownership changes and return consistent data after restart.

Because authentication and authorization are out of scope, the specification does not assign different technical permissions to support agents and team leads.

## Constraints

- This is a focused brownfield extension of the existing IT service desk.
- Existing ticket identifiers, field values, and timestamps must not be rewritten during migration.
- Ownership migration behavior must follow the recorded Q-1 and Q-4 decisions; the specification must not silently assign responsibility.
- Existing create, status-update, search, summary, queue, and detail behavior must remain compatible.
- Ownership controls must have programmatically associated labels and be operable by keyboard.
- Invalid ownership input must produce an explicit error and must not partially persist a change.
- A successful ownership change must survive application restart when the same database volume is reused.
- If an owner filter is selected, it must combine conjunctively with active search, status, and priority filters, returning all and only tickets satisfying every active criterion.
- Fixed-roster identities, if selected, are exactly Avery Stone (`avery-stone`) and Jordan Lee (`jordan-lee`).
- Candidate fixtures, checklists, scripted rehearsal statements, and successful validation are not Human approval.

## Acceptance scenarios

### AC-1: Migrate existing tickets without data loss

**Given** an existing SQLite database containing tickets created before ownership support  
**When** the application upgrades the database and loads those tickets  
**Then** every existing ticket retains its identifier, existing field values, and timestamps exactly  
**And** its initial ownership state follows the recorded Q-1 and Q-4 decisions without silently fabricating attribution  
**And** existing queue, detail, search, status, priority, and summary behavior continues to work.

### AC-2: Assign, reassign, and conditionally clear ownership

**Given** a ticket is visible in the service desk  
**When** a user assigns a valid owner through the ownership control  
**Then** the selected owner is shown on both the queue and ticket detail  
**And** the owner remains after restarting the application with the same database volume.

**Given** an owned ticket  
**When** a user replaces its owner with another valid owner  
**Then** the new owner replaces the previous owner on the queue and ticket detail  
**And** the reassignment remains after restart.

**Given** an owned ticket  
**When** a user clears its owner  
**Then** the ticket becomes visibly unassigned if Q-1 permits unassigned tickets  
**And** otherwise the application rejects the request with an explicit error and preserves the current owner.

### AC-3: Filter ownership with existing queue criteria

**Given** Q-3 records that an owner filter is required and the fixture database contains tickets with different owners, statuses, priorities, and searchable text  
**When** a user selects an owner and applies any combination of search, status, and priority criteria  
**Then** the queue contains all and only fixture tickets matching the selected owner and every other active criterion  
**And** clearing the owner filter leaves the other active criteria unchanged  
**And** an unassigned filter choice is available only if Q-1 permits unassigned tickets.

**Given** Q-3 records that display-only ownership is sufficient  
**When** a user views the queue  
**Then** ownership remains visible without introducing an owner-filter control  
**And** existing search, status, and priority filtering remains unchanged.

### AC-4: Provide accessible controls and reject invalid ownership input

**Given** the ownership control is displayed  
**When** a keyboard user navigates to and operates it  
**Then** the control has a programmatically associated label, exposes its current value, and can complete the supported ownership actions without pointer input.

**Given** the fixed-roster policy is selected and a request supplies an owner identifier other than `avery-stone` or `jordan-lee`  
**When** the application processes the request  
**Then** it returns an explicit invalid-owner error  
**And** the stored owner and all other ticket values remain unchanged.

**Given** mandatory ownership is selected  
**When** a create or update request omits or clears the required owner  
**Then** it returns an explicit ownership-required error  
**And** no partial ticket creation or update is persisted.

### AC-5: Preserve ticket creation and status behavior

**Given** a user supplies all fields required by the recorded ownership policy  
**When** the user creates a ticket  
**Then** the ticket is created through the existing workflow with its existing identifier, default values, and timestamp behavior  
**And** its owner is stored and displayed, or it is visibly unassigned if Q-1 permits omission.

**Given** an existing ticket with any valid ownership state  
**When** a user performs a previously supported status update  
**Then** the status update behaves as before  
**And** the ticket owner, identifier, other field values, and unrelated timestamps are not changed except where the existing status workflow already changes them.

## Revision summary

This is the initial specification proposal. It translates the supplied intent into five stable acceptance areas: migration compatibility, assignment and reassignment, conditional clearing, optional intersecting owner filtering, accessible validation, and preservation of creation and status behavior.

No latest Human decisions were supplied, so no ownership-policy option has been incorporated as an agreed outcome and the decision mapping is empty. Q-1 through Q-3 preserve the policy choices stated in the Intent. Q-4 exposes the additional migration decision required if mandatory ownership is chosen, because assigning responsibility to existing tickets cannot be inferred from fixtures or prior prose.

## Open questions

- **Q-1:** May tickets remain unassigned, including existing and new tickets, or must every ticket have an owner?
- **Q-2:** Must owners come from the fixed Avery Stone/Jordan Lee roster, or may users enter free text?
- **Q-3:** Is ownership display sufficient, or must the queue also provide an owner filter that intersects with search, status, and priority?
- **Q-4:** If ownership is mandatory, should existing ownerless tickets receive a selected default owner, require an explicit migration mapping, or remain unassigned as legacy exceptions?

There are no recorded deferments. All four questions remain blocking until the Human records a decision or deferment and inspects the resulting revised specification.

