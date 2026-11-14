/* SPL admin — what FAS's office uses to run the app. Every change is written to the shared store (store.js),
   which the app reads; open the app in another tab, or watch the phone preview, and it changes as you save.
   One IIFE: state A, a function per page returning HTML, one render(), delegated clicks keyed on data-*. */
(function () {
  'use strict';
  const C = SPL.clubs, E = SPLSTORE.esc, root = document.getElementById('adm');
  const A = { page: 'overview', live: null, evType: 'G', evTeam: null, news: null, flash: '', pushWhen: 'now', pushAud: 'all' };
  // the admin's day (Hafiz, 10 Nov): the real date. ROUND is the round in play (the earliest with a game still to come),
  // TONIGHT today's games; a demo game set on the Matchday page moves one fixture to a chosen time (SPLSTORE.demoOf)
  let TODAY, ROUND, TONIGHT;
  function setDay() { TODAY = SPLSTORE.today(); const mw = SPLSTORE.roundOf(TODAY); ROUND = SPL.matches.map((m, i) => m[0] === mw ? i : -1).filter(i => i >= 0).sort((a, b) => SPL.matches[a][1].localeCompare(SPL.matches[b][1]) || a - b); TONIGHT = ROUND.filter(i => SPL.matches[i][1] === TODAY); }
  // the top bar's clock (Hafiz, 10 Nov): today's date and the time, ticking every second
  const clockNow = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  setInterval(() => { const el = document.getElementById('clkT'); if (el) el.textContent = clockNow(); }, 1000);
  const dayName = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-SG', { weekday: 'long' });
  // the table as the admin's day sees it: the stored table plus Matchweek 6's Sunday games (kept unplayed in the data for the app's live replay; spl.sg, 1 Nov)
  const SUNDAY6 = { 22: [0, 4], 23: [0, 0] };
  const tableNow = () => { const t = SPL.table.map(r => r.slice()); Object.entries(SUNDAY6).forEach(([i, sc]) => { const m = SPL.matches[+i]; [[m[2], sc[0], sc[1]], [m[3], sc[1], sc[0]]].forEach(([k, f, a]) => { const r = t.find(x => x[0] === k); if (!r) return; r[1]++; if (f > a) { r[2]++; r[7] += 3; } else if (f === a) { r[3]++; r[7] += 1; } else r[4]++; r[5] += f; r[6] += a; }); }); return t.sort((x, y) => y[7] - x[7] || (y[5] - y[6]) - (x[5] - x[6]) || y[5] - x[5]); };
  // console games outside this round (a test, or a game left running): listed so they can be finished or reset
  const LEFT = 4 * 36e5;
  const stale = i => { const L = D.live[i]; return !!(L && ['1H', 'HT', '2H'].includes(L.phase) && L.t0 && Date.now() - L.t0 > LEFT); };
  const consoleGames = () => ROUND.concat(Object.keys(D.live).map(Number).filter(i => SPL.matches[i] && !ROUND.includes(i) && D.live[i].phase !== 'pre').sort((a, b) => a - b));
  const rspan = () => { const ds = ROUND.map(i => SPL.matches[i][1]).sort(), f = d => new Date(d + 'T12:00:00'), a = f(ds[0]), b = f(ds[ds.length - 1]), mo = d => d.toLocaleDateString('en-GB', { month: 'long' }); return ds[0] === ds[ds.length - 1] ? `${a.getDate()} ${mo(a)}` : mo(a) === mo(b) ? `${a.getDate()}–${b.getDate()} ${mo(b)}` : `${a.getDate()} ${mo(a)} – ${b.getDate()} ${mo(b)}`; };
  const kickT = m => String(m[7] || '').replace(/^\w+ /, '');
  const relDay = iso => iso === TODAY ? 'Today' : (Date.parse(iso) - Date.parse(TODAY)) === 864e5 ? 'Tomorrow' : dayName(iso);
  let D = SPLSTORE.read(); setDay(); if (A.live === undefined || !ROUND.includes(A.live)) A.live = TONIGHT[0] !== undefined ? TONIGHT[0] : ROUND[0];
  // alerts saved by this save that are due now also go to locked phones (Firebase, through the push function)
  function pushOut(b, a) { if (!CL.on) return; const seen = {}; (b.pushes || []).forEach(p => { seen[p.id] = 1; });
    (a.pushes || []).filter(p => !seen[p.id] && p.at <= Date.now() + 30000).forEach(p => { const m = p.match !== null && SPL.matches[p.match];
      CL.sendPush({ title: p.title, body: p.body, aud: p.aud, kind: p.kind, match: p.match, home: m ? m[2] : '', away: m ? m[3] : '' }); }); }
  const save = (fn, msg) => { const b = SPLSTORE.read(); D = SPLSTORE.update(fn); auditLocal(b, D); pushOut(b, D); if (msg) flash(msg); render();
    // with the backend on, the database writes the activity rows; fetch them once the save has gone up
    if (CL.on) { clearTimeout(save.t); save.t = setTimeout(() => loadAudit().then(() => { if (['overview', 'activity'].includes(A.page) && !document.activeElement.matches('input,textarea,select')) render(); }), 2000); } };
  const flash = msg => { A.flash = msg; clearTimeout(flash.t); flash.t = setTimeout(() => { A.flash = ''; render(); }, 2600); };
  const short = k => C[k].short;
  const crest = (k, px) => `<span class="crest cr-${k}" style="width:${px}px;height:${px}px" role="img" aria-label="${C[k].name}"></span>`;
  const fmt = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const hm = ts => new Date(ts).toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const ICON = {
    overview: 'M3 12l9-8 9 8M5 10v10h14V10', fixtures: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4', matchday: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7l4 3-1.5 4.5h-5L8 10z', news: 'M4 5h16v14H4zM8 9h8M8 13h8M8 17h5',
    push: 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0', votes: 'M4 12l5 5L20 6', sponsors: 'M3 7h18v10H3zM7 7v10M17 7v10', analytics: 'M4 20V10M10 20V4M16 20v-7M22 20H2', media: 'M4 5h13v14H6a2 2 0 01-2-2zM17 9h3v8a2 2 0 01-2 2M8 9h5M8 13h5', settings: 'M12 9a3 3 0 100 6 3 3 0 000-6zM4 12h2M18 12h2M12 4v2M12 18v2',
    shop: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 016 0v2', activity: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2', back: 'M15 5l-7 7 7 7', search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4', sun: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5', moon: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z', phone: 'M8 3h8a1 1 0 011 1v16a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1zM11 18h2'
  };
  const icon = k => `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="${ICON[k]}"/></svg>`;

  // ---------- the live clock, as the app works it out ----------
  function clockOf(i) {
    const L = D.live[i]; if (!L || L.phase === 'pre') return { label: 'Pre-match', n: 0, phase: 'pre' };
    if (L.phase === 'HT') return { label: 'HT', n: 45, phase: 'HT' }; if (L.phase === 'FT') return { label: 'FT', n: 90, phase: 'FT' };
    const n = L.base + Math.floor(Math.max(0, Date.now() - L.t0) / 60000) + 1, cap = L.phase === '1H' ? 45 : 90;
    return { label: n > cap ? `${cap}+${n - cap}'` : `${n}'`, n, cap, phase: L.phase };
  }
  const scoreOf = i => { const m = SPL.matches[i], s = [0, 0]; ((D.live[i] || {}).ev || []).forEach(e => { if (e[3] === 'G') s[e[4] === m[2] ? 0 : 1]++; }); return s; };
  const pname = (k, n) => (SPL.squads[k].find(p => p[0] === n) || [n, '#' + n])[1];
  const minText = e => e[2] ? `${e[1]}+${e[2]}'` : `${e[1]}'`;

  // ---------- analytics, counted from what the app recorded ----------
  // Example numbers (Hafiz, 6 Nov): for the pitch, a fortnight of made-up app use so the dashboard and analytics read like a
  // league in its first weeks. Clearly marked on every page that shows them; switched off in Settings to see what phones recorded.
  try { A.mockOn = localStorage.getItem('spl-admin-mock') !== 'off'; } catch (e) { A.mockOn = true; }
  let MOCK = null;
  function mockEvents() {
    if (MOCK) return MOCK; let seed = 20261120; const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const pick = w => { let t = rnd() * w.reduce((a, x) => a + x[1], 0); for (const x of w) { t -= x[1]; if (t <= 0) return x[0]; } return w[0][0]; };
    const now = Date.now(), day = 864e5, ev = [], dev = [];
    const FOL = [['LCS', 412], ['TAM', 318], ['GEY', 207], ['BKF', 121], ['JUR', 98], ['HGU', 76], ['YLS', 52], ['TPU', 40]];
    const VIEWS = [['home:tonight', 30], ['home:news', 8], ['match:24', 9], ['match:27', 7], ['table', 8], ['matches', 6], ['stats:players', 5], ['watch', 6], ['club:LCS', 4], ['club:TAM', 3], ['club:GEY', 2], ['article', 4], ['pmonth', 3], ['gotm', 2], ['player', 3], ['partners', 2]];
    const TAPS = [['match', 30], ['video', 14], ['article', 10], ['vote', 9], ['tickets', 6], ['remind', 5], ['story', 12], ['htab', 8]].concat(FOL.map(([k, n]) => ['follow:' + k, n / 90]));
    const IMP = [['live', 5], ['moments', 4], ['stats', 3], ['gotm', 2], ['potm', 2]];
    const ART = D.news.filter(n => n.status === 'live').map((n, i) => [n.id, 8 - i]);
    // fans grow through the fortnight: about 1,150 phones the week before, about 1,280 this week
    const pool = 1500;
    for (let d = 13; d >= 0; d--) { const base = now - d * day - (now % day), daily = Math.round(380 + (13 - d) * 22 + rnd() * 60), wkend = [0, 5, 6].includes(new Date(base).getDay()) ? 1.5 : 1;
      const phones = Math.round(daily * wkend), first = Math.round((13 - d) * 18);
      for (let k = 0; k < phones; k++) { const id = 'm' + ((first + Math.floor(rnd() * 1000) * 7 + k) % pool), t0 = base + Math.round(rnd() * day * .95); if (t0 > now) continue;
        const n = 2 + Math.floor(rnd() * 6);
        for (let j = 0; j < n; j++) { const t = t0 + j * 40000; ev.push([t, 'view', pick(VIEWS)]); dev.push([t, id]); }
        if (rnd() < .8) { ev.push([t0 + 9000, 'tap', pick(TAPS)]); dev.push([t0 + 9000, id]); }
        if (rnd() < .5) { ev.push([t0 + 12000, 'imp', pick(IMP)]); dev.push([t0 + 12000, id]); }
        if (ART.length && rnd() < .14) { ev.push([t0 + 15000, 'article', pick(ART)]); dev.push([t0 + 15000, id]); }
        if (rnd() < (d < 11 && d > 3 ? .42 : .05)) { ev.push([t0 + 20000, 'vote', rnd() < .7 ? 'pmonth' : 'gotm']); dev.push([t0 + 20000, id]); }
        if (rnd() < .5) { ev.push([t0 - 60000, 'push', rnd() < .75 ? 'live' : 'manual']); dev.push([t0 - 60000, id]); } } }
    const ord = ev.map((e, i) => i).sort((x, y) => ev[x][0] - ev[y][0]);
    MOCK = { ev: ord.map(i => ev[i]), dev: ord.map(i => dev[i]) }; return MOCK;
  }
  const mockTag = () => A.mockOn ? '<span class="chip y" title="Switch off in Settings">Example numbers</span>' : '';
  function stats() {
    const ev = A.mockOn ? mockEvents().ev : SPLSTORE.events(), by = (kind) => { const o = {}; ev.filter(e => e[1] === kind).forEach(e => { o[e[2]] = (o[e[2]] || 0) + 1; }); return o; };
    return { ev, views: by('view'), taps: by('tap'), imp: by('imp'), articles: by('article'), push: by('push'), votes: ev.filter(e => e[1] === 'vote').length, first: ev.length ? ev[0][0] : 0 };
  }
  const VIEW_NAMES = { 'home:tonight': 'Home · Matchday', 'home:news': 'Home · News', watch: 'Watch', matches: 'Season · Matches', table: 'Season · Table', 'stats:players': 'Stats · Players', 'stats:clubstats': 'Stats · Clubs', clubs: 'Clubs', players: 'Players', player: 'Player profile', gotm: 'Goal of the Month', pmonth: 'Player of the Month', settings: 'Settings', search: 'Search', tickets: 'Tickets', video: 'Video', article: 'News article', onboard: 'Onboarding', partners: 'Partners screen' };
  const viewName = k => VIEW_NAMES[k] || (k.startsWith('match:') ? 'Match centre · ' + (SPL.matches[+k.slice(6)] ? short(SPL.matches[+k.slice(6)][2]) + ' v ' + short(SPL.matches[+k.slice(6)][3]) : k.slice(6)) : k.startsWith('club:') ? 'Club · ' + (C[k.slice(5)] ? C[k.slice(5)].short : k.slice(5)) : k);

  // ---------- activity: who changed what ----------
  // With the backend on, the database writes one row per part of the document that changed on each save (who, when,
  // before, after: 0002_spl_activity.sql). In demo mode this browser keeps the same rows itself. Either way the lines
  // below are worked out from before and after, so they say exactly what changed.
  const AUK = 'spl-audit';
  const localAudit = () => { try { const a = JSON.parse(localStorage.getItem(AUK) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  function auditLocal(b, a) {
    if (CL.on) return; const rows = localAudit(), at = Date.now();
    Object.keys(Object.assign({}, b, a)).forEach(k => { const x = JSON.stringify(b[k]), y = JSON.stringify(a[k]); if (x === y) return;
      rows.push({ id: at + ':' + k, at, who: A.me || 'This browser', section: k, before: x && x.length < 60000 ? b[k] : null, after: y && y.length < 60000 ? a[k] : null }); });
    if (rows.length > 300) rows.splice(0, rows.length - 300); try { localStorage.setItem(AUK, JSON.stringify(rows)); } catch (e) {}
    AUD = rows.slice().reverse();
  }
  const SECTION = { news: 'News', lead: 'News', pushes: 'Notifications', live: 'Matchday', gotm: 'Awards', potm: 'Awards', awards: 'Awards', sponsors: 'Sponsors', partners: 'Sponsors', partnerLook: 'Sponsors', staff: 'Settings', shop: 'Shop', shopUrl: 'Shop', playerPhotos: 'Awards' };
  const q_ = s => `‘${E(s || 'Untitled')}’`;
  const fixture = i => SPL.matches[i] ? `${short(SPL.matches[i][2])} v ${short(SPL.matches[i][3])}` : 'a game';
  const evWords = (i, e) => { const m = SPL.matches[i], k = e[4], who = k ? E(pname(e[8] || k, e[5])) : '';
    return { G: `goal, ${who}${e[7] === 'og' ? ' (own goal)' : e[7] === 'pen' ? ' (pen)' : ''} ${minText(e)}`, D: `goal, ${who} ${minText(e)}`, Y: `yellow card, ${who} ${minText(e)}`, R: `red card, ${who} ${minText(e)}`,
      S: `substitution, ${who} on for ${k ? E(pname(k, e[6])) : ''} ${minText(e)}`, HT: 'half time', FT: 'full time' }[e[3]] || 'an entry'; };
  // what one row means, as short lines; [text, tone] with tone '' | 'add' | 'del' | 'mt' (match)
  function changeLines(r) {
    const s = r.section, b = r.before, a = r.after, out = [];
    if (b == null && a != null && s !== 'live' && s !== 'pushes') return [[`Set up ${SECTION[s] || s} for the first time`, 'add']];
    if (s === 'news') { const bi = {}, ai = {}; (b || []).forEach(n => { bi[n.id] = n; }); (a || []).forEach(n => { ai[n.id] = n; });
      Object.keys(ai).forEach(id => { const n = ai[id], o = bi[id];
        if (!o) out.push([`${n.status === 'live' ? 'Published' : 'Drafted'} the story ${q_(n.title)}`, 'add']);
        else if (o.status !== n.status) out.push([`${n.status === 'live' ? 'Published' : 'Unpublished'} ${q_(n.title)}`, n.status === 'live' ? 'add' : 'del']);
        else { const f = [['title', 'headline'], ['dek', 'standfirst'], ['body', 'story'], ['img', 'picture'], ['date', 'date'], ['tag', 'kind']].filter(([k]) => o[k] !== n[k]).map(x => x[1]);
          if (f.length) out.push([`Edited ${q_(n.title)}: ${f.join(', ')}${o.title !== n.title ? ` (was ${q_(o.title)})` : ''}`, '']); } });
      Object.keys(bi).forEach(id => { if (!ai[id]) out.push([`Deleted the story ${q_(bi[id].title)}`, 'del']); }); }
    else if (s === 'lead') { const n = D.news.find(x => x.id === a); out.push([`Made ${q_(n ? n.title : a)} the lead story on Home`, '']); }
    else if (s === 'pushes') { const seen = {}; (b || []).forEach(p => { seen[p.id] = 1; });
      (a || []).filter(p => !seen[p.id]).forEach(p => out.push([`${p.kind === 'live' ? 'Match alert' : p.at > (r.at + 60000) ? 'Scheduled a notification' : 'Sent a notification'} ${q_(p.title)}${p.kind === 'live' ? '' : ' to ' + E(audName(p.aud))}`, p.kind === 'live' ? 'mt' : 'add'])); }
    else if (s === 'live') { const bl = b || {}, al = a || {};
      Object.keys(Object.assign({}, bl, al)).forEach(i => { const x = bl[i], y = al[i], f = fixture(+i);
        if (x && !y) { out.push([`Reset ${f}: score, clock and timeline cleared`, 'del']); return; }
        const xe = (x && x.ev) || [], ye = (y && y.ev) || [], xp = x ? x.phase : 'pre';
        if (y.phase !== xp && { '1H': 1, '2H': 1 }[y.phase]) out.push([y.phase === '1H' ? `Kicked off ${f}` : `Started the second half, ${f}`, 'mt']);
        ye.forEach((e, j) => { const o = xe[j];
          if (!o || o.join() !== e.join()) { if (o && o[3] === 'G' && e[3] === 'D') out.push([`VAR: ruled out the ${evWords(+i, e)}, ${E(e[9] || '')} · ${f}`, 'del']);
            else if (!o || JSON.stringify(o.slice(0, 7)) !== JSON.stringify(e.slice(0, 7)) || o[3] !== e[3]) { if (!xe.some(z => z.join() === e.join())) out.push([`Added ${e[3] === 'HT' || e[3] === 'FT' ? '' : 'a '}${evWords(+i, e)} · ${f}`, 'mt']); } } });
        xe.forEach(e => { if (!ye.some(z => z.join() === e.join() || (z[1] === e[1] && z[5] === e[5] && z[4] === e[4] && e[3] === 'G' && z[3] === 'D'))) out.push([`Removed the ${evWords(+i, e)} · ${f}`, 'del']); });
        if (x && y && y.phase === xp && x.base === y.base && x.t0 !== y.t0) out.push([`Moved the clock ${y.t0 < x.t0 ? 'on' : 'back'} ${Math.round(Math.abs(x.t0 - y.t0) / 60000)} min · ${f}`, '']); }); }
    else if (s === 'gotm') { const x = b || {}, y = a || {};
      if (x.month !== y.month && y.winner === '' && x.winner) out.push([`Started ${E(y.month)}'s Goal of the Month`, 'add']);
      else { if (!x.winner && y.winner) { const w = (y.goals || []).find(g => g.id === y.winner); out.push([`Published the Goal of the Month winner: ${E(w ? w.player : y.winner)}`, 'add']); }
        else if (x.open !== y.open) out.push([y.open ? 'Reopened Goal of the Month voting' : 'Closed Goal of the Month voting', y.open ? 'add' : 'del']);
        if (x.month !== y.month) out.push([`Goal of the Month: month ${q_(x.month)} → ${q_(y.month)}`, '']);
        if (x.closes !== y.closes) out.push([`Goal of the Month closes ${fmt(y.closes)} (was ${fmt(x.closes)})`, '']);
        if (JSON.stringify(x.goals) !== JSON.stringify(y.goals)) { const xn = (x.goals || []).length, yn = (y.goals || []).length;
          out.push([yn > xn ? 'Added a goal to the shortlist' : yn < xn ? 'Removed a goal from the shortlist' : 'Edited the Goal of the Month shortlist', '']); } } }
    else if (s === 'sponsors') { Object.keys(Object.assign({}, b, a)).forEach(k => { const x = (b || {})[k] || {}, y = (a || {})[k] || {}, nm = SPLSTORE.SLOTS[k] || k;
      if (x.partner !== y.partner) out.push([y.partner ? `${E(nm)} sponsor: ${E(y.partner)}${x.partner ? ` (was ${E(x.partner)})` : ''}` : `Removed ${E(x.partner)} as the ${E(nm)} sponsor`, y.partner ? 'add' : 'del']);
      if (x.from !== y.from || x.to !== y.to) out.push([`${E(nm)} sponsor dates: ${y.from ? fmt(y.from) : '…'} to ${y.to ? fmt(y.to) : '…'}`, '']); }); }
    else if (s === 'shop') { const bx = {}, n0 = out.length; (b || []).forEach(p => { bx[p.id] = p; });
      (a || []).forEach(p => { const o = bx[p.id]; delete bx[p.id]; if (!o) { out.push([`Added ${E(p.name)} to the shop`, 'add']); return; }
        if (o.out !== p.out) out.push([`${E(p.name)}: ${p.out ? 'sold out' : 'back on sale'}`, p.out ? 'del' : 'add']);
        if (o.price !== p.price || o.off !== p.off) out.push([`${E(p.name)}: S$${E(p.price || '?')}${p.off ? ` (−${p.off}%)` : ''}`, '']);
        if (o.url !== p.url) out.push([`${E(p.name)}: ${p.url ? 'new Shopee link' : 'Shopee link removed'}`, '']);
        if (JSON.stringify(o.imgs) !== JSON.stringify(p.imgs)) out.push([`${E(p.name)}: photos changed`, '']);
        if (o.name !== p.name) out.push([`Renamed ${E(o.name)} to ${E(p.name)}`, '']); });
      Object.values(bx).forEach(p => out.push([`Removed ${E(p.name)} from the shop`, 'del']));
      if (out.length === n0 && JSON.stringify(b) !== JSON.stringify(a)) out.push(['Reordered the shop', '']); }
    else if (s === 'shopUrl') out.push(['Changed the Shopee store link', '']);
    else if (s === 'playerPhotos') Object.keys(a || {}).filter(k => (b || {})[k] !== a[k]).forEach(k => { const [c, n] = k.split(':'), p = (SPL.squads[c] || []).find(x => x[0] === +n); out.push([`New photo for ${E(p ? p[1] : k)}`, 'add']); });
    else if (s === 'partners') { const x = b || [], y = a || []; y.forEach((p, j) => { const o = x[j] || {};
      if (o.name !== p.name) out.push([`Partners screen: ${p.name ? E(p.name) : 'empty space'}${o.name ? ` (was ${E(o.name)})` : ''}`, '']);
      else if (o.logo !== p.logo) out.push([`Partners screen: ${p.logo ? 'new logo' : 'removed the logo'} for ${E(p.name || 'space ' + (j + 1))}`, p.logo ? 'add' : 'del']);
      else if (o.tier !== p.tier) out.push([`Partners screen: ${E(p.name)} is now ${E(p.tier)}`, '']); }); }
    else if (s === 'awards') { const bm = {}; ((b || {}).months || []).forEach(m => { bm[m.key] = m; });
      ((a || {}).months || []).forEach(m => { const o = bm[m.key]; delete bm[m.key];
        if (!o) { out.push([`Added ${E(m.month)} to the awards`, 'add']); return; }
        if (o.stage !== m.stage) out.push([m.stage === 'voting' ? `Opened the ${E(m.month)} vote` : m.stage === 'announced' ? `Announced ${E(m.month)}'s winners` : `Moved ${E(m.month)} back to the shortlist`, m.stage === 'shortlist' ? 'del' : 'add']);
        [['potm', 'name', 'Player of the Month'], ['gotm', 'player', 'Goal of the Month']].forEach(([w, nk, lab]) => { const oi = {}; o[w].picks.forEach(x => { oi[x.id] = x; });
          m[w].picks.forEach(x => { const y = oi[x.id]; delete oi[x.id]; if (!y) out.push([`${E(m.month)} ${lab}: shortlisted ${E(x[nk])}`, 'add']);
            else { const f = ['clip', 'from', 'to', 'how', 'write', 'line'].filter(k => (y[k] || '') !== (x[k] || '')); if (f.length) out.push([`${E(m.month)} ${lab}: ${E(x[nk])}, ${f.map(k => ({ clip: 'clip link', from: 'clip start', to: 'clip end', how: 'description', write: 'write-up', line: 'stat line' })[k]).join(', ')}`, '']); } });
          Object.values(oi).forEach(x => out.push([`${E(m.month)} ${lab}: removed ${E(x[nk])}`, 'del'])); });
        if (o.opens !== m.opens || o.closes !== m.closes) out.push([`${E(m.month)} vote dates: ${E(dt(m.opens))} to ${E(dt(m.closes))}`, '']); });
      Object.values(bm).forEach(m => out.push([`Deleted ${E(m.month)} from the awards`, 'del'])); }
    else if (s === 'potm') { /* follows the awards page */ out.push(['Updated Player of the Month in the app', '']); }
    else if (s === 'partnerLook') out.push([`Partners screen look: ${{ light: 'white page', mono: 'white marks on navy', colour: 'colour on tiles' }[a] || E(a)}`, '']);
    if (!out.length) out.push([`Changed ${SECTION[s] || E(s)}`, '']);
    return out;
  }
  // rows from one save share a time and a person: show them as one entry
  function auditEntries(rows) {
    const out = []; rows.slice().sort((x, y) => y.at - x.at).forEach(r => { const last = out[out.length - 1];
      if (last && last.who === r.who && Math.abs(last.at - r.at) < 1500) last.rows.push(r); else out.push({ at: r.at, who: r.who, rows: [r] }); });
    out.forEach(e => { e.sections = [...new Set(e.rows.map(r => SECTION[r.section] || r.section))]; e.lines = [].concat(...e.rows.map(changeLines)); });
    return out;
  }
  let AUD = [];   // the rows, newest first
  async function loadAudit() { if (CL.on) { const r = await CL.pullAudit(); if (r) AUD = r; } else AUD = localAudit().slice().reverse(); }

  // ---------- pages ----------
  // ---------- overview (Hafiz, 5 Nov: the Halvo layout, option B, SPL glow) ----------
  const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
  const firstName = () => { const n = CL.on ? (CL.state.name || CL.state.email || '') : ''; return n ? E(n.replace(/@.*/, '').split(/[\s._]/)[0].replace(/^./, c => c.toUpperCase())) : ''; };
  // count events of one kind into 10 even buckets from the first event to now, for a sparkline
  function series(ev) { const now = Date.now(), from = ev.length ? Math.min(ev[0][0], now - 36e5) : now - 864e5, w = (now - from) / 10, o = new Array(10).fill(0);
    ev.forEach(e => { const j = Math.min(9, Math.max(0, Math.floor((e[0] - from) / w))); o[j]++; }); return o; }
  function spark(col, pts) { const W = 112, H = 42, mx = Math.max(1, ...pts), xy = pts.map((v, j) => `${(j * W / (pts.length - 1)).toFixed(1)} ${(H - 4 - (H - 10) * v / mx).toFixed(1)}`), id = 'sg' + col.slice(1);
    const d = 'M' + xy.join(' L'); return `<svg class="spk" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".45"/><stop offset="1" stop-color="${col}" stop-opacity=".04"/></linearGradient></defs><path d="${d} L${W} ${H} L0 ${H}Z" fill="url(#${id})"/><path d="${d}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg>`; }
  function dial() {
    const pool = TONIGHT.length ? TONIGHT : [ROUND[0]], i = pool.includes(A.dial) ? A.dial : pool[0], m = SPL.matches[i], c = clockOf(i), s = scoreOf(i), R = 86, L = 2 * Math.PI * R;
    let frac = 0, top = m[1] === TODAY ? 'Kick-off today' : 'Kick-off ' + dayName(m[1]), big = kickT(m), sub = E(m[5]);
    if (c.phase === '1H' || c.phase === '2H') { frac = Math.min(1, c.n / 90); top = c.phase === '1H' ? 'First half' : 'Second half'; big = `${s[0]}–${s[1]}`; sub = `<span data-aclock="${i}">${c.label}</span>`; }
    else if (c.phase === 'HT') { frac = .5; top = 'Half time'; big = `${s[0]}–${s[1]}`; sub = 'Back in 15 minutes'; }
    else if (c.phase === 'FT') { frac = 1; top = 'Full time'; big = `${s[0]}–${s[1]}`; sub = E(m[5]); }
    const ang = 2 * Math.PI * frac, dot = frac > 0 && frac < 1 ? `<circle cx="${(100 + R * Math.sin(ang)).toFixed(1)}" cy="${(100 - R * Math.cos(ang)).toFixed(1)}" r="8" fill="#fff"/>` : '';
    const live = c.phase === '1H' || c.phase === '2H';
    return `<div class="g dial"><div class="dhd"><b>${c.phase === 'pre' ? (pool.length > 1 ? 'MW' + m[0] : 'Next kick-off') : live || c.phase === 'HT' ? 'Live now' : 'Full time'}</b><span class="dsw">${(pool.length > 1 ? pool : []).map(j => `<button class="${j === i ? 'on' : ''}" data-dial="${j}">${SPL.matches[j][2]} v ${SPL.matches[j][3]}</button>`).join('')}</span></div>
      <div class="ring"><svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="${R}" fill="none" stroke="var(--track)" stroke-width="10"/>${frac ? `<circle cx="100" cy="100" r="${R}" fill="none" stroke="#E8363D" stroke-width="10" stroke-linecap="round" stroke-dasharray="${L.toFixed(1)}" stroke-dashoffset="${(L * (1 - frac)).toFixed(1)}" transform="rotate(-90 100 100)"/>` : ''}${dot}</svg>
        <div class="c"><small class="${live ? 'live' : ''}">${top}</small><b>${big}</b><span>${sub}</span></div></div>
      <div class="vs">${crest(m[2], 30)}<b>${short(m[2])}</b><span>v</span><b>${short(m[3])}</b>${crest(m[3], 30)}</div>
      <div class="segs">${[['pre', 'Pre-match'], ['1H', '1st half'], ['2H', '2nd half'], ['FT', 'FT']].map(([k, l]) => `<button class="${c.phase === k || (k === '1H' && c.phase === 'HT') ? 'on' : ''}" data-console="${i}">${l}</button>`).join('')}</div></div>`;
  }
  function overview() {
    const st = stats(), drafts = D.news.filter(n => n.status === 'draft').length, slots = Object.keys(D.sponsors).length, unsold = Object.values(D.sponsors).filter(s => !s.partner).length;
    const lead = tableNow()[0], liveN = ROUND.filter(i => ['1H', '2H', 'HT'].includes((D.live[i] || {}).phase)).length, g = D.gotm;
    const day = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-SG', { weekday: 'short' });
    const left = Object.keys(D.live).map(Number).filter(stale);
    const chips = [left.length ? `<button class="chip y" data-console="${left[0]}" style="border:0;cursor:pointer">⚠ ${left.length === 1 ? short(SPL.matches[left[0]][2]) + ' v ' + short(SPL.matches[left[0]][3]) + ' left running' : left.length + ' games left running'}: finish or reset</button>` : '', liveN ? `<span class="chip r">● ${liveN} live now</span>` : (TONIGHT.length ? `<span class="chip r">● ${TONIGHT.length === 1 ? 'A game today' : TONIGHT.length + ' games today'}</span>` : `<span class="chip">Next game ${dayName(SPL.matches[ROUND[0]][1])} ${new Date(SPL.matches[ROUND[0]][1] + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>`), `<span class="chip">${short(lead[0])} top on ${lead[7]}</span>`,
      g.winner ? `<span class="chip">${E(g.month)} winner published</span>` : g.open && g.closes >= TODAY ? `<span class="chip">${E(g.month)} vote closes ${day(g.closes)}</span>` : `<span class="chip y">${E(g.month)} vote closed: publish it</span>`,
      mockTag() + (CL.on ? (CL.state.status === 'live' ? '<span class="chip gr">● Live in the app</span>' : '<span class="chip y">● Offline, changes wait</span>') : '<span class="chip">Demo, this browser only</span>')].join('');
    const later = ROUND.filter(i => !TONIGHT.includes(i)).map(i => SPL.matches[i]), m1 = SPL.matches[TONIGHT[0]];
    const byDay = {}; later.forEach(m => { (byDay[m[1]] = byDay[m[1]] || []).push(`${short(m[2])} v ${short(m[3])}`); });
    const summary = `${m1 ? `${C[m1[2]].short} host ${C[m1[3]].short} at ${E(m1[5])} today, ${kickT(m1)}` : 'No game today'}${Object.keys(byDay).length ? '; ' + Object.entries(byDay).map(([d, l]) => `${relDay(d).toLowerCase() === 'tomorrow' ? 'tomorrow' : 'on ' + dayName(d)}, ${l.join(' and ')}`).join(', then ') : ''}. ` +
      (g.winner ? '' : g.open && g.closes >= TODAY ? `Goal of the Month closes ${fmt(g.closes).replace(/^\w+ /, '')}` : `${E(g.month)}'s vote has closed and is waiting for its winners`) +
      (unsold ? `${g.winner ? '' : ', and '}${unsold} sponsor ${unsold === 1 ? 'slot still has' : 'slots still have'} no partner.` : '.') + (drafts ? ` ${drafts} ${drafts === 1 ? 'story is' : 'stories are'} in draft.` : '');
    const QA = [['push', 'push', '#E8363D', 'Send an alert', 'Goals, kick-off, news'], ['news', 'newnews', '#4A86FF', 'Post a story', drafts ? `${drafts} in draft` : 'Lead story on Home'], ['matchday', 'console', '#3DD68C', 'Run a game live', 'The matchday console'],
      ['votes', 'votes', '#C9A227', g.winner ? 'Start a new month' : 'Publish a winner', `${E(g.month)} awards`], ['sponsors', 'sponsors', '#8B6BFF', 'Fill a sponsor slot', `${unsold} of ${slots} open`], ['app', 'app', '#A9A6C9', 'Open the app', 'See what fans see']];
    const qa = QA.map(([ic, go, col, t, sub]) => { const attr = go === 'newnews' ? 'data-qnews="1"' : go === 'console' ? `data-console="${TONIGHT[0]}"` : go === 'app' ? '' : `data-page="${go}"`;
      const inner = `<i style="--qc:${col}">${icon(ic === 'app' ? 'phone' : ic)}</i><span><b>${t}</b><span>${sub}</span></span>`;
      return go === 'app' ? `<a class="q" href="index.html" target="_blank" rel="noopener">${inner}</a>` : `<button class="q" ${attr}>${inner}</button>`; }).join('');
    // the four counts (Hafiz, 5 Nov, from the Halvo mock): fans, screens today, votes, alerts; all from what the app recorded
    const ev = st.ev, k = kind => ev.filter(e => e[1] === kind), day0 = new Date().setHours(0, 0, 0, 0), wk = 7 * 864e5, now = Date.now();
    const dev = (() => { if (A.mockOn) return mockEvents().dev; if (!CL.on) return ev.map(e => [e[0], CL.device || 'this']); try { const a = JSON.parse(localStorage.getItem('spl-evdev') || '[]'); return Array.isArray(a) ? a : []; } catch (x) { return []; } })();
    const fans = (from, to) => new Set(dev.filter(d => d[0] >= from && d[0] < to).map(d => d[1])).size;
    const fansNow = fans(now - wk, now + 1), fansPrev = fans(now - 2 * wk, now - wk);
    const fanSeries = (() => { const from = now - wk, w = wk / 10; return Array.from({ length: 10 }, (_, j) => fans(from + j * w, from + (j + 1) * w)); })();
    const views = k('view'), vToday = views.filter(e => e[0] >= day0), topV = Object.entries(vToday.reduce((o, e) => { const n = e[2].split(':')[0]; o[n] = (o[n] || 0) + 1; return o; }, {})).sort((x, y) => y[1] - x[1]).slice(0, 2).map(x => ({ home: 'Home', match: 'Match centre', club: 'Club pages', player: 'Players', stats: 'Stats', table: 'Table', matches: 'Fixtures', watch: 'Watch', article: 'News', partners: 'Partners screen', onboard: 'Onboarding', settings: 'Settings', search: 'Search', video: 'Video', pmonth: 'Player of the Month', gotm: 'Goal of the Month' }[x[0]] || x[0]));
    const votes = k('vote'), pushes = k('push'), pl = pushes.filter(e => e[2] === 'live').length;
    const kp = [
      ['Fans in the app', fansNow, fansPrev ? `${fansNow >= fansPrev ? '+' : '−'}${Math.round(Math.abs(fansNow - fansPrev) * 100 / fansPrev)}% vs last week` : fansNow ? 'Phones this week' : 'No phones yet this week', '#E8363D', fanSeries, 'analytics'],
      ['Screens viewed today', vToday.length, topV.length ? topV.join(', then ') : 'None yet today', '#4A86FF', series(views), 'analytics'],
      ['Votes cast', votes.length, `${E(g.month)} awards`, '#C9A227', series(votes), 'votes'],
      ['Alerts delivered', pushes.length, pushes.length ? (pl === pushes.length ? 'Goals and kick-off' : `${pl.toLocaleString()} match, ${(pushes.length - pl).toLocaleString()} news and votes`) : 'None yet', '#3DD68C', series(pushes), 'push']]
      .map(([l, v, sub, col, pts, go]) => `<button class="g kp" data-page="${go}"><span class="l">${l}</span><span class="v">${v.toLocaleString()}</span><span class="s">${sub}</span>${spark(col, pts)}</button>`).join('');
    const fol = {}; ev.filter(e => e[1] === 'tap' && /^(follow|pick):/.test(e[2])).forEach(e => { const c = e[2].split(':')[1]; fol[c] = (fol[c] || 0) + 1; });
    const order = Object.keys(C).sort((x, y) => (fol[y] || 0) - (fol[x] || 0) || C[x].short.localeCompare(C[y].short));
    const tile = c => `<div class="tile"><span class="art" style="${c === 'TPU' ? `background:${C[c].c}` : `background-image:url(assets/banners/${c}.png)`}">${c === 'TPU' ? crest(c, 50) : ''}</span><span class="cap"><b>${short(c)}</b><span>${(fol[c] || 0).toLocaleString()} ${fol[c] === 1 ? 'follow' : 'follows'}</span></span></div>`;
    const recent = auditEntries(AUD).slice(0, 5);
    return `<div class="orow">
        <div class="g ohero"><span class="k">AIA Singapore Premier League · Matchweek 7</span><h1>${greet()}${firstName() ? ', ' + firstName() : ''}</h1>
          <div class="chips">${chips}</div><p class="sum">${summary}</p>
          <span class="k cap">Quick actions</span><div class="qa">${qa}</div></div>
        ${dial()}</div>
      ${ROUND.length ? `<div class="g rstrip"><span class="rsh"><b>Matchweek ${SPL.matches[ROUND[0]][0]}</b><span class="note">${E(rspan())}</span></span>${ROUND.map(i => { const m = SPL.matches[i], c2 = clockOf(i), s2 = scoreOf(i), on = c2.phase !== 'pre'; return `<button class="rg ${m[1] === TODAY ? 'tn' : ''}" data-console="${i}"><span class="lbl ${['1H', '2H'].includes(c2.phase) ? 'live' : ''}">${on ? (c2.phase === 'FT' ? 'Full time' : 'Live · ' + c2.label) : relDay(m[1]) + ' · ' + kickT(m)}</span><span class="rgm">${crest(m[2], 30)}<b>${on ? s2[0] + '–' + s2[1] : 'v'}</b>${crest(m[3], 30)}</span><span class="rgn">${short(m[2])} v ${short(m[3])}</span><span class="note">${E(m[5])}</span></button>`; }).join('')}</div>` : ''}
      <div class="kpis">${kp}</div>
      <div class="g clubs"><div class="chd"><span><b>Clubs</b><span>Follows in the app, from fans' taps</span></span></div><div class="tiles">${order.map(tile).join('')}</div></div>
      <div class="grid2"><div class="panel"><h2>Latest notifications<button class="lnk" data-page="push">All</button></h2>${pushTable(D.pushes.slice(-5).reverse(), true)}</div>
        <div class="panel"><h2>Recent changes<button class="lnk" data-page="activity">Activity</button></h2>${recent.length ? recent.map(e => `<div class="aent sm"><span class="av">${initials(e.who)}</span><div class="abody"><div class="ahead"><b>${whoName(e.who)}</b><span class="note">${E(dayOf(e.at) === 'Today' ? tm(e.at) : hm(e.at))}</span></div><ul class="chg">${e.lines.slice(0, 2).map(l => `<li class="${l[1]}">${l[0]}</li>`).join('')}${e.lines.length > 2 ? `<li class="more">and ${e.lines.length - 2} more</li>` : ''}</ul></div></div>`).join('') : '<p class="note">No changes saved yet.</p>'}</div></div>`;
  }
  // the page's name is in the top bar; under it, what the page does and its main action
  const head = (t, sub, actions) => `<div class="ph"><p>${sub || ''}</p>${actions || ''}</div>`;

  const label = e => e[3] === 'D' ? `<s style="opacity:.6">Goal · ${E(pname(e[8] || e[4], e[5]))}</s> <span class="live">No goal · VAR, ${E(e[9] || 'ruled out')}</span>` : e[3] === 'G' ? `Goal · <b>${E(pname(e[8] || e[4], e[5]))}</b>${e[7] === 'pen' ? ' (pen)' : e[7] === 'og' ? ' (own goal)' : ''}${e[6] ? ` <span class="note">assist ${E(pname(e[4], e[6]))}</span>` : ''}` : e[3] === 'Y' ? `Yellow card · ${E(pname(e[4], e[5]))}` : e[3] === 'R' ? `Red card · ${E(pname(e[4], e[5]))}` : e[3] === 'S' ? `Sub · ${E(pname(e[4], e[5]))} on, ${E(pname(e[4], e[6]))} off` : e[3] === 'HT' ? 'Half time' : 'Full time';
  const mark = e => e[3] === 'D' ? '<span style="width:10px;height:10px;border-radius:50%;border:2px solid #FF6B71;display:inline-block;box-sizing:border-box"></span>' : e[3] === 'G' ? '<span class="gball" style="width:10px;height:10px;border-radius:50%;background:#fff;display:inline-block"></span>' : e[3] === 'Y' ? '<span style="width:8px;height:11px;background:#F5C518;display:inline-block"></span>' : e[3] === 'R' ? '<span style="width:8px;height:11px;background:#E8363D;display:inline-block"></span>' : e[3] === 'S' ? '<span class="ok" style="font-weight:700">⇅</span>' : '';
  // several games at once (Hafiz, 6 Nov): when kick-offs coincide, one official runs them side by side. Each panel is a compact
  // console; tapping Goal, card or Sub on a team opens the entry form inside that panel. The panel sets which game an action is for.
  // ruling a goal out (VAR): pick a common reason or write your own; fans read "VAR rules out X's goal for <reason>."
  const VAR_REASONS = ['offside', 'a foul in the build-up', 'handball', 'the ball out of play', 'a foul on the goalkeeper'];
  function varForm(i, idx) {
    const e = ((D.live[i] || {}).ev || [])[idx]; if (!e) return '';
    const who = pname(e[8] || e[4], e[5]), why = A.varWhy || 'offside';
    return `<div class="mcf varf"><b>Rule out ${E(who)}'s goal (${minText(e)})</b>
      <div class="varr">${VAR_REASONS.map(r => `<button class="${r === why ? 'on' : ''}" data-varr="${E(r)}">${E(r[0].toUpperCase() + r.slice(1))}</button>`).join('')}</div>
      <label class="fld"><span>Reason fans read · your own words if none fits</span><input class="in" id="varWhy" maxlength="40" value="${E(why)}" placeholder="e.g. offside"></label>
      <p class="note" id="varPrev">Fans get: NO GOAL ❌ · VAR rules out ${E(who)}'s goal for <b>${E(why)}</b>.</p>
      <div class="mcc"><span style="flex:1"></span><button class="lnk" data-varno="1">Cancel</button><button class="btn red sm" data-varok="${idx}">Rule out, tell fans</button></div></div>`;
  }
  // Pre-match and Post-match (Hafiz, 9 Nov): the newsroom writes a draft from the facts in the house style (docs/STYLE.md);
  // FAS edits, fills the [BRACKETS] and publishes it as a story, or sends it to News to schedule
  A.pm = A.pm || {};
  const pmKey = (i, kind) => kind + i;
  function reportFacts(i, gen) {
    const m = SPL.matches[i], L = D.live[i] || { ev: [] }, short = k => C[k].short, ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 10 > 3 || [11, 12, 13].includes(n % 100)) ? 0 : n % 10] || 'th');
    const mn = e => e[2] ? `${e[1]}+${e[2]}` : String(e[1]);
    const ev = (L.ev || []).filter(e => e[3] !== 'HT' && e[3] !== 'FT').map(e => { const k = e[4];
      if (e[3] === 'G') return { minute: mn(e), event: e[7] === 'og' ? 'own goal' : e[7] === 'pen' ? 'penalty goal' : 'goal', for: C[k].name, scorer: pname(e[8] || k, e[5]), assist: e[6] ? pname(k, e[6]) : null };
      if (e[3] === 'D') return { minute: mn(e), event: 'goal ruled out after a VAR review', team: C[k].name, player: pname(k, e[5]), reason: e[9] || null };
      if (e[3] === 'Y' || e[3] === 'R') return { minute: mn(e), event: e[3] === 'Y' ? 'yellow card' : 'red card', team: C[k].name, player: pname(k, e[5]) };
      if (e[3] === 'S') return { minute: mn(e), event: 'substitution', team: C[k].name, on: pname(k, e[5]), off: pname(k, e[6]) };
      return null; }).filter(Boolean);
    const sc = (L.ev || []).reduce((a, e) => { if (e[3] === 'G') a[e[4] === m[2] ? 0 : 1]++; return a; }, [0, 0]);
    return { competition: 'AIA Singapore Premier League 2026/27', matchweek: m[0], date: m[1], ground: m[5], home: C[m[2]].name, away: C[m[3]].name, score: `${short(m[2])} ${sc[0]}-${sc[1]} ${short(m[3])}`,
      events_in_order: ev, officials_notes: (L.notes || []).map(SPLNEWS.noteLine), from_the_data: gen ? gen.facts : [], storylines: gen ? gen.story.map(x => x.text) : [],
      background: SPLNEWS.context ? SPLNEWS.context(D, i, L.notes || []) : null };
  }
  function writerPanel(i, kind) {
    if (!window.SPLNEWS) return '';
    const done = D.news.find(n => n.match === i && n.tag === (kind === 'post' ? 'Report' : 'Preview'));
    const gen = kind === 'post' ? SPLNEWS.postMatch(D, i) : SPLNEWS.preMatch(D, i); if (!gen) return '';
    const k = pmKey(i, kind), cur = A.pm[k] || (A.pm[k] = { head: gen.head, dek: gen.dek, body: gen.body });
    const open = (cur.body.match(/\[[A-Z][^\]]*\]/g) || []).filter(x => x !== '[PHOTO]');
    return `<div class="panel pmw" data-pmk="${k}"><h2 style="margin:0">${kind === 'post' ? 'Post-match report' : 'Pre-match preview'}<span class="lbl">${done ? `<span style="color:#3DD68C">${SPLSTORE.isOut(done) ? 'Published' : done.status === 'scheduled' ? 'Scheduled' : 'Draft in News'}</span> · ` : ''}Draft written from the data · house style</span></h2>
      <label class="fld"><span>Headline</span><input class="in" data-pmf="head" value="${E(cur.head)}" maxlength="120"></label>
      <label class="fld"><span>Standfirst</span><input class="in" data-pmf="dek" value="${E(cur.dek)}" maxlength="220"></label>
      <label class="fld"><span>${kind === 'post' ? 'Report · a blank line starts a new paragraph' : 'Preview · shows on Home and in the match centre'}</span><textarea class="in" data-pmf="body" rows="${kind === 'post' ? 14 : 5}">${E(cur.body)}</textarea></label>
      <div class="pm-chips"><span class="lbl">From the data</span>${gen.facts.map(f => `<span class="chip">✓ ${E(f)}</span>`).join('')}</div>
      ${gen.story.length ? `<div class="pm-chips"><span class="lbl">Storylines · tap to add</span>${gen.story.map(s => `<button class="chip st" data-pmadd="${E(s.text)}">+ ${E(s.text)}</button>`).join('')}</div>` : ''}
      ${open.length ? `<p class="note" style="margin:0;color:#F5D76A">To fill before publishing: ${open.map(E).join(' · ')}</p>` : ''}
      ${gen.approx ? '<p class="note" style="margin:0">Minutes for this game come from club reports, so the draft keeps them loose ("in the first half").</p>' : ''}
      ${kind === 'pre' ? `<label class="chk"><input type="checkbox" data-autopre="1" ${D.autoPreview ? 'checked' : ''}> Write every game's preview automatically the evening before, as a draft for approval</label>` : ''}
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${kind === 'post' && D.live[i] && D.live[i].phase === 'FT' ? `<button class="btn sm" data-pmai="${k}" ${A.aiBusy === k ? 'disabled' : ''}>${A.aiBusy === k ? 'Writing… about a minute' : '✦ Write with AI'}</button><span class="note" style="margin:0">${A.aiBusy === k ? '' : 'Opens in News as a draft, with places for photos'}</span>` : ''}<button class="btn2 sm" data-pmre="${k}">↻ Rewrite from the data</button><span style="flex:1"></span>
        ${done ? `<button class="btn2" data-pmopen="${E(done.id)}">Open in News</button>` : `<button class="btn2" data-pmsend="${k}">Schedule in News</button><button class="btn red" data-pmpub="${k}">Publish ${kind === 'post' ? 'report' : 'preview'}</button>`}</div></div>`;
  }
  // automatic previews: at 6pm the evening before (and for anything today still without one), a draft in News
  function autoPreviews() {
    if (!D.autoPreview || !window.SPLNEWS) return;
    const now = new Date(), hh = now.getHours(), z = n => String(n).padStart(2, '0');
    const day = (o) => { const d = new Date(TODAY + 'T12:00:00'); d.setDate(d.getDate() + o); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };
    const due = SPL.matches.map((m, i) => [m, i]).filter(([m, i]) => !m[4] && (m[1] === TODAY || (m[1] === day(1) && hh >= 18)) && !(D.live[i] && D.live[i].phase !== 'pre') && !D.news.some(n => n.match === i && n.tag === 'Preview'));
    if (!due.length) return;
    save(d2 => { due.forEach(([m, i]) => { const g = SPLNEWS.preMatch(d2, i); if (!g) return; d2.news.push({ id: uid('n'), tag: 'Preview', date: TODAY, title: g.head, dek: g.dek, body: g.body, img: '', imgs: [], match: i, at: 0, alert: false, status: 'draft', auto: true }); }); },
      `${due.length} preview${due.length > 1 ? 's' : ''} drafted for approval in News.`);
  }
  setTimeout(autoPreviews, 1200); setInterval(autoPreviews, 15 * 60 * 1000);
  function pmSave(k, live) {
    const kind = k.startsWith('post') ? 'post' : 'pre', i = +k.replace(/^\D+/, ''), cur = A.pm[k], m = SPL.matches[i];
    if (!cur.head.trim()) { flash('Give it a headline.'); render(); return; }
    if (live && /\[(?!PHOTO\])[A-Z][^\]]*\]/.test(cur.body)) { flash('Fill or delete the parts in [BRACKETS] first.'); render(); return; }
    const n = { id: uid('n'), tag: kind === 'post' ? 'Report' : 'Preview', date: TODAY, title: cur.head.trim(), dek: cur.dek.trim(), body: cur.body.replace(/\n\nHow the match unfolded\n\n/, '\n\nHow the match unfolded\n\n'), img: '', imgs: [], match: i, at: live ? (() => { const d = new Date(), z = n => String(n).padStart(2, '0'); return new Date(`${TODAY}T${z(d.getHours())}:${z(d.getMinutes())}:00`).getTime(); })() : 0, alert: false, status: live ? 'live' : 'draft' };
    save(d2 => { d2.news.push(n); if (live && kind === 'post') d2.lead = n.id; }, live ? (kind === 'post' ? 'Report published and made the lead story.' : 'Preview published: it shows on Home and in the match centre.') : 'Sent to News as a draft: add photos and pick a time.');
    if (!live) { A.page = 'news'; A.news = n.id; A.nFor = null; A.nWhenT = 'schedule'; } render();
  }

  // Attendance and Guess the crowd (Hafiz, 7 Nov): fans guess tonight's crowd before half time; at half time the official
  // enters the turnstile count, the closest guess wins, an alert goes to both clubs' fans and the big screen shows the winner.
  // Phase 1: the attendance only; the guessing (GUESS) comes in Phase 2 with e-ticket check-in.
  const GUESS = false;
  const crowdOf = i => D.crowd[i] || { open: false, prize: '', attendance: null, guesses: 0, winner: null };
  const localGuesses = i => { try { return (JSON.parse(localStorage.getItem('spl-guesses') || '{}')[i]) || []; } catch (e) { return []; } };
  const CROWDN = {};
  // Fans' Player of the Match (Hafiz, 10 Nov): from 70' the official sees four suggested nominees (from either side;
  // goals, assists, clean-sheet keepers, goals ruled out, captains) and can swap any of them, defenders listed first.
  // Voting opens to every signed-in fan at 75' (with an alert to the game's followers) and closes at the final whistle.
  const POTM_FROM = 75;
  // notes for the report (Hafiz, 10 Nov, option A): one line per moment the console doesn't record (chances, saves,
  // woodwork, how a goal came); the AI writer uses only these, the console, the table and the storylines
  // Line-ups (Hafiz, 14 Nov, option C): the official photographs each side's team sheet, the `lineup` function reads it,
  // and the result lands in two boxes to check against the paper and correct by hand. Typing the shirt numbers works
  // with no photo at all. Published to store.live[i].xi; the app shows them in the match centre's Line-ups tab.
  const luFold = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  const luSame = (a, b) => { const x = luFold(a), y = luFold(b); return !!x && (x === y || x.split(' ').some(t => t.length > 2 && y.split(' ').includes(t))); };
  const luText = a => (a || []).map(e => Array.isArray(e) ? `${e[0] || ''} ${e[1]}`.trim() : e).join(', ');
  function luDraft(i) {
    if (!A.lu || A.lu.i !== i) A.lu = { i, alert: true, c: {} };
    const m = SPL.matches[i], saved = (D.live[i] || {}).xi || {};
    [m[2], m[3]].forEach(k => { if (!A.lu.c[k]) A.lu.c[k] = { xi: saved[k] ? luText(saved[k].xi) : '', bench: saved[k] ? luText(saved[k].bench) : '', busy: false, err: '', note: '', read: false, unsure: {} }; });
    return A.lu;
  }
  // "1 4 5 14" or "1, 4, 5" are squad numbers; "77 Ali Abu" is a player the squad list doesn't have yet
  function luParse(k, text) {
    const sq = SPL.squads[k], out = [];
    String(text || '').split(/[,;\n]+/).forEach(ch => { ch = ch.trim(); if (!ch) return; const mm = ch.match(/^(\d{1,3})\s+(\D.*)$/);
      if (mm) { const no = +mm[1], q = sq.find(x => x[0] === no), nm = mm[2].trim().slice(0, 40); out.push(q && luSame(q[1], nm) ? { no, name: q[1], kind: 'squad' } : { no, name: nm, kind: 'own', was: q ? q[1] : '' }); }
      else if (/^[\d\s]+$/.test(ch)) ch.split(/\s+/).forEach(t => { const no = +t, q = sq.find(x => x[0] === no); out.push(q ? { no, name: q[1], kind: 'squad' } : { no, name: '', kind: 'unknown' }); });
      else out.push({ no: 0, name: ch.slice(0, 40), kind: 'own', was: '' }); });
    return out;
  }
  function luCheck(i, k) {
    const c = luDraft(i).c[k], xi = luParse(k, c.xi), bench = luParse(k, c.bench), seen = {}, key = e => e.no ? 'n' + e.no : 'x' + luFold(e.name);
    xi.concat(bench).forEach(e => { seen[key(e)] = (seen[key(e)] || 0) + 1; }); xi.concat(bench).forEach(e => { e.dup = seen[key(e)] > 1; });
    const all = xi.concat(bench), unknown = all.find(e => e.kind === 'unknown'), dup = all.find(e => e.dup);
    const problem = !all.length ? '' : unknown ? `${unknown.no} isn't in the squad. Type the name after the number, like "${unknown.no} Ali Abu".` : dup ? `${dup.no || dup.name} is listed twice.` : xi.length !== 11 ? `${xi.length} of 11 starters.` : '';
    return { xi, bench, any: all.length > 0, problem };
  }
  function luState(i) {
    const m = SPL.matches[i], a = luCheck(i, m[2]), b = luCheck(i, m[3]);
    if (a.problem) return { ok: false, msg: `${C[m[2]].short}: ${a.problem}` }; if (b.problem) return { ok: false, msg: `${C[m[3]].short}: ${b.problem}` };
    if (!a.any && !b.any) return { ok: false, msg: 'Add a photo of each team sheet, or type the shirt numbers.' };
    return { ok: true, msg: !a.any ? `${C[m[2]].short}'s line-up can follow later.` : !b.any ? `${C[m[3]].short}'s line-up can follow later.` : '' };
  }
  const luCount = ch => `<span class="lbl ${ch.xi.length === 11 ? 'ok' : ch.any ? 'warn' : ''}">${ch.xi.length} of 11 starters</span><span class="lbl">${ch.bench.length} ${ch.bench.length === 1 ? 'substitute' : 'substitutes'}</span>`;
  const luChips = (list, st, c) => list.map(e => { const bad = e.kind === 'unknown' || e.dup, unsure = c.unsure[e.no ? 'n' + e.no : 'x' + luFold(e.name)], warn = !bad && (unsure || e.kind === 'own');
    const tip = e.kind === 'unknown' ? 'Not in the squad: type the name after the number' : e.dup ? 'Listed twice' : e.kind === 'own' ? (e.was ? `Not as the squad list has it: ${e.was} wears ${e.no}` : 'Not in the squad list: shown as typed') : unsure ? 'The reader was not sure: check against the paper' : '';
    return `<span class="luc ${st}${bad ? ' bad' : warn ? ' warn' : ''}" title="${E(tip)}"><b>${e.no || '–'}</b>${E(e.name || 'Not in the squad')}${warn ? '<i>check</i>' : ''}</span>`; }).join('');
  // what the reader returned, turned into the text the boxes hold; anything it doubted, or that doesn't fit the squad list, is flagged
  function luFromRead(k, list, c) {
    const sq = SPL.squads[k];
    return (list || []).map(r => { const byNo = r.number ? sq.find(q => q[0] === r.number) : null, byName = r.name ? sq.find(q => luSame(q[1], r.name)) : null;
      if (byNo && (!r.name || luSame(byNo[1], r.name))) { if (!r.sure || !r.name) c.unsure['n' + byNo[0]] = 1; return String(byNo[0]); }
      if (byName && !byNo) { c.unsure['n' + byName[0]] = 1; return String(byName[0]); }
      if (!r.sure) c.unsure[r.number ? 'n' + r.number : 'x' + luFold(r.name)] = 1;
      return `${r.number || ''} ${r.name || ''}`.trim(); }).filter(Boolean).join(', ');
  }
  function lineupPanel(i) {
    const m = SPL.matches[i], lu = luDraft(i), pub = (D.live[i] || {}).xi || {}, any = Object.keys(pub).length > 0, st = luState(i);
    const sent = D.pushes.some(p => p.kind === 'live' && p.match === i && /^Line-ups are in/.test(p.title || ''));
    const col = k => { const c = lu.c[k], ch = luCheck(i, k);
      return `<div class="lu-col"><div class="lu-h">${crest(k, 22)}<b>${E(C[k].short)}</b><span data-lucount="${k}" style="display:contents">${luCount(ch)}</span></div>
        <div class="lu-ph"><label class="btn2 sm"${c.busy ? ' style="opacity:.6;pointer-events:none"' : ''}><input type="file" accept="image/*" hidden data-lusheet="${k}">${c.busy ? 'Reading the photo…' : 'Photo of the team sheet'}</label>
          <span class="note">${c.busy ? 'About 20 seconds.' : c.err ? `<span style="color:#FF8A8F">${E(c.err)}</span>` : c.read ? `Read from the photo. Check every name against the paper.${c.note ? ' ' + E(c.note) : ''}` : 'Or type the shirt numbers below.'}</span></div>
        <label class="fld"><span>Starters · shirt numbers</span><textarea class="in" rows="2" data-luf="${k}:xi" placeholder="1 4 5 14 …">${E(c.xi)}</textarea></label>
        <div class="lu-chips" data-luchips="${k}:xi">${luChips(ch.xi, 'xi', c)}</div>
        <label class="fld"><span>Substitutes</span><textarea class="in" rows="2" data-luf="${k}:bench" placeholder="18 2 20 …">${E(c.bench)}</textarea></label>
        <div class="lu-chips" data-luchips="${k}:bench">${luChips(ch.bench, 'sub', c)}</div></div>`; };
    return `<div class="panel lu"><h2>Line-ups <span class="lbl">${any ? 'Published · fans see them in the match centre' : 'From the team sheets · fans see them in the match centre'}</span></h2>
      <div class="lu-cols">${col(m[2])}${col(m[3])}</div>
      <div class="lu-foot"><button class="btn red" data-lupub="${i}" ${st.ok ? '' : 'disabled'}>${any ? 'Publish the changes' : 'Publish the line-ups'}</button>
        <label class="chk"><input type="checkbox" id="luAlert" ${sent ? 'disabled' : lu.alert ? 'checked' : ''}><span>${sent ? 'Followers were told when the line-ups went in' : 'Tell followers of both clubs: “Line-ups are in”'}</span></label>
        <span class="note" data-lumsg="1" style="margin:0">${E(st.msg)}</span><span style="flex:1"></span>${any ? `<button class="lnk danger" data-luclear="${i}">Take the line-ups down</button>` : ''}</div></div>`;
  }
  function notesPanel(i) {
    const L = D.live[i]; if (!L || L.phase === 'pre') return ''; const c = clockOf(i), notes = L.notes || [];
    const now = c.phase === 'FT' || c.phase === 'HT' ? '' : String(Math.min(c.n, c.cap || 90)) + (c.n > (c.cap || 90) ? '+' + (c.n - c.cap) : '');
    return `<div class="panel"><h2>Notes for the report <span class="lbl">One line per moment · chances, saves, woodwork, how a goal came</span></h2>
      ${notes.map(([m, t, tags], j) => `<div style="display:grid;grid-template-columns:64px 1fr 28px;gap:10px;align-items:start;margin-bottom:10px"><span class="in" style="display:flex;align-items:center">${E(m)}'</span><div style="display:flex;flex-direction:column;gap:6px;min-width:0"><span class="in" style="display:flex;align-items:center">${E(t)}</span>${noteTags(i, j, tags || SPLNEWS.tagNames(t, [SPL.matches[i][2], SPL.matches[i][3]]))}</div><button class="lnk" data-notedel="${i}:${j}" title="Remove" style="margin-top:12px">×</button></div>`).join('')}
      <div style="display:grid;grid-template-columns:64px 1fr auto;gap:10px;align-items:center"><input class="in" id="noteM" value="${E(now)}" placeholder="Min" inputmode="numeric"><input class="in" id="noteT" maxlength="240" placeholder="Write it as you'd say it, e.g. mustapic tipped satsukida's shot over. Names are matched to the squads"><button class="btn2" data-noteadd="${i}">Add</button></div>
      <p class="note" style="margin-top:10px">The writer gets each player's full name, club and position from the tags. Tap a tag to swap the player, × to drop it. It only uses what's here, the console and the table.</p></div>`;
  }
  // a note's tags, made now for a note written before tagging existed
  const ntOf = (d2, i, j) => { const nt = d2.live[i].notes[j]; if (!Array.isArray(nt[2])) nt[2] = SPLNEWS.tagNames(nt[1], [SPL.matches[i][2], SPL.matches[i][3]]); return nt[2]; };
  // a note's tags (Hafiz, 10 Nov, option C): a chip per player; a name that fits two players asks which; tap to swap
  function noteTags(i, j, tags) {
    const m = SPL.matches[i], sides = [m[2], m[3]], ed = A.ntag && A.ntag.i === i && A.ntag.j === j ? A.ntag.t : null;
    const pick = t => `<select class="in" data-ntsel="${i}:${j}:${t}" style="height:30px;padding:0 10px;font-size:12px;width:auto"><option value="">${t < 0 ? 'Tag a player…' : 'Swap for…'}</option>${sides.map(k => `<optgroup label="${E(C[k].name)}">${SPL.squads[k].map(p => `<option value="${k}:${p[0]}">${p[0]} ${E(p[1])}</option>`).join('')}</optgroup>`).join('')}${t >= 0 ? '<option value="-">Drop this tag</option>' : ''}</select>`;
    const chip = (t, x) => { const p = SPLNEWS.tagged(t); if (!p) return ''; if (ed === x) return pick(x);
      return `<span class="ntag"><button data-ntedit="${i}:${j}:${x}" title="Swap"><span class="crest cr-${p.k}"></span><b>${E(p.name)}</b><span>${E(p.short)} · #${p.shirt}</span></button><button data-ntdel="${i}:${j}:${x}" title="Drop">×</button></span>`; };
    const ask = (t, x) => { const [q, ...opts] = t.slice(1).split('|');
      return `<span class="ntag ask">${E(q[0].toUpperCase() + q.slice(1))}: which one?</span>${opts.map(o => { const p = SPLNEWS.tagged(o); return p ? `<button class="ntag opt" data-ntpick="${i}:${j}:${x}:${o}"><span class="crest cr-${p.k}"></span>${E(p.name)}<span>#${p.shirt} · ${E(p.position)}</span></button>` : ''; }).join('')}<button class="ntag opt" data-ntdel="${i}:${j}:${x}">Neither</button>`; };
    return `<div class="ntags">${tags.map((t, x) => t[0] === '?' ? ask(t, x) : chip(t, x)).join('')}${ed === -1 ? pick(-1) : `<button class="lnk" data-ntedit="${i}:${j}:-1" style="font-size:12px">+ Tag a player</button>`}</div>`;
  }
  function potmPanel(i) {
    const L = D.live[i], c = clockOf(i); if (!L || !(L.phase === '2H' && c.n >= 70 || L.phase === 'FT' || L.potmOpen)) return '';
    const m = SPL.matches[i], noms = A.potmDraft && A.potmDraft.i === i ? A.potmDraft.noms : (L.potm && L.potm.length ? L.potm : SPLSTORE.potmSuggest(i, L.ev, POTM_FROM));
    const order = { DF: 0, GK: 1, MF: 2, FW: 3 };
    const opts = (cur) => [m[2], m[3]].map(k => `<optgroup label="${E(C[k].short)}">${SPL.squads[k].slice().sort((a, b) => (order[a[2]] ?? 4) - (order[b[2]] ?? 4) || a[0] - b[0]).map(p => `<option value="${k}|${E(p[1])}" ${cur[0] === p[1] && cur[1] === k ? 'selected' : ''}>${E(p[1])} · ${p[2]} · #${p[0]}</option>`).join('')}</optgroup>`).join('');
    const state = L.phase === 'FT' ? 'Closed at the final whistle' : L.potmOpen ? 'Open to fans · closes at the final whistle' : `Opens to fans at ${POTM_FROM}'`;
    const confirmed = L.potm && L.potm.length, saved = confirmed ? L.potm : null;
    const draft = A.potmDraft && A.potmDraft.i === i, same = saved && JSON.stringify(noms) === JSON.stringify(saved);
    const dup = new Set(noms.map(x => x && x[0])).size < 4;
    const problem = dup ? 'Pick four different players.' : '';
    return `<div class="panel"><h2>Fans' Player of the Match<span class="lbl">${state}</span></h2>
      <p class="note" style="margin-bottom:12px">${confirmed ? 'Nominees confirmed.' : `Suggested from the match so far. Swap any of them, then confirm; if you don't, these go out at ${POTM_FROM}'.`}</p>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">${[0, 1, 2, 3].map(j => `<select class="in" data-potmnom="${i}:${j}">${opts(noms[j] || [])}</select>`).join('')}</div>
      ${saved ? `<p class="note" style="margin-top:10px">In the app now: <b style="color:var(--ink)">${saved.map(x => E(x[0]) + ' (' + E(C[x[1]].short) + ')').join(', ')}</b></p>` : ''}
      ${problem ? `<p style="margin-top:8px;font:600 13px 'Inter',sans-serif;color:#FF9AA0">Not saved: ${problem}</p>` : draft && !same ? `<p style="margin-top:8px;font:600 13px 'Inter',sans-serif;color:#F5C518">Changed, not saved yet. Press ${confirmed ? 'Update' : 'Confirm'} nominees.</p>` : ''}
      <div style="display:flex;gap:10px;align-items:center;margin-top:12px">${L.phase === 'FT' ? '' : `<button class="btn" data-potmok="${i}" ${problem ? 'disabled style="opacity:.45"' : ''}>${confirmed ? 'Update nominees' : 'Confirm nominees'}</button>`}<span class="note">One vote per signed-in fan, at the ground or at home. The split stays hidden until full time.</span></div></div>`;
  }
  function crowdPanel(i) {
    const m = SPL.matches[i], x = crowdOf(i), n = CL.on ? CROWDN[i] : localGuesses(i).length;
    if (CL.on && CROWDN[i] === undefined) { CROWDN[i] = 0; CL.crowdCount(i).then(v => { if (v !== null) { CROWDN[i] = v; if (A.page === 'matchday' && !document.activeElement.matches('input,textarea,select')) render(); } }); }
    const prize = x.prize || `A signed ${C[m[2]].short} jersey`;
    if (!GUESS && x.attendance === null) return `<div class="panel crowdp"><h2>Attendance<span class="lbl">Usually at half time</span></h2>
      <div class="crow"><label class="fld" style="width:220px"><span>Official crowd (turnstiles)</span><input class="in" id="crAtt" inputmode="numeric" placeholder="e.g. 2431"></label>
        <button class="btn red" data-crowdpub="${i}">Publish attendance</button><span style="flex:1"></span><a class="btn2 sm" href="stadium.html?match=${i}" target="_blank" rel="noopener">Big screen ↗</a></div>
      <p class="note" style="margin:0">Publishing shows tonight's crowd on the match page and the big screen, adds it to the Crowds table in Stats and tells both clubs' fans.</p></div>`;
    if (x.attendance !== null) return `<div class="panel crowdp done"><h2>Attendance<span class="lbl">Published</span></h2>
      <div class="crow"><span><span class="lbl">Official crowd</span><b class="big" style="font-size:40px">${x.attendance.toLocaleString()}</b></span>
      ${!GUESS ? '' : x.winner ? `<span><span class="lbl">Guess the crowd winner</span><b>${E(x.winner.name)}</b><span class="note">guessed ${x.winner.guess.toLocaleString()} · ${x.winner.off.toLocaleString()} off · ${x.guesses.toLocaleString()} guesses</span></span>` : '<span class="note">No guessing game this match.</span>'}
      <span style="flex:1"></span><a class="btn2 sm" href="stadium.html?match=${i}" target="_blank" rel="noopener">Big screen ↗</a><button class="lnk" data-crowdedit="${i}">Change</button></div></div>`;
    return `<div class="panel crowdp"><h2>Attendance<span class="lbl">${x.open ? 'Guess the crowd is open · closes when you publish' : 'Guess the crowd is off'}</span></h2>
      <div class="crow"><label class="chk"><input type="checkbox" data-crowdopen="${i}" ${x.open ? 'checked' : ''}> Guess the crowd</label>
        <label class="fld" style="flex:1;min-width:200px"><span>Prize</span><input class="in" id="crPrize" value="${E(x.prize)}" placeholder="${E(prize)}" maxlength="80"></label>
        <span><span class="lbl">Guesses</span><b class="big" style="font-size:24px">${(n || 0).toLocaleString()}</b></span></div>
      <div class="crow"><label class="fld" style="width:220px"><span>Official crowd (turnstiles)</span><input class="in" id="crAtt" inputmode="numeric" placeholder="e.g. 2431"></label>
        <button class="btn red" data-crowdpub="${i}">${x.open ? 'Publish, tell the winner' : 'Publish attendance'}</button><span style="flex:1"></span><a class="btn2 sm" href="stadium.html?match=${i}" target="_blank" rel="noopener">Big screen ↗</a></div>
      <p class="note" style="margin:0">Usually at half time. Publishing closes the guessing, picks the closest guess (the earlier one on a tie), alerts both clubs' fans and puts the result on the big screen. A winner's name shows only if they agreed to it.</p></div>`;
  }
  async function publishCrowd(i) {
    const att = parseInt(String(val('crAtt')).replace(/[^0-9]/g, ''), 10); if (!(att > 0 && att < 100000)) { flash('Enter the official crowd, e.g. 2431.'); render(); return; }
    const x = crowdOf(i), m = SPL.matches[i]; let w = null, count = 0;
    if (GUESS && x.open) { if (CL.on) { const r = await CL.crowdWinner(i, att); if (r) { count = +r.guesses || 0; if (r.name !== undefined && r.guess !== undefined) w = { name: r.show_name && r.name ? r.name : `A ${(C[r.club] || C[m[2]]).short} fan`, guess: r.guess, off: r.off }; } }
      else { const gs = localGuesses(i); count = gs.length; const b = gs.slice().sort((a, c) => Math.abs(a.guess - att) - Math.abs(c.guess - att) || a.at - c.at)[0]; if (b) w = { name: b.show && b.name ? b.name : `A ${(C[b.club] || C[m[2]]).short} fan`, guess: b.guess, off: Math.abs(b.guess - att) }; } }
    const prize = x.prize || `a signed ${C[m[2]].short} jersey`;
    if (!confirm(`Publish tonight's crowd as ${att.toLocaleString()}${w ? ` and announce ${w.name} (guessed ${w.guess.toLocaleString()}) as the winner` : ''}? Fans are told.`)) return;
    save(d2 => { d2.crowd[i] = { open: false, prize: x.prize, attendance: att, guesses: count, winner: w, at: Date.now() };
      d2.pushes.push({ id: uid('p'), at: Date.now(), title: `Tonight's crowd: ${att.toLocaleString()} 🏟️ ${short(m[2])} v ${short(m[3])}`,
        body: w ? `${w.name} guessed ${w.guess.toLocaleString()} and wins ${prize.replace(/^A /, 'a ')}. How close were you?` : `Thank you for coming to ${m[5]}.`, aud: 'all', kind: 'live', match: i }); },
      w ? 'Published. The winner is on the big screen.' : 'Attendance published.');
  }
  function miniConsole(i) {
    const m = SPL.matches[i], L = D.live[i] || { phase: 'pre', ev: [] }, c = clockOf(i), s = scoreOf(i), live = c.phase === '1H' || c.phase === '2H';
    const next = { pre: ['Kick off', '1H'], '1H': ['Half time', 'HT'], HT: ['Second half', '2H'], '2H': ['Full time', 'FT'], FT: null }[L.phase];
    const evs = (L.ev || []).map((e, x) => [e, x]).sort((a, b) => (b[0][0] - a[0][0]) || (b[0][1] - a[0][1]) || ((b[0][2] || 0) - (a[0][2] || 0)));
    const f = A.qf && A.qf.i === i ? A.qf : null, nm = short;
    let form = '';
    if (f) { const og = A.evType === 'G' && A.evOg, opp = A.evTeam === m[2] ? m[3] : m[2], squad = SPL.squads[og ? opp : A.evTeam].slice().sort((a, b) => a[0] - b[0]);
      const opts = none => (none ? `<option value="">${none}</option>` : '') + squad.map(p => `<option value="${p[0]}">${p[0]} · ${E(p[1])}</option>`).join('');
      const nowMin = c.phase === 'pre' ? 1 : c.n;
      form = `<div class="mcf"><b>${{ G: 'Goal', Y: 'Yellow card', R: 'Red card', S: 'Substitution' }[A.evType]} · ${crest(A.evTeam, 16)} ${short(A.evTeam)}</b>
        <div class="mcg"><label class="fld"><span>${A.evType === 'S' ? 'On' : og ? `Scored by (${short(opp)})` : 'Player'}</span><select class="in" id="evP">${opts()}</select></label>
        ${A.evType === 'S' ? `<label class="fld"><span>Off</span><select class="in" id="evA">${opts()}</select></label>` : A.evType === 'G' && !og ? `<label class="fld"><span>Assist</span><select class="in" id="evA">${opts('None')}</select></label>` : ''}
        <label class="fld" style="max-width:90px"><span>Minute</span><input class="in" id="evM" inputmode="numeric" data-evauto="${i}" value="${nowMin > (c.cap || 90) ? c.cap + '+' + (nowMin - c.cap) : nowMin}"></label></div>
        <div class="mcc">${A.evType === 'G' ? `<label class="chk"><input type="checkbox" id="evPen" ${og ? 'disabled' : ''}> Pen</label><label class="chk"><input type="checkbox" id="evOg" ${og ? 'checked' : ''}> Own goal</label>` : ''}<label class="chk"><input type="checkbox" id="evPush" ${A.evType === 'G' || A.evType === 'R' ? 'checked' : ''}> Alert</label><span style="flex:1"></span><button class="lnk" data-qclose="1">Cancel</button><button class="btn sm" data-addev="1">Add</button></div></div>`; }
    const team = k => `<div class="mct">${crest(k, 20)}<span>${nm(k)}</span><span class="mcb">${[['G', 'Goal'], ['Y', 'Yellow'], ['R', 'Red'], ['S', 'Sub']].map(([t, l]) => `<button class="${t}" data-qadd="${k}|${t}" ${L.phase === 'pre' || L.phase === 'FT' ? 'disabled' : ''}>${l}</button>`).join('')}</span></div>`;
    return `<div class="g mc ${live ? 'on' : ''}" data-gi="${i}">
      <div class="mch"><span class="lbl">${m[1] === TODAY ? 'Today' : dayName(m[1]).slice(0, 3)} · ${E(m[5])}</span><span class="lbl ${live ? 'live' : ''}">${{ pre: 'Not started', '1H': 'First half', HT: 'Half time', '2H': 'Second half', FT: 'Full time' }[c.phase]}</span></div>
      <div class="mcs">${crest(m[2], 36)}<span class="mcn">${nm(m[2])}</span><span class="mcx"><b>${s[0]}–${s[1]}</b><i class="${live ? 'live' : ''}" data-aclock="${i}">${c.label}</i></span><span class="mcn r">${nm(m[3])}</span>${crest(m[3], 36)}</div>
      <div class="mck">${next ? `<button class="btn sm ${L.phase === 'pre' ? 'red' : ''}" data-phase="${next[1]}">${next[0]}</button>` : ''}${live ? '<button class="btn2 sm" data-nudge="-1">−1 min</button><button class="btn2 sm" data-nudge="1">+1 min</button>' + jumps(c, ' sm') : ''}</div>
      ${team(m[2])}${team(m[3])}${form}
      <div class="mctl">${evs.length ? evs.slice(0, 6).map(([e, x]) => `<div class="tl"><span class="big" style="font-size:15px;color:var(--muted)">${minText(e)}</span><span style="display:flex;justify-content:center">${mark(e)}</span><span>${e[4] ? crest(e[4], 14) + ' ' : ''}${label(e)}</span>${e[3] === 'HT' || e[3] === 'FT' ? '<span></span>' : `<span style="display:flex;gap:10px">${e[3] === 'G' ? `<button class="lnk danger" data-var="${x}">VAR</button>` : ''}<button class="lnk" data-delev="${x}">Remove</button></span>`}</div>`).join('') : '<p class="note">Nothing yet.</p>'}${evs.length > 6 ? `<p class="note">and ${evs.length - 6} earlier</p>` : ''}</div>
      ${A.varEv != null && A.live === i ? varForm(i, A.varEv) : ''}
    </div>`;
  }
  function multiday() {
    const games = A.multi.filter(i => SPL.matches[i]);
    return head('Matchday console', 'Games side by side: each panel is its own console. Tap Goal, a card or Sub on a team to enter it.', '<button class="btn2 sm" data-multi="0">One game</button>') + `
      <div class="mcpick tabs"><span class="lbl">Games</span>${ROUND.map(j => { const mm = SPL.matches[j], on = games.includes(j); return `<button class="stab ${on ? 'on' : ''}" data-mpick="${j}" ${!on && games.length >= 4 ? 'disabled' : ''}>${mm[1] === TODAY ? 'Today' : dayName(mm[1]).slice(0, 3)} · ${short(mm[2])} v ${short(mm[3])}</button>`; }).join('')}</div>
      <div class="mcgrid n${games.length}">${games.map(miniConsole).join('')}</div>
      <p class="note">Each game keeps its own clock and alerts. Open the app in another window to watch them land.</p>`;
  }
  // the demo game (Hafiz, 10 Nov): play any fixture now or at a set time (the FAS meeting), whatever its real date.
  // Only that fixture moves; the app marks it "Demo game" with the real date. Clear it and everything is as scheduled.
  function demoPanel() {
    const dm = D.demo, z = n => String(n).padStart(2, '0'), loc = t => { const d = new Date(t); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`; };
    if (dm && SPL.matches[dm.i]) { const m = SPL.matches[dm.i], o = SPLSTORE.demoOf(dm.i) || { date: m[1], status: m[7] };
      return `<div class="panel demo"><span class="lbl">Demo game</span><span><b>${E(C[m[2]].short)} v ${E(C[m[3]].short)}</b> plays ${E(new Date(dm.at).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }))}. The app marks it as a demo, with the real fixture: ${E(dayName(o.date))} ${E(new Date(o.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))}, ${E(String(o.status).replace(/^\w+ /, ''))}.</span><span style="flex:1"></span><button class="btn2 sm" data-democlear="1">Back to the real date</button></div>${realPanel()}`; }
    const nx = new Date(); nx.setMinutes(0, 0, 0); nx.setHours(nx.getHours() + 1);
    const fx = SPL.matches.map((m, j) => [m, j]).filter(([m, j]) => !m[4] && m[1] >= TODAY && !String(m[7] || '').startsWith('Postponed') && m[0] <= SPLSTORE.roundOf(TODAY) + 1);
    return `<div class="panel demo"><span class="lbl">Demo game</span><span class="note" style="margin:0">Play a fixture at any time, say for a presentation:</span>
      <select class="in" id="demoI" style="width:auto">${fx.map(([m, j]) => `<option value="${j}" ${j === A.live ? 'selected' : ''}>${E(C[m[2]].short)} v ${E(C[m[3]].short)} · ${E(new Date(m[1] + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }))}</option>`).join('')}</select>
      <input class="in" type="datetime-local" id="demoAt" value="${loc(nx)}" style="width:auto"><button class="btn sm" data-demoset="1">Set</button></div>${realPanel()}`;
  }
  // a real finished game for the AI writer (Hafiz, 11 Nov): Matchweek 6's Sunday games, from their sourced timelines
  // (SPL.feeds) and what the sources add (REALNOTES), loaded as finished in the console without sending any alert
  const REALNOTES = { 22: [['37', 'Azim Akbar fouled Glenn Kweh for the penalty', ['BKF:2', 'LCS:11']]] };
  function realPanel() {
    const ids = Object.keys(SPL.feeds || {}).map(Number).filter(i => SPL.matches[i]);
    if (!ids.length) return '';
    const sc = i => SPL.feeds[i].reduce((a, e) => { if (e[3] === 'G') a[e[4] === SPL.matches[i][2] ? 0 : 1]++; return a; }, [0, 0]);
    return `<div class="panel demo"><span class="lbl">Real game</span><span class="note" style="margin:0">Load a finished game with its real events, then Write with AI:</span>
      <select class="in" id="realI" style="width:auto">${ids.map(i => { const m = SPL.matches[i], s2 = sc(i); return `<option value="${i}">${E(short(m[2]))} ${s2[0]}–${s2[1]} ${E(short(m[3]))} · MW${m[0]}, ${E(new Date(m[1] + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))}</option>`; }).join('')}</select>
      <button class="btn2 sm" data-realload="1">Load</button></div>`;
  }
  // clearing test runs (Hafiz, 10 Nov): before the FAS meeting, wipe the games run in the console, the alerts, the stories
  // added since the start and the example numbers, while the shop, photos, sponsors, awards and the demo game stay
  function clearPanel() {
    const seedIds = SPLSTORE.seed().news.map(n => n.id), added = D.news.filter(n => !seedIds.includes(n.id)), games = Object.keys(D.live).length + Object.keys(D.crowd || {}).length;
    const row = (k, on, t, sub) => `<label class="chk" style="align-items:flex-start"><input type="checkbox" id="clr-${k}" ${on ? 'checked' : ''}><span style="display:flex;flex-direction:column;gap:2px"><b style="font-weight:600">${t}</b><span class="note" style="margin:0">${sub}</span></span></label>`;
    return `<div class="panel"><h2>Clear test runs</h2><p class="note">Before a demo: clears what testing left behind. The shop, player photos, sponsors, partners, awards and the demo game stay as they are.</p>
      <div style="display:flex;flex-direction:column;gap:10px;margin:12px 0">
        ${row('games', true, `Games run in the console (${Object.keys(D.live).length})`, 'Scores, timelines, notes, Player of the Match nominees and crowds. The fixtures go back to not started.')}
        ${row('alerts', true, `Alerts sent (${D.pushes.length})`, 'Every alert in Notifications, match alerts and the ones written by hand.')}
        ${row('news', true, `Stories added since the start (${added.length})`, 'Match reports, previews, AI drafts, roundups and winners\' stories. The original stories stay.')}
        ${row('mock', A.mockOn, 'Example numbers', 'The made-up fortnight of app use in Overview and Analytics. Off shows only what phones recorded.')}
        ${row('stats', true, 'Analytics recorded in this browser', 'Screens and taps logged while testing.')}</div>
      <button class="btn red" data-cleartest="1">Clear what's ticked</button></div>`;
  }
  // Fixtures (Hafiz, 11 Nov, option B): the whole season by matchweek, results and what's to come. Four rounds at a time
  // around the round in play (Earlier / This round / Later); a filter or a club shows the whole season.
  function fixtures() {
    const R = SPLNEWS.results(D), now = SPLSTORE.roundOf(TODAY), maxMw = Math.max(...SPL.matches.map(m => m[0]));
    const f = A.fxF || 'all', club = A.fxClub || '', from = A.fxFrom || Math.max(1, now - 2), whole = f !== 'all' || club;
    const fmtD = d => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const state = (m, i) => { const r = R.find(x => x.i === i), L = D.live[i], post = /^Postponed/.test(m[7] || '');
      if (L && ['1H', 'HT', '2H'].includes(L.phase) && !stale(i)) return ['live', r]; if (r) return [r.console ? 'console' : 'played', r]; return [post ? 'post' : 'up', null]; };
    const keep = (m, i) => { const [st] = state(m, i); if (club && m[2] !== club && m[3] !== club) return false;
      return f === 'all' || (f === 'res' && (st === 'played' || st === 'console')) || (f === 'up' && (st === 'up' || st === 'live')) || (f === 'post' && st === 'post'); };
    const row = (m, i) => { const [st, r] = state(m, i), chip = { played: '<span class="chip">Played</span>', console: '<span class="chip gr">In the console</span>', live: '<span class="chip r">● Live</span>', up: '<span class="chip">Upcoming</span>', post: `<span class="chip y">${E(m[7])}</span>` }[st];
      const mid = r ? `<b class="fx-sc">${r.s[0]}–${r.s[1]}</b>` : `<span class="fx-ko">${E(String(m[7] || '').replace(/^Postponed.*$/, 'TBC').replace(/^\w+ /, ''))}</span>`;
      const mv = SPLSTORE.moveOf(i), go = st === 'played' ? `<a class="lnk" href="index.html?embed&match=${i}" target="_blank" rel="noopener">In the app ↗</a>` : `<button class="lnk" data-console="${i}">Console</button>${st === 'console' || st === 'live' ? '' : `<button class="btn2 sm" data-mvopen="${i}">Move</button>`}`;
      return `<div class="fx-row"><span class="note">${E(fmtD(m[1]))}${mv && mv.status === 'moved' ? `<br><s style="opacity:.7">${E(fmtD(mv.was))}</s>` : ''}</span><span class="fx-t r">${E(short(m[2]))}${crest(m[2], 22)}</span>${mid}<span class="fx-t">${crest(m[3], 22)}${E(short(m[3]))}</span><span class="note fx-v">${E(m[5])}</span><span class="fx-a">${chip}${go}</span></div>`; };
    const mws = [...new Set(SPL.matches.map(m => m[0]))].sort((a, b) => a - b).filter(w => whole || (w >= from && w < from + 4));
    const blocks = mws.map(w => { const ms = SPL.matches.map((m, i) => [m, i]).filter(([m, i]) => m[0] === w && keep(m, i)).sort((a, b) => a[0][1].localeCompare(b[0][1]) || a[1] - b[1]); if (!ms.length) return '';
      const ds = ms.map(([m]) => m[1]).sort(), d0 = new Date(ds[0] + 'T12:00:00'), d1 = new Date(ds[ds.length - 1] + 'T12:00:00'), dm = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      return `<div class="panel fx-mw ${w === now ? 'now' : ''}"><h2>Matchweek ${w}<span class="lbl">${dm(d0)}${ds[0] !== ds[ds.length - 1] ? ' – ' + dm(d1) : ''}${w === now ? ' · this round' : ''}</span></h2>${ms.map(([m, i]) => row(m, i)).join('')}</div>`; }).join('');
    return head('Fixtures', `The whole 2026/27 season: ${SPL.matches.length} games, ${R.length} played.`) + `
      <div class="fx-bar"><div class="tabs">${[['all', 'All'], ['res', 'Results'], ['up', 'Upcoming'], ['post', 'Postponed']].map(([k, l]) => `<button class="stab ${f === k ? 'on' : ''}" data-fxf="${k}">${l}</button>`).join('')}</div>
        <select class="in" id="fxClub" style="width:auto;height:36px"><option value="">Every club</option>${Object.keys(C).map(k => `<option value="${k}" ${club === k ? 'selected' : ''}>${E(C[k].name)}</option>`).join('')}</select>
        <span style="flex:1"></span>${whole ? '<span class="note">The whole season</span>' : `<button class="btn2 sm" data-fxmw="-4" ${from <= 1 ? 'disabled' : ''}>‹ Earlier</button><button class="btn2 sm" data-fxmw="0">This round</button><button class="btn2 sm" data-fxmw="4" ${from + 4 > maxMw ? 'disabled' : ''}>Later ›</button>`}</div>
      <div class="fx-list">${blocks || '<div class="panel"><p class="note">No games match.</p></div>'}</div>${mvPanel()}`;
  }
  // moving a game (Hafiz, 11 Nov, option B): a side panel; postponed (date to follow), moved, or back on as scheduled
  const time24 = t => { const x = String(t || '').match(/(\d+)\.(\d+)\s*(AM|PM)/i); if (!x) return '19:30'; const h = +x[1] % 12 + (/PM/i.test(x[3]) ? 12 : 0); return `${String(h).padStart(2, '0')}:${x[2]}`; };
  const time12 = v => { const [h, mi] = String(v || '19:30').split(':').map(Number); return `${h % 12 || 12}.${String(mi || 0).padStart(2, '0')}${h < 12 ? 'AM' : 'PM'}`; };
  const dLong = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  function mvText(i, x) { const m = SPL.matches[i], o = SPLSTORE.moveOf(i), was = o ? o.was : m[1], wasT = String((o ? o.wasStatus : m[7]) || '').replace(/^\w+ /, ''), g = `${short(m[2])} v ${short(m[3])}`, r = x.reason.trim().replace(/\.$/, '');
    if (x.status === 'post') return { title: `${g} is postponed ⏸️`, body: `${r ? r + '. ' : ''}New date to follow.` };
    if (x.status === 'moved') return { title: `${g} moves to ${dLong(x.date)} 📅`, body: `Kick-off ${time12(x.time)} at ${x.venue}.${r ? ' ' + r + '.' : ''}` };
    return { title: `${g} is back on ✅`, body: `As scheduled: ${dLong(was)}, ${wasT}.` }; }
  function mvPanel() {
    const x = A.mv; if (!x || !SPL.matches[x.i]) return ''; const m = SPL.matches[x.i], o = SPLSTORE.moveOf(x.i), t = mvText(x.i, x), venues = [...new Set(SPL.matches.map(y => y[5]).filter(Boolean))].sort();
    return `<div class="mv-dim" data-mvclose="1"></div><div class="g mv-panel"><div style="display:flex;align-items:center"><b style="font-size:18px">Move a game</b><span style="flex:1"></span><button class="lnk" data-mvclose="1">Close</button></div>
      <div class="mv-game">${crest(m[2], 28)}<b>${E(short(m[2]))} v ${E(short(m[3]))}</b>${crest(m[3], 28)}<span style="flex:1"></span><span class="note" style="margin:0;text-align:right">${o ? `Scheduled ${E(dLong(o.was))}, ${E(String(o.wasStatus).replace(/^\w+ /, ''))}` : `${E(dLong(m[1]))} · ${E(String(m[7] || '').replace(/^\w+ /, ''))}`}</span></div>
      <label class="fld"><span>Status</span><select class="in" id="mvS"><option value="post" ${x.status === 'post' ? 'selected' : ''}>Postponed, new date to follow</option><option value="moved" ${x.status === 'moved' ? 'selected' : ''}>Moved to a new date</option>${o ? `<option value="none" ${x.status === 'none' ? 'selected' : ''}>Back on as scheduled</option>` : ''}</select></label>
      <label class="fld"><span>New date</span><input class="in" type="date" id="mvD" value="${E(x.date)}" ${x.status === 'moved' ? '' : 'disabled'}></label>
      <label class="fld"><span>Kick-off</span><input class="in" type="time" id="mvT" value="${E(x.time)}" ${x.status === 'moved' ? '' : 'disabled'}></label>
      <label class="fld"><span>Ground</span><select class="in" id="mvV" ${x.status === 'none' ? 'disabled' : ''}>${venues.map(v => `<option ${v === x.venue ? 'selected' : ''}>${E(v)}</option>`).join('')}</select></label>
      <label class="fld"><span>Reason fans read · optional</span><input class="in" id="mvR" maxlength="140" value="${E(x.reason)}" placeholder="e.g. what FAS has announced" ${x.status === 'none' ? 'disabled' : ''}></label>
      <label class="chk"><input type="checkbox" id="mvA" ${x.alert ? 'checked' : ''}> Alert both clubs' followers</label>
      <label class="chk"><input type="checkbox" id="mvN" ${x.story ? 'checked' : ''}> Draft a Fixture update story in News</label>
      <div class="mv-see"><span class="lbl">What fans see</span><span>${x.alert ? `<b>Alert:</b> ${E(t.title)} ${E(t.body)}` : '<b>No alert.</b>'}</span>
        <span><b>In the app:</b> ${x.status === 'post' ? 'the game shows Postponed, with the reason, in Season, the club pages and the match centre.' : x.status === 'moved' ? `the game moves to ${E(x.date ? dLong(x.date) : '[DATE]')} everywhere, with "was ${E(dLong(o ? o.was : m[1]))}" beside it; the countdown and kick-off reminders follow.` : 'the game goes back to its scheduled date and kick-off.'}</span></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:auto"><button class="btn2" data-mvclose="1">Cancel</button><button class="btn red" data-mvsave="1">${x.alert ? 'Save and tell fans' : 'Save'}</button></div></div>`;
  }
  function matchday() {
    if (A.multi && A.multi.length > 1) return multiday();
    const i = A.live, m = SPL.matches[i], L = D.live[i] || { phase: 'pre', ev: [] }, c = clockOf(i), s = scoreOf(i);
    if (!A.evTeam || (A.evTeam !== m[2] && A.evTeam !== m[3])) A.evTeam = m[2];
    const opp = A.evTeam === m[2] ? m[3] : m[2], og = A.evType === 'G' && A.evOg;
    const squad = SPL.squads[og ? opp : A.evTeam].slice().sort((a, b) => a[0] - b[0]);
    const opts = (sel, none) => (none ? `<option value="">${none}</option>` : '') + squad.map(p => `<option value="${p[0]}" ${sel === p[0] ? 'selected' : ''}>${p[0]} · ${E(p[1])}</option>`).join('');
    const next = { pre: ['Kick off', '1H'], '1H': ['Half time', 'HT'], HT: ['Start second half', '2H'], '2H': ['Full time', 'FT'], FT: null }[L.phase];
    const nowMin = c.phase === 'pre' ? 1 : c.n;
    const evs = (L.ev || []).slice().sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]) || ((a[2] || 0) - (b[2] || 0)));
    return head('Matchday console', 'What a match official enters at the ground goes straight to every phone: score, clock, goals, cards, changes.', `<button class="btn2 sm" data-multi="1">Side by side</button>`) + `
      ${demoPanel()}${stale(i) ? `<div class="panel lr"><b>⚠ Left running since ${E(new Date(L.t0).toLocaleString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }))}</b><span class="note">Fans don't see it: the app ignores a game still running four hours after kick-off. Reset it, or end it with Full time if it was real.</span><span style="display:flex;gap:8px"><button class="btn red sm" data-resetmatch="1">Reset this game</button>${L.phase === '2H' ? '<button class="btn2 sm" data-phase="FT">Full time</button>' : ''}</span></div>` : ''}
      <div class="tabs">${consoleGames().map(j => { const mm = SPL.matches[j]; return `<button class="stab ${j === i ? 'on' : ''}" data-live="${j}">${stale(j) ? '⚠ Left running' : !ROUND.includes(j) ? 'MW' + mm[0] : mm[1] === TODAY ? 'Today' : dayName(mm[1]).slice(0, 3)} · ${short(mm[2])} v ${short(mm[3])}</button>`; }).join('')}</div>
      <div class="row" style="gap:24px">
        <div style="flex:1;display:flex;flex-direction:column;gap:16px;min-width:0">
          <div class="panel" style="display:flex;flex-direction:column;gap:16px">
            <div style="display:flex;justify-content:space-between" class="lbl"><span>${fmt(m[1])} · ${E(m[5])}</span><span class="${c.phase === '1H' || c.phase === '2H' ? 'live' : ''}">${{ pre: 'Not started', '1H': 'First half', HT: 'Half time', '2H': 'Second half', FT: 'Full time' }[c.phase]}</span></div>
            <div class="score"><div class="t">${crest(m[2], 64)}<span class="d" style="font-size:18px">${C[m[2]].name}</span></div><div style="display:flex;flex-direction:column;align-items:center;gap:6px"><span class="big" style="font-size:72px">${s[0]}–${s[1]}</span><span class="big ${c.phase === '1H' || c.phase === '2H' ? 'live' : ''}" style="font-size:28px" data-aclock="${i}">${c.label}</span></div><div class="t">${crest(m[3], 64)}<span class="d" style="font-size:18px">${C[m[3]].name}</span></div></div>
            <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">${next ? `<button class="btn ${L.phase === 'pre' ? 'red' : ''}" data-phase="${next[1]}">${next[0]}</button>` : ''}${c.phase === '1H' || c.phase === '2H' ? '<button class="btn2" data-nudge="-1">Clock −1 min</button><button class="btn2" data-nudge="1">Clock +1 min</button>' + jumps(c, '') : ''}${L.phase !== 'pre' ? '<button class="lnk danger" data-resetmatch="1" style="margin-left:8px">Reset this game</button>' : ''}</div>
          </div>
          ${L.phase === 'FT' ? writerPanel(i, 'post') : L.phase === 'pre' ? writerPanel(i, 'pre') : ''}
          ${lineupPanel(i)}${notesPanel(i)}${potmPanel(i)}${crowdPanel(i)}
          <div class="panel" style="display:flex;flex-direction:column;gap:14px;${L.phase === 'pre' ? 'opacity:.45;pointer-events:none' : ''}">
            <h2 style="margin:0">Add to the match</h2>
            <div class="tabs" style="gap:24px">${[['G', 'Goal'], ['Y', 'Yellow card'], ['R', 'Red card'], ['S', 'Substitution']].map(([k, l]) => `<button class="stab ${A.evType === k ? 'on' : ''}" data-evtype="${k}">${l}</button>`).join('')}</div>
            <div class="seg">${[m[2], m[3]].map(k => `<button class="${A.evTeam === k ? 'on' : ''}" data-evteam="${k}">${crest(k, 22)}${C[k].name}</button>`).join('')}</div>
            <div class="grid3">
              <label class="fld"><span>${A.evType === 'S' ? 'Coming on' : og ? `Scored by (${E(C[opp].short)})` : 'Player'}</span><select class="in" id="evP">${opts(null)}</select></label>
              ${A.evType === 'G' && og ? '<span></span>' : A.evType === 'G' ? `<label class="fld"><span>Assist</span><select class="in" id="evA">${opts(null, 'No assist')}</select></label>` : A.evType === 'S' ? `<label class="fld"><span>Going off</span><select class="in" id="evA">${opts(null)}</select></label>` : '<span></span>'}
              <label class="fld"><span>Minute</span><input class="in" id="evM" data-evauto="${i}" value="${nowMin > (c.cap || 90) ? (c.cap + '+' + (nowMin - c.cap)) : nowMin}" inputmode="numeric" placeholder="e.g. 34 or 45+2"></label>
            </div>
            <div style="display:flex;align-items:center;gap:22px;flex-wrap:wrap">${A.evType === 'G' ? `<label class="chk"><input type="checkbox" id="evPen" ${og ? 'disabled' : ''}> Penalty</label><label class="chk"><input type="checkbox" id="evOg" ${og ? 'checked' : ''}> Own goal${og ? ` <span class="note">by a ${E(C[opp].short)} player, counts for ${E(C[A.evTeam].short)}</span>` : ''}</label>` : ''}<label class="chk"><input type="checkbox" id="evPush" ${A.evType === 'G' || A.evType === 'R' ? 'checked' : ''}> Send an alert to fans</label><span style="flex:1"></span><button class="btn" data-addev="1">Add ${{ G: 'goal', Y: 'yellow card', R: 'red card', S: 'substitution' }[A.evType]}</button></div>
          </div>
          <div class="panel"><h2>Timeline<span class="lbl">${evs.length} ${evs.length === 1 ? 'entry' : 'entries'}</span></h2>${evs.length ? evs.slice().reverse().map(e => `<div class="tl"><span class="big" style="font-size:18px;color:var(--muted)">${minText(e)}</span><span style="display:flex;justify-content:center">${mark(e)}</span><span>${e[4] ? crest(e[4], 16) + ' ' : ''}${label(e)}</span>${e[3] === 'HT' || e[3] === 'FT' ? '<span></span>' : `<span style="display:flex;gap:14px;align-items:center">${e[3] === 'G' && A.varEv !== (L.ev || []).indexOf(e) ? `<button class="lnk danger" data-var="${(L.ev || []).indexOf(e)}">No goal (VAR)</button>` : ''}<button class="lnk" data-delev="${(L.ev || []).indexOf(e)}">Remove</button></span>`}</div>${A.varEv === (L.ev || []).indexOf(e) && e[3] === 'G' ? varForm(i, A.varEv) : ''}`).join('') : '<p class="note">Nothing yet. Kick off, then add goals, cards and changes as they happen.</p>'}</div>
          <p class="note">Possession, shots and corners need a data provider or a stats spotter; this console covers what a match official sees. Team sheets are confirmed from each club's submitted line-up in the full build.</p>
        </div>
        <div><div class="phone-cap"><span class="lbl">The app, live</span><button class="lnk" data-reloadphone="1">Reload</button></div><div class="phone"><iframe id="phone" src="index.html?embed&match=${i}" title="App preview"></iframe></div></div>
      </div>`;
  }

  const TAGS = ['Report', 'Preview', 'Roundup', 'Review', 'Fixtures', 'Club news', 'Announcement', 'Interview'];
  const IMGS = [['', 'No image'], ['bn-DERBY', 'Eastern Derby poster'], ['bn-SAILORS', 'Sailors celebration'], ['ph-MW6R', 'Matchweek 6: Tanjong Pagar v Jurong'], ['ph-MW6P', 'Matchweek 5: Jurong v Tampines'], ['ph-MW5R', 'Matchweek 5: Young Lions v Balestier'], ['ph-MW5P', 'Matchweek 5 preview photo'], ['ph-MW4R', 'Matchweek 4 roundup photo'], ['ph-MW4P', 'Matchweek 3: Tanjong Pagar v Tampines'], ['ph-MW3R', 'Matchweek 3 roundup photo'], ['ph-SPL', 'SPL logo'], ['R6-1', 'MW6: Tanjong Pagar v Jurong (1)'], ['R6-2', 'MW6: Tanjong Pagar v Jurong (2)'], ['R6-3', 'MW6: Hougang v Young Lions (1)'], ['R6-4', 'MW6: Hougang v Young Lions (2)'], ['R6-5', 'MW6: Balestier v Sailors (1)'], ['R6-6', 'MW6: Balestier v Sailors (2)'], ['R6-7', 'MW6: Tampines v Geylang (1)'], ['R6-8', 'MW6: Tampines v Geylang (2)']];
  const IMG_URL = SPLSTORE.IMG;
  // News (Hafiz, 9 Nov, option A): the content calendar for the week, then the stories; a story takes up to six photos (the
  // app changes them every 3 seconds) and goes out now, at a scheduled time, or stays a draft
  const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const hmS = t => new Date(t).toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase();
  const nWhen = n => n.status === 'scheduled' && n.at ? n.at : n.at || new Date(n.date + 'T09:00:00').getTime();
  const nState = n => n.status === 'draft' ? ['Draft', '#A9A6C9'] : n.status === 'scheduled' && !SPLSTORE.isOut(n) ? ['Scheduled', '#4A86FF'] : ['Published', '#3DD68C'];
  // the season's storylines, worked out from every result: what the newsroom should be writing about this week
  function storyPanel() {
    if (!window.SPLNEWS) return '';
    const L = SPLNEWS.storylines(D).slice(0, 8), tag = { title: 'Title race', bottom: 'The bottom', scorers: 'Scoring chart', run: 'Form', first: 'First win', milestone: 'Milestone' };
    const mw = SPLNEWS.latestMw(D), has = mw && D.news.some(n => n.tag === 'Roundup' && n.title.includes('Matchweek ' + mw + ':'));
    return `<div class="panel"><h2 style="margin:0;display:flex;align-items:center;gap:10px;flex-wrap:wrap">Storylines<span class="lbl" style="white-space:nowrap">Updates as games finish</span><span style="flex:1"></span>${SPLNEWS.nextMw(D) ? `<button class="btn2 sm" data-mwprev="${SPLNEWS.nextMw(D)}">Draft the Matchweek ${SPLNEWS.nextMw(D)} preview</button>` : ''}${mw ? `<button class="btn sm" data-airound="${mw}" ${A.aiBusy === 'ru' + mw ? 'disabled' : ''}>${A.aiBusy === 'ru' + mw ? 'Writing the roundup… a few minutes' : `✦ Write the Matchweek ${mw} roundup with AI`}</button><button class="btn2 sm" data-roundup="${mw}">${has ? 'Template of the Matchweek ' + mw + ' roundup again' : 'Template of the Matchweek ' + mw + ' roundup'}</button>` : ''}</h2>
      <div class="stl">${L.map((s, j) => `<div class="stc"><span class="lbl">${tag[s.kind] || 'Story'} · ${s.clubs.map(k => `<span class="crest cr-${k}" style="width:14px;height:14px;display:inline-block;vertical-align:-2px"></span>`).join('')}</span><b>${E(s.head)}</b><span class="note">${E(s.text)}</span><button class="lnk" data-storydraft="${j}">Draft a story →</button></div>`).join('')}</div></div>`;
  }
  function calendar() {
    const base = new Date(TODAY + 'T12:00:00'), mon = new Date(base); mon.setDate(base.getDate() - ((base.getDay() + 6) % 7) + 7 * (A.calWk || 0));
    const days = Array.from({ length: 7 }, (_, k) => { const d = new Date(mon); d.setDate(mon.getDate() + k); return dayKey(d); });
    const items = {}; const add = (k, h) => { (items[k] = items[k] || []).push(h); };
    D.news.forEach(n => { const t = nWhen(n), [lbl, col] = nState(n); add(dayKey(t), [t, `<button class="ci" draggable="true" data-dragnews="${E(n.id)}" data-editnews="${E(n.id)}" style="--c:${col}">${E(n.title)}<small>${hmS(t)} · story · ${lbl.toLowerCase()}</small></button>`]); });
    // a game's automatic alerts (kick-off, goals, half and full time, the vote) are one line per game and day: the calendar
    // is for planning, the Notifications page lists each one
    const grp = {}; D.pushes.forEach(p => { if (p.kind === 'live' && Number.isInteger(p.match) && SPL.matches[p.match]) { const k = dayKey(p.at) + '|' + p.match; (grp[k] = grp[k] || []).push(p); }
      else add(dayKey(p.at), [p.at, `<button class="ci" data-page="push" style="--c:#E8363D">${E(p.title)}<small>${hmS(p.at)} · alert</small></button>`]); });
    Object.entries(grp).forEach(([k, ps]) => { const m = SPL.matches[+k.split('|')[1]], a = ps[0].at, z = ps[ps.length - 1].at;
      add(k.split('|')[0], [a, `<button class="ci" data-page="push" style="--c:#E8363D">${E(short(m[2]))} v ${E(short(m[3]))}<small>${ps.length} match ${ps.length === 1 ? 'alert' : 'alerts'} · ${hmS(a)}${ps.length > 1 ? '–' + hmS(z) : ''}</small></button>`]); });
    SPL.matches.forEach(m => { if (days.includes(m[1])) add(m[1], [(() => { const t = String(m[7] || '').match(/(\d+)\.(\d+)\s*(AM|PM)/i); return new Date(`${m[1]}T${t ? String(+t[1] % 12 + (/PM/i.test(t[3]) ? 12 : 0)).padStart(2, '0') + ':' + t[2] : '19:30'}:00`).getTime(); })(), `<span class="ci fx">${E(short(m[2]))} v ${E(short(m[3]))}<small>${E(String(m[7] || '').replace(/^\w+ /, ''))} · match</small></span>`]); });
    const rng = `${new Date(days[0] + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(days[6] + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    return `<div class="panel cal"><div class="cal-h"><h2 style="margin:0">Content calendar<span class="lbl">${rng}</span></h2><span style="flex:1"></span><button class="btn2 sm" data-calwk="-1">‹</button><button class="btn2 sm" data-calwk="0">This week</button><button class="btn2 sm" data-calwk="1">›</button></div>
      <div class="cal-w">${days.map(k => `<div class="cal-d ${k === TODAY ? 'today' : ''}" data-dropday="${k}"><span class="cal-dh">${new Date(k + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</span>${(items[k] || []).sort((x, y) => x[0] - y[0]).map(x => x[1]).join('')}</div>`).join('')}</div>
      <div class="cal-k"><span style="--c:#4A86FF">Scheduled</span><span style="--c:#3DD68C">Published</span><span style="--c:#A9A6C9">Draft</span><span style="--c:#E8363D">Alert</span><span style="--c:rgba(255,255,255,.3)">Match</span><span style="flex:1"></span><span class="note">Drag a story to another day, or hold it on ‹ › for another week · click to edit</span></div></div>`;
  }
  function news() {
    const list = D.news.slice().sort((a, b) => nWhen(b) - nWhen(a));
    const n = A.news === 'new' ? { id: '', tag: 'Announcement', date: TODAY, title: '', dek: '', body: '', img: '', imgs: [], status: 'draft', at: 0, alert: false } : D.news.find(x => x.id === A.news);
    if (n && A.nFor !== A.news) { A.nFor = A.news; A.nImgs = SPLSTORE.picsOf(n).slice(); A.nPos = (n.pos || []).slice(0, A.nImgs.length); A.nDraft = null; A.nWhenT = n.status === 'scheduled' ? 'schedule' : n.status === 'draft' && n.id ? 'draft' : 'now'; }
    const dr = n && A.nDraft ? A.nDraft : {}, pick = (k, v) => dr[k] !== undefined ? dr[k] : v;
    const nv = n ? Object.assign({}, n, { title: pick('title', n.title), dek: pick('dek', n.dek), body: pick('body', n.body), tag: pick('tag', n.tag), alert: pick('alert', n.alert) }) : null;
    const when = A.nWhenT || 'now', at = n && n.at ? new Date(n.at) : new Date(new Date(TODAY + 'T09:00:00').getTime() + 864e5);
    const dv = (A.nDraft && A.nDraft.day) || dayKey(at), tv = (A.nDraft && A.nDraft.time) || `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
    // which [PHOTO] each picture fills (Hafiz, 12 Nov): photo 2 fills the first slot, and so on, named by the section it sits in
    const slots = (() => { const ps = String((nv && nv.body) || '').split(/\n\s*\n/).map(x => x.trim()).filter(Boolean), out = []; let sec = '';
      ps.forEach((x, j) => { if (x === '[PHOTO]') out.push(sec || (ps[j - 1] || '').split(' ').slice(0, 5).join(' ') + '…'); else if (x.length < 70 && !/[.:!?”]$/.test(x) && !/^\[/.test(x) && !/\|/.test(x)) sec = x; }); return out; })();
    const pics = (A.nImgs || []).map((k, j, all) => `<div class="pt" style="background-image:url(${SPLSTORE.picUrl(k)});background-position:${(A.nPos || [])[j] || '50% 50%'}">${j ? (slots[j - 1] ? `<b class="pt-s" title="${E(slots[j - 1])}">${j} · ${E(slots[j - 1])}</b>` : slots.length ? '<b class="pt-s">No slot · cover</b>' : '') : '<b>Cover</b>'}<button class="pt-f" data-picframe="${j}" title="Choose what stays in view">Frame</button><span class="pt-a">${j ? `<button data-picmv="${j}:-1" title="Move left">‹</button>` : ''}${j < all.length - 1 ? `<button data-picmv="${j}:1" title="Move right">›</button>` : ''}<button data-picdel="${j}" title="Remove">×</button></span></div>`).join('');
    return head('News', 'Plan the week, then write: stories in the app\'s News tab, the lead story on Home, and search.', '<button class="btn" data-newnews="1">New story</button>') + storyPanel() + calendar() + `
      <div class="row" style="gap:24px">
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:16px">
          ${n ? `<div class="panel" style="display:flex;flex-direction:column;gap:14px"><h2 style="margin:0">${n.id ? 'Edit story' : 'New story'}${n.id ? `<span class="lbl" style="color:${nState(n)[1]}">${nState(n)[0]}${n.status === 'scheduled' && !SPLSTORE.isOut(n) ? ' · ' + new Date(n.at).toLocaleString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''}</span>` : ''}</h2>
            <div class="fld"><span>Photos · up to 12 · the first is the cover · the rest go where [PHOTO] sits in the story, in order (or, with no [PHOTO], they change every 3 seconds on the cover)${slots.length ? ` · <b style="color:var(--ink)">${slots.length} [PHOTO] ${slots.length === 1 ? 'slot' : 'slots'}, ${Math.max(0, slots.length - Math.max(0, (A.nImgs || []).length - 1)) || 'none'} still empty${Math.max(0, (A.nImgs || []).length - 1) < slots.length ? ': next is ' + E(slots[Math.max(0, (A.nImgs || []).length - 1)]) : ''}</b>` : ''}</span><div class="pics">${pics}${(A.nImgs || []).length < 12 ? `<label class="padd"><input type="file" id="nFiles" accept="image/*" multiple hidden><b>+</b>Add photos<small>from this computer</small></label>` : ''}</div>
              <div style="display:flex;gap:8px;align-items:center;margin-top:8px"><select class="in" id="nLib" style="max-width:320px"><option value="">Or add one from the league's library…</option>${IMGS.filter(([k]) => k).map(([k, l]) => `<option value="${k}">${E(l)}</option>`).join('')}</select></div></div>
            <div class="grid3"><label class="fld"><span>Kind</span><select class="in" id="nTag">${TAGS.map(t => `<option ${t === nv.tag ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
            <label class="fld"><span>Headline</span><input class="in" id="nTitle" value="${E(nv.title)}" maxlength="120"></label>
            <label class="fld"><span>Standfirst · one or two lines under the headline</span><input class="in" id="nDek" value="${E(nv.dek)}" maxlength="220"></label>
            <label class="fld"><span>Story · a blank line starts a new paragraph</span><textarea class="in" id="nBody" rows="8">${E(nv.body)}</textarea></label>
            <div class="fld"><span>When</span><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="wseg">${[['now', 'Now'], ['schedule', 'Schedule'], ['draft', 'Draft']].map(([k, l]) => `<button class="${when === k ? 'on' : ''}" data-nwhen="${k}">${l}</button>`).join('')}</span>
              ${when === 'schedule' ? `<input class="in" type="date" id="nDay" value="${dv}" style="width:170px"><input class="in" type="time" id="nTime" value="${tv}" style="width:120px">` : ''}
              ${when !== 'draft' ? `<label class="chk"><input type="checkbox" id="nAlert" ${nv.alert ? 'checked' : ''}> Send an alert when it goes live</label>` : ''}</div></div>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn" data-savenews="${when}">${when === 'now' ? (n.status === 'live' && n.id ? 'Save' : 'Publish now') : when === 'schedule' ? 'Schedule' : 'Save draft'}</button>${n.id && SPLSTORE.isOut(n) ? `<button class="btn2" data-lead="${E(n.id)}" ${D.lead === n.id ? 'disabled' : ''}>${D.lead === n.id ? 'Lead story on Home' : 'Make it the lead story'}</button><button class="btn2" data-notifynews="${E(n.id)}">Send as an alert</button>` : ''}${n.id ? `<span style="flex:1"></span><button class="lnk" style="color:#FF9AA0" data-delnews="${E(n.id)}">Delete</button>` : ''}</div></div>` : ''}
          <div class="panel"><table class="tbl"><thead><tr><th style="width:150px">Status</th><th>Story</th><th style="width:110px">When</th><th style="width:60px"></th></tr></thead><tbody>${list.map(x => { const [lbl, col] = nState(x), t = nWhen(x); return `<tr class="click ${n && n.id === x.id ? 'sel' : ''}" data-editnews="${E(x.id)}"><td class="lbl" style="color:${col}">${lbl}${(x.imgs || []).length > 1 ? ` · ${x.imgs.length} photos` : ''}</td><td><div style="display:flex;flex-direction:column;gap:2px"><span class="lbl">${E(x.tag)}${D.lead === x.id ? ' · lead story' : ''}</span><span>${E(x.title)}</span></div></td><td class="note">${new Date(t).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })}${x.status === 'scheduled' ? '<br>' + hmS(t) : ''}</td><td><button class="lnk">Edit</button></td></tr>`; }).join('')}</tbody></table></div>
        </div>
        <div><div class="phone-cap"><span class="lbl">${n ? (n.id && SPLSTORE.isOut(n) ? 'This story in the app, with your changes' : 'Preview: not in the app yet') : 'News in the app'}</span><button class="lnk" data-reloadphone="1">Reload</button></div><div class="phone"><iframe id="phone" src="index.html?embed${n ? '&article=' + encodeURIComponent(n.id || '__new') + '&draft=1' : ''}" title="App preview"></iframe></div></div>
      </div>`;
  }
  // the editor redraws when photos or the When switch change; keep what's been typed
  const keepNews = () => { const g = id => { const el = document.getElementById(id); return el ? (el.type === 'checkbox' ? el.checked : el.value) : undefined; };
    A.nDraft = { title: g('nTitle'), dek: g('nDek'), body: g('nBody'), tag: g('nTag'), day: g('nDay'), time: g('nTime'), alert: g('nAlert') }; };
  // uploaded photos are shrunk to 1200px JPEGs in the browser before they're saved
  const shrink = (f, max) => new Promise(res => { const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, (max || 1200) / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .8)); }; im.onerror = () => res(''); im.src = r.result; }; r.onerror = () => res(''); r.readAsDataURL(f); });

  const audName = a => a === 'all' ? 'Everyone' : a === 'news' ? 'News alerts on' : a.startsWith('club:') && C[a.slice(5)] ? C[a.slice(5)].short + ' followers' : a;
  const pushTable = (list, compact) => list.length ? `<table class="tbl"><thead><tr><th style="width:${compact ? 110 : 150}px">When</th><th>Notification</th>${compact ? '' : '<th style="width:150px">To</th><th style="width:100px">Kind</th>'}<th style="width:90px"></th></tr></thead><tbody>${list.map(p => `<tr><td class="note">${hm(p.at)}</td><td><div style="display:flex;flex-direction:column;gap:2px"><b>${E(p.title)}</b><span class="note">${E(p.body)}</span></div></td>${compact ? '' : `<td>${audName(p.aud)}</td><td class="lbl">${p.kind === 'live' ? 'Match alert' : 'Sent by hand'}</td>`}<td class="lbl ${p.at > Date.now() ? 'warn' : 'ok'}">${p.at > Date.now() ? 'Scheduled' : 'Sent'}</td></tr>`).join('')}</tbody></table>` : '<p class="note">No notifications sent yet.</p>';
  // starters in the PL style (Hafiz, 5 Nov): FAS's team edits them before sending
  const PUSH_STARTERS = [['October Awards 🏆', 'Who impressed you this month? Vote for Player and Goal of the Month before Monday.'],
    ['Matchweek 7 is here ⚽', 'Jurong host Balestier tonight at Jurong East, 7.30PM. Follow it live in the app.'],
    ['Sailors v Geylang 🔥', 'Second host first at Jalan Besar on Sunday. Geylang lead by a point. Kick-off 7.30PM.'],
    ['Six. Nil. 😮', 'Sailors 6–0 Tanjong Pagar. Every goal from Jalan Besar, in under eight minutes.'],
    ['Unstoppable? 🤔', 'Higashikawa has six already. See where the scoring race stands after Matchweek 6.']];
  function push() {
    const pre = A.pushPre || { title: '', body: '' };
    return head('Notifications', 'Sent to phones with the app. Fans choose which kinds they get in Settings; a club\'s alerts go only to its followers.') + `
      <div class="row" style="gap:24px">
        <div class="panel" style="flex:1;display:flex;flex-direction:column;gap:14px">
          <h2 style="margin:0">New notification</h2>
          <p class="note" style="margin:0">A short title with one emoji, then one line that makes them tap. Ask a question, name the player, say what's at stake.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">${PUSH_STARTERS.map((p, j) => `<button class="btn2" data-starter="${j}" style="min-height:32px;padding:0 12px;font-size:12px">${E(p[0])}</button>`).join('')}</div>
          <label class="fld"><span>Title</span><input class="in" id="pTitle" maxlength="60" value="${E(pre.title)}" placeholder="October Awards 🏆"></label>
          <label class="fld"><span>Message</span><input class="in" id="pBody" maxlength="140" value="${E(pre.body)}" placeholder="Who impressed you this month? Vote for Player and Goal of the Month before Monday."></label>
          <div class="grid2"><label class="fld"><span>Who gets it</span><select class="in" id="pAud"><option value="all">Everyone</option><option value="news">Everyone with news alerts on</option>${Object.keys(C).map(k => `<option value="club:${k}" ${A.pushAud === 'club:' + k ? 'selected' : ''}>${C[k].name} followers</option>`).join('')}</select></label>
            <label class="fld"><span>When</span><select class="in" id="pWhen"><option value="now">Now</option><option value="later" ${A.pushWhen === 'later' ? 'selected' : ''}>Later…</option></select></label></div>
          ${A.pushWhen === 'later' ? '<label class="fld"><span>Send at</span><input class="in" type="datetime-local" id="pAt"></label>' : ''}
          <div style="display:flex;gap:10px"><button class="btn" data-sendpush="1">${A.pushWhen === 'later' ? 'Schedule' : 'Send now'}</button></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px"><span class="lbl">On a locked phone</span><div class="lock"><span class="lbl" style="color:#DCDAF0">${E(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))}</span><span class="tm">19:28</span><div class="nt"><span style="width:30px;height:30px;flex:none;background:url(assets/league/spl-lion.png) center/70% no-repeat #fff;border-radius:4px"></span><span style="display:flex;flex-direction:column;gap:2px;min-width:0"><span style="font:600 11px 'Inter',sans-serif;color:#DCDAF0">SPL · now</span><b id="lkT" style="font-size:13px">${E(pre.title) || 'Title'}</b><span id="lkB" style="font-size:12px;color:#DCDAF0">${E(pre.body) || 'Message'}</span></span></div></div></div>
      </div>
      <div class="panel"><h2>Sent and scheduled</h2>${pushTable(D.pushes.slice().reverse())}</div>`;
  }

  // ---------- monthly awards (Hafiz, 5 Nov): a board with a card per month; a card opens the month's four steps ----------
  const MAXN = 8; // nominees per award at most (the store keeps eight)
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const mName = key => MONTHS[+key.slice(5, 7) - 1] || key;
  const numOf = (k, nm) => (SPL.squads[k] && SPL.squads[k].find(p => p[1] === nm) || [0])[0];
  const PHOTOS = { LCS: 'all', TAM: [25], GEY: [18], JUR: [7] }, hasPhoto = (k, n) => PHOTOS[k] === 'all' ? SPL.squads.LCS.some(p => p[0] === n) && n !== 27 && n !== 28 : (PHOTOS[k] || []).includes(n);
  const upPhoto = (k, n) => (D.playerPhotos || {})[k + ':' + n] || '';
  const face = (k, n, px) => upPhoto(k, n) || hasPhoto(k, n) ? `<span class="face" style="width:${px}px;height:${px}px;background-image:url(${upPhoto(k, n) || `assets/players/${k}/${n}.png`});background-color:${C[k].c}"></span>` : `<span class="face" style="width:${px}px;height:${px}px">${crest(k, Math.round(px * .62))}</span>`;
  const ytId = u => { const m = String(u || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/) || String(u || '').match(/^([\w-]{11})$/); return m ? m[1] : ''; };
  const clipTh = u => ytId(u) ? `<span class="clipth" style="background-image:url(https://img.youtube.com/vi/${ytId(u)}/mqdefault.jpg)"><i></i></span>` : '<span class="clipth none">No clip yet</span>';
  const partnerTag = k => `<span class="ptag"><span>Presented by</span><img src="assets/partners/colour/${k === 'potm' ? 'dongfeng' : 'msig'}.png" alt="${k === 'potm' ? 'Dongfeng' : 'MSIG'}"></span>`;
  // the month's results, from the season data and the matchday console: every goal, and each club's record
  function monthData(key) {
    const goals = [], rec = {}, tally = {};
    SPL.matches.forEach((m, i) => { if (!m[1].startsWith(key)) return; let sc = m[4], gl = (m[6] || []).map(g => ({ player: String(g[0]).replace(/\s*\((pen|og)\)$/i, ''), og: /\(og\)$/i.test(g[0]), min: g[1] + "'", team: g[2] }));
      const L = D.live[i]; if (!sc && L && L.ev && L.ev.length) { sc = scoreOf(i); gl = L.ev.filter(e => e[3] === 'G').map(e => ({ player: pname(e[8] || e[4], e[5]), min: minText(e), team: e[4], og: e[7] === 'og' })); }
      if (!sc) return; const label = `${short(m[2])} ${sc[0]}–${sc[1]} ${short(m[3])}`;
      [[m[2], sc[0], sc[1]], [m[3], sc[1], sc[0]]].forEach(([k, f, g]) => { const r = rec[k] = rec[k] || [0, 0, 0]; r[f > g ? 0 : f === g ? 1 : 2]++; });
      gl.forEach(g => { if (g.og) return; goals.push({ id: 'm' + i + '-' + g.min.replace(/\W/g, '') + '-' + g.player.replace(/\W/g, '').slice(0, 10), player: g.player, team: g.team, match: label, min: g.min, mi: i }); tally[g.player + '|' + g.team] = (tally[g.player + '|' + g.team] || 0) + 1; }); });
    const players = Object.entries(tally).map(([k, n]) => { const [name, team] = k.split('|'); return { name, team, goals: n, r: rec[team] || [0, 0, 0] }; }).sort((x, y) => y.goals - x.goals || x.name.localeCompare(y.name));
    return { goals, players, rec };
  }
  const draftLine = (m, x, md) => { const r = md.rec[x.team] || [0, 0, 0]; return `${C[x.team].short} in ${m.month}: W${r[0]} D${r[1]} L${r[2]}. ${x.line || ''}.`.replace(' .', '.'); };
  // steps: what's done for a month
  function steps(m) {
    const P = m.potm.picks, G = m.gotm.picks;
    // any number of nominees from 2 to MAXN per award; an award left empty is skipped that month
    const ok = n => n === 0 || n >= 2;
    return [['Shortlist', `${P.length} ${P.length === 1 ? 'player' : 'players'}, ${G.length} ${G.length === 1 ? 'goal' : 'goals'}`, ok(P.length) && ok(G.length) && (P.length + G.length) > 0],
      ['Clips and write-ups', `${G.filter(g => ytId(g.clip)).length} of ${G.length} clips, ${P.filter(x => (x.write || x.how)).length} of ${P.length} write-ups`, G.length && G.every(g => ytId(g.clip)) && P.length && P.every(x => x.write || x.how)],
      ['Vote', m.opens ? `${dt(m.opens)} – ${dt(m.closes)}` : 'Dates to set', m.stage !== 'shortlist'],
      ['Announce', m.stage === 'announced' ? 'Done' : 'One press', m.stage === 'announced']];
  }
  const dt = v => v ? new Date(v).toLocaleString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
  const tallyOf = (m, which) => { const base = which === 'potm' && D.potm.month === m.month ? D.potm.base : which === 'gotm' && D.gotm.month === m.month ? D.gotm.base : {}; let mine = null;
    try { const v = JSON.parse(localStorage.getItem('spl-mock') || '{}').votes || {}; mine = which === 'potm' ? v['potm:' + m.month] : v[m.month]; } catch (x) {}
    const srv = CL.on ? AWV[m.month] : null; if (CL.on && !srv && !AWV['_' + m.month]) { AWV['_' + m.month] = 1; CL.voteCounts(m.month).then(o => { if (o) { AWV[m.month] = o; if (A.page === 'votes') render(); } }); }
    const t = {}; m[which].picks.forEach(x => { t[x.id] = (+base[x.id] || 0) + (srv ? (srv[which][x.id] || 0) : CL.on ? 0 : (mine === x.id ? 1 : 0)); }); return t; };
  // fans' votes counted on the server, by month (0003_spl_votes.sql); refreshed every 30 seconds on the Awards page
  const AWV = {};
  // what the app reads: the latest month that is voting or announced becomes store.potm and store.gotm
  function mirror(d) {
    const pub = d.awards.months.filter(m => m.stage !== 'shortlist').sort((x, y) => x.key.localeCompare(y.key)), m = pub[pub.length - 1]; if (!m) return;
    const keepG = d.gotm.month === m.month ? d.gotm.base : {}, keepP = d.potm.month === m.month ? d.potm.base : {};
    d.gotm = { month: m.month, closes: (m.closes || '').slice(0, 10), open: m.stage === 'voting', winner: m.gotm.winner, base: keepG,
      goals: m.gotm.picks.map(g => ({ id: g.id, player: g.player, team: g.team, match: g.match, min: g.min, how: g.how || '', clip: g.clip || '', from: g.from || '', to: g.to || '' })),
      previous: pub.slice(0, -1).reverse().map(x => { const w = x.gotm.picks.find(g => g.id === x.gotm.winner); return w ? { month: x.month, player: w.player, team: w.team, match: w.match } : null; }).filter(Boolean) };
    if (m.potm.picks.length) d.potm = { month: m.month, mkey: m.key, closes: (m.closes || '').slice(0, 10), open: m.stage === 'voting', winner: m.potm.winner, base: keepP,
      list: m.potm.picks.map(x => ({ id: x.id, name: x.name, team: x.team, n: x.n, line: x.line, how: x.write || x.how || '' })) };
  }
  const awSave = (fn, msg) => save(d => { fn(d); mirror(d); }, msg);
  const monthOfKey = (d, key) => d.awards.months.find(m => m.key === key);

  function votes() { return A.awm && D.awards.months.some(m => m.key === A.awm) ? awardMonth(D.awards.months.find(m => m.key === A.awm)) : awardBoard(); }
  function awardBoard() {
    const ms = D.awards.months.slice().sort((x, y) => y.key.localeCompare(x.key)), col = st => ms.filter(m => m.stage === st);
    const card = m => { const S2 = steps(m), md = m.stage === 'voting' ? null : null, tp = tallyOf(m, 'potm'), tg = tallyOf(m, 'gotm');
      const bars = (which, list, name) => { const t = which === 'potm' ? tp : tg, tot = Object.values(t).reduce((a, b) => a + b, 0) || 1; return list.slice().sort((a, b) => t[b.id] - t[a.id]).map((x, i) => `<div class="vb"><span><span>${E(name(x))}</span><b>${Math.round(100 * t[x.id] / tot)}%</b></span><i><em style="width:${Math.round(100 * t[x.id] / tot)}%;${i ? '' : 'background:#E8363D'}"></em></i></div>`).join(''); };
      const wP = m.potm.picks.find(x => x.id === m.potm.winner), wG = m.gotm.picks.find(x => x.id === m.gotm.winner);
      return `<button class="g awc ${m.stage}" data-awm="${m.key}"><span class="awh"><b>${E(m.month)}</b>${m.stage === 'voting' ? `<span class="chip r">● Closes ${E(dt(m.closes))}</span>` : m.stage === 'announced' ? '<span class="lbl ok">Announced</span>' : `<span class="lbl warn">${S2.filter(x => x[2]).length} of 4 steps</span>`}</span>
        ${m.stage === 'shortlist' ? S2.map(x => `<span class="awrow"><span class="note">${x[0]}</span><b class="${x[2] ? 'ok' : ''}">${x[2] ? '✓' : E(x[1])}</b></span>`).join('') : ''}
        ${m.stage === 'voting' ? `${m.potm.picks.length ? `<span class="awsub"><span class="lbl">Player of the Month</span>${partnerTag('potm')}</span><span class="faces">${m.potm.picks.map(x => face(x.team, x.n, 40)).join('')}</span>${bars('potm', m.potm.picks, x => x.name)}` : ''}
          <span class="awsub"><span class="lbl">Goal of the Month</span>${partnerTag('gotm')}</span><span class="clips">${m.gotm.picks.map(g => clipTh(g.clip)).join('')}</span>${bars('gotm', m.gotm.picks, x => x.player)}` : ''}
        ${m.stage === 'announced' ? `${wP ? `<span class="win">${face(wP.team, wP.n, 44)}<span><span class="lbl">Player of the Month</span><b>${E(wP.name)}</b></span></span>` : ''}${wG ? `<span class="win">${face(wG.team, numOf(wG.team, wG.player), 44)}<span><span class="lbl">Goal of the Month</span><b>${E(wG.player)}</b><span class="note">${E(wG.match)}${wG.min ? ' · ' + E(wG.min) : ''}</span></span></span>` : ''}` : ''}
        <span class="lnk" style="align-self:flex-start">${m.stage === 'announced' ? 'View' : 'Open'}</span></button>`; };
    const colH = (t, st) => `<div class="awcol"><div class="awct"><b>${t}</b><span class="lbl">${col(st).length}</span></div>${col(st).map(card).join('') || '<p class="note" style="padding:0 6px">Nothing here.</p>'}</div>`;
    return head('Awards', 'Dongfeng Player of the Month and MSIG Goal of the Month: a card per month. Open a card to shortlist, add clips and write-ups, run the vote and announce.', '<button class="btn red sm" data-awnew="1">+ New month</button>') +
      `<div class="awboard">${colH('Shortlist', 'shortlist')}${colH('Voting', 'voting')}${colH('Announced', 'announced')}</div>
      <p class="note">One vote per signed-in fan once fan sign-in is live; until then each phone counts its own. October's vote counts are the demo's placeholders.</p>`;
  }
  function awardMonth(m) {
    const md = monthData(m.key), S2 = steps(m), cur = S2.findIndex(x => !x[2]), P = m.potm.picks, G = m.gotm.picks, lock = m.stage !== 'shortlist';
    const tick = (on, attr, dis) => `<button class="tk ${on ? 'on' : ''}" ${attr} ${dis ? 'disabled' : ''} aria-pressed="${on}"></button>`;
    const players = md.players.slice(0, 12); P.forEach(x => { if (!players.some(y => y.name === x.name)) players.push({ name: x.name, team: x.team, goals: '–', r: md.rec[x.team] || [0, 0, 0] }); });
    const same = (a, b) => a.id === b.id || (a.player === b.player && a.min === b.min && a.team === b.team);
    const goals = md.goals.filter(g => !G.some(x => same(x, g) && x.id !== g.id)); G.forEach(g => { if (!goals.some(y => y.id === g.id)) goals.unshift({ id: g.id, player: g.player, team: g.team, match: g.match, min: g.min }); });
    const shownGoals = A.allGoals ? goals : goals.filter(g => G.some(x => x.id === g.id)).concat(goals.filter(g => !G.some(x => x.id === g.id)).slice(0, Math.max(0, 8 - G.length)));
    const fld = (path, v, ph, w) => `<input class="in" data-awf="${path}" value="${E(v || '')}" placeholder="${ph}" ${w ? `style="width:${w}px;flex:none"` : ''}>`;
    const stepper = `<div class="g steps">${S2.map((x, j) => `<div class="st ${x[2] ? 'done' : j === cur ? 'on' : ''}"><i>${x[2] ? '✓' : j + 1}</i><span><b>${x[0]}</b><span class="note">${E(x[1])}</span></span></div>`).join('')}</div>`;
    return head('Awards', `${E(m.month)} ${m.key.slice(0, 4)}. ${md.goals.length ? `${md.goals.length} goals in ${md.players.length ? 'the month\'s results' : 'the results'} so far.` : 'No results this month yet: candidates appear as the console records each game.'}`, `<span style="display:flex;gap:8px"><button class="btn2 sm" data-awback="1">All months</button><button class="lnk danger" data-awdel="${m.key}">Delete month</button></span>`) + stepper + `
      <div class="grid2">
        <div class="panel"><h2 class="awh2">Player of the Month <span class="lbl">From ${E(m.month)}'s results</span>${partnerTag('potm')}</h2>
          ${players.length ? `<table class="tbl"><thead><tr><th style="width:34px"></th><th>Player</th><th style="width:60px">Goals</th><th style="width:96px">Club</th><th style="width:70px">Photo</th></tr></thead><tbody>
          ${players.map(x => { const n = numOf(x.team, x.name), on = P.some(y => y.name === x.name); return `<tr class="${on ? '' : 'dim'}"><td>${tick(on, `data-awp="${E(x.name)}|${x.team}"`, lock || (!on && P.length >= MAXN))}</td><td><span class="who2">${face(x.team, n, 34)}<span><b>${E(x.name)}</b><br><span class="note">${C[x.team].short}</span></span></span></td><td><b class="big" style="font-size:22px">${x.goals}</b></td><td class="note">W${x.r[0]} D${x.r[1]} L${x.r[2]}</td><td class="lbl ${hasPhoto(x.team, n) ? 'ok' : 'warn'}">${hasPhoto(x.team, n) ? 'Ready' : 'Needed'}</td></tr>`; }).join('')}</tbody></table>` : '<p class="note">No scorers this month yet.</p>'}
          <p class="note" style="margin:10px 0 0">${P.length} picked: any number from 2 to ${MAXN}, or none to skip the award this month. The FAS panel chooses; the list only saves digging through results.</p></div>
        <div class="panel"><h2 class="awh2">Goal of the Month <span class="lbl">Every ${E(m.month)} goal</span>${partnerTag('gotm')}</h2>
          ${shownGoals.length ? shownGoals.map(g => { const j = G.findIndex(x => x.id === g.id), on = j >= 0, x = on ? G[j] : {}; return `<div class="gl ${on ? '' : 'dim'}">${tick(on, `data-awg="${E(g.id)}"`, lock || (!on && G.length >= MAXN))}${on ? clipTh(x.clip) : ''}<span class="gli"><b>${E(g.player)} <span class="note">${E(g.min)}</span></b><span class="note">${crest(g.team, 14)} ${E(g.match)}</span>
            ${on ? `<span class="glf">${fld(`g:${j}:clip`, x.clip, 'Paste the clip link (YouTube)')}${fld(`g:${j}:from`, x.from, 'Starts 1:23', 92)}${fld(`g:${j}:to`, x.to, 'Ends 1:41', 92)}</span>${fld(`g:${j}:how`, x.how, 'How it went in, one line for the vote card')}` : ''}</span></div>`; }).join('') : '<p class="note">No goals this month yet.</p>'}
          ${goals.length > shownGoals.length || A.allGoals ? `<button class="lnk" data-awall="1" style="margin-top:10px">${A.allGoals ? 'Show fewer' : `Show all ${goals.length} goals`}</button>` : ''}
          <p class="note" style="margin:10px 0 0">${G.length} picked: 2 to ${MAXN}, or none to skip. The clip plays between the start and end times, in the vote and as a Short in Watch.</p></div></div>
      ${P.length ? `<div class="panel"><h2>Write-ups <span class="lbl">Drafted from the numbers; edit before the vote opens</span></h2><div class="wus">${P.map((x, j) => `<div class="wu"><label class="wuph" title="${upPhoto(x.team, x.n) || hasPhoto(x.team, x.n) ? 'Change photo' : 'Add a photo'}">${face(x.team, x.n, 64)}<input type="file" accept="image/*" hidden data-pphoto="${x.team}:${x.n}"><span>${upPhoto(x.team, x.n) || hasPhoto(x.team, x.n) ? 'Change photo' : '+ Add photo'}</span></label><b>${E(x.name)}</b><textarea class="in" rows="4" data-awf="p:${j}:write" placeholder="${E(draftLine(m, x, md))}">${E(x.write || '')}</textarea>${fld(`p:${j}:line`, x.line, 'e.g. 4 goals')}</div>`).join('')}</div></div>` : ''}
      <div class="panel awvote"><h2 style="margin:0">Vote</h2><label class="fld"><span>Opens</span><input class="in" type="datetime-local" data-awf="opens" value="${E(m.opens)}"></label><label class="fld"><span>Closes</span><input class="in" type="datetime-local" data-awf="closes" value="${E(m.closes)}"></label>
        <span style="display:flex;flex-direction:column;gap:6px"><label class="chk"><input type="checkbox" checked disabled> Alert every fan when it opens</label><label class="chk"><input type="checkbox" checked disabled> Remind fans who haven't voted, 24 hours before close</label></span><span style="flex:1"></span>
        <a class="btn2" href="index.html" target="_blank" rel="noopener">Preview in the app</a>
        ${m.stage === 'shortlist' ? `<button class="btn red" data-awopen="${m.key}" ${S2[0][2] && m.opens && m.closes ? '' : 'disabled'}>Open the vote</button>` : m.stage === 'voting' ? `<button class="btn red" data-awclose="${m.key}">Close and announce</button>` : `<span class="lbl ok">Announced</span><button class="btn" data-awstory="${m.key}">${D.news.some(n => n.id === 'aw-' + m.key) ? 'Open the winners\' story' : 'Write the winners\' story'}</button>`}</div>
      ${m.stage === 'voting' ? `<div class="panel"><h2>Votes so far</h2><div class="grid2">${['potm', 'gotm'].map(w => { const t = tallyOf(m, w), tot = Object.values(t).reduce((a, b) => a + b, 0) || 1; return `<div>${m[w].picks.slice().sort((a, b) => t[b.id] - t[a.id]).map((x, i) => `<div class="vb"><span><span>${E(x.name || x.player)}</span><b>${Math.round(100 * t[x.id] / tot)}% <span class="note">${t[x.id].toLocaleString()}</span></b></span><i><em style="width:${Math.round(100 * t[x.id] / tot)}%;${i ? '' : 'background:#E8363D'}"></em></i></div>`).join('')}</div>`; }).join('')}</div></div>` : ''}`;
  }

  function sponsors() {
    const st = stats();
    const where = { gotm: 'Home card and Goal of the Month page', potm: 'Match centre, after full time', stats: 'Table & Stats → Player stats', moments: 'Moments stories on Home', live: 'Match centre while a game is live' };
    const mark = p => p.logo === 'aia' ? '<span class="aia" style="width:60px;height:44px"></span>' : p.logo ? `<img src="${p.logo}" alt="">` : '<span class="lbl" style="color:var(--dim)">No logo</span>';
    return head('Sponsors', 'Section sponsors inside the app, and the partners screen every fan sees after the splash.') + `
      <div class="panel"><h2>Section sponsors</h2><table class="tbl"><thead><tr><th>Section</th><th>Where it shows</th><th style="width:220px">Partner</th><th style="width:150px">From</th><th style="width:150px">To</th><th style="width:90px">Seen</th></tr></thead><tbody>
        ${Object.keys(SPLSTORE.SLOTS).map(k => { const s = D.sponsors[k]; return `<tr><td><b>${SPLSTORE.SLOTS[k]}</b></td><td class="note">${where[k]}</td><td><input class="in" data-sp="${k}:partner" value="${E(s.partner)}" placeholder="[PARTNER]"></td><td><input class="in" type="date" data-sp="${k}:from" value="${E(s.from)}"></td><td><input class="in" type="date" data-sp="${k}:to" value="${E(s.to)}"></td><td><span class="big" style="font-size:22px">${st.imp[k] || 0}</span></td></tr>`; }).join('')}
      </tbody></table><div style="display:flex;gap:10px;align-items:center;margin-top:14px"><button class="btn" data-savesp="1">Save sponsors</button><span class="note">Seen counts each time the section is opened on this device; in the live app it's every fan, and it's the number in the partner's report.</span></div></div>
      <div class="row" style="gap:24px">
        <div class="panel" style="flex:1"><h2>Partners screen</h2><div class="tabs" style="gap:24px;margin-bottom:8px">${[['light', 'White page'], ['mono', 'White marks on navy'], ['colour', 'Colour on tiles']].map(([k, l]) => `<button class="stab ${D.partnerLook === k ? 'on' : ''}" data-ptlook="${k}">${l}</button>`).join('')}</div>
          ${D.partners.map((p, j) => `<div style="display:grid;grid-template-columns:96px 170px 1fr auto;gap:14px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line2)"><span class="logo-box">${mark(p)}</span><select class="in" data-pt="${j}:tier"><option ${p.tier === 'Title partner' ? 'selected' : ''}>Title partner</option><option ${p.tier === 'Official partner' ? 'selected' : ''}>Official partner</option><option ${p.tier === 'Official match ball' ? 'selected' : ''}>Official match ball</option><option ${p.tier === 'Broadcast partner' ? 'selected' : ''}>Broadcast partner</option></select><input class="in" data-pt="${j}:name" value="${E(p.name)}" placeholder="Partner name"><span style="display:flex;gap:12px;align-items:center"><label class="lnk" style="cursor:pointer">Upload logo<input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" data-ptlogo="${j}" style="display:none"></label>${p.logo && p.logo !== 'aia' ? `<button class="lnk danger" data-ptclear="${j}">Remove</button>` : ''}</span></div>`).join('')}
          <div style="display:flex;gap:10px;align-items:center;margin-top:14px"><button class="btn" data-savept="1">Save partners</button><span class="note">White or single-colour logos read best on the navy. AIA and the eight official partners on the SPL's partner strip.</span></div></div>
        <div style="display:flex;flex-direction:column;gap:8px"><span class="lbl">After the splash</span><div class="mini-partners"><span class="spl-h" style="width:110px;height:40px;background-position:center"></span><span style="width:70%;height:1px;background:var(--line)"></span>${(t => t ? `<span class="lbl" style="font-size:8px">${E(t.tier)}</span><span style="width:70px;height:52px;display:flex;align-items:center;justify-content:center">${t.logo === 'aia' ? '<span class="aia" style="width:100%;height:100%"></span>' : t.logo ? `<img src="${t.logo}" style="max-width:100%;max-height:100%">` : `<b>${E(t.name)}</b>`}</span>` : '')(D.partners.find(p => p.tier === 'Title partner'))}<span class="lbl" style="font-size:8px">Official partners</span><div class="g">${D.partners.filter(p => p.tier !== 'Title partner').map(p => `<span class="${p.logo || p.name ? 'f' : ''}">${p.logo ? `<img src="${p.logo}" style="height:${Math.round(p.h * .6)}px;max-width:90%;object-fit:contain">` : p.name ? `<b style="color:#fff;font-size:11px">${E(p.name)}</b>` : '[PARTNER]'}</span>`).join('')}</div></div></div>
      </div>`;
  }

  // ---------- Shop (Hafiz, 9 Nov, option A): the office adds each product with its Shopee link and photos ----------
  // Phase 2 (option C): FAS's Shopee seller account connected through Shopee's Open Platform, so photos, prices and stock sync nightly.
  const SH_TAB = { league: 'League · adidas', lions: 'Lions · FAS on Shopee', clubs: 'A club' }, SH_KIND = { jersey: 'Jersey', retro: 'Retro', gear: 'Fan gear' };
  const SH_POS = [['50% 15%', 'Top'], ['50% 50%', 'Centre'], ['50% 80%', 'Bottom']];
  const SH_LIB = Object.keys(SPLSTORE.IMG).filter(k => k.startsWith('shop:'));
  const keepShop = () => { const g = id => { const el = document.getElementById(id); return el ? (el.type === 'checkbox' ? el.checked : el.value) : undefined; };
    A.sDraft = { url: g('sUrl'), name: g('sName'), tab: g('sTab'), kind: g('sKind'), price: g('sPrice'), club: g('sClub'), off: g('sOff'), rating: g('sRate'), sold: g('sSold'), out: g('sOut'), pos: g('sPos') }; };
  const linkState = u => !u ? ['No link yet: Buy opens FAS\'s Shopee store', 'var(--dim)'] : SPLSTORE.shopLink(u) ? [(SPLSTORE.shopWhere(u) ? SPLSTORE.shopWhere(u) + ' link' : 'Shop link') + ': Buy opens this page', '#3DD68C'] : ['Not a web address: it starts https://', '#FF9AA0'];
  function shop() {
    const L = D.shop, i = A.shopE, blank = { id: '', name: '', tab: 'lions', kind: 'jersey', price: '', off: 0, pos: '50% 50%', rating: '', sold: 0, out: false, url: '', imgs: [] };
    const p = i === 'new' ? blank : i != null && L[i] ? L[i] : null;
    if (p && A.sFor !== i) { A.sFor = i; A.sImgs = p.imgs.slice(); A.sDraft = null; }
    const dr = A.sDraft || {}, v = p ? Object.assign({}, p, ...Object.keys(dr).filter(k => dr[k] !== undefined).map(k => ({ [k]: dr[k] }))) : null;
    const fil = A.shopFil || 'all', noPic = L.filter(x => !x.imgs.length).length;
    const shown = L.map((x, j) => [x, j]).filter(([x]) => fil === 'all' || (fil === 'nophoto' ? !x.imgs.length : x.tab === fil));
    const chip = (k, l, n, cls) => `<button class="skc ${fil === k ? 'on' : ''} ${cls || ''}" data-shopfil="${k}">${l}<i>${n}</i></button>`;
    const card = ([x, j]) => `<button class="skd ${x.out ? 'out' : ''} ${i === j ? 'sel' : ''}" data-shopedit="${j}">${x.imgs[0] ? `<span class="ph" style="background-image:url(${SPLSTORE.picUrl(x.imgs[0])});background-position:${x.pos}">${x.out ? '<span class="tag">Sold out</span>' : ''}</span>` : `<span class="ph none">+ Add photo</span>`}<b>${E(x.name)}</b><span class="pr">${x.price ? 'S$' + x.price : '[PRICE]'}${x.off ? `<s>−${x.off}%</s>` : ''}</span></button>`;
    const ls = v ? linkState(v.url) : null;
    const pics = v ? (A.sImgs || []).map((k, j, all) => `<div class="pt" style="background-image:url(${SPLSTORE.picUrl(k)})"><b>${j === 0 ? 'Tile' : j === 1 ? 'Sheet' : 'Extra'}</b><span class="pt-a">${j ? `<button data-spicmv="${j}:-1" title="Move left">‹</button>` : ''}${j < all.length - 1 ? `<button data-spicmv="${j}:1" title="Move right">›</button>` : ''}<button data-spicdel="${j}" title="Remove">×</button></span></div>`).join('') : '';
    const sel = (id, opts, cur) => `<select class="in" id="${id}">${opts.map(([k, l]) => `<option value="${k}" ${cur === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    const editor = v ? `<div class="skw"><div style="display:flex;align-items:center"><h2 style="flex:1;margin:0">${i === 'new' ? 'New product' : E(v.name)}</h2><button class="lnk" data-shopclose="1">Close</button></div>
        <div class="pics">${pics}${(A.sImgs || []).length < 4 ? `<label class="padd"><input type="file" id="sFiles" accept="image/*" multiple hidden><b>+</b>Photo</label>` : ''}</div>
        <span class="note" style="margin-top:-8px">The first is the tile, the second shows when a fan opens it.</span>
        <label class="fld"><span>Shop link · Shopee, adidas or the club's shop</span><input class="in" id="sUrl" value="${E(v.url)}" placeholder="Paste the product page's address"><small class="lbl" id="sUrlOk" style="color:${ls[1]}">${ls[0]}</small></label>
        <label class="fld"><span>Name</span><input class="in" id="sName" value="${E(v.name)}" maxlength="120"></label>
        <div class="grid2"><label class="fld"><span>Price S$</span><input class="in" id="sPrice" value="${E(v.price)}" placeholder="[PRICE]" inputmode="decimal"></label><label class="fld"><span>Discount %</span><input class="in" id="sOff" value="${v.off || ''}" placeholder="0" inputmode="numeric"></label></div>
        <label class="sktg"><span>Sold out</span><input type="checkbox" class="swi" id="sOut" ${v.out ? 'checked' : ''}></label>
        ${A.shopMore || i === 'new' ? `<div class="grid2"><label class="fld"><span>Section</span>${sel('sTab', Object.entries(SH_TAB), v.tab)}</label><label class="fld"><span>Kind</span>${sel('sKind', Object.entries(SH_KIND), v.kind)}</label>
          <label class="fld"><span>Club · for a club's kit</span>${sel('sClub', [['', '—']].concat(Object.keys(C).map(k => [k, C[k].name])), v.club || '')}</label><span></span>
          <label class="fld"><span>Rating on Shopee</span><input class="in" id="sRate" value="${E(v.rating)}" placeholder="4.9"></label><label class="fld"><span>Sold on Shopee</span><input class="in" id="sSold" value="${v.sold || ''}" placeholder="0" inputmode="numeric"></label>
          <label class="fld"><span>Tile shows the</span>${sel('sPos', SH_POS.some(([k]) => k === v.pos) ? SH_POS : SH_POS.concat([[v.pos, 'As set']]), v.pos)}</label><label class="fld"><span>Or a photo already in the shop</span><select class="in" id="sLib"><option value="">Add…</option>${SH_LIB.map(k => `<option value="${k}">${E(k.slice(5))}</option>`).join('')}</select></label></div>
          ${i !== 'new' ? `<div style="display:flex;gap:14px"><button class="lnk" data-shopmv="${i}:-1">Move earlier</button><button class="lnk" data-shopmv="${i}:1">Move later</button></div>` : ''}` : `<button class="lnk" style="align-self:flex-start" data-shopmore="1">More: section, kind, rating, order</button>`}
        <div style="display:flex;gap:10px;align-items:center"><button class="btn" data-shopsave="1">${i === 'new' ? 'Add to the shop' : 'Save'}</button><span style="flex:1"></span>${i !== 'new' ? `<button class="lnk" style="color:#FF9AA0" data-shopdel="${i}">Remove</button>` : ''}</div></div>` : '';
    return `<div class="skh"><div><h1>Shop</h1><p>${L.length} products · Buy in the app opens each one on FAS's Shopee store</p></div><span style="flex:1"></span><button class="btn2" data-shopstoreopen="1">Store link</button><button class="btn" data-shopnew="1">Add product</button></div>
      ${A.shopStore ? `<div class="skw" style="flex-direction:row;align-items:flex-end;gap:12px"><label class="fld" style="flex:1"><span>FAS's store on Shopee · the Lions banner, and any product without its own link, open this</span><input class="in" id="shStore" value="${E(D.shopUrl)}"></label><button class="btn" data-shopstore="1">Save</button><button class="lnk" data-shopstoreopen="1">Cancel</button></div>` : ''}
      <div class="skf">${chip('all', 'All', L.length)}${chip('lions', 'Lions', L.filter(x => x.tab === 'lions').length)}${chip('league', 'League', L.filter(x => x.tab === 'league').length)}${chip('clubs', 'Clubs', L.filter(x => x.tab === 'clubs').length)}${noPic ? chip('nophoto', 'Needs a photo', noPic, 'warn') : ''}</div>
      <div class="skg ${v ? 'ed' : ''}"><div><div class="skc4">${shown.map(card).join('')}</div><p class="note" style="margin-top:22px">Coming in Phase 2: with FAS's Shopee seller account connected, photos, prices and stock update themselves every night.</p></div>${editor}</div>`;
  }

  function analytics() {
    const st = stats(), top = o => Object.entries(o).sort((a, b) => b[1] - a[1]);
    const bars = (rows, name) => { const max = rows.length ? rows[0][1] : 1; return rows.length ? rows.slice(0, 12).map(([k, n]) => `<div style="display:grid;grid-template-columns:200px 1fr 50px;gap:12px;align-items:center;padding:7px 0"><span style="font-size:13px">${E(name(k))}</span><div class="bar"><span style="width:${Math.round(100 * n / max)}%"></span></div><span class="big" style="font-size:18px;text-align:right">${n.toLocaleString()}</span></div>`).join('') : '<p class="note">Nothing recorded yet.</p>'; };
    const tapName = k => { const [a, b] = k.split(':'); return ({ go: 'Opened', match: 'Match centre', club: 'Club page', player: 'Player', article: 'Article', video: 'Video', story: 'Moments story', tickets: 'Tickets', vote: 'Goal of the Month vote', potm: 'Player of the Match vote', follow: 'Follow', htab: 'Home tab', mtab: 'Match tab', ttab: 'Table tab', ctab: 'Club tab', sim: 'Replay', remind: 'Remind me', cal: 'Add to calendar', pick: 'Club picker', ob: 'Onboarding', toast: 'Tapped an alert' }[a] || a) + (b && a !== 'match' && a !== 'potm' ? ' · ' + (C[b] ? C[b].short : b) : ''); };
    return head('Analytics', A.mockOn ? 'Example numbers: a made-up fortnight of app use, for the demo. Switch them off in Settings to see what phones recorded.' : st.first ? (CL.on ? `Recorded from every phone since ${hm(st.first)}. The latest 4,000 events, refreshed every 30 seconds.` : `Recorded in the app on this device since ${hm(st.first)}. In the live app every install reports here.`) : 'Nothing recorded yet. Open the app and use it, then come back.', '<button class="lnk danger" data-clearstats="1">Clear</button>') + `
      <div class="grid4">${[[st.ev.filter(e => e[1] === 'view').length, 'Screens viewed'], [st.ev.filter(e => e[1] === 'tap').length, 'Taps'], [Object.values(st.articles).reduce((a, b) => a + b, 0), 'Articles read'], [Object.values(st.imp).reduce((a, b) => a + b, 0), 'Sponsor views']].map(([n, l]) => `<div class="panel"><div class="big" style="font-size:52px">${n.toLocaleString()}</div><div class="lbl">${l}</div></div>`).join('')}</div>
      <div class="grid2"><div class="panel"><h2>Screens</h2>${bars(top(st.views), viewName)}</div><div class="panel"><h2>What fans tap</h2>${bars(top(st.taps), tapName)}</div></div>
      <div class="grid2"><div class="panel"><h2>Sponsor sections seen</h2>${bars(top(st.imp), k => SPLSTORE.SLOTS[k] || k)}</div><div class="panel"><h2>Stories read</h2>${bars(top(st.articles), id => (D.news.find(n => n.id === id) || { title: id }).title)}</div></div>`;
  }

  const initials = n => (n || '?').replace(/[\[\]]/g, '').replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const whoName = n => E((n || 'Unknown').replace(/@.*/, ''));
  const canUndo = r => r.before != null && r.section !== 'pushes' && JSON.stringify(D[r.section]) === JSON.stringify(r.after);
  const dayOf = ts => { const d = new Date(ts), t = new Date(); const y = new Date(); y.setDate(t.getDate() - 1);
    return d.toDateString() === t.toDateString() ? 'Today' : d.toDateString() === y.toDateString() ? 'Yesterday' : d.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' }); };
  const tm = ts => new Date(ts).toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' });
  function activity() {
    const all = auditEntries(AUD), people = [...new Set(all.map(e => e.who))], secs = ['News', 'Notifications', 'Matchday', 'Awards', 'Sponsors', 'Shop'];
    const list = all.filter(e => (!A.audWho || e.who === A.audWho) && (!A.audSec || e.sections.includes(A.audSec)));
    const filters = `<div class="afil"><button class="${!A.audWho ? 'on' : ''}" data-audwho="">Everyone</button>${people.map(p => `<button class="${A.audWho === p ? 'on' : ''}" data-audwho="${E(p)}"><span class="av">${initials(p)}</span>${whoName(p)}</button>`).join('')}<span class="sep"></span><button class="${!A.audSec ? 'on' : ''}" data-audsec="">All pages</button>${secs.map(s => `<button class="${A.audSec === s ? 'on' : ''}" data-audsec="${s}">${s}</button>`).join('')}</div>`;
    const undo = e => e.rows.filter(canUndo).map(r => `<button class="lnk" data-undo="${E(String(r.id))}">Put back${e.rows.length > 1 ? ' ' + E((SECTION[r.section] || r.section).toLowerCase()) : ''}</button>`).join('');
    const line = l => `<li class="${l[1]}">${l[0]}</li>`;
    let body = '';
    if (!list.length) body = `<p class="note">${AUD.length ? 'Nothing matches.' : CL.on && CL.state.auditError ? 'The activity log isn\'t switched on in the database yet (supabase/migrations/0002_spl_activity.sql).' : 'No changes saved yet. Every save from now on shows here, with who made it.'}</p>`;
    else { let day = ''; body = list.map(e => { const d = dayOf(e.at), h = d !== day ? `<h3 class="aday">${E(d)}</h3>` : ''; day = d;
      return h + `<div class="aent"><span class="av lg">${initials(e.who)}</span><div class="abody"><div class="ahead"><b>${whoName(e.who)}</b><span class="note">${tm(e.at)} · ${e.sections.join(', ')}</span><span style="flex:1"></span>${undo(e)}</div><ul class="chg">${e.lines.map(line).join('')}</ul></div></div>`; }).join(''); }
    return head('Activity', 'Every change saved in this admin: who made it, when, and what it was. Recorded by the database, so it can\'t be edited or deleted from here.', '<button class="lnk" data-audreload="1">Refresh</button>') + `
      <div class="panel">${filters}${body}</div>`;
  }

  function settings() {
    return head('Settings', 'Who can use this admin, and what each person can change.') + `
      <div class="panel"><h2>People</h2><table class="tbl"><thead><tr><th>Name</th><th>Team</th><th>Can use</th></tr></thead><tbody>
        ${[['[NAME]', 'Marketing', 'Everything'], ['[NAME]', 'Digital content', 'News, notifications, votes'], ['[NAME]', 'Commercial', 'Sponsors, analytics'], ['[NAME]', 'Match officials (one per ground)', 'Matchday console for their game']].map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="note">${r[2]}</td></tr>`).join('')}
      </tbody></table><p class="note" style="margin-top:12px">Staff sign in with their FAS email. A new person gets a login in Supabase (Authentication &gt; Users) and a line on the staff list; every save records who made it.</p></div>
      <div class="panel"><h2>Example numbers</h2><p class="note">Fills Overview and Analytics with a made-up fortnight of app use (about 1,280 fans), marked "Example numbers" wherever it shows. Off shows only what phones really recorded.</p><button class="btn2" data-mocknum="1" style="margin-top:10px">${A.mockOn ? 'Show real numbers' : 'Show example numbers'}</button></div>
      ${clearPanel()}
      <div class="panel"><h2>Demo data</h2><p class="note">Puts news, votes, sponsors and partners back as they started and clears analytics and live games. The app follows.</p><button class="btn2" data-resetall="1" style="margin-top:10px">Reset the demo</button></div>`;
  }

  // ---------- shell ----------

  // Media monitoring (Hafiz, 8 Nov, option A with C's partner report and B's watch list as tabs; built 12 Nov). Phase 1 is the
  // 8am brief from the press, Reddit, HardwareZone and YouTube; X, Threads, alerts, share of voice and the partner report are
  // Phase 2. Until the reader runs, the page shows the brief for Matchweek 6's weekend: real headlines, example counts.
  const MEDIA = {
    brief: 'Monday 2 November', covers: '30 Oct – 1 Nov',
    stories: [
      ['m1', 'pos', '2026/27 Singapore Premier League Matchweek 6: Roundup', 'spl.sg', 'The league', 'https://spl.sg/news/2026-27-singapore-premier-league-matchweek-6-roundup/'],
      ['m2', 'neu', 'SPL table: Geylang lead into the break after a goalless Eastern Derby', 'littlebigreddot.com', 'Press', ''],
      ['m3', 'pos', 'Sailors showcase squad depth to make it six wins on the trot', 'lioncitysailorsfc.sg', 'Club', ''],
      ['m4', 'pos', 'Balestier 0–4 Sailors: highlights', 'YouTube · Lion City Sailors', 'YouTube', ''],
      ['m5', 'neu', '[THREAD] on HardwareZone: where to watch the SPL', 'HardwareZone · [REPLIES] replies', 'Forum', ''],
      ['m6', 'neg', '[THREAD] on r/singaporefootball: [TOPIC]', 'Reddit · [COMMENTS] comments', 'Reddit', '']],
    topics: [['Geylang top', 38, '#3DD68C'], ['Sailors six in a row', 31, '#3DD68C'], ['Eastern Derby 0–0', 24, '#A9A6C9'], ['Young Lions’ first win', 17, '#3DD68C'], ['[TOPIC]', 12, '#E8363D']],
    sov: [['EPL in Singapore', 58], ['The Lions', 21], ['SPL', 14], ['SEA Games', 7]],
    partners: [['AIA', 41], ['Singapore Pools', 12], ['adidas', 9], ['Trip.com', 7], ['Dongfeng', 4], ['MSIG', 3]],
    watch: [['Press', '“Singapore Premier League”, “SPL”, the eight club names', 1], ['Reddit', 'r/singaporefootball, r/singapore', 1], ['HardwareZone', 'EDMW and the football forum', 1], ['YouTube', 'The SPL channel and the clubs’ channels', 1],
      ['X', '[FAN ACCOUNT], [JOURNALIST]', 2], ['Threads', '[FAN ACCOUNT]', 2], ['Instagram and TikTok', 'The clubs’ own accounts', 2]]
  };
  const MA = (() => { try { return JSON.parse(localStorage.getItem('spl-media') || '{}'); } catch (e) { return {}; } })();
  const mSave = () => { try { localStorage.setItem('spl-media', JSON.stringify(MA)); } catch (e) {} };
  const TONE = { pos: ['Positive', '#3DD68C'], neu: ['Neutral', '#A9A6C9'], neg: ['Negative', '#E8363D'] };
  function media() {
    const tab = A.mtab || 'today', tone = x => (MA.tone || {})[x[0]] || x[1], st = MEDIA.stories, n = { pos: 0, neu: 0, neg: 0 }; st.forEach(x => n[tone(x)]++);
    const bars = (rows, max, pct) => rows.map(([k, v, c]) => `<div class="mbar"><span>${E(k)}</span><i><b style="width:${Math.round(v / max * 100)}%;background:${c || (k === 'SPL' ? '#E8363D' : '#A9A6C9')}"></b></i><span>${v}${pct ? '%' : ''}</span></div>`).join('');
    const tabs = `<div class="tabs">${[['today', 'Today'], ['partners', 'Partner report'], ['watch', 'Watch list'], ['how', 'How it works']].map(([k, l]) => `<button class="stab ${tab === k ? 'on' : ''}" data-mtab="${k}">${l}</button>`).join('')}</div>`;
    const chips = `<div class="chips"><span class="chip">Sample: the brief for ${MEDIA.brief}, covering ${MEDIA.covers}</span><span class="chip gr">● Phase 1 reads 4 sources</span><span class="chip y">Example numbers</span></div>`;
    let body = '';
    if (tab === 'today') {
      const items = st.map(x => { const t = tone(x); return `<div class="mit"><span class="mdot" style="background:${TONE[t][1]}"></span><div><div class="mhl">${E(x[2])}</div><div class="note">${E(x[3])} · <button class="lnk" data-mtone="${x[0]}" title="Tap to correct the tone">${TONE[t][0]} ▾</button></div></div>
        <div class="mact">${x[5] ? `<a class="btn2 sm" href="${E(x[5])}" target="_blank" rel="noopener">Open</a>` : ''}${t === 'neg' ? `<button class="btn2 sm" data-mstate="${x[0]}">Draft a reply</button>` : `<button class="btn sm" data-mshare="${x[0]}">Share in the app</button>`}</div></div>`; }).join('');
      body = `<div class="mrow"><div class="panel"><h2>This morning’s brief <span class="lbl">Sent 8.00am by email and WhatsApp to [3 PEOPLE]</span></h2>
        <p class="mbrief"><b>214 mentions</b> over the weekend, <b>mostly positive</b>. The big story: <b>Geylang top at the break</b> after the 0–0 Eastern Derby with Tampines (spl.sg, littlebigreddot). The Sailors’ six in a row, with 4–0 at Balestier, is the other. Young Lions won for the first time this season, against Hougang. <b>Watch:</b> [TOPIC], turning negative on Reddit.</p>
        <div class="chips"><span class="chip gr">${Math.round(n.pos * 100 / st.length)}% positive</span><span class="chip">${Math.round(n.neu * 100 / st.length)}% neutral</span><span class="chip r">${Math.round(n.neg * 100 / st.length)}% negative</span><span class="chip" style="margin-left:auto">FAS’s angle, “[FAS MESSAGE]”: in 4 of 18 press stories</span></div></div>
        <div class="panel"><h2>Needs you</h2>${MA.muted ? '<p class="note">Nothing needs you. [TOPIC] is muted until it changes.</p>' : `<div class="mal"><b>Rising: [TOPIC]</b>Negative posts up on Reddit since Saturday. Not in the press yet.<div class="mact" style="margin-top:10px"><button class="btn sm" data-mstate="m6">Draft a statement</button><button class="btn2 sm" data-mmute="1">Mute</button></div></div><p class="note">Phase 1 shows it in the brief; Phase 2 alerts the moment it turns.</p>`}</div></div>
        <div class="mrow"><div class="panel"><h2>Top stories <span class="lbl">By reach; tap a tone to correct it</span></h2>${items}</div>
        <div class="panel"><h2>What fans are talking about</h2>${bars(MEDIA.topics, 38)}<h2 style="margin-top:14px">Share of voice <span class="lbl">Phase 2 · Singapore football talk this month</span></h2>${bars(MEDIA.sov, 58, 1)}<p class="note">SPL up from 11% last month.</p></div></div>`;
    } else if (tab === 'partners') {
      body = `<div class="panel" id="mpr"><h2>Partner report <span class="lbl">Phase 2 · November so far</span></h2><table class="tbl"><thead><tr><th>Partner</th><th style="text-align:right">Mentions</th><th style="text-align:right">Reach</th><th>Where</th></tr></thead><tbody>
        ${MEDIA.partners.map(([k, v]) => `<tr><td><b>${E(k)}</b></td><td style="text-align:right" class="big">${v}</td><td style="text-align:right" class="note">[REACH]</td><td class="note">Press, YouTube</td></tr>`).join('')}</tbody></table>
        <p class="note">Mentions and reach only, never a dollar “media value”: the industry’s Barcelona Principles rejected that in 2010.</p><div class="mact"><button class="btn" data-mpdf="1">Download for partners (PDF)</button></div></div>`;
    } else if (tab === 'watch') {
      const extra = MA.watch || [];
      body = `<div class="panel"><h2>Watch list <span class="lbl">What the reader looks at every hour</span></h2><table class="tbl"><tbody>
        ${MEDIA.watch.map(([k, v, ph]) => `<tr><td><b>${E(k)}</b></td><td>${E(v)}</td><td>${ph === 1 ? '<span class="lbl ok">Phase 1</span>' : '<span class="lbl">Phase 2</span>'}</td><td></td></tr>`).join('')}
        ${extra.map((v, j) => `<tr><td><b>Added</b></td><td>${E(v)}</td><td><span class="lbl ok">Phase 1</span></td><td><button class="lnk danger" data-mwdel="${j}">Remove</button></td></tr>`).join('')}</tbody></table>
        <div class="mact"><input class="in" id="mwIn" placeholder="A name, a club, a journalist or a phrase" style="max-width:420px"><button class="btn" data-mwadd="1">Add</button></div></div>`;
    } else {
      const step = (k, h, t, ph) => `<div class="mstep"><span class="mnum">${k}</span><b>${h}</b><p class="note">${t}</p>${ph ? `<span class="lbl ${ph === 1 ? 'ok' : ''}">Phase ${ph}</span>` : ''}</div>`;
      body = `<div class="panel"><h2>How it works</h2><div class="msteps">
        ${step(1, 'Reads every hour', 'The press, Reddit, HardwareZone and YouTube for the watch list’s names. Phase 2 adds X, Threads and fan accounts.', 1)}
        ${step(2, 'Groups and reads tone', 'Claude groups the mentions into stories and topics and marks each positive, neutral or negative.', 1)}
        ${step(3, 'A person checks', 'One tap corrects a tone. Football talk fools machines: “killer finish” is praise.', 1)}
        ${step(4, 'The brief at 8am', 'By email and WhatsApp: the big stories, the mood, what to watch. No one has to open the dashboard.', 1)}
        ${step(5, 'Alerts and reports', 'An alert the moment a topic turns, share of voice, and a monthly report for partners.', 2)}</div>
        <p class="note" style="margin-top:14px">Articles are summarised and linked, never republished. Fans’ public posts are counted as trends, never kept on named people (PDPA). Meltwater and Brandwatch charge about US$25,000–50,000 a year for this.</p></div>`;
    }
    return head('Media', 'What the press and fans are saying about the SPL, in one brief every morning.', '') + tabs + chips + body;
  }
  const PAGES = { overview: ['Overview', overview], fixtures: ['Fixtures', fixtures], matchday: ['Matchday', matchday], news: ['News', news], push: ['Notifications', push], votes: ['Awards', votes], sponsors: ['Sponsors', sponsors], shop: ['Shop', shop], analytics: ['Analytics', analytics], media: ['Media', media], activity: ['Activity', activity], settings: ['Settings', settings] };
  // ---------- staff sign-in (backend.js set): only logins on the FAS staff list get past this ----------
  const CL = window.SPLCLOUD || { on: false, state: { status: 'demo' } };
  A.authed = !CL.on; A.checking = CL.on;
  function signinPage() {
    return `<div class="sibg"><span></span><span></span><span></span><span></span></div>
      <form class="signin" id="siForm" novalidate><div class="sihead"><span class="spl-h" role="img" aria-label="Singapore Premier League"></span><span class="lbl">Admin</span></div>
      <h1>Sign in</h1>
      <label class="lbl" for="siE">Email</label><input id="siE" type="email" autocomplete="username" placeholder="you@fas.org.sg" value="${E(A.siEmail || '')}">
      <label class="lbl" for="siP">Password</label><input id="siP" type="password" autocomplete="current-password" enterkeyhint="go">
      ${A.siErr ? `<p class="err">${E(A.siErr)}</p>` : ''}<button class="btn" type="submit" ${A.siBusy ? 'disabled' : ''}>${A.siBusy ? 'Signing in…' : 'Sign in'}</button>
      <p class="sinote">For Football Association of Singapore staff. Every change you save goes live in the app.</p></form>`;
  }

  const statusLine = () => { const st = CL.state; if (!CL.on) return '<span class="cs demo">Demo · this browser only</span>';
    if (st.status === 'live') return `<span class="cs live">Live · saved${st.updatedAt ? ' ' + new Date(st.updatedAt).toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' }) : ''}</span>`;
    return `<span class="cs off" title="${E(st.error || '')}">${st.status === 'connecting' ? 'Connecting…' : 'Offline · changes wait'}</span>`; };
  const GROUPS = [['League', ['overview', 'fixtures', 'matchday', 'news']], ['Fans', ['push', 'votes']], ['Commercial', ['sponsors', 'shop', 'analytics', 'media']], ['FAS', ['activity', 'settings']]];
  try { A.look = localStorage.getItem('spl-admin-look') === 'light' ? 'light' : 'dark'; } catch (e) { A.look = 'dark'; }
  const myName = () => CL.on ? (CL.state.name || (CL.state.email || '').replace(/@.*/, '')) : '[STAFF NAME]';
  function searchHits(q) {
    q = q.trim().toLowerCase(); if (!q) return [];
    const hits = Object.keys(PAGES).filter(k => PAGES[k][0].toLowerCase().includes(q)).map(k => ['Page', PAGES[k][0], `data-page="${k}"`]);
    D.news.filter(n => (n.title + ' ' + n.dek).toLowerCase().includes(q)).slice(0, 5).forEach(n => hits.push(['Story', n.title, `data-gonews="${E(n.id)}"`]));
    D.pushes.slice().reverse().filter(p => (p.title + ' ' + p.body).toLowerCase().includes(q)).slice(0, 3).forEach(p => hits.push(['Alert', p.title, 'data-page="push"']));
    ROUND.forEach(i => { const m = SPL.matches[i]; if ((C[m[2]].name + ' ' + C[m[3]].name).toLowerCase().includes(q)) hits.push(['This round', `${C[m[2]].short} v ${C[m[3]].short}`, `data-console="${i}"`]); });
    return hits.slice(0, 10);
  }
  const srchDrop = () => { const h = searchHits(A.q || ''); return A.q ? `<div class="sdrop">${h.length ? h.map((x, j) => `<button class="${j === 0 ? 'on' : ''}" ${x[2]}><span class="lbl">${x[0]}</span>${E(x[1])}</button>`).join('') : '<p class="note">Nothing found.</p>'}</div>` : ''; };
  // where the back button goes: out of a month's awards, out of side-by-side, out of a story being edited
  const backTo = () => A.page === 'votes' && A.awm ? 'all months' : A.page === 'matchday' && A.multi ? 'one game' : A.page === 'news' && A.news ? 'all stories' : '';
  // the phone beside the story editor follows the editor as it is (Hafiz, 12 Nov): photos and text before Save, through
  // 'spl-preview' in this browser's storage, which only the embedded app with &draft=1 reads
  function writePreview() {
    if (A.page !== 'news' || !A.news) return; const n = A.news === 'new' ? {} : D.news.find(x => x.id === A.news) || {}, f = (id, v) => document.getElementById(id) ? val(id) : v;
    const imgs = (A.nImgs || []).slice(0, 12), pv = { id: A.news === 'new' ? '__new' : A.news, tag: f('nTag', n.tag || 'Announcement'), title: f('nTitle', n.title || '') || '[HEADLINE]', dek: f('nDek', n.dek || ''), body: f('nBody', n.body || ''),
      date: n.date || TODAY, img: imgs[0] || '', imgs, pos: imgs.map((_, j) => (A.nPos || [])[j] || ''), status: 'draft', at: 0 };
    try { localStorage.setItem('spl-preview', JSON.stringify(pv)); } catch (e) {} }
  let pvT = 0;
  document.addEventListener('input', e => { if (!/^n(Title|Dek|Body|Tag)$/.test(e.target.id || '')) return; clearTimeout(pvT); pvT = setTimeout(() => { writePreview(); const fr = document.getElementById('phone'); if (fr && fr.contentWindow) fr.contentWindow.postMessage('spl-preview', location.origin); }, 500); });
  function render() {
    setDay(); writePreview();
    // the page lives in the address bar, so a refresh comes back to it (Hafiz, 9 Nov)
    try { const u = new URL(location.href); if (u.searchParams.get('page') !== A.page) { u.searchParams.set('page', A.page); history.replaceState(null, '', u); } } catch (e) {}
    document.body.dataset.look = A.look;
    root.classList.toggle('si', !!(CL.on && (A.checking || !A.authed)));
    if (CL.on && (A.checking || !A.authed)) { root.innerHTML = A.checking ? '<div class="sibg"><span></span><span></span><span></span><span></span></div><div class="signin"><p class="sinote">Checking your sign-in…</p></div>' : signinPage(); return; }
    const liveNow = ROUND.some(i => { if (stale(i)) return false; const p = (D.live[i] || {}).phase; return p === '1H' || p === '2H' || p === 'HT'; });
    const keep = document.scrollingElement.scrollTop, focusQ = document.activeElement && document.activeElement.id === 'gq', caret = focusQ ? document.activeElement.selectionStart : 0;
    const nv = k => `<button class="nv ${A.page === k ? 'on' : ''}" data-page="${k}">${icon(k)}<span>${PAGES[k][0]}</span>${k === 'matchday' ? `<b class="${liveNow ? 'live' : ''}">${liveNow ? 'LIVE' : TONIGHT.length ? 'TODAY' : ''}</b>` : k === 'news' && D.news.some(n => n.status === 'draft') ? `<b class="n">${D.news.filter(n => n.status === 'draft').length} draft</b>` : ''}</button>` +
      (k === 'matchday' ? ROUND.map(i => { const m = SPL.matches[i], ph = (D.live[i] || {}).phase; return `<button class="nv sub ${A.page === 'matchday' && A.live === i ? 'on' : ''}" data-console="${i}"><span><em class="dd">${dayName(m[1]).slice(0, 3)}</em>${short(m[2])} v ${short(m[3])}</span>${['1H', '2H', 'HT'].includes(ph) ? '<i class="ldot"></i>' : ''}</button>`; }).join('') : '');
    const stamp = `Matchweek ${SPL.matches[ROUND[0]][0]}${TONIGHT.length ? ` · ${TONIGHT.length === 1 ? 'one game' : TONIGHT.length + ' games'} today` : ` · from ${dayName(SPL.matches[ROUND[0]][1])} ${new Date(SPL.matches[ROUND[0]][1] + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}`;
    root.innerHTML = `<div class="glow" aria-hidden="true"><span></span><span></span><span></span></div>
      <aside class="side g"><div class="brand"><span class="spl-h" role="img" aria-label="Singapore Premier League"></span><small>Admin</small></div>
      <nav>${GROUPS.map(([t, ks]) => `<div class="sec">${t}</div>${ks.map(nv).join('')}`).join('')}</nav>
      <div class="foot">${statusLine()}<a class="lnk" href="index.html" target="_blank" rel="noopener">Open the app ↗</a></div></aside>
      <div class="col"><header class="top g">${backTo() ? `<button class="ib back" data-back="1" aria-label="Back to ${E(backTo())}" title="Back to ${E(backTo())}">${icon('back')}</button>` : ''}<div class="tt"><b>${PAGES[A.page][0]}${A.page === 'votes' && A.awm ? ' · ' + E(mName(A.awm)) : ''}</b><span>${backTo() ? 'Back to ' + E(backTo()) : stamp}</span></div>
        <div class="clk" title="Today, and the time the console's clock runs on"><span>${E(new Date(TODAY + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }))}</span><b id="clkT">${clockNow()}</b></div><div class="srch">${icon('search')}<input id="gq" placeholder="Search pages, news, alerts…" value="${E(A.q || '')}" autocomplete="off" aria-label="Search"><kbd>⌘K</kbd>${srchDrop()}</div>
        <button class="ib" data-setlook="${A.look === 'light' ? 'dark' : 'light'}" title="${A.look === 'light' ? 'Dark' : 'Light'} mode" aria-label="Switch to ${A.look === 'light' ? 'dark' : 'light'} mode">${icon(A.look === 'light' ? 'moon' : 'sun')}</button>
        <button class="ib" data-page="push" title="Notifications" aria-label="Notifications">${icon('push')}</button>
        <span class="newwrap"><button class="new" data-newmenu="1">+ New</button>${A.newOpen ? `<div class="nmenu"><button data-qnews="1">${icon('news')}Story</button><button data-page="push">${icon('push')}Notification</button><button data-console="${TONIGHT[0]}">${icon('matchday')}Live game</button><button data-page="votes">${icon('votes')}Goal of the Month</button></div>` : ''}</span>
        <span class="me" tabindex="0" title="${E(CL.on ? CL.state.email : '')}">${E(initials(myName()))}${CL.on ? `<span class="mmenu"><b>${E(myName())}</b><span class="note">${E(CL.state.email)}</span><button class="lnk" data-signout="1">Sign out</button></span>` : ''}</span></header>
      <main class="main">${PAGES[A.page][1]()}</main></div>${A.flash ? `<div class="flash">${E(A.flash)}</div>` : ''}`;
    document.scrollingElement.scrollTop = keep;
    if (focusQ) { const el = document.getElementById('gq'); el.focus(); el.setSelectionRange(caret, caret); }
  }

  // ---------- actions ----------
  const val = id => { const el = document.getElementById(id); return el ? el.value : ''; };
  // jumping the clock (Hafiz, 10 Nov, option A, for the FAS demo): straight to the minutes worth showing, the end of the
  // first half, then 70' (nominees), 75' (the vote opens) and 88'. Forward only; the game then runs on from there.
  const JUMPS = { '1H': [45], '2H': [70, 75, 88] };
  const jumps = (c, sm) => { const js = (JUMPS[c.phase] || []).filter(n => n > c.n); return js.length ? `<span class="jumps"><span class="lbl">Jump to</span>${js.map(n => `<button class="btn2${sm}" data-jump="${n}">${n}'</button>`).join('')}</span>` : ''; };
  function setLive(i, fn) { save(d => { const L = d.live[i] || { phase: 'pre', t0: 0, base: 0, ev: [], sheet: false }; fn(L, d); d.live[i] = L; }); }
  function livePush(d, i, title, body) { d.pushes.push({ id: uid('p'), at: Date.now(), title, body, aud: 'all', kind: 'live', match: i }); }
  async function doSignIn() {
    A.siEmail = val('siE').trim(); const pw = val('siP'); if (!A.siEmail || !pw) { A.siErr = 'Enter your email and password.'; render(); return; }
    A.siBusy = true; A.siErr = ''; render();
    const r = await CL.signIn(A.siEmail, pw); A.siBusy = false;
    if (!r.ok) { A.siErr = r.msg; render(); return; }
    A.authed = true; await CL.pull(); await CL.pullEvents(); await loadAudit(); D = SPLSTORE.read(); render();
  }
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { const el = document.getElementById('gq'); if (el) { e.preventDefault(); el.focus(); el.select(); } }
    if (e.target.id === 'gq' && e.key === 'Escape') { A.q = ''; render(); }
    if (e.target.id === 'gq' && e.key === 'Enter') { const b = document.querySelector('.sdrop button'); if (b) b.click(); } });
  root.addEventListener('submit', e => { if (e.target.id === 'siForm') { e.preventDefault(); if (!A.siBusy) doSignIn(); } });
  root.addEventListener('click', e => {
    { const gi = e.target.closest('[data-gi]'); if (gi && +gi.dataset.gi !== A.live) { A.live = +gi.dataset.gi; } }
    { const st = e.target.closest('[data-starter]'); if (st) { const p = PUSH_STARTERS[+st.dataset.starter]; A.pushPre = { title: p[0], body: p[1] }; A.pushAud = val('pAud') || A.pushAud; render(); return; } }
    if (e.target.id === 'evOg') { A.evOg = e.target.checked; render(); return; }
    { const r = e.target.closest('[data-varr]'); if (r) { const el = document.getElementById('varWhy'); if (el) { el.value = r.dataset.varr; el.dispatchEvent(new Event('input', { bubbles: true })); } document.querySelectorAll('.varr button').forEach(b => b.classList.toggle('on', b === r)); return; } }
    { const v = e.target.closest('[data-var],[data-varok],[data-varno]'); if (v) { const d0 = v.dataset;
      if (d0.var !== undefined) { A.varEv = +d0.var; A.varWhy = null; render(); return; }
      if (d0.varno) { A.varEv = null; render(); return; }
      const i = A.live, m = SPL.matches[i], idx = +d0.varok, why = (val('varWhy').trim() || 'an infringement').slice(0, 40); A.varWhy = null;
      setLive(i, (L, D2) => { const ev = L.ev[idx]; if (!ev || ev[3] !== 'G') return; ev[3] = 'D'; ev[9] = why;
        const s = [0, 0]; L.ev.forEach(x => { if (x[3] === 'G') s[x[4] === m[2] ? 0 : 1]++; });
        livePush(D2, i, `NO GOAL ❌ ${short(m[2])} ${s[0]}–${s[1]} ${short(m[3])}`, `VAR rules out ${pname(ev[8] || ev[4], ev[5])}'s goal for ${why}.`); });
      A.varEv = null; flash('Goal ruled out. The score is corrected and fans are told.'); render(); return; } }
    if (e.target.closest('[data-signout]')) { CL.signOut().then(() => { A.authed = false; render(); }); return; }

    const t = e.target.closest('[data-lupub],[data-luclear],[data-mtab],[data-mtone],[data-mshare],[data-mstate],[data-mmute],[data-mwadd],[data-mwdel],[data-mpdf],[data-mvopen],[data-mvclose],[data-mvsave],[data-fxf],[data-fxmw],[data-realload],[data-cleartest],[data-demoset],[data-democlear],[data-jump],[data-ntedit],[data-ntdel],[data-ntpick],[data-mwprev],[data-roundup],[data-airound],[data-pmai],[data-noteadd],[data-notedel],[data-pmopen],[data-pmre],[data-pmadd],[data-pmpub],[data-pmsend],[data-storydraft],[data-nwhen],[data-calwk],[data-picdel],[data-picmv],[data-picframe],[data-page],[data-console],[data-live],[data-phase],[data-nudge],[data-resetmatch],[data-evtype],[data-evteam],[data-addev],[data-delev],[data-reloadphone],[data-newnews],[data-editnews],[data-savenews],[data-lead],[data-delnews],[data-notifynews],[data-sendpush],[data-gotm],[data-savegotm],[data-addgoal],[data-delgoal],[data-savesp],[data-savept],[data-ptclear],[data-clearstats],[data-resetall],[data-ptlook],[data-audwho],[data-audsec],[data-audreload],[data-undo],[data-setlook],[data-back],[data-crowdpub],[data-crowdedit],[data-mocknum],[data-multi],[data-mpick],[data-qadd],[data-qclose],[data-newmenu],[data-qnews],[data-dial],[data-gonews],[data-awm],[data-awback],[data-awall],[data-awnew],[data-awdel],[data-awp],[data-awg],[data-awopen],[data-awclose],[data-awstory],[data-potmok],[data-shopnew],[data-shopedit],[data-shopfil],[data-shopmore],[data-shopstoreopen],[data-shopsave],[data-shopclose],[data-shopdel],[data-shopmv],[data-spicdel],[data-spicmv],[data-shopstore]');
    if (!t && A.newOpen && !e.target.closest('.nmenu')) { A.newOpen = false; render(); return; }
    if (!t) return; const d = t.dataset;
    if (d.awm) { A.awm = d.awm; A.allGoals = false; render(); document.scrollingElement.scrollTop = 0; return; }
    if (d.potmok) { const i = +d.potmok, L = D.live[i], noms = (A.potmDraft && A.potmDraft.i === i ? A.potmDraft.noms : (L.potm && L.potm.length ? L.potm : SPLSTORE.potmSuggest(i, L.ev, POTM_FROM))).filter(Boolean);
      const m = SPL.matches[i]; if (new Set(noms.map(x => x[0])).size < 4) { flash('Pick four different players.'); return; }
      save(d2 => { d2.live[i].potm = noms; }, L.potmOpen ? 'Nominees updated in the app.' : `Nominees confirmed. Voting opens at ${POTM_FROM}'.`); A.potmDraft = null; render(); return; }
    if (d.awback) { A.awm = null; render(); return; }
    if (d.awall) { A.allGoals = !A.allGoals; render(); return; }
    if (d.awnew) { const ks = D.awards.months.map(m => m.key).sort(), last = ks[ks.length - 1] || '2026-10', y = +last.slice(0, 4), mo = +last.slice(5, 7), key = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
      awSave(d2 => { d2.awards.months.push({ key, month: mName(key), stage: 'shortlist', opens: '', closes: '', potm: { picks: [], winner: '' }, gotm: { picks: [], winner: '' } }); }, `${mName(key)} added.`); A.awm = key; render(); return; }
    if (d.awdel) { const dm = D.awards.months.find(m => m.key === d.awdel); if (!confirm(dm && dm.stage !== 'shortlist' ? `Delete ${dm.month}? It is ${dm.stage === 'voting' ? 'open for voting' : 'announced'} in the app; the app goes back to the month before.` : 'Delete this month and its shortlist?')) return; awSave(d2 => { d2.awards.months = d2.awards.months.filter(m => m.key !== d.awdel); }, 'Month deleted.'); A.awm = null; render(); return; }
    if (d.awp) { const [nm, k] = d.awp.split('|'); awSave(d2 => { const m = monthOfKey(d2, A.awm), P = m.potm.picks, j = P.findIndex(x => x.name === nm);
        if (j >= 0) P.splice(j, 1); else if (P.length < MAXN) { const md = monthData(m.key), x = md.players.find(y => y.name === nm); P.push({ id: 'p' + Date.now().toString(36), name: nm, team: k, n: numOf(k, nm), line: x ? `${x.goals} goal${x.goals === 1 ? '' : 's'}` : '', how: '', write: '' }); } }); return; }
    if (d.awg) { awSave(d2 => { const m = monthOfKey(d2, A.awm), G = m.gotm.picks, j = G.findIndex(x => x.id === d.awg);
        if (j >= 0) G.splice(j, 1); else if (G.length < MAXN) { const g = monthData(m.key).goals.find(x => x.id === d.awg); if (g) G.push({ id: g.id, player: g.player, team: g.team, match: g.match, min: g.min, how: '', clip: '', from: '', to: '' }); } }); return; }
    if (d.awopen) { awSave(d2 => { const m = monthOfKey(d2, d.awopen); m.stage = 'voting';
        d2.pushes.push({ id: uid('p'), at: Date.now(), title: `${m.month} Awards 🏆`, body: `Who impressed you this month? Vote for Player and Goal of the Month before ${new Date(m.closes).toLocaleDateString('en-SG', { weekday: 'long' })}.`, aud: 'all', kind: 'manual', match: null }); }, 'The vote is open. Every fan has been told.'); return; }
    // the winners' story (Hafiz, 10 Nov): drafted from the month's result, in house style, as a News draft to check and publish
    if (d.awstory) { const key = d.awstory, id = 'aw-' + key;
      if (!D.news.some(n => n.id === id)) { const m = monthOfKey(D, key), tp = tallyOf(m, 'potm'), tg = tallyOf(m, 'gotm');
        const share = (t, x) => { const tot = Object.values(t).reduce((a, b) => a + b, 0) || 1; return Math.round(100 * (t[x.id] || 0) / tot); };
        const wp = m.potm.picks.find(x => x.id === m.potm.winner), wg = m.gotm.picks.find(x => x.id === m.gotm.winner);
        const sur = n => n.split(' ').slice(-1)[0], pos = x => { const p = (SPL.squads[x.team] || []).find(q => q[1] === x.name); return p ? ({ GK: 'goalkeeper', DF: 'defender', MF: 'midfielder', FW: 'striker' }[p[2]] || 'player') : 'player'; };
        const list = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : a[0] || '';
        const body = [], imgs = [];
        if (wp) { const pp = (D.playerPhotos || {})[wp.team + ':' + wp.n]; if (pp) imgs.push(pp); else if (hasPhoto(wp.team, wp.n)) imgs.push(`pl:${wp.team}:${wp.n}`);
          body.push(`${wp.name} has been voted the Dongfeng Player of the Month for ${m.month}, taking ${share(tp, wp)}% of the fans' vote${wp.line ? ' after ' + wp.line.toLowerCase() + ' for ' + C[wp.team].name : ''}.`);
          if (wp.write || wp.how) body.push(wp.write || `His ${m.month} in numbers: ${wp.how}.`);
          const rest = m.potm.picks.filter(x => x.id !== wp.id).map(x => `${x.name} (${C[x.team].short})`); if (rest.length) body.push(`He beat ${list(rest)} to the award.`); }
        if (wg) { const gp = (D.playerPhotos || {})[wg.team + ':' + numOf(wg.team, wg.player)]; if (gp && !imgs.includes(gp)) imgs.push(gp); else if (hasPhoto(wg.team, numOf(wg.team, wg.player))) { const k = `pl:${wg.team}:${numOf(wg.team, wg.player)}`; if (!imgs.includes(k)) imgs.push(k); }
          if (body.length) body.push('[PHOTO]');
          { const mn = (wg.min || '').replace(/'/g, ''), base = +mn.split('+')[0], ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 10 > 3 || [11, 12, 13].includes(n % 100)) ? 0 : n % 10] || 'th');
            body.push(`The MSIG Goal of the Month goes to ${wg.player}${mn ? ' for his ' + (/\+/.test(mn) ? 'stoppage-time strike' : ord(base) + '-minute strike') : ''}${wg.match ? ' in ' + wg.match : ''}, with ${share(tg, wg)}% of the vote.`); }
          if (wg.how) body.push(wg.how);
          if (wg.clip) body.push('The goal is in the app, under Goal of the Month.'); }
        { const y = +key.slice(0, 4), mo = +key.slice(5, 7), nk = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`; body.push(`Voting for ${mName(nk)}'s awards opens in the app at the start of next month.`); }
        const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'], house = t => t.replace(/(\d+)\s*[–—]\s*(\d+)/g, '$1-$2').replace(/\b([1-9]) (goals?|assists?|clean sheets?|wins?)\b/g, (x, n, w) => WORDS[+n] + ' ' + w);
        for (let k = 0; k < body.length; k++) body[k] = house(body[k]);
        const n = { id, tag: 'Announcement', date: TODAY, title: wp ? `${sur(wp.name)} named ${m.month} Player of the Month` : `${m.month}'s Goal of the Month: ${wg.player}`,
          dek: house([wp && `${C[wp.team].short} ${pos(wp)} takes the Dongfeng award`, wg && `${wg.player}'s goal${wg.match ? ' in ' + wg.match : ''} wins MSIG Goal of the Month`].filter(Boolean).join('; ')),
          body: body.join('\n\n'), img: '', imgs, match: null, at: 0, alert: false, status: 'draft' };
        save(d2 => { d2.news.push(n); }, `The ${m.month} winners' story is drafted in News. Check it, add photos, then publish.`); }
      A.page = 'news'; A.news = id; A.nFor = null; render(); document.scrollingElement.scrollTop = 0; return; }
    if (d.awclose) { const m0 = monthOfKey(D, d.awclose), tp = tallyOf(m0, 'potm'), tg = tallyOf(m0, 'gotm'), top = (list, t) => list.slice().sort((a, b) => t[b.id] - t[a.id])[0];
      const wp = top(m0.potm.picks, tp), wg = top(m0.gotm.picks, tg); if (!confirm(`Close the vote and announce ${[wp && wp.name, wg && wg.player].filter(Boolean).join(' and ')}? Every fan is told.`)) return;
      awSave(d2 => { const m = monthOfKey(d2, d.awclose); m.stage = 'announced'; m.potm.winner = wp ? wp.id : ''; m.gotm.winner = wg ? wg.id : '';
        d2.pushes.push({ id: uid('p'), at: Date.now(), title: `${m.month}'s winners 🏆`, body: [wp && `${wp.name} is the Dongfeng Player of the Month`, wg && `${wg.player} wins MSIG Goal of the Month`].filter(Boolean).join('. ') + '.', aud: 'all', kind: 'manual', match: null }); }, 'Announced. The app shows the winners.'); return; }
    if (d.mocknum) { A.mockOn = !A.mockOn; try { localStorage.setItem('spl-admin-mock', A.mockOn ? 'on' : 'off'); } catch (x) {} flash(A.mockOn ? 'Example numbers on.' : 'Showing what phones recorded.'); render(); return; }
    if (d.back) { if (A.page === 'votes') A.awm = null; else if (A.page === 'matchday') { A.multi = null; A.qf = null; } else if (A.page === 'news') A.news = null; render(); document.scrollingElement.scrollTop = 0; return; }
    if (d.crowdpub) { publishCrowd(+d.crowdpub); return; }
    if (d.crowdedit) { if (!confirm('Change the published attendance? The winner stays as announced until you publish again.')) return; save(d2 => { const x = d2.crowd[+d.crowdedit]; if (x) { x.attendance = null; } }); return; }
    if (d.multi !== undefined) { if (d.multi === '1') { const same = ROUND.filter(j => SPL.matches[j][1] === SPL.matches[A.live][1]); A.multi = same.length > 1 ? same : ROUND.slice(0, 2); } else A.multi = null; A.qf = null; render(); return; }
    if (d.mpick) { const j = +d.mpick, on = A.multi.includes(j); A.multi = on ? A.multi.filter(x => x !== j) : A.multi.concat(j).sort((a, b) => a - b); if (!A.multi.length) A.multi = [j]; render(); return; }
    if (d.qadd) { const [k, t] = d.qadd.split('|'); A.evTeam = k; A.evType = t; A.evOg = false; A.qf = { i: A.live }; A.varEv = null; render(); const el = document.getElementById('evP'); if (el) el.focus(); return; }
    if (d.qclose) { A.qf = null; render(); return; }
    if (d.setlook) { A.look = d.setlook; try { localStorage.setItem('spl-admin-look', A.look); } catch (x) {} render(); return; }
    if (d.newmenu) { A.newOpen = !A.newOpen; render(); return; }
    if (d.qnews) { A.page = 'news'; A.news = 'new'; A.newOpen = false; render(); return; }
    if (d.dial) { A.dial = +d.dial; render(); return; }
    if (d.gonews) { A.page = 'news'; A.news = d.gonews; A.q = ''; render(); return; }
    if (d.page) { if (d.page === 'votes' && A.page === 'votes') A.awm = null; A.page = d.page; A.newOpen = false; A.q = ''; render(); document.scrollingElement.scrollTop = 0; if (d.page === 'activity') loadAudit().then(render); return; }
    if (d.audwho !== undefined) { A.audWho = d.audwho; render(); return; }
    if (d.audsec !== undefined) { A.audSec = d.audsec; render(); return; }
    if (d.audreload) { loadAudit().then(() => { flash('Up to date.'); render(); }); return; }
    if (d.undo) { const r = AUD.find(x => String(x.id) === d.undo); if (!r || !canUndo(r)) { flash('That has changed again since; put back the latest change first.'); render(); return; }
      if (!confirm(`Put ${(SECTION[r.section] || r.section).toLowerCase()} back as it was before ${r.who.replace(/@.*/, '')}'s change? Fans see it straight away.`)) return;
      save(d2 => { d2[r.section] = JSON.parse(JSON.stringify(r.before)); }, 'Put back. It\'s in the app now.'); setTimeout(() => loadAudit().then(render), 1500); return; }
    if (d.console) { A.newOpen = false; A.q = ''; A.page = 'matchday'; A.live = +d.console; A.evTeam = null; render(); return; }
    if (d.live) { A.live = +d.live; A.evTeam = null; render(); return; }
    if (d.phase) { const i = A.live, m = SPL.matches[i], ph = d.phase, notify = true;
      setLive(i, (L, D2) => { const c = clockOf(i), s = scoreOf(i);
        if (ph === '1H') { L.phase = '1H'; L.t0 = Date.now(); L.base = 0; if (notify) livePush(D2, i, `Kick-off · ${short(m[2])} v ${short(m[3])}`, `${m[5]} · follow it live in the app`); }
        if (ph === 'HT') { L.phase = 'HT'; L.ev.push([1, 45, Math.max(0, c.n - 45), 'HT']); livePush(D2, i, `Half time ⏸️ ${short(m[2])} ${s[0]}–${s[1]} ${short(m[3])}`, `Back for the second half in 15 minutes at ${m[5]}.`); }
        if (ph === '2H') { L.phase = '2H'; L.t0 = Date.now(); L.base = 45; }
        if (ph === 'FT') { L.phase = 'FT'; L.ev.push([2, 90, Math.max(0, c.n - 90), 'FT']); livePush(D2, i, `Full time 🏁 ${short(m[2])} ${s[0]}–${s[1]} ${short(m[3])}`, 'Who was your Player of the Match? Vote now.'); } });
      flash({ '1H': 'Kicked off. The app is live.', HT: 'Half time sent.', '2H': 'Second half under way.', FT: 'Full time. The vote opens in the app.' }[ph]); render(); return; }
    if (d.mvopen !== undefined) { const i = +d.mvopen, m = SPL.matches[i], o = SPLSTORE.moveOf(i);
      A.mv = { i, status: o ? o.status : 'post', date: o && o.date ? o.date : '', time: o && o.time ? time24(o.time) : time24(o ? o.wasStatus : m[7]), venue: m[5], reason: o ? o.reason : '', alert: true, story: !o }; render(); return; }
    if (d.mvclose) { A.mv = null; render(); return; }
    if (d.mvsave) { const x = A.mv, i = x.i, m = SPL.matches[i];
      if (x.status === 'moved' && (!x.date || !x.time)) { flash('Pick the new date and kick-off.'); render(); return; }
      const t2 = mvText(i, x), o = SPLSTORE.moveOf(i), was = o ? o.was : m[1], wasVenue = o ? o.wasVenue : m[5];
      save(d2 => { d2.moves = d2.moves || {};
        if (x.status === 'none') delete d2.moves[i]; else d2.moves[i] = { status: x.status, date: x.status === 'moved' ? x.date : '', time: x.status === 'moved' ? time12(x.time) : '', venue: x.venue !== wasVenue ? x.venue : '', reason: x.reason.trim(), at: Date.now() };
        if (x.alert) d2.pushes.push({ id: uid('p'), at: Date.now(), title: t2.title, body: t2.body, aud: 'all', kind: 'live', match: i });
        if (x.story) { const H = C[m[2]].name, Aw = C[m[3]].name, r = x.reason.trim().replace(/\.$/, '');
          const body = x.status === 'post' ? [`The Singapore Premier League match between ${H} and ${Aw}, scheduled for ${dLong(was)} at ${wasVenue}, has been postponed.`, r ? r + '.' : '[THE REASON, AS FAS ANNOUNCES IT]', 'A new date will be announced.']
            : x.status === 'moved' ? [`The Singapore Premier League match between ${H} and ${Aw}, scheduled for ${dLong(was)}, will now be played on ${dLong(x.date)} at ${x.venue}, kick-off ${time12(x.time)}.`, r ? r + '.' : '[THE REASON, AS FAS ANNOUNCES IT]']
            : [`The Singapore Premier League match between ${H} and ${Aw} goes ahead as scheduled on ${dLong(was)} at ${wasVenue}.`];
          d2.news.push({ id: uid('n'), tag: 'Fixtures', date: TODAY, title: `Fixture update: ${H} v ${Aw}`, dek: t2.body, body: body.join('\n\n'), img: '', imgs: [], match: i, at: 0, alert: false, status: 'draft' }); } },
        `${short(m[2])} v ${short(m[3])}: ${x.status === 'post' ? 'postponed' : x.status === 'moved' ? 'moved to ' + dLong(x.date) : 'back on as scheduled'}.${x.alert ? ' Fans told.' : ''}${x.story ? ' A Fixture update story is in News as a draft.' : ''}`);
      A.mv = null; render(); return; }
    if (d.fxf) { A.fxF = d.fxf; render(); return; }
    if (d.fxmw !== undefined) { const now = SPLSTORE.roundOf(TODAY), mx = Math.max(...SPL.matches.map(m => m[0])); A.fxFrom = +d.fxmw === 0 ? Math.max(1, now - 2) : Math.min(Math.max(1, (A.fxFrom || Math.max(1, now - 2)) + +d.fxmw), mx); render(); return; }
    if (d.realload) { const i = +val('realI'), F = SPL.feeds && SPL.feeds[i]; if (!F) return;
      if (D.live[i] && D.live[i].phase !== 'pre' && !confirm('This game already has console events. Replace them with the real ones?')) return;
      save(d2 => { const ev = F.map(e => e.slice()); d2.live[i] = { phase: 'FT', t0: Date.now() - 110 * 60000, base: 46, sheet: true, ev, notes: (REALNOTES[i] || []).map(n => [n[0], n[1], n[2].slice()]), potm: SPLSTORE.potmSuggest(i, ev, POTM_FROM), potmOpen: false }; },
        `${short(SPL.matches[i][2])} v ${short(SPL.matches[i][3])} loaded as finished, with its real events. No alerts were sent. Press Write with AI on the post-match panel.`);
      A.live = i; A.multi = null; render(); return; }
    if (d.mtab) { A.mtab = d.mtab; render(); return; }
    if (d.lupub !== undefined) { const i = +d.lupub; if (!luState(i).ok) return; const m = SPL.matches[i], lu = luDraft(i), al = !!(document.getElementById('luAlert') || {}).checked;
      const ent = x => x.kind === 'squad' ? x.no : [x.no, x.name], sent = D.pushes.some(p => p.kind === 'live' && p.match === i && /^Line-ups are in/.test(p.title || ''));
      const sheets = {}; [m[2], m[3]].forEach(k => { const ch = luCheck(i, k); if (ch.xi.length) sheets[k] = { xi: ch.xi.map(ent), bench: ch.bench.map(ent) }; });
      setLive(i, (L, d2) => { L.xi = sheets; if (al && !sent) livePush(d2, i, `Line-ups are in 📋 ${short(m[2])} v ${short(m[3])}`, `See who starts at ${m[5]}.`); });
      [m[2], m[3]].forEach(k => { lu.c[k].unsure = {}; lu.c[k].read = false; lu.c[k].note = ''; lu.c[k].err = ''; });
      flash(al && !sent ? 'Line-ups published. Followers of both clubs have been told.' : 'Line-ups published.'); render(); return; }
    if (d.luclear !== undefined) { if (!confirm('Take the line-ups down? Fans will see "Line-up to follow" again.')) return;
      setLive(+d.luclear, L => { L.xi = {}; }); A.lu = null; flash('Line-ups taken down.'); render(); return; }
    if (d.mtone) { const x = MEDIA.stories.find(y => y[0] === d.mtone), o = ['pos', 'neu', 'neg'], cur = (MA.tone || {})[x[0]] || x[1]; MA.tone = Object.assign({}, MA.tone, { [x[0]]: o[(o.indexOf(cur) + 1) % 3] }); mSave(); flash('Tone corrected.'); render(); return; }
    if (d.mmute) { MA.muted = 1; mSave(); flash('Muted until it changes.'); render(); return; }
    if (d.mwadd) { const v = (document.getElementById('mwIn') || {}).value || ''; if (!v.trim()) return; MA.watch = (MA.watch || []).concat(v.trim().slice(0, 80)); mSave(); flash('Added to the watch list.'); render(); return; }
    if (d.mwdel !== undefined) { (MA.watch || []).splice(+d.mwdel, 1); mSave(); render(); return; }
    if (d.mpdf) { const w = window.open('', '_blank'); if (!w) return; w.document.write(`<title>SPL partner report</title><style>body{font:14px Inter,Arial;padding:40px;color:#15142A}table{border-collapse:collapse;width:100%}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}button,.mact{display:none}.lbl{color:#888;font-size:12px;margin-left:8px}</style>` + document.getElementById('mpr').innerHTML); w.document.close(); w.print(); return; }
    if (d.mshare || d.mstate) { const x = MEDIA.stories.find(y => y[0] === (d.mshare || d.mstate)), nw = d.mshare
        ? { id: uid('n'), tag: 'News', date: TODAY, title: x[2], dek: `From ${x[3]}.`, body: `[ONE-LINE SUMMARY]\n\nRead it on ${x[3]}${x[5] ? ': ' + x[5] : '.'}`, img: '', imgs: [], match: null, at: 0, alert: false, status: 'draft' }
        : { id: uid('n'), tag: 'Announcement', date: TODAY, title: '[STATEMENT HEADLINE]', dek: '[ONE LINE]', body: `[FAS STATEMENT ON ${x[2]}]`, img: '', imgs: [], match: null, at: 0, alert: false, status: 'draft' };
      save(d2 => { d2.news.push(nw); }, d.mshare ? 'Drafted in News with the link. Add a line and publish.' : 'Statement drafted in News.'); A.page = 'news'; A.news = nw.id; A.nFor = null; render(); return; }
    if (d.cleartest) { const on = k => { const x = document.getElementById('clr-' + k); return !!(x && x.checked); }, pick = ['games', 'alerts', 'news', 'mock', 'stats'].filter(on);
      if (!pick.length) { flash('Tick what to clear.'); render(); return; }
      if (!confirm('Clear the ticked test data? Phones follow straight away.')) return;
      const seed = SPLSTORE.seed(), seedIds = seed.news.map(n => n.id);
      save(d2 => { if (on('games')) { d2.live = {}; d2.crowd = {}; } if (on('alerts')) d2.pushes = [];
        if (on('news')) { d2.news = d2.news.filter(n => seedIds.includes(n.id)); if (!d2.news.some(n => n.id === d2.lead)) d2.lead = seed.lead; } });
      if (on('mock')) { A.mockOn = false; try { localStorage.setItem('spl-admin-mock', 'off'); } catch (x) {} }
      if (on('stats')) { try { localStorage.removeItem(SPLSTORE.EVK); localStorage.removeItem('spl-evdev'); } catch (x) {} }
      A.pm = {}; A.news = null; A.potmDraft = null; flash(`Cleared: ${pick.map(k => ({ games: 'console games', alerts: 'alerts', news: 'added stories', mock: 'example numbers', stats: 'analytics' })[k]).join(', ')}.`); render(); return; }
    if (d.demoset) { const i = +val('demoI'), at = Date.parse(val('demoAt')); if (!SPL.matches[i] || !at) { flash('Pick a game and a time.'); render(); return; }
      save(d2 => { d2.demo = { i, at }; }, `Demo game set: ${short(SPL.matches[i][2])} v ${short(SPL.matches[i][3])}, ${new Date(at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}.`); A.live = i; render(); return; }
    if (d.democlear) { save(d2 => { d2.demo = null; }, 'Back to the real fixture dates.'); render(); return; }
    if (d.jump) { const n = +d.jump; setLive(A.live, L => { L.t0 = Date.now() - (n - L.base - 1) * 60000 - 1000; }); flash(`Clock moved to ${n}'.`); render(); return; }
    if (d.nudge) { setLive(A.live, L => { L.t0 -= (+d.nudge) * 60000; }); return; }
    if (d.resetmatch) { if (!confirm('Clear this game\'s score, clock and timeline?')) return; save(d2 => { delete d2.live[A.live]; }, 'Game reset.'); if (!ROUND.includes(A.live)) { A.live = TONIGHT[0] || ROUND[0]; render(); } return; }
    if (d.evtype) { A.evType = d.evtype; render(); return; }
    if (d.evteam) { A.evTeam = d.evteam; render(); return; }
    if (d.addev) { const i = A.live, m = SPL.matches[i], k = A.evTeam, p = +val('evP'), a = +val('evA') || 0, raw = val('evM').trim(), mm = raw.match(/^(\d{1,3})(?:\s*\+\s*(\d{1,2}))?$/);
      if (!mm) { flash('Minute: a number like 34, or 45+2.'); render(); return; }
      if (A.evType === 'S' && (!a || a === p)) { flash('Pick who comes on and who goes off.'); render(); return; }
      const min = +mm[1], add = +(mm[2] || 0), half = (min > 45 || ['2H', 'FT'].includes((D.live[i] || {}).phase)) && !(min === 45 && add && (D.live[i] || {}).phase !== '2H') ? 2 : 1;
      const og = A.evType === 'G' && A.evOg, opp = k === m[2] ? m[3] : m[2];
      const ev = [half, min, add, A.evType, k, p, A.evType === 'S' || (A.evType === 'G' && !og) ? a : 0]; if (og) { ev[7] = 'og'; ev[8] = opp; } else if (A.evType === 'G' && document.getElementById('evPen').checked) ev[7] = 'pen';
      const alert = document.getElementById('evPush').checked;
      setLive(i, (L, D2) => { L.ev.push(ev); if (!alert) return; const s = [0, 0]; L.ev.forEach(x => { if (x[3] === 'G') s[x[4] === m[2] ? 0 : 1]++; });
        const who = pname(ev[8] || k, p) + (ev[7] === 'pen' ? ' (pen)' : ev[7] === 'og' ? ' (og)' : '');
        if (ev[3] === 'G') livePush(D2, i, `GOAL! ⚽ ${short(m[2])} ${s[0]}–${s[1]} ${short(m[3])}`, `${minText(ev)} ${who}. Tap to follow it live.`);
        if (ev[3] === 'R') livePush(D2, i, `Red card · ${short(k)}`, `${minText(ev)} ${who} is sent off`);
        if (ev[3] === 'Y') livePush(D2, i, `Yellow card · ${short(k)}`, `${minText(ev)} ${who}`);
        if (ev[3] === 'S') livePush(D2, i, `Substitution · ${short(k)}`, `${minText(ev)} ${pname(k, p)} on for ${pname(k, a)}`); });
      A.qf = null; flash({ G: 'Goal added', Y: 'Yellow card added', R: 'Red card added', S: 'Substitution added' }[A.evType] + (alert ? ' and sent to fans.' : '.')); render(); return; }
    if (d.delev) { setLive(A.live, L => { L.ev.splice(+d.delev, 1); }); flash('Removed.'); render(); return; }
    if (d.reloadphone) { const f = document.getElementById('phone'); if (f) f.src = f.src; return; }
    if (d.newnews) { A.nFor = null; A.news = 'new'; render(); return; }
    if (d.editnews) { A.nFor = null; A.news = d.editnews; render(); return; }
    if (d.noteadd !== undefined) { const i = +d.noteadd, mi = val('noteM').trim().replace(/'/g, ''), t = val('noteT').trim(); if (!t) { flash('Write the moment first.'); render(); return; } if (!/^\d{1,3}(\+\d{1,2})?$/.test(mi)) { flash('Add the minute it happened, e.g. 23 or 45+2.'); render(); return; }
      const m = SPL.matches[i], tags = SPLNEWS.tagNames(t, [m[2], m[3]]), open = tags.filter(x => x[0] === '?').length;
      save(d2 => { const L = d2.live[i]; L.notes = (L.notes || []).concat([[mi, t, tags]]).slice(0, 40); }, open ? 'Noted. One name fits two players: pick which under the note.' : tags.length ? `Noted, with ${tags.length} ${tags.length > 1 ? 'players' : 'player'} tagged.` : 'Noted for the report.'); return; }
    if (d.ntedit) { const [i, j, x] = d.ntedit.split(':').map(Number); A.ntag = { i, j, t: x }; render(); return; }
    if (d.ntdel) { const [i, j, x] = d.ntdel.split(':').map(Number); A.ntag = null; save(d2 => { ntOf(d2, i, j).splice(x, 1); }, 'Tag dropped.'); return; }
    if (d.ntpick) { const [i, j, x, k, n] = d.ntpick.split(':'); A.ntag = null; save(d2 => { const tg = ntOf(d2, +i, +j); tg[+x] = k + ':' + n; d2.live[+i].notes[+j][2] = tg.filter((v, y) => tg.indexOf(v) === y); }, 'Tagged.'); return; }
    if (d.notedel) { const [i, j] = d.notedel.split(':').map(Number); save(d2 => { d2.live[i].notes.splice(j, 1); }, 'Note removed.'); return; }
    if (d.pmai) { const k = d.pmai, i = +k.replace(/^\D+/, ''); if (!CL.on) { flash('The AI writer needs the backend on and the Claude key in Supabase.'); render(); return; }
      A.aiBusy = k; render(); const gen = SPLNEWS.postMatch(D, i);
      CL.writeReport(reportFacts(i, gen)).then(r => { A.aiBusy = null; if (!(r && r.body)) { flash((r && r.error) || 'The writer did not reply.'); render(); return; }
        A.pm[k] = { head: r.head, dek: r.dek, body: r.body };
        // option C (Hafiz, 10 Nov): it lands in News as a draft, where the photos go in: the cover, then one per [PHOTO]
        const old = D.news.find(n => n.match === i && n.tag === 'Report'), id = old ? old.id : uid('n'), was = old && SPLSTORE.isOut(old), slots = (r.body.match(/^\[PHOTO\]$/gm) || []).length;
        save(d2 => { const n = d2.news.find(x => x.id === id); const fields = { title: r.head, dek: r.dek, body: r.body, status: 'draft', at: 0, ai: true };
          if (n) Object.assign(n, fields); else d2.news.push(Object.assign({ id, tag: 'Report', date: TODAY, img: '', imgs: [], match: i, alert: false }, fields)); },
          `Written and saved in News as a draft${was ? ' (the published report is back to draft until you publish this one)' : ''}. Add a cover photo${slots ? ` and ${slots} more for the [PHOTO] ${slots > 1 ? 'slots' : 'slot'}` : ''}, read it through, then publish.`);
        A.page = 'news'; A.news = id; A.nFor = null; A.nWhenT = 'draft'; render(); });
      return; }
    if (d.pmopen) { A.page = 'news'; A.news = d.pmopen; A.nFor = null; render(); return; }
    if (d.pmre) { delete A.pm[d.pmre]; flash('Rewritten from the data.'); render(); return; }
    if (d.pmadd) { const k = t.closest('[data-pmk]').dataset.pmk, cur = A.pm[k]; const parts = cur.body.split('\n\nHow the match unfolded'); parts[0] = parts[0].replace(/\s*$/, '') + (k.startsWith('pre') ? ' ' : '\n\n') + d.pmadd; cur.body = parts.join('\n\nHow the match unfolded'); render(); return; }
    if (d.pmpub) { pmSave(d.pmpub, true); return; }
    if (d.pmsend) { pmSave(d.pmsend, false); return; }
    if (d.mwprev) { const x = SPLNEWS.mwPreview(D, +d.mwprev); if (!x) return; const n = { id: uid('n'), tag: 'Preview', date: TODAY, title: x.head, dek: x.dek, body: x.body, img: '', imgs: [], match: null, at: 0, alert: false, status: 'draft' };
      save(d2 => { d2.news.push(n); }, `Matchweek ${x.mw} preview drafted in the SPL's format (${x.games} games). Add photos for the [PHOTO] slots, fill the [BRACKETS], publish or schedule.`); A.news = n.id; A.nFor = null; render(); return; }
    // the AI roundup (Hafiz, 10 Nov, option A): spl.sg's format, written by the same writer, saved in News as a draft
    if (d.airound) { const mw = +d.airound, k = 'ru' + mw; if (A.aiBusy) return; if (!CL.on) { flash('The AI writer needs the backend on and the Claude key in Supabase.'); render(); return; }
      const f = SPLNEWS.roundupFacts(D, mw); if (!f) return; A.aiBusy = k; render();
      CL.writeReport(f, 'roundup').then(r => { A.aiBusy = null; if (!(r && r.body)) { flash((r && r.error) || 'The writer did not reply.'); render(); return; }
        const id = 'airu' + mw, old = D.news.find(n => n.id === id), was = old && SPLSTORE.isOut(old), slots = (r.body.match(/^\[PHOTO\]$/gm) || []).length;
        save(d2 => { const fields = { title: `2026/27 Singapore Premier League Matchweek ${mw}: Roundup`, dek: r.dek, body: r.body, status: 'draft', at: 0 }, n = d2.news.find(x => x.id === id);
          if (n) Object.assign(n, fields); else d2.news.push(Object.assign({ id, tag: 'Roundup', date: TODAY, img: '', imgs: [], match: null, alert: false }, fields)); },
          `Matchweek ${mw} roundup written and saved in News as a draft${was ? ' (the published one is back to draft until you publish this)' : ''}: ${f.games.length} games${slots ? `, ${slots} [PHOTO] slots` : ''}. Add a cover and the photos, read it through, then publish.`);
        A.page = 'news'; A.news = id; A.nFor = null; A.nWhenT = 'draft'; render(); });
      return; }
    if (d.roundup) { const x = SPLNEWS.roundup(D, +d.roundup); if (!x) return; const n = { id: uid('n'), tag: 'Roundup', date: TODAY, title: x.head, dek: x.dek, body: x.body, img: '', imgs: [], match: null, at: 0, alert: false, status: 'draft' };
      save(d2 => { d2.news.push(n); }, `Matchweek ${x.mw} roundup drafted in the SPL's format (${x.games} games). Fill the [BRACKETS], add photos, publish or schedule.`); A.news = n.id; A.nFor = null; render(); return; }
    if (d.storydraft !== undefined) { const s = SPLNEWS.storylines(D)[+d.storydraft], x = SPLNEWS.storyDraft(D, s), n = { id: uid('n'), tag: 'Review', date: TODAY, title: x.head, dek: x.dek, body: x.body, img: '', imgs: [], match: null, at: 0, alert: false, status: 'draft' };
      save(d2 => { d2.news.push(n); }, 'Drafted from the storyline. Fill the [BRACKETS], add photos, publish or schedule.'); A.news = n.id; A.nFor = null; render(); return; }
    if (d.nwhen) { keepNews(); A.nWhenT = d.nwhen; render(); return; }
    if (d.calwk !== undefined) { A.calWk = +d.calwk === 0 ? 0 : (A.calWk || 0) + +d.calwk; render(); return; }
    if (d.shopfil) { A.shopFil = d.shopfil; render(); return; }
    if (d.shopmore) { keepShop(); A.shopMore = true; render(); return; }
    if (d.shopstoreopen) { A.shopStore = !A.shopStore; render(); return; }
    if (d.shopnew) { A.shopE = 'new'; A.sFor = undefined; render(); document.scrollingElement.scrollTop = 0; return; }
    if (d.shopedit !== undefined) { A.shopE = +d.shopedit; A.shopMore = false; render(); return; }
    if (d.shopclose) { A.shopE = null; A.sFor = undefined; render(); return; }
    if (d.spicdel !== undefined) { keepShop(); A.sImgs.splice(+d.spicdel, 1); render(); return; }
    if (d.spicmv) { keepShop(); const [j, dir] = d.spicmv.split(':').map(Number), a = A.sImgs, x = a[j]; a[j] = a[j + dir]; a[j + dir] = x; render(); return; }
    if (d.shopmv) { const [j, dir] = d.shopmv.split(':').map(Number), L = D.shop, t = L[j].tab; let k = j + dir; while (L[k] && L[k].tab !== t) k += dir; if (!L[k]) return;
      save(d2 => { const a = d2.shop, x = a[j]; a[j] = a[k]; a[k] = x; }, 'Order saved.'); if (A.shopE === j) { A.shopE = k; A.sFor = k; } return; }
    if (d.shopstore) { const u = SPLSTORE.shopeeUrl(val('shStore')); if (!u) { flash('That isn\'t a Shopee address (shopee.sg or shp.ee).'); return; } save(d2 => { d2.shopUrl = u; }, 'Store link saved.'); A.shopStore = false; render(); return; }
    if (d.shopdel !== undefined) { const j = +d.shopdel; if (!confirm('Remove "' + D.shop[j].name + '" from the shop?')) return; save(d2 => { d2.shop.splice(j, 1); }, 'Removed from the shop.'); A.shopE = null; A.sFor = undefined; render(); return; }
    if (d.shopsave) { keepShop(); const cur = A.shopE === 'new' ? { tab: 'lions', club: '', kind: 'jersey', pos: '50% 50%', rating: '', sold: 0 } : D.shop[A.shopE], r = Object.assign({}, cur, ...Object.keys(A.sDraft).filter(k => A.sDraft[k] !== undefined).map(k => ({ [k]: A.sDraft[k] }))), url = String(r.url || '').trim(), name = String(r.name || '').trim();
      if (!name) { flash('Give the product a name.'); return; }
      if (url && !SPLSTORE.shopLink(url)) { flash('That isn\'t a web address. Copy it from the product page: it starts https://'); return; }
      if (r.tab === 'clubs' && !C[r.club]) { flash('Pick the club under More.'); return; }
      const pr = String(r.price || '').replace(/^S?\$\s*/i, '').trim(); if (pr && !/^\d{1,4}(\.\d{1,2})?$/.test(pr)) { flash('Price as a number, like 35 or 14.90.'); return; }
      const x = { id: A.shopE === 'new' ? uid('p') : D.shop[A.shopE].id, name, tab: r.tab, club: r.tab === 'clubs' ? r.club : '', kind: r.kind, price: pr ? (+pr).toFixed(2) : '', off: +r.off || 0, pos: r.pos || '50% 50%', rating: String(r.rating || '').trim(), sold: +r.sold || 0, out: !!r.out, url: SPLSTORE.shopLink(url), imgs: (A.sImgs || []).slice(0, 4) };
      const isNew = A.shopE === 'new';
      save(d2 => { if (isNew) d2.shop.push(x); else d2.shop[A.shopE] = x; }, isNew ? 'Added to the shop. It\'s in the app now.' : 'Saved. The app has it now.');
      if (isNew) { A.shopE = D.shop.length - 1; A.sFor = A.shopE; } A.sDraft = null; render(); return; }
    if (d.picframe !== undefined) { keepNews(); const j = +d.picframe; frameStory(SPLSTORE.picUrl(A.nImgs[j]), (A.nPos || [])[j] || '50% 50%', v => { A.nPos = A.nPos || []; A.nPos[j] = v; render(); flash('Framed. Save the story to keep it.'); }); return; }
    if (d.picdel !== undefined) { keepNews(); A.nImgs.splice(+d.picdel, 1); (A.nPos || []).splice(+d.picdel, 1); render(); return; }
    if (d.picmv) { keepNews(); const [j, dir] = d.picmv.split(':').map(Number), a = A.nImgs, t = a[j]; a[j] = a[j + dir]; a[j + dir] = t; const q = A.nPos = A.nPos || []; const u = q[j]; q[j] = q[j + dir] || ''; q[j + dir] = u || ''; render(); return; }
    if (d.savenews) { const title = val('nTitle').trim(); if (!title) { flash('Give the story a headline.'); render(); return; }
      const mode = d.savenews, old = A.news === 'new' ? null : D.news.find(x => x.id === A.news);
      let at = mode === 'schedule' ? new Date(`${val('nDay')}T${val('nTime') || '09:00'}:00`).getTime() : mode === 'now' ? (old && old.status === 'live' ? (old.at || new Date(old.date + 'T09:00:00').getTime()) : Date.now()) : (old ? old.at : 0);
      if (mode === 'schedule' && !(at > Date.now())) { flash('Pick a time in the future to schedule it.'); render(); return; }
      const alert = mode !== 'draft' && !!(document.getElementById('nAlert') || {}).checked, imgs = (A.nImgs || []).slice(0, 12), pos = imgs.map((_, j) => (A.nPos || [])[j] || '');
      const n = { id: old ? old.id : uid('n'), tag: val('nTag'), date: dayKey(at || Date.now()), title, dek: val('nDek').trim(), body: val('nBody'), img: imgs[0] || '', imgs, pos, at, alert, status: mode === 'now' ? 'live' : mode === 'schedule' ? 'scheduled' : 'draft' };
      save(d2 => { const j = d2.news.findIndex(x => x.id === n.id); if (j >= 0) d2.news[j] = n; else d2.news.push(n);
        // the alert goes with the story: now, or at its scheduled time (replacing one set earlier for this story)
        d2.pushes = d2.pushes.filter(p => !(p.story === n.id && p.at > Date.now()));
        if (alert && !(old && old.alert && old.status === 'live' && mode === 'now')) d2.pushes.push({ id: uid('p'), at: mode === 'now' ? Date.now() : at, title: title.slice(0, 60), body: n.dek.slice(0, 140), aud: 'news', kind: 'manual', match: null, story: n.id });
        if (n.status === 'draft' && d2.lead === n.id) { const other = d2.news.find(x => x.status === 'live' && x.id !== n.id); d2.lead = other ? other.id : ''; } },
        mode === 'now' ? 'Published. It\'s in the app now.' : mode === 'schedule' ? `Scheduled for ${new Date(at).toLocaleString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}.` : 'Saved as a draft.');
      A.news = n.id; A.nFor = null; render(); return; }
    if (d.lead) { save(d2 => { d2.lead = d.lead; }, 'Lead story on Home changed.'); return; }
    if (d.delnews) { if (!confirm('Delete this story?')) return; save(d2 => { d2.news = d2.news.filter(x => x.id !== d.delnews); if (d2.lead === d.delnews) d2.lead = (d2.news.find(x => x.status === 'live') || {}).id || ''; }, 'Deleted.'); A.news = null; render(); return; }
    if (d.notifynews) { const n = D.news.find(x => x.id === d.notifynews); A.pushPre = { title: n.title.slice(0, 60), body: n.dek.slice(0, 140) }; A.pushAud = 'news'; A.page = 'push'; render(); return; }
    if (d.sendpush) { const title = val('pTitle').trim(), body = val('pBody').trim(); if (!title) { flash('A notification needs a title.'); render(); return; }
      let at = Date.now(); if (A.pushWhen === 'later') { const v = val('pAt'); if (!v) { flash('Pick when to send it.'); render(); return; } at = new Date(v).getTime(); if (!(at > Date.now())) { flash('That time has passed.'); render(); return; } }
      const aud = val('pAud'); save(d2 => { d2.pushes.push({ id: uid('p'), at, title, body, aud, kind: 'manual', match: null }); }, at > Date.now() ? 'Scheduled.' : 'Sent to ' + (aud === 'all' ? 'everyone' : audName(aud)) + '.'); A.pushPre = null; render(); return; }
    if (d.gotm) { save(d2 => { const g = d2.gotm;
        if (d.gotm === 'close') g.open = false; if (d.gotm === 'open') g.open = true;
        if (d.gotm === 'publish') { let mine = null; try { mine = (JSON.parse(localStorage.getItem('spl-mock') || '{}').votes || {})[g.month]; } catch (x) {} const t = id => (+g.base[id] || 0) + (mine === id ? 1 : 0); g.winner = g.goals.slice().sort((a, b) => t(b.id) - t(a.id))[0].id; g.open = false; }
        if (d.gotm === 'reopen') { const w = g.goals.find(x => x.id === g.winner); if (w) g.previous.unshift({ month: g.month, player: w.player, team: w.team, match: w.match }); g.winner = ''; g.open = true; g.month = 'November'; g.closes = '2026-12-07'; g.base = {}; g.goals = g.goals.slice(0, 0).concat([{ id: 'g1', player: '', team: 'TAM', match: '', min: '', how: '' }]); }
      }, { close: 'Voting closed.', open: 'Voting reopened.', publish: 'Winner published in the app.', reopen: 'New month started. Add the shortlist.' }[d.gotm]); return; }
    if (d.savegotm || d.addgoal || d.delgoal !== undefined) { save(d2 => { const g = d2.gotm; g.month = val('gMonth').trim() || g.month; g.closes = val('gCloses') || g.closes;
        document.querySelectorAll('[data-gf]').forEach(el => { const [j, f] = el.dataset.gf.split(':'); const x = g.goals[+j]; if (!x) return; if (f === 'player') { const [k, n] = el.value.split('|'); x.team = k; x.player = n.replace(/&amp;/g, '&').replace(/&#39;/g, "'"); } else x[f] = el.value; });
        if (d.addgoal) g.goals.push({ id: uid('g'), player: '', team: 'TAM', match: '', min: '', how: '' });
        if (d.delgoal !== undefined) g.goals.splice(+d.delgoal, 1); }, d.savegotm ? 'Shortlist saved.' : ''); return; }
    if (d.savesp) { save(d2 => { document.querySelectorAll('[data-sp]').forEach(el => { const [k, f] = el.dataset.sp.split(':'); d2.sponsors[k][f] = el.value.trim(); }); }, 'Sponsors saved.'); return; }
    if (d.savept) { save(d2 => { document.querySelectorAll('[data-pt]').forEach(el => { const [j, f] = el.dataset.pt.split(':'); d2.partners[+j][f] = el.value.trim(); }); }, 'Partners screen saved.'); return; }
    if (d.ptlook) { save(d2 => { d2.partnerLook = d.ptlook; }, { light: 'Partners on a white page.', mono: 'Partners in white on navy.', colour: 'Partners on white tiles.' }[d.ptlook]); return; }
    if (d.ptclear) { save(d2 => { d2.partners[+d.ptclear].logo = ''; }); return; }
    if (d.clearstats) { if (!confirm('Clear the recorded analytics?')) return; try { localStorage.removeItem(SPLSTORE.EVK); } catch (x) {} flash('Cleared.'); render(); return; }
    if (d.resetall) { if (!confirm('Reset all the demo data?')) return; SPLSTORE.reset(); D = SPLSTORE.read(); SPLSTORE.write(D); A.news = null; flash('Demo reset.'); render(); return; }
  });
  root.addEventListener('input', e => { if (e.target.id === 'sUrl') { const o = document.getElementById('sUrlOk'), st = linkState(e.target.value.trim()); if (o) { o.textContent = st[0]; o.style.color = st[1]; } } });
  root.addEventListener('input', e => { const f = e.target.dataset && e.target.dataset.pmf; if (!f) return; const k = e.target.closest('[data-pmk]').dataset.pmk; if (A.pm[k]) A.pm[k][f] = e.target.value; });
  root.addEventListener('dragstart', e => { const t = e.target.closest && e.target.closest('[data-dragnews]'); if (t) { e.dataTransfer.setData('text/plain', t.dataset.dragnews); e.dataTransfer.effectAllowed = 'move'; } });
  // a story dragged onto ‹ or › and held there turns the calendar a week (Hafiz, 12 Nov), so it can be dropped on a later week
  let calFlip = null, dragId = '';
  root.addEventListener('dragstart', e => { const t = e.target.closest && e.target.closest('[data-dragnews]'); dragId = t ? t.dataset.dragnews : ''; });
  root.addEventListener('dragover', e => { const w = e.target.closest && e.target.closest('[data-calwk]');
    if (w && dragId && +w.dataset.calwk) { e.preventDefault(); w.classList.add('over'); if (!calFlip) calFlip = setTimeout(() => { calFlip = null; A.calWk = (A.calWk || 0) + +w.dataset.calwk; render(); }, 600); return; }
    if (calFlip && !w) { clearTimeout(calFlip); calFlip = null; }
    const d = e.target.closest && e.target.closest('[data-dropday]'); if (d) { e.preventDefault(); d.classList.add('over'); } });
  root.addEventListener('dragend', () => { clearTimeout(calFlip); calFlip = null; dragId = ''; });
  root.addEventListener('dragleave', e => { const d = e.target.closest && e.target.closest('[data-dropday],[data-calwk]'); if (d) d.classList.remove('over'); });
  root.addEventListener('drop', e => { const d = e.target.closest && e.target.closest('[data-dropday]'); if (!d) return; e.preventDefault(); const id = e.dataTransfer.getData('text/plain') || dragId, n = D.news.find(x => x.id === id); if (!n) return;
    const t = new Date(nWhen(n)), nd = new Date(`${d.dataset.dropday}T${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:00`).getTime();
    save(d2 => { const x = d2.news.find(y => y.id === id); x.at = nd; x.date = d.dataset.dropday; d2.pushes.forEach(p => { if (p.story === id && p.at > Date.now()) p.at = nd; }); }, `Moved to ${new Date(nd).toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'short' })}.`); });
  // a story photo's focus (Hafiz, 10 Nov): the same photo shows tall on Home's tiles, wide as the cover and 3:2 in the
  // story, so instead of one crop the office drags the point that must stay in view, with the three shapes previewed
  function frameStory(src, cur, done) {
    const o = document.createElement('div'); o.className = 'frm';
    o.innerHTML = `<div class="frm-box" style="width:auto;max-width:760px"><b>Frame the photo</b><span class="note">Tap or drag on the photo to set what stays in view. The app crops it to each shape around that point.</span>
      <div style="display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap"><div class="frs-v"><img alt=""><i></i></div>
      <div style="display:flex;flex-direction:column;gap:10px"><span class="lbl">Home tile</span><span class="frs-p" style="width:120px;height:160px"></span><span class="lbl">Cover</span><span class="frs-p" style="width:220px;height:110px"></span><span class="lbl">In the story</span><span class="frs-p" style="width:165px;height:110px"></span></div></div>
      <div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn2" data-x="c">Centre</button><span style="flex:1"></span><button class="btn2" data-x="0">Cancel</button><button class="btn" data-x="1">Use this</button></div></div>`;
    document.body.appendChild(o);
    const v = o.querySelector('.frs-v'), img = v.querySelector('img'), dot = v.querySelector('i'), pv = o.querySelectorAll('.frs-p'); img.src = src;
    let [px, py] = cur.split(' ').map(x => parseFloat(x));
    const draw = () => { dot.style.left = px + '%'; dot.style.top = py + '%'; pv.forEach(p => { p.style.backgroundImage = `url(${src})`; p.style.backgroundPosition = `${px}% ${py}%`; }); };
    const at = e => { const r = img.getBoundingClientRect(); px = Math.round(Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100))); py = Math.round(Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100))); draw(); };
    let drag = false; v.addEventListener('pointerdown', e => { drag = true; v.setPointerCapture(e.pointerId); at(e); }); v.addEventListener('pointermove', e => { if (drag) at(e); }); v.addEventListener('pointerup', () => { drag = false; });
    o.addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (!b) return; if (b.dataset.x === 'c') { px = py = 50; draw(); return; } if (b.dataset.x === '1') done(`${px}% ${py}%`); o.remove(); });
    draw();
  }
  // a player's photo (Hafiz, 10 Nov: frame it in the dashboard): pick an image, then drag it into place and zoom in the
  // square frame; Save crops it to 400px in the browser and keeps it against the player for the app and the admin
  function framePhoto(src, done) {
    const im = new Image(); im.onload = () => {
      const F = 320, base = Math.max(F / im.width, F / im.height); let z = 1, x = 0, y = 0;
      const o = document.createElement('div'); o.className = 'frm';
      o.innerHTML = `<div class="frm-box"><b>Frame the photo</b><span class="note">Drag to move · slide to zoom. The app shows it in a square, face near the top.</span>
        <div class="frm-v"><img alt=""><i></i></div><input type="range" min="1" max="3" step="0.01" value="1" aria-label="Zoom">
        <div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn2" data-x="0">Cancel</button><button class="btn" data-x="1">Save photo</button></div></div>`;
      document.body.appendChild(o); const img = o.querySelector('img'), view = o.querySelector('.frm-v'); img.src = src;
      const lim = () => { const w = im.width * base * z, h = im.height * base * z; x = Math.min(0, Math.max(F - w, x)); y = Math.min(0, Math.max(F - h, y)); };
      const draw = () => { lim(); img.style.width = im.width * base * z + 'px'; img.style.transform = `translate(${x}px,${y}px)`; };
      x = (F - im.width * base) / 2; y = 0; draw();
      let drag = null; view.addEventListener('pointerdown', e => { drag = [e.clientX - x, e.clientY - y]; view.setPointerCapture(e.pointerId); });
      view.addEventListener('pointermove', e => { if (!drag) return; x = e.clientX - drag[0]; y = e.clientY - drag[1]; draw(); });
      view.addEventListener('pointerup', () => { drag = null; });
      o.querySelector('input').addEventListener('input', e => { const nz = +e.target.value, c = F / 2; x = c - (c - x) * nz / z; y = c - (c - y) * nz / z; z = nz; draw(); });
      o.addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (!b) return; if (b.dataset.x === '1') { const c = document.createElement('canvas'), k = 400 / F, sc = base * z;
          c.width = c.height = 400; c.getContext('2d').drawImage(im, -x / sc, -y / sc, F / sc, F / sc, 0, 0, 400, 400); done(c.toDataURL('image/jpeg', .85)); } o.remove(); });
    }; im.src = src;
  }
  root.addEventListener('change', e => { if (e.target.id === 'nFiles' || e.target.id === 'nLib') { A.nPos = (A.nPos || []).slice(0, (A.nImgs || []).length); } });
  root.addEventListener('change', e => { const pp = e.target.dataset && e.target.dataset.pphoto; if (!pp || !e.target.files[0]) return;
    const r = new FileReader(); r.onload = () => framePhoto(r.result, url => save(d2 => { d2.playerPhotos = d2.playerPhotos || {}; d2.playerPhotos[pp] = url; }, 'Photo saved. It shows wherever this player appears in the app.'));
    r.readAsDataURL(e.target.files[0]); e.target.value = ''; });
  root.addEventListener('change', e => { if (e.target.id === 'fxClub') { A.fxClub = e.target.value; render(); } });
  root.addEventListener('input', e => { const f = e.target.dataset && e.target.dataset.luf; if (!f || !A.lu) return; const [k, w] = f.split(':'), i = A.lu.i, c = A.lu.c[k]; if (!c) return;
    c[w] = e.target.value; const ch = luCheck(i, k), q = x => root.querySelector(x), set = (el, h) => { if (el) el.innerHTML = h; };
    set(q(`[data-luchips="${k}:xi"]`), luChips(ch.xi, 'xi', c)); set(q(`[data-luchips="${k}:bench"]`), luChips(ch.bench, 'sub', c)); set(q(`[data-lucount="${k}"]`), luCount(ch));
    const st = luState(i), b = q('[data-lupub]'), msg = q('[data-lumsg]'); if (b) b.disabled = !st.ok; if (msg) msg.textContent = st.msg; });
  root.addEventListener('change', e => { if (e.target.id === 'luAlert' && A.lu) A.lu.alert = e.target.checked; });
  root.addEventListener('change', async e => { const k = e.target.dataset && e.target.dataset.lusheet, file = k && e.target.files && e.target.files[0]; if (!file) return;
    const i = A.live, lu = luDraft(i), c = lu.c[k]; c.busy = true; c.err = ''; c.note = ''; render();
    const url = await shrink(file, 2000), b64 = (url || '').split(',')[1] || '';
    const r = b64 ? await CL.readSheet({ club: C[k].name, squad: SPL.squads[k].map(p => [p[0], p[1], p[2]]), image: b64, media: 'image/jpeg' }) : { error: 'That file could not be opened as a photo.' };
    c.busy = false;
    if (!r || r.error) c.err = (r && r.error) || 'No reply.';
    else if (!r.readable || !(r.starters || []).length) c.err = r.note || 'The photo could not be read as a team sheet. Type the numbers in instead.';
    else { c.unsure = {}; c.xi = luFromRead(k, r.starters, c); c.bench = luFromRead(k, r.substitutes, c); c.note = r.note || ''; c.read = true; }
    if (A.lu === lu && A.page === 'matchday' && A.live === i) render(); });
  // the move panel keeps what's typed; a change of status, date, time, ground or the ticks redraws the preview
  const MVF = { mvS: 'status', mvD: 'date', mvT: 'time', mvV: 'venue', mvR: 'reason', mvA: 'alert', mvN: 'story' };
  root.addEventListener('input', e => { const k = MVF[e.target.id]; if (k && A.mv && ['reason', 'date', 'time'].includes(k)) A.mv[k] = e.target.value; });
  root.addEventListener('change', e => { const k = MVF[e.target.id]; if (!k || !A.mv) return; A.mv[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    // typed fields keep their value without a redraw, so a click on Save straight after typing isn't lost
    if (['status', 'venue', 'alert', 'story'].includes(k)) render(); });
  root.addEventListener('change', e => { const ns = e.target.dataset && e.target.dataset.ntsel; if (!ns || !e.target.value) return; const [i, j, x] = ns.split(':').map(Number), v = e.target.value; A.ntag = null;
    save(d2 => { const tg = ntOf(d2, i, j); if (v === '-') tg.splice(x, 1); else if (x < 0) { if (!tg.includes(v)) tg.push(v); } else tg[x] = v; d2.live[i].notes[j][2] = tg.filter((t, y) => tg.indexOf(t) === y).slice(0, 8); }, v === '-' ? 'Tag dropped.' : 'Tagged.'); });
  root.addEventListener('change', e => { const pn = e.target.dataset && e.target.dataset.potmnom; if (!pn) return;
    const [i, j] = pn.split(':').map(Number), L = D.live[i]; if (!A.potmDraft || A.potmDraft.i !== i) A.potmDraft = { i, noms: (L.potm && L.potm.length ? L.potm : SPLSTORE.potmSuggest(i, L.ev, POTM_FROM)).map(x => x.slice()) };
    const [k, ...nm] = e.target.value.split('|'); A.potmDraft.noms[j] = [nm.join('|'), k]; render(); });
  root.addEventListener('change', e => {
    if (e.target.dataset && e.target.dataset.autopre) { save(d2 => { d2.autoPreview = e.target.checked; }, e.target.checked ? 'On: each game\'s preview is drafted the evening before, in News, for you to approve.' : 'Automatic previews off.'); autoPreviews(); render(); return; }
    if (e.target.id === 'nFiles') { keepNews(); const fs = [...e.target.files].slice(0, 12 - (A.nImgs || []).length); Promise.all(fs.map(f => shrink(f))).then(urls => { A.nImgs = (A.nImgs || []).concat(urls.filter(Boolean)).slice(0, 12); render(); }); return; }
    if (e.target.id === 'sFiles') { keepShop(); const fs = [...e.target.files].slice(0, 4 - (A.sImgs || []).length); Promise.all(fs.map(f => shrink(f, 900))).then(urls => { A.sImgs = (A.sImgs || []).concat(urls.filter(Boolean)).slice(0, 4); render(); }); return; }
    if (e.target.id === 'sLib' && e.target.value) { keepShop(); A.sImgs = (A.sImgs || []).concat([e.target.value]).slice(0, 4); render(); return; }
    if (e.target.id === 'nLib' && e.target.value) { keepNews(); A.nImgs = (A.nImgs || []).concat([e.target.value]).slice(0, 12); render(); return; }
    const t = e.target;
    if (t.dataset && t.dataset.crowdopen) { const i = +t.dataset.crowdopen; save(d2 => { const x = d2.crowd[i] || { open: false, prize: '', attendance: null, guesses: 0, winner: null }; x.open = t.checked; d2.crowd[i] = x; }, t.checked ? 'Guess the crowd is open in the app.' : 'Guess the crowd closed.'); return; }
    if (t.id === 'crPrize') { const i = A.live; save(d2 => { const x = d2.crowd[i] || { open: false, prize: '', attendance: null, guesses: 0, winner: null }; x.prize = t.value.trim().slice(0, 80); d2.crowd[i] = x; }, 'Prize saved.'); return; }
    if (t.dataset && t.dataset.awf) { const [w, j, f] = t.dataset.awf.split(':'), v = t.value.trim();
      awSave(d2 => { const m = monthOfKey(d2, A.awm); if (!m) return; if (w === 'opens' || w === 'closes') m[w] = v; else { const x = (w === 'p' ? m.potm.picks : m.gotm.picks)[+j]; if (x) x[f] = v.slice(0, 600); } }); return; }
    if (t.id === 'pWhen') { A.pushWhen = t.value; A.pushPre = { title: val('pTitle'), body: val('pBody') }; A.pushAud = val('pAud'); render(); }
    if (t.dataset && t.dataset.ptlogo !== undefined) { const f = t.files && t.files[0]; if (!f) return;
      // shrink to at most 480px wide, as PNG, so the stored logo stays small
      const r = new FileReader(); r.onload = () => { const img = new Image(); img.onload = () => { const s = Math.min(1, 480 / img.width, 240 / img.height), c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); const url = c.toDataURL('image/png'); save(d2 => { d2.partners[+t.dataset.ptlogo].logo = url; }, 'Logo added.'); }; img.src = r.result; }; r.readAsDataURL(f); }
  });
  root.addEventListener('input', e => { if (e.target.id === 'gq') { A.q = e.target.value; render(); return; }
    if (e.target.id === 'varWhy') { A.varWhy = e.target.value; const pv = document.getElementById('varPrev'); if (pv) { const b = pv.querySelector('b'); if (b) b.textContent = e.target.value.trim() || 'an infringement'; } document.querySelectorAll('.varr button').forEach(b => b.classList.toggle('on', b.dataset.varr === e.target.value.trim())); return; } if (e.target.id === 'pTitle') { const el = document.getElementById('lkT'); if (el) el.textContent = e.target.value || 'Title'; } if (e.target.id === 'pBody') { const el = document.getElementById('lkB'); if (el) el.textContent = e.target.value || 'Message'; } });
  // the app writes analytics and votes into the same storage; keep the numbers current
  // another tab (the app, or the phone preview) writes to the same storage: redraw only when something we show changed,
  // and at most every few seconds for analytics, so the page never flickers while fans use the app
  let lastDoc = JSON.stringify(D), evT = 0;
  const calm = () => !document.activeElement.matches('input,textarea,select') && !A.q && !A.newOpen;
  window.addEventListener('storage', e => {
    if (e.key === SPLSTORE.KEY) { const nd = SPLSTORE.read(), j = JSON.stringify(nd); if (j === lastDoc) return; lastDoc = j; D = nd; if (A.page !== 'matchday' && calm()) render(); return; }
    if (e.key === SPLSTORE.EVK && ['analytics', 'overview'].includes(A.page) && !evT) evT = setTimeout(() => { evT = 0; if (calm()) render(); }, 8000); });
  setInterval(() => { if (CL.on && !A.authed) return; Object.keys(D.live).map(Number).forEach(i => { const L = D.live[i], c = clockOf(i); if (!L || L.phase !== '2H' || c.n < POTM_FROM || L.potmOpen || stale(i)) return;
    const m = SPL.matches[i]; save(d2 => { const X = d2.live[i]; X.potmOpen = true; if (!X.potm || !X.potm.length) X.potm = SPLSTORE.potmSuggest(i, X.ev, POTM_FROM);
      livePush(d2, i, `Fans' Player of the Match 🗳️ ${short(m[2])} v ${short(m[3])}`, 'Voting is open until the final whistle. Pick one of four.'); }, "Fans' Player of the Match is open in the app."); }); }, 5000);
  setInterval(() => { document.querySelectorAll('[data-aclock]').forEach(el => { const c = clockOf(+el.dataset.aclock); if (el.textContent !== c.label) el.textContent = c.label; });
    // the event form's minute follows the clock until the official types in it (it was filled once per redraw, so it fell behind)
    document.querySelectorAll('[data-evauto]').forEach(el => { if (el.dataset.typed || el === document.activeElement) return; const c = clockOf(+el.dataset.evauto); if (c.phase !== '1H' && c.phase !== '2H') return;
      const v = c.n > c.cap ? `${c.cap}+${c.n - c.cap}` : String(c.n); if (el.value !== v) el.value = v; }); }, 1000);
  root.addEventListener('input', e => { if (e.target.dataset && e.target.dataset.evauto !== undefined) e.target.dataset.typed = '1'; });
  const q = new URLSearchParams(location.search); if (q.get('multi')) { A.page = 'matchday'; A.multi = q.get('multi').split(',').map(Number); A.live = A.multi[0]; } if (q.get('page') && PAGES[q.get('page')]) A.page = q.get('page');
   if (!CL.on) loadAudit().then(render);
  if (CL.on) {
    CL.checkAdmin().then(ok => { A.checking = false; A.authed = ok; if (ok) { CL.pullEvents().then(() => { if (A.page === 'analytics' || A.page === 'overview') render(); }); loadAudit().then(render); } D = SPLSTORE.read(); render(); });
    CL.onChange(() => { const el = root.querySelector('.who .cs'); if (el) el.outerHTML = statusLine(); });
    setInterval(() => { if (A.authed && A.page === 'votes' && !document.activeElement.matches('input,textarea,select')) { Object.keys(AWV).forEach(k => { delete AWV[k]; }); render(); } if (A.authed && ['overview', 'activity'].includes(A.page)) loadAudit(); if (A.authed && ['analytics', 'overview'].includes(A.page)) CL.pullEvents().then(ok => { if (ok && !document.activeElement.matches('input,textarea,select')) render(); }); }, 30000);
  }
  render();
})();
