/* SPL fan app mock — one screen component, rendered from data.js. No framework. */
(function () {
  'use strict';
  const C = SPL.clubs;
  const KEY = 'spl-mock';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
  const P = Object.assign({ user: null, fav: null, follows: {}, reminders: {}, cal: {}, votes: {}, potm: {}, tickets: [], settings: { lang: 'en', data: false, push: { goals: true, kickoff: true, results: true, news: false, tickets: true }, comps: { spl: true, spl2: false, cup: true, afc: true, wpl: false } } }, load());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} };
  const S = { view: P.user ? 'home' : 'onboard', ob: 0, htab: 'tonight', mw: 6, comp: 'spl', match: null, mtab: 'overview', ttab: 'table', club: null, ctab: 'latest', player: null, query: '', sq: '', gotm: null, more: {} };
  // ?embed: the app inside the admin's phone preview — no splash, no partners, no onboarding, no analytics
  const EMBED = /[?&]embed\b/.test(location.search);
  if (EMBED) { S.view = 'home'; const l = document.getElementById('launch'); if (l) l.remove();
    const q = new URLSearchParams(location.search), mi = q.get('match'), ar = q.get('article');
    if (mi !== null && SPL.matches[+mi]) { S.view = 'match'; S.match = +mi; S.from = 'home'; } else if (ar) { S.view = 'article'; S.article = ar; } }
  // the club the app is dressed in
  const favC = () => P.fav ? C[P.fav] : null;
  const app = document.getElementById('app');
  const FORM = { W: '#3DD68C', D: '#8F8CB3', L: '#E8363D' };

  // ---------- helpers ----------
  const fmtDate = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' });
  const short = k => C[k].short;
  const crest = (k, px) => `<span class="crest cr-${k}" style="width:${px}px;height:${px}px" role="img" aria-label="${C[k].name}"></span>`;
  // ---------- simulated live feed ----------
  // Tonight's two games (MW6, 1 Nov, 7.30PM) replayed on a scripted feed so the live screens can be shown.
  // Final scores are the real ones (Tampines 0–0 Geylang; Balestier 0–4 Sailors, littlebigreddot.com 2 Nov).
  // Sailors' goals, assists and changes are from their match report (lioncitysailorsfc.sg, "Sailors showcase squad
  // depth to make it six wins on the trot"); minutes it gives loosely are approximate. Starting XIs other than the
  // players that report names, the stats and the Player of the Match counts are reconstructed for the demo,
  // and every live screen says "Replay".
  const LIVE_IDS = [23, 22]; // tonight's games: the replay plays them, the admin's match console can run them for real
  const XI = {
    TAM: { f: '4-2-3-1', xi: [24, 2, 5, 33, 26, 49, 88, 10, 8, 81, 25], bench: [28, 71, 16, 11, 21, 15, 18, 9, 27] },
    GEY: { f: '4-4-2', xi: [1, 2, 4, 3, 23, 7, 8, 5, 6, 18, 9], bench: [25, 11, 15, 20, 14, 21, 24, 32, 10] },
    BKF: { f: '4-3-3', xi: [71, 3, 23, 4, 2, 14, 10, 7, 22, 17, 19], bench: [21, 15, 20, 25, 12, 18, 24, 30, 5] },
    LCS: { f: '4-2-3-1', xi: [13, 18, 5, 26, 2, 16, 8, 11, 19, 7, 12], bench: [1, 4, 14, 29, 24, 23, 17, 9, 30] }
  };
  // [half, minute, added, type G goal · Y yellow · S sub · HT · FT, team, shirt, assist or player off, note]
  const EV = {
    // Tampines 0–0 Geylang: Taniguchi's 36th-minute goal for Geylang ruled out for offside (spl.sg MW6 roundup, 2 Nov)
    23: [[1, 36, 0, 'D', 'GEY', 10, 0, null, null, 'offside'], [1, 45, 2, 'HT'], [2, 90, 4, 'FT']],
    // Balestier 0–4 Sailors, minutes from the official roundup (spl.sg, 2 Nov): Shawal 31', Mance 37' pen, Phaëton 81', Thy 85'
    22: [[1, 31, 0, 'G', 'LCS', 7, 19], [1, 37, 0, 'G', 'LCS', 12, 0, 'pen'], [1, 45, 1, 'HT'], [2, 46, 0, 'S', 'LCS', 4, 26], [2, 46, 0, 'S', 'LCS', 9, 12], [2, 66, 0, 'S', 'LCS', 24, 8], [2, 66, 0, 'S', 'LCS', 29, 2], [2, 66, 0, 'S', 'LCS', 23, 11], [2, 81, 0, 'G', 'LCS', 23, 24], [2, 85, 0, 'G', 'LCS', 9, 23], [2, 90, 3, 'FT']]
  };
  // full-time figures the stats grow towards: possession, shots, on target, corners, fouls, offsides (reconstructed)
  const POTM = { 23: { nom: [['Syazwan Buhari', 'TAM'], ['Milos Cupic', 'GEY'], ['Kaisei Ogawa', 'GEY']], base: [488, 517, 296] }, 22: { nom: [['Matthias Phaeton', 'LCS'], ['Shawal Anuar', 'LCS'], ['Lennart Thy', 'LCS']], base: [655, 590, 371] } };
  const HTB = 5; // half-time break, in simulated minutes
  const VARC = 1.5; // how long a VAR check takes in the replay, in simulated minutes
  const shirt = (k, n) => SPL.squads[k].find(p => p[0] === n) || [n, '#' + n, '', ''];
  const sname = (k, n) => shirt(k, n)[1];
  // the name on the back of the shirt: family name, which comes first for Korean and Chinese names
  const FAM1 = ['Kim', 'Yang', 'Cho', 'Lee', 'Seo', 'Song', 'Park', 'Woo', 'Xia'];
  // Malay names have no family name; the shirt and the commentary use the given name
  const BACK = { 'Adib Azahari': 'Adib', 'Shawal Anuar': 'Shawal', 'Farhan Zulkifli': 'Farhan', 'Hami Syahin': 'Hami', 'Hariss Harun': 'Hariss', 'Faris Ramli': 'Faris', 'Syazwan Buhari': 'Syazwan', 'Nur Adam Abdullah': 'Nur Adam', 'Amirul Adli': 'Amirul', 'Tajeli Salamat': 'Tajeli', 'Shakir Hamzah': 'Shakir', 'Azim Akbar': 'Azim', 'Ilhan Fandi': 'Ilhan', 'Sahil Suhaimi': 'Sahil', 'Shah Shahiran': 'Shahiran', 'Raoul Suhaimi': 'Raoul', 'Anumanthan Kumar': 'Anumanthan', 'Nazrul Nazari': 'Nazrul', 'Hafiz Ahmad': 'Hafiz', 'Daniel Goh': 'Goh', 'Mustaqim Mulyadi': 'Mustaqim', 'Harith Kanadi': 'Harith', 'Ali Manaf': 'Ali', 'Fudhil I\'yadh': 'Fudhil', 'Syafi Hilman': 'Syafi', 'Firdaus Roslan': 'Firdaus', 'Ifat Sha\'aban': 'Ifat', 'Irfan Fandi': 'Irfan', 'Iman Hakim': 'Iman', 'Amirul Haikal': 'Haikal' };
  const backName = n => { if (BACK[n]) return BACK[n]; const w = n.split(' '); return w.length < 2 ? n : FAM1.includes(w[0]) ? w[0] : w[w.length - 1]; };
  const h1end = i => { const h = EV[i].find(e => e[3] === 'HT'); return 45 + h[2]; };
  const evT = (i, e) => e[0] === 1 ? e[1] + e[2] : h1end(i) + HTB + (e[1] - 45) + e[2];
  const ftT = i => evT(i, EV[i].find(e => e[3] === 'FT'));
  const minLabel = (m, add) => add ? `${m}+${add}'` : `${m}'`;
  // FAS's own match console (admin.html) runs a game on the real clock; when it has a game, it wins over the replay
  const evSort = (a, b) => (a[0] - b[0]) || (a[1] - b[1]) || ((a[2] || 0) - (b[2] || 0));
  function consoleOf(i) {
    const A = STORE.live[i]; if (!A || !A.phase) return null;
    const now = Date.now(), m = SPL.matches[i], started = A.phase !== 'pre', ft = A.phase === 'FT';
    let clock = 'Pre-match', n = 0;
    if (A.phase === '1H' || A.phase === '2H') { n = A.base + Math.floor(Math.max(0, now - A.t0) / 60000) + 1; const cap = A.phase === '1H' ? 45 : 90; clock = n > cap ? `${cap}+${n - cap}'` : `${n}'`; }
    else if (A.phase === 'HT') { clock = 'HT'; n = 45; } else if (ft) { clock = 'FT'; n = 90; }
    const fired = A.ev.slice().sort(evSort), score = [0, 0];
    fired.forEach(e => { if (e[3] === 'G') score[e[4] === m[2] ? 0 : 1]++; });
    return { started, ft, clock, played: Math.min(90, n), fired, score, T: 0, admin: true };
  }
  function liveOf(i) {
    const A = consoleOf(i); if (A) return A;
    if (!S.sim || !EV[i]) return null;
    const T = S.sim.T, m = SPL.matches[i], e1 = h1end(i), ft = ftT(i);
    const started = T >= 0, done = T >= ft;
    let clock = 'Pre-match', played = 0;
    if (done) { clock = 'FT'; played = 90; }
    else if (T >= e1 + HTB) { const n = 46 + Math.floor(T - e1 - HTB); clock = n > 90 ? `90+${n - 90}'` : `${n}'`; played = Math.min(90, 45 + (T - e1 - HTB)); }
    else if (T >= e1) { clock = 'HT'; played = 45; }
    else if (started) { const n = Math.floor(T) + 1; clock = n > 45 ? `45+${n - 45}'` : `${n}'`; played = Math.min(45, T); }
    // a goal VAR rules out stands as a goal until the check is done, then is struck through (VARC simulated minutes later)
    const fired = EV[i].filter(e => evT(i, e) <= T).map(e => e[3] === 'D' && evT(i, e) + VARC > T ? Object.assign(e.slice(0, 9), { 3: 'G' }) : e);
    const score = [0, 0]; fired.forEach(e => { if (e[3] === 'G') score[e[4] === m[2] ? 0 : 1]++; });
    return { started, ft: done, clock, played, fired, score, T };
  }
  // a goal's scorer: an own goal (e[7] 'og') names a player from the other side (e[8]) and is credited to e[4]
  const gname = e => sname(e[8] || e[4], e[5]) + (e[7] === 'og' ? ' (og)' : '');
  const evText = (i, e) => { const m = SPL.matches[i]; if (e[3] === 'HT') return 'Half time'; if (e[3] === 'FT') return 'Full time'; const t = short(e[4]); if (e[3] === 'G') return `Goal · ${gname(e)} (${t})`; if (e[3] === 'D') return `No goal · VAR: ${gname(e)} (${t}), ${e[9] || 'ruled out'}`; if (e[3] === 'Y') return `Yellow card · ${sname(e[4], e[5])} (${t})`; if (e[3] === 'R') return `Red card · ${sname(e[4], e[5])} (${t})`; return `Sub · ${sname(e[4], e[5])} on for ${sname(e[4], e[6])} (${t})`; };
  const played = () => SPL.matches.map((m, i) => { const L = liveOf(i); return L && L.ft ? [m[0], m[1], m[2], m[3], L.score, m[5], m[6], 'Full time'] : m; }).filter(m => m[4]);
  const form = k => played().filter(m => m[2] === k || m[3] === k).slice(-5).map(m => {
    const h = m[2] === k, gf = h ? m[4][0] : m[4][1], ga = h ? m[4][1] : m[4][0];
    return FORM[gf > ga ? 'W' : gf < ga ? 'L' : 'D'];
  });
  const dots = (cols, px = 7) => cols.map(c => `<span class="dot" style="width:${px}px;height:${px}px;background:${c}"></span>`).join('');
  const mrow = (m, i) => { const L = liveOf(i), on = L && L.started, sc = on ? L.score : m[4]; return { id: i, home: m[2], away: m[3], hname: short(m[2]), aname: short(m[3]), sc: sc ? `${sc[0]}–${sc[1]}` : 'VS', status: on ? (L.ft ? 'Full time' : 'Live · ' + L.clock) : m[4] ? 'Full time' : (m[7] || 'TBC'), live: on && !L.ft, L, venue: m[5], when: fmtDate(m[1]), date: m[1], mw: m[0] }; };
  const rows = () => SPL.matches.map(mrow);
  const playingNow = k => LIVE_IDS.some(i => { const L = liveOf(i), m = SPL.matches[i]; return L && L.started && !L.ft && (m[2] === k || m[3] === k); });
  const anyLive = () => LIVE_IDS.some(i => { const L = liveOf(i); return L && L.started && !L.ft; });
  function table() {
    const t = SPL.table.map(r => r.slice()), base = SPL.table.map(r => r[0]);
    LIVE_IDS.forEach(i => { const L = liveOf(i); if (!L || !L.started) return; const m = SPL.matches[i]; const H = t.find(r => r[0] === m[2]), A = t.find(r => r[0] === m[3]); [[H, L.score[0], L.score[1]], [A, L.score[1], L.score[0]]].forEach(([r, f, g]) => { r[1]++; r[5] += f; r[6] += g; if (f > g) r[2]++; else if (f === g) r[3]++; else r[4]++; }); });
    const pts = r => r[2] * 3 + r[3];
    t.sort((x, y) => pts(y) - pts(x) || (y[5] - y[6]) - (x[5] - x[6]) || y[5] - x[5] || base.indexOf(x[0]) - base.indexOf(y[0]));
    return t.map((r, i) => ({ pos: i + 1, code: r[0], name: short(r[0]), p: r[1], w: r[2], d: r[3], l: r[4], gf: r[5], ga: r[6], gd: (r[5] - r[6] > 0 ? '+' : '') + (r[5] - r[6]), pts: pts(r), form: form(r[0]), live: playingNow(r[0]), move: base.indexOf(r[0]) - i }));
  }
  const posText = k => { const r = table().find(x => x.code === k); const o = r.pos === 1 ? 'st' : r.pos === 2 ? 'nd' : r.pos === 3 ? 'rd' : 'th'; return `${r.pos}${o} · ${r.pts} pts`; };
  const goalsFor = name => { const out = []; SPL.matches.forEach(m => (m[6] || []).forEach(g => { if (g[0].replace(/ \((og|pen)\)/, '') === name) out.push({ label: `${short(m[2])} ${m[4][0]}–${m[4][1]} ${short(m[3])} · MW${m[0]}`, min: g[1] }); }));
    LIVE_IDS.forEach(i => { const L = liveOf(i), m = SPL.matches[i]; if (L) L.fired.forEach(e => { if (e[3] === 'G' && e[7] !== 'og' && sname(e[4], e[5]) === name) out.push({ label: `${short(m[2])} ${L.score[0]}–${L.score[1]} ${short(m[3])} · MW${m[0]}`, min: e[2] ? `${e[1]}+${e[2]}` : e[1] }); }); });
    return out; };
  const age = dob => { const d = new Date(dob), n = new Date('2026-11-01'); let a = n.getFullYear() - d.getFullYear(); if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--; return a; };
  const ics = (m) => { const d = m[1].replace(/-/g, ''); const t = `${d}T113000Z`, e = `${d}T133000Z`; const body = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SPL//Fixtures//EN','BEGIN:VEVENT',`UID:spl-${m[0]}-${m[2]}-${m[3]}@spl.sg`,`DTSTART:${t}`,`DTEND:${e}`,`SUMMARY:${short(m[2])} v ${short(m[3])} · SPL MW${m[0]}`,`LOCATION:${m[5]}`,'END:VEVENT','END:VCALENDAR'].join('\r\n'); return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body); };
  const findPlayer = name => { for (const k of Object.keys(SPL.squads)) for (const p of SPL.squads[k]) if (p[1] === name) return { team: k, p }; return null; };

  const VIDEOS = [
    { th: 'th-1', mi: 21, title: 'Hisatoshi brace seals first win of the season! | Hougang United 0–2 Young Lions', len: '8:53' },
    { th: 'th-5', mi: 17, title: 'Goals galore at Jalan Besar | Lion City Sailors 6–0 Tanjong Pagar United', len: '7:43' },
    { th: 'th-2', mi: 18, title: 'Stags survive Jurong fightback | FC Jurong 2–3 Tampines Rovers', len: '5:36' },
    { th: 'th-4', mi: 20, title: 'Chaos and offside drama in stoppage time! | Tanjong Pagar United 1–1 FC Jurong', len: '7:16' },
    { th: 'th-3', mi: 19, title: 'Eagles stay top | Geylang International 3–0 Hougang United', len: '5:26' }
  ];
  // the SPL channel's highlights (youtube.com/@sgpremierleague), sent by Hafiz; one per match, keyed by match index
  const SPLVID = [
    { id: 'q5OX72Mnf58', k: 'SPL', title: 'Sailors run riot with a four goal clean sheet! | Balestier Khalsa vs Lion City Sailors', date: '1 Nov', mi: 22 },
    { id: 'x53eqDIec5o', k: 'SPL', title: 'An eastern derby draw to remember! | Tampines Rovers vs Geylang International', date: '1 Nov', mi: 23 },
    { id: 'A32RF61a_5E', k: 'SPL', title: 'Hisatoshi brace seals first win of the season! | Hougang United vs Young Lions', date: '31 Oct', mi: 21, len: '8:53' },
    { id: 'btP7W9bbTsw', k: 'SPL', title: 'Chaos and offside drama in stoppage time! | Tanjong Pagar United vs FC Jurong', date: '30 Oct', mi: 20, len: '7:16' },
    { id: 'LPIRSVkUwSU', k: 'SPL', title: 'Yang Hyeonju brace secures 3-0 victory! | Geylang International vs Hougang United', date: '26 Oct', mi: 19, len: '5:26' },
    { id: 'xnJWW1HOpKo', k: 'SPL', title: 'Stags’ first-half surge secures away points! | FC Jurong vs Tampines Rovers', date: '25 Oct', mi: 18, len: '5:36' },
    { id: '1Fkaos7SD_I', k: 'SPL', title: 'Sailors cruise to 6-0 rout over the Jaguars | Lion City Sailors vs Tanjong Pagar United', date: '25 Oct', mi: 17, len: '7:43' },
    { id: 'rj12dhsw2VM', k: 'SPL', title: 'Balestier’s early double seals away win! | Young Lions vs Balestier Khalsa', date: '24 Oct', mi: 16 },
    { id: 'ISYuWFhrCVQ', k: 'SPL', title: 'Sailors clean sheet on away ground! | FC Jurong vs Lion City Sailors', date: '18 Oct', mi: 15 },
    { id: '5xO_KqatlIs', k: 'SPL', title: 'The Stags put 4 goals past Young Lions! | Tampines Rovers vs Young Lions', date: '18 Oct', mi: 14 },
    { id: 'Nv1N4147FNM', k: 'SPL', title: 'Blown chances lead to stalemate! | Balestier Khalsa vs Geylang International', date: '17 Oct', mi: 13 },
    { id: 'Qc9SQMgN0Vk', k: 'SPL', title: 'Fukashiro & Masogo Secure Home Win! | Tanjong Pagar United vs Hougang United', date: '16 Oct', mi: 12 },
    { id: 'Zw4hvcP_cwM', k: 'SPL', title: 'Balestier’s defense and keeper deny Hougang | Hougang United vs Balestier Khalsa', date: '12 Oct', mi: 11 },
    { id: '4rPzpywyiSc', k: 'SPL', kind: 'Post-match', title: 'Post-Match: Balestier Khalsa vs Lion City Sailors', date: '1 Nov', mi: 22 },
    { id: 'uOw34URcnck', k: 'SPL', kind: 'Post-match', title: 'Post-Match: Tampines Rovers vs Geylang International', date: '1 Nov', mi: 23 },
    { id: 'oJzXdWWK4ds', k: 'SPL', kind: 'Post-match', title: 'Post-Match: Hougang United vs Young Lions', date: '31 Oct', mi: 21 },
    { id: 'jPw4dvqIWrM', k: 'SPL', kind: 'Post-match', title: 'Post-Match: Tanjong Pagar United vs FC Jurong', date: '30 Oct', mi: 20 },
    { id: 'mE_rmKjzrBo', k: 'SPL', kind: 'Post-match', title: 'Post-Match: Geylang International vs Hougang United', date: '26 Oct', mi: 19 },
    { id: 'a-UGepWO0ZE', k: 'SPL', kind: 'Post-match', title: 'Post-Match: FC Jurong vs Tampines Rovers', date: '25 Oct', mi: 18 }
  ];
  const hlFor = mi => SPLVID.find(v => v.mi === mi && !v.kind) || CLUBVID.find(v => v.mi === mi);
  const extrasFor = mi => SPLVID.filter(v => v.mi === mi && v.kind);
  // the Sailors' own channel (lioncitysailorsfc.sg/videos), the clips that play in the app today
  const CLUBVID = [
    { id: 'KG3snCBqxwo', k: 'LCS', title: 'Six Straight Wins! | Balestier Khalsa 0–4 Lion City Sailors', len: '6:34', date: '2 Nov', mi: 22 },
    { id: 'IdCGVsk4xGE', k: 'LCS', title: 'Goals Galore At Jalan Besar | Lion City Sailors 6–0 Tanjong Pagar United', len: '8:27', date: '26 Oct', mi: 17 },
    { id: '-ySMiv7T_mE', k: 'LCS', title: 'Mission Accomplished in the West | FC Jurong 0–2 Lion City Sailors', len: '4:40', date: '19 Oct', mi: 15 },
    { id: '_Fu7OwtnF7o', k: 'LCS', title: 'Our First #SPL Win Of The 2026/27 Season | Lion City Sailors 6–1 Young Lions', len: '7:24', date: '12 Oct', mi: 10 },
    { id: 'cqiszqL1zl4', k: 'LCS', title: "'My leadership style is a lot about connecting with people' | Mark Jackson's first interview", len: '9:55', date: '23 Sep' },
    { id: 'gHLDMM08NRc', k: 'LCS', title: "Ilhan Fandi's brace clinches the Shield | Lion City Sailors 2–0 Tampines Rovers", len: '8:40', date: '7 Sep' }
  ];
  // Must-see moments (Premier League app reference): vertical clips from the league's and the Sailors' YouTube Shorts.
  // Real clips; titles and view counts as on YouTube, 4 Nov 2026. Not all are from this season.
  const SHORTS = [
    { id: '8J5pLADuETo', ch: 'LCS', title: 'The assist. The goal.', views: '23K' },
    { id: 'Pls5Y9OsEAM', ch: 'SPL', title: 'What a goal. What a celebration.', views: '24K' },
    { id: '5ILg9Aao5ZU', ch: 'LCS', title: 'Corner covered.', views: '15K' },
    { id: '1RA8SUl-Kes', ch: 'SPL', title: 'Opening his goal account with a banger.', views: '15K' },
    { id: 'XXQvsTv55sM', ch: 'LCS', title: 'A Rui-ly stunning first Sailors goal', views: '3.3K' },
    { id: 'LL_DQO4Xhws', ch: 'SPL', title: 'Hougang thought they were about to score. Rio Sakuma said no.', views: '14K' },
    { id: 'ONU7Epj7cOM', ch: 'LCS', title: 'Lenny from the spot for his 14th SPL goal of the season.', views: '2.5K' },
    { id: 'FFjB160GcNM', ch: 'SPL', title: 'Outrageous assist from Ryoya.', views: '6.9K' },
    { id: 'D90YnZa_SI8', ch: 'LCS', title: 'What a goal from a lovely assist.', views: '2.4K' }
  ];
  const shortCh = x => x.ch === 'SPL' ? '<span style="width:16px;height:16px;flex:none;background:url(assets/league/spl-lion.png) center/contain no-repeat"></span>Singapore Premier League' : crest(x.ch, 16) + C[x.ch].name;
  const mustSee = () => `<div style="display:flex;flex-direction:column;gap:12px"><div style="display:flex;align-items:center;gap:14px"><span class="d" style="font-size:20px">Must-see moments</span><span style="flex:1;height:1px;background:var(--line)"></span><span class="lbl">Shorts</span></div>
    <div class="scroll" style="display:flex;gap:10px;overflow-x:auto;margin:0 -20px;padding:0 20px">${SHORTS.map((x, j) => `<button class="rowlink" data-short="${j}" style="flex:none;width:148px;height:262px;position:relative;overflow:hidden;border:1px solid var(--line);border-radius:4px;background:#1C1A4A ${P.settings.data ? '' : `url(https://i.ytimg.com/vi/${x.id}/oardefault.jpg) center/cover`};color:#fff;text-align:left"><span style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 45%,rgba(5,7,24,.92) 100%)"></span><span aria-hidden="true" style="position:absolute;top:8px;right:8px;width:24px;height:24px;background:#fff;color:#0B0F2E;display:flex;align-items:center;justify-content:center">${ICON.play}</span><span style="position:absolute;left:10px;right:10px;bottom:10px;display:flex;flex-direction:column;gap:6px"><span style="font-size:13px;font-weight:600;line-height:1.25;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${x.title}</span><span class="lbl" style="font-size:9px;color:rgba(255,255,255,.75)">${x.views} views</span></span></button>`).join('')}</div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px"><span style="font-size:11px;color:var(--muted)">From the league's and the Sailors' YouTube Shorts.</span></div></div>`;
  const REEL = SHORTS;
  const reelOf = j => j;
  function shortEl() {
    if (S.short == null) return '';
    const j = S.short, x = REEL[j], n = REEL.length;
    // full-screen, like Reels (Hafiz, 5 Nov): tap right for next, left for previous, swipe up or down; the middle reaches the video
    return `<div class="shorts" role="dialog" aria-label="Must-see moments"><div class="sh-vid ${S.shDir < 0 ? 'in-down' : 'in-up'}" key="${j}"><iframe src="https://www.youtube-nocookie.com/embed/${x.id}?autoplay=1&playsinline=1&rel=0&modestbranding=1&controls=0&enablejsapi=1${/^https?:/.test(location.origin) ? '&origin=' + encodeURIComponent(location.origin) : ''}" title="${x.title.replace(/"/g, '&quot;')}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>
      <div class="sh-shade"></div>
      <button class="sh-zone left" data-shnav="-1" aria-label="Previous"></button><button class="sh-zone right" data-shnav="1" aria-label="Next"></button>
      <div class="sh-top"><div class="sh-segs">${REEL.map((_, k) => `<span class="${k < j ? 'done' : k === j ? 'on' : ''}">${k === j ? '<i></i>' : ''}</span>`).join('')}</div>
        <div style="display:flex;justify-content:space-between;align-items:center"><span style="display:flex;align-items:center;gap:8px;font:600 13px 'Inter',sans-serif;color:#fff">${shortCh(x)}</span><button class="ic" data-shclose="1" aria-label="Close">${'<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 6l12 12M18 6L6 18"/></svg>'}</button></div></div>
      <div class="sh-foot"><span class="d" style="font-size:30px;line-height:1">${x.title}</span><span style="font:600 12px 'Inter',sans-serif;color:rgba(255,255,255,.75)">${x.views} views on YouTube · ${j + 1} of ${n}</span>${j < n - 1 ? `<span class="sh-hint">The next one plays when this ends. Tap right or swipe left to skip.</span>` : ''}</div></div>`;
  }

  // Watch (the bar's last tab, Hafiz 4 Nov): live on the broadcaster, Must-see moments, last round's Moments, highlights.
  function watch() {
    const tonight = rows().filter(r => r.date === '2026-11-01'), live = anyLive();
    const sec = (t, slot, extra) => `<div style="display:flex;align-items:center;gap:14px"><span class="d" style="font-size:20px">${t}</span><span style="flex:1;height:1px;background:var(--line)"></span>${extra || spLine(slot)}</div>`;
    return `<div style="display:flex;flex-direction:column;gap:2px"><span class="d" style="font-size:26px;line-height:1">Watch</span><span class="lbl">Live games, moments and highlights</span></div>
      <div class="card" style="padding:16px;display:flex;flex-direction:column;gap:12px;border-top:3px solid var(--red)" ><div class="lbl" style="display:flex;justify-content:space-between"><span style="${live ? 'color:#FF6B71' : ''}">${live ? 'Live now' : 'Tonight · 7.30PM'}</span><span>meWATCH</span></div>
        ${tonight.map(r => `<div style="display:flex;align-items:center;gap:10px">${crest(r.home, 26)}<span style="font-size:14px;font-weight:600">${r.hname}</span><span class="d mono" style="font-size:16px;color:var(--muted);margin:0 4px">${r.sc}</span><span style="font-size:14px;font-weight:600">${r.aname}</span>${crest(r.away, 26)}</div>`).join('')}
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><a class="btn" href="https://www.mewatch.sg/" target="_blank" rel="noopener" data-trip="mewatch" style="flex:1">Watch on meWATCH ↗</a></div>
        <span style="font-size:11px;color:var(--muted)">Every SPL match streams live on meWATCH.</span></div>
      ${mustSee()}
      ${moments()}
      <div style="display:flex;flex-direction:column;gap:12px">${sec('SPL channel', '', '<span class="lbl">Matchweeks 5–6</span>')}${SPLVID.map(hlCardV).join('')}${VIDEOS.filter(v => !hlFor(v.mi)).map(v => videoCard(v, 0, 196)).join('')}<a class="btn2" href="https://www.youtube.com/@sgpremierleague/videos" target="_blank" rel="noopener" style="width:100%;box-sizing:border-box">All videos on the SPL channel ↗</a></div>`;
  }
  // what FAS's office sets in the admin (store.js): news, lead story, votes, sponsors, partners, live console, pushes
  let STORE = SPLSTORE.read();
  const E = SPLSTORE.esc;
  const ndate = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short' }) : '';
  const NEWS_ = () => STORE.news.filter(n => n.status === 'live').sort((a, b) => b.date.localeCompare(a.date));
  const LEAD_ = () => STORE.news.find(n => n.id === STORE.lead && n.status === 'live') || NEWS_()[0];
  const GOTM_ = () => STORE.gotm;
  const sp = k => (STORE.sponsors[k] && STORE.sponsors[k].partner) ? E(STORE.sponsors[k].partner) : '[PARTNER]';
  const spLine = k => `<span class="lbl" data-slot="${k}" style="font-size:9px;color:var(--dim)">Presented by ${sp(k)}</span>`;
  const IMG = { 'bn-DERBY': 'assets/news/eastern-derby-poster.png', 'bn-SAILORS': 'assets/news/sailors-celebration.png' };
  const imgBlock = (n, h) => n.img && IMG[n.img] ? `<span class="nimg" style="height:${h}px;background-image:url(${IMG[n.img]})"></span>` : '';
  const newsRow = (n, big) => `<button class="news rowlink" data-article="${E(n.id)}" style="text-align:left;${big ? '' : 'gap:4px'}"><span class="lbl" style="color:var(--accent,#FF9AA0)">${E(n.tag)} · ${ndate(n.date)}</span>${big ? `<span class="d" style="font-size:19px;line-height:1.05">${E(n.title)}</span><span style="font-size:12px;line-height:1.45;color:var(--muted)">${E(n.dek)}</span>` : `<span style="font-size:14px;font-weight:600;line-height:1.3">${E(n.title)}</span>`}</button>`;
  const ICON = {
    tv: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="13"/><path d="M10 9v5l4-2.5z" fill="currentColor"/><path d="M8 21h8"/></svg>',
    search: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    bell: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 20a2 2 0 004 0"/></svg>',
    back: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 5l-7 7 7 7"/></svg>',
    play: '<svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    home: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/></svg>',
    cal: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    bars: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    shield: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>',
    cog: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
    user: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></svg>'
  };

  // ---------- pieces ----------
  const fixRow = r => `<button class="fix" data-match="${r.id}">
    <div style="display:flex;align-items:center;gap:8px">${crest(r.home, 26)}<span style="font-size:13px;font-weight:600">${r.hname}</span></div>
    <div style="display:flex;flex-direction:column;align-items:center"><span class="d mono" style="font-size:${r.sc === 'VS' ? 14 : 20}px;line-height:1">${r.sc}</span><span class="lbl" style="font-size:9px;text-align:center;line-height:1.3;${r.live ? 'color:#FF6B71' : ''}">${r.live ? `<span data-clock="${r.id}">${r.L.clock}</span>` : r.status}</span></div>
    <div style="display:flex;align-items:center;gap:8px;justify-content:flex-end"><span style="font-size:13px;font-weight:600;text-align:right">${r.aname}</span>${crest(r.away, 26)}</div>
  </button>`;
  const scorersLine = (r, side) => { if (!r.L || !r.L.started) return ''; const k = side ? r.away : r.home; const g = r.L.fired.filter(e => e[3] === 'G' && e[4] === k).map(e => `${backName(sname(e[8] || k, e[5]))}${e[7] === 'og' ? ' (og)' : ''} ${minLabel(e[1], e[2])}`); return g.length ? `<span style="font-size:11px;color:var(--muted);text-align:center;line-height:1.4">${g.join(', ')}</span>` : ''; };
  const heroCard = (r, blurb) => { const L = r.L, on = L && L.started, last = on ? L.fired.filter(e => e[3] !== 'FT').slice(-1)[0] : null;
    return `<button class="card hero" data-match="${r.id}">
    <div style="display:flex;justify-content:space-between;align-items:center">${on ? (L.ft ? `<span class="lbl">Full time · MW6</span>` : `<span class="lbl" style="color:#FF6B71"><span class="dot pulse" style="background:#E8363D;margin-right:6px"></span>Live · <span data-clock="${r.id}">${L.clock}</span></span>`) : `<span class="lbl" style="color:#FFD1D3"><span class="dot" style="background:#E8363D;margin-right:6px"></span>Tonight · 7.30PM</span>`}<span class="lbl">${r.venue}</span></div>
    <div class="teams">
      <div class="team">${crest(r.home, 52)}<span class="d" style="font-size:15px;text-align:center;line-height:1">${r.hname}</span>${on ? scorersLine(r, 0) : `<span class="lbl">${posText(r.home)}</span>`}</div>
      ${on ? `<span class="d mono" style="font-size:52px;line-height:1">${r.sc}</span>` : `<span class="d" style="font-size:40px;line-height:1;color:rgba(255,255,255,.7)">VS</span>`}
      <div class="team">${crest(r.away, 52)}<span class="d" style="font-size:15px;text-align:center;line-height:1">${r.aname}</span>${on ? scorersLine(r, 1) : `<span class="lbl">${posText(r.away)}</span>`}</div>
    </div>
    <div style="font-size:13px;line-height:1.45;color:#DCDAF0">${on && L.ft ? `${r.hname} ${posText(r.home).split(' · ')[0]}, ${r.aname} ${posText(r.away).split(' · ')[0]} after tonight.` : on ? (last ? `<span class="mono" style="color:var(--muted)">${last[3] === 'HT' ? '' : minLabel(last[1], last[2]) + ' '}</span>${evText(r.id, last)}` : 'Kick-off at ' + r.venue + '.') + '' : blurb}</div>
    <div style="display:flex;gap:10px"><span class="btn">Match centre</span>${on ? `<span class="btn2" data-match="${r.id}" data-to="${L.ft ? 'potm' : 'lineups'}">${L.ft ? 'Player of the Match' : 'Line-ups'}</span>` : `<span class="btn2" data-tickets="${r.id}">Tickets</span>`}</div>
  </button>`; };
  const tableRows = (rs, clickable) => rs.map(r => `<${clickable ? 'button' : 'div'} class="trow mono" ${clickable ? `data-club="${r.code}"` : ''}><span style="color:${r.move > 0 ? '#3DD68C' : r.move < 0 ? '#FF6B71' : 'var(--muted)'}">${r.pos}</span><span style="display:flex;align-items:center;gap:8px;font-weight:500">${crest(r.code, 22)}${r.name}${r.live ? '<span class="dot pulse" style="width:6px;height:6px;background:#E8363D" aria-label="playing now"></span>' : ''}</span><span style="text-align:right;color:var(--muted)">${r.p}</span><span style="text-align:right;color:var(--muted)">${r.gd}</span><span style="text-align:right;font-weight:700">${r.pts}</span><span style="display:flex;gap:3px;justify-content:flex-end">${dots(r.form)}</span></${clickable ? 'button' : 'div'}>`).join('');
  const ytThumb = id => P.settings.data ? '' : `background-image:url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)`;
  const clubVideoCard = v => `<button class="rowlink" data-video="${v.id}" style="display:grid;grid-template-columns:150px 1fr;gap:12px;align-items:start"><span class="th" style="height:84px;background-color:#1C1A4A;${ytThumb(v.id)}"><span aria-hidden="true" style="position:absolute;left:8px;bottom:8px;width:26px;height:26px;background:#fff;color:#0B0F2E;display:flex;align-items:center;justify-content:center">${ICON.play}</span>${v.len ? `<span style="position:absolute;right:6px;bottom:6px;background:#0B0F2E;padding:2px 6px;font:600 10px 'Inter',sans-serif">${v.len}</span>` : ''}</span><span style="display:flex;flex-direction:column;gap:6px"><span class="lbl" style="display:flex;align-items:center;gap:6px">${C[v.k] ? crest(v.k, 14) + C[v.k].short : 'SPL'} · ${v.date}</span><span style="font-size:13px;font-weight:600;line-height:1.3">${v.title}</span></span></button>`;
  const hlCard = mi => hlCardV(hlFor(mi)) + extrasFor(mi).map(hlCardV).join('');
  const hlCardV = v => { if (!v) return '';
    return `<button class="card rowlink" data-video="${v.id}" style="padding:0;overflow:hidden;color:var(--ink);text-align:left"><span class="th" style="display:block;height:190px;border:0;background-color:#1C1A4A;${ytThumb(v.id)}"><span class="hlplay" aria-hidden="true" style="position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px;border-radius:50%;background:rgba(255,255,255,.9);color:#0B0F2E;display:flex;align-items:center;justify-content:center">${ICON.play}</span></span><span style="display:flex;flex-direction:column;gap:4px;padding:12px 16px 14px 16px"><span class="lbl">${v.kind || 'Highlights'} · ${v.k === 'SPL' ? 'SPL channel' : C[v.k].name}</span><span style="font-size:14px;font-weight:600;line-height:1.35">${v.title}</span></span></button>`; };
  const videoCard = (v, w, h) => `<a href="#video" data-story="${VIDEOS.indexOf(v)}" style="${w ? `flex:none;width:${w}px;` : ''}display:flex;flex-direction:column;gap:8px"><span class="th ${v.th}" style="height:${h}px"><span aria-hidden="true" style="position:absolute;right:10px;bottom:8px;background:#0B0F2E;color:#fff;padding:3px 7px;font:600 11px 'Inter',sans-serif">${v.len}</span></span><span class="lbl" style="color:var(--accent,#FF9AA0)">Highlights</span><span style="font-size:13px;font-weight:600;line-height:1.3">${v.title}</span></a>`;

  // ---------- moments: last round as stories, after the J.League app ----------
  const moments = () => `<div style="display:flex;flex-direction:column;gap:10px"><div style="display:flex;align-items:center;gap:14px"><span class="d" style="font-size:20px">Moments</span><span style="flex:1;height:1px;background:var(--line)"></span><span class="lbl">Matchweeks 5–6</span></div>
    <div class="scroll" style="display:flex;gap:10px;overflow-x:auto;margin:0 -20px;padding:0 20px">${VIDEOS.map((v, j) => { const m = SPL.matches[v.mi]; return `<button data-story="${j}" class="mo" aria-label="${short(m[2])} ${m[4][0]}–${m[4][1]} ${short(m[3])}"><span class="th ${v.th}" style="position:absolute;inset:0;border:0"></span><span class="mo-b">${crest(m[2], 16)}<span class="d mono" style="font-size:15px">${m[4][0]}–${m[4][1]}</span>${crest(m[3], 16)}</span></button>`; }).join('')}</div></div>`;
  function storyEl() {
    if (!S.story) return '';
    const j = S.story.j, v = VIDEOS[j], m = SPL.matches[v.mi], goals = realGoals(m);
    return `<div class="story" role="dialog" aria-label="Moments">
      <span class="th ${v.th}" style="position:absolute;inset:0;border:0;background-size:cover"></span>
      <div class="story-top">${VIDEOS.map((x, k) => `<span class="seg"><span style="width:${k < j ? 100 : k === j ? Math.min(100, S.story.p) : 0}%"></span></span>`).join('')}</div>
      <div style="position:absolute;top:calc(var(--safe-area-inset-top,env(safe-area-inset-top,0px)) + 22px);left:14px;right:6px;display:flex;align-items:center;gap:8px;z-index:3"><span style="display:flex;gap:2px">${crest(m[2], 22)}${crest(m[3], 22)}</span><span style="font:600 13px 'Inter',sans-serif;text-shadow:0 1px 3px rgba(0,0,0,.7)">${fmtDate(m[1])} · ${short(m[2])} v ${short(m[3])}</span><span style="flex:1"></span><button class="ic" data-sclose="1" aria-label="Close" style="text-shadow:0 1px 3px rgba(0,0,0,.7)"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4"><path d="M5 5l14 14M19 5L5 19"/></svg></button></div>
      <button data-snav="-1" aria-label="Previous" style="position:absolute;left:0;top:80px;bottom:240px;width:34%;background:none;border:0;z-index:2"></button><button data-snav="1" aria-label="Next" style="position:absolute;right:0;top:80px;bottom:240px;width:66%;background:none;border:0;z-index:2"></button>
      <div class="story-b">
        <div style="display:flex;align-items:center;justify-content:center;gap:18px">${crest(m[2], 46)}<span class="d mono" style="font-size:56px;line-height:1">${m[4][0]}–${m[4][1]}</span>${crest(m[3], 46)}</div>
        <span class="lbl" style="text-align:center">Full time · Matchweek ${m[0]} · ${m[5]}</span>
        ${scorerGrid(m, goals)}
        <div style="display:flex;gap:10px;padding-top:4px"><button class="btn" style="flex:1" data-match="${v.mi}" data-sclosego="1">Match centre</button>${hlFor(v.mi) ? `<button class="btn2" style="flex:1" data-video="${hlFor(v.mi).id}">Highlights · ${v.len}</button>` : `<button class="btn2" style="flex:1" data-sclose="1" data-gowatch="1">Highlights · ${v.len}</button>`}</div>
      </div></div>`;
  }
  function article() {
    const n = STORE.news.find(x => x.id === S.article && x.status === 'live');
    if (!n) return `<button class="back" data-go="home" aria-label="Back">${ICON.back}</button><span style="font-size:13px;color:var(--muted)">This story has been taken down.</span>`;
    const more = NEWS_().filter(x => x.id !== n.id).slice(0, 3);
    return `<div style="display:flex;align-items:center;gap:6px"><button class="back" data-go="${S.from === 'search' ? 'search' : 'home'}" aria-label="Back">${ICON.back}</button><span class="lbl">News</span></div>
      ${imgBlock(n, 230) ? `<div style="margin:0 -20px">${imgBlock(n, 230)}</div>` : ''}
      <div style="display:flex;flex-direction:column;gap:10px"><span class="lbl" style="color:var(--accent,#FF9AA0)">${E(n.tag)} · ${ndate(n.date)}</span><span class="d" style="font-size:28px;line-height:1">${E(n.title)}</span><span style="font-size:15px;line-height:1.5;color:#DCDAF0;font-weight:500">${E(n.dek)}</span></div>
      <div style="height:1px;background:var(--line)"></div>
      <div class="body">${E(n.body).split(/\n\s*\n/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')}</div>
      <span class="lbl">Football Association of Singapore</span>
      ${more.length ? `<div style="display:flex;flex-direction:column;gap:8px"><span class="d" style="font-size:18px">More news</span><div class="card" style="padding:0 16px">${more.map(x => newsRow(x, false)).join('')}</div></div>` : ''}`;
  }
  // a YouTube link or id from the admin, and a clip time like 1:23 or 83 (seconds)
  const ytId = u => { const m = String(u || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/) || String(u || '').match(/^([\w-]{11})$/); return m ? m[1] : ''; };
  const secs = t => { const m = String(t || '').trim().match(/^(?:(\d+):)?(\d{1,2})(?::(\d{2}))?$/); if (!m) return 0; return m[3] !== undefined ? (+m[1] || 0) * 3600 + +m[2] * 60 + +m[3] : (m[1] !== undefined ? +m[1] * 60 + +m[2] : +m[2]); };
  function video() {
    const v = SPLVID.find(x => x.id === S.video) || CLUBVID.find(x => x.id === S.video) || (S.vclip ? { id: S.video, k: 'SPL', title: S.vclip.title, date: S.vclip.date || '' } : CLUBVID[0]);
    const span = S.vclip && S.vclip.id === S.video ? (S.vclip.from ? '&start=' + S.vclip.from : '') + (S.vclip.to ? '&end=' + S.vclip.to : '') : '';
    return `<div style="display:flex;align-items:center;gap:6px"><button class="back" data-go="${S.vclip && S.vclip.id === S.video ? 'gotm' : 'watch'}" aria-label="Back">${ICON.back}</button><span class="d" style="font-size:20px">${S.vclip && S.vclip.id === S.video ? 'Goal of the Month' : 'Watch'}</span></div>
      <div style="margin:0 -20px;aspect-ratio:16/9;background:#000"><iframe src="https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&playsinline=1&rel=0&modestbranding=1${span}" title="${v.title.replace(/"/g, '&quot;')}" style="width:100%;height:100%;border:0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>
      <div style="display:flex;flex-direction:column;gap:6px"><span class="lbl" style="display:flex;align-items:center;gap:6px">${C[v.k] ? crest(v.k, 14) + C[v.k].name : 'SPL channel'} · ${v.date}${v.len ? ' · ' + v.len : ''}</span><span class="d" style="font-size:22px;line-height:1.02">${v.title}</span></div>
      ${v.mi !== undefined ? `<button class="btn2" data-match="${v.mi}" style="width:100%">Match centre</button>` : ''}
      <div style="display:flex;flex-direction:column;gap:12px"><span class="lbl">Up next</span>${(v.k === 'SPL' ? SPLVID.filter(x => !x.kind).concat(CLUBVID) : CLUBVID.concat(SPLVID.filter(x => !x.kind))).filter(x => x.id !== v.id).slice(0, 4).map(clubVideoCard).join('')}</div>
      <span style="font-size:11px;color:var(--muted)">Plays from the SPL and club YouTube channels.</span>`;
  }

  // ---------- screens ----------
  const pmonthCard = () => { const M = PMONTH, mine = P.votes[M.key];
    return `<button class="card" data-go="pmonth" style="position:relative;overflow:hidden;padding:16px;display:flex;flex-direction:column;gap:8px;cursor:pointer;text-align:left;color:var(--ink);width:100%;min-height:150px"><span style="position:absolute;right:-6px;bottom:0;display:flex;gap:0">${M.list.slice(0, 3).map(x => photoOf(x.team, x.n) ? `<img src="${photoOf(x.team, x.n)}" alt="" style="height:112px;width:auto;margin-left:-30px">` : '').join('')}</span><div class="lbl" style="position:relative;color:#C9A227">Player of the Month · ${M.month}</div><span class="d" style="position:relative;font-size:20px;line-height:1;max-width:44%">${mine ? 'See how the vote stands' : 'Five players. One vote.'}</span><span class="lbl" style="position:relative">${mine ? 'Voted' : 'Closes ' + fmtDate(M.closes)}</span></button>`; };
  // Me (Hafiz, 5 Nov): your initial on your club's colour, ringed in its second colour. Opens your profile and settings.
  const meBtn = () => { const f = P.fav && C[P.fav], n = P.user && P.user.name ? P.user.name.trim()[0].toUpperCase() : '';
    return `<button class="hbtn me" aria-label="Me" data-go="settings" style="background:${f ? f.c : 'rgba(255,255,255,.1)'};color:${f ? f.cf : '#fff'}">${n || ICON.user || 'Me'}</button>`; };
  function home() {
    const all = rows(), tonight = all.filter(r => r.date === '2026-11-01');
    const latest = all.filter(r => r.sc !== 'VS').slice(-6).reverse();
    const head = `<div style="display:flex;align-items:center">
      <span class="spl-h" role="img" aria-label="Singapore Premier League" style="width:118px;height:44px;margin-left:-6px;flex:none"></span>
      <span class="aia" role="img" aria-label="AIA, title sponsor" style="width:28px;height:30px;margin-left:8px;flex:none"></span><span style="flex:1"></span>
      <div style="display:flex;align-items:center;gap:8px"><button class="hbtn" aria-label="Search" data-go="search">${ICON.search}</button><button class="hbtn" aria-label="Alerts" data-go="settings" data-focus="notif">${ICON.bell}</button>${meBtn()}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="tabs">${[['tonight', 'Matchday'], ['news', 'News']].map(([k, l]) => `<button class="stab ${S.htab === k ? 'on' : ''}" data-htab="${k}">${l}</button>`).join('')}</div>
      <div class="lbl" style="display:flex;justify-content:space-between"><span>Sun 1 Nov · Matchweek 6</span><span>${anyLive() ? '<span style="color:#FF6B71">2 live</span>' : S.sim && S.sim.T >= 0 ? 'Full time' : '2 games tonight'}</span></div>
    </div>`;
    if (S.htab === 'news') return head + `<div class="card" style="padding:0 16px">${NEWS_().map(n => newsRow(n, true)).join('')}</div>`;
    if (S.htab === 'watch') S.htab = 'tonight';
    const fav = favC();
    const favFx = fav ? rows().filter(r => (r.home === P.fav || r.away === P.fav) && r.sc === 'VS').slice(0, 1) : [];
    const favStrip = fav ? `<div class="card" style="padding:14px 16px;display:flex;align-items:center;gap:12px;border-top:3px solid ${fav.c}">${crest(P.fav, 36)}<div style="flex:1;display:flex;flex-direction:column;gap:2px"><span class="d" style="font-size:15px;line-height:1">${fav.short}</span><span class="lbl">${posText(P.fav)} · ${favFx.length ? 'next ' + favFx[0].when + ' v ' + (favFx[0].home === P.fav ? favFx[0].aname : favFx[0].hname) : 'no fixture scheduled'}</span></div><button class="rowlink" data-club="${P.fav}" style="width:auto;color:var(--muted);font:600 12px 'Inter',sans-serif">My club →</button></div>` : '';
    const G = GOTM_(), voted = P.votes[G.month], win = G.winner && G.goals.find(g => g.id === G.winner);
    const gotmCard = `<button class="card" data-go="gotm" style="padding:16px;display:flex;flex-direction:column;gap:8px;cursor:pointer;text-align:left;color:var(--ink);width:100%"><div style="display:flex;justify-content:space-between" class="lbl"><span style="color:#C9A227">Goal of the Month · ${E(G.month)}</span><span>${win ? 'Result' : voted ? 'Voted' : G.open ? 'Closes ' + fmtDate(G.closes) : 'Voting closed'}</span></div><span class="d" style="font-size:20px;line-height:1">${win ? E(win.player) + ' wins' : voted ? 'See how the vote stands' : G.open ? G.goals.length + ' goals. One vote.' : 'Result coming soon'}</span><span style="font-size:12px;color:var(--muted)">${win ? E(win.match) + ' · ' + E(win.min) : G.goals.map(g => E(backName(g.player))).join(' · ')}</span>${spLine('gotm')}</button>`;
    return head + favStrip + moments() + mustSee() +
      heroCard(tonight[1], 'First against second. Geylang unbeaten; Tampines a perfect four from four. Winner sleeps top.') +
      heroCard(tonight[0], 'Champions on three straight league wins; the Tigers are unbeaten in three.') + `<button class="rowlink" data-go="awards" style="display:flex;flex-direction:column;gap:8px;text-align:left;color:var(--ink)"><span style="display:flex;justify-content:space-between;align-items:baseline"><span class="d" style="font-size:20px">${PMONTH.month} awards</span><span class="lbl">Vote now →</span></span>${awardsGraphic()}</button>` +
      `<div style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="d" style="font-size:20px">Latest results</span><button class="rowlink" data-go="matches" style="color:var(--muted);font:600 12px 'Inter',sans-serif;width:auto">Matchweek 6 →</button></div>
        <div class="scroll" style="display:flex;gap:10px;overflow-x:auto;margin:0 -20px;padding:0 20px">${latest.map(m => `<button class="card" data-match="${m.id}" style="flex:none;width:150px;padding:14px;display:flex;flex-direction:column;gap:10px;cursor:pointer;color:var(--ink);text-align:left"><span class="lbl">${m.when}</span><div style="display:flex;align-items:center;justify-content:space-between">${crest(m.home, 26)}<span class="d mono" style="font-size:26px">${m.sc}</span>${crest(m.away, 26)}</div><span style="font-size:11px;color:var(--muted)">${m.venue}</span></button>`).join('')}</div>
      </div>
      <div class="card" style="padding:16px 16px 6px 16px;display:flex;flex-direction:column">
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding-bottom:6px"><span class="d" style="font-size:20px">Table</span><button class="rowlink" data-go="table" style="color:var(--muted);font:600 12px 'Inter',sans-serif;width:auto">Full table →</button></div>
        ${tableRows(table().slice(0, 4), false)}
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="d" style="font-size:20px">Latest news</span><button class="rowlink" data-htab="news" style="color:var(--muted);font:600 12px 'Inter',sans-serif;width:auto">All news →</button></div>
        ${(L => L ? `<button class="rowlink" data-article="${E(L.id)}" style="display:flex;flex-direction:column;gap:10px;text-align:left">${imgBlock(L, 260)}<span class="lbl" style="color:var(--accent,#FF9AA0)">${E(L.tag)} · ${ndate(L.date)}</span><span class="d" style="font-size:22px;line-height:1.02">${E(L.title)}</span><span style="font-size:12px;color:var(--muted)">${E(L.dek)}</span></button>` : '')(LEAD_())}
        <div class="card" style="padding:0 16px">${NEWS_().filter(n => !LEAD_() || n.id !== LEAD_().id).slice(0, 3).map(n => newsRow(n, false)).join('')}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="d" style="font-size:20px">Highlights</span><button class="rowlink" data-htab="watch" style="color:var(--muted);font:600 12px 'Inter',sans-serif;width:auto">All video →</button></div>
        <div class="scroll" style="display:flex;gap:10px;overflow-x:auto;margin:0 -20px;padding:0 20px">${VIDEOS.map(v => videoCard(v, 220, 124)).join('')}</div>
      </div>`;
  }

  function matches() {
    const all = rows().filter(r => r.mw === S.mw), groups = {};
    all.forEach(r => (groups[r.date] = groups[r.date] || []).push(r));
    return seasonHead('matches') + `
      <div class="tabs"><button class="stab on">SPL</button><button class="stab">SPL2</button><button class="stab">Singapore Cup</button><button class="stab">ACL Two</button></div>
      <div class="scroll" style="display:flex;gap:8px;overflow-x:auto;margin:0 -20px;padding:0 20px">${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<button class="mw ${S.mw === n ? 'on' : ''}" data-mw="${n}">MW ${n}</button>`).join('')}</div>
      ${Object.keys(groups).sort().map(d => `<div style="display:flex;flex-direction:column;gap:8px"><span class="lbl">${fmtDate(d)}</span><div class="card" style="padding:0 4px">${groups[d].map(fixRow).join('')}</div></div>`).join('')}`;
  }

  const BALL = '<svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff"/><path d="M12 7l4 3-1.5 4.5h-5L8 10z" fill="#0B0F2E"/></svg>';
  const RCARD = '<span aria-hidden="true" style="display:inline-block;width:7px;height:10px;background:#E8363D;border-radius:1px"></span>';
  const CARD = '<span aria-hidden="true" style="display:inline-block;width:7px;height:10px;background:#F5C518;border-radius:1px"></span>';
  const SUBI = (on) => `<svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="${on ? '#3DD68C' : '#FF6B71'}" stroke-width="3"><path d="${on ? 'M12 20V5M6 11l6-6 6 6' : 'M12 4v15M6 13l6 6 6-6'}"/></svg>`;
  // line-ups as a list, both teams side by side: the team sheet, no formation (Hafiz, 4 Nov)
  function lineups(i, L) {
    const m = SPL.matches[i];
    const row = (k, no, sub) => { const p = shirt(k, no), ev = L.fired.filter(e => e[4] === k);
      const g = ev.filter(e => e[3] === 'G' && e[5] === no).length, yel = ev.some(e => e[3] === 'Y' && e[5] === no), red = ev.some(e => e[3] === 'R' && e[5] === no), off = ev.find(e => e[3] === 'S' && e[6] === no), on = ev.find(e => e[3] === 'S' && e[5] === no);
      const ch = sub ? on : off, quiet = sub && !on;
      return `<button class="pl" data-player="${p[1]}" style="padding:7px 0;gap:8px;min-width:0"><span class="d mono" style="width:22px;flex:none;font-size:12px;color:var(--muted);text-align:left">${no}</span><span style="flex:1;min-width:0;font-size:13px;font-weight:${quiet ? 400 : 600};text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${quiet ? 'color:var(--muted)' : ''}">${p[1]}</span>${g ? BALL.repeat(g) : ''}${yel ? CARD : ''}${red ? RCARD : ''}${ch ? SUBI(!!sub) : ''}</button>`; };
    return `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">${[m[2], m[3]].map(k => `<div class="card" style="padding:4px 12px 12px 12px;min-width:0"><div style="display:flex;align-items:center;gap:8px;padding:12px 0 6px 0">${crest(k, 18)}<span class="lbl" style="color:var(--ink)">${C[k].short}</span></div>
      ${XI[k].xi.map(no => row(k, no, false)).join('')}
      <div class="lbl" style="padding:14px 0 2px 0">Substitutes</div>${XI[k].bench.map(no => row(k, no, true)).join('')}
      <div class="lbl" style="padding-top:12px">Coach</div><div style="font-size:12px;padding-top:2px">${C[k].coach}</div></div>`).join('')}</div>
      <span style="font-size:11px;color:var(--muted)">Replay: goals and changes from the clubs' match reports; the rest of the team sheets is reconstructed until FAS's feed supplies them.</span>`;
  }
  function liveOverview(i, L) {
    const m = SPL.matches[i];
    const icon = e => e[3] === 'D' ? `<span style="opacity:.45">${BALL}</span>` : e[3] === 'G' ? BALL : e[3] === 'Y' ? CARD : e[3] === 'R' ? RCARD : SUBI(true);
    const rowsH = L.fired.slice().reverse().map(e => {
      if (e[3] === 'HT' || e[3] === 'FT') { const sc = e[3] === 'FT' ? L.score : [0, 1].map(s => L.fired.filter((x, xi) => x[3] === 'G' && xi < L.fired.indexOf(e) && (x[4] === m[2]) === (s === 0)).length); return `<div class="lbl" style="text-align:center;padding:12px 0;border-bottom:1px solid var(--line2)">${e[3] === 'FT' ? 'Full time' : 'Half time'} · ${sc[0]}–${sc[1]}</div>`; }
      const h = e[4] === m[2], who = e[3] === 'G' ? gname(e) : e[3] === 'D' ? `<s style="opacity:.6">${gname(e)}</s>` : sname(e[4], e[5]), sub = e[3] === 'D' ? `<span style="color:#FF6B71;font-weight:600">No goal · VAR</span> · ${e[9] || 'ruled out'}` : e[3] === 'G' && e[7] ? (e[7] === 'pen' ? 'Penalty' : e[7] === 'og' ? 'Own goal' : e[7]) : e[3] === 'G' && e[6] ? `Assist ${sname(e[4], e[6])}` : e[3] === 'S' ? `Off ${sname(e[4], e[6])}` : e[3] === 'Y' ? 'Yellow card' : e[3] === 'R' ? 'Red card' : '';
      const cell = `<span style="display:flex;flex-direction:column;gap:2px;${h ? 'align-items:flex-end;text-align:right;padding-right:10px' : 'padding-left:10px'}"><span style="display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:${e[3] === 'G' ? 700 : 500}">${h ? '' : icon(e)}${who}${h ? icon(e) : ''}</span>${sub ? `<span style="font-size:11px;color:var(--muted)">${sub}</span>` : ''}</span>`;
      return `<div style="display:grid;grid-template-columns:1fr 50px 1fr;align-items:center;padding:10px 0;border-bottom:1px solid var(--line2)">${h ? cell : '<span></span>'}<span class="d mono" style="font-size:13px;text-align:center;color:var(--muted)">${minLabel(e[1], e[2])}</span>${h ? '<span></span>' : cell}</div>`;
    });
    return `<div class="card" style="padding:4px 16px">${L.started ? rowsH.join('') + '<div class="lbl" style="text-align:center;padding:12px 0">Kick-off · 7.30PM</div>' : '<div style="padding:14px 0;font-size:13px;color:var(--muted)">Team sheets are in. Kick-off 7.30PM.</div>'}</div>
      <div class="card" style="padding:14px 16px;display:flex;flex-direction:column;gap:8px"><span class="lbl">Officials &amp; broadcast</span><span style="font-size:13px;color:#DCDAF0">Live on meWATCH</span></div>`;
  }
  function potmTab(i) {
    const p = POTM[i], mine = P.potm[i], tally = p.base.map((n, j) => n + (mine === j ? 1 : 0)), tot = tally.reduce((a, b) => a + b, 0);
    return `<div style="display:flex;flex-direction:column;gap:4px"><span class="d" style="font-size:22px;line-height:1">Player of the Match</span>${spLine('potm')}<span style="font-size:12px;color:var(--muted)">${mine === undefined ? 'Fans pick. Voting closes 30 minutes after full time.' : 'Thanks for voting. The winner is announced on the club channels and here.'}</span></div>
      ${p.nom.map(([n, k], j) => { const pct = Math.round(100 * tally[j] / tot), f = findPlayer(n); return `<button class="card" data-potm="${i}:${j}" style="padding:14px 16px;display:flex;flex-direction:column;gap:10px;cursor:pointer;text-align:left;color:var(--ink);width:100%;border-top:3px solid ${mine === j ? C[k].c : 'transparent'}" ${mine !== undefined ? 'disabled' : ''}><div style="display:flex;align-items:center;gap:12px">${crest(k, 32)}<span style="flex:1;display:flex;flex-direction:column;gap:2px"><span class="d" style="font-size:16px;line-height:1">${n}</span><span class="lbl">${short(k)} · ${f ? f.p[2] : ''} · #${f ? f.p[0] : ''}</span></span>${mine !== undefined ? `<span class="d mono" style="font-size:24px">${pct}%</span>` : '<span class="lbl" style="color:#fff">Vote</span>'}</div>${mine !== undefined ? `<div style="height:3px;background:rgba(255,255,255,.1)"><div style="height:3px;width:${pct}%;background:#fff"></div></div>` : ''}</button>`; }).join('')}
      <span style="font-size:11px;color:var(--muted)">${tot.toLocaleString()} votes · one per signed-in fan · counts are placeholders in this demo.</span>`;
  }

  // scorers in two columns under the score, minutes meeting in the middle (after the J.League match page)
  function scorerGrid(m, goals) {
    const H = goals.filter(g => g.team === m[2]), A = goals.filter(g => g.team === m[3]), n = Math.max(H.length, A.length);
    if (!n) return '';
    let out = '';
    for (let j = 0; j < n; j++) { const h = H[j], a = A[j];
      out += `<span style="font-size:13px;text-align:right;line-height:1.3">${h ? `<button class="rowlink" data-player="${h.name.replace(/ \((og|pen)\)/, '')}" style="width:auto;text-decoration:underline;text-decoration-color:rgba(255,255,255,.3);text-underline-offset:3px">${h.name}</button>` : ''}</span><span class="d mono" style="font-size:15px;text-align:right">${h ? h.min : ''}</span><span class="d mono" style="font-size:15px">${a ? a.min : ''}</span><span style="font-size:13px;line-height:1.3">${a ? `<button class="rowlink" data-player="${a.name.replace(/ \((og|pen)\)/, '')}" style="width:auto;text-decoration:underline;text-decoration-color:rgba(255,255,255,.3);text-underline-offset:3px">${a.name}</button>` : ''}</span>`; }
    return `<div style="display:grid;grid-template-columns:1fr 44px 44px 1fr;column-gap:10px;row-gap:8px;align-items:baseline;padding-top:4px">${out}</div>`;
  }
  const realGoals = m => (m[6] || []).map(g => ({ team: g[2], name: g[0], min: (/\+/.test(g[1]) ? g[1] : g[1]) + "'" }));
  const simGoals = (i, L) => L.fired.filter(e => e[3] === 'G').map(e => ({ team: e[4], name: gname(e) + (e[7] === 'pen' ? ' (pen)' : ''), min: minLabel(e[1], e[2]) }));

  function formTab(m, r) {
    const h2h = SPL.matches.filter((x, i) => i !== S.match && x[4] && ((x[2] === m[2] && x[3] === m[3]) || (x[2] === m[3] && x[3] === m[2]))).map(x => `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line2);font-size:13px"><span>${short(x[2])} v ${short(x[3])} · MW${x[0]}</span><span class="d mono" style="font-size:16px">${x[4][0]}–${x[4][1]}</span></div>`);
    return `<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:14px"><span class="lbl">Last five · league</span><div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:13px;font-weight:600">${r.hname}</span><span style="display:flex;gap:5px">${dots(form(m[2]), 10)}</span></div><div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:13px;font-weight:600">${r.aname}</span><span style="display:flex;gap:5px">${dots(form(m[3]), 10)}</span></div><span style="font-size:11px;color:var(--muted)">Green win · grey draw · red loss, most recent on the right</span></div><div class="card" style="padding:6px 16px"><div class="lbl" style="padding:10px 0 4px 0">Head to head · 2026/27</div>${h2h.length ? h2h.join('') : '<div style="padding:10px 0 14px 0;font-size:13px;color:var(--muted)">First meeting this season.</div>'}</div>`;
  }
  function liveMatch(m, r, L) {
    const tabs = [['overview', 'Overview'], ['lineups', 'Line-ups'], ['form', 'Form']].concat(L.ft ? [['potm', 'Vote']] : []);
    if (!tabs.some(t => t[0] === S.mtab)) S.mtab = 'overview';
    const body = S.mtab === 'lineups' ? lineups(S.match, L) : S.mtab === 'form' ? formTab(m, r) : S.mtab === 'potm' ? potmTab(S.match) : (L.ft ? hlCard(S.match) : '') + liveOverview(S.match, L);
    const head = L.ft ? '<span class="lbl" style="text-align:center">Full time</span>' : L.started ? `<span class="lbl" style="text-align:center;color:#FF6B71"><span class="dot pulse" style="background:#E8363D;margin-right:6px"></span>Live · <span data-clock="${S.match}">${L.clock}</span></span>` : '<span class="lbl" style="text-align:center">Kick-off 7.30PM · team sheets in</span>';
    return `<div style="display:flex;align-items:center;justify-content:space-between"><button class="back" data-go="${S.from || 'matches'}" aria-label="Back">${ICON.back}</button><span class="d" style="font-size:16px">Match centre</span><span style="width:34px"></span></div>
      <div class="card" style="padding:18px;display:flex;flex-direction:column;gap:12px">${head}
        <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:start;gap:10px"><button class="rowlink" data-club="${m[2]}" style="display:flex;flex-direction:column;align-items:center;gap:8px">${crest(m[2], 54)}<span class="d" style="font-size:14px;text-align:center;line-height:1">${r.hname}</span></button><span class="d mono" style="font-size:${L.started ? 58 : 40}px;line-height:1;padding-top:6px">${L.started ? r.sc : 'VS'}</span><button class="rowlink" data-club="${m[3]}" style="display:flex;flex-direction:column;align-items:center;gap:8px">${crest(m[3], 54)}<span class="d" style="font-size:14px;text-align:center;line-height:1">${r.aname}</span></button></div>${scorerGrid(m, simGoals(S.match, L))}
        <span class="lbl" style="text-align:center;padding-top:12px;border-top:1px solid var(--line)">Matchweek ${m[0]} · ${r.venue} · meWATCH</span></div>
      <div class="tabs">${tabs.map(([k, l]) => `<button class="stab ${S.mtab === k ? 'on' : ''}" data-mtab="${k}">${l}</button>`).join('')}</div>${body}`;
  }

  // getting there (Hafiz, 4 Nov): nearest MRT, then what FAS sets per match
  const LINE = { EW: '#009645', DT: '#005EC4', NS: '#D42E12', CC: '#FA9E0D' };
  function gettingThere(venue) {
    const v = (SPL.venues || {})[venue]; if (!v) return '';
    return `<div class="card" style="padding:14px 16px;display:flex;flex-direction:column;gap:10px"><span class="lbl">Getting there</span><span style="font-size:15px;font-weight:700">${venue}</span>
      ${v.mrt.map(([st, code, ln]) => `<div style="display:flex;align-items:center;gap:10px"><span aria-hidden="true" style="width:10px;height:10px;flex:none;background:${LINE[ln]}"></span><span style="font-size:13px;font-weight:600">${st}</span><span class="mono" style="font-size:11px;color:var(--muted)">${code}</span></div>`).join('')}
      <span style="font-size:12px;color:#DCDAF0">${v.walk}</span>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:6px 14px;padding-top:8px;border-top:1px solid var(--line2);font-size:12px"><span class="lbl">Gates</span><span style="color:#DCDAF0">Open 6.30PM, an hour before kick-off</span><span class="lbl">Bags</span><span style="color:#DCDAF0">Small bags only, checked at the gate. No outside food, drink or flares</span><span class="lbl">Parking</span><span style="color:#DCDAF0">${v.park}</span></div>
      <a class="btn2" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.q)}" target="_blank" rel="noopener" style="min-height:40px;text-decoration:none">Directions</a></div>`;
  }
  function match() {
    const m = SPL.matches[S.match], r = mrow(m, S.match), L = r.L;
    if (L) return liveMatch(m, r, L);
    const events = (m[6] || []).map(g => { const h = g[2] === m[2]; return `<div style="display:grid;grid-template-columns:1fr 44px 1fr;align-items:center;padding:10px 0;border-bottom:1px solid var(--line2)"><span style="font-size:13px;text-align:right;padding-right:8px;font-weight:${h ? 600 : 400}">${h ? g[0] : ''}</span><span class="d mono" style="font-size:13px;text-align:center;color:var(--muted)">${g[1]}'</span><span style="font-size:13px;padding-left:8px;font-weight:${h ? 400 : 600}">${h ? '' : g[0]}</span></div>`; });
    const squad = k => SPL.squads[k].map(p => `<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--line2);font-size:11px"><span class="mono" style="color:var(--muted);width:18px">${p[0]}</span><span style="flex:1">${p[1]}</span><span style="color:var(--muted)">${p[2]}</span></div>`).join('');
    let body = '';
    if (S.mtab === 'overview') body = (m[4] ? hlCard(S.match) : '') + `<div class="card" style="padding:6px 16px">${events.length ? events.join('') : `<div style="padding:14px 0;font-size:13px;color:var(--muted)">${m[4] ? 'No goals.' : 'Kick-off 7.30PM. Live events appear here.'}</div>`}</div><div class="card" style="padding:14px 16px;display:flex;flex-direction:column;gap:8px"><span class="lbl">Officials &amp; broadcast</span><span style="font-size:13px;color:#DCDAF0">Live on meWATCH · Highlights on club channels after full time</span></div>` + (m[4] ? '' : gettingThere(m[5]));
    else if (S.mtab === 'form') body = formTab(m, r);
    else body = `<div style="font-size:12px;color:var(--muted)">${m[4] ? 'Starting XIs from this match arrive with the match feed. Registered squads for now.' : 'Starting XIs load here when FAS posts the team sheets, about an hour before kick-off. Registered squads for now.'}</div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px"><div class="card" style="padding:12px"><span class="d" style="font-size:14px">${r.hname}</span>${squad(m[2])}</div><div class="card" style="padding:12px"><span class="d" style="font-size:14px">${r.aname}</span>${squad(m[3])}</div></div>`;
    return `<div style="display:flex;align-items:center;justify-content:space-between"><button class="back" data-go="${S.from || 'matches'}" aria-label="Back">${ICON.back}</button><span class="d" style="font-size:16px">Match centre</span><span style="width:34px"></span></div>
      <div class="card" style="padding:18px;display:flex;flex-direction:column;gap:14px"><span class="lbl" style="text-align:center">Matchweek ${m[0]} · ${r.when} · ${String(r.status).replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) /, '')}</span>
        <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px"><div style="display:flex;flex-direction:column;align-items:center;gap:8px">${crest(m[2], 54)}<span class="d" style="font-size:14px;text-align:center;line-height:1">${r.hname}</span></div><span class="d mono" style="font-size:${r.sc === 'VS' ? 40 : 54}px;line-height:1">${r.sc}</span><div style="display:flex;flex-direction:column;align-items:center;gap:8px">${crest(m[3], 54)}<span class="d" style="font-size:14px;text-align:center;line-height:1">${r.aname}</span></div></div>
        ${m[4] ? scorerGrid(m, realGoals(m)) : ''}
        <span class="lbl" style="text-align:center;${m[4] ? 'padding-top:12px;border-top:1px solid var(--line)' : ''}">${r.venue}${m[4] ? ' · meWATCH · Attendance [FROM FAS]' : ''}</span>
        ${m[4] ? '' : `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px"><a class="btn2" style="box-sizing:border-box;width:100%;min-height:40px;padding:0 6px;font-size:12px;white-space:nowrap;text-decoration:none" href="${ics(m)}" download="spl-mw${m[0]}-${m[2]}-${m[3]}.ics" data-cal="${S.match}">${P.cal[S.match] ? 'In calendar' : 'Calendar'}</a><button class="btn2" style="box-sizing:border-box;width:100%;min-height:40px;padding:0 6px;font-size:12px;white-space:nowrap;text-decoration:none" data-remind="${S.match}">${P.reminders[S.match] ? 'Reminder set' : 'Remind me'}</button><button class="btn" style="box-sizing:border-box;width:100%;min-height:40px;padding:0 6px;font-size:12px;white-space:nowrap;text-decoration:none" data-tickets="${S.match}">Tickets</button></div>`}</div>
      <div class="tabs">${[['overview', 'Overview'], ['form', 'Form &amp; H2H'], ['squads', 'Squads']].map(([k, l]) => `<button class="stab ${S.mtab === k ? 'on' : ''}" data-mtab="${k}">${l}</button>`).join('')}</div>${body}`;
  }

  // ranks that tie share a number, as the J.League lists do (3, 3, 5)
  const ranked = arr => arr.map((x, i) => ({ x, r: arr.findIndex(y => y.v === x.v) + 1 }));
  function leader(key, title, list, unit, note) {
    // list: [{ name, club, v, player }], sorted
    const R = ranked(list), top = R[0].x, open = S.more[key], f = top.player ? findPlayer(top.name) : null;
    const w = top.name.split(' '), fam = top.player ? backName(top.name) : top.name, given = top.player ? w.filter(x => x !== fam).join(' ') : '';
    const row = ({ x, r }) => `<${x.player ? `button class="pl" data-player="${x.name}"` : `button class="pl" data-club="${x.club}"`} style="padding:11px 0;gap:12px"><span class="d mono" style="font-size:16px;width:22px;color:var(--muted)">${r}</span>${crest(x.club, 26)}<span style="flex:1;display:flex;flex-direction:column"><span style="font-size:14px;font-weight:600">${x.name}</span>${x.player ? `<span style="font-size:11px;color:var(--muted)">${short(x.club)}</span>` : ''}</span><span class="d mono" style="font-size:22px">${x.v}${unit || ''}</span></button>`;
    return `<section style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;align-items:center;gap:14px"><span class="d" style="font-size:26px;line-height:1">${title}</span><span style="flex:1;height:1px;background:var(--line)"></span></div>
      <div class="card" style="overflow:hidden;border-top:3px solid ${C[top.club].c}">
        <${top.player ? `button data-player="${top.name}"` : `button data-club="${top.club}"`} class="rowlink" style="display:block;position:relative;padding:16px 16px 18px 16px;color:var(--ink);${f && photoOf(top.club, f.p[0]) ? 'min-height:250px' : ''}">${f && photoOf(top.club, f.p[0]) ? `<img src="${photoOf(top.club, f.p[0])}" alt="" style="position:absolute;left:50%;bottom:0;height:232px;width:auto;transform:translateX(-38%);pointer-events:none">` : ''}
          <div style="display:flex;justify-content:space-between;align-items:flex-start"><span style="display:flex;flex-direction:column;gap:10px"><span class="d mono" style="font-size:22px;line-height:1">1</span>${f && photoOf(top.club, f.p[0]) ? '' : crest(top.club, 64)}</span><span style="display:flex;flex-direction:column;align-items:flex-end"><span class="lbl">${title}</span><span class="d mono" style="font-size:84px;line-height:.9">${top.v}<span style="font-size:34px">${unit || ''}</span></span></span></div>
          <div style="margin-top:14px;display:flex;flex-direction:column;gap:4px;position:relative;z-index:1;text-shadow:0 2px 10px rgba(0,0,0,.5)"><span class="lbl" style="color:#DCDAF0;display:flex;align-items:center;gap:6px">${f && photoOf(top.club, f.p[0]) ? crest(top.club, 16) : ''}${C[top.club].name}${f ? ` · ${f.p[2]} ${f.p[0]}` : ''}</span>${given ? `<span class="d" style="font-size:20px;line-height:1">${given}</span>` : ''}<span class="d" style="font-size:36px;line-height:.92">${fam}</span></div>
        </button>
        <div style="padding:0 16px;border-top:1px solid var(--line)">${R.slice(1, open ? R.length : 5).map(row).join('')}</div>
      </div>
      ${R.length > 5 ? `<button class="btn2" data-more="${key}" style="width:100%">${open ? 'Show fewer' : `All ${R.length}`}</button>` : ''}
      ${note ? `<span style="font-size:11px;color:var(--muted);margin-top:-4px">${note}</span>` : ''}
    </section>`;
  }
  // Season: Matches and Table under one tab (Hafiz, 4 Nov: MLS-style bar)
  const liveLine = () => anyLive() ? '<span class="lbl" style="color:#FF6B71"><span class="dot pulse" style="background:#E8363D;margin-right:6px"></span>Live table · as it stands</span>' : S.sim && S.sim.T >= 0 ? '<span class="lbl">After Matchweek 6</span>' : '<span class="lbl">Before tonight\'s games · updated 31 Oct</span>';
  const seasonHead = on => `<div style="display:flex;flex-direction:column;gap:2px"><span class="d" style="font-size:26px;line-height:1">Season</span>${on === 'table' ? liveLine() : '<span class="lbl">AIA Singapore Premier League · 2026/27</span>'}</div>
      <div class="tabs">${[['matches', 'Matches'], ['table', 'Table']].map(([k, l]) => `<button class="stab ${on === k ? 'on' : ''}" data-go="${k}">${l}</button>`).join('')}</div>`;
  // Short / Full / Form (Premier League app reference), as underlined tabs
  const TV = { short: [['P', 'p'], ['W', 'w'], ['GD', 'gd'], ['Pts', 'pts']], full: [['P', 'p'], ['W', 'w'], ['D', 'd'], ['L', 'l'], ['GF', 'gf'], ['GA', 'ga'], ['GD', 'gd'], ['Pts', 'pts']], form: [['Pts', 'pts']] };
  function tableScreen() {
    const tv = TV[S.tv] ? S.tv : 'short', cols = TV[tv], cw = tv === 'full' ? 24 : 32;
    const grid = `20px minmax(0,1fr) ${cols.map(() => cw + 'px').join(' ')}${tv === 'form' ? ' 80px' : ''}`;
    const cell = (v, k) => `<span style="text-align:right;${k === 'pts' ? 'font-weight:700' : 'color:var(--muted)'}">${v}</span>`;
    const rowsH = table().map(r => `<button class="trow mono" data-club="${r.code}" style="grid-template-columns:${grid};${tv === 'full' ? 'font-size:12px;gap:4px' : ''}"><span style="color:${r.move > 0 ? '#3DD68C' : r.move < 0 ? '#FF6B71' : 'var(--muted)'}">${r.pos}</span><span style="display:flex;align-items:center;gap:8px;font-weight:500;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${crest(r.code, 22)}${tv === 'full' ? r.code : r.name}${r.live ? '<span class="dot pulse" style="width:6px;height:6px;background:#E8363D" aria-label="playing now"></span>' : ''}</span>${tv === 'form' ? `<span style="display:flex;gap:3px;justify-content:flex-end">${r.form.map(c => `<span style="flex:none;width:12px;height:12px;background:${c}"></span>`).join('')}</span>` : ''}${cols.map(([, k]) => cell(r[k], k)).join('')}</button>`).join('');
    return seasonHead('table') + `<div class="tabs" style="gap:26px">${[['short', 'Short'], ['full', 'Full'], ['form', 'Form']].map(([k, l]) => `<button class="stab ${tv === k ? 'on' : ''}" data-tv="${k}" style="font-size:14px">${l}</button>`).join('')}</div>
      <div class="card" style="padding:10px 14px 4px 14px"><div class="lbl" style="display:grid;grid-template-columns:${grid};gap:${tv === 'full' ? 4 : 6}px;padding:4px 0 6px 0"><span>#</span><span>Club</span>${tv === 'form' ? '<span style="text-align:right;white-space:nowrap">Last 5</span>' : ''}${cols.map(([h]) => `<span style="text-align:right">${h}</span>`).join('')}</div>${rowsH}<div style="padding:10px 0 8px 0;font-size:11px;color:var(--muted)">Top 2 qualify for AFC competitions (Young Lions ineligible). 21 rounds, each club plays the others three times.</div></div>`;
  }
  // Stats: its own tab, Players and Clubs (MLS)
  function stats() {
    let body;
    if (S.ttab !== 'players' && S.ttab !== 'clubstats') S.ttab = 'players';
    if (S.ttab === 'players') {
      const P2 = arr => arr.map(x => ({ name: x[0], club: x[1], v: x[2], player: true }));
      body = leader('goals', 'Goals', P2(SPL.scorers), '', 'spl.sg player stats, 1 Nov 2026.') + leader('assists', 'Assists', P2(SPL.assists), '', 'spl.sg player stats, 1 Nov 2026.') +
        `<div class="card" style="padding:14px 16px;display:flex;align-items:center;gap:14px"><span aria-hidden="true" style="width:34px;height:36px;flex:none;border:1px dashed rgba(255,255,255,.3)"></span><span style="flex:1;display:flex;flex-direction:column;gap:2px" data-slot="stats"><span class="lbl">Stats partner</span><span style="font-size:13px;color:#DCDAF0">${STORE.sponsors.stats.partner ? 'Player stats presented by ' + sp('stats') : 'A section sponsor sits here: one partner per section, sold by FAS. [PARTNER]'}</span></span></div>
        <div class="card" style="padding:14px 16px;display:flex;flex-direction:column;gap:6px"><span class="lbl">With the match feed</span><span style="font-size:13px;line-height:1.5;color:#DCDAF0">Clean sheets by goalkeeper, minutes, cards, shots, duels won, distance covered and sprints get the same leader cards once FAS's data provider is connected.</span></div>`;
    } else {
      const T = table(), cs = k => played().filter(m => (m[2] === k && m[4][1] === 0) || (m[3] === k && m[4][0] === 0)).length;
      const by = (fn, asc) => T.map(r => ({ name: C[r.code].name, club: r.code, v: fn(r) })).sort((a, b) => asc ? a.v - b.v : b.v - a.v);
      body = leader('gf', 'Goals scored', by(r => r.gf)) + leader('cs', 'Clean sheets', by(r => cs(r.code))) + leader('ga', 'Fewest conceded', by(r => r.ga, true), '', 'Worked out from the results, so it moves with the live table.');
    }
    return `<div style="display:flex;flex-direction:column;gap:2px"><span class="d" style="font-size:26px;line-height:1">Stats</span><span class="lbl">AIA Singapore Premier League · 2026/27</span></div>
      <div class="tabs">${[['players', 'Players'], ['clubstats', 'Clubs']].map(([k, l]) => `<button class="stab ${S.ttab === k ? 'on' : ''}" data-ttab="${k}">${l}</button>`).join('')}</div>${body}`;
  }

  // Clubs: one club at a time, crest strip, View club (MLS "Step into the locker room"); the onboarding picker's stage
  function clubs() {
    if (!S.pick) S.pick = P.fav || PICK_ORDER()[0];
    return `<div style="display:flex;flex-direction:column;gap:4px"><span class="lbl">Clubs · 2026/27</span><span class="d" style="font-size:26px;line-height:.95">Step into the dressing room</span></div>
      ${pickCore()}
      <button class="btn" data-club="${S.pick}" style="width:100%;margin-top:auto">View club</button>`;
  }

  // trophies as small gold line drawings of the real ones (photos supplied by the owner, 4 Nov, in assets/trophies/):
  // the SPL's ball held in two hands, the Singapore Cup with lid and handles, the octagonal Community Shield;
  // any other competition gets a plain cup.
  const TROPHY = {
    spl: '<circle cx="16" cy="9" r="6.5"/><path d="M10.2 6.5c3.5 1.6 8 1.6 11.6 0M9.6 10.5c3.9 1.3 8.9 1.3 12.8 0M16 2.5v13"/><path d="M8.5 11c0 4 3.2 6.5 7.5 6.5s7.5-2.5 7.5-6.5"/><path d="M13.5 17.5l-1 9h7l-1-9"/><path d="M10.5 26.5h11v4h-11z"/>',
    cup: '<path d="M14.5 2.5h3M13 4.5h6l-1 2.5h-4z"/><path d="M9.5 7h13c0 6-2.6 10.5-6.5 11.5C12.1 17.5 9.5 13 9.5 7z"/><path d="M9.8 9C6 9 5.5 14 9.6 14.6M22.2 9c3.8 0 4.3 5-.2 5.6"/><path d="M16 18.5v4M13 22.5h6l1 3h-8z"/><path d="M10.5 25.5h11v5h-11z"/>',
    shield: '<path d="M11 2.5h10l7.5 7.5v12L21 29.5H11L3.5 22V10z"/><circle cx="16" cy="16" r="8.5"/><path d="M12.5 15.5c1.2-2.4 4.3-3.3 6.6-1.6M12 18.5h8"/>',
    plain: '<path d="M10 4h12v6.5a6 6 0 01-12 0z"/><path d="M10 6.5H6.5v1.5a4 4 0 003.8 4M22 6.5h3.5v1.5a4 4 0 01-3.8 4"/><path d="M16 16.5v6M12.5 22.5h7l1 3.5h-9z"/><path d="M10 26h12v4H10z"/>'
  };
  const trophyKind = t => /S\.League|Singapore Premier League/i.test(t) ? 'spl' : /^Singapore Cup/i.test(t) ? 'cup' : /Community Shield|Charity Shield/i.test(t) ? 'shield' : 'plain';
  const trophyIcon = t => `<svg class="trophy" viewBox="0 0 32 33" fill="none" stroke="#C9A227" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${t} trophy">${TROPHY[trophyKind(t)]}</svg>`;
  function club() {
    const k = S.club, c = C[k], tr = SPL.table.find(r => r[0] === k), H = SPL.honours[k] || { about: '', former: [], honours: [], history: [], players: [] };
    const fx = rows().filter(r => r.home === k || r.away === k), next = fx.filter(r => r.sc === 'VS').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 1);
    const following = !!P.follows[k];
    let body;
    const facts = `<div class="card" style="padding:16px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px">${[['Stadium', c.stadium], ['Head coach', c.coach], ['Captain', c.cap], ['Kit · Sponsor', c.kit]].map(([l, v]) => `<div style="display:flex;flex-direction:column;gap:3px"><span class="lbl">${l}</span><span style="font-size:13px;font-weight:600">${v}</span></div>`).join('')}</div>
      <div class="card" style="padding:16px;display:flex;flex-direction:column;gap:10px"><div style="display:flex;justify-content:space-between;align-items:center"><span class="lbl">Form</span><span style="display:flex;gap:5px">${dots(form(k), 10)}</span></div><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;text-align:center">${[[tr[1], 'Played'], [tr[2], 'Won'], [tr[5], 'For'], [tr[6], 'Against']].map(([n, l]) => `<div><span class="d mono" style="font-size:24px">${n}</span><div class="lbl">${l}</div></div>`).join('')}</div></div>
`;
    const nm = new RegExp(`${c.name}|${c.short}|${c.nick}`, 'i');
    const news = NEWS_().filter(n => nm.test(n.title + ' ' + n.dek + ' ' + n.body)).slice(0, 4);
    const vids = CLUBVID.filter(v => v.k === k || nm.test(v.title)).slice(0, 4);
    const sec = (t, link, inner) => `<div style="display:flex;flex-direction:column;gap:12px"><div style="display:flex;justify-content:space-between;align-items:baseline"><span class="d" style="font-size:22px">${t}</span>${link || ''}</div>${inner}</div>`;
    const IMGN = { 'bn-DERBY': 'assets/news/eastern-derby-poster.png', 'bn-SAILORS': 'assets/news/sailors-celebration.png' };
    const ncard = n => `<button class="rowlink" data-article="${E(n.id)}" style="flex:none;width:270px;display:flex;flex-direction:column;gap:10px;text-align:left;color:var(--ink)">${n.img && IMGN[n.img] ? `<span class="nimg" style="height:152px;background-image:url(${IMGN[n.img]})"></span>` : `<span style="height:152px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);background:${c.c}">${crest(k, 64)}</span>`}<span class="d" style="font-size:17px;line-height:1.05">${E(n.title)}</span><span class="lbl">${E(n.tag)} · ${ndate(n.date)}</span></button>`;
    const vcard = v => `<button class="rowlink" data-video="${v.id}" style="flex:none;width:270px;display:flex;flex-direction:column;gap:10px;text-align:left;color:var(--ink)"><span class="th" style="height:152px;background-color:#1C1A4A;${ytThumb(v.id)}"><span aria-hidden="true" style="position:absolute;left:10px;bottom:10px;width:28px;height:28px;background:#fff;color:#0B0F2E;display:flex;align-items:center;justify-content:center">${ICON.play}</span></span><span style="font-size:14px;font-weight:600;line-height:1.3">${v.title}</span><span class="lbl">${C[v.k].short} channel · ${v.date} · ${v.len}</span></button>`;
    const strip = h => `<div class="scroll" style="display:flex;gap:14px;overflow-x:auto;margin:0 -20px;padding:0 20px">${h}</div>`;
    const nx = next[0];
    const nextCard = nx ? `<div class="card" style="padding:14px 4px 14px 4px;display:flex;flex-direction:column;gap:6px;border-top:3px solid ${c.c}"><div class="lbl" style="display:flex;justify-content:space-between;padding:0 12px"><span>Next · ${nx.when}</span><span>${nx.venue}</span></div>${fixRow(nx)}<div style="display:flex;gap:10px;padding:0 12px"><button class="btn" data-match="${nx.id}" style="flex:1">Match centre</button><button class="btn2" data-tickets="${nx.id}" style="flex:1">Tickets</button></div></div>` : '';
    if (S.ctab === 'latest') body = nextCard +
      sec('Latest news', '', news.length ? strip(news.map(ncard).join('')) : `<span style="font-size:13px;color:var(--muted)">${c.short} news from FAS and the club appears here.</span>`) +
      sec('Highlights', '', vids.length ? strip(vids.map(vcard).join('')) : `<span style="font-size:13px;color:var(--muted)">Highlights from the ${c.short} channel play here once the club shares them with the app.</span>`) +
      sec('The club', '', facts);
    else if (S.ctab === 'tickets') { const up = fx.filter(r => r.sc === 'VS').sort((a, b) => a.date.localeCompare(b.date)); body = `<div class="card" style="padding:14px 16px;display:flex;flex-direction:column;gap:6px"><span class="lbl">Sold on Trip.com</span><span style="font-size:13px;line-height:1.5;color:#DCDAF0">Tickets for every ${c.short} match are sold on Trip.com, the league's ticketing partner. Home games at ${c.stadium}.</span></div>` +
      (up.length ? up.map(r => `<div class="card" style="padding:4px 4px 12px 4px;display:flex;flex-direction:column;gap:6px">${fixRow(r)}<div style="display:flex;justify-content:space-between;align-items:center;padding:0 12px"><span class="lbl">${r.home === k ? 'Home' : 'Away'} · ${r.when}</span><button class="btn2" data-tickets="${r.id}" style="min-height:38px">Tickets</button></div></div>`).join('') : `<span style="font-size:13px;color:var(--muted)">No fixtures on sale yet.</span>`); }
    else if (S.ctab === 'fixtures') body = `<div class="card" style="padding:0 4px">${fx.map(fixRow).join('')}</div>`;
    else if (S.ctab === 'squad') { const POS = { GK: 'Goalkeepers', DF: 'Defenders', MF: 'Midfielders', FW: 'Forwards' }; body = ['GK', 'DF', 'MF', 'FW'].map(pos => `<div class="card" style="padding:6px 16px"><div class="lbl" style="padding:10px 0 2px 0">${POS[pos]}</div>${SPL.squads[k].filter(p => p[2] === pos).map(p => `<button class="pl" data-player="${p[1]}">${PHOTOS[k] ? (photoOf(k, p[0]) ? `<span class="phead" style="background-image:url(${photoOf(k, p[0])})"></span>` : '<span class="phead none"></span>') : ''}<span class="d mono" style="font-size:16px;width:28px;color:var(--muted)">${p[0]}</span><span style="flex:1;font-size:14px;font-weight:500">${p[1]}</span><span style="font-size:11px;color:var(--muted)">${p[3] || ''}</span></button>`).join('')}</div>`).join(''); }
    else body = `<div style="display:flex;flex-direction:column;gap:14px;padding:6px 0 2px 0;border-top:2px solid #C9A227;border-bottom:2px solid #C9A227"><div style="padding:10px 0 0 0;display:flex;flex-direction:column;gap:8px"><span class="d" style="font-size:20px;line-height:1">The 2026/27 season for ${c.name}</span><p style="margin:0;font-size:13px;line-height:1.55;color:#DCDAF0">${H.about}</p></div><div style="padding-bottom:10px;display:flex;flex-direction:column;gap:4px"><span class="lbl">Formerly</span>${H.former.map(f => `<span style="font-size:13px"><span style="font-weight:600">${f.name}</span> <span style="color:var(--muted)">${f.years}</span></span>`).join('')}</div></div>
      <div class="card" style="padding:6px 16px"><div class="lbl" style="padding:10px 0 2px 0">Honours</div>${H.honours.length ? H.honours.map(h => { return `<div style="display:grid;grid-template-columns:34px 1fr auto;gap:14px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line2)">${trophyIcon(h.t)}<span style="display:flex;flex-direction:column;gap:3px"><span style="font-size:14px;font-weight:600;line-height:1.25">${h.t}</span><span class="mono" style="font-size:11px;color:var(--muted);line-height:1.4">${h.y}</span></span><span class="d mono" style="font-size:34px;line-height:1;color:#C9A227">${h.n}</span></div>`; }).join('') : '<div style="padding:10px 0 14px 0;font-size:13px;color:var(--muted)">No senior honours yet — the Young Lions are the national U-23 development side.</div>'}</div>
      <div class="card" style="padding:6px 16px"><div class="lbl" style="padding:10px 0 2px 0">History</div>${H.history.map(t => `<div style="display:grid;grid-template-columns:10px 1fr;gap:12px;padding:10px 0;border-bottom:1px solid var(--line2);font-size:13px;line-height:1.45"><span style="width:6px;height:6px;margin-top:6px;background:${c.c}"></span><span>${t}</span></div>`).join('')}</div>
      <div class="card" style="padding:14px 16px;display:flex;flex-direction:column;gap:6px"><span class="lbl">Notable players</span><span style="font-size:13px;line-height:1.5;color:#DCDAF0">${H.players.join(' · ')}</span></div>`;
    // MLS-style hero: the league's own banner for the club (crest and mascot on its pattern), full-bleed;
    // Tanjong Pagar has no banner, so its mascot stands on its colour. No stock photos.
    const BANNER = ['BKF', 'GEY', 'HGU', 'JUR', 'LCS', 'TAM', 'YLS'];
    const bg = BANNER.includes(k) ? `background-image:url(assets/banners/${k}.png)${k === 'GEY' ? ';background-size:auto 124%;background-position:82% 0' : ''}` : `background:${c.c} url(assets/mascots/${k}.png) right -20px bottom 60px/300px auto no-repeat`;
    const muted = P.mute && P.mute[k], r0 = table().find(x => x.code === k), ord = n => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
    const ico = (path, extra) => `<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${path}"/>${extra || ''}</svg>`;
    return `<div class="chero" style="${bg}">
        <div class="ch-top"><button class="back" data-go="clubs" aria-label="Back" style="margin-left:0">${ICON.back}</button><span style="display:flex">${next[0] ? `<a class="ic" href="${ics(SPL.matches[next[0].id])}" download="${k.toLowerCase()}-next.ics" aria-label="Add the next match to your calendar">${ico('M3 5h18v16H3zM3 10h18M8 3v4M16 3v4')}</a>` : ''}<button class="ic" data-bell="${k}" aria-label="${muted ? 'Turn on' : 'Turn off'} ${c.short} alerts">${ico('M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0', muted ? '<path d="M3 3l18 18"/>' : '')}</button></span></div>
        <div class="ch-foot">${crest(k, 64)}<span class="d" style="font-size:40px;line-height:.92">${c.name}</span><span class="lbl">${c.nick} · ${ord(r0.pos)} · ${r0.pts} pts${muted ? ' · alerts off' : ''}</span><button class="btn2 ch-follow" data-follow="${k}">${following ? '✓ Following' : '+ Follow club'}</button></div></div>
      <div class="tabs">${[['latest', 'Latest'], ['fixtures', 'Fixtures'], ['tickets', 'Tickets'], ['squad', 'Squad'], ['history', 'History']].map(([t, l]) => `<button class="stab ${S.ctab === t ? 'on' : ''}" data-ctab="${t}">${l}</button>`).join('')}</div>${body}`;
  }

  // the clubs' own player photos, cut out (Sailors so far, from the club's squad cards; supplied by the owner 4 Nov)
  const PHOTOS = { LCS: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 29, 30], TAM: [25], GEY: [18], JUR: [7] };
  const photoOf = (k, n) => PHOTOS[k] && PHOTOS[k].includes(+n) ? `assets/players/${k}/${+n}.png` : '';
  const POSN = { GK: 'Goalkeeper', DF: 'Defender', MF: 'Midfielder', FW: 'Forward' };
  function player() {
    const f = findPlayer(S.player), gl = goalsFor(S.player), as = SPL.assists.find(a => a[0] === S.player);
    const team = f ? f.team : (SPL.scorers.find(a => a[0] === S.player) || ['', 'LCS'])[1], c = C[team];
    const nA = as ? as[2] : 0;
    return `<button class="back" data-go="${S.pfrom || 'stats'}" aria-label="Back">${ICON.back}</button>
      ${(ph => ph ? `<div class="phero" style="border-top:3px solid ${c.c}"><img src="${ph}" alt=""><div class="ph-t"><span class="lbl">${c.short} · ${POSN[f.p[2]] || f.p[2]}</span><span class="d mono" style="font-size:72px;line-height:.85;color:var(--accent,#fff)">${String(f.p[0]).padStart(2, '0')}</span><span class="d" style="font-size:${Math.max(...S.player.split(' ').map(w => w.length)) >= 7 || S.player.length > 15 ? 22 : 28}px;line-height:.95">${S.player.split(' ')[0]}<br><span style="font-weight:600">${S.player.split(' ').slice(1).join(' ')}</span></span>${f.p[3] ? `<span style="font-size:12px;color:#DCDAF0">${f.p[3]}</span>` : ''}</div></div>` : '')(f && photoOf(f.team, f.p[0]))}
      ${f && photoOf(f.team, f.p[0]) ? '' : `<div class="card" style="padding:22px 20px;display:flex;flex-direction:column;gap:12px;border-top:3px solid ${c.c}"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div style="display:flex;flex-direction:column;gap:6px"><span class="lbl">${c.short} · ${f ? f.p[2] : ''}</span><span class="d" style="font-size:30px;line-height:.95">${S.player}</span><span style="font-size:12px;color:#DCDAF0">${f ? (f.p[3] || '') : ''}</span></div><span class="d mono" style="font-size:64px;line-height:.8;color:rgba(255,255,255,.35)">${f ? f.p[0] : ''}</span></div></div>`}
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">${[[gl.length, 'Goals'], [nA, 'Assists'], [gl.length + nA, 'G + A'], ['—', 'Apps'], ['—', 'Minutes'], ['—', 'Cards']].map(([n, l]) => `<div class="card" style="padding:14px;text-align:center"><span class="d mono" style="font-size:28px;${n === '—' ? 'color:var(--dim)' : ''}">${n}</span><div class="lbl">${l}</div></div>`).join('')}</div>
      <span style="font-size:11px;color:var(--muted);margin-top:-10px">Goals and assists from spl.sg. Appearances, minutes and cards fill in from the match feed.</span>
      <div class="card" style="padding:6px 16px"><div class="lbl" style="padding:10px 0 2px 0">Goals this season</div>${gl.length ? gl.map(g => `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line2);font-size:13px"><span>${g.label}</span><span class="d mono" style="color:var(--muted)">${g.min}'</span></div>`).join('') : '<div style="padding:10px 0 14px 0;font-size:13px;color:var(--muted)">No goals yet in 2026/27.</div>'}</div>
      ${career(S.player, c)}`;
  }
  function career(name, c) {
    const cr = SPL.careers[name];
    if (!cr) return `<div class="card" style="padding:14px 16px;display:flex;flex-direction:column;gap:6px"><span class="lbl">Career</span><span style="font-size:13px;color:var(--muted)">Club history arrives with the player archive import.</span></div>`;
    const [main, intl] = cr.career.split(/\.\s(?=[A-Z][a-z]+:)/);
    const stints = main.split('; ').map(s => { const k = s.search(/\b(?:Jan |Feb |Mar |Apr |May |Jun |Jul |Aug |Sep |Oct |Nov |Dec )?(?:19|20)\d\d/); return k > 0 ? [s.slice(0, k).trim(), s.slice(k).trim()] : [s, '']; });
    return `<div class="card" style="padding:6px 16px"><div class="lbl" style="padding:10px 0 2px 0;display:flex;justify-content:space-between"><span>Career</span>${cr.dob ? `<span>Age ${age(cr.dob)}</span>` : ''}</div>
      ${stints.reverse().map(([club, yrs], j) => `<div style="display:grid;grid-template-columns:12px 1fr;gap:12px;padding:10px 0;border-bottom:1px solid var(--line2)"><span style="width:6px;height:6px;margin-top:6px;background:${j === 0 ? c.c : 'rgba(255,255,255,.3)'};${j === 0 ? 'outline:1px solid #fff;outline-offset:1px' : ''}"></span><span style="display:flex;flex-direction:column;gap:2px"><span style="font-size:13px;font-weight:${j === 0 ? 700 : 500}">${club}</span>${yrs ? `<span class="mono" style="font-size:11px;color:var(--muted);line-height:1.4">${yrs}</span>` : ''}</span></div>`).join('')}
      ${intl ? `<div style="padding:12px 0;font-size:12px;color:#DCDAF0">${intl.replace(/\.$/, '')}</div>` : ''}</div>`;
  }

  // Step 2: one club at a time, big crest, arrows or swipe, crest strip below (after the X-League app's Clubs tab)
  const PICK_ORDER = () => table().map(r => r.code);
  function pickStep() {
    const order = PICK_ORDER(); if (!S.pick) S.pick = order[0];
    const k = S.pick, c = C[k], j = order.indexOf(k), r = table().find(x => x.code === k);
    const ord = n => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
    const slide = S.pickDir ? (S.pickDir > 0 ? 'pk-in-r' : 'pk-in-l') : '';
    const arrow = (d, path, lab) => `<button class="pk-arrow" data-pnav="${d}" aria-label="${lab}"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="#E8363D"><path d="${path}"/></svg></button>`;
    return `<div style="display:flex;flex-direction:column;gap:4px;padding-top:24px"><span class="lbl">Step 2 of 2</span><span class="d" style="font-size:26px;line-height:.95">Who do you support?</span></div>
      ${pickCore()}
      <div style="margin-top:auto;display:flex;flex-direction:column;gap:10px"><button class="btn" data-ob="done" style="width:100%;border-top:3px solid ${c.c}">Follow ${c.short}</button><button class="rowlink" data-ob="skip" style="text-align:center;padding:12px;color:var(--muted);font:600 13px 'Inter',sans-serif">Neutral — show me everything</button></div>`;
  }
  function pickCore() {
    const order = PICK_ORDER(); if (!S.pick) S.pick = order[0];
    const k = S.pick, c = C[k], r = table().find(x => x.code === k);
    const ord = n => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
    const slide = S.pickDir ? (S.pickDir > 0 ? 'pk-in-r' : 'pk-in-l') : '';
    const arrow = (d, path, lab) => `<button class="pk-arrow" data-pnav="${d}" aria-label="${lab}"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="#E8363D"><path d="${path}"/></svg></button>`;
    return `<div id="pickstage" class="${slide}" style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:6px 0 0 0;touch-action:pan-y">
        <span class="d" style="font-size:38px;line-height:.95;text-align:center;min-height:72px;display:flex;align-items:flex-end;justify-content:center">${c.name}</span>
        <span style="font-size:14px;color:var(--muted)">${c.nick} · ${ord(r.pos)} · ${r.pts} pts</span>
        <span style="display:flex;gap:5px">${dots(form(k), 12)}</span>
        <span style="display:grid;grid-template-columns:44px 1fr 44px;align-items:center;width:100%;margin:14px 0 6px 0">${arrow(-1, 'M16 4v16L6 12z', 'Previous club')}<span class="crest cr-${k}" role="img" aria-label="${c.name}" style="width:190px;height:190px;justify-self:center"></span>${arrow(1, 'M8 4v16l10-8z', 'Next club')}</span>
        <span class="lbl" style="text-align:center">${c.stadium} · est. ${(SPL.honours[k] && SPL.honours[k].founded) || c.founded}</span>
      </div>
      <div class="scroll pk-strip" id="pkstrip">${order.map(x => `<button data-pick="${x}" class="pk-c ${x === k ? 'on' : ''}" aria-label="${C[x].name}">${crest(x, x === k ? 54 : 40)}</button>`).join('')}</div>`;
  }

  const theme = () => (P.fav && P.settings.colours !== false) ? P.fav : '';
  // Following a club: the crest spins where it sits, the club's colour floods out from it, and the app
  // underneath is already dressed in the club's colours when the flood clears.
  function dressUp(k, fromTheme) {
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const src = app.querySelector('#pickstage .crest'), r = src ? src.getBoundingClientRect() : null;
    if (reduce || !k) return;
    const el = document.createElement('div'); el.id = 'ct'; el.setAttribute('data-club', k);
    el.style.setProperty('--cx', r ? (r.left + r.width / 2) + 'px' : '50%'); el.style.setProperty('--cy', r ? (r.top + r.height / 2) + 'px' : '46%');
    el.innerHTML = `<div class="ct-old" ${fromTheme ? `data-club="${fromTheme}"` : 'style="--g1:#0B0F2E;--g2:#1C1A4A;--g3:#3A2A78"'}></div><div class="ct-flood"></div><div class="ct-new"></div><span class="crest cr-${k} ct-c"></span><div class="ct-name"><span class="d" style="font-size:30px;line-height:1">${C[k].name}</span><span class="lbl" style="color:#fff">${C[k].nick}</span></div>`;
    const old = document.getElementById('ct'); if (old) old.remove();
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('ct-done'), 2500); setTimeout(() => el.remove(), 2900);
  }
  // ---------- sign-in, simulated: each provider's step drawn in the app's own style, then the club picker ----------
  const ME = { name: 'Hafiz Ishak', email: 'hafizishk@gmail.com', mobile: '[MOBILE]' };
  let authTimer = null;
  function authAfter(ms, step) { clearTimeout(authTimer); authTimer = setTimeout(() => { if (!S.auth) return; S.auth.step = step; if (step === 'busy') authAfter(1300, 'done'); else if (step === 'done') { const a = S.auth; setTimeout(() => { if (S.auth !== a) return; P.user = { name: a.via === 'apple' && !a.share ? 'Hafiz' : ME.name, email: a.via === 'apple' && !a.share ? '[RELAY]@privaterelay.appleid.com' : (a.email || ME.email), via: { signpass: 'Singpass', google: 'Google', apple: 'Apple' }[a.via] }; save(); SPLSTORE.track('signin', a.via); S.auth = null; S.ob = 1; S.pick = null; render(); }, 1100); } render(); }, ms); }
  const sheet = (title, body) => `<div class="auth"><div class="auth-sheet"><div style="display:flex;justify-content:space-between;align-items:center"><span class="lbl">Demo · ${title}</span><button class="ic" data-auth="close" aria-label="Cancel" style="margin-right:-12px">✕</button></div>${body}</div></div>`;
  const spinner = (label) => `<div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:26px 0 18px 0"><span class="auth-spin"></span><span style="font-size:14px;color:#DCDAF0">${label}</span></div>`;
  const doneMark = (who) => `<div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:22px 0 16px 0"><span class="auth-tick"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#0B0F2E" stroke-width="3"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span><span class="d" style="font-size:22px">You're in</span><span style="font-size:13px;color:var(--muted)">${who}</span></div>`;
  function authEl() {
    const a = S.auth; if (!a) return '';
    const initial = '<span class="auth-av">H</span>';
    if (a.via === 'google') {
      if (a.step === 'sheet') return sheet('the Google sign-in sheet opens here', `<span class="d" style="font-size:24px;line-height:1">Continue with Google</span><span style="font-size:13px;color:var(--muted)">to the SPL app</span>
        <button class="pl" data-auth="pick" style="gap:12px;padding:14px 0">${initial}<span style="flex:1;display:flex;flex-direction:column;gap:2px"><span style="font-size:14px;font-weight:600">${ME.name}</span><span style="font-size:12px;color:var(--muted)">${ME.email}</span></span><span class="lbl" style="color:#fff">Continue</span></button>
        <button class="pl" data-auth="other" style="padding:14px 0"><span style="flex:1;font-size:14px;color:#DCDAF0">Use another account</span></button>
        ${a.other ? `<div style="display:flex;gap:8px;padding-top:10px"><input class="search" id="authEmail" type="email" placeholder="Email address" style="flex:1"><button class="btn" data-auth="email">Next</button></div>` : ''}
        <span style="font-size:11px;color:var(--muted);line-height:1.5;padding-top:8px">Google shares your name, email address and profile picture with the SPL app.</span>`);
      return sheet('Google', a.step === 'busy' ? spinner('Signing you in…') : doneMark(a.email || ME.email));
    }
    if (a.via === 'apple') {
      if (a.step === 'sheet') return sheet('the Apple sign-in sheet opens here', `<span class="d" style="font-size:24px;line-height:1">Sign in with Apple</span><span style="font-size:13px;color:var(--muted)">Create an SPL account with your Apple ID</span>
        <div class="card" style="padding:4px 14px;margin-top:6px"><div class="pl" style="cursor:default;padding:12px 0"><span style="flex:1;font-size:13px;color:var(--muted)">Name</span><span style="font-size:14px;font-weight:600">${a.share ? ME.name : 'Hafiz'}</span></div>
          <button class="pl" data-auth="share" style="padding:12px 0"><span style="flex:1;display:flex;flex-direction:column;gap:2px"><span style="font-size:14px">Share my email</span><span style="font-size:11px;color:var(--muted)">${ME.email}</span></span><span class="lbl" style="color:${a.share ? '#3DD68C' : 'var(--dim)'}">${a.share ? 'Chosen' : ''}</span></button>
          <button class="pl" data-auth="hide" style="padding:12px 0"><span style="flex:1;display:flex;flex-direction:column;gap:2px"><span style="font-size:14px">Hide my email</span><span style="font-size:11px;color:var(--muted)">Apple forwards mail to you from a private address</span></span><span class="lbl" style="color:${!a.share ? '#3DD68C' : 'var(--dim)'}">${!a.share ? 'Chosen' : ''}</span></button></div>
        <button class="btn" data-auth="go" style="width:100%;margin-top:10px">Continue with Face ID</button>`);
      return sheet('Apple', a.step === 'busy' ? `<div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:22px 0 16px 0"><span class="auth-face"><svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6"><path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M9 9v1.5M15 9v1.5M12 9v4h-1M9.5 16c1.5 1 3.5 1 5 0"/></svg></span><span style="font-size:14px;color:#DCDAF0">Face ID</span></div>` : doneMark(a.share ? ME.email : 'Private relay address'));
    }
    // Singpass: approve in the Singpass app, then the details Singpass shares, shown as the SPL app's own consent step
    if (a.step === 'waiting') return sheet('Singpass opens here', `<span class="d" style="font-size:24px;line-height:1">Approve in Singpass</span><span style="font-size:13px;color:var(--muted);line-height:1.5">The Singpass app opens on this phone. Approve the login there and you come straight back.</span>${spinner('Waiting for your approval…')}`);
    if (a.step === 'consent') return sheet('details shared through Singpass', `<span class="d" style="font-size:24px;line-height:1">Singpass shares these with the SPL app</span>
      <div class="card" style="padding:4px 14px;margin-top:6px">${[['Name', ME.name], ['Email', ME.email], ['Mobile', ME.mobile]].map(([k, v]) => `<div class="pl" style="cursor:default;padding:12px 0"><span style="flex:1;font-size:13px;color:var(--muted)">${k}</span><span style="font-size:14px;font-weight:600">${v}</span></div>`).join('')}</div>
      <span style="font-size:11px;color:var(--muted);line-height:1.5">Used for your account and ticket purchases only. FAS needs to register the app with Singpass for the real step.</span>
      <button class="btn" data-auth="go" style="width:100%;margin-top:6px">Agree and continue</button>`);
    return sheet('Singpass', a.step === 'busy' ? spinner('Setting up your account…') : doneMark(ME.name));
  }

  function pickBy(n) { const o = PICK_ORDER(), j = o.indexOf(S.pick || o[0]); S.pick = o[(j + n + o.length) % o.length]; S.pickDir = n; S.keepScroll = true; render(); }
  function onboard() {
    const steps = [
      `<div style="display:flex;flex-direction:column;gap:18px;padding-top:40px"><span class="spl-h" role="img" aria-label="Singapore Premier League" style="width:160px;height:60px;margin-left:-8px"></span><span class="d" style="font-size:34px;line-height:.95">Every match.<br>Every club.<br>In your pocket.</span><span style="font-size:14px;line-height:1.5;color:#DCDAF0">Fixtures, live scores, the table, tickets and highlights for the AIA Singapore Premier League.</span></div>
       <div style="margin-top:auto;display:flex;flex-direction:column;gap:10px"><button class="btn" data-ob="google" style="width:100%;gap:12px"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>Continue with Google</button><button class="btn2" data-ob="apple" style="width:100%;gap:12px"><svg aria-hidden="true" width="18" height="21" viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>Continue with Apple</button><button class="rowlink" data-ob="guest" style="text-align:center;padding:12px;color:var(--muted);font:600 13px 'Inter',sans-serif">Just browse for now</button><span style="font-size:11px;color:var(--muted);text-align:center;line-height:1.5">By continuing you agree to FAS's terms and privacy notice. Sign-in is simulated in this demo; the real build uses each provider's own screen.</span></div>`,
      pickStep()
    ];
    return steps[S.ob];
  }

  function search() {
    const q = S.sq.trim().toLowerCase();
    const hit = s => s.toLowerCase().includes(q);
    const clubs = q ? Object.keys(C).filter(k => hit(C[k].name) || hit(C[k].nick) || hit(k)) : [];
    const players = []; if (q) Object.keys(SPL.squads).forEach(k => SPL.squads[k].forEach(p => { if (hit(p[1])) players.push({ k, p }); }));
    const fixtures = q ? rows().filter(r => hit(r.hname) || hit(r.aname) || hit(r.venue) || hit('mw' + r.mw) || hit('matchweek ' + r.mw)) : [];
    const news = q ? NEWS_().filter(n => hit(n.title) || hit(n.dek)) : [];
    const sec = (l, h) => h ? `<div style="display:flex;flex-direction:column;gap:8px"><span class="lbl">${l}</span>${h}</div>` : '';
    return `<div style="display:flex;align-items:center;gap:6px"><button class="back" data-go="home" aria-label="Back">${ICON.back}</button><input class="search" id="sq" type="search" placeholder="Clubs, players, fixtures, news" value="${S.sq.replace(/"/g, '&quot;')}" style="flex:1"></div>
      ${!q ? `<div style="display:flex;flex-direction:column;gap:10px"><span class="lbl">Try</span><div style="display:flex;flex-wrap:wrap;gap:8px">${['Honda', 'Eastern Derby', 'Bishan', 'MW7', 'Sailors', 'Higashikawa'].map(t => `<button class="btn2" data-sq="${t}" style="min-height:40px;font-size:12px">${t}</button>`).join('')}</div></div>` : ''}
      ${sec('Clubs', clubs.map(k => `<button class="pl" data-club="${k}">${crest(k, 30)}<span style="flex:1;font-size:14px;font-weight:600">${C[k].name}</span><span class="lbl">${posText(k)}</span></button>`).join(''))}
      ${sec('Players', players.slice(0, 12).map(({ k, p }) => `<button class="pl" data-player="${p[1]}">${crest(k, 30)}<span style="flex:1;display:flex;flex-direction:column"><span style="font-size:14px;font-weight:600">${p[1]}</span><span style="font-size:11px;color:var(--muted)">${C[k].short} · ${p[2]}</span></span><span class="d mono" style="font-size:18px;color:var(--muted)">${p[0]}</span></button>`).join(''))}
      ${sec('Fixtures', fixtures.slice(0, 8).length ? `<div class="card" style="padding:0 4px">${fixtures.slice(0, 8).map(fixRow).join('')}</div>` : '')}
      ${sec('News', news.map(n => newsRow(n, false)).join(''))}
      ${q && !clubs.length && !players.length && !fixtures.length && !news.length ? `<span style="font-size:13px;color:var(--muted)">Nothing for "${S.sq}".</span>` : ''}`;
  }

  function settings() {
    const st = P.settings, fav = favC();
    const toggle = (group, key, label, sub) => `<button class="pl" data-toggle="${group}.${key}" style="gap:14px"><span style="flex:1;display:flex;flex-direction:column;gap:2px"><span style="font-size:14px;font-weight:500">${label}</span>${sub ? `<span style="font-size:11px;color:var(--muted)">${sub}</span>` : ''}</span><span class="lbl" style="color:${st[group][key] ? '#3DD68C' : 'var(--dim)'}">${st[group][key] ? 'On' : 'Off'}</span></button>`;
    return `<div style="display:flex;align-items:center;gap:6px"><button class="back" data-go="home" aria-label="Back">${ICON.back}</button><span class="d" style="font-size:22px">Settings</span></div>
      <div class="card" style="padding:16px;display:flex;align-items:center;gap:12px">${fav ? crest(P.fav, 40) : '<span class="crest" style="width:40px;height:40px;border:1px dashed rgba(255,255,255,.3)"></span>'}<span style="flex:1;display:flex;flex-direction:column;gap:2px"><span style="font-size:14px;font-weight:600">${P.user ? E(P.user.name) : 'Browsing as guest'}</span>${P.user && P.user.email ? `<span style="font-size:12px;color:var(--muted)">${E(P.user.email)}</span>` : ''}<span class="lbl">${fav ? 'Supports ' + fav.short : 'No club picked'} · ${P.user ? 'signed in with ' + E(P.user.via) : 'sign in to sync'}</span></span><button class="btn2" data-go="onboard-club" style="min-height:40px;font-size:12px">Change club</button></div>
      <div class="card" style="padding:6px 16px"><div class="lbl" style="padding:10px 0 2px 0">Notifications${fav ? ' · ' + fav.short + ' first' : ''}</div>${toggle('push', 'goals', 'Goals', fav ? fav.short + ' goals as they go in; other clubs at full time' : 'As they go in')}${toggle('push', 'kickoff', 'Kick-off', 'An hour before, and at kick-off')}${toggle('push', 'results', 'Full-time results')}${toggle('push', 'news', 'News and announcements')}${toggle('push', 'tickets', 'Tickets on sale', 'When your club\'s next home game goes on sale')}</div>
      <div class="card" style="padding:6px 16px"><div class="lbl" style="padding:10px 0 2px 0">Competitions</div>${toggle('comps', 'spl', 'AIA Singapore Premier League')}${toggle('comps', 'spl2', 'SPL2')}${toggle('comps', 'cup', 'Singapore Cup')}${toggle('comps', 'afc', 'AFC Champions League Two', 'Sailors and Tampines')}${toggle('comps', 'wpl', 'Women\'s Premier League')}</div>
      <div class="card" style="padding:6px 16px"><div class="lbl" style="padding:10px 0 2px 0">App</div><button class="pl" data-appearance="1" style="gap:14px"><span style="flex:1;display:flex;flex-direction:column;gap:2px"><span style="font-size:14px;font-weight:500">Appearance</span><span style="font-size:11px;color:var(--muted)">Light pages with frosted panels, or the dark SPL navy</span></span><span class="lbl" style="color:var(--ink)">${P.settings.look === 'light' ? 'Light' : 'Dark'}</span></button><button class="pl" data-colours="1" style="gap:14px"><span style="flex:1;display:flex;flex-direction:column;gap:2px"><span style="font-size:14px;font-weight:500">Club colours</span><span style="font-size:11px;color:var(--muted)">${fav ? 'The app in ' + fav.short + ' colours' : 'Pick a club to dress the app in its colours'}</span></span><span class="lbl" style="color:${P.settings.colours !== false && fav ? '#3DD68C' : 'var(--dim)'}">${P.settings.colours !== false && fav ? 'On' : 'Off'}</span></button><button class="pl" data-lang="1" style="gap:14px"><span style="flex:1;font-size:14px;font-weight:500">Language</span><span class="lbl" style="color:#fff">${{ en: 'English', ms: 'Bahasa Melayu', zh: '中文', ta: 'தமிழ்' }[st.lang]}</span></button><button class="pl" data-toggle="data.saver" style="gap:14px"><span style="flex:1;display:flex;flex-direction:column;gap:2px"><span style="font-size:14px;font-weight:500">Data saver</span><span style="font-size:11px;color:var(--muted)">No autoplay, smaller images — for stadium Wi-Fi</span></span><span class="lbl" style="color:${st.data ? '#3DD68C' : 'var(--dim)'}">${st.data ? 'On' : 'Off'}</span></button></div>
      <div class="card" style="padding:6px 16px"><div class="lbl" style="padding:10px 0 2px 0">Demo</div><button class="pl" data-sim="start" style="gap:14px"><span style="flex:1;display:flex;flex-direction:column;gap:2px"><span style="font-size:14px;font-weight:500">${S.sim ? 'Restart the replay' : 'Replay Sunday\'s matches live'}</span><span style="font-size:11px;color:var(--muted)">Tampines 0–0 Geylang and Balestier 0–4 Sailors, played back as a live feed, a minute every two seconds: scores, line-ups, stats, the live table and goal alerts. Real results and Sailors goals; line-ups and stats reconstructed.</span></span><span class="lbl" style="color:#FF6B71">${S.sim ? 'Running' : 'Start'}</span></button></div>
      <div class="card" style="padding:6px 16px"><button class="pl"><span style="flex:1;font-size:14px;font-weight:500">Terms · Privacy · Licences</span></button><button class="pl" data-signout="1"><span style="flex:1;font-size:14px;font-weight:500;color:#FF9AA0">${P.user ? 'Sign out' : 'Reset demo'}</span></button></div>
      <span style="font-size:11px;color:var(--muted);text-align:center">SPL app · demo build · Stackform Studios</span>`;
  }

  function gotm() {
    const G0 = GOTM_(), V = S.vsim && S.vsim.key === 'gotm' ? S.vsim : null, voted = P.votes[G0.month];
    const tally = {}; G0.goals.forEach(g => { tally[g.id] = +(G0.base[g.id] || 0) + (voted === g.id ? 1 : 0) + (V ? V.add[g.id] : 0); });
    const G = V && V.done ? Object.assign({}, G0, { winner: G0.goals.slice().sort((a, b) => tally[b.id] - tally[a.id])[0].id, open: false }) : G0, win = G.winner, show = voted || win || !G.open || !!V;
    const total = Object.values(tally).reduce((a, b) => a + b, 0) || 1;
    const sorted = G.goals.slice().sort((a, b) => win ? (b.id === win) - (a.id === win) : tally[b.id] - tally[a.id]);
    return `<div style="display:flex;align-items:center;gap:6px"><button class="back" data-go="awards" aria-label="Back">${ICON.back}</button><span class="d" style="font-size:22px">Goal of the Month</span></div>
      <div style="display:flex;justify-content:space-between;align-items:center" class="lbl">${presented('gotm')}<span>${win ? 'Result published' : !G.open ? 'Voting closed' : 'Voting closes ' + fmtDate(G.closes)}</span></div>${simBar('gotm')}
      ${(show ? sorted : G.goals).map((g, i) => { const pct = Math.round(100 * tally[g.id] / total), mine = voted === g.id, top = win ? g.id === win : i === 0; return `<button class="card" data-vote="${E(g.id)}" style="padding:16px;display:flex;flex-direction:column;gap:10px;cursor:pointer;text-align:left;color:var(--ink);width:100%;border-top:3px solid ${top && show ? '#C9A227' : mine ? 'rgba(255,255,255,.4)' : 'transparent'}" ${show ? 'disabled' : ''}>
        ${win && g.id === win ? '<span class="lbl" style="color:#C9A227">Winner</span>' : ''}
        <div style="display:flex;align-items:center;gap:12px">${crest(g.team, 34)}<span style="flex:1;display:flex;flex-direction:column;gap:2px"><span class="d" style="font-size:16px;line-height:1">${E(g.player)}</span><span class="lbl">${E(g.match)} · ${E(g.min)}</span></span>${show ? `<span class="d mono" style="font-size:26px;color:${top ? '#C9A227' : 'var(--ink)'}">${pct}%</span>` : `<span class="lbl" style="color:#fff">Vote</span>`}</div>
        <span style="font-size:12px;line-height:1.45;color:#DCDAF0">${E(g.how)}</span>
        ${show ? `<div style="height:3px;background:rgba(255,255,255,.1)"><div style="height:3px;width:${pct}%;background:${top ? '#C9A227' : 'rgba(255,255,255,.45)'}"></div></div>${mine ? '<span class="lbl" style="font-size:9px">Your vote</span>' : ''}` : (ytId(g.clip) ? `<span class="lbl" data-gclip="${E(g.id)}" role="button" style="font-size:9px;color:var(--accent,#FF9AA0)">▶ Watch the goal</span>` : `<span class="lbl" style="font-size:9px;color:var(--muted)">Clip coming</span>`)}</button>`; }).join('')}
      <div class="card" style="padding:6px 16px"><div class="lbl" style="padding:10px 0 2px 0">Previous winners</div>${G.previous.map(w => `<div class="pl" style="cursor:default">${C[w.team] ? crest(w.team, 30) : ''}<span style="flex:1;display:flex;flex-direction:column"><span style="font-size:14px;font-weight:600">${E(w.player)}</span><span style="font-size:11px;color:var(--muted)">${E(w.match)}</span></span><span class="lbl">${E(w.month)}</span></div>`).join('')}</div>
      <span style="font-size:11px;color:var(--muted)">One vote per signed-in fan. The shortlist is the league's; the percentages in this demo are placeholders.</span>`;
  }

  // Player of the Month, October 2026: the shortlist is October's top scorers, counted from the results (data.js).
  // Vote counts are the demo's placeholders, and say so on screen.
  const PMONTH0 = { month: 'October', closes: '2026-11-09', key: 'potm:October', list: [
    { id: 'p1', name: 'Hide Higashikawa', team: 'TAM', n: 25, line: '4 goals', how: "Tanjong Pagar 0–4 Tampines 63'; Tampines 4–1 Young Lions 73', 90+7'; Jurong 2–3 Tampines 41'" },
    { id: 'p2', name: 'Matthias Phaeton', team: 'LCS', n: 23, line: '3 goals', how: "Sailors 6–1 Young Lions 74', 83'; Sailors 6–0 Tanjong Pagar 60'" },
    { id: 'p3', name: 'Hugo Gomes', team: 'LCS', n: 3, line: '2 goals', how: "Sailors 6–1 Young Lions 37'; Sailors 6–0 Tanjong Pagar 37'" },
    { id: 'p4', name: 'Giovanni Haag', team: 'LCS', n: 24, line: '2 goals', how: "Jurong 0–2 Sailors 41'; Sailors 6–0 Tanjong Pagar 87'" },
    { id: 'p5', name: 'Yang Hyeonju', team: 'GEY', n: 18, line: '2 goals', how: "Geylang 3–0 Hougang 45+2', 90+1'" }
  ], base: { p1: 1840, p2: 1312, p3: 655, p4: 590, p5: 702 } };
  // the month the office runs from the admin's Awards page (store.potm); the built-in October list if there is none
  let PMONTH = PMONTH0;
  const potmSync = () => { const M = STORE.potm; PMONTH = M && M.list && M.list.length ? Object.assign({}, M, { key: 'potm:' + M.month, base: Object.assign({}, M.base) }) : PMONTH0; };
  potmSync();
  // the vote, simulated: fans' votes arrive for a few seconds, voting closes, the winner is revealed
  let vsimTimer = null;
  function vsimStart(key) {
    clearInterval(vsimTimer);
    const ids = key === 'gotm' ? GOTM_().goals.map(g => g.id) : PMONTH.list.map(x => x.id);
    const w = ids.map((_, i) => 1 / (i + 1.6) + Math.random() * .35);
    S.vsim = { key, add: {}, t: 0, done: false }; ids.forEach(id => { S.vsim.add[id] = 0; });
    vsimTimer = setInterval(() => { const V = S.vsim; if (!V) return clearInterval(vsimTimer);
      V.t++; ids.forEach((id, i) => { V.add[id] += Math.round(w[i] * (60 + Math.random() * 90)); });
      if (V.t >= 24) { V.done = true; clearInterval(vsimTimer); }
      if (['gotm', 'pmonth'].includes(S.view)) { S.keepScroll = true; render(); } }, 250);
  }
  const simBar = key => { const V = S.vsim && S.vsim.key === key ? S.vsim : null;
    return `<div class="card" style="padding:12px 16px;display:flex;align-items:center;gap:12px;border-top:3px solid var(--red)"><span style="flex:1;display:flex;flex-direction:column;gap:2px"><span class="lbl" style="color:#FF6B71">${V ? (V.done ? 'Demo · voting closed' : '<span class="dot pulse" style="background:#E8363D;margin-right:6px"></span>Demo · votes coming in') : 'Demo'}</span><span style="font-size:12px;color:#DCDAF0">${V ? (V.done ? 'The winner is announced in the app, with an alert to every fan.' : 'Fans voting across the league, sped up.') : 'Play the vote from open to result.'}</span></span><button class="btn2" data-vsim="${key}" style="min-height:38px">${V ? 'Run again' : 'Simulate the vote'}</button></div>`; };

  // ---------- the monthly awards (Hafiz, 5 Nov): PL-style flow, named for partners ----------
  // Partners are the proposal FAS takes to Dongfeng and MSIG (both official SPL partners), not signed deals.
  const AWARD_PARTNER = { pmonth: ['Dongfeng', 'assets/partners/colour/dongfeng.png', 18], gotm: ['MSIG', 'assets/partners/colour/msig.png', 24] };
  const presented = k => { const p = AWARD_PARTNER[k]; return `<span class="awp"><span>Presented by</span><img src="${p[1]}" alt="${p[0]}" style="height:${p[2]}px"></span>`; };
  // one player's month, from SPL.matches: goals in the month, season goals, the club's record and goals
  function monthOf(name, k, ym) {
    const clean = g => g.replace(' (pen)', ''), ms = SPL.matches.filter(m => m[1].startsWith(ym) && m[4]);
    let g = 0; ms.forEach(m => (m[6] || []).forEach(x => { if (clean(x[0]) === name) g++; }));
    const r = { p: 0, w: 0, d: 0, l: 0, f: 0, a: 0, cs: 0 }; ms.forEach(m => { if (m[2] !== k && m[3] !== k) return; const h = m[2] === k, f = m[4][h ? 0 : 1], a = m[4][h ? 1 : 0]; r.p++; if (f > a) r.w++; else if (f === a) r.d++; else r.l++; r.f += f; r.a += a; if (!a) r.cs++; });
    const season = ((SPL.scorers.find(x => x[0] === name) || [])[2]) || 0;
    return { g, season, r };
  }
  const surname = n => /^(Yang|Kim|Lee|Park|Song|Cho) /.test(n) ? n.split(' ')[0] : n.split(' ').slice(-1)[0];
  const shirtOf = (k, name) => { const p = (SPL.squads[k] || []).find(x => x[1] === name || x[1].replace('ë', 'e') === name); return p ? p[0] : null; };
  const nice = n => n.replace('Phaeton', 'Phaëton');
  // the shortlist graphic: title across the top, partner, five cards with head and shoulders
  const shortCard = (k, no, name) => { const ph = no ? photoOf(k, no) : '', sur = surname(nice(name)), first = nice(name).split(' ').filter(p => p !== sur).join(' ');
    return `<span class="swc" style="background:linear-gradient(165deg,${C[k].c} 0%,${C[k].c} 45%,#0B0F2E 130%)">${ph ? `<img src="${ph}" alt="">` : `<span class="swn">${no || ''}</span>`}${crest(k, 15)}<span class="swl"><span>${first}</span><b style="font-size:${sur.length > 9 ? 6.6 : sur.length > 7 ? 7.6 : 8.5}px">${sur}</b></span></span>`; };
  const shortPanel = (key, title, color, list) => `<div class="swp"><span class="swg"></span><span class="swb" style="background:${color}"></span>
      <div class="swh"><span class="d" style="color:${color}">${title}</span><span class="swm" style="background:${color}">${PMONTH.month}</span></div>
      <div class="swh" style="margin-top:-4px">${presented(key)}</div>
      <div class="swr">${list.map(([k, no, n]) => shortCard(k, no, n)).join('')}</div></div>`;
  const awardsGraphic = () => shortPanel('pmonth', 'Player of the Month', '#E8363D', PMONTH.list.map(x => [x.team, x.n, x.name])) +
    shortPanel('gotm', 'Goal of the Month', '#1E9E5A', GOTM_().goals.slice(0, 5).map(g => [g.team, shirtOf(g.team, g.player), g.player]));
  function awards() {
    const G = GOTM_(), card = (go, t, sub, which) => `<button class="card rowlink awc" data-go="${go}"><span style="flex:1;display:flex;flex-direction:column;gap:4px"><span style="font:700 17px/1.25 Inter">${t}</span><span class="lbl">${sub}</span></span><span style="width:110px;height:52px;flex:none;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;padding:6px;box-sizing:border-box">${which}</span></button>`;
    return `<div style="display:flex;align-items:center;gap:6px"><button class="back" data-go="home" aria-label="Back">${ICON.back}</button><span class="lbl">Awards</span></div>
      <span class="d" style="font-size:34px;line-height:.92">Vote for ${PMONTH.month}'s SPL award winners</span>
      ${awardsGraphic()}
      <span style="font-size:15px;line-height:1.5;color:#DCDAF0">The shortlists for ${PMONTH.month}'s Dongfeng Player of the Month and MSIG Goal of the Month are out. Your votes decide who wins. Voting closes ${fmtDate(PMONTH.closes)}.</span>
      ${card('pmonth', 'Pick your Dongfeng Player of the Month', P.votes[PMONTH.key] ? 'Awards · you voted' : 'Awards · 5 nominees', `<img src="${AWARD_PARTNER.pmonth[1]}" alt="Dongfeng" style="max-width:96px;max-height:36px">`)}
      ${card('gotm', 'Choose your MSIG Goal of the Month', P.votes[G.month] ? 'Awards · you voted' : `Awards · ${G.goals.length} goals`, `<img src="${AWARD_PARTNER.gotm[1]}" alt="MSIG" style="height:38px">`)}
      <span style="font-size:11px;color:var(--muted)">One vote per award, per signed-in fan. The winners are announced in the app the week after.</span>`;
  }
  function pmonth() {
    const M = PMONTH, mine = P.votes[M.key], V = S.vsim && S.vsim.key === 'pmonth' ? S.vsim : null, show = !!(mine || V || M.winner || M.open === false);
    const tally = {}; M.list.forEach(x => { tally[x.id] = (+M.base[x.id] || 0) + (mine === x.id ? 1 : 0) + (V ? V.add[x.id] : 0); });
    const total = Object.values(tally).reduce((a, b) => a + b, 0) || 1, lead = M.list.slice().sort((a, b) => tally[b.id] - tally[a.id])[0], win = V && V.done ? lead : (M.winner && M.list.find(x => x.id === M.winner)) || null;
    const order = show ? M.list.slice().sort((a, b) => tally[b.id] - tally[a.id]) : M.list;
    const pic = (x, h) => photoOf(x.team, x.n) ? `<img src="${photoOf(x.team, x.n)}" alt="" style="height:${h}px;width:auto;display:block">` : crest(x.team, Math.round(h * .55));
    return `<div style="display:flex;align-items:center;gap:6px"><button class="back" data-go="awards" aria-label="Back">${ICON.back}</button><span class="d" style="font-size:22px">Player of the Month</span></div>
      <div style="display:flex;justify-content:space-between;align-items:center" class="lbl">${presented('pmonth')}<span>${win ? 'Result' : 'Voting closes ' + fmtDate(M.closes)}</span></div>
      ${simBar('pmonth')}
      ${win ? `<div class="card" style="position:relative;overflow:hidden;min-height:300px;padding:20px;border-top:3px solid #C9A227;display:flex;flex-direction:column;justify-content:flex-end;gap:6px"><span style="position:absolute;right:-20px;bottom:0">${pic(win, 290)}</span><span style="position:relative;z-index:1;display:flex;flex-direction:column;gap:6px;max-width:58%;text-shadow:0 2px 10px rgba(0,0,0,.5)"><span class="lbl" style="color:#C9A227">Player of the Month · ${M.month}</span><span class="d" style="font-size:20px;line-height:1">${win.name.split(' ')[0]}</span><span class="d" style="font-size:40px;line-height:.9">${win.name.split(' ').slice(1).join(' ')}</span><span class="lbl" style="display:flex;align-items:center;gap:6px">${crest(win.team, 16)}${C[win.team].short} · ${win.line}</span><span class="d mono" style="font-size:30px;color:#C9A227">${Math.round(100 * tally[win.id] / total)}%<span class="lbl" style="margin-left:8px;font-style:normal">of the vote</span></span></span></div>` : ''}
      ${order.map((x, i) => { const pct = Math.round(100 * tally[x.id] / total), top = show && i === 0, me = mine === x.id, o = monthOf(x.name, x.team, M.mkey || '2026-10'), sh = C[x.team].short, ph = photoOf(x.team, x.n), pos = ((SPL.squads[x.team].find(p => p[0] === x.n) || [])[2]) || 'FW';
        return `<button class="card vcd" data-pvote="${x.id}" style="border-top:3px solid ${top ? '#C9A227' : me ? 'rgba(255,255,255,.5)' : 'transparent'}" ${show ? 'disabled' : ''}>
          <span class="vph" style="background:linear-gradient(170deg,${C[x.team].c} -20%,rgba(13,16,48,.2) 80%)">${crest(x.team, 26)}<span class="vpos">${{ FW: 'ST', DF: 'CB', MF: 'CM', GK: 'GK' }[pos] || pos}</span>${ph ? `<img src="${ph}" alt="">` : `<span class="swn" style="font-size:72px;top:30px">${x.n || ''}</span>`}<span class="vnm">${nice(x.name)}<small>${C[x.team].name}</small></span></span>
          <span class="vst">${[['Goals in ' + PMONTH.month, o.g], ['Season goals', o.season], [sh + ' record', `${o.r.w}-${o.r.d}-${o.r.l}`], [sh + ' goals for', o.r.f], ['Clean sheets', o.r.cs]].map(([l, v]) => `<span><span>${l}</span><b>${v}</b></span>`).join('')}
            ${show ? `<span class="vbar"><span style="width:${pct}%;background:${top ? '#C9A227' : 'rgba(255,255,255,.55)'}"></span></span><span class="lbl" style="text-align:right;color:${top ? '#C9A227' : 'var(--ink)'}">${pct}%${me ? ' · your vote' : ''}</span>` : '<span class="vgo">Vote now</span>'}</span></button>`; }).join('')}
      <span style="font-size:11px;color:var(--muted)">One vote per signed-in fan. Shortlist: October's top scorers from the results. Percentages in this demo are placeholders.</span>`;
  }

  // Prices are the Community Shield's (spl.sg / Trip.com, 6 Sep 2026); league prices to be confirmed by FAS.
  const TIX = [['gs-a', 'Grandstand', 'Adult', 15], ['gs-c', 'Grandstand', 'Concession · 3–12, 60+', 5], ['ga-a', 'Gallery · neutral zone', 'Adult', 10], ['ga-c', 'Gallery · neutral zone', 'Concession · 3–12, 60+', 5]];
  const qrSvg = seed => { let s = 0; for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0; const n = 25, cell = []; const fin = (x, y) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { if (fin(x, y)) continue; s = (s * 1103515245 + 12345) >>> 0; if ((s >>> 16) & 1) cell.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`); }
    const f = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
    return `<svg viewBox="-2 -2 29 29" width="100%" height="100%" shape-rendering="crispEdges" style="background:#fff" aria-label="Ticket code"><g fill="#0B0F2E">${cell.join('')}${f(0, 0)}${f(n - 7, 0)}${f(0, n - 7)}</g></svg>`; };
  // Tickets are sold on Trip.com, the league's ticketing partner (spl.sg's own "Buy Tickets" link). The app hands off.
  const TRIP = 'https://sg.trip.com/sale/w/25538/singapore-premier-league-tickets.html?locale=en-SG';
  function tickets() {
    const T = S.tk, m = SPL.matches[T.match], r = mrow(m, T.match);
    return `<div style="display:flex;align-items:center;gap:6px"><button class="back" data-tkback="1" aria-label="Back">${ICON.back}</button><span class="d" style="font-size:22px">Tickets</span></div>
      <div class="card" style="padding:18px;display:flex;flex-direction:column;gap:14px;border-top:3px solid ${C[m[2]].c}">
        <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px"><div style="display:flex;flex-direction:column;align-items:center;gap:8px">${crest(m[2], 48)}<span class="d" style="font-size:14px">${r.hname}</span></div><span class="d" style="font-size:30px;color:rgba(255,255,255,.7)">VS</span><div style="display:flex;flex-direction:column;align-items:center;gap:8px">${crest(m[3], 48)}<span class="d" style="font-size:14px">${r.aname}</span></div></div>
        <span class="lbl" style="text-align:center">${r.when} · 7.30PM · ${r.venue}</span></div>
      <div class="card" style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <span class="lbl">Sold on Trip.com</span>
        <span style="font-size:14px;line-height:1.55;color:#DCDAF0">Tickets for every SPL match are sold on Trip.com, the league's ticketing partner. You pick your seats and pay there; your e-ticket comes from Trip.com.</span>
        <div style="display:flex;flex-direction:column">${TIX.map(t => `<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line2);font-size:13px"><span>${t[1]} · ${t[2].split(' ·')[0]}</span><span class="mono">S$${t[3]}</span></div>`).join('')}</div>
        <span style="font-size:11px;color:var(--muted);line-height:1.5">Prices are the Community Shield's (6 Sep 2026); this match's are on Trip.com. S$1 booking fee a ticket.</span>
      </div>
      <a class="btn" href="${TRIP}" target="_blank" rel="noopener" data-trip="${T.match}" style="width:100%;box-sizing:border-box">Buy on Trip.com ↗</a>
      <div style="display:flex;gap:10px"><a class="btn2" style="flex:1" href="${ics(m)}" download="spl-mw${m[0]}.ics">Add to calendar</a><button class="btn2" style="flex:1" data-remind="${T.match}">${P.reminders[T.match] ? 'Reminder set' : 'Remind me'}</button></div>`;
  }

  // ---------- shell ----------
  // Home · Season · Clubs (raised, centre; MLS) · Stats · Players. The raised button is square like every other button.
  const NAV = [['home', 'Home', ICON.home, ['home']], ['matches', 'Season', ICON.cal, ['matches', 'match', 'table']], ['clubs', 'Clubs', ICON.shield, ['clubs', 'club']], ['stats', 'Stats', ICON.bars, ['stats', 'player']], ['watch', 'Watch', ICON.tv, ['watch', 'video']]];
  const SCREEN = { awards, pmonth, watch, home, matches, match, table: tableScreen, stats, clubs, club, players: stats, player, onboard, search, settings, gotm, tickets, video, article };

  // ---------- the simulated feed's clock ----------
  const SEC_PER_MIN = 2; // one match minute every two seconds at 1×: a game in about three and a half minutes
  let timer = null, lastKey = '';
  const LIVE_VIEWS = ['home', 'matches', 'match', 'table', 'stats', 'club', 'settings'];
  // every alert the feed will raise between two points on the clock, scored as of that moment
  function alertsBetween(from, to) {
    const out = [], st = P.settings.push;
    LIVE_IDS.forEach(i => { const m = SPL.matches[i]; if (P.mute && (P.mute[m[2]] || P.mute[m[3]])) return; const fan = P.fav && (m[2] === P.fav || m[3] === P.fav);
      const scoreAt = t => { const sc = [0, 0]; EV[i].forEach(e => { const et = evT(i, e); if ((e[3] === 'G' && et <= t) || (e[3] === 'D' && et <= t && t < et + VARC)) sc[e[4] === m[2] ? 0 : 1]++; }); return sc; };
      if (from < 0 && to >= 0 && st.kickoff) out.push({ t: 0, i, k: m[2], title: `Kick-off! ⏱️ ${short(m[2])} v ${short(m[3])}`, body: `Live from ${m[5]}. Tap to follow every goal.` });
      EV[i].forEach(e => { const t = evT(i, e);
        // a goal VAR rules out: the goal alert when it goes in, the "no goal" alert when the check is done
        if (e[3] === 'D') { if (!st.goals) return; const tv = t + VARC;
          if (t > from && t <= to) { const sc = scoreAt(t); out.push({ t, i, k: e[4], title: `GOAL! ⚽ ${short(m[2])} ${sc[0]}–${sc[1]} ${short(m[3])}`, body: `${minLabel(e[1], e[2])} ${gname(e)}. Tap to follow it live.` }); }
          if (tv > from && tv <= to) { const s2 = scoreAt(tv); out.push({ t: tv, i, k: e[4], title: `NO GOAL ❌ ${short(m[2])} ${s2[0]}–${s2[1]} ${short(m[3])}`, body: `VAR rules out ${gname(e)}'s goal for ${e[9] || 'an infringement'}.` }); }
          return; }
        if (t <= from || t > to) return; const sc = scoreAt(t);
        if (e[3] === 'G' && st.goals) out.push({ t, i, k: e[4], title: `GOAL! ⚽ ${short(m[2])} ${sc[0]}–${sc[1]} ${short(m[3])}`, body: `${minLabel(e[1], e[2])} ${gname(e)}${e[7] === 'pen' ? ' (pen)' : ''}${fan && e[4] === P.fav ? ', for the ' + short(P.fav) + '! 🙌' : '. Tap to follow it live.'}` });
        if (e[3] === 'FT' && st.results) out.push({ t, i, k: m[2], title: `Full time 🏁 ${short(m[2])} ${sc[0]}–${sc[1]} ${short(m[3])}`, body: 'Who was your Player of the Match? Vote now.' }); });
    });
    return out.sort((x, y) => x.t - y.t);
  }
  // In the APK, native.js sets window.SPLSchedule: the alerts are handed to Android ahead of time, so they
  // still arrive with the screen locked (a web view's timers stop then). In a browser they drop in as toasts.
  const native = () => typeof window.SPLSchedule === 'function';
  function reschedule() {
    if (!native()) return;
    const list = !S.sim || !S.sim.run ? [] : alertsBetween(S.sim.T, Math.max(...LIVE_IDS.map(ftT))).map(a => ({ title: a.title, body: a.body, match: a.i, at: Date.now() + (a.t - S.sim.T) * SEC_PER_MIN * 1000 / S.sim.rate }));
    try { window.SPLSchedule(list); } catch (e) {}
  }
  function fire(prevT, T, quiet) {
    if (quiet || native()) return;
    const a = alertsBetween(prevT, T).pop();
    if (a) S.toast = { title: a.title, body: a.body, k: a.k, at: Date.now() };
  }
  // a full redraw only when something on screen changes meaning (an event, half time, a toast, the stats moving);
  // the clock itself is patched in place, so taps and scrolling aren't interrupted every two seconds
  function simKey() { return LIVE_IDS.map(i => { const L = liveOf(i); return L ? [L.started, L.ft, L.clock === 'HT', L.fired.length].join() : ''; }).join('|') + (S.toast ? S.toast.at : '') + (S.sim ? S.sim.run + '' + S.sim.rate : ''); }
  let lastTouch = 0; app.addEventListener('pointerdown', () => { lastTouch = Date.now(); }, true);
  // notifications sent from the admin: anything due since the app opened, for everyone or for a club this fan follows
  const seenPush = new Set(STORE.pushes.filter(p => p.at <= Date.now()).map(p => p.id));
  function duePushes() {
    const now = Date.now();
    STORE.pushes.forEach(p => { if (seenPush.has(p.id) || p.at > now) return; seenPush.add(p.id);
      const club = p.aud.startsWith('club:') ? p.aud.slice(5) : null;
      if (club && !(P.follows[club] || P.fav === club)) return;
      if (p.kind === 'live' && !P.settings.push.goals) return;
      if (p.kind === 'manual' && p.aud === 'news' && !P.settings.push.news) return;
      S.toast = { title: E(p.title), body: E(p.body), k: club || (p.match !== null && SPL.matches[p.match] ? SPL.matches[p.match][2] : ''), at: now, match: p.match };
      SPLSTORE.track('push', p.kind); });
  }
  function tick() {
    duePushes();
    if (!S.sim) { if (S.toast && Date.now() - S.toast.at > 4500) S.toast = null; app.querySelectorAll('[data-clock]').forEach(el => { const L = liveOf(+el.dataset.clock); if (L && el.textContent !== L.clock) el.textContent = L.clock; }); if (Date.now() - lastTouch < 700) return; const key = simKey(); if (key !== lastKey) { lastKey = key; if (LIVE_VIEWS.includes(S.view)) { S.keepScroll = true; render(); } else renderChrome(); } return; }
    const prev = S.sim.T, end = Math.max(...LIVE_IDS.map(ftT));
    const now = Date.now(), dt = Math.min(600, (now - (S.sim.at || now)) / 1000); S.sim.at = now;
    if (S.sim.run) { S.sim.T = Math.min(end, prev + (dt / SEC_PER_MIN) * S.sim.rate); fire(prev, S.sim.T); if (S.sim.T >= end) S.sim.run = false; }
    if (S.toast && Date.now() - S.toast.at > 4500) S.toast = null;
    app.querySelectorAll('[data-clock]').forEach(el => { const L = liveOf(+el.dataset.clock); if (L && el.textContent !== L.clock) el.textContent = L.clock; });
    if (Date.now() - lastTouch < 700) return;
    const key = simKey(); if (key !== lastKey) { lastKey = key; if (LIVE_VIEWS.includes(S.view)) { S.keepScroll = true; render(); } else renderChrome(); }
  }
  let storyTimer = null;
  function storyRun() { if (storyTimer) return; storyTimer = setInterval(() => { if (!S.story) { clearInterval(storyTimer); storyTimer = null; return; } S.story.p += 2; if (S.story.p >= 100) { if (S.story.j + 1 >= VIDEOS.length) S.story = null; else S.story = { j: S.story.j + 1, p: 0 }; render(); return; } const bar = app.querySelectorAll('.story .seg > span')[S.story.j]; if (bar) bar.style.width = S.story.p + '%'; }, 100); }
  function simStart(T) { S.sim = { T: T === undefined ? -0.5 : T, run: true, rate: 1, at: Date.now() }; if (!timer) timer = setInterval(tick, 250); reschedule(); }
  const demoBar = () => { if (!S.sim) return ''; const L = liveOf(LIVE_IDS[0]), done = !S.sim.run && S.sim.T >= Math.max(...LIVE_IDS.map(ftT));
    return `<div class="demobar"><span class="lbl" style="color:#FF6B71;white-space:nowrap">Replay · 1 Nov</span><span class="d mono" style="font-size:14px;min-width:46px" data-clock="${LIVE_IDS[0]}">${L.clock}</span><span style="flex:1"></span>${done ? '' : `<button data-sim="${S.sim.run ? 'pause' : 'play'}">${S.sim.run ? 'Pause' : 'Play'}</button><button data-sim="rate">${S.sim.rate}×</button><button data-sim="ft">Full time</button>`}<button data-sim="stop" aria-label="End simulation">End</button></div>`; };
  const toastEl = () => S.toast ? `<button class="toast" data-toast="1" style="border-top:3px solid ${C[S.toast.k] ? C[S.toast.k].c : '#E8363D'}">${C[S.toast.k] ? crest(S.toast.k, 30) : ''}<span style="flex:1;display:flex;flex-direction:column;gap:2px;text-align:left"><span style="font-size:13px;font-weight:700">${S.toast.title}</span><span style="font-size:12px;color:#DCDAF0">${S.toast.body}</span></span><span class="lbl" style="font-size:9px">SPL · now</span></button>` : '';
  function renderChrome() { const d = app.querySelector('#chrome'); if (d) d.innerHTML = demoBar() + toastEl(); }

  // After the roar: the league's partners, as the Serie A app does. AIA first as title partner; FAS fills the rest
  // from the admin (Sponsors → Partners screen). Lifts away after 2.4s or on tap.
  function partnersScreen() {
    if (EMBED) return;
    const list = STORE.partners.filter(x => x.logo || x.name), title = list.find(x => x.tier === 'Title partner') || list[0];
    const rest = STORE.partners.filter(x => x !== title);
    const light = STORE.partnerLook === 'light', colour = STORE.partnerLook === 'colour' || light;
    // full-colour marks sit on white tiles, sized by their own shape (a tall mark gets more height, a long one less)
    const CH = { 'singapore-pools': 46, adidas: 40, 'trip-com': 24, dongfeng: 26, msig: 48, polar: 30, playback: 14, 'pan-pacific': 32 };
    const src = x => colour && /^assets\/partners\/[a-z-]+\.png$/.test(x.logo) ? x.logo.replace('partners/', 'partners/colour/') : x.logo;
    const hOf = x => { const f = (x.logo.match(/([a-z-]+)\.png$/) || [])[1]; return colour && CH[f] ? CH[f] : x.h; };
    const mark = x => x.logo === 'aia' ? '<span class="aia" role="img" aria-label="AIA" style="width:100%;height:100%"></span>' : x.logo ? `<img src="${src(x)}" alt="${E(x.name)}" style="height:${hOf(x)}px;max-width:88%;object-fit:contain">` : x.name ? `<span class="d" style="font-size:20px;color:${colour ? '#0B0F2E' : '#fff'}">${E(x.name)}</span>` : '<span class="lbl" style="color:var(--dim)">[PARTNER]</span>';
    const el = document.createElement('div'); el.id = 'partners'; if (light) el.classList.add('pt-light'); else if (colour) el.classList.add('pt-colour');
    el.innerHTML = `<div class="pt-in"><span class="spl-h" role="img" aria-label="Singapore Premier League" style="width:170px;height:64px;background-position:center"></span><span class="pt-rule"></span>
      ${title ? `<span class="lbl">${E(title.tier)}</span><span class="pt-title">${mark(title)}</span>` : ''}
      <span class="lbl" style="margin-top:10px">Official partners</span>
      <div class="pt-grid">${rest.map(x => `<span class="pt-slot">${mark(x)}${x.tier !== 'Official partner' && (x.logo || x.name) ? `<span class="lbl" style="font-size:8px">${E(x.tier)}</span>` : ''}</span>`).join('')}</div></div>`;
    document.body.appendChild(el);
    const go = () => { el.classList.add('pt-out'); setTimeout(() => el.remove(), 450); };
    el.addEventListener('click', go);
    const launch = document.getElementById('launch');
    const after = () => setTimeout(go, 2400);
    if (!launch) after(); else new MutationObserver((_, o) => { if (launch.classList.contains('l-out') || !launch.isConnected) { o.disconnect(); after(); } }).observe(launch, { attributes: true, attributeFilter: ['class'] });
    SPLSTORE.track('view', 'partners');
  }
  let lastView = '';
  function render() {
    const el = app.querySelector('.screen'), top = el ? el.scrollTop : 0;
    const bare = S.view === 'onboard';
    app.dataset.club = theme(); app.dataset.look = P.settings.look === 'light' ? 'light' : 'dark';
    app.innerHTML = `<div class="screen" style="${S.view === 'home' ? '' : S.view === 'club' ? 'padding-top:0' : 'padding-top:calc(var(--safe-area-inset-top,env(safe-area-inset-top,0px)) + 54px)'}${bare ? ';padding-bottom:30px' : ''}">${SCREEN[S.view]()}</div>
      ${bare ? '' : `<nav class="navbar" aria-label="Main">${NAV.map(([v, l, i, views]) => `<button class="nav ${views.includes(S.view) ? 'on' : ''} ${v === 'clubs' ? 'mid' : ''}" data-go="${v}">${v === 'clubs' ? `<span class="nav-up">${i}</span>` : i}${l}</button>`).join('')}</nav>`}<div class="sbar ${S.view === 'club' ? 'clear' : ''}"></div>${shortEl()}<div id="chrome">${demoBar()}${toastEl()}</div>${storyEl()}${authEl()}`;
    // the club hero runs up behind the status bar; the strip fills in once the hero has scrolled away
    if (S.view === 'club') { const sc = app.querySelector('.screen'), sb = app.querySelector('.sbar'); const f = () => sb.classList.toggle('clear', sc.scrollTop < 380); sc.addEventListener('scroll', f, { passive: true }); f(); }
    const stage = app.querySelector('#pickstage');
    if (stage) { let x0 = null; stage.addEventListener('pointerdown', e => { x0 = e.clientX; }); stage.addEventListener('pointerup', e => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) pickBy(dx < 0 ? 1 : -1); }); const on = app.querySelector('.pk-c.on'), strip = app.querySelector('#pkstrip'); if (on && strip) strip.scrollLeft = on.offsetLeft - strip.clientWidth / 2 + on.clientWidth / 2; S.pickDir = 0; }
    const sq = app.querySelector('#sq'); if (sq) { sq.focus(); sq.setSelectionRange(sq.value.length, sq.value.length); sq.oninput = e => { S.sq = e.target.value; S.keepScroll = true; render(); }; }
    const shf = app.querySelector('.shorts iframe'); if (shf) shf.addEventListener('load', () => ytListen(shf)); else { clearInterval(ytPing); ytFor = null; }
    if (S.keepScroll) { app.querySelector('.screen').scrollTop = top; S.keepScroll = false; }
    const vk = S.view + (S.view === 'home' ? ':' + S.htab : S.view === 'match' ? ':' + S.mtab : S.view === 'stats' ? ':' + S.ttab : S.view === 'club' ? ':' + S.club : '');
    if (vk !== lastView) { lastView = vk; if (!EMBED) { SPLSTORE.track('view', vk); app.querySelectorAll('[data-slot]').forEach(x => SPLSTORE.track('imp', x.dataset.slot)); } }
  }
  app.addEventListener('click', e => {
    const t = e.target.closest('[data-vsim],[data-pvote],[data-short],[data-shclose],[data-shnav],[data-tv],[data-bell],[data-trip],[data-go],[data-match],[data-club],[data-player],[data-mw],[data-htab],[data-mtab],[data-ttab],[data-ctab],[data-follow],[data-gclip],[data-ob],[data-pick],[data-sq],[data-toggle],[data-lang],[data-signout],[data-vote],[data-remind],[data-cal],[data-sim],[data-toast],[data-potm],[data-tickets],[data-qty],[data-tkstep],[data-tkpay],[data-tkback],[data-wallet],[data-mytk],[data-more],[data-story],[data-snav],[data-sclose],[data-video],[data-pnav],[data-colours],[data-article],[data-auth],[data-appearance]'); if (!t) return;
    const d = t.dataset;
    if (!EMBED) { const k = Object.keys(d)[0]; SPLSTORE.track('tap', k + (d[k] && d[k].length < 24 ? ':' + d[k] : '')); }
    if (d.sim) { if (d.sim === 'start') { simStart(); S.view = 'home'; S.htab = 'tonight'; } else if (d.sim === 'pause') S.sim.run = false; else if (d.sim === 'play') S.sim.run = true; else if (d.sim === 'rate') S.sim.rate = { 1: 4, 4: 10, 10: 1 }[S.sim.rate]; else if (d.sim === 'ht') { S.sim.T = 48; S.sim.run = false; } else if (d.sim === 'ft') { const end = Math.max(...LIVE_IDS.map(ftT)); fire(S.sim.T, end, true); S.sim.T = end; S.sim.run = false; } else if (d.sim === 'stop') { S.sim = null; S.toast = null; } reschedule(); S.keepScroll = true; render(); return; }
    if (d.toast) { const k = S.toast && S.toast.k, i = LIVE_IDS.find(id => SPL.matches[id][2] === k || SPL.matches[id][3] === k); S.toast = null; if (i !== undefined) { S.from = S.view === 'match' ? S.from : S.view; S.view = 'match'; S.match = i; S.mtab = 'overview'; } render(); return; }
    if (d.potm) { const [i, j] = d.potm.split(':').map(Number); P.potm[i] = j; save(); S.keepScroll = true; render(); return; }
    if (d.tickets !== undefined) { e.stopPropagation(); S.tkFrom = S.view; S.tk = { match: +d.tickets, step: 0, q: {}, pay: 'paynow' }; S.wallet = false; S.view = 'tickets'; render(); return; }
    if (d.qty) { const [k, v] = d.qty.split(':'); const n = Object.values(S.tk.q).reduce((a, b) => a + b, 0); const next = Math.max(0, (S.tk.q[k] || 0) + +v); if (+v > 0 && n >= 10) return; S.tk.q[k] = next; S.keepScroll = true; render(); return; }
    if (d.tkpay) { S.tk.pay = d.tkpay; S.keepScroll = true; render(); return; }
    if (d.tkstep) { S.tk.step = +d.tkstep; if (S.tk.step === 2) { const q = S.tk.q, n = Object.values(q).reduce((a, b) => a + b, 0), stands = [...new Set(TIX.filter(x => q[x[0]]).map(x => x[1].split(' ·')[0]))].join(' + '); P.tickets.push({ match: S.tk.match, n, stands, ref: 'SPL' + (100000 + Math.floor(Math.random() * 899999)) }); save(); } render(); return; }
    if (d.tkback) { if (S.tk.step === 1) S.tk.step = 0; else S.view = S.tkFrom || 'home'; render(); return; }
    if (d.story !== undefined) { e.preventDefault(); S.story = { j: +d.story, p: 0 }; storyRun(); render(); return; }
    if (d.snav) { const j = S.story.j + +d.snav; if (j < 0) S.story.p = 0; else if (j >= VIDEOS.length) S.story = null; else S.story = { j, p: 0 }; render(); return; }
    if (d.sclose) { S.story = null; if (d.gowatch) { S.view = 'watch'; } render(); return; }
    if (d.sclosego) { S.story = null; }
    if (d.gclip) { const g = GOTM_().goals.find(x => x.id === d.gclip), id = g && ytId(g.clip); if (id) { S.from = S.view; S.video = id; S.vclip = { id, title: `${g.player}, ${g.min} · ${g.match}`, from: secs(g.from), to: secs(g.to) }; S.view = 'video'; render(); } return; }
    if (d.video) { S.vclip = null; S.from = S.view; S.video = d.video; S.view = 'video'; S.story = null; render(); return; }
    if (d.trip !== undefined) { SPLSTORE.track('trip', d.trip); return; }
    if (d.auth) { const a = S.auth; if (!a) return;
      if (d.auth === 'close') { clearTimeout(authTimer); S.auth = null; }
      else if (d.auth === 'pick') { a.step = 'busy'; authAfter(1300, 'done'); }
      else if (d.auth === 'other') { a.other = true; }
      else if (d.auth === 'email') { const v = (app.querySelector('#authEmail') || {}).value || ''; if (!/^\S+@\S+\.\S+$/.test(v)) return; a.email = v.trim(); a.step = 'busy'; authAfter(1300, 'done'); }
      else if (d.auth === 'share') a.share = true; else if (d.auth === 'hide') a.share = false;
      else if (d.auth === 'go') { a.step = 'busy'; authAfter(1300, 'done'); }
      render(); return; }
    if (d.article) { S.from = S.view; S.article = d.article; S.view = 'article'; S.story = null; render(); app.querySelector('.screen').scrollTop = 0; SPLSTORE.track('article', d.article); return; }
    if (d.appearance) { P.settings.look = P.settings.look === 'light' ? 'dark' : 'light'; save(); S.keepScroll = true; render(); return; }
    if (d.colours) { P.settings.colours = P.settings.colours === false; save(); S.keepScroll = true; render(); return; }
    if (d.more) { S.more[d.more] = !S.more[d.more]; S.keepScroll = true; render(); return; }
    if (d.wallet) { S.wallet = true; S.keepScroll = true; render(); return; }
    if (d.mytk !== undefined) { S.tkFrom = S.view; S.tk = { match: +d.mytk, step: 2, q: {}, pay: 'paynow' }; S.view = 'tickets'; render(); return; }
    if (d.go === 'onboard-club') { S.view = 'onboard'; S.ob = 1; S.pick = P.fav; }
    else if (d.go) { if (d.htabBack) S.htab = d.htabBack; if (S.vsim && d.go !== S.view) { S.vsim = null; clearInterval(vsimTimer); } S.view = d.go; if (d.go === 'matches') S.match = null; if (d.go === 'search') S.sq = ''; if (d.focus === 'notif') setTimeout(() => { const el = [...app.querySelectorAll('.lbl')].find(x => /^Notifications/i.test(x.textContent.trim())); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 80); }
    else if (d.ob) { if (d.ob === 'done' || d.ob === 'skip') { const was = theme(); if (d.ob === 'done') dressUp(S.pick, was); P.fav = d.ob === 'done' ? S.pick : null; if (P.fav) P.follows[P.fav] = true; if (!P.user) P.user = { name: 'Guest', via: 'guest' }; save(); S.view = 'home'; } else if (d.ob === 'guest') { P.user = null; save(); S.ob = 1; S.pick = null; } else { S.auth = { via: d.ob, step: d.ob === 'signpass' ? 'waiting' : 'sheet', share: true }; if (d.ob === 'signpass') authAfter(2600, 'consent'); } }
    else if (d.pick) { const o = PICK_ORDER(); S.pickDir = Math.sign(o.indexOf(d.pick) - o.indexOf(S.pick || o[0])); S.pick = d.pick; S.keepScroll = true; }
    else if (d.pnav) { pickBy(+d.pnav); return; }
    else if (d.sq !== undefined) { S.sq = d.sq; }
    else if (d.toggle) { const [g, k] = d.toggle.split('.'); if (g === 'data') P.settings.data = !P.settings.data; else P.settings[g][k] = !P.settings[g][k]; save(); reschedule(); S.keepScroll = true; }
    else if (d.lang) { const L = ['en', 'ms', 'zh', 'ta']; P.settings.lang = L[(L.indexOf(P.settings.lang) + 1) % L.length]; save(); S.keepScroll = true; }
    else if (d.signout) { try { localStorage.removeItem(KEY); } catch (x) {} location.reload(); return; }
    else if (d.vote) { P.votes[GOTM_().month] = d.vote; SPLSTORE.track('vote', 'gotm'); save(); S.keepScroll = true; }
    else if (d.remind !== undefined) { P.reminders[d.remind] = !P.reminders[d.remind]; save(); S.keepScroll = true; }
    else if (d.cal !== undefined) { P.cal[d.cal] = true; save(); S.keepScroll = true; return; }
    else if (d.match !== undefined) { if (S.view !== 'match') S.from = S.view; S.view = 'match'; S.match = +d.match; S.mtab = d.to || 'overview'; }
    else if (d.club) { S.view = 'club'; S.club = d.club; S.ctab = 'latest'; S.pick = d.club; }
    else if (d.player) { if (S.view !== 'player') S.pfrom = S.view === 'club' ? 'club' : S.view === 'search' ? 'search' : S.view === 'stats' ? 'stats' : S.view === 'match' ? 'match' : 'stats'; S.view = 'player'; S.player = d.player; }
    else if (d.mw) { S.mw = +d.mw; S.keepScroll = true; }
    else if (d.htab) { S.htab = d.htab; S.keepScroll = true; }
    else if (d.mtab) { S.mtab = d.mtab; S.keepScroll = true; }
    else if (d.ttab) { S.ttab = d.ttab; S.keepScroll = true; }
    else if (d.ctab) { S.ctab = d.ctab; S.keepScroll = true; }
    else if (d.vsim) { vsimStart(d.vsim); S.keepScroll = true; }
    else if (d.pvote) { P.votes[PMONTH.key] = d.pvote; SPLSTORE.track('vote', 'pmonth'); save(); S.keepScroll = true; }
    else if (d.short !== undefined) { S.short = reelOf(+d.short); S.keepScroll = true; }
    else if (d.shclose) { S.short = null; S.keepScroll = true; }
    else if (d.shnav) { const t = S.short + +d.shnav; if (t < 0 || t >= REEL.length) { if (t >= REEL.length) S.short = null; } else { S.shDir = +d.shnav; S.short = t; } S.keepScroll = true; }
    else if (d.tv) { S.tv = d.tv; S.keepScroll = true; }
    else if (d.bell) { P.mute = P.mute || {}; P.mute[d.bell] = !P.mute[d.bell]; save(); reschedule(); S.keepScroll = true; }
    else if (d.follow) { P.follows[d.follow] = !P.follows[d.follow]; save(); S.keepScroll = true; }
    render();
  });
  // Shorts auto-advance: the embedded player reports its state and time over postMessage (enablejsapi=1).
  // Ended (state 0) moves to the next Short; currentTime / duration fill the progress bar. No extra script.
  function shortGo(n) { if (S.short == null) return; const t = S.short + n; if (t < 0) return; if (t >= REEL.length) S.short = null; else { S.shDir = n; S.short = t; } S.keepScroll = true; render(); }
  let ytPing = null, ytHeard = false, ytFor = null;
  function ytListen(f) {
    clearInterval(ytPing); ytHeard = false; ytFor = S.short; let tries = 0;
    const send = o => { try { f.contentWindow.postMessage(JSON.stringify(Object.assign({ id: 'sh', channel: 'widget' }, o)), '*'); } catch (e) {} };
    ytPing = setInterval(() => { if (ytHeard || ++tries > 40 || !f.isConnected) { clearInterval(ytPing); if (!ytHeard && f.isConnected) { const i = app.querySelector('.sh-segs .on i'); if (i) i.style.width = '100%'; } return; }
      send({ event: 'listening' }); send({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }); }, 250);
  }
  window.addEventListener('message', e => {
    if (S.short == null || !/youtube/.test(e.origin)) return; let d; try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch (x) { return; }
    if (!d || ytFor !== S.short) return; ytHeard = true;
    const info = d.info || {}, state = d.event === 'onStateChange' ? d.info : info.playerState;
    if (info.duration > 0 && info.currentTime >= 0) { const i = app.querySelector('.sh-segs .on i'); if (i) i.style.width = Math.min(100, 100 * info.currentTime / info.duration) + '%'; }
    if (state === 0) { ytFor = null; shortGo(1); }
  });
  // Shorts: a vertical swipe moves through them, like Reels
  let shY = null, shX = null;
  app.addEventListener('touchstart', e => { const z = S.short != null && e.target.closest('.sh-zone'); shY = z ? e.touches[0].clientY : null; shX = z ? e.touches[0].clientX : null; }, { passive: true });
  app.addEventListener('touchend', e => { if (shY == null) return; const dy = e.changedTouches[0].clientY - shY, dx = e.changedTouches[0].clientX - shX; shY = shX = null;
    if (Math.abs(dx) > Math.abs(dy)) { if (Math.abs(dx) >= 60) shortGo(dx < 0 ? 1 : -1); return; } if (Math.abs(dy) < 60) return;
    shortGo(dy < 0 ? 1 : -1); }, { passive: true });
  window.SPLAPP = { state: S, render, go: v => { S.view = v; S.story = null; render(); }, sim: simStart, openMatch: i => { S.story = null; S.from = 'home'; S.view = 'match'; S.match = i; S.mtab = 'overview'; render(); }, closeStory: () => { if (S.short != null) { S.short = null; render(); return true; } if (!S.story) return false; S.story = null; render(); return true; }, reschedule };
  if (/[?&]live\b/.test(location.search) && P.user !== undefined) simStart();
  // the admin and the app share the store: a change in one tab shows in the other straight away
  window.addEventListener('storage', e => {
    if (e.key !== SPLSTORE.KEY && e.key !== null) return;
    STORE = SPLSTORE.read(); potmSync(); duePushes();
    if (!['players', 'search', 'onboard', 'tickets'].includes(S.view)) { S.keepScroll = true; render(); } else renderChrome();
  });
  if (!timer) timer = setInterval(tick, 250);
  partnersScreen();
  render();
})();
