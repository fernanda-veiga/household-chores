# DEV-04 — Persistent domain records and constraints

**Status:** Complete as documentation only, as requested. Database implementation remains outstanding.  
**Priority:** P0 · **Owner:** Backend · **Dependencies:** DEV-01, DEV-03  
**Date:** 2026-11-05  
**References:** [Product plan](PLAN.md), [Domain behavior](DOMAIN_BEHAVIOR.md), [Architecture](ARCHITECTURE.md), [UX design](UX_DESIGN.md), [Backlog](TASKS.md).

## 1. Purpose and scope

Specify the records, relationships, constraints, history, and verification requirements for the application's database. This is a design for later PostgreSQL implementation, following DEV-01's behavior and DEV-03's architecture.

This deliverable consists of this Markdown file only. It introduces no SQL migrations, application code, packages, database instances, or executable tests. Existing files, including the backlog, are unchanged. References below to constraints, permissions, and transactions describe requirements to implement, not controls already installed or verified.

The model supports multiple households while the initial user experience operates within one household. A user has account access; a member is a person who receives assignments, whether or not that person has an account.

## 2. Shared data conventions

| Convention | Specification |
| --- | --- |
| IDs | Stable UUIDs for independently addressable records; never use a person's name as an identifier |
| Household ownership | Every household-owned record carries a household ID; child references must identify a parent in the same household |
| Local dates | Target, scheduled, performed, anchor, and effective dates are calendar dates, independent of event timestamps |
| Event timestamps | Store recorded/created instants separately from local dates; preserve the timezone relevant to historical facts |
| Timezone | Valid supported timezone identifier on each household, initially selectable as America/Recife |
| Week start | Explicit household setting; Monday by default; numbered weekdays consistently use Monday 1 through Sunday 7 |
| Minutes | Integer estimates and limits; estimates must be positive, workload limits may be zero |
| Revisions | Definition revisions, mutable-record revisions, household input revisions, and plan versions have separate meanings |
| Optional fields | Missing values represent a documented absence, not an empty string masquerading as an ID/date |
| Historical records | Retain resolved work, snapshots, and append-only events; archive operational entities instead of deleting their history |

Household settings and timezone changes never relabel recorded performed dates or recurrence anchors. Store a chore's creation local date and creation timezone so the “performed date cannot precede creation” rule remains stable after a timezone change.

Use typed fields for identities, states, dates, recurrence selectors, and minutes. Structured JSON is suitable for diagnostic details, normalized import drafts, and immutable display snapshots; it must not replace authoritative relationships or required numeric/date validation.

## 3. Relationship overview

| Parent | Relationship | Child/reference |
| --- | --- | --- |
| Account | Can have access to multiple households | Household memberships |
| Household | Has multiple authorized users | Memberships linking accounts |
| Household | Has multiple assignable people | Members, optionally linked to a membership |
| Member | Has recurring rules, exceptions, and capacity settings | Availability and workload records |
| Household | Owns recurring chore definitions | Chores |
| Chore | Has immutable settings history | Chore revisions |
| Chore | Has recurrence-series history | Series identifying generation and lineage |
| Series | Produces real obligations | Chore occurrences |
| Occurrence | Has zero or more historical resolutions | Completion/skip events and reversals |
| Resolution | May derive a completion-based successor | Successor occurrence linked to the resolution |
| Occurrence | Has scheduling/history records | Schedule changes and capacity approvals |
| Household | Has reviewed uploads | Import batches and temporary row drafts |
| Committed import batch | Records its created definitions | Import-to-chore result links |
| Household | Has concurrency/recovery infrastructure | Command receipts and durable jobs |

Each household relationship includes ownership validation. Knowing a valid occurrence, member, or batch ID from another household never authorizes using it.

## 4. Identity, household, and access records

### 4.1 Accounts

Store an internal account ID, optional unique external authentication-user reference, display name, and creation timestamp. Credentials, password hashes, session tokens, and authentication secrets remain with the authentication provider and are not copied into this domain model.

The internal account ID remains stable if external access is removed. Authentication deletion must not cascade into completion or audit history. A nullable external reference or an equivalent retained identity record allows historical attribution to survive; application access still requires a current verified external identity.

### 4.2 Households

Store ID, name, timezone, week start, input revision, applied input revision, plan version/status, last successful plan timestamp, last reconciled local date, next reconciliation instant, and creation timestamp.

- Input revision increases when scheduling inputs change.
- Applied input revision identifies the input snapshot represented by the saved plan.
- Plan version identifies a published scheduling result, even if no definition was edited.
- Plan status is current, pending, or failed. Applied input revision must not exceed input revision. Current requires matching revisions and a valid reconciliation date context; equal revisions alone are insufficient after a new local day begins.

### 4.3 Household memberships

Store household ID, account ID, access role, active/revoked access status, and creation/revocation timestamps. The household/account pair is unique. Stage 1 has a manager role for both account holders; there is no limited member-login role to infer from assignment.

Retain a membership record after revocation for actor references. Revocation removes access immediately and does not delete the linked member or their chores.

### 4.4 Members

Store ID, household ID, name, optional linked membership/account reference, archive timestamp, and mutable-record revision. Member names need not be unique.

A member may have no linked account. A household account may link to at most one member in that household, and a member may link to at most one account. The link must reference a membership of the same household. Initial linking requires active access; later revocation can retain the historical link without granting access.

Archiving is blocked until every assigned active/paused chore and open occurrence has an explicit reassignment or archive disposition. Historical records retain the archived person's identity and captured display text. Removing access and archiving a member are separate operations.

### 4.5 Invitations

Store ID, household ID, optional intended member ID, token hash, creating account, expiry, acceptance account/time, and revocation time. Store the hash rather than the usable invitation token. Token hashes are unique; expiry follows creation. Acceptance and revocation cannot both be successful outcomes of one invitation.

An invitation does not itself confer access. Acceptance creates or reactivates the membership and links/creates the member atomically after validation. Expiration can be derived from the expiry timestamp. Invitation delivery is not evidence that access was accepted.

## 5. Availability and workload records

### 5.1 Recurring availability rules

Store rule identity, member/household IDs, revision, pattern, weekday selector, optional anchor, optional monthly selector, effective start/end, and creation metadata.

| Pattern | Required fields | Forbidden/irrelevant fields |
| --- | --- | --- |
| Weekly | One or more distinct weekdays | Biweekly anchor and monthly selectors |
| Every two weeks | One weekday and a matching working-date anchor | Monthly selectors |
| Monthly by date | Day of month 1–31 | Weekday-position selector and biweekly anchor |
| Monthly by weekday | One weekday and first/second/third/fourth/fifth/last position | Day-of-month selector and biweekly anchor |

Effective bounds are inclusive local dates; end must be absent or on/after start. Every-two-weeks anchors must match the chosen weekday. Distinct rules may overlap because their available dates are combined; overlaps do not multiply capacity. Revisions of the same logical rule must not apply simultaneously to the same date.

For an effective-dated edit, retain the prior rule contents, close its applicability before the new version starts, and record the boundary change in audit history. A cancelled visit is an exception, not a new anchor. Monthly missing-date/fifth-weekday behavior follows DEV-01: no visit that month.

### 5.2 Availability exceptions

Store household/member IDs, local date, available/unavailable override, optional daily-minutes override, reason, and revision. The household/member/date combination is unique.

An unavailable exception has no positive capacity override. An available exception may add a working date or change that date's capacity. Override minutes must be nonnegative. Exceptions take precedence over recurring rules without changing those rules' future cycles. Audit edits; preserve the state needed to explain historical schedule changes.

### 5.3 Workload setting versions

Store household/member IDs, version, seven explicitly labeled weekday limits, weekly limit, effective start/end dates, and actor/timestamp metadata. All limits are nonnegative integers, and a member has at most one applicable workload version on a date.

Versioning retains the configuration used by older plans. It does not recalculate completed work with old limits: actual completion charges remain immutable, and the current planner applies the settings effective for the relevant date. Lowering a limit can expose excess actual work without invalidating the completion.

For a setting change within a week, compute the remaining week's capacity using the weekly limit applicable to each candidate scheduling date and all completed/accepted work in that date's household-week bucket. Revalidate the whole remaining week; never treat each setting version as an independent weekly allowance. Keep this accounting rule in the scheduling service rather than a row-level numerical constraint.

## 6. Chore definitions and recurrence identity

### 6.1 Chore headers

Store ID, household ID, current definition revision, lifecycle, pause start local date when paused, archive timestamp when archived, creation instant/local date/timezone, and current series reference.

Lifecycle is active, paused, or archived. Pause metadata must agree with paused state; archive metadata must agree with archived state. Archive is terminal in Stage 1. Existing open work must become held on pause or cancelled on archive within the same transaction.

### 6.2 Chore definition revisions

Store chore/household IDs, revision number, name, instructions, responsible member ID, priority, estimated minutes, recurrence type/rule, initial target where applicable, optional allowed weekdays, and recording actor/timestamp.

The chore/revision pair is unique within its household, and the header references a revision of that same chore. Revisions are immutable once recorded. A change adds a revision and updates the header rather than rewriting the settings referenced by history.

| Recurrence type | Required | Constraints |
| --- | --- | --- |
| Completion-based | Positive interval in days and initial target for series creation | Fixed weekdays absent; only one open actionable obligation across the chore |
| Fixed | At least one distinct fixed weekday | Completion interval absent; no completion-based initial-target meaning |

Allowed weekdays, if supplied, must be a nonempty valid set. They further restrict availability; they never create available dates. Priority is high, normal, or low. Store an assignee ID rather than matching by name. A selected member must be active when assignment is created or changed.

The initial target belongs to series initialization. Changing an interval preserves the currently outstanding target. The database must retain enough revision history to detect recurrence edits that block undo, even if an interval is later changed back to its old value.

### 6.3 Recurrence series

Store ID, household/chore IDs, recurrence type, starting definition revision, generation identity, creation time, and optional end time/reason. At most one series is current per chore; paused chores retain their series.

Changing recurrence type closes the old series, cancels its open obligations, and creates a new series. Editing same-type rules retains or reconciles existing identities under DEV-01. A series start reference must belong to the same household/chore and have the matching recurrence type.

Distinguish a series' stable identity from a generation key used when a rule removes and later re-adds a fixed date. Re-added work links back to the cancelled predecessor but uses a new generation identity. It must never revive a terminal cancelled occurrence.

## 7. Occurrences and forecasts

### 7.1 Actionable occurrences

Store ID, household/chore/series IDs, definition revision, recurrence type, stable generation key, optional predecessor occurrence/resolution reference, assignee, target date, nullable scheduled date, lifecycle status, placement, conflict reasons, cancellation reason, current resolution reference, current name/instructions/priority/minutes snapshot, and mutable-record revision.

| Dimension | Values/constraint |
| --- | --- |
| Lifecycle status | Open, completed, skipped, or cancelled |
| Placement | Scheduled, unplaced, or held; separate from status |
| Scheduled date | Present only with an accepted scheduled placement; absent for held/unplaced/resolved work |
| Fixed target | A scheduled fixed occurrence must use its exact target date |
| Completion-based placement | Scheduled on or after target; never earlier automatically in Stage 1 |
| Resolution link | Present for completed/skipped, absent for open/cancelled; must reference the same occurrence/household |
| Cancellation reason | Required when cancelled; retained in history |
| Conflict reasons | Structured reason codes/details; never a replacement for occurrence status |

An open occurrence may be overdue, held, or conflicted without becoming a different lifecycle state. Overdue is computed from an open status and target before household today; it is not a stored boolean that can become stale.

Key uniqueness rules:

- At most one open completion-based occurrence per household/chore, including held and unplaced work and across series changes.
- Unique generation key within its series for repeat-safe generation.
- At most one noncancelled fixed obligation for a household/chore/target date. Different fixed dates may remain overdue simultaneously.
- Identity, household, series, and lineage cannot be silently changed after creation. Predecessor references stay within the same chore/series and cannot form cycles.

History snapshots for completed/skipped/cancelled work are immutable. Updating an assignee or estimate changes open work as specified by DEV-01, while historical resolutions retain their recorded settings. Reopened work can receive current settings only under the documented undo rules.

### 7.2 Forecasts

Forecasts are derived read models, not independent persistent obligations. Stage 1 does not require a forecast table. A forecast includes its source occurrence, definition revision, plan version, projected date/member, and provisional label.

If a later implementation caches forecasts, cache entries must be invalidatable and cannot be referenced by completion/skip records. A real successor is created by a resolution transition, not by checking off a forecast. Forecast capacity is soft and accounted separately from real reservations.

## 8. Completion, skip, reversal, and capacity records

### 8.1 Resolution events

Use one append-only resolution-event family with a kind of completion or skip. Common fields are ID, household/occurrence ID, recording account, action local date, resolution anchor, timezone snapshot, recorded timestamp, definition revision, and immutable chore/member display snapshots.

| Kind | Required data | Data that must be absent |
| --- | --- | --- |
| Completion | Actual performer member, performed local date, positive minutes snapshot | Skip-only justification as the basis of recurrence |
| Skip | Required reason; anchor equal to later of target and local skip date | Performed date, performer, completion-minute charge |

A completion's anchor equals its performed date. Capture the occurrence estimate at completion; later estimate edits never change that charge. The performer can differ from the assignee and recording user. Their identities must remain separately represented.

Keep at most one effective, unreversed resolution per occurrence. Multiple historical attempts after allowed undo are valid, but only the current effective resolution can account for completion or skip. The occurrence's resolution reference and resolution kind/status must agree at transaction commit.

### 8.2 Reversal events

Store a reversal ID, original resolution ID, household/occurrence ID, recording user, timestamp, and reason. A resolution can be reversed at most once. Never delete or alter the original resolution to implement undo.

An undo transaction must reverse the effective resolution, cancel its untouched successor where applicable, reopen the original, update revisions, and enqueue a replan together. Dependency validation reads historical successor resolutions, including reversed ones. A pointer to the current state alone is insufficient for the conservative undo rule.

### 8.3 Capacity approvals

Store ID, household/occurrence/member IDs, exact local date, approved estimate/version, recording user, reason, approval time, optional revocation time/reason, and displayed excess-minute snapshot. An occurrence can have at most one effective approval.

An approval can bypass daily/weekly capacity only. The planner must still enforce availability, weekday restrictions, and fixed-date identity. Estimate/member/date changes, pause, or resolution revoke the approval without deleting its history. Changed limits recalculate visible excess rather than reusing an obsolete display snapshot. Approval never transfers to a successor.

### 8.4 Capacity accounting as a derived result

Do not maintain an independently editable balance that can drift from occurrences and resolutions. Derive actual charges from effective completion events and accepted reservations from open scheduled occurrences. Forecast projections form a separate soft component.

On completion, remove the reservation and add one actual charge on the performer's performed date in the same transaction. Skip, cancellation, held/unplaced work, and reversed completions contribute no actual completion charge. Past open reservations do not consume current/future capacity.

**Example:** A fixed Tuesday chore estimated at 45 minutes is completed Wednesday. Tuesday retains its historical target but contributes no remaining reservation or completion charge. Wednesday receives exactly 45 minutes for the actual performer. The next fixed Tuesday remains a separate obligation.

Capacity totals are a scheduling/transaction rule, not a blanket database prohibition on totals exceeding limits. Truthfully recorded actual work and explicit approvals can exceed capacity and must remain visible.

## 9. Schedule changes, audit, and plan publication

### 9.1 Schedule-change records

Store ID, household/occurrence IDs, before/after dates and placement, trigger, structured/plain-language reasons, source input revision, published plan version, and recording timestamp. A null new date can mean unplaced work; it does not imply deletion.

Records are append-only. A priority rearrangement records displaced work explicitly. Resolved historical entries remain readable after later definition/member changes.

### 9.2 General audit events

Store household, actor account or system actor, event type, typed entity reference where practical, before/after revision identifiers, safe details, and timestamp. Include definition changes, availability/limit changes, pause/resume/archive, member dispositions, and import commitment.

An audit label is not an authorization mechanism. Avoid storing raw uploaded files, usable invitation tokens, message bodies, or unnecessary credentials/content in general audit details. Preserve only the metadata needed for the documented history.

### 9.3 Plan publication records

Store household ID, unique plan version, source input revision, computed local date/timezone/week-start context, published timestamp, and outcome metadata. Changes reference the corresponding published version. Household applied-version pointers must reference their own household's publication.

The worker computes against an input revision and publishes only if it still matches the locked household state. Otherwise it discards/recomputes. Facts already acknowledged to users are not rolled back merely because planning later fails.

## 10. File-import persistence

### 10.1 Batch metadata

Store batch ID, household ID, recording user, status, draft revision, creation/expiry, commit identity, selected-row request fingerprint, selected/created counts, and commit timestamp.

Persistent states are review, committing, committed, discarded, and expired. Uploaded/parsing can be request-local stages before a review batch exists. A committing transaction normally publishes its complete result atomically; an unknown client response is resolved by lookup, not by re-importing.

- Expiry is within 24 hours of draft creation.
- A commit identity is unique within the household and bound to its actor and normalized selection fingerprint.
- A committed batch has its final count and stable created-chore links.
- Reusing a commit identity with different input is rejected; retrying the same completed request returns its original result.

### 10.2 Temporary row drafts

Store household/batch IDs, source row number, normalized mapped fields, explicit member mapping, selection flag, validation errors, duplicate matches/acknowledgments, and draft revision where needed. A row number is unique within a batch; at most 500 nonempty data rows are admitted.

Drafts can contain invalid values because review must let users correct them. They cannot be treated as validated chore definitions until commitment. Member mappings used to create chores must point to active members of the same household; a name match alone is insufficient.

Column mapping and selected sheet metadata are temporary review data, removed with the draft. Raw files are discarded after parsing rather than stored until commitment. Draft contents are removed on commit/discard/expiry. An interrupted cleanup must be retried; expired drafts must already be inaccessible for commit even before physical deletion finishes.

### 10.3 Created-chore links

Store household/batch/chore IDs and original selected row reference or ordinal as minimal commitment metadata. Links preserve the exact IDs returned on retry without retaining the uploaded row contents. A chore has at most one creating import batch.

Commitment validates all selected rows and duplicate acknowledgments, rechecks current member access/activity, creates all selected definitions, records links/counts, removes drafts, and queues one replan in one transaction. Any failure before commit leaves no partial collection of chores. Possible duplicates remain explicit warnings with user decisions, not a database rule prohibiting all same-name chores.

## 11. Command receipts and durable jobs

Daily WhatsApp message drafts are session-local presentation data and do not require a database table. The draft identifies one member/date, source occurrence versions, plan version, generated timestamp, freshness fingerprint, and locally edited text. The server rechecks the real plan and authorization before handoff. Do not persist recipient phone numbers, edited message bodies, or a sent/delivered status in Stage 1.

### 11.1 Command receipts

Store household ID, idempotency identity, command type, actor, request fingerprint, durable result reference/response, and timestamp. The household/key pair is unique and cannot be reassigned to another request or actor.

Receipt storage is atomic with command effects. A retry verifies access and the matching request before returning the existing result. Do not leak a historical response to a user whose household access was revoked. Import receipts/results retain metadata and created IDs rather than copied normalized file content.

### 11.2 Job/outbox records

Store job ID, household, kind, deduplication identity, intended input revision/local reconciliation date as applicable, bounded payload, ready/running/succeeded/failed status, due instant, lease owner/expiry, attempt count, and safe error code.

Kinds cover replan, local-day reconciliation, import-draft expiry, and horizon extension. Deduplication is household-scoped. Running requires a valid lease; nonrunning states must not retain an active lease. Attempts are nonnegative and obey the configured retry policy. State updates and retries cannot silently lose committed household changes.

Jobs are infrastructure for the same domain rules, not permission to ignore them. A trusted system actor may plan across authorized household jobs, while user actions always require live membership. No job automatically sends WhatsApp messages.

## 12. Household isolation and deletion policy

Store application tables in the private schema selected in ARCHITECTURE.md. Browser-facing authentication roles receive no direct application-table access. Server/worker roles receive only intended capabilities; schema migration ownership is a separate privilege.

For every household-owned reference, require the same household as the parent record. In later migrations, implement this through household-qualified foreign keys and matching parent uniqueness, not just client validation. This covers assignees, performers, recording actors, series, occurrence lineage, resolutions, imports, and results.

Authorization still requires verified sessions and active membership checks; valid foreign keys alone do not prevent unauthorized reads or writes. Whether implemented with server predicates, row policies, or both, isolation must be tested with the actual runtime role. Migration-owner tests alone do not establish user isolation.

Ordinary application operations cannot delete households, members, chores, or historical events with cascading loss. Use revocation/archive/cancellation. Restrict referenced-record deletion. Temporary import content is an intentional exception with expiry/cleanup. Privacy-related permanent deletion/export policy is a separate future lifecycle decision; it is not an implicit cascade from deleting an authentication account.

## 13. Constraint and responsibility matrix

“Database” below means a required declarative constraint or explicit database integrity guard in the future implementation. Multi-record checks must be evaluated on the final transaction state where appropriate. A database shape constraint must not be mistaken for a complete business workflow.

| Invariant | Database responsibility | Application/transaction responsibility |
| --- | --- | --- |
| Same-household references | Composite ownership relationships and reference integrity | Live membership check on every operation |
| Valid minutes and rules | Positive estimates/intervals; nonnegative limits; allowed states/selectors | Helpful validation and missing-month expansion |
| Valid member account link | Unique link and same-household membership reference | Verify active access when linking |
| Effective rule/limit versions | Prevent overlap within one logical rule or one member's workload timeline | Choose effective boundary, preserve historical versions, replan |
| One outstanding completion-based chore | Conditional uniqueness for open occurrences across the chore | Resolve/cancel old work before creating/reopening successor |
| Repeat-safe fixed generation | Unique logical obligation and generation identity | Reconcile rule edits and cancelled-date replacements |
| Completion versus skip | Kind-specific required/absent fields, matching occurrence status/reference | Correct date/anchor calculation and performer validation |
| Duplicate completion protection | At most one effective resolution per occurrence | Lock occurrence, check revision, commit event/status/receipt atomically |
| Historical integrity | Append-only revisions/events/reversals and protected resolved snapshots | Explicit undo/new revision rather than overwrite |
| Safe undo | Unique reversal, valid lineage/reference, consistent reopened status | Guard recurrence edits and acted-on descendants; atomic successor cancellation |
| Lifecycle consistency | No open work on archived chores; held work agrees with pause state | Apply pause-window/resume rules and explicit archive impact |
| Member archive | No surviving assigned active/paused chore or open work | Collect explicit reassignment/archive decisions and apply together |
| Fixed dates | Accepted fixed reservation equals target | Rank competing fixed work; surface conflict without moving target |
| Daily/weekly limits | Valid settings and approval references | Account for all applicable dates, reservations, forecasts, and actual work |
| Late completion accounting | Immutable completion minutes/date and one effective resolution | Exchange reservation for actual charge exactly once |
| Atomic import | Valid batch/result references and unique commit identity | Validate selected rows, remove drafts, create all definitions or none |
| Draft expiry | Valid expiry bounds and household ownership | Refuse expired commit, enforce parsing budgets, retry cleanup |
| Fresh published plan | Monotonic versions and own-household publication references | Compare locked input revision and local-date context before publish |
| Message preparation | No recipient/delivery tables required | Read current real obligations; validate freshness before handoff |

## 14. Query/index requirements

Specify indexes with the eventual migration; these are access patterns, not SQL delivered by this task:

- Active memberships by account/household, for authorization and linked-member lookup.
- Active/archived members and current chore revisions within a household.
- Open occurrences by household, scheduled date, and member for Today/calendar.
- Open target dates and conflict status for attention/overdue queries.
- Unique open completion-based and noncancelled fixed obligations as described above.
- Series generation identity and predecessor-resolution links for retries and undo checks.
- Effective availability/workload lookup by household/member/date.
- Resolution and schedule-change history by household/member/chore/date.
- Import draft expiry and household commit identity/result links.
- Ready jobs by due time, expired leases, and households due for reconciliation.

Do not index every JSON field preemptively. Validate query plans and index selectivity against realistic household fixtures after the schema and query implementations exist.

## 15. Reusable fixture specification

Fixtures are specified here for later implementation; no seed file or authentication account is created now. Use stable test IDs and a fixed clock, with independently provisioned test-auth identities.

| Fixture record | Values/purpose |
| --- | --- |
| Household A | Maple Home; America/Recife; Monday week start |
| Alex | Active account/membership, linked member |
| Jordan | Second active account/membership, linked member |
| Sam | Active member, no linked account or email requirement |
| Sam's weekly rule | Every Tuesday, effective 3 November 2026 |
| Sam's biweekly rule | Friday anchored 6 November 2026 |
| Sam's limits | Tuesday/Friday 180 minutes; other weekdays zero; weekly 300 minutes |
| Completion-based chore | Clean bathroom, Sam, high priority, 45 minutes, interval 7 days |
| Fixed chore | A separate chore every Tuesday, normal priority, 15 minutes |
| Capacity displacement | For another available member: 60-minute Tuesday; missed high 45 displaces low 45, retaining normal 15 |
| Household B | Separate account/members/chore/import; used for forbidden cross-household references and access |
| Import draft | Mixed valid/invalid mappings and possible duplicate, requiring explicit review |
| Clock | 3 November 2026 at 10:00 UTC, with local dates calculated in household timezone |

Expected Sam working dates include 3, 6, 10, 17, 20, and 24 November; 13 November is an off-cycle Friday. Cancelling 6 November leaves 20 November unchanged. Add separate monthly fifth-weekday, leap-year, timezone-change, revoked-access, and archived-member cases.

## 16. Migration and verification handoff

Future implementation should separate core tables/relationships, integrity guards, and runtime permissions into reviewable versioned migrations under the chosen single migration history. Required circular relationships, such as an occurrence referencing its resolution while the resolution references the occurrence, must permit atomic insertion and validate at commit. Do not weaken integrity by leaving one side unchecked.

Validate both replay from an empty supported PostgreSQL database and upgrade from the prior committed schema. Use the real authentication schema locally; any lightweight identity stub is explicitly limited test coverage, not a Supabase Auth integration test. Provision sample auth accounts through the auth service rather than writing managed credential tables directly.

| Check | Expected result |
| --- | --- |
| Negative minutes, invalid selectors, mismatched biweekly anchor | Reject invalid records |
| Other-household assignee, actor, resolution, import link | Reject relationship; unauthorized query returns no protected data |
| Two open completion-based occurrences, including held/unplaced | Reject duplicate obligation |
| Repeated fixed generation or duplicate live fixed date | Return existing work or reject duplicate; preserve cancelled history |
| Simultaneous completion requests | Exactly one effective completion and successor; repeat-safe result |
| Completion followed by permitted undo and completion again | Retain first event/reversal; count only the new effective completion |
| Direct historical event/revision overwrite or delete | Reject through intended runtime capabilities/integrity guards |
| Late fixed completion across dates/weeks | One actual charge on performed date; no old reservation double-count |
| Interval/assignee/estimate edit after completion | Preserve original history and apply documented effects to open/future work |
| Member archive with unfinished assignments | Reject unless explicit dispositions complete atomically |
| Competing fixed tasks above capacity | Persist all obligations but reserve only accepted work; show conflict |
| Selected import creates nine chores, response lost, request retried | Nine total, same returned IDs, no retained draft contents |
| Member revoked/archived or rows changed before import commit | Revalidate and reject invalid commitment without partial creation |
| Expired draft or mismatched commit identity/fingerprint | Reject commitment and preserve prior successful result |
| Stale planner publishes after newer completion | Reject stale publication and recompute |
| Generated/copyable WhatsApp message | No completion, recipient-account, phone-number, or delivery record created |

These checks are planned acceptance evidence. No migrations or automated tests were executed for this documentation-only task.

## 17. DEV-04 acceptance coverage

| Original acceptance area | Documentation coverage |
| --- | --- |
| Household, access, members, availability, limits, chores, completion, schedule changes | Sections 3–9 |
| Calendar dates versus instants; timezone and week start | Sections 2, 4, 5, 8 |
| Ownership, stable occurrence identity, duplicate-completion protection | Sections 7, 8, 12, 13 |
| Plan versions and effective-dated changes without rewritten history | Sections 5, 6, 9, 11 |
| Migration validation and reusable fixture requirements | Sections 15–16, specified rather than executed |
| Import drafts, expiry, committed metadata, idempotency; session-local messages | Sections 10–13 |

Completion here means the database design is documented under the user's revised scope. Persistent records, enforcement, migration execution, fixtures, and tests still need to be implemented later. The backlog's existing status is intentionally untouched because this request permits creating this file only.
