import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { StorageFault, storageFault } from '../../application/storage/errors';
import type { Snapshot } from '../../application/storage/model';
import type { Command, StorageRuntime } from '../../application/storage/port';
import type { HouseholdService, Review } from '../../application/storage/service';

export function LocalDataPage({ runtime }: { runtime: StorageRuntime | undefined }) {
  const [service, setService] = useState<HouseholdService>();
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [error, setError] = useState<StorageFault>();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Recife');
  const [review, setReview] = useState<Review>();
  const [confirmed, setConfirmed] = useState(false);
  const [connection, setConnection] = useState(0);
  const pending = useRef<Command | undefined>(undefined);
  const reads = useRef(0);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    let current: HouseholdService | undefined;
    const refresh = async () => {
      const request = ++reads.current;
      try {
        const next = await current!.read();
        if (active && request === reads.current) setSnapshot(next);
      } catch (err) { if (active) setError(storageFault(err)); }
    };
    setLoading(true);
    if (!runtime) { setError(new StorageFault('UNAVAILABLE', 'Local storage is not connected.')); setLoading(false); return; }
    void runtime.connect().then(async (connected) => {
      if (!active) return;
      current = connected; setService(connected);
      await refresh();
      if (active) { unsubscribe = connected.subscribe(() => { void refresh(); }); setLoading(false); }
    }).catch((err: unknown) => { if (active) { setError(storageFault(err)); setLoading(false); } });
    const focus = () => { if (current) void refresh(); };
    window.addEventListener('focus', focus);
    // Notifications are hints; periodic/focus reads also support browsers without BroadcastChannel.
    const poll = window.setInterval(() => { if (current && document.visibilityState === 'visible') void refresh(); }, 4000);
    return () => { active = false; unsubscribe?.(); window.removeEventListener('focus', focus); window.clearInterval(poll); };
  }, [runtime, connection]);

  async function save(command: Command) {
    if (!service) return;
    pending.current = command;
    setBusy(true); setError(undefined); setNotice('Saving locally…');
    try {
      await service.commit(command);
      pending.current = undefined;
      setNotice(service.mode === 'memory' ? 'Updated in temporary memory. Export a backup to keep it.' : 'Saved in this browser.');
      const request = ++reads.current;
      const next = await service.read();
      if (request === reads.current) setSnapshot(next);
    } catch (err) {
      const fault = storageFault(err); setError(fault); setNotice('');
      if (fault.code === 'CONFLICT' || fault.code === 'OPERATION_REUSED' || fault.code === 'VALIDATION') pending.current = undefined;
    } finally { setBusy(false); }
  }

  async function reviewAction(action: Review['action'], text?: string) {
    if (!service) return;
    setBusy(true); setError(undefined); setNotice('');
    if (review) service.cancelReview(review.token);
    setReview(undefined); setConfirmed(false);
    try { setReview(await service.review(action, text)); }
    catch (err) { setError(storageFault(err)); }
    finally { setBusy(false); }
  }

  async function chooseBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError(new StorageFault('VALIDATION', 'Choose a JSON backup no larger than 5 MiB.')); return; }
    try { await reviewAction('restore', await file.text()); } catch { setError(new StorageFault('VALIDATION', 'The selected backup could not be read.')); }
  }

  async function exportBackup() {
    if (!service) return;
    setBusy(true); setError(undefined);
    try {
      const text = await service.exportBackup();
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'our-home-backup.json'; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Backup download prepared. Keep the file somewhere safe; it contains household data.');
    } catch (err) { setError(storageFault(err)); }
    finally { setBusy(false); }
  }

  async function reconnect(temporary: boolean) {
    if (!runtime) return;
    setBusy(true); setError(undefined); setReview(undefined); setConfirmed(false); setSnapshot(undefined); pending.current = undefined;
    try { await (temporary ? runtime.useTemporary() : runtime.reconnect()); setConnection((n) => n + 1); }
    catch (err) { setError(storageFault(err)); }
    finally { setBusy(false); }
  }

  const data = snapshot?.dataset;
  return (
    <section className="information-page local-data-page" aria-labelledby="page-title">
      <p className="eyebrow">A place to begin</p>
      <h1 id="page-title" tabIndex={-1}>Your local household.</h1>
      <p className="page-lead">Keep one household in this browser. A backup is a manual snapshot; nothing is synced with another device or account.</p>
      {service?.mode === 'memory' && <p className="storage-banner" role="status"><strong>Temporary mode.</strong> Changes disappear when this tab is closed or reloaded. Export a backup before leaving. Existing browser records remain untouched.</p>}
      {loading && <p role="status">Opening local storage…</p>}
      {error && <div className="storage-error" role="alert"><h2>{error.code === 'CONFLICT' ? 'This household changed.' : 'Local storage needs attention.'}</h2><p>{error.message}</p><p>Existing browser records have not been automatically reset.</p>
        <div className="action-row">
          {pending.current && <button disabled={busy} className="button button-secondary" onClick={() => { if (pending.current) void save(pending.current); }}>Retry the same save</button>}
          <button disabled={busy} className="button button-secondary" onClick={() => { void reconnect(false); }}>Reconnect and reload</button>
          {service?.mode !== 'memory' && <button disabled={busy} className="button button-secondary" onClick={() => { void reconnect(true); }}>Use temporary memory instead</button>}
        </div>
      </div>}
      {notice && <p role="status" className="storage-notice">{notice}</p>}
      {!loading && snapshot && !data && <form className="setup-form" onSubmit={(event) => { event.preventDefault(); if (service) { try { void save(service.create(snapshot, name, timezone)); } catch (err) { setError(storageFault(err)); } } }}>
        <h2>Start with an empty household</h2>
        <label htmlFor="household-name">Household name</label><input id="household-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required disabled={busy} />
        <label htmlFor="household-timezone">Household timezone</label><input id="household-timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} required disabled={busy} aria-describedby="timezone-help" />
        <p id="timezone-help" className="quiet-note">For example: America/Recife. No email or password is needed.</p>
        <button className="button button-primary" disabled={busy || !service || !name.trim()} type="submit">Create local household</button>
      </form>}
      {data && snapshot && <div className="household-summary">
        <div className="section-heading"><div><p className="eyebrow">{data.household.source === 'example' ? 'Clearly labeled example data' : 'Your saved household'}</p><h2>{data.household.name}</h2></div><span className="status-label">{service?.mode === 'memory' ? 'Temporary' : 'On this browser'}</span></div>
        <p>{data.household.timezone} · Today: {service?.clock.today(data.household.timezone)}</p>
        <p>{data.members.length} members · {data.chores.length} chore definitions · {data.occurrences.length} occurrences</p>
        <label htmlFor="local-profile">Current local profile</label><select id="local-profile" value={snapshot.profileId ?? ''} disabled={busy} onChange={(e) => { if (service) void save(service.selectProfile(snapshot, e.target.value || null)); }}><option value="">This device — no person selected</option>{data.members.filter((m) => !m.archived).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
        <p className="quiet-note">A recording preference, not a sign-in. Anyone using this browser can choose a person.</p>
        {data.household.source === 'example' && <p className="example-note">Example configuration dated 3 November 2026. Alex, Jordan, and Sam are local members with no accounts. Sam: every Tuesday and every other Friday, anchored 6 November 2026. Loading this example does not change today's clock.</p>}
        <p className="quiet-note">Member editing, chore setup, and the calendar are next. These saved definitions are not a calculated schedule.</p>
        <h3>Recent local changes</h3><ul className="history-preview">{data.history.slice(-4).reverse().map((entry) => <li key={entry.id}>{entry.summary} · Recorded locally by {entry.actor.name} <span className="quiet-note">(unverified local preference)</span></li>)}</ul>
      </div>}
      {!loading && service && snapshot && <div className="data-tools"><h2>Examples and backups</h2><p>Loading an example, restoring, or resetting requires a review. Backups omit temporary import reviews and message drafts.</p><div className="action-row">
        <button disabled={busy} className="button button-secondary" onClick={() => { void reviewAction('example'); }}>Review example household</button>
        <button disabled={busy || !data} className="button button-secondary" onClick={() => { void exportBackup(); }}>Export JSON backup</button>
        <button disabled={busy || !data} className="button button-secondary" onClick={() => { void reviewAction('reset'); }}>Review reset</button>
      </div><label htmlFor="restore-file">Choose an Our Home JSON backup to review (maximum 5 MiB)</label><input id="restore-file" type="file" accept="application/json,.json" disabled={busy} onChange={(event) => { void chooseBackup(event); }} /></div>}
      {review && <section className="review-panel" aria-labelledby="replacement-title"><h2 id="replacement-title">Review {review.action === 'example' ? 'example replacement' : review.action}</h2><p>Replace <strong>{review.currentName}</strong> with <strong>{review.incomingName}</strong> on this browser.</p><p>Incoming: {review.members} members · {review.chores} chores · {review.history} history entries.</p><p>Export the current household first if you want to keep a copy. A later change in another tab will block this replacement until reviewed again.</p><label className="confirmation"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={busy} /> I understand this replaces the current local household.</label><div className="action-row"><button className="button button-primary" disabled={!confirmed || busy} onClick={() => { if (service) { try { const command = service.confirmReview(review.token, confirmed); setReview(undefined); setConfirmed(false); void save(command); } catch (err) { setError(storageFault(err)); } } }}>Confirm {review.action === 'example' ? 'example replacement' : review.action}</button><button className="button button-secondary" disabled={busy} onClick={() => { service?.cancelReview(review.token); setReview(undefined); setConfirmed(false); }}>Cancel replacement</button></div></section>}
    </section>
  );
}
