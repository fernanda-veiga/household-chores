# Application boundary

UI components call the typed operations in `storage/`. `HouseholdService` manages
operation identities and reviewed backup/replacement workflows. `HouseholdAdapter`
is the replaceable read/commit/subscription contract; commands batch typed changes
and enforce a revision check. IndexedDB and temporary memory implement it.

`model.ts` validates persisted records and reference integrity. `commands.ts`
applies complete batches before validation, appends local provenance, and expires
import reviews. Feature-specific scheduling/edit policies remain future tasks;
these generic persistence operations are not the scheduling engine.

Clock and ID sources are injected. Pure recurrence, dates, and capacity rules
belong in `../domain`, without React, network clients, or browser storage.
Production composition is in `../storage-runtime.ts`; UI does not import adapters.
