import { calendarDate } from '../../domain/calendar-date';
import type { Clock, IdSource } from '../../application/storage/port';

export class BrowserClock implements Clock {
  now(): string { return new Date().toISOString(); }
  today(timezone: string): string {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(this.now()));
    const part = (key: string) => parts.find((p) => p.type === key)?.value;
    return calendarDate(`${part('year')}-${part('month')}-${part('day')}`);
  }
}

export const browserIds: IdSource = { next: () => crypto.randomUUID() };

export async function digest(value: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
