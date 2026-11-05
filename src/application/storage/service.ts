import { emptyDataset } from './commands';
import { StorageFault } from './errors';
import { exampleDataset } from './fixtures';
import { instant, validateDataset, type Dataset, type Snapshot } from './model';
import type { Action, Clock, Command, HouseholdAdapter, IdSource } from './port';

const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export interface Review { token: string; expectedRevision: number; action: 'restore' | 'reset' | 'example'; currentName: string; incomingName: string; members: number; chores: number; history: number }
interface Candidate { review: Review; action: Action }

export function parseBackup(text: string): { dataset: Dataset; profileId: string | null } {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) throw new StorageFault('VALIDATION', 'Backup exceeds the 5 MiB limit.');
  let raw: Record<string, unknown>;
  try { const value: unknown = JSON.parse(text); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); raw = value as Record<string, unknown>; }
  catch { throw new StorageFault('VALIDATION', 'Choose a valid Our Home JSON backup.'); }
  if (raw.format !== 'our-home-backup' || ![1, 2].includes(raw.version as number)) throw new StorageFault('VALIDATION', 'This backup format/version is not supported.');
  const allowed = ['format', 'version', 'exportedAt', 'dataset', raw.version === 1 ? 'currentMemberId' : 'profileId'];
  if (Object.keys(raw).some((key) => !allowed.includes(key))) throw new StorageFault('VALIDATION', 'Backup has unexpected fields.');
  instant(raw.exportedAt);
  const dataset = validateDataset(raw.dataset);
  if (dataset.imports.length) throw new StorageFault('VALIDATION', 'Backups must not contain temporary file-import drafts.');
  const profileId = raw.version === 1 ? raw.currentMemberId : raw.profileId;
  if (profileId !== null && (typeof profileId !== 'string' || !dataset.members.some((m) => m.id === profileId && !m.archived))) throw new StorageFault('VALIDATION', 'Backup profile does not match an active member.');
  return { dataset, profileId: profileId as string | null };
}

export class HouseholdService {
  readonly #reviews = new Map<string, Candidate>();
  constructor(readonly adapter: HouseholdAdapter, readonly clock: Clock, readonly ids: IdSource) {}
  get mode() { return this.adapter.mode; }
  read() { return this.adapter.read(); }
  subscribe(listener: () => void) { return this.adapter.subscribe(listener); }
  operation(snapshot: Snapshot, actions: Action[]): Command { return { operationId: this.ids.next(), expectedRevision: snapshot.revision, at: this.clock.now(), actions: structuredClone(actions) }; }
  commit(command: Command) { return this.adapter.commit(command); }
  create(snapshot: Snapshot, name: string, timezone: string) { return this.operation(snapshot, [{ type: 'initialize', dataset: emptyDataset(this.ids.next(), name, timezone, this.clock.now()) }]); }
  selectProfile(snapshot: Snapshot, memberId: string | null) { return this.operation(snapshot, [{ type: 'profile', memberId }]); }
  async exportBackup(): Promise<string> {
    const snapshot = await this.read();
    if (!snapshot.dataset) throw new StorageFault('VALIDATION', 'Create a household before exporting a backup.');
    const dataset = structuredClone(snapshot.dataset);
    dataset.imports = [];
    const text = JSON.stringify({ format: 'our-home-backup', version: 2, exportedAt: this.clock.now(), dataset, profileId: snapshot.profileId }, null, 2);
    if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) throw new StorageFault('VALIDATION', 'This household exceeds the 5 MiB backup limit. No incomplete backup was produced.');
    return text;
  }
  async review(action: Review['action'], text?: string): Promise<Review> {
    const snapshot = await this.read();
    const incoming = action === 'restore' ? parseBackup(text ?? '') : action === 'example' ? { dataset: exampleDataset(), profileId: null } : null;
    const review: Review = { token: this.ids.next(), expectedRevision: snapshot.revision, action, currentName: snapshot.dataset?.household.name ?? 'No household', incomingName: incoming?.dataset.household.name ?? 'No household', members: incoming?.dataset.members.length ?? 0, chores: incoming?.dataset.chores.length ?? 0, history: incoming?.dataset.history.length ?? 0 };
    this.#reviews.set(review.token, { review: structuredClone(review), action: incoming ? { type: 'replace', ...incoming } : { type: 'reset' } });
    return review;
  }
  confirmReview(token: string, confirmed: boolean): Command {
    const candidate = this.#reviews.get(token);
    if (!candidate || !confirmed) throw new StorageFault('VALIDATION', 'Review and explicitly confirm this replacement first.');
    const command: Command = { operationId: this.ids.next(), expectedRevision: candidate.review.expectedRevision, at: this.clock.now(), actions: [structuredClone(candidate.action)] };
    this.#reviews.delete(token);
    return command;
  }
  cancelReview(token: string) { this.#reviews.delete(token); }
  close() { this.#reviews.clear(); this.adapter.close(); }
}
