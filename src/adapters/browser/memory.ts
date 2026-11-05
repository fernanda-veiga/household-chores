import { applyCommand, visibleSnapshot } from '../../application/storage/commands';
import { StorageFault } from '../../application/storage/errors';
import { emptySnapshot } from '../../application/storage/model';
import { canonical, type Clock, type Command, type HouseholdAdapter, type Receipt } from '../../application/storage/port';
import { digest } from './runtime';

/** Explicit per-tab temporary session. Never overwrites an inaccessible database. */
export function createMemoryAdapter(clock: Clock): HouseholdAdapter {
  let snapshot = emptySnapshot();
  let closed = false;
  const receipts = new Map<string, Receipt>();
  const listeners = new Set<() => void>();
  return {
    mode: 'memory',
    async read() { if (closed) throw new StorageFault('CLOSED', 'Temporary session was closed.'); return visibleSnapshot(snapshot, clock.now()); },
    async commit(input) {
      const command: Command = structuredClone(input);
      const fingerprint = await digest(canonical(command));
      if (closed) throw new StorageFault('CLOSED', 'Temporary session was closed.');
      const receipt = receipts.get(command.operationId);
      if (receipt) {
        if (receipt.fingerprint !== fingerprint) throw new StorageFault('OPERATION_REUSED', 'Operation identity already used for different input.');
        return { revision: receipt.revision, replayed: true };
      }
      const next = applyCommand(snapshot, command);
      snapshot = next;
      receipts.set(command.operationId, { fingerprint, revision: next.revision });
      for (const listener of listeners) { try { listener(); } catch { /* A listener does not undo a save. */ } }
      return { revision: next.revision, replayed: false };
    },
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    close() { closed = true; listeners.clear(); },
  };
}
