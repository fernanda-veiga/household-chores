import { StorageFault } from './errors';
import { instant, validateDataset, validateSnapshot, type Dataset, type Snapshot } from './model';
import { canonical, type Command } from './port';

export function validateCommand(command: Command): void {
  if (!command || typeof command.operationId !== 'string' || !command.operationId || command.operationId.length > 120 || !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 0 || !Array.isArray(command.actions) || !command.actions.length || command.actions.length > 1000) throw new StorageFault('VALIDATION', 'Invalid operation identity, revision, or action count.');
  for (const action of command.actions) {
    if (!action || !['initialize', 'replace', 'reset', 'profile', 'put', 'remove-import'].includes(action.type)) throw new StorageFault('VALIDATION', 'Invalid local operation type.');
    if (action.type === 'put' && !['members', 'availability', 'exceptions', 'workloads', 'chores', 'occurrences', 'history', 'imports', 'plans'].includes(action.collection)) throw new StorageFault('VALIDATION', 'Invalid local record collection.');
  }
  instant(command.at);
}

export function applyCommand(snapshot: Snapshot, command: Command): Snapshot {
  validateCommand(command);
  if (snapshot.revision !== command.expectedRevision) throw new StorageFault('CONFLICT', 'This household changed in another view. Reload and review before saving.');
  const next: Snapshot = structuredClone(snapshot);
  for (const action of command.actions) {
    if (action.type === 'initialize') {
      if (next.dataset) throw new StorageFault('CONFLICT', 'A household already exists. Review replacement before continuing.');
      next.dataset = validateDataset(action.dataset); next.profileId = null;
    } else if (action.type === 'replace') {
      next.dataset = validateDataset(action.dataset); next.profileId = action.profileId;
    } else if (action.type === 'reset') {
      next.dataset = null; next.profileId = null;
    } else if (action.type === 'profile') {
      next.profileId = action.memberId;
    } else {
      if (!next.dataset) throw new StorageFault('VALIDATION', 'Create a local household first.');
      if (action.type === 'remove-import') next.dataset.imports = next.dataset.imports.filter((d) => d.id !== action.id);
      else {
        const rows = next.dataset[action.collection] as Array<{ id: string }>;
        const index = rows.findIndex((r) => r.id === action.record.id);
        if (action.collection === 'history' && index >= 0 && canonical(rows[index]) !== canonical(action.record)) throw new StorageFault('VALIDATION', 'Recorded history is append-only.');
        if (index >= 0) rows[index] = structuredClone(action.record); else rows.push(structuredClone(action.record));
      }
    }
  }
  if (next.dataset) {
    next.dataset.imports = next.dataset.imports.filter((draft) => Date.parse(draft.expiresAt) > Date.parse(command.at));
    const profile = snapshot.dataset?.members.find((m) => m.id === snapshot.profileId);
    // Replacement/reset are explicit dataset operations; do not carry actors from another dataset.
    if (!command.actions.some((a) => a.type === 'replace' || a.type === 'reset')) {
      next.dataset.history.push({ id: command.operationId, kind: 'local-change', at: command.at, actor: { memberId: profile?.id ?? null, name: profile?.name ?? 'This device', provenance: 'local-unverified' }, occurrenceId: null, performerId: null, performedDate: null, minutes: null, summary: command.actions.map((a) => a.type === 'put' ? `Updated ${a.collection}` : a.type).join('; ') });
    }
  }
  next.revision += 1;
  return validateSnapshot(next);
}

export function visibleSnapshot(snapshot: Snapshot, at: string): Snapshot {
  const copy = structuredClone(snapshot);
  if (copy.dataset) copy.dataset.imports = copy.dataset.imports.filter((draft) => Date.parse(draft.expiresAt) > Date.parse(at));
  return copy;
}

export function emptyDataset(id: string, name: string, timezone: string, at: string): Dataset {
  return validateDataset({ household: { id, name: name.trim(), timezone, weekStart: 1, createdAt: at, source: 'personal' }, members: [], availability: [], exceptions: [], workloads: [], chores: [], occurrences: [], history: [], imports: [], plans: [] });
}
