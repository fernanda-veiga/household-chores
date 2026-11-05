import { applyCommand, validateCommand, visibleSnapshot } from '../../application/storage/commands';
import { StorageFault, storageFault } from '../../application/storage/errors';
import { emptySnapshot, migrateSnapshot, type Snapshot } from '../../application/storage/model';
import { canonical, type Clock, type Command, type CommitResult, type HouseholdAdapter, type Receipt } from '../../application/storage/port';
import { digest } from './runtime';

export const DATABASE_NAME = 'our-home-local';
export const DATABASE_VERSION = 2;

export async function openIndexedDb(clock: Clock, options: { name?: string; factory?: IDBFactory; notifications?: boolean } = {}): Promise<HouseholdAdapter> {
  const factory = options.factory ?? globalThis.indexedDB;
  if (!factory) throw new StorageFault('UNAVAILABLE', 'This browser cannot open local storage. You can explicitly choose temporary mode.');
  const name = options.name ?? DATABASE_NAME;
  return new Promise((resolve, reject) => {
    let rejected = false;
    let upgradeError: unknown;
    const request = factory.open(name, DATABASE_VERSION);
    request.onblocked = () => { rejected = true; reject(new StorageFault('BLOCKED', 'Close other Our Home tabs so the local data format can be upgraded, then retry.')); };
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const transaction = request.transaction!;
      if (event.oldVersion > 0 && !db.objectStoreNames.contains('state')) {
        upgradeError = new StorageFault('CORRUPT', 'The older database is missing household records. It has not been reset.');
        transaction.abort(); return;
      }
      if (event.oldVersion === 0) {
        db.createObjectStore('state').put(emptySnapshot(), 'current');
      }
      if (!db.objectStoreNames.contains('receipts')) db.createObjectStore('receipts');
      if (event.oldVersion > 0) {
        const read = transaction.objectStore('state').get('current');
        read.onsuccess = () => {
          try { transaction.objectStore('state').put(migrateSnapshot(read.result), 'current'); }
          catch (error) { upgradeError = error; transaction.abort(); }
        };
      }
    };
    request.onerror = () => { rejected = true; reject(upgradeError ?? storageFault(request.error)); };
    request.onsuccess = () => {
      const db = request.result;
      if (rejected) { db.close(); return; }
      const listeners = new Set<() => void>();
      let closed = false;
      let upgradeRequired = false;
      let channel: BroadcastChannel | undefined;
      const notify = () => { for (const listener of listeners) { try { listener(); } catch { /* One subscriber cannot invalidate a committed save. */ } } };
      if (options.notifications !== false && typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
        try { channel = new BroadcastChannel(`${name}:revisions`); channel.onmessage = () => notify(); } catch { /* Focus/read revision checks remain authoritative. */ }
      }
      db.onversionchange = () => { upgradeRequired = true; closed = true; db.close(); channel?.close(); notify(); };
      const ensureOpen = () => { if (closed) throw new StorageFault(upgradeRequired ? 'UPGRADE_REQUIRED' : 'CLOSED', 'Local storage was closed. Reload or reconnect before saving.'); };
      const adapter: HouseholdAdapter = {
        mode: 'persistent',
        read() {
          return new Promise((accept, fail) => {
            try {
              ensureOpen();
              const transaction = db.transaction('state', 'readonly');
              const read = transaction.objectStore('state').get('current');
              let result: Snapshot;
              let error: unknown;
              read.onsuccess = () => { try { result = visibleSnapshot(migrateSnapshot(read.result), clock.now()); } catch (e) { error = e; transaction.abort(); } };
              transaction.oncomplete = () => accept(result);
              transaction.onabort = () => fail(storageFault(error ?? transaction.error));
            } catch (error) { fail(storageFault(error)); }
          });
        },
        async commit(input) {
          const command: Command = structuredClone(input);
          validateCommand(command);
          // Never await crypto or application work inside an IndexedDB transaction.
          const fingerprint = await digest(canonical(command));
          return new Promise((accept, fail) => {
            try {
              ensureOpen();
              const transaction = db.transaction(['state', 'receipts'], 'readwrite');
              const states = transaction.objectStore('state');
              const receipts = transaction.objectStore('receipts');
              const readState = states.get('current');
              const readReceipt = receipts.get(command.operationId);
              let stateReady = false; let receiptReady = false;
              let result: CommitResult;
              let failure: unknown;
              const apply = () => {
                if (!stateReady || !receiptReady) return;
                try {
                  const state = migrateSnapshot(readState.result);
                  const receipt = readReceipt.result as Receipt | undefined;
                  if (receipt) {
                    if (receipt.fingerprint !== fingerprint) throw new StorageFault('OPERATION_REUSED', 'This operation identity was used for different input. Review before starting a new action.');
                    if (!Number.isSafeInteger(receipt.revision) || receipt.revision < 1 || receipt.revision > state.revision) throw new StorageFault('CORRUPT', 'A saved operation receipt is invalid.');
                    result = { revision: receipt.revision, replayed: true };
                  } else {
                    const next = applyCommand(state, command);
                    states.put(next, 'current');
                    receipts.put({ fingerprint, revision: next.revision } satisfies Receipt, command.operationId);
                    result = { revision: next.revision, replayed: false };
                  }
                } catch (error) { failure = error; transaction.abort(); }
              };
              readState.onsuccess = () => { stateReady = true; apply(); };
              readReceipt.onsuccess = () => { receiptReady = true; apply(); };
              transaction.oncomplete = () => {
                if (!result.replayed) { notify(); try { channel?.postMessage({ revision: result.revision }); } catch { /* Save already committed; notification is best-effort. */ } }
                accept(result);
              };
              transaction.onabort = () => fail(storageFault(failure ?? transaction.error));
            } catch (error) { fail(storageFault(error)); }
          });
        },
        subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
        close() { closed = true; channel?.close(); db.close(); listeners.clear(); },
      };
      resolve(adapter);
    };
  });
}
