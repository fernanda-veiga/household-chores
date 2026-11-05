export type FaultCode = 'VALIDATION' | 'UNAVAILABLE' | 'QUOTA' | 'BLOCKED' | 'UPGRADE_REQUIRED' | 'CORRUPT' | 'CONFLICT' | 'OPERATION_REUSED' | 'CLOSED';

export class StorageFault extends Error {
  constructor(readonly code: FaultCode, message: string) { super(message); this.name = 'StorageFault'; }
}

export function storageFault(error: unknown): StorageFault {
  if (error instanceof StorageFault) return error;
  const name = error !== null && typeof error === 'object' && 'name' in error ? error.name : '';
  if (name === 'QuotaExceededError') return new StorageFault('QUOTA', 'Browser storage is full. Export a backup before freeing space, then retry.');
  if (name === 'VersionError') return new StorageFault('UPGRADE_REQUIRED', 'This data was opened by a newer app version. Update the app; the saved data has not been removed.');
  return new StorageFault('UNAVAILABLE', 'Browser storage could not complete this action. No successful save is claimed.');
}
