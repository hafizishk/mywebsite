/* What FAS's office sets in the admin (admin.html) and the app reads: news, the lead story, notifications,
   the live match console, the votes and the sponsor slots. In the demo it lives in this browser's
   localStorage under one key, so the admin and the app (on the same origin) share it; in the real build it is
   Supabase (cloud.js keeps the two in step). Saved state is never trusted: every field is checked against the defaults' shape on read.
   Loaded after data.js, before app.js / admin.js. */
var SPLSTORE = (function () {
  'use strict';
  const KEY = 'spl-admin', EVK = 'spl-events';
  const C = SPL.clubs, sh = k => C[k].short;
  const sc = m => `${m[4][0]}–${m[4][1]}`;
  const goals = (m, k) => (m[6] || []).filter(g => g[2] === k).map(g => `${g[0]} ${g[1]}'`).join(', ');
  // a matchweek's results, written out from the results themselves
  const roundup = mw => SPL.matches.filter(m => m[0] === mw && m[4]).map(m => {
    const h = goals(m, m[2]), a = goals(m, m[3]);
    return `${C[m[2]].name} ${sc(m)} ${C[m[3]].name}, ${m[5]}.` + (h || a ? ` ${[h && sh(m[2]) + ': ' + h, a && sh(m[3]) + ': ' + a].filter(Boolean).join('. ')}.` : ' No goals.');
  }).join('\n\n');
  const preview6 = () => {
    const pos = k => { const i = SPL.table.findIndex(r => r[0] === k), r = SPL.table[i]; return `${i + 1}${['st', 'nd', 'rd'][i] || 'th'}, ${r[2] * 3 + r[3]} pts`; };
    return SPL.matches.filter(m => m[0] === 6 && !m[4]).map(m => `${C[m[2]].name} (${pos(m[2])}) v ${C[m[3]].name} (${pos(m[3])}) · ${m[5]}, ${m[7]}.`).join('\n\n') +
      '\n\nGeylang lead on 13 points with Tampines a point behind having played a game fewer. Earlier in the round Tanjong Pagar and Jurong drew 1–1 and the Young Lions won 2–0 at Hougang, Hisatoshi Nishido scoring both.';
  };
  const seedNews = () => [
    { id: 'n1', tag: 'Preview', date: '2026-10-31', title: 'SPL 2026/27 Matchweek 6: Eastern Derby takes centre stage', dek: 'Tampines host Geylang with top spot on the line; Sailors go to Bishan to face Balestier.', body: preview6(), img: 'bn-DERBY', status: 'live' },
    { id: 'n2', tag: 'Roundup', date: '2026-10-26', title: 'Matchweek 5: Sailors six, Stags stay perfect, Eagles keep the lead', dek: 'Six without reply at Jalan Besar; Higashikawa moves to six for the season at Jurong East.', body: roundup(5), img: 'bn-SAILORS', status: 'live' },
    { id: 'n3', tag: 'Review', date: '2026-10-20', title: 'Five lessons from Matchweek 4 of the Singapore Premier League', dek: 'The Jurong East hoodoo is over, and the Young Lions problem is a finishing problem.', body: '[FULL ARTICLE FROM SPL.SG]', img: '', status: 'live' },
    { id: 'n4', tag: 'Roundup', date: '2026-10-19', title: 'Matchweek 4: Sailors end eight-match Jurong East wait', dek: 'Haag from the spot and Shawal late; Tampines come from behind to beat the Young Lions 4–1.', body: roundup(4), img: '', status: 'live' },
    { id: 'n5', tag: 'Roundup', date: '2026-10-14', title: 'Matchweek 3: Geylang go top after seeing off Jurong', dek: 'Sahil and Racic turn it around at Our Tampines Hub; Jackson wins his first in charge of the Sailors.', body: roundup(3), img: '', status: 'live' },
    { id: 'n6', tag: 'Fixtures', date: '2026-10-01', title: 'Fixture update: Lion City Sailors v Tampines Rovers', dek: 'The Matchweek 2 meeting moves to Thursday 4 February 2027 because of AFC commitments.', body: 'The Matchweek 2 fixture between Lion City Sailors and Tampines Rovers at Jalan Besar Stadium has been rescheduled to Thursday 4 February 2027 because of both clubs\' AFC commitments.', img: '', status: 'live' }
  ];
  // Goal of the Month — October 2026 shortlist, from the roundups; vote counts are the demo's placeholders
  const seedGotm = () => ({ month: 'October', closes: '2026-11-09', open: true, winner: '', goals: [
    { id: 'g1', player: 'Hide Higashikawa', team: 'TAM', match: 'Tampines 4–1 Young Lions', min: "90+7'", how: 'Curled first-time finish from the edge of the box to seal the comeback.' },
    { id: 'g2', player: 'Matthias Phaeton', team: 'LCS', match: 'Sailors 6–1 Young Lions', min: "83'", how: 'Solo run from halfway, two beaten, slotted low.' },
    { id: 'g3', player: 'Yang Hyeonju', team: 'GEY', match: 'Geylang 3–0 Hougang', min: "90+1'", how: 'Volleyed from Ogawa\'s cross on the stretch.' },
    { id: 'g4', player: 'Hariss Harun', team: 'LCS', match: 'Sailors 6–0 Tanjong Pagar', min: "90+5'", how: 'The captain, from thirty yards, into the top corner.' },
    { id: 'g5', player: 'Seiya Satsukida', team: 'JUR', match: 'Jurong 2–3 Tampines', min: "47'", how: 'Chest and half-volley straight from the restart.' }
  ], base: { g1: 412, g2: 388, g3: 301, g4: 527, g5: 164 }, previous: [{ month: 'September', player: 'Lazar Vujanic', team: 'TPU', match: 'Balestier 3–4 Tanjong Pagar' }] });
  // the section sponsor slots the app carries; empty partner shows [PARTNER]
  const SLOTS = { gotm: 'Goal of the Month', potm: 'Player of the Match', stats: 'Player stats', moments: 'Moments', live: 'Live match centre' };
  const seedSponsors = () => { const o = {}; Object.keys(SLOTS).forEach(k => { o[k] = { partner: '', from: '', to: '' }; }); return o; };
  // the partners screen after the splash: AIA as title partner, then the league's official partners in the order the
  // SPL's own partner strip lists them (supplied by the owner, 4 Nov 2026; logos cut from it into assets/partners/)
  // h: the height each mark is drawn at, so they read as the same size (a tall lockup gets more, a long wordmark less)
  const PL = [['Singapore Pools', 'singapore-pools', 60], ['adidas', 'adidas', 44], ['Trip.com', 'trip-com', 32], ['Dongfeng by Volt Auto', 'dongfeng', 42], ['MSIG', 'msig', 44], ['Polar', 'polar', 34], ['Playback', 'playback', 15], ['Pan Pacific Leasing Group', 'pan-pacific', 36]];
  const seedPartners = () => [{ name: 'AIA', tier: 'Title partner', logo: 'aia' }].concat(PL.map(([name, f, h]) => ({ name, tier: 'Official partner', logo: `assets/partners/${f}.png`, h })));
  const DEF = () => ({ news: seedNews(), lead: 'n1', pushes: [], live: {}, gotm: seedGotm(), sponsors: seedSponsors(), partners: seedPartners(), partnerLook: 'light', staff: [] });

  const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
  const str = (x, d) => typeof x === 'string' ? x.slice(0, 4000) : d;
  function clean(d) {
    const def = DEF(), out = {};
    out.news = Array.isArray(d.news) ? d.news.filter(isObj).map(n => ({ id: str(n.id, 'n' + Math.random().toString(36).slice(2, 8)), tag: str(n.tag, 'News'), date: str(n.date, ''), title: str(n.title, ''), dek: str(n.dek, ''), body: str(n.body, ''), img: str(n.img, ''), status: n.status === 'draft' ? 'draft' : 'live' })) : def.news;
    out.lead = str(d.lead, def.lead);
    out.pushes = Array.isArray(d.pushes) ? d.pushes.filter(isObj).slice(-200).map(p => ({ id: str(p.id, ''), at: +p.at || 0, title: str(p.title, ''), body: str(p.body, ''), aud: str(p.aud, 'all'), kind: str(p.kind, 'manual'), match: Number.isInteger(p.match) ? p.match : null })) : [];
    out.live = {};
    if (isObj(d.live)) Object.keys(d.live).forEach(k => { const L = d.live[k], i = +k; if (!isObj(L) || !SPL.matches[i]) return;
      out.live[i] = { phase: ['pre', '1H', 'HT', '2H', 'FT'].includes(L.phase) ? L.phase : 'pre', t0: +L.t0 || 0, base: +L.base || 0, sheet: !!L.sheet,
        ev: Array.isArray(L.ev) ? L.ev.filter(e => Array.isArray(e) && ['G', 'D', 'Y', 'R', 'S', 'HT', 'FT'].includes(e[3])).slice(0, 80).map(e => { e = e.slice(0, 10); if (e[8] != null && !SPL.clubs[e[8]]) e[8] = null; if (e[9] != null) e[9] = String(e[9]).slice(0, 40); return e; }) : [] }; });
    const g = isObj(d.gotm) ? d.gotm : {};
    out.gotm = { month: str(g.month, def.gotm.month), closes: str(g.closes, def.gotm.closes), open: g.open !== false, winner: str(g.winner, ''),
      goals: Array.isArray(g.goals) && g.goals.length ? g.goals.filter(isObj).slice(0, 8).map((x, j) => ({ id: str(x.id, 'g' + (j + 1)), player: str(x.player, ''), team: C[x.team] ? x.team : 'TAM', match: str(x.match, ''), min: str(x.min, ''), how: str(x.how, '') })) : def.gotm.goals,
      base: isObj(g.base) ? g.base : def.gotm.base, previous: Array.isArray(g.previous) ? g.previous.filter(isObj) : def.gotm.previous };
    out.sponsors = seedSponsors();
    if (isObj(d.sponsors)) Object.keys(SLOTS).forEach(k => { const s = d.sponsors[k]; if (isObj(s)) out.sponsors[k] = { partner: str(s.partner, '').slice(0, 60), from: str(s.from, ''), to: str(s.to, '') }; });
    // a logo is the built-in AIA mark or an image the admin uploaded (a data: URL of a PNG, JPEG or SVG, capped)
    const logoOk = x => x === 'aia' || (typeof x === 'string' && /^assets\/partners\/(colour\/)?[a-z-]+\.png$/.test(x)) || (typeof x === 'string' && /^data:image\/(png|jpeg|svg\+xml|webp);base64,[A-Za-z0-9+/=]+$/.test(x) && x.length < 400000);
    out.partners = Array.isArray(d.partners) ? d.partners.filter(isObj).slice(0, 13).map(x => ({ name: str(x.name, '').slice(0, 60), tier: str(x.tier, 'Official partner').slice(0, 40), logo: logoOk(x.logo) ? x.logo : '', h: Math.min(80, Math.max(12, +x.h || 34)) })) : def.partners;
    // 'light' (default): each partner's own colours on a white page; 'mono': white marks on the navy, as the SPL's strip;
    // 'colour': colour marks on white tiles over the navy
    out.partnerLook = ['colour', 'light'].includes(d.partnerLook) ? d.partnerLook : 'light';
    out.staff = Array.isArray(d.staff) ? d.staff.filter(isObj).slice(0, 40) : [];
    return out;
  }
  function read() { let d = {}; try { d = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {} return clean(isObj(d) ? d : {}); }
  // saved here, and to the backend when FAS staff are signed in (cloud.js; a no-op in demo mode or for fans)
  function write(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} if (window.SPLCLOUD) SPLCLOUD.save(d); }
  function update(fn) { const d = read(); fn(d); write(d); return d; }
  function reset() { try { localStorage.removeItem(KEY); localStorage.removeItem(EVK); } catch (e) {} }
  // analytics: the app records each screen it shows, each tap and each sponsor slot seen; the admin counts them
  function track(kind, name) { if (window.SPLCLOUD) SPLCLOUD.log(kind, name); try { const a = JSON.parse(localStorage.getItem(EVK) || '[]'); a.push([Date.now(), String(kind).slice(0, 20), String(name).slice(0, 60)]); if (a.length > 4000) a.splice(0, a.length - 4000); localStorage.setItem(EVK, JSON.stringify(a)); } catch (e) {} }
  function events() { try { const a = JSON.parse(localStorage.getItem(EVK) || '[]'); return Array.isArray(a) ? a.filter(e => Array.isArray(e) && e.length === 3) : []; } catch (e) { return []; } }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  return { KEY, EVK, SLOTS, read, write, update, reset, track, events, esc };
})();
