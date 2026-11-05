import { HouseholdService } from './application/storage/service';
import type { StorageRuntime } from './application/storage/port';
import { openIndexedDb } from './adapters/browser/indexed-db';
import { createMemoryAdapter } from './adapters/browser/memory';
import { BrowserClock, browserIds } from './adapters/browser/runtime';

export function createStorageRuntime(): StorageRuntime {
  const clock = new BrowserClock();
  let session: Promise<HouseholdService> | undefined;
  const close = () => { if (session) void session.then((s) => s.close()).catch(() => undefined); session = undefined; };
  return {
    connect() { return session ??= openIndexedDb(clock).then((adapter) => new HouseholdService(adapter, clock, browserIds)); },
    reconnect() { close(); return this.connect(); },
    useTemporary() { close(); session = Promise.resolve(new HouseholdService(createMemoryAdapter(clock), clock, browserIds)); return session; },
  };
}
