import type { Collection, Dataset, Records, Snapshot } from './model';

export interface Clock { now(): string; today(timezone: string): string }
export interface IdSource { next(): string }
export type PutAction = { [K in Collection]: { type: 'put'; collection: K; record: Records[K] } }[Collection];
export type Action = PutAction | { type: 'initialize'; dataset: Dataset } | { type: 'replace'; dataset: Dataset; profileId: string | null } | { type: 'reset' } | { type: 'profile'; memberId: string | null } | { type: 'remove-import'; id: string };
export interface Command { operationId: string; expectedRevision: number; at: string; actions: Action[] }
export interface CommitResult { revision: number; replayed: boolean }
export interface Receipt { fingerprint: string; revision: number }
export interface StorageRuntime {
  connect(): Promise<import('./service').HouseholdService>;
  reconnect(): Promise<import('./service').HouseholdService>;
  useTemporary(): Promise<import('./service').HouseholdService>;
}
export interface HouseholdAdapter {
  readonly mode: 'persistent' | 'memory';
  read(): Promise<Snapshot>;
  commit(command: Command): Promise<CommitResult>;
  subscribe(listener: () => void): () => void;
  close(): void;
}

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
