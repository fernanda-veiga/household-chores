# Household chores — frontend-first backlog

**Revised:** 2026-11-05.

Build and finish a usable frontend-only website first. Add backend capabilities as a later feature, after frontend release acceptance. DEV-50 now supplies a verified frontend foundation; household data and daily product workflows remain in the subsequent tasks.

## Delivery scope and source documents

| Phase | User experience | Technical boundary |
| --- | --- | --- |
| A — Frontend-only release | Working chores, availability, limits, local scheduling, checklist/history, import, calendar, and manual WhatsApp messages | Runs in the browser, stores data locally, deploys as static files; no login/backend setup |
| B — Backend as a new feature | Real shared accounts, cross-device household data, verified permissions, reliable server processing while browsers are closed | Add Auth/database/API/worker and reviewed local-to-cloud migration behind replaceable adapters |
| C — AI assistance | Reviewed language-based drafts/explanations | Server-side credentials and authorized proposals after Phase B |
| D — Optional enhancements | Reminders, richer recurrence, pins, subtasks, reporting | Individually specified later; not frontend release gates |

**Next task: DEV-51 — browser data storage, fixtures, and replaceable adapters.** DEV-50 is complete. DEV-44/DEV-45 are deferred until DEV-28 signs off the frontend release. No frontend task depends on backend installation or credentials.

The domain rules in [DOMAIN_BEHAVIOR.md](DOMAIN_BEHAVIOR.md) and layouts in [UX_DESIGN.md](UX_DESIGN.md) remain the behavior/design baseline. [PLAN.md](PLAN.md) describes the eventual shared product. [ARCHITECTURE.md](ARCHITECTURE.md) and [DATABASE_DESIGN.md](DATABASE_DESIGN.md) are retained as future backend inputs. This backlog supersedes their backend-first delivery order and server-only execution assumptions during Phase A; it does not claim those documents already describe a built frontend.

### Frontend-only commitments and limits

- All required daily workflows operate on local data, not just hard-coded screenshots. The same pure scheduling rules run in the browser and can later run on the server.
- Data is specific to a browser profile and site origin. Reload persistence is local persistence, not cloud backup or synchronization with another person/device. Manual versioned export/restore is included.
- Selecting a local person/profile is a filter/recording preference, not secure sign-in or proof of identity. Real authentication/invitations are Phase B; preview screens never collect real passwords or claim access was granted.
- Local recalculation happens while the app runs or resumes. No unattended processing, notifications, or morning messages occur while the site is closed.
- CSV/XLSX files are selected and processed in the browser. No server upload is required. WhatsApp handoff shares only reviewed text and requires the user to select a recipient/send externally.
- UI talks to typed adapter operations rather than directly to storage or a database. A later cloud adapter adds authorization and transactions without replacing the completed screen flows.
- No secret keys, Supabase, Docker, SQL migrations, server job service, or actual AI integration is required to complete Phase A. A frontend development server is tooling, not an application backend dependency.

## Task conventions and roadmap

Existing IDs are retained; titles/dependencies are revised to the current phase. DEV-04 remains completed database documentation and DEV-45 is its later implementation. DEV-50 now owns frontend/Git setup. New DEV-51/DEV-52 cover local storage and account previews; DEV-53–DEV-57 provide the later cloud counterparts/integration.

**Done — documentation** means a specification exists, not an implemented feature. **Done — implementation** requires working artifacts and recorded checks. Other tasks are **To do**. P0 means required within its assigned phase, not a backend requirement before the frontend can ship; P1 is AI work, P2 optional enhancements. Owners are disciplines; IDs do not indicate execution order. Use neutral terms and example people Alex, Jordan, and Sam.

| Milestone | Suggested task order |
| --- | --- |
| M0 — Completed design documents | DEV-01, DEV-02, DEV-03, DEV-04 |
| A1 — Frontend setup, Git, and local data | DEV-50, DEV-51, DEV-47, DEV-07, DEV-52 |
| A2 — Local configuration and scheduling | DEV-08, DEV-09, DEV-10, DEV-11, DEV-12, DEV-13, DEV-15, DEV-16, DEV-17, DEV-18, DEV-19, DEV-49, DEV-20, DEV-21, DEV-22 |
| A3 — Complete screens, file import, and WhatsApp preparation | DEV-14, DEV-23, DEV-24, DEV-25, DEV-26, DEV-39, DEV-40, DEV-41, DEV-42, DEV-43 |
| A4 — Frontend acceptance and static release | DEV-27, DEV-28 |
| B1 — Backend foundation and real accounts | DEV-44, DEV-45, DEV-05, DEV-46, DEV-06, DEV-48 |
| B2 — Shared services, migration, and cloud release | DEV-53, DEV-54, DEV-55, DEV-56, DEV-57 |
| C — AI assistance after backend release | DEV-29, DEV-30, DEV-31, DEV-32 |
| D — Optional later enhancements | DEV-33, DEV-34, DEV-35, DEV-36, DEV-37, DEV-38 |

## M0 — Completed design documents

### DEV-01 — Specify domain behavior and edge cases

**Status:** Done — documentation · **Priority:** P0 · **Owner:** Product + engineering · **Dependencies:** None

Deliverable: [DOMAIN_BEHAVIOR.md](DOMAIN_BEHAVIOR.md). Runtime-specific authorization/jobs apply when the backend phase is implemented.

Completed coverage:

- Chore/occurrence/forecast lifecycle, recurrence, priority, capacity, skip/undo, edits, and historical integrity are documented.
- Import/message decisions and scenarios E01–E24 provide the behavior baseline for both browser and future server implementations.

### DEV-02 — Design application flows and reusable screen states

**Status:** Done — documentation · **Priority:** P0 · **Owner:** Product design + frontend · **Dependencies:** DEV-01

Deliverable: [UX_DESIGN.md](UX_DESIGN.md). Use the frontend-only delivery adaptations below.

Completed coverage:

- Wireframes S01–S11, responsive flows, reusable states/components, accessibility, and R01–R13 are documented.
- Future account/invitation flows become clearly labeled previews in Phase A; daily workflows remain available without sign-in.

### DEV-03 — Specify the eventual shared-service architecture

**Status:** Done — documentation · **Priority:** P0 · **Owner:** Engineering · **Dependencies:** DEV-01

Deliverable: [ARCHITECTURE.md](ARCHITECTURE.md). Frontend-only scope in this revised backlog supersedes its original execution order; revisit server integration in DEV-44.

Completed coverage:

- The eventual backend stack, boundaries, authentication, durable jobs, transactions, and deployment workflow are documented.
- This historical backend-first specification is not a prerequisite to installing or running backend services during Phase A.

### DEV-04 — Document database records, relationships, and constraints

**Status:** Done — documentation · **Priority:** P0 · **Owner:** Backend · **Dependencies:** DEV-01, DEV-03

Deliverable: [DATABASE_DESIGN.md](DATABASE_DESIGN.md). Implementation remains DEV-45, after the frontend release.

Completed coverage:

- Persistent records, ownership, uniqueness, historical integrity, import retention, and future database verification are specified.
- No migrations or database enforcement are implied by documentation completion.

## A1 — Frontend setup, Git, and local data

### DEV-50 — Bootstrap the frontend-only application, tooling, and Git

**Status:** Done — implementation (2026-11-05) · **Priority:** P0 · **Owner:** Frontend · **Dependencies:** DEV-02

Results: [DEV50_FRONTEND_SETUP.md](DEV50_FRONTEND_SETUP.md). Setup: [README.md](README.md). Clean install, lint/boundaries, strict type checks, 37 unit/component tests, static build, and 6 desktop/mobile production-browser tests passed. Git is configured locally; no remote, commit, push, hosted CI run, or publication is claimed. Visible in-app preview access was declined; it was not retried. Local storage and the complete shell remain DEV-51/DEV-47.

This replaces the former backend-dependent DEV-50. Git setup moves here from deferred DEV-44. Keep the frontend portable so a later server adapter can be added without replacing the screens.

Acceptance criteria:

- Create a React/TypeScript client application with a static production build, browser routing, styling/design tokens, and pinned compatible Node/npm dependencies with one lockfile.
- Select/document static frontend tooling; no Supabase CLI, database driver, backend runtime, server API routes, Docker, or secret API keys are required to install, run, test, or build the frontend.
- Provide working frontend dev/build/preview, lint/typecheck, unit/component, and browser-test commands; configure CI for checks that actually exist and record executed results separately from hosted CI availability.
- Create module boundaries for pure scheduling/date logic, UI, and a browser data adapter; feature components must not read browser storage directly or contain duplicated scheduling logic.
- Initialize/verify the shared Git repository while preserving existing documents/history and protected metadata; use main for a new repository and project-local author identity fernanda-veiga <fernandarochaveiga@gmail.com> as supplied by the user.
- Configure repository ignore rules and text line endings; verify secrets, dependencies, local data, test traces, and builds are ignored while source/examples are trackable.
- Configure origin only when a URL is supplied/available, and document missing remote setup and feature-branch/commit/check conventions. Do not change global identity or push/create a hosted repository as part of local configuration.
- Verify a clean install, accessible smoke page, and static build/preview with no backend running; production hosting is DEV-28.

### DEV-51 — Implement browser data storage, fixtures, and replaceable adapters

**Status:** To do · **Priority:** P0 · **Owner:** Frontend + shared logic · **Dependencies:** DEV-50

Phase A data belongs to one browser profile/origin. No login, remote persistence, authorization guarantee, or cloud synchronization is claimed.

Acceptance criteria:

- Define typed adapter operations for household/member/configuration/chore/occurrence/history/import/plan data; keep the contract usable by a later remote adapter.
- Implement durable browser storage using IndexedDB or an equivalently transactional browser store, schema versioning, local revisions, and atomic local changes. Keep message text and original import files session-local.
- Provide an empty local-household onboarding path and optional labeled Alex/Jordan/Sam example data; Sam has no account access and the alternate-Friday fixture uses an explicit anchor.
- Store current local profile as a preference, not an authenticated identity. Historical actor labels state that they were selected locally; do not fabricate authentication-provider accounts or verified users.
- Implement an injected clock/date adapter, real household-local calendar dates, and test-only fixed clocks. Public day simulation is explicitly demo mode and must not silently rewrite normal records.
- Implement local operation IDs/retry handling and cross-tab revision awareness; prevent a stale tab from overwriting newer saved data.
- Expose storage unavailable/quota/upgrade/corruption states without claiming failed writes succeeded; offer an explicitly labeled temporary-memory mode when durable storage cannot be used.
- Provide validated versioned JSON export/restore, replacement-impact review, and explicit reset/sample-data controls. A backup is a manual snapshot, not live household synchronization; never silently overwrite existing data on restore.

### DEV-47 — Build the responsive local application shell and shared states

**Status:** To do · **Priority:** P0 · **Owner:** Frontend · **Dependencies:** DEV-50, DEV-51

Acceptance criteria:

- Implement desktop sidebar, mobile navigation, route-preserving detail pages, account-free navigation, and household-local date context from UX_DESIGN.md.
- Build shared cards/checkboxes, member identity/filter, priority/status badges, forms/dialogs, workload meters, feedback, and plan freshness states.
- Use Everyone, This profile/Me, and named-member filters; identify Me from the chosen local profile and explain that changing it does not sign into an account.
- Display clear local-storage scope and backup access, without repeatedly interrupting daily work. Do not require an authentication screen before Today.
- Implement loading, no-data/filter, error, save-pending, stale-tab, and memory-only states with keyboard/focus, contrast, reduced motion, responsive, and large-text checks.

### DEV-07 — Build local household, member, and profile management

**Status:** To do · **Priority:** P0 · **Owner:** Frontend · **Dependencies:** DEV-47

Acceptance criteria:

- Create/name a local household, select timezone/week start, add/rename members, and choose the local current profile.
- Allow every member to receive chores without email, phone number, password, or login; do not imply access permissions are being enforced.
- Provide resumable local onboarding, setup-needed availability/capacity states, and consistent member selectors.
- Expose export/restore access and explain that another device/browser gets a separate dataset until backend sharing exists.
- Archive dispositions and edits affecting existing schedules are integrated by DEV-49; do not silently drop assigned work.

### DEV-52 — Build future account and invitation screen previews

**Status:** To do · **Priority:** P0 · **Owner:** Frontend · **Dependencies:** DEV-47, DEV-07

These are UI previews, not authentication. The local app remains usable without an account.

Acceptance criteria:

- Create accessible visual previews of sign-in, account creation/recovery, invitations, and join/link flows based on S01, reachable as an optional account-feature preview.
- Label these screens as unavailable until shared accounts are implemented. Provide illustrative inputs/example states without accepting/storing real passwords, authentication tokens, or invitations.
- Explain the future shared-account experience and offer a direct return to the working local app; never show a fake verified login or pretend an invitation was sent.
- Reuse layouts/components later in DEV-05/DEV-06, while keeping the entire Phase A workflow independent of these previews.

## A2 — Local configuration and scheduling

### DEV-08 — Implement local weekly and anchored biweekly availability

**Status:** To do · **Priority:** P0 · **Owner:** Frontend + shared logic · **Dependencies:** DEV-51, DEV-07

Acceptance criteria:

- Persist local recurring availability with effective dates and expand actual working dates through pure functions.
- Combine weekly Tuesdays with every-other-Friday rules anchored to a selected working Friday; validate weekday/anchor consistency.
- Keep the cycle stable across month/year boundaries and deduplicate overlaps without multiplying capacity.
- Test expansion and boundary behavior with deterministic dates; do not require backend queries.

### DEV-09 — Implement local monthly availability

**Status:** To do · **Priority:** P0 · **Owner:** Frontend + shared logic · **Dependencies:** DEV-08

Acceptance criteria:

- Support day-of-month and first/second/third/fourth/fifth/last weekday selectors.
- Skip nonexistent dates/fifth weekdays, using calendar months rather than four-week intervals.
- Combine monthly, weekly, and biweekly availability and test leap years/month ends/overlaps.

### DEV-10 — Implement local availability exceptions and effective edits

**Status:** To do · **Priority:** P0 · **Owner:** Frontend + shared logic · **Dependencies:** DEV-09

Acceptance criteria:

- Cancel a working date, add an extra date, or set a date-specific nonnegative capacity override without reanchoring recurring rules.
- Retain effective-dated configuration history and prevent contradictory revisions of one logical rule applying simultaneously.
- Save changes atomically through the browser adapter and invalidate the local plan; no job queue or remote service is required.
- Test exception priority, overlap, removal, and historical-date preservation.

### DEV-11 — Build availability editing and working-date preview

**Status:** To do · **Priority:** P0 · **Owner:** Frontend · **Dependencies:** DEV-47, DEV-10

Acceptance criteria:

- Implement S06 rule cards, weekday/month selectors, anchor picker, effective dates, exceptions, and a local preview using the shared date expansion functions.
- Show Tuesday-and-Friday versus Tuesday-only weeks and mark off-cycle Fridays explicitly.
- Support desktop/mobile editing and accessible date controls; preserve drafts and distinguish invalid rules, preview failure, and save failure.
- Do not show fabricated visits when the local preview cannot be calculated.

### DEV-12 — Build local daily and weekly workload configuration

**Status:** To do · **Priority:** P0 · **Owner:** Frontend + shared logic · **Dependencies:** DEV-47, DEV-10

Acceptance criteria:

- Persist effective weekday/weekly minute limits and date overrides locally, with nonnegative validation.
- Build S07 and demonstrate lower usable capacity in Tuesday-only weeks, no carryover, and the distinction between available dates and capacity ceilings.
- A midweek setting edit cannot create a second independent weekly allowance; preserve completed minute snapshots when limits change.
- Emit local plan invalidation and show actual overload rather than deleting historical work. Aggregation is DEV-16.

### DEV-13 — Implement local versioned chore definitions

**Status:** To do · **Priority:** P0 · **Owner:** Frontend + shared logic · **Dependencies:** DEV-51, DEV-07

Acceptance criteria:

- Create/read typed definitions with name, instructions, responsible member, priority, estimated minutes, recurrence, initial target, and optional restrictions.
- Use immutable local revisions and shared validation for positive estimates/intervals, known local members, and recurrence-specific fields.
- Expose common adapter operations for forms and imports; store IDs rather than using member names as identity.
- Define edit/lifecycle operations whose full effects on existing obligations are implemented by DEV-49; initial generation is DEV-15.

### DEV-15 — Generate real local occurrences and provisional forecasts

**Status:** To do · **Priority:** P0 · **Owner:** Frontend + shared logic · **Dependencies:** DEV-13

Acceptance criteria:

- Create one open actionable occurrence per completion-based chore and independent fixed-date obligations, with repeat-safe stable IDs.
- Separate target from scheduled date and build an eight-week provisional projection; forecasts are typed nonactionable entries, not duplicate obligations.
- Expose successor generation using scheduled anchors provisionally and completion/skip anchors after resolution.
- Use pure functions reusable by a later backend. Final placement comes from DEV-17; opening the app must not regenerate duplicate work.

### DEV-16 — Implement browser-side eligibility and capacity accounting

**Status:** To do · **Priority:** P0 · **Owner:** Frontend + shared logic · **Dependencies:** DEV-10, DEV-12, DEV-15

Acceptance criteria:

- Evaluate availability, exceptions, restrictions, whole-chore duration, and both daily/weekly limits by member/date.
- Count completed work against actual performer/date, real reservations separately, and forecasts as soft capacity without double-counting.
- Apply effective settings/week boundaries; never borrow another member’s capacity or silently overbook.
- Reserve competing fixed work deterministically under D06 and return unplaced conflicts without changing fixed targets.
- Accept truthful actual completed work above limits and expose overload, while automatic planning remains constrained.

### DEV-17 — Implement local priority-based scheduling and displacement

**Status:** To do · **Priority:** P0 · **Owner:** Frontend + shared logic · **Dependencies:** DEV-15, DEV-16

Acceptance criteria:

- Compute plans in the browser using deterministic pure logic, not hard-coded calendar fixtures or a remote AI call.
- Reconsider all unfinished movable work, including lower-priority chores already scheduled; use priority/oldest target/stable ties among eligible dates.
- Schedule on/after target, preserve fixed/completed work, avoid premature reservations, and prefer existing placements when otherwise equivalent.
- Pass the overdue-high 45 plus normal 15 Tuesday example, displacing low 45 to the next feasible day under a 60-minute limit.
- Keep infeasible work visible and place soft forecasts after real obligations. Repeated identical inputs produce the same plan.

### DEV-18 — Explain local schedule changes and unplaced work

**Status:** To do · **Priority:** P0 · **Owner:** Frontend + shared logic · **Dependencies:** DEV-17

Acceptance criteria:

- Return structured reasons for availability, restrictions, daily/weekly capacity, fixed conflicts, and horizon exhaustion.
- Produce before/after placement changes tied to local input/plan versions and understandable explanations.
- Identify repeatedly postponed work without automatically raising priority and expose all relevant remedies.
- Do not imply an AI agent or server made the decision; explanations are generated from actual local planner facts.

### DEV-19 — Implement local completion, skip, and safe undo

**Status:** To do · **Priority:** P0 · **Owner:** Frontend + shared logic · **Dependencies:** DEV-51, DEV-17

Acceptance criteria:

- Apply real checkbox completion to local obligations, recording performer, selected local recorder/profile, performed date, and immutable estimate/settings snapshots.
- Use actual completion plus interval for successors and D01 skip anchors without fabricated work; fixed future dates remain unchanged.
- Implement allowed undo with append-only reversal, acted-on-descendant/recurrence-edit guards, and untouched-successor cancellation.
- Save resolution, successor, capacity facts, history, and local operation result atomically; repeat clicks/retries cannot duplicate completion.
- Test late completion across weeks, backdates, skip, local retry/stale-tab behavior, and blocked undo. Multi-user server concurrency is later work.

### DEV-49 — Implement local edits, lifecycle transitions, and date-setting changes

**Status:** To do · **Priority:** P0 · **Owner:** Frontend + shared logic · **Dependencies:** DEV-07, DEV-10, DEV-12, DEV-13, DEV-19

Acceptance criteria:

- Apply documented assignee/priority/estimate/restriction/interval/fixed-rule edits to outstanding and future work without rewriting resolved history.
- Require an impact review for recurrence-type replacement; cancel old open work explicitly and start a new local series.
- Implement pause/hold, resume pause-window handling, archive, member disposition/reassignment, and affected capacity-approval revocation.
- Build member/settings impact dialogs and preserve dates/anchors on timezone/week-start changes while invalidating the local plan.
- Test the domain edge cases and preserve local operation/history records. Chore management controls are connected in DEV-14.

### DEV-20 — Coordinate local plans, atomic saves, and screen updates

**Status:** To do · **Priority:** P0 · **Owner:** Frontend + shared logic · **Dependencies:** DEV-18, DEV-19, DEV-49, DEV-51

Acceptance criteria:

- Coordinate local adapter commands, pure planning, atomic persistence, and UI refresh with distinct input/plan versions.
- Recheck local revisions before publication so another tab or a newer edit cannot be overwritten by an older calculation.
- Keep Today, calendar, workload, history, imports, and message sources consistent; refresh visible data on focus and local cross-tab changes.
- Report save/calculation/storage failures truthfully; retrying a plan must not repeat an already-saved completion or import.
- Use the replaceable adapter boundary; cross-device synchronization, server permissions, and durable server jobs are not claimed.

### DEV-21 — Reconcile missed work when the local app opens or resumes

**Status:** To do · **Priority:** P0 · **Owner:** Frontend + shared logic · **Dependencies:** DEV-20

Acceptance criteria:

- Reconcile household-local dates on load, focus/resume, manual refresh, and day rollover while the app is running.
- On reopening after several days, catch up missed work without duplicate completion-based obligations or altered fixed history; extend the horizon.
- Clearly explain that calculations run when the site is open/returns, not on a server while the browser is closed.
- Test timezone/DST/date-boundary changes and suspended tabs using the injected clock; no background worker installation is required.

### DEV-22 — Verify local scheduling and lifecycle invariants

**Status:** To do · **Priority:** P0 · **Owner:** Frontend + QA · **Dependencies:** DEV-21

Acceptance criteria:

- Run meaningful pure-domain and browser-adapter tests covering E01–E18 as applicable to local mode.
- Cover alternating Fridays/monthly exceptions, effective limits, priority displacement, fixed conflicts, lifecycle edits, late completion, and guarded undo.
- Verify transaction rollback/local retries and stale-tab handling without claiming authenticated multi-user isolation or PostgreSQL coverage.
- Keep feature-level tests with their implementation; this task consolidates adversarial and cross-feature scenarios.

## A3 — Complete screens, file import, and WhatsApp preparation

### DEV-14 — Build complete local chore-management screens

**Status:** To do · **Priority:** P0 · **Owner:** Frontend · **Dependencies:** DEV-47, DEV-49

Acceptance criteria:

- Implement S04 search/list/filter/create/edit with both recurrence types, instructions, responsible person, priority, duration, target, and restrictions.
- Wire real local save, pause/resume/archive, skip where applicable, impact previews, and type-conversion confirmation.
- Explain preserved history/current-target behavior and prevent invalid initial-target editing after resolution.
- Handle dirty forms, save errors, storage failure, and local replanning states on mobile/desktop; no placeholder CRUD controls.

### DEV-23 — Build Today with working local checkboxes

**Status:** To do · **Priority:** P0 · **Owner:** Frontend · **Dependencies:** DEV-47, DEV-20

Acceptance criteria:

- Show actual locally scheduled chores grouped/filtered by member with priority, duration, instructions, and daily/weekly usage.
- Wire completion details, skip, and eligible undo to local operations with pending/retry/blocked-undo feedback.
- Keep overdue fixed, scheduled overdue movable work, and unplaced attention work distinct without duplication.
- Preserve focus and support meaningful empty/completed/filter/storage-error states; account access is never required.

### DEV-24 — Build local week/month calendars and chore details

**Status:** To do · **Priority:** P0 · **Owner:** Frontend · **Dependencies:** DEV-47, DEV-20

Acceptance criteria:

- Implement S03 navigation, Everyone/current-profile/named filters, addressable details, and mobile agenda alternatives.
- Distinguish real obligations, completed work, provisional forecasts, target/scheduled dates, and conflicts.
- Keep fixed conflicts on their target dates and unplaced movable work outside the grid; explain eight-week limits.
- Restore date/view/filter when navigating Back and provide accessible overflow/keyboard/list behavior.

### DEV-25 — Build local conflict resolution and one-occurrence capacity approvals

**Status:** To do · **Priority:** P0 · **Owner:** Frontend + shared logic · **Dependencies:** DEV-24, DEV-14

Acceptance criteria:

- Build S08 attention/change review with actual local conflict reasons and links to availability, limits, and chore settings.
- Implement explicit occurrence/member/date capacity approval with reason and daily/weekly excess preview, persisted in local history.
- Never override availability/restrictions/fixed targets, silently change limits, or transfer approvals to successors.
- Revoke approvals on relevant edits/lifecycle changes and test override-aware recalculation; dragging/pins remain optional DEV-35.

### DEV-26 — Build local completion and schedule-change history

**Status:** To do · **Priority:** P0 · **Owner:** Frontend · **Dependencies:** DEV-47, DEV-20

Acceptance criteria:

- Implement S09 filters and readable history for completions, skips, reversals, archive/cancellation, and before/after schedule changes.
- Show performer separately from locally selected recorder/profile, without presenting that profile as a verified user account.
- Keep captured settings and archived-member labels readable and expose guarded undo with blocker explanations.
- Do not permit arbitrary historical overwrites.

### DEV-39 — Parse chore files safely in the browser and commit local imports

**Status:** To do · **Priority:** P0 · **Owner:** Frontend + shared logic · **Dependencies:** DEV-15, DEV-51

Acceptance criteria:

- Read CSV or one selected XLSX sheet locally with browser-compatible parsing; files are not uploaded to a server.
- Enforce D09 size/row/decompression/formula/format policies using browser-appropriate limits and an isolated Web Worker with timeout/termination, not a Node child process.
- Persist only normalized review drafts with a 24-hour local expiry, mapping/member validation, duplicate warnings, and explicit row selection.
- Atomically create selected valid/acknowledged chores through the local adapter, record stable operation/results, remove drafts, and trigger one recalculation.
- Never update existing chores silently; preserve original file only in memory and do not retain message/file content in general history. Enforce expiry on access even if the app was closed during the cleanup time.

### DEV-40 — Build local file-import upload/mapping/review screens

**Status:** To do · **Priority:** P0 · **Owner:** Frontend · **Dependencies:** DEV-14, DEV-39

Acceptance criteria:

- Implement S10 template download, file picker, sheet/column mapping, local-member matching, editable review rows/mobile cards, and explicit duplicate decisions.
- Tell users files are processed in this browser; no backend upload or member account is required.
- Require valid selected rows and final count review; support explicit exclusions rather than silently dropping errors.
- Handle malformed files, expired drafts, failed local commits, repeat submissions, and successful-import/failed-recalculation independently.

### DEV-41 — Generate daily messages from the current local plan

**Status:** To do · **Priority:** P0 · **Owner:** Frontend + shared logic · **Dependencies:** DEV-20

Acceptance criteria:

- Generate deterministic text for one member and eligible local date using only real remaining scheduled obligations.
- Include person/full date, priority-ordered names, estimates, optional instructions, and total; website-only warnings explain excluded work.
- Return local source versions/fingerprint/timestamp and compare relevant plan changes before handoff; forecasts and another person’s chores never enter the list.
- Keep edited text session-local. No recipient account/phone number, remote service, completion mutation, or delivery record is created.

### DEV-42 — Build editable local daily messages and manual WhatsApp sharing

**Status:** To do · **Priority:** P0 · **Owner:** Frontend · **Dependencies:** DEV-23, DEV-24, DEV-41

Acceptance criteria:

- Implement S11 from Today, selected calendar day, and member profile with one member/date, editable preview, instruction toggle, exclusions, and total.
- Recheck the local plan before copy/open; block stale/no-work/calculation-failed states and preserve custom text during regeneration.
- Provide Copy message and user-initiated WhatsApp recipient selection, with full-text manual fallback for clipboard/popup/length/device issues.
- Never truncate chores, claim Sent/Delivered, or automatically send morning messages. Sharing the text does not share the local app database.

### DEV-43 — Verify frontend-only imports and sharing end to end

**Status:** To do · **Priority:** P0 · **Owner:** Frontend + QA · **Dependencies:** DEV-22, DEV-40, DEV-42

Acceptance criteria:

- Cover E19–E24 and R11–R13 adapted to local data: limits, malformed files, formulas, duplicates, expired drafts, atomic failure, and retry recovery.
- Verify message freshness after local completion/reassignment/edit/rescheduling and correct empty off-cycle dates.
- Exercise local cross-tab changes, browser storage failure, mobile/desktop clipboard and handoff fallbacks, and custom-text recovery.
- Intercept outbound navigation in automated tests; send no real WhatsApp messages and make no cloud/auth coverage claim.

## A4 — Frontend acceptance and static release

### DEV-27 — Validate the complete frontend-only household workflow

**Status:** To do · **Priority:** P0 · **Owner:** Frontend + QA · **Dependencies:** DEV-11, DEV-12, DEV-14, DEV-22, DEV-23, DEV-24, DEV-25, DEV-26, DEV-43, DEV-52

Acceptance criteria:

- Demonstrate blank/example setup, people/profile selection, all availability patterns, limits, chores, import, priority scheduling, checklist/undo, calendar/history, and message sharing without any backend running.
- Verify reload persistence, export/restore/reset, schema upgrade/error states, browser-only actor labeling, and local-data limitations.
- Review keyboard/screen reader, contrast, large text, loading/error/empty/conflict states, responsive layouts, and future account previews.
- Test a static production build, not just a development server. Record test evidence and resolve release-blocking defects.

### DEV-28 — Publish and sign off the frontend-only release

**Status:** To do · **Priority:** P0 · **Owner:** Frontend + infrastructure + QA · **Dependencies:** DEV-27

Frontend completion is this release gate. Optional enhancements do not block it; backend development starts afterward.

Acceptance criteria:

- Build a static deployable artifact and verify preview/production routing, deep links, secure-context copy, assets, and local storage behavior under the final origin.
- Provide a reviewable hosted preview when hosting access/authorization is available, or the tested artifact/local preview with the exact external hosting step documented.
- Explain that changing origin/browser/device changes the local dataset; recommend versioned export before moving to a new origin.
- Document deployment/rollback, local backup/restore, frontend check results, and the supported-browser/device review.
- Sign off all required Phase A tasks before beginning backend implementation. No database, authentication, API keys, server job service, or real AI is needed to use this release.

## B1 — Backend foundation and real accounts

**Gate:** begin these implementation tasks only after DEV-28 frontend release acceptance. Local frontend use continues without enabling these services.

### DEV-44 — Bootstrap backend/shared server tooling after frontend release

**Status:** To do · **Priority:** P0 · **Owner:** Backend + infrastructure · **Dependencies:** DEV-03, DEV-28

Deferred Phase B task. This is no longer a prerequisite for building or releasing the frontend.

Acceptance criteria:

- Review the existing frontend contracts and update the eventual server-host/integration decision before adding server dependencies; preserve the completed frontend and its local mode.
- Add server-only TypeScript/configuration, pinned backend dependencies, local Supabase tooling, migration commands, and server/worker build/test contracts without creating a second conflicting repository or lockfile.
- Keep credentials server-only and reuse pure rules/date tests; add verified local service startup/shutdown and truthful environment prerequisites.
- Extend the existing Git/CI setup from DEV-50 rather than reinitializing it or changing global settings. Actual worker execution is DEV-48.

### DEV-45 — Implement persistent database records and constraints

**Status:** To do · **Priority:** P0 · **Owner:** Backend · **Dependencies:** DEV-04, DEV-44

Acceptance criteria:

- Implement DATABASE_DESIGN.md as versioned migrations, restricted roles, same-household references, stable identities, effective revisions, append-only history, and duplicate-resolution protection.
- Include imports/expiry/results, approvals, publications, receipts, jobs, and local-date versus instant conventions; no messaging delivery tables are required.
- Implement deterministic fixtures with two Auth-backed users and a member without account access, plus another isolated household.
- Replay and test real local PostgreSQL/Supabase migrations, negative constraints, and restricted-role isolation; do not confuse completed documentation or frontend persistence with a database implementation.

### DEV-05 — Implement real authentication and session lifecycle

**Status:** To do · **Priority:** P0 · **Owner:** Backend + frontend · **Dependencies:** DEV-45, DEV-52

Acceptance criteria:

- Connect the existing account-preview layouts to verified sign-in/out, account creation/recovery, and server session verification.
- Keep authentication identities separate from members and reject unauthenticated cloud operations.
- Handle expiry/recovery without duplicate commands, using local email testing before production delivery setup.
- Preserve explicit local mode; selecting a local profile must never become cloud authentication.

### DEV-46 — Implement authorized repositories and server command transactions

**Status:** To do · **Priority:** P0 · **Owner:** Backend · **Dependencies:** DEV-45, DEV-05

Acceptance criteria:

- Implement verified-actor/live-membership checks, household-scoped queries, revision locking, actor-bound idempotency/fingerprints, and stable result readback.
- Atomically persist facts, audit, input revision/pending-plan state, and durable outbox jobs.
- Test revoked/forged/cross-household requests, rollback, concurrency, duplicate commands, and lost responses against the actual restricted runtime role.
- Implement a remote adapter contract matching the frontend’s operation boundary without trusting browser-provided ownership or validation.

### DEV-06 — Implement real household invitations and shared access

**Status:** To do · **Priority:** P0 · **Owner:** Backend + frontend · **Dependencies:** DEV-46, DEV-52

Acceptance criteria:

- Create/join shared households and link accounts to eligible members atomically using real verified users.
- Implement expiring hashed invitations, revocation, acceptance retries, access removal, and intended member linking without duplicates.
- Activate the existing invitation previews only after actual operations work; distinguish a copied invitation from an accepted one.
- Test two users accessing the same household and denial of another household’s records.

### DEV-48 — Implement durable background job execution

**Status:** To do · **Priority:** P0 · **Owner:** Backend + infrastructure · **Dependencies:** DEV-46

Acceptance criteria:

- Implement leased claiming, heartbeats, retries/deduplication, shutdown/recovery, and operational job health with durable PostgreSQL records.
- Run worker independently of web/browsers with restricted credentials and idempotent handlers.
- Prove at-least-once recovery and register domain handlers through DEV-54; no WhatsApp delivery job is included.

## B2 — Shared services, migration, and cloud release

### DEV-53 — Implement cloud household configuration and chore APIs

**Status:** To do · **Priority:** P0 · **Owner:** Backend · **Dependencies:** DEV-46, DEV-06

Acceptance criteria:

- Provide authorized cloud equivalents of the completed local member, availability/exception, workload, chore/revision, and lifecycle operations.
- Reuse pure validation/rules and preserve exact edit/archive/timezone/undo-related semantics rather than recreating conflicting behavior in server endpoints.
- Persist settings/history with appropriate transaction/revision guards and enqueue replanning.
- Test actual permission boundaries, stale writes, effective versions, and member archive dispositions independently of UI controls.

### DEV-54 — Implement server planning, resolution, and closed-browser reconciliation

**Status:** To do · **Priority:** P0 · **Owner:** Backend · **Dependencies:** DEV-53, DEV-48

Acceptance criteria:

- Run the existing pure recurrence/eligibility/priority engine on authorized database snapshots and publish only against current input/date context.
- Implement server-atomic completion/skip/undo, actual capacity accounting, history, and successor identity with concurrency/idempotency protection.
- Register durable replanning, local-day catch-up/horizon, and cleanup scheduling so work is reconciled even while all browsers are closed.
- Test simultaneous users, stale publication, outages, job retries, DST, and unchanged historical facts. Local browser timers are not evidence of server automation.

### DEV-55 — Implement cloud import commitment and message freshness APIs

**Status:** To do · **Priority:** P0 · **Owner:** Backend · **Dependencies:** DEV-54

Acceptance criteria:

- Add bounded server-side file validation/parsing and authorized normalized drafts/atomic commitment following D09; never trust client parser results alone.
- Implement draft expiry, stable result readback, duplicate review, and cross-household/member-activity validation with no partial imports.
- Generate/revalidate D10 message sources against the shared plan; client-side content checks do not replace live cloud authorization/freshness.
- Preserve manual copy/WhatsApp handoff and no delivery claims. Keep local and cloud import/message adapters explicit and covered by contract tests.

### DEV-56 — Connect cloud adapters and migrate local data with review

**Status:** To do · **Priority:** P0 · **Owner:** Full stack · **Dependencies:** DEV-53, DEV-54, DEV-55

Acceptance criteria:

- Connect completed screens to the cloud adapter while preserving optional local mode and clear active-dataset/account indicators.
- Implement cross-device refresh and real multi-user identity/actor attribution; distinguish authenticated users from unverified imported local recorder labels.
- Offer explicit reviewed local-to-cloud migration/export upload with counts, validation, ownership mapping, duplicate handling, rollback, and retry-safe IDs.
- Preserve the original local dataset/backup until verified cloud commitment; never upload automatically on sign-in or turn local history into fabricated verified account actions.
- Test two accounts/devices, session expiry, revoked access, adapter parity, migration failure, and concurrent edits; remove preview labels only for genuinely implemented capabilities.

### DEV-57 — Validate and release the shared backend-enabled application

**Status:** To do · **Priority:** P0 · **Owner:** Full stack + QA + infrastructure · **Dependencies:** DEV-56

Acceptance criteria:

- Run full shared-household acceptance with real Auth/database/worker/remote adapters, including isolated households, concurrent completions, closed-browser jobs, imports, and message freshness.
- Configure staging/production secrets, auth callbacks/email, controlled migrations, web/worker deployment, monitoring, and verified nonproduction backup/restore/rollback.
- Regression-test the completed frontend and local mode, and document new cloud data/permissions behavior.
- Release backend capabilities only after actual integration checks and required deployment authorization; preserve honest account/delivery labels.

## C — AI assistance after backend release

### DEV-29 — Implement the authorized AI adapter and proposal boundary

**Status:** To do · **Priority:** P1 · **Owner:** Backend + AI engineering · **Dependencies:** DEV-57

Acceptance criteria:

- Select a server-only provider/model behind a feature flag using minimized authorized household context.
- Return typed drafts/explanations, with acceptance before definition/assignment/frequency/priority/availability/limit changes; no direct SQL or autonomous queue authority.
- Keep the deterministic scheduler and ordinary workflows usable when AI is disabled/unavailable. Never place a secret provider key in the frontend.

### DEV-30 — Convert natural-language requests into reviewed chore drafts

**Status:** To do · **Priority:** P1 · **Owner:** AI engineering + frontend · **Dependencies:** DEV-29

Acceptance criteria:

- Create editable names/assignees/recurrence/priorities/estimates/instructions, labeling inferred values.
- Resolve ambiguity before normal validated commitment; distinguish member availability from chore frequency.
- Persist only explicitly accepted changes through the cloud command boundary.

### DEV-31 — Explain plans and propose overload remedies with AI

**Status:** To do · **Priority:** P1 · **Owner:** AI engineering + frontend · **Dependencies:** DEV-29

Acceptance criteria:

- Ground explanations in actual shared-plan reasons, including alternate-Friday and fixed-date restrictions.
- Present reviewable changes without silent mutation and retain deterministic explanations as fallback.
- Do not invent events, completion, or delivery state.

### DEV-32 — Evaluate and release AI assistance

**Status:** To do · **Priority:** P1 · **Owner:** AI engineering + QA · **Dependencies:** DEV-30, DEV-31

Acceptance criteria:

- Evaluate ambiguity, authorization, proposal acceptance, failure, and scheduler-rule preservation.
- Verify no unaccepted mutations or cross-household disclosure and regression-test both local/cloud core flows.
- Monitor latency/errors with content-minimizing logs before enabling the assistant.

## D — Optional later enhancements

### DEV-33 — Add reminders and notification preferences

**Status:** To do · **Priority:** P2 · **Owner:** Product + full stack · **Dependencies:** DEV-57

Acceptance criteria:

- Specify channels, opt-in, timing/timezone, quiet behavior, and unsubscribe before integration.
- Use current plans, deduplicate after rearrangement, and never record completion from a reminder.
- Scheduled WhatsApp sending requires separately approved scope and is not implied by manual message preparation.

### DEV-34 — Add richer chore recurrence

**Status:** To do · **Priority:** P2 · **Owner:** Product + full stack · **Dependencies:** DEV-57

Acceptance criteria:

- Specify monthly chore rules/missing-date semantics, distinct from monthly availability already in the frontend.
- Extend shared pure rules, browser/cloud schemas/adapters, forms, forecasts, completion/undo, and regression tests consistently.

### DEV-35 — Add manual calendar moves and pins

**Status:** To do · **Priority:** P2 · **Owner:** Product + full stack · **Dependencies:** DEV-25, DEV-57

Acceptance criteria:

- Specify pin ordering/conflicts and unpin behavior before implementation.
- Add accessible explicit moves with fixed-day/availability validation, auditable capacity approvals where appropriate, and parity across local/cloud adapters.

### DEV-36 — Add subtasks and split work

**Status:** To do · **Priority:** P2 · **Owner:** Product + full stack · **Dependencies:** DEV-57

Acceptance criteria:

- Specify parent recurrence/completion, partial work, and cross-date/member behavior before changing whole-chore constraints.
- Implement compatible local/cloud accounting without double-counting and test completion, skip, undo, and history.

### DEV-37 — Add workload and postponement reporting

**Status:** To do · **Priority:** P2 · **Owner:** Full stack · **Dependencies:** DEV-26, DEV-57

Acceptance criteria:

- Show estimated completed effort by performer/period and repeatedly overloaded/postponed work.
- Preserve historical estimates/actor provenance, label metrics, and link to review actions without automatic rule changes.

### DEV-38 — Add optional reassignment suggestions

**Status:** To do · **Priority:** P2 · **Owner:** Product + full stack · **Dependencies:** DEV-31

Acceptance criteria:

- Specify opt-in suggestions while retaining stable default assignments.
- Check proposed member availability/capacity and require acceptance through standard edit operations.
- Preserve historical performers and explain effects on outstanding/future work.

## Definition of done and phase gates

- Feature tasks produce working code and meaningful tests; a plan, empty suite, or static fixture alone is not implementation.
- Phase A checks run with no backend or cloud credentials. Verify a static production build, real browser persistence, local transaction/retry behavior, export/restore, responsive accessibility, and all required flows.
- Report actual executed commands/results and missing prerequisites honestly. Do not claim cross-device sharing, verified identity, secure multi-user isolation, server concurrency, or closed-browser jobs from local tests.
- Keep tests deterministic with injected clocks. Do not send real messages or commit real household data, passwords, tokens, or generated backups.
- Preserve existing behavior through adapter contract/regression tests. Backend additions must revalidate every client input and implement real permissions; local checks are not security controls.
- DEV-27 and DEV-28 complete the required frontend scope. All Phase A tasks must be accepted before DEV-44 begins. Optional Phase D enhancements are not part of that gate.
- Phase B release additionally requires real database/Auth/worker integration tests, safe migration, isolation/concurrency evidence, operating procedures, and DEV-57 acceptance.
- Mark tasks Done only with evidence appropriate to their phase. Update affected design documents as implementation decisions are accepted; this backlog revision itself installs or implements nothing.

## Revision summary

There are 57 tasks: four completed documentation tasks, one completed implementation task (DEV-50), and 52 To do. Phase A has 32 implementation/release tasks (one complete), Phase B has 11, Phase C has four, and Phase D has six. All original IDs remain available for existing references.

Continue with DEV-51, then DEV-47. Build the complete local frontend through DEV-28. Add backend capabilities later through DEV-44–DEV-46, DEV-05/DEV-06/DEV-48, and DEV-53–DEV-57. DEV-04 stays documentation-only; DEV-45 remains the database implementation task.
