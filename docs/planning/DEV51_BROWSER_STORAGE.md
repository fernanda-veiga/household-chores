# DEV-51 — Browser data storage, fixtures, and replaceable adapters

Status: Complete. Implemented 5 November 2026. Depends on DEV-50. The next task is DEV-47.

## Result and how to try it

The application now saves one household in the current browser profile and origin,
without a backend. Run `npm run dev` and choose **Local data** or open
`/#/local-data`. Create an empty household using a name and IANA timezone, or review
and explicitly confirm the optional example household. Changes survive reload in
persistent mode. Member editing, chore forms, scheduling, and calendars remain
later tasks; this page does not pretend that saved definitions are scheduled work.

The page also provides local profile selection, JSON backup download, reviewed
restore, reviewed reset, and explicit temporary mode after a storage error.
Nothing was deployed, committed, or pushed as part of DEV-51. Existing planning
folder organization was preserved.

## Layers and replaceable contracts

- `src/application/storage/port.ts` defines typed reads, batched commands,
  subscriptions, close, and injected clock/ID sources. Typed record updates cover
  members, availability, exceptions, workload, chores, occurrences, history,
  import reviews, and plan/forecast data. Household initialization/replacement,
  profile selection, reset, and import-review deletion are explicit operations.
- `model.ts` supplies types through strict runtime parsers and validates persisted
  snapshots, supported migrations, and aggregate references. Unknown fields are
  rejected, including accidental account, file, or message payloads.
- `commands.ts` applies a complete batch to an isolated copy, checks its expected
  revision, validates the final aggregate, and appends a local-change audit entry.
  This permits related records to be created atomically without intermediate
  dangling references. Ordinary record operations cannot rewrite existing history.
- `service.ts` owns operation creation and backup/replacement review. UI components
  receive application services rather than opening storage.
- `src/adapters/browser/indexed-db.ts` implements durable storage; `memory.ts`
  implements the same contract for explicitly selected temporary use.
- `src/storage-runtime.ts` is the composition root. It lazily opens storage and
  injects real browser clocks and random IDs. UI code does not import adapters;
  automated module-boundary checks enforce that separation.

A later cloud adapter can implement this asynchronous contract while the UI keeps
calling application operations. It must still add server validation, permissions,
authentication, and authoritative concurrency handling. No cloud compatibility or
secure isolation is established merely by passing local contract tests.

## Database and validation decisions

The native IndexedDB database is `our-home-local`, version 2. Its `state` store
holds a single current aggregate: schema version, monotonically increasing local
revision, nullable dataset, and nullable current profile. A separate `receipts`
store holds operation fingerprints and resulting revisions.

A single aggregate keeps cross-record validation and atomic household replacement
simple for the initial small household application. The tradeoff is that each
change reads/validates/writes the aggregate; it is not a design for an unbounded
history or large multi-household dataset. Current validation bounds include 5,000
records per normal collection, 100 plans, 20 import reviews, and 500 rows per
review. Exceeding a bound fails explicitly. Future growth needs a deliberate
schema/storage change rather than silent truncation.

Validation covers real dates and instants, timezones, record ID uniqueness, member
and occurrence references, availability patterns, explicit biweekly anchors,
workload shapes, recurrence shapes, basic placement/resolution consistency, and
one open completion-based occurrence per chore. Current records distinguish
occurrences, history, and provisional plan forecasts. These are persistence
constraints, not a replacement for the domain behavior document or future
scheduling/completion/edit commands. Those tasks will add their business guards
and may extend versioned records, including historical definition snapshots.

Known version-1 envelopes migrate transactionally from `currentMemberId` to
`profileId`. Version-2 envelopes are validated. Future database/schema versions,
invalid records, missing stores, failed upgrades, and blocked upgrades surface an
error without automatically deleting data. The version-1 fixture represents the
explicitly supported predecessor shape, not a claim that an earlier shipped app
already created that schema. Unknown legacy formats require a deliberate migration.

## Atomic saves, retry, and multiple tabs

Every command has a random operation ID, expected revision, timestamp, and typed
action batch. The adapter calculates a SHA-256 fingerprint of canonical command
JSON before starting the IndexedDB transaction, avoiding asynchronous work that
could let a transaction become inactive.

One read/write transaction checks the existing receipt and current state, applies
the entire batch, and saves state plus receipt. A save succeeds only after the
transaction completes. An abort, including a quota failure between the state and
receipt writes, rolls back both. Repeating the same operation/input returns its
original result without a second change; reusing its ID for different input fails.
Receipts retain fingerprints/revisions, not raw files or duplicated commands.
They are currently retained without automatic pruning so old retries stay safe;
a later retention policy must define the retry horizon first.

Expected-revision checks prevent stale writes across tabs. Two tabs writing the
same revision cannot both succeed. BroadcastChannel sends revision hints only;
consumers reload authoritative state. Focus refresh and four-second polling while
visible supply a fallback when notifications are unavailable. A replacement review
captures the revision it reviewed, so a later change forces a new review.

The page retains a failed command for retry when its outcome may be uncertain.
Validation and revision conflicts require correcting/reviewing the operation.
This deliberately favors visible conflicts over automatic merging of unrelated
edits. Current profile selection is household/browser state and is shared across
tabs for this origin; it is not a per-tab session or separate user account.

## Clock, fixtures, and local identity

Production uses the real current instant and derives calendar dates through
`Intl.DateTimeFormat` in the household's timezone. Clocks and ID sources are
injected; fixed clocks exist only in tests. Loading fixtures never changes today's
clock or silently simulates another date.

A new household has no members, chores, or invented accounts. Optional **Maple
Home — example** data is explicitly dated 3 November 2026 and includes Alex,
Jordan, and Sam. Sam's availability combines every Tuesday with every other
Friday anchored on **6 November 2026**. The fixture includes workload limits and
two chore definitions, without fabricated completions or a generated schedule.
Sam's existence as a member does not create application access.

Profile selection is only a local recording preference. History snapshots the
selected name/member and records `local-unverified` provenance; an unselected
profile is labeled This device. No password, token, provider account, or verified
identity is created. These local checks are not security controls.

## Backup, replacement, and transient data

Backups use a versioned `our-home-backup` JSON envelope with export time, dataset,
and profile. Export omits operation receipts and all temporary import reviews.
Restore validates the envelope, supported version, fields, dates, references,
and active selected profile before allowing a review. Known version-1 backups
use `currentMemberId`; unknown/future versions fail explicitly. Both import and
export enforce a 5 MiB limit so the app never produces an oversized backup it
would refuse to restore.

Restore, sample loading, and reset show current/incoming household names and
incoming member/chore/history counts. They require an explicit checkbox and
confirmation. Cancellation changes nothing. Review candidates are cloned and
kept in memory behind tokens, and confirmation still checks the reviewed local
revision. Restore advances the destination revision rather than adopting a
source revision. Reset removes household data and profile, while retaining the
revision/receipt mechanism. Reset is not a secure database erasure utility.

Original selected file bytes and generated message text have no persistent record
field. The backup file chooser clears its selection after reading; no file is
uploaded. Future chore-import reviews may persist only structured validated rows,
with an expiry of at most 24 hours. Expired reviews are hidden on read and pruned
on the next successful write; this is not a closed-browser background deletion
job. Import parsing and WhatsApp message generation remain their own future tasks.

A backup is an unencrypted manual snapshot, not synchronization or authentication.
It can contain household names, chore instructions, and local history. Backups
are deliberately excluded from source-control fixtures.

## Failure and temporary-mode behavior

Unavailable/denied storage, quota exhaustion, blocked upgrades, future versions,
corruption, stale revisions, and closed connections produce explicit application
faults. Existing storage is not reset automatically. Error actions offer retry
where appropriate, reconnect/reload, or explicitly chosen temporary memory.

Temporary memory starts separately, never silently copies over persistent data,
and remains available across in-app route changes in that tab. Reload or tab close
loses it. A visible banner explains this and recommends exporting a backup. Moving
back to persistent storage is explicit; it does not automatically merge temporary
changes. Browser data is scoped to its origin and browser profile: another device,
browser, port, or deployed host has separate records. Browser eviction or clearing
site data can remove records; manual backups remain necessary for recovery.

## Verification

Executed locally after the final changes:

- `npm run check`: passed ESLint, dependency boundaries, **74 unit/component tests**,
  strict application/domain type checks, and the static production build.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome npm run test:browser`:
  **16 tests passed**, across desktop and 360-pixel mobile production previews.
- `fake-indexeddb@6.2.7` was added as an exact development dependency for repeatable
  transaction/migration tests. No runtime database library was added. Installation
  reported zero audit vulnerabilities.

Shared adapter tests cover isolated reads, atomic rollback, duplicate retry,
operation-ID misuse, stale revisions, local actor provenance, review conflicts,
backup round trips, draft expiry/exclusion, invalid input, and closure. Additional
IndexedDB tests cover reopen persistence, competing connections, known migration,
future versions, corruption, blocked upgrades, version-change closure, and injected
quota rollback including retry. Clock tests cover timezone/DST calendar dates.

Real Chromium tests cover blank setup and reload, reviewed sample replacement,
profile persistence, accessibility/overflow, downloaded backup/reset/restore,
cross-tab refresh and stale confirmation, denied storage with explicit temporary
mode, and native migration/corruption recovery. Browser tests use isolated contexts
and synthetic data. The runner starts/stops its own static preview; no visible
in-app preview or hosted deployment was opened for this task. Verification does
not establish behavior in every browser or guarantee that the browser will never
evict local records.

## Remaining work and decisions

No unresolved product decision blocks DEV-51. The full responsive application
shell is DEV-47, followed by member/configuration/chore workflows and the scheduler.
Generic persistence ports do not mark those features complete. Authentication,
shared household access across devices, cloud storage, and closed-browser jobs
remain deferred backend work. Receipt retention, record limits, schema evolution,
and backup size are explicit technical choices to revisit when real usage requires
it. The original domain behavior remains authoritative for scheduling semantics.
