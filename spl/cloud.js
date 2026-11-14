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
  const sb = on ? window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: true, storageKey: window.SPL_ADMIN ? 'spl-auth' : 'spl-fan-auth' } }) : null;
  // the admin keeps the staff login; the app keeps a separate fan login, so on one browser the two never overwrite each other
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
    const { data, error } = await sb.from('spl_events').select('at, kind, name, device').order('at', { ascending: false }).limit(4000);
    if (error || !data) return false;
    data.reverse();
    try { localStorage.setItem(SPLSTORE.EVK, JSON.stringify(data.map(e => [Date.parse(e.at), e.kind, e.name]))); } catch (e) {}
    // which phone sent each event (an anonymous id, never a name): the admin counts fans from it
    try { localStorage.setItem('spl-evdev', JSON.stringify(data.map(e => [Date.parse(e.at), e.device]))); } catch (e) {}
    return true;
  }

  // the activity log (0002_spl_activity.sql): who changed what, written by the database on every save
  async function pullAudit(limit) {
    if (!on || !ST.admin) return null;
    const { data, error } = await sb.from('spl_audit').select('id, at, who, section, before, after').order('id', { ascending: false }).limit(limit || 400);
    if (error) { ST.auditError = error.message; return null; } ST.auditError = '';
    return data.map(r => ({ id: r.id, at: Date.parse(r.at), who: r.who, section: r.section, before: r.before, after: r.after }));
  }

  // fan votes (0003_spl_votes.sql): each phone signs in anonymously the first time it votes; the database takes one vote per
  // fan, per award, per month, while that vote is open. Totals are public; who voted for what is not.
  async function fanSession() {
    const { data } = await sb.auth.getSession(); if (data && data.session) return data.session.user;
    const r = await sb.auth.signInAnonymously(); if (r.error) throw r.error; return r.data.user;
  }
  async function vote(award, month, choice) {
    if (!on) return { ok: false, offline: true };
    // unavailable: fan logins or the votes table aren't switched on yet; the phone then keeps counting its own vote, as before
    try { await fanSession(); } catch (e) { return { ok: false, unavailable: true, err: e.message }; }
    const { error } = await sb.from('spl_votes').insert({ award, month, choice });
    if (!error) return { ok: true };
    if (error.code === '23505') return { ok: false, dup: true, msg: 'You have already voted this month.' };
    if (error.code === '42501') return { ok: false, closed: true, msg: 'Voting is closed for this award.' };
    return { ok: false, unavailable: true, err: error.message };
  }
  async function voteCounts(month) {
    if (!on) return null; const { data, error } = await sb.rpc('spl_vote_counts', { p_month: month });
    if (error || !data) return null; const o = { potm: {}, gotm: {} }; data.forEach(r => { if (o[r.award]) o[r.award][r.choice] = +r.votes; }); return o;
  }

  // Guess the crowd (0004_spl_crowd.sql)
  async function guess(match, value, name, show, club) {
    if (!on) return { ok: false, offline: true };
    try { await fanSession(); } catch (e) { return { ok: false, unavailable: true }; }
    const { error } = await sb.from('spl_guesses').insert({ match, guess: value, name: String(name || '').slice(0, 24), show_name: !!show, club: String(club || '').slice(0, 3) });
    if (!error) return { ok: true }; if (error.code === '23505') return { ok: false, dup: true, msg: 'You have already guessed for this game.' };
    if (error.code === '42501') return { ok: false, closed: true, msg: 'Guessing has closed for this game.' }; return { ok: false, unavailable: true };
  }
  async function crowdCount(match) { if (!on) return null; const { data, error } = await sb.rpc('spl_crowd_count', { p_match: match }); return error ? null : +data; }
  async function crowdWinner(match, attendance) { if (!on || !ST.admin) return null; const { data, error } = await sb.rpc('spl_crowd_winner', { p_match: match, p_attendance: attendance }); return error || !data ? null : (data[0] || { guesses: 0 }); }
  async function crowdMine(match) { if (!on) return null; const { data: s } = await sb.auth.getSession(); if (!s || !s.session) return null; const { data, error } = await sb.rpc('spl_crowd_mine', { p_match: match }); return error || !data ? null : data[0] || null; }

  // push to locked phones (supabase/functions/push): staff only; quietly does nothing until the function is deployed
  // the AI report writer (supabase/functions/report): staff only; returns { head, dek, body } or { error }
  async function writeReport(facts, kind) {
    if (!on || !ST.admin) return { error: 'Sign in with the backend on to use the writer.' };
    try { const { data, error } = await sb.functions.invoke('report', { body: { facts, kind: kind || 'report' } });
      if (error) { let msg = error.message || 'error'; try { const b = await error.context.json(); if (b && b.error) msg = b.error; } catch (x) {} return { error: msg }; }
      return data || { error: 'No reply.' }; }
    catch (e) { return { error: e.message }; }
  }
  // a photo of a team sheet, read by the `lineup` function (supabase/functions/lineup): staff only
  async function readSheet(body) {
    if (!on || !ST.admin) return { error: 'Sign in with the backend on to read a photo. You can still type the numbers in.' };
    try { const { data, error } = await sb.functions.invoke('lineup', { body });
      if (error) { let msg = error.message || 'error'; try { const b = await error.context.json(); if (b && b.error) msg = b.error; } catch (x) {} return { error: msg }; }
      return data || { error: 'No reply.' }; }
    catch (e) { return { error: e.message }; }
  }
  async function sendPush(p) {
    if (!on || !ST.admin) return { ok: false };
    try { const { data, error } = await sb.functions.invoke('push', { body: p }); ST.pushError = error ? (error.message || 'error') : ''; return { ok: !error, data }; }
    catch (e) { ST.pushError = e.message; return { ok: false }; }
  }

  // staff sign-in (admin only): an email and password made in Supabase > Authentication, listed in spl_admins
  async function checkAdmin() {
    if (!on) return false; const { data: ss } = await sb.auth.getSession(), u = { user: ss && ss.session ? ss.session.user : null }; ST.email = u.user ? u.user.email : '';
    if (!ST.email) { ST.admin = false; emit(); return false; }
    let r0 = await sb.rpc('spl_is_admin'); if (r0.error) { await new Promise(res => setTimeout(res, 1500)); r0 = await sb.rpc('spl_is_admin'); } const { data, error } = r0; ST.admin = !error && data === true;
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
  return { on, state: ST, onChange: f => listeners.push(f), pull, save, log, flush, pullEvents, pullAudit, device, vote, voteCounts, guess, crowdCount, crowdWinner, crowdMine, writeReport, readSheet, sendPush, signIn, signOut, checkAdmin };
})();
