# Browser adapter boundary

`indexed-db.ts` persists one versioned household snapshot and operation receipts
in IndexedDB. State and receipts commit in one read/write transaction; a save is
acknowledged only after transaction completion. Expected revisions prevent stale
writes. Matching operation IDs/fingerprints replay the saved result safely.

BroadcastChannel carries revision hints only. Consumers reload authoritative
state; focus/visible-page polling supplies a notification fallback. Blocked
upgrades, unavailable storage, quota errors, future versions, and corrupt records
are surfaced without automatic reset.

`memory.ts` implements the same contract for an explicitly chosen, isolated,
temporary tab session. It does not write over persistent data. `runtime.ts`
provides the real household-timezone clock, random IDs, and hashing.

Only adapters access browser database APIs. Application ports remain independent
of IndexedDB and the UI receives services through the composition root. A later
remote adapter must add server authorization and concurrency guarantees; local
profile selection and browser checks provide neither.
