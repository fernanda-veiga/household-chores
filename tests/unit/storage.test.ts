import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openIndexedDb } from '../../src/adapters/browser/indexed-db';
import { createMemoryAdapter } from '../../src/adapters/browser/memory';
import { BrowserClock } from '../../src/adapters/browser/runtime';
import { emptyDataset } from '../../src/application/storage/commands';
import { storageFault } from '../../src/application/storage/errors';
import { exampleDataset, EXAMPLE_IDS } from '../../src/application/storage/fixtures';
import { emptySnapshot, validateDataset } from '../../src/application/storage/model';
import type { Action, Clock, HouseholdAdapter, IdSource } from '../../src/application/storage/port';
import { HouseholdService, parseBackup } from '../../src/application/storage/service';

class FixedClock extends BrowserClock {
  constructor(public instant = '2026-11-03T10:00:00Z') { super(); }
  override now() { return this.instant; }
}
const clock = () => new FixedClock();
const ids = (): IdSource => { let n = 0; return { next: () => `test-operation-${++n}` }; };
const adapters: HouseholdAdapter[] = [];
afterEach(() => { for (const adapter of adapters.splice(0)) adapter.close(); vi.restoreAllMocks(); });

async function setup(kind: 'persistent' | 'memory' = 'persistent', factory = new IDBFactory(), time = clock()) {
  const adapter = kind === 'persistent' ? await openIndexedDb(time, { factory, notifications: false }) : createMemoryAdapter(time);
  adapters.push(adapter);
  return { adapter, service: new HouseholdService(adapter, time, ids()), factory, time };
}
function rawDb(factory: IDBFactory, version?: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open('our-home-local', version);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function writeRaw(factory: IDBFactory, value: unknown) {
  const db = await rawDb(factory);
  try { await new Promise<void>((resolve, reject) => { const tx = db.transaction('state', 'readwrite'); tx.objectStore('state').put(value, 'current'); tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); }); }
  finally { db.close(); }
}
const sampleAction = (): Action => ({ type: 'initialize', dataset: exampleDataset() });

describe.each(['persistent', 'memory'] as const)('%s adapter contract', (kind) => {
  it('starts empty, atomically saves a household, and isolates returned objects', async () => {
    const { adapter, service } = await setup(kind);
    expect(await adapter.read()).toEqual(emptySnapshot());
    await service.commit(service.create(await service.read(), 'Maple', 'America/Recife'));
    const loaded = await service.read();
    expect(loaded.dataset?.household.name).toBe('Maple');
    expect(loaded.revision).toBe(1);
    loaded.dataset!.household.name = 'Mutated outside storage';
    expect((await service.read()).dataset?.household.name).toBe('Maple');
    expect(loaded.dataset?.members).toEqual([]);
  });
  it('replays a lost-response operation without a second revision and rejects reused input', async () => {
    const { service } = await setup(kind);
    const operation = service.operation(await service.read(), [sampleAction()]);
    expect(await service.commit(operation)).toEqual({ revision: 1, replayed: false });
    expect(await service.commit(operation)).toEqual({ revision: 1, replayed: true });
    expect((await service.read()).revision).toBe(1);
    await expect(service.commit({ ...operation, actions: [{ type: 'reset' }] })).rejects.toMatchObject({ code: 'OPERATION_REUSED' });
  });
  it('rejects a stale view instead of overwriting newer data', async () => {
    const { service } = await setup(kind);
    const original = await service.read();
    await service.commit(service.operation(original, [sampleAction()]));
    await expect(service.commit(service.operation(original, [{ type: 'reset' }]))).rejects.toMatchObject({ code: 'CONFLICT' });
    expect((await service.read()).dataset?.members).toHaveLength(3);
  });
  it('rolls back a batch if a later reference is invalid, including its operation receipt', async () => {
    const { service } = await setup(kind);
    await service.commit(service.operation(await service.read(), [sampleAction()]));
    const before = await service.read();
    const command = service.operation(before, [
      { type: 'put', collection: 'members', record: { id: 'new-person', name: 'New', archived: false } },
      { type: 'put', collection: 'chores', record: { ...exampleDataset().chores[0]!, id: 'bad-chore', assigneeId: 'not-a-member' } },
    ]);
    await expect(service.commit(command)).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(await service.read()).toEqual(before);
    const corrected = { ...command, actions: command.actions.slice(0, 1) };
    expect(await service.commit(corrected)).toEqual({ revision: 2, replayed: false });
  });
  it('preserves append-only local actor history without fabricated accounts', async () => {
    const { service } = await setup(kind);
    await service.commit(service.operation(await service.read(), [sampleAction()]));
    await service.commit(service.selectProfile(await service.read(), EXAMPLE_IDS.alex));
    await service.commit(service.operation(await service.read(), [{ type: 'put', collection: 'members', record: { id: 'new', name: 'Someone', archived: false } }]));
    const snapshot = await service.read();
    const entry = snapshot.dataset!.history.at(-1)!;
    expect(entry.actor).toEqual({ memberId: EXAMPLE_IDS.alex, name: 'Alex', provenance: 'local-unverified' });
    await expect(service.commit(service.operation(snapshot, [{ type: 'put', collection: 'history', record: { ...entry, summary: 'Rewritten history' } }]))).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(JSON.stringify(snapshot)).not.toMatch(/password|auth_user|access_token/);
  });
  it('requires confirmation and rejects a replacement reviewed before another change', async () => {
    const { service } = await setup(kind);
    const review = await service.review('example');
    expect(() => service.confirmReview(review.token, false)).toThrow();
    await service.commit(service.create(await service.read(), 'Personal', 'America/Recife'));
    await expect(service.commit(service.confirmReview(review.token, true))).rejects.toMatchObject({ code: 'CONFLICT' });
    expect((await service.read()).dataset?.household.name).toBe('Personal');
  });
  it('exports/restores validated snapshots without importing the source revision', async () => {
    const { service } = await setup(kind);
    const review = await service.review('example');
    await service.commit(service.confirmReview(review.token, true));
    await service.commit(service.selectProfile(await service.read(), EXAMPLE_IDS.sam));
    const backup = await service.exportBackup();
    const beforeRevision = (await service.read()).revision;
    const reset = await service.review('reset');
    await service.commit(service.confirmReview(reset.token, true));
    expect((await service.read()).dataset).toBeNull();
    const restore = await service.review('restore', backup);
    expect(restore.members).toBe(3);
    await service.commit(service.confirmReview(restore.token, true));
    expect((await service.read()).profileId).toBe(EXAMPLE_IDS.sam);
    expect((await service.read()).revision).toBe(beforeRevision + 2);
    expect(JSON.parse(backup)).not.toHaveProperty('receipts');
  });
  it('hides expired import reviews, excludes drafts from backups, and prunes on the next save', async () => {
    const { service, time } = await setup(kind);
    await service.commit(service.operation(await service.read(), [sampleAction()]));
    await service.commit(service.operation(await service.read(), [{ type: 'put', collection: 'imports', record: {
      id: 'review-only', createdAt: time.now(), expiresAt: '2026-11-03T11:00:00Z', rows: [],
    } }]));
    expect((await service.read()).dataset?.imports).toHaveLength(1);
    expect(JSON.parse(await service.exportBackup()).dataset.imports).toEqual([]);
    time.instant = '2026-11-03T11:00:00.000Z';
    expect((await service.read()).dataset?.imports).toEqual([]);
    await service.commit(service.selectProfile(await service.read(), EXAMPLE_IDS.alex));
    time.instant = '2026-11-03T10:00:00Z';
    expect((await service.read()).dataset?.imports).toEqual([]);
  });
  it('never stores a rejected future profile or temporary-file payload', async () => {
    const { service } = await setup(kind);
    await service.commit(service.operation(await service.read(), [sampleAction()]));
    const before = await service.read();
    await expect(service.commit(service.selectProfile(before, 'nonexistent'))).rejects.toMatchObject({ code: 'VALIDATION' });
    const invalid = { ...exampleDataset(), rawFile: 'private upload' };
    await expect(service.commit(service.operation(before, [{ type: 'replace', dataset: invalid, profileId: null }]))).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(await service.read()).toEqual(before);
  });
  it('exposes closure rather than pretending to save', async () => {
    const { service } = await setup(kind);
    service.close();
    await expect(service.read()).rejects.toMatchObject({ code: 'CLOSED' });
  });
});

describe('IndexedDB integrity and upgrades', () => {
  it('persists after the adapter connection is closed and reopened', async () => {
    const { service, factory } = await setup();
    await service.commit(service.create(await service.read(), 'Persistent', 'America/Recife'));
    service.close();
    const reopened = await setup('persistent', factory);
    expect((await reopened.service.read()).dataset?.household.name).toBe('Persistent');
  });
  it('serializes competing connections so only one same-revision command commits', async () => {
    const factory = new IDBFactory();
    const a = await setup('persistent', factory);
    const b = await setup('persistent', factory);
    const first = a.service.create(await a.service.read(), 'First', 'America/Recife');
    const second = { ...b.service.create(await b.service.read(), 'Second', 'America/Recife'), operationId: 'other-tab' };
    const results = await Promise.allSettled([a.service.commit(first), b.service.commit(second)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({ reason: { code: 'CONFLICT' } });
    expect((await a.service.read()).revision).toBe(1);
  });
  it('upgrades the supported version-1 envelope in an upgrade transaction', async () => {
    const factory = new IDBFactory();
    await new Promise<void>((resolve) => {
      const request = factory.open('our-home-local', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('state').put({ schemaVersion: 1, revision: 7, dataset: exampleDataset(), currentMemberId: EXAMPLE_IDS.alex }, 'current');
      request.onsuccess = () => { request.result.close(); resolve(); };
    });
    const { service } = await setup('persistent', factory);
    expect(await service.read()).toMatchObject({ schemaVersion: 2, revision: 7, profileId: EXAMPLE_IDS.alex });
    const raw = await rawDb(factory);
    expect(raw.version).toBe(2); expect(raw.objectStoreNames.contains('receipts')).toBe(true); raw.close();
  });
  it('reports future versions without deleting data', async () => {
    const factory = new IDBFactory();
    (await rawDb(factory, 3)).close();
    await expect(openIndexedDb(clock(), { factory })).rejects.toMatchObject({ code: 'UPGRADE_REQUIRED' });
    const unchanged = await rawDb(factory); expect(unchanged.version).toBe(3); unchanged.close();
  });
  it('reports blocked upgrades until the old connection closes', async () => {
    const factory = new IDBFactory();
    const old = await rawDb(factory, 1);
    await expect(openIndexedDb(clock(), { factory })).rejects.toMatchObject({ code: 'BLOCKED' });
    old.close();
  });
  it('reports corrupt data without silently replacing it', async () => {
    const { service, factory } = await setup();
    await writeRaw(factory, { schemaVersion: 2, revision: -3, dataset: { personal: 'still present' } });
    await expect(service.read()).rejects.toMatchObject({ code: 'CORRUPT' });
    await expect(service.read()).rejects.toMatchObject({ code: 'CORRUPT' });
  });
  it('aborts both state and receipt when a quota error occurs after the state put', async () => {
    const { service } = await setup();
    const command = service.create(await service.read(), 'Quota test', 'America/Recife');
    const original = IDBObjectStore.prototype.put;
    const spy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore['put']>) {
      if (this.name === 'receipts') throw new DOMException('quota', 'QuotaExceededError');
      return original.apply(this, args);
    });
    await expect(service.commit(command)).rejects.toMatchObject({ code: 'QUOTA' });
    spy.mockRestore();
    expect((await service.read()).revision).toBe(0);
    expect(await service.commit(command)).toEqual({ revision: 1, replayed: false });
  });
  it('maps permission failures and invalidates old connections during version changes', async () => {
    expect(storageFault(new DOMException('denied', 'SecurityError')).code).toBe('UNAVAILABLE');
    const { service, factory } = await setup();
    const newer = await rawDb(factory, 3); newer.close();
    await expect(service.read()).rejects.toMatchObject({ code: 'UPGRADE_REQUIRED' });
  });
});

describe('backup validation, fixtures, and clocks', () => {
  const backup = () => ({ format: 'our-home-backup', version: 2, exportedAt: '2026-11-03T10:00:00Z', dataset: exampleDataset(), profileId: null });
  it('keeps sample configuration deterministic without advancing the clock', () => {
    expect(exampleDataset()).toEqual(exampleDataset());
    expect(exampleDataset().availability.find((r) => r.pattern === 'biweekly')?.anchorDate).toBe('2026-11-06');
    expect(exampleDataset().members.map((m) => m.name)).toEqual(['Alex', 'Jordan', 'Sam']);
    expect(exampleDataset().occurrences).toEqual([]);
    expect(emptyDataset('local', 'Home', 'America/Recife', clock().now()).members).toEqual([]);
  });
  it('accepts a supported backup upgrade without accepting future formats', () => {
    const old = { format: 'our-home-backup', version: 1, exportedAt: backup().exportedAt, dataset: exampleDataset() };
    expect(parseBackup(JSON.stringify({ ...old, version: 1, currentMemberId: EXAMPLE_IDS.sam })).profileId).toBe(EXAMPLE_IDS.sam);
    expect(() => parseBackup(JSON.stringify({ ...backup(), version: 999 }))).toThrow();
  });
  it.each(['bad json', '[]', '{}', JSON.stringify({ ...backup(), password: 'must-not-be-accepted' }), JSON.stringify({ ...backup(), profileId: 'unknown' })])('rejects malformed/private/unmatched backup data', (text) => {
    expect(() => parseBackup(text)).toThrow();
  });
  it('rejects duplicate records, bad anchors, dangling references, and unsupported fields', () => {
    const data = exampleDataset();
    expect(() => validateDataset({ ...data, members: [...data.members, data.members[0]] })).toThrow();
    expect(() => validateDataset({ ...data, availability: data.availability.map((r) => r.pattern === 'biweekly' ? { ...r, anchorDate: '2026-11-05' } : r) })).toThrow();
    expect(() => validateDataset({ ...data, chores: data.chores.map((c) => ({ ...c, assigneeId: 'unknown' })) })).toThrow();
    expect(() => validateDataset({ ...data, messageBody: 'session only' })).toThrow();
  });
  it('derives local dates independently of the host timezone, including DST boundaries', () => {
    const fixed: Clock = new FixedClock('2026-11-03T01:00:00Z');
    expect(fixed.today('America/Recife')).toBe('2026-11-02');
    expect(fixed.today('Asia/Tokyo')).toBe('2026-11-03');
    const dst = new FixedClock('2026-03-08T07:30:00Z');
    expect(dst.today('America/New_York')).toBe('2026-03-08');
    expect(() => fixed.today('Invalid/Zone')).toThrow();
  });
});
