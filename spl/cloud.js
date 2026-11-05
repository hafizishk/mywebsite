/* SPLCLOUD: the store's line to Supabase (supabase/migrations/0001_spl_backend.sql).
   - Everyone: pulls the office's document (spl_state 'main') into the browser store on open, then gets every change
     live over Realtime. It lands exactly where the admin's writes used to land, so the app and the admin react through
     the 'storage' listeners they already have.
   - FAS staff (signed in on the admin): every save goes up to the same row.
   - Analytics: events are batched and sent to spl_events every few seconds; the admin pulls them back to count.
   With no backend configured (backend.js empty) or no network, everything keeps working from the browser store.
   Loaded after store.js and vendor/supabase.js, before app.js / admin.js. */
var SPLCLOUD = (function () {
  'use strict';
  const cfg = window.SPL_BACKEND || {}, on = !!(cfg.url && cfg.key && window.supabase && window.supabase.createClient);
  const sb = on ? window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: true, storageKey: 'spl-auth' } }) : null;
  const ST = { status: on ? 'connecting' : 'demo', admin: false, email: '', updatedAt: '', error: '' };
  const listeners = [];
  const emit = () => listeners.forEach(f => { try { f(ST); } catch (e) {} });
  const device = (() => { try { let d = localStorage.getItem('spl-device'); if (!d) { d = 'd' + Math.random().toString(36).slice(2, 12); localStorage.setItem('spl-device', d); } return d; } catch (e) { return 'd-anon'; } })();

  // a document from the server becomes the browser store; the app and admin hear it as a storage change
  let lastJson = '';
  function land(data, updatedAt) {
    if (!data || typeof data !== 'object') return;
    const json = JSON.stringify(data); ST.updatedAt = updatedAt || ST.updatedAt;
    if (json === lastJson) { emit(); return; } lastJson = json;
    try { localStorage.setItem(SPLSTORE.KEY, json); } catch (e) {}
    try { window.dispatchEvent(new StorageEvent('storage', { key: SPLSTORE.KEY })); } catch (e) {}
    emit();
  }
  async function pull() {
    if (!on) return;
    const { data, error } = await sb.from('spl_state').select('data, updated_at').eq('id', 'main').maybeSingle();
    if (error) { ST.status = 'offline'; ST.error = error.message; emit(); return; }
    ST.status = 'live'; ST.error = '';
    // an empty document on first run: the office's seed goes up from the first staff session that saves
    if (data && data.data && Object.keys(data.data).length) land(data.data, data.updated_at); else emit();
  }
  function subscribe() {
    if (!on) return;
    sb.channel('spl-state').on('postgres_changes', { event: '*', schema: 'public', table: 'spl_state', filter: 'id=eq.main' },
      p => { if (p.new && p.new.data) land(p.new.data, p.new.updated_at); }).subscribe(s => { if (s === 'SUBSCRIBED') { ST.status = 'live'; emit(); } });
  }

  // staff saves: debounced so a burst of edits is one write; last write wins
  let saveT = null, pending = null;
  function save(d) {
    if (!on || !ST.admin) return; pending = d; clearTimeout(saveT);
    saveT = setTimeout(async () => { const doc = pending; pending = null; lastJson = JSON.stringify(doc);
      const { data, error } = await sb.from('spl_state').upsert({ id: 'main', data: doc }).select('updated_at').maybeSingle();
      if (error) { ST.error = error.message; ST.status = 'offline'; } else { ST.error = ''; ST.status = 'live'; ST.updatedAt = data ? data.updated_at : ST.updatedAt; }
      emit(); }, 400);
  }

  // analytics: queued, sent in batches; dropped quietly if the network is away
  const queue = [];
  function log(kind, name) { if (!on) return; queue.push({ device, kind: String(kind).slice(0, 20) || 'x', name: String(name).slice(0, 60) }); if (queue.length > 500) queue.splice(0, queue.length - 500); }
  async function flush() { if (!on || !queue.length) return; const batch = queue.splice(0, 100); const { error } = await sb.from('spl_events').insert(batch); if (error) queue.unshift(...batch.slice(0, 400 - queue.length)); }
  if (on) setInterval(flush, 5000);
  // the admin's counts: the last 4,000 events, in the browser store's own [time, kind, name] form
  async function pullEvents() {
    if (!on || !ST.admin) return false;
    const { data, error } = await sb.from('spl_events').select('at, kind, name').order('at', { ascending: false }).limit(4000);
    if (error || !data) return false;
    try { localStorage.setItem(SPLSTORE.EVK, JSON.stringify(data.reverse().map(e => [Date.parse(e.at), e.kind, e.name]))); } catch (e) {}
    return true;
  }

  // the activity log (0002_spl_activity.sql): who changed what, written by the database on every save
  async function pullAudit(limit) {
    if (!on || !ST.admin) return null;
    const { data, error } = await sb.from('spl_audit').select('id, at, who, section, before, after').order('id', { ascending: false }).limit(limit || 400);
    if (error) { ST.auditError = error.message; return null; } ST.auditError = '';
    return data.map(r => ({ id: r.id, at: Date.parse(r.at), who: r.who, section: r.section, before: r.before, after: r.after }));
  }

  // staff sign-in (admin only): an email and password made in Supabase > Authentication, listed in spl_admins
  async function checkAdmin() {
    if (!on) return false; const { data: u } = await sb.auth.getUser(); ST.email = u && u.user ? u.user.email : '';
    if (!ST.email) { ST.admin = false; emit(); return false; }
    const { data, error } = await sb.rpc('spl_is_admin'); ST.admin = !error && data === true;
    if (ST.admin) { const r = await sb.from('spl_admins').select('name').eq('user_id', u.user.id).maybeSingle(); ST.name = r.data && r.data.name ? r.data.name : ''; }
    emit(); return ST.admin;
  }
  async function signIn(email, password) {
    if (!on) return { ok: false, msg: 'No backend set up yet.' };
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, msg: error.message };
    const ok = await checkAdmin(); if (!ok) { await sb.auth.signOut(); return { ok: false, msg: 'This login is not on the FAS staff list.' }; }
    return { ok: true };
  }
  async function signOut() { if (on) await sb.auth.signOut(); ST.admin = false; ST.email = ''; emit(); }

  if (on) { pull(); subscribe(); checkAdmin(); window.addEventListener('online', pull); document.addEventListener('visibilitychange', () => { if (!document.hidden) pull(); }); }
  return { on, state: ST, onChange: f => listeners.push(f), pull, save, log, flush, pullEvents, pullAudit, signIn, signOut, checkAdmin };
})();
