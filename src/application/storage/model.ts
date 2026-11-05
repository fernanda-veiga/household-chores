import { calendarDate } from '../../domain/calendar-date';
import { StorageFault } from './errors';

type Parser<T> = (input: unknown, path?: string) => T;
type Shape = Record<string, Parser<unknown>>;
function invalid(path = 'data'): never { throw new StorageFault('VALIDATION', `Invalid household data at ${path}.`); }
const string = (max = 10000, min = 0): Parser<string> => (v, p) => typeof v === 'string' && v.length >= min && v.length <= max ? v : invalid(p);
const text = string(120, 1);
const number = (min = 0, max = Number.MAX_SAFE_INTEGER): Parser<number> => (v, p) => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max ? v : invalid(p);
const bool: Parser<boolean> = (v, p) => typeof v === 'boolean' ? v : invalid(p);
const choice = <T extends string>(...values: T[]): Parser<T> => (v, p) => typeof v === 'string' && values.includes(v as T) ? v as T : invalid(p);
const nullable = <T>(parser: Parser<T>): Parser<T | null> => (v, p) => v === null ? null : parser(v, p);
const array = <T>(parser: Parser<T>, max = 5000): Parser<T[]> => (v, p) => Array.isArray(v) && v.length <= max ? v.map((item, i) => parser(item, `${p ?? 'data'}[${i}]`)) : invalid(p);
const object = <S extends Shape>(shape: S): Parser<{ [K in keyof S]: ReturnType<S[K]> }> => (v, p = 'data') => {
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some((key) => !Object.hasOwn(shape, key))) invalid(p);
  const result: Record<string, unknown> = {};
  for (const [key, parser] of Object.entries(shape)) result[key] = parser((v as Record<string, unknown>)[key], `${p}.${key}`);
  return result as { [K in keyof S]: ReturnType<S[K]> };
};
const date: Parser<string> = (v, p) => { try { return calendarDate(text(v, p)); } catch { return invalid(p); } };
export const instant: Parser<string> = (v, p) => {
  const value = text(v, p);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) invalid(p);
  try { calendarDate(value.slice(0, 10)); } catch { invalid(p); }
  if (new Date(value).toISOString().slice(0, 19) !== value.slice(0, 19)) invalid(p);
  return value;
};
const weekdays = array(number(1, 7), 7);
const priority = choice('high', 'normal', 'low');
const actor = object({ memberId: nullable(text), name: text, provenance: choice('local-unverified') });

export const memberParser = object({ id: text, name: text, archived: bool });
export const availabilityParser = object({ id: text, memberId: text, pattern: choice('weekly', 'biweekly', 'monthly_date', 'monthly_weekday'), weekdays, anchorDate: nullable(date), dayOfMonth: nullable(number(1, 31)), ordinal: nullable(number(-1, 5)), effectiveFrom: date, effectiveUntil: nullable(date) });
export const exceptionParser = object({ id: text, memberId: text, date, available: bool, minutesOverride: nullable(number()), reason: string(1000) });
export const workloadParser = object({ id: text, memberId: text, dailyMinutes: array(number(), 7), weeklyMinutes: number(), effectiveFrom: date, effectiveUntil: nullable(date) });
export const choreParser = object({ id: text, name: string(200, 1), instructions: string(), assigneeId: text, priority, estimatedMinutes: number(1), recurrence: object({ kind: choice('completion_based', 'fixed'), intervalDays: nullable(number(1)), weekdays }), initialTargetDate: nullable(date), allowedWeekdays: nullable(weekdays), lifecycle: choice('active', 'paused', 'archived'), revision: number(1) });
export const occurrenceParser = object({ id: text, choreId: text, assigneeId: text, targetDate: date, scheduledDate: nullable(date), status: choice('open', 'completed', 'skipped', 'cancelled'), placement: choice('scheduled', 'unplaced', 'held'), estimatedMinutes: number(1), priority, seriesId: text, generationKey: text, parentId: nullable(text), definitionRevision: number(1), activeResolutionId: nullable(text), conflicts: array(string(200), 20) });
export const historyParser = object({ id: text, kind: choice('local-change', 'completion', 'skip', 'undo', 'schedule-change'), at: instant, actor, occurrenceId: nullable(text), performerId: nullable(text), performedDate: nullable(date), minutes: nullable(number(1)), summary: string(1000, 1) });
const rowParser = object({ rowNumber: number(1, 500), fields: object({ name: string(), member: string(), priority: string(), estimated_minutes: string(), recurrence_type: string(), interval_days: string(), initial_target_date: string(), fixed_weekdays: string(), instructions: string(), allowed_weekdays: string() }), selected: bool, errors: array(string(500), 20), duplicateAcknowledged: bool });
export const importParser = object({ id: text, createdAt: instant, expiresAt: instant, rows: array(rowParser, 500) });
export const planParser = object({ id: text, version: number(), sourceRevision: number(), status: choice('pending', 'current', 'failed'), generatedAt: nullable(instant), forecasts: array(object({ id: text, sourceOccurrenceId: text, memberId: text, date, estimatedMinutes: number(1) })) });

export const recordParsers = { members: memberParser, availability: availabilityParser, exceptions: exceptionParser, workloads: workloadParser, chores: choreParser, occurrences: occurrenceParser, history: historyParser, imports: importParser, plans: planParser };
export type Records = { [K in keyof typeof recordParsers]: ReturnType<(typeof recordParsers)[K]> };
export type Collection = keyof Records;
export type Member = Records['members'];
export type HistoryEntry = Records['history'];
const datasetParser = object({
  household: object({ id: text, name: text, timezone: text, weekStart: number(1, 7), createdAt: instant, source: choice('personal', 'example') }),
  members: array(memberParser), availability: array(availabilityParser), exceptions: array(exceptionParser), workloads: array(workloadParser), chores: array(choreParser), occurrences: array(occurrenceParser), history: array(historyParser), imports: array(importParser, 20), plans: array(planParser, 100),
});
export type Dataset = ReturnType<typeof datasetParser>;
export interface Snapshot { schemaVersion: 2; revision: number; dataset: Dataset | null; profileId: string | null }
export const emptySnapshot = (): Snapshot => ({ schemaVersion: 2, revision: 0, dataset: null, profileId: null });

export function validateDataset(value: unknown): Dataset {
  const data = datasetParser(value);
  try { new Intl.DateTimeFormat('en', { timeZone: data.household.timezone }).format(0); } catch { invalid('household.timezone'); }
  const ids = Object.fromEntries(Object.entries(recordParsers).map(([key]) => {
    const records = data[key as Collection];
    const set = new Set(records.map((r) => r.id));
    if (set.size !== records.length) invalid(`${key}.duplicateId`);
    return [key, set];
  })) as Record<Collection, Set<string>>;
  const ref = (key: Collection, id: string | null) => { if (id !== null && !ids[key].has(id)) invalid(`${key}.reference`); };
  for (const group of [data.availability, data.exceptions, data.workloads]) for (const r of group) ref('members', r.memberId);
  for (const rule of data.availability) {
    if (new Set(rule.weekdays).size !== rule.weekdays.length || (rule.effectiveUntil && rule.effectiveUntil < rule.effectiveFrom)) invalid('availability.range');
    if (rule.pattern === 'weekly' && (!rule.weekdays.length || rule.anchorDate || rule.dayOfMonth || rule.ordinal !== null)) invalid('availability.weekly');
    if (rule.pattern === 'biweekly') {
      if (rule.weekdays.length !== 1 || !rule.anchorDate || rule.dayOfMonth || rule.ordinal !== null) invalid('availability.biweekly');
      const isoDay = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${rule.anchorDate}T12:00:00Z`));
      if (['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(isoDay) + 1 !== rule.weekdays[0]) invalid('availability.anchorDate');
    }
    if (rule.pattern === 'monthly_date' && (!rule.dayOfMonth || rule.weekdays.length || rule.anchorDate || rule.ordinal !== null)) invalid('availability.monthlyDate');
    if (rule.pattern === 'monthly_weekday' && (rule.weekdays.length !== 1 || ![-1, 1, 2, 3, 4, 5].includes(rule.ordinal ?? 0) || rule.dayOfMonth || rule.anchorDate)) invalid('availability.monthlyWeekday');
  }
  for (const w of data.workloads) if (w.dailyMinutes.length !== 7 || (w.effectiveUntil && w.effectiveUntil < w.effectiveFrom)) invalid('workloads.range');
  const uniqueDates = new Set<string>();
  for (const e of data.exceptions) {
    const key = `${e.memberId}:${e.date}`;
    if (uniqueDates.has(key) || (!e.available && e.minutesOverride !== null)) invalid('exceptions.date');
    uniqueDates.add(key);
  }
  for (const c of data.chores) {
    ref('members', c.assigneeId);
    if (new Set(c.recurrence.weekdays).size !== c.recurrence.weekdays.length || (c.allowedWeekdays && (!c.allowedWeekdays.length || new Set(c.allowedWeekdays).size !== c.allowedWeekdays.length))) invalid('chores.weekdays');
    if (c.recurrence.kind === 'completion_based' ? (!c.recurrence.intervalDays || !c.initialTargetDate || c.recurrence.weekdays.length) : (c.recurrence.intervalDays !== null || c.initialTargetDate !== null || !c.recurrence.weekdays.length)) invalid('chores.recurrence');
  }
  const openChores = new Set<string>();
  for (const o of data.occurrences) {
    ref('chores', o.choreId); ref('members', o.assigneeId); ref('occurrences', o.parentId); ref('history', o.activeResolutionId);
    const c = data.chores.find((c) => c.id === o.choreId)!;
    if ((o.placement === 'scheduled') !== (o.scheduledDate !== null) || (o.status !== 'open' && o.placement !== 'unplaced') || (o.scheduledDate && (o.scheduledDate < o.targetDate || (c.recurrence.kind === 'fixed' && o.scheduledDate !== o.targetDate)))) invalid('occurrences.placement');
    if ((o.status === 'completed' || o.status === 'skipped') !== (o.activeResolutionId !== null)) invalid('occurrences.resolution');
    if (o.status === 'open' && c.recurrence.kind === 'completion_based') { if (openChores.has(c.id)) invalid('occurrences.duplicateOpen'); openChores.add(c.id); }
  }
  for (const h of data.history) { ref('members', h.actor.memberId); ref('members', h.performerId); ref('occurrences', h.occurrenceId); }
  for (const draft of data.imports) if (Date.parse(draft.expiresAt) <= Date.parse(draft.createdAt) || Date.parse(draft.expiresAt) - Date.parse(draft.createdAt) > 86400000 || new Set(draft.rows.map((r) => r.rowNumber)).size !== draft.rows.length) invalid('imports.expiration');
  for (const plan of data.plans) for (const f of plan.forecasts) { ref('members', f.memberId); ref('occurrences', f.sourceOccurrenceId); }
  return data;
}

export function validateSnapshot(value: unknown): Snapshot {
  const raw = object({ schemaVersion: number(2, 2), revision: number(), dataset: nullable((v) => validateDataset(v)), profileId: nullable(text) })(value);
  if (raw.profileId && !raw.dataset?.members.some((m) => m.id === raw.profileId && !m.archived)) invalid('profileId');
  return { ...raw, schemaVersion: 2 };
}

export function migrateSnapshot(value: unknown): Snapshot {
  if (!value || typeof value !== 'object') throw new StorageFault('CORRUPT', 'Saved household data cannot be read. It has not been reset.');
  const record = value as Record<string, unknown>;
  if (typeof record.schemaVersion === 'number' && record.schemaVersion > 2) throw new StorageFault('UPGRADE_REQUIRED', 'Update the app to read this newer data format.');
  try {
    if (record.schemaVersion === 1) {
      const { currentMemberId, ...rest } = record;
      return validateSnapshot({ ...rest, schemaVersion: 2, profileId: currentMemberId ?? null });
    }
    return validateSnapshot(value);
  } catch (error) {
    if (error instanceof StorageFault && error.code === 'UPGRADE_REQUIRED') throw error;
    throw new StorageFault('CORRUPT', 'Saved household data is invalid. It has not been reset; export or recover the original data before replacing it.');
  }
}
