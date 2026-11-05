import { validateDataset, type Dataset } from './model';

export const EXAMPLE_IDS = { household: '11111111-1111-4111-8111-111111111111', alex: '22222222-2222-4222-8222-222222222222', jordan: '33333333-3333-4333-8333-333333333333', sam: '44444444-4444-4444-8444-444444444444' };

export function exampleDataset(): Dataset {
  const { household, alex, jordan, sam } = EXAMPLE_IDS;
  return validateDataset({
    household: { id: household, name: 'Maple Home — example', timezone: 'America/Recife', weekStart: 1, createdAt: '2026-11-03T10:00:00Z', source: 'example' },
    members: [{ id: alex, name: 'Alex', archived: false }, { id: jordan, name: 'Jordan', archived: false }, { id: sam, name: 'Sam', archived: false }],
    availability: [
      { id: 'sam-tuesday', memberId: sam, pattern: 'weekly', weekdays: [2], anchorDate: null, dayOfMonth: null, ordinal: null, effectiveFrom: '2026-11-03', effectiveUntil: null },
      { id: 'sam-friday', memberId: sam, pattern: 'biweekly', weekdays: [5], anchorDate: '2026-11-06', dayOfMonth: null, ordinal: null, effectiveFrom: '2026-11-03', effectiveUntil: null },
    ],
    exceptions: [],
    workloads: [{ id: 'sam-limits', memberId: sam, dailyMinutes: [0, 180, 0, 0, 180, 0, 0], weeklyMinutes: 300, effectiveFrom: '2026-11-03', effectiveUntil: null }],
    chores: [
      { id: 'bathroom', name: 'Clean bathroom', instructions: 'Clean mirrors, sink, shower, and toilet.', assigneeId: sam, priority: 'high', estimatedMinutes: 45, recurrence: { kind: 'completion_based', intervalDays: 7, weekdays: [] }, initialTargetDate: '2026-11-03', allowedWeekdays: null, lifecycle: 'active', revision: 1 },
      { id: 'plants', name: 'Water plants', instructions: 'Check the soil first.', assigneeId: alex, priority: 'normal', estimatedMinutes: 15, recurrence: { kind: 'fixed', intervalDays: null, weekdays: [2] }, initialTargetDate: null, allowedWeekdays: null, lifecycle: 'active', revision: 1 },
    ],
    occurrences: [], history: [], imports: [], plans: [],
  });
}
