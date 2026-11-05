# Household chores application plan

## 1. Purpose

Build a shared household application that defines recurring chores, assigns them to household members, and distributes the work across a calendar. The plan adapts when work is completed, missed, or changed, while respecting each person's availability and workload limits.

The household initially includes two people with accounts and a maid without an account. Both account holders can manage the household and record completion for anyone.

## 2. Confirmed requirements

- Each chore has a responsible person, frequency, priority, and estimated duration.
- Frequency means approximately the specified interval; an every-seven-days chore can move to fit availability and capacity.
- Each chore can use completion-based recurrence or a fixed schedule.
- Most chores will use completion-based recurrence.
- Each member has configurable daily and weekly workload limits.
- The maid's chores can only be scheduled on her working days.
- Availability supports combined weekly, biweekly (every two weeks), and monthly rules, such as every Tuesday plus every other Friday.
- A shared calendar shows everyone's chores and supports filtering by one person, including the maid.
- A checkbox records completion.
- Missed chores trigger rearrangement of the remaining plan according to priority. A missed high-priority chore can displace lower-priority chores from the next day.
- Displaced chores remain outstanding and are scheduled again; they are not deleted.
- Completing a completion-based chore anchors its next occurrence to the actual completion date.
- Authentication allows both partners to access the same household.
- Users can upload a file, review multiple chore definitions, and create the selected chores together.
- Users can generate and edit a WhatsApp-ready message for one selected date and member, including a member without account access, then copy it or open a WhatsApp sharing flow to send it themselves.

The defaults below are implementation proposals where a precise behavior has not yet been specified. [DEV-01 domain behavior](DOMAIN_BEHAVIOR.md) resolves lifecycle, skip/undo, edit, timezone, archive, and capacity edge cases with implementation decisions and examples; follow that specification for these details.

## 3. Household members and access

Separate a household member from a login account:

- A member can receive chores whether or not they have an account.
- An account can belong to the household and be linked to a member.
- The maid is a member with availability and capacity, without a login.
- Both partners can create, edit, assign, complete, undo, and skip chores for any member.
- Record who performed the chore separately from who checked it off in the application.
- Invite the second account to the existing household rather than creating a separate household.
- Enforce household access on the server for every read and change.

## 4. Chore configuration

| Field | Purpose |
| --- | --- |
| Name and instructions | Describe the work and any relevant details |
| Responsible member | Person expected to perform the work |
| Priority | High, normal, or low |
| Estimated minutes | Capacity consumed by one occurrence |
| Recurrence type | Completion-based or fixed schedule |
| Recurrence rule | For example, every 7 days or every Tuesday |
| Initial target date | Starting point before the first completion |
| Allowed days, if needed | Additional restrictions within the member's availability |
| Active or paused | Whether to create and schedule future work |

Use minutes for both chore estimates and workload limits. A chore is indivisible in the first version: it must fit within one day's available capacity. Splitting work into subtasks can be added later.

## 5. Availability and workload

Each member has:

- One or more recurring availability rules, with date-specific exceptions for absences or extra working days.
- A daily limit for each weekday, such as 60 minutes on Monday and 30 minutes on Tuesday.
- A weekly limit, such as 240 minutes across Monday through Sunday.

Daily and weekly limits apply together. A free hour on Friday cannot be used if that member has already reached the weekly limit. A day with no availability or a zero-minute limit cannot receive chores.

### Recurring availability

Availability is a calendar of actual working dates generated from rules. Support these patterns in the first release:

| Pattern | Example | Required configuration |
| --- | --- | --- |
| Weekly | Every Tuesday | Weekday and effective start date |
| Biweekly | Every other Friday | Weekday and an anchor date on a working Friday |
| Monthly by date | The 15th of each month | Day of month and effective start date |
| Monthly by weekday | The first Friday of each month | Weekday, position in month, and effective start date |

Multiple rules combine to make a member available on any matching date. Overlapping rules create only one working day and do not multiply its capacity. Each rule can have an optional end date.

For the household's maid, configure two independent rules:

1. Every Tuesday.
2. Every two weeks on Friday, starting on a selected working Friday.

| Week in the repeating cycle | Working days |
| --- | --- |
| Week A, containing the anchor Friday | Tuesday and Friday |
| Week B | Tuesday only |
| Week A again | Tuesday and Friday |

Biweekly recurrence follows the anchor date continuously across month and year boundaries. It does not restart at the beginning of a month or use odd/even calendar week numbers. A missed or cancelled visit does not shift the cycle.

Proposed monthly defaults: support first, second, third, fourth, fifth, or last occurrences of a weekday. If the selected day of month or fifth weekday does not exist, skip that month's visit rather than move it silently. Monthly availability follows the calendar month, not a four-week interval.

Date exceptions override recurring rules: mark a date unavailable to cancel a visit, or add an extra working date. An exception can also override that day's workload limit. Preserve past availability and apply rule edits from an explicit effective date onward.

The scheduler must evaluate these actual dates before allocating capacity. For example, a chore due on an off-cycle Friday must wait for the next eligible working date, usually Tuesday, subject to priority and capacity. Display a preview of upcoming visits when editing availability so the selected Friday cycle is clear.

### Capacity on recurring working dates

Daily limits apply only to dates that are available under these rules and exceptions. The weekly limit remains a ceiling for each calendar week; it does not create availability or carry unused capacity into another week. The Tuesday-only week will therefore have less usable capacity than the Tuesday-and-Friday week, even if both share the same weekly limit.

Count completed work and scheduled remaining work against the relevant limits. Actual duration may be recorded later; initially use estimated duration for both. If completion is recorded on a different date, charge it to the actual completion date and recalculate the remaining plan.

Use the household's timezone for day boundaries and a Monday-to-Sunday week by default. Make these household settings explicit.

Limits are hard constraints for automatic scheduling. If work cannot fit, show it as needing attention with the reason. A user may explicitly approve an over-capacity assignment; never silently increase a limit or reassign work to another person.

## 6. Recurrence behavior

### Completion-based chores

Calculate the next target from actual completion:

`next target date = actual completion date + recurrence interval`

For example, a chore due Monday with a seven-day interval is completed Wednesday. Its next target becomes the following Wednesday, and all later previews shift accordingly.

Keep only one outstanding actionable occurrence per completion-based chore. Missing it repeatedly must not create duplicate overdue copies.

An explicit skip waives one cycle without recording work. Its successor target is `max(original target date, local skip date) + current interval`; the last actual completion remains unchanged. Undo is allowed only when dependent work has not been resolved and the recurrence series has not been superseded; see the domain specification for exact guards.

Show provisional future occurrences in the calendar, derived from the current plan. They are forecasts, not separate overdue obligations. Recalculate them when the outstanding occurrence moves or is completed. Before completion, use its scheduled date as the provisional anchor; after completion, use the actual date.

### Fixed-schedule chores

Store a calendar rule, such as every Tuesday or every Monday and Thursday. Each scheduled date has its own occurrence.

- Completion does not change later fixed dates.
- Automatic rearrangement preserves the fixed date; it cannot move that occurrence to another day.
- If a fixed chore is missed, retain it as overdue for visibility. The user can record late completion or explicitly skip it.
- Later fixed occurrences retain their dates. Do not automatically complete or delete an earlier occurrence when a later one is completed.
- If the fixed date conflicts with the member's availability or capacity, display a conflict for the user to resolve.

This first version treats fixed dates as strict. A future optional setting could allow late catch-up scheduling while preserving subsequent fixed dates.

### Approximate intervals

Keep a target date distinct from the scheduled date. The target expresses the intended frequency; the scheduled date reflects availability, capacity, and priority.

Proposed default: schedule on the target date or the earliest feasible date afterward. Do not schedule early automatically in the first version. If the maid's target is Wednesday and her next working day is Thursday, Thursday is eligible.

The interface should show how late a chore is relative to its target and explain meaningful shifts.

## 7. Priority-based rearrangement

Replan all unfinished, movable work in the planning horizon when a chore is missed. This allows high-priority overdue work to claim capacity already occupied by lower-priority work.

### Scheduling order and constraints

1. Preserve completed work and historical completion dates.
2. Reserve capacity for fixed-date occurrences and any explicit user-pinned assignments.
3. Expand each member's weekly, biweekly, and monthly availability rules into actual dates, apply exceptions, and calculate remaining daily and weekly capacity.
4. Gather all outstanding completion-based chores, including those already scheduled.
5. Consider eligible work by priority, then oldest target date, then a stable tie-breaker.
6. Assign each occurrence to its earliest feasible date, respecting its target, member availability, daily capacity, and weekly capacity.
7. Recompute provisional future occurrences and place them using the same constraints without creating duplicate obligations.
8. Leave infeasible work visible with an explanation instead of forcing it into the calendar.

Never reserve future work before its target if doing so would prevent an earlier eligible chore from using capacity. Priority governs competition for eligible dates, not a claim on dates before a chore is due.

Replanning includes lower-priority chores that already have dates. Move them to later feasible slots when necessary. Prefer existing placements when the outcome is otherwise equivalent, so the calendar does not change unnecessarily.

Assignments stay with their responsible person. Replanning the household does not authorize transferring chores between members. Capacity belonging to one person cannot satisfy another person's chores.

Priority does not override fixed dates, unavailable days, or workload limits. Within equal priority, older target dates take precedence. Flag repeatedly postponed low-priority work for review rather than silently changing its priority.

### Example: missed high-priority work displaces low-priority work

Assume a member has a 60-minute daily limit, sufficient weekly capacity, and availability Tuesday and Wednesday.

| Chore | Priority | Minutes | Original plan | Revised plan |
| --- | --- | --- | --- | --- |
| Clean bathroom | High | 45 | Monday, missed | Tuesday |
| Water plants | Normal | 15 | Tuesday | Tuesday |
| Organize shelves | Low | 45 | Tuesday | Wednesday |

Tuesday stays within its 60-minute limit. Organizing shelves remains outstanding. If the bathroom chore repeats every seven days and is completed Tuesday, its next target becomes the following Tuesday.

If the weekly limit is already exhausted, displaced work may need to move into the following week. If Tuesday contains fixed work that leaves less than 45 minutes, the bathroom chore must wait for a feasible day or explicit user intervention.

### Replanning triggers

- A household day ends with unfinished chores.
- A chore is completed, completion is undone, or an occurrence is skipped.
- Priority, duration, assignee, recurrence, or initial target is changed.
- Availability or workload limits change.
- A user requests a refreshed plan.

Detect missed chores at the end of the household's local day and also reconcile when the app next opens, so scheduling does not depend on either partner having the app open overnight.

Use a rolling eight-week planning horizon as an initial default. Work that cannot fit within it remains in an unscheduled list with its target date and reason. Extend the forecast as time advances.

## 8. Main screens

The [DEV-02 UI/UX design specification](UX_DESIGN.md) defines screen layouts, mobile behavior, user flows, reusable components, feedback states, and review walkthroughs for these screens. Domain rules remain defined by DEV-01.

### Today

- Chores grouped by person, with priority, estimated time, and checkboxes.
- Filters for everyone, me, or a selected member.
- Clear separation between today's scheduled work, overdue fixed work, and unscheduled work requiring attention.
- Daily and weekly workload totals for each member.
- Immediate undo after completion.

### Calendar

- Week and month views with the same person filters.
- Member colors, priority indicators, and completed states.
- Clear visual distinction for provisional future occurrences.
- A visible explanation when a chore moves, such as “Moved to Wednesday to make room for overdue bathroom cleaning.”
- Chore details accessible from each entry.

### Chore management

Create, edit, pause, and archive chore definitions. Explain whether an edit affects the outstanding occurrence and future forecasts. Preserve completed history.

Add **Import chores** alongside Add chore. Initial supported formats are CSV and XLSX, with a downloadable template, column mapping, row validation, member matching, duplicate warnings, and an editable preview. Users explicitly select and confirm valid rows before any chores are created. Imports create definitions, not completion records or manual calendar placements, and use the normal recurrence/scheduling rules. Initial format and size limits are selected defaults detailed in the domain specification; PDF, images, and unstructured documents are outside the first release.

### Daily message sharing

Add **Create daily message** to Today, the selected calendar day, and member details. Require one date and one member; default to today's date and the current person filter when it identifies one person. A member without a login is a valid recipient.

Generate a readable message from remaining real chores scheduled for that member/date, ordered by priority. Include a heading with the person's name and full date, a numbered chore list, priorities, estimated minutes, optional instructions, and total estimated time. Exclude forecasts, completed/skipped/cancelled chores, held work, and unplaced conflicts; display excluded outstanding work separately in the website so it is not overlooked.

Show an editable preview with **Copy message** and, where available, **Open WhatsApp**. The user selects the WhatsApp recipient and sends the message. No phone number, account for the recipient, background delivery, WhatsApp API integration, or morning automation is required. Never claim that a message was delivered. Copying/sharing does not complete chores or alter the schedule. Recheck the plan before handoff and require regeneration if relevant chores changed.

### Household settings

Invite the second partner, manage members, configure combined weekly, biweekly, and monthly availability rules, select anchor dates, preview upcoming working dates, manage exceptions, set daily and weekly limits, and set timezone and week boundaries.

### History and schedule changes

Show completion dates, the responsible member, the account that recorded the action, skipped occurrences, and reasons for schedule changes.

## 9. Role of the AI agent

Use an explicit scheduling engine to enforce recurrence, availability, capacity, and priority rules. An AI assistant can call that engine through validated application actions.

Useful AI capabilities include:

- Convert natural-language requests into draft chore definitions.
- Suggest estimated durations, frequencies, and priorities for user review.
- Explain why chores moved or could not fit.
- Suggest changes when workload consistently exceeds capacity.

Routine rescheduling can happen automatically under saved rules. Changes to responsible members, limits, frequencies, or availability require user acceptance. The core application should remain usable if the AI service is unavailable.

## 10. Suggested data model

| Record | Key information |
| --- | --- |
| Household | Name, timezone, week start, planning settings |
| Account membership | Account, household, access role |
| Member | Household, display name, optional linked account |
| Availability rule | Member, weekly or monthly frequency, interval, weekday or monthly selector, anchor/start date, optional end date |
| Availability exception | Member, local date, available/unavailable override, optional daily capacity override |
| Workload limits | Member, per-weekday minutes, weekly minutes |
| Chore definition | Name, instructions, assignee, priority, estimated minutes, recurrence rule, active state |
| Chore occurrence | Chore, target date, scheduled date, status, recurrence identity, optional pin |
| Completion record | Occurrence, performed date, responsible member, recording account, timestamp |
| Schedule change | Occurrence, previous date, new date, reason, plan version |
| Import batch and row drafts | Household, recording user, mapping, validated row data, duplicate acknowledgments, commit identity/result |

Daily messages are session-local drafts tied to member, local date, source occurrence versions, and plan version. Do not store recipient phone numbers or claim a delivery receipt. Import retention and draft lifecycle are specified in DEV-01's feature extension.

Keep provisional calendar forecasts distinguishable from actionable occurrences. Use stable occurrence identities so recalculation never duplicates a chore. Retain history when a chore or member is archived.

## 11. Implementation approach

The [DEV-03 architecture and development workflow](ARCHITECTURE.md) selects Next.js/TypeScript, Supabase PostgreSQL/Auth, a PostgreSQL-backed Node worker, and Render hosting, and defines module boundaries, setup, migrations, and verification. This is the implementation specification; application scaffolding and running services are not yet present.

1. Build household authentication, invitations, and server-side access checks.
2. Add members, recurring availability rules with anchors and exceptions, workload limits, and chore definitions.
3. Implement recurrence calculation as a separate module with explicit date and timezone handling.
4. Implement the capacity- and priority-aware scheduling engine.
5. Add Today, calendar filters, completion, undo, and history.
6. Add scheduled day-end reconciliation and event-triggered replanning.
7. Add reviewed bulk chore import and date/member-specific WhatsApp message preparation.
8. Add the AI assistant using the same validated operations as the interface.

Store changes and schedule updates transactionally. Protect against both partners completing the same occurrence at once: one occurrence should produce one completion and one next recurrence. Use a plan version or equivalent concurrency check so a stale replan cannot overwrite newer work.

Keep the first release focused on one responsible person per chore, whole chores within a single day, and minute-based capacity. Initial chore recurrence options are every N days and fixed selected weekdays. Member availability must support weekly, biweekly, and monthly rules from the first release. Add monthly chore recurrence, reminders, automatic reassignment, and subtasks later if needed.

## 12. Acceptance scenarios

- Both partners see the same household and can filter by themselves, each other, or the maid.
- Neither account can access another household's records.
- The maid receives work only on configured working dates, including exceptions.
- Combining every Tuesday with every other Friday produces alternating Tuesday-and-Friday and Tuesday-only weeks.
- Biweekly working dates stay anchored across month and year boundaries; cancelling one visit does not change later visits.
- Monthly date and weekday rules generate the expected visits, including the documented behavior for missing dates or fifth weekdays.
- Overlapping availability rules do not duplicate a working day or its capacity.
- An unavailable-date exception blocks chores even when a recurring rule matches; an extra working date allows chores within its capacity.
- A chore due on an off-cycle Friday moves to the next feasible working date, respecting priority and workload limits.
- Tuesday-only weeks have no Friday capacity, and unused weekly capacity does not carry forward.
- Automatic scheduling respects daily and weekly limits together.
- A missed high-priority chore displaces eligible lower-priority chores without deleting them.
- A displaced chore moves into the next week when this week's capacity is exhausted.
- A completion-based chore completed late gets a new target based on actual completion.
- Repeatedly missing a completion-based chore does not create duplicate outstanding instances.
- A fixed Tuesday chore keeps future Tuesdays even if completed Wednesday.
- A fixed-date conflict is visible and is not silently shifted.
- Allowed undo reverses completion, cancels the untouched derived next obligation, and recalculates forecasts without losing history. Undo that would rewrite resolved dependent work is rejected without partial changes.
- Two simultaneous completion attempts produce only one completion and one recurrence transition.
- A chore longer than any available daily capacity appears as infeasible with a clear reason.
- Reopening the app after several days catches up missed-work reconciliation correctly.
- Replanning the same inputs gives the same result and does not duplicate occurrences.
- A valid CSV/XLSX import creates only reviewed, selected chore definitions and replans once; invalid rows, ambiguous members, and duplicate warnings are resolved before commitment.
- Repeating an import commit does not create duplicates; importing a similar file later requires duplicate review and never silently updates existing chores.
- A daily message contains only the selected member's remaining scheduled chores on the selected local date, including moved overdue work scheduled there.
- A member without an account can be selected for a message; unavailable dates, forecasts, and unscheduled work do not become invented assignments.
- Editing, copying, or opening a daily message never changes chores, marks work complete, or records delivery; relevant schedule changes require a fresh preview.

## 13. Delivery stages

**Stage 1 — Functional shared planner:** authentication, shared household, members, chore setup, reviewed CSV/XLSX bulk import, both recurrence types, combined weekly/biweekly/monthly availability with anchors and exceptions, daily and weekly limits, priority-based rearrangement, calendar filters, completion, undo, clear scheduling conflicts, and editable daily messages for manual WhatsApp sharing.

**Stage 2 — AI assistance:** natural-language chore entry, explanations, and proposed improvements to overloaded schedules.

**Stage 3 — Convenience features:** reminders, richer recurrence patterns, optional manual calendar moves, subtasks, and reporting on recurring overload or postponed work.
