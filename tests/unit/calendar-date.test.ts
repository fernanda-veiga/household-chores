import { describe, expect, it } from 'vitest';
import { calendarDate } from '../../src/domain/calendar-date';

describe('calendar dates', () => {
  it.each(['2026-11-03', '2024-02-29', '2000-02-29', '0001-01-01'])('accepts the existing date %s', (value) => {
    expect(calendarDate(value)).toBe(value);
  });
  it.each(['2026-02-29', '1900-02-29', '2026-04-31', '2026-00-01', '2026-13-01', '2026-01-00', '0000-01-01', '11/03/2026', '2026-1-3', '2026-11-03T00:00:00Z'])('rejects invalid or ambiguous input %s', (value) => {
    expect(() => calendarDate(value)).toThrow(RangeError);
  });
});
