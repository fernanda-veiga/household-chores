/** Calendar dates are data, not instants converted through the host timezone. */
export type CalendarDate = string & { readonly __calendarDate: unique symbol };

export function calendarDate(value: string): CalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError('Use a calendar date in YYYY-MM-DD format.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (year < 1 || !days || day < 1 || day > days) throw new RangeError('This calendar date does not exist.');
  return value as CalendarDate;
}
