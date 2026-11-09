/* What FAS's office sets in the admin (admin.html) and the app reads: news, the lead story, notifications,
   the live match console, the votes and the sponsor slots. In the demo it lives in this browser's
   localStorage under one key, so the admin and the app (on the same origin) share it; in the real build it is
   Supabase (cloud.js keeps the two in step). Saved state is never trusted: every field is checked against the defaults' shape on read.
   Loaded after data.js, before app.js / admin.js. */
var SPLSTORE = (function () {
  'use strict';
  // news pictures: the league's own (spl.sg's photo for each story, 9 Nov). A story without one takes its spl.sg photo by id.
  const IMG = { 'bn-DERBY': 'assets/news/eastern-derby-poster.png', 'bn-SAILORS': 'assets/news/sailors-celebration.png',
    'ph-MW6R': 'assets/news/mw6-roundup.jpg', 'ph-MW6P': 'assets/news/mw6-preview.jpg', 'ph-MW5R': 'assets/news/mw5-roundup.jpg', 'ph-MW5P': 'assets/news/mw5-preview.jpg',
    'ph-MW4R': 'assets/news/mw4-roundup.jpg', 'ph-MW4P': 'assets/news/mw4-preview.jpg', 'ph-MW3R': 'assets/news/mw3-roundup.jpg', 'ph-SPL': 'assets/news/spl-notice.jpg',
    'R6-1': 'assets/news/mw6r-1.jpg', 'R6-2': 'assets/news/mw6r-2.jpg', 'R6-3': 'assets/news/mw6r-3.jpg', 'R6-4': 'assets/news/mw6r-4.jpg', 'R6-5': 'assets/news/mw6r-5.jpg', 'R6-6': 'assets/news/mw6r-6.jpg', 'R6-7': 'assets/news/mw6r-7.jpg', 'R6-8': 'assets/news/mw6r-8.jpg' };
  // a story's photos (Hafiz, 9 Nov): up to 6, each a library key or an uploaded picture (a data URL until the backend's storage is on)
  const photos = a => Array.isArray(a) ? a.filter(x => typeof x === 'string' && (IMG[x] || (/^data:image\/(jpeg|png|webp);base64,/.test(x) && x.length < 700000))).slice(0, 12) : [];
  const picUrl = k => IMG[k] || (/^data:image\//.test(k || '') ? k : '');
  // a story is in the app once published, or once its scheduled time has come
  const isOut = (n, now) => n.status === 'live' || (n.status === 'scheduled' && n.at && n.at <= (now || Date.now()));
  const picsOf = n => { const a = (n.imgs || []).filter(picUrl); return a.length ? a : (n.img && picUrl(n.img) ? [n.img] : []); };
  const NEWS_IMG = { n10: 'ph-MW6R', n3: 'ph-MW4R', n4: 'ph-MW4R', n5: 'ph-MW3R', n7: 'ph-SPL', n8: 'ph-MW5P', n9: 'ph-MW4P', n6: 'ph-SPL' };
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
    { id: 'n10', tag: 'Roundup', date: '2026-11-02', title: "Matchweek 6 roundup: Geylang top at the break", dek: "A goalless Eastern Derby keeps Geylang top, the Sailors become the first side to 20 goals, and Young Lions finally win.", body: "Tampines Rovers and Geylang International drew 0\u20130 at Our Tampines Hub. Ryoya Taniguchi had a goal ruled out for offside on 36 minutes, and Geylang go into the international break top of the table, having played a game more than the Sailors and Tampines.\n\nLion City Sailors won 4\u20130 at Balestier Khalsa. Shawal Anuar, Antonio Mance from the spot, Matthias Pha\u00ebton and Lennart Thy scored, making the Sailors the first team to reach 20 league goals this season.\n\nHisatoshi Nishido scored twice as Young Lions beat Hougang United 2\u20130 for their first win of the season. Hougang had two goals ruled out after VAR reviews, and Miyu Sato missed a penalty for Young Lions. On Friday, Tanjong Pagar drew 1\u20131 with FC Jurong through Lee Jaeyong's own goal deep into stoppage time, after Seiya Satsukida had given Jurong the lead and Shunsuke Ono was sent off.", img: '', status: 'live' },
    { id: 'n1', tag: 'Preview', date: '2026-10-31', title: 'SPL 2026/27 Matchweek 6: Eastern Derby takes centre stage', dek: 'Tampines host Geylang with top spot on the line; Sailors go to Bishan to face Balestier.', body: preview6(), img: 'bn-DERBY', status: 'live' },
    { id: 'n2', tag: 'Roundup', date: '2026-10-26', title: 'Matchweek 5: Sailors six, Stags stay perfect, Eagles keep the lead', dek: 'Six without reply at Jalan Besar; Higashikawa moves to six for the season at Jurong East.', body: roundup(5), img: 'bn-SAILORS', status: 'live' },
    { id: 'n3', tag: 'Review', date: '2026-10-20', title: 'Five lessons from Matchweek 4 of the Singapore Premier League', dek: 'The Jurong East hoodoo is over, and the Young Lions problem is a finishing problem.', body: '[FULL ARTICLE FROM SPL.SG]', img: '', status: 'live' },
    { id: 'n4', tag: 'Roundup', date: '2026-10-19', title: 'Matchweek 4: Sailors end eight-match Jurong East wait', dek: 'Haag from the spot and Shawal late; Tampines come from behind to beat the Young Lions 4–1.', body: roundup(4), img: '', status: 'live' },
    { id: 'n5', tag: 'Roundup', date: '2026-10-14', title: 'Matchweek 3: Geylang go top after seeing off Jurong', dek: 'Sahil and Racic turn it around at Our Tampines Hub; Jackson wins his first in charge of the Sailors.', body: roundup(3), img: '', status: 'live' },
    { id: "n7", tag: "Announcement", date: "2026-10-16", title: "FAS haze advisory: FA Cup final off", dek: "The FA Cup final and third-place play-off were called off because of haze, and FAS set out the limits for SPL matches.", body: "The FAS\u2013SPL Haze Management Protocol, drawn up with SportSG, decides whether matches go ahead based on the one-hour PM2.5 reading for each zone. SPL, Singapore Cup, SPL2 and international matches can be played up to a reading of 200 and are suspended or postponed above it.\n\nProfessional matches are checked from 12 hours before kick-off, with a final check 30 minutes before. For the SPL, Jalan Besar and Our Tampines Hub count as East, Jurong East as West and Bishan as Central.\n\nAmateur and youth football has stricter limits. With the West's PSI above 200, the FA Cup final and third-place play-off at Jurong East Stadium on 17 October did not go ahead and will be rescheduled.", img: '', status: 'live' },
    { id: "n8", tag: "Preview", date: "2026-10-23", title: "Matchweek 5: Top three look to extend unbeaten starts", dek: "Geylang, Tampines and the Sailors are all unbeaten going into the weekend.", body: "Tampines, the only side with a perfect record, visited FC Jurong, who had lost their last two. Hide Higashikawa led the scoring chart with four goals.\n\nThe Sailors hosted Tanjong Pagar, who had lost their last 20 competitive meetings with them. Bottom side Young Lions, on a four-game losing run, hosted Balestier, and Geylang closed the round against winless Hougang on Monday night.", img: '', status: 'live' },
    { id: "n9", tag: "Preview", date: "2026-10-15", title: "Matchweek 4: Jurong v Sailors headlines the weekend", dek: "Two title-chasing sides meet at Jurong East, and leaders Geylang go to Balestier.", body: "FC Jurong hosted the Sailors after their eight-game SPL winning run was ended by Geylang. The Sailors came in off a 1\u20130 ACL Two win at Tai Po but were without left-back Nur Adam Abdullah, who has a cruciate ligament injury.\n\nGeylang, perfect after three games, went to Balestier. The last five meetings between the two produced 32 goals. Tampines hosted Young Lions, having won their last five meetings, and Tanjong Pagar played Hougang on Friday.", img: '', status: 'live' },
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
  // Monthly awards (Hafiz, 5 Nov): a card per month, worked through shortlist, clips and write-ups, vote, announce.
  // October's shortlists are the ones in the app (top scorers from the results; goals from the roundups); clips are the SPL
  // channel's highlights of those matches, start and end times still to be set by FAS. Vote counts are the demo's placeholders.
  const seedPotm = () => ({ month: 'October', mkey: '2026-10', closes: '2026-11-09', open: true, winner: '', list: [
    { id: 'p1', name: 'Hide Higashikawa', team: 'TAM', n: 25, line: '4 goals', how: "Tanjong Pagar 0–4 Tampines 63'; Tampines 4–1 Young Lions 73', 90+7'; Jurong 2–3 Tampines 41'" },
    { id: 'p2', name: 'Matthias Phaeton', team: 'LCS', n: 23, line: '3 goals', how: "Sailors 6–1 Young Lions 74', 83'; Sailors 6–0 Tanjong Pagar 60'" },
    { id: 'p3', name: 'Hugo Gomes', team: 'LCS', n: 3, line: '2 goals', how: "Sailors 6–1 Young Lions 37'; Sailors 6–0 Tanjong Pagar 37'" },
    { id: 'p4', name: 'Giovanni Haag', team: 'LCS', n: 24, line: '2 goals', how: "Jurong 0–2 Sailors 41'; Sailors 6–0 Tanjong Pagar 87'" },
    { id: 'p5', name: 'Yang Hyeonju', team: 'GEY', n: 18, line: '2 goals', how: "Geylang 3–0 Hougang 45+2', 90+1'" }
  ], base: { p1: 1840, p2: 1312, p3: 655, p4: 590, p5: 702 } });
  const OCT_CLIPS = { g1: '5xO_KqatlIs', g2: '', g3: 'LPIRSVkUwSU', g4: '1Fkaos7SD_I', g5: 'xnJWW1HOpKo' };
  const seedAwards = () => ({ months: [
    { key: '2026-09', month: 'September', stage: 'announced', opens: '', closes: '', potm: { picks: [], winner: '' },
      gotm: { picks: [{ id: 'gs1', player: 'Lazar Vujanic', team: 'TPU', match: 'Balestier 3–4 Tanjong Pagar', min: '', how: '', clip: '', from: '', to: '' }], winner: 'gs1' } },
    { key: '2026-10', month: 'October', stage: 'voting', opens: '2026-11-02T10:00', closes: '2026-11-09T23:59',
      potm: { picks: seedPotm().list.map(x => Object.assign({ write: '' }, x)), winner: '' },
      gotm: { picks: seedGotm().goals.map(g => Object.assign({ clip: OCT_CLIPS[g.id] ? 'https://youtu.be/' + OCT_CLIPS[g.id] : '', from: '', to: '' }, g)), winner: '' } }] });
  // the section sponsor slots the app carries; empty partner shows [PARTNER]
  const SLOTS = { gotm: 'Goal of the Month', potm: 'Player of the Match', stats: 'Player stats', moments: 'Moments', live: 'Live match centre' };
  const seedSponsors = () => { const o = {}; Object.keys(SLOTS).forEach(k => { o[k] = { partner: '', from: '', to: '' }; }); return o; };
  // the partners screen after the splash: AIA as title partner, then the league's official partners in the order the
  // SPL's own partner strip lists them (supplied by the owner, 4 Nov 2026; logos cut from it into assets/partners/)
  // h: the height each mark is drawn at, so they read as the same size (a tall lockup gets more, a long wordmark less)
  const PL = [['Singapore Pools', 'singapore-pools', 60], ['adidas', 'adidas', 44], ['Trip.com', 'trip-com', 32], ['Dongfeng by Volt Auto', 'dongfeng', 42], ['MSIG', 'msig', 44], ['Polar', 'polar', 34], ['Playback', 'playback', 15], ['Pan Pacific Leasing Group', 'pan-pacific', 36]];
  const seedPartners = () => [{ name: 'AIA', tier: 'Title partner', logo: 'aia' }].concat(PL.map(([name, f, h]) => ({ name, tier: 'Official partner', logo: `assets/partners/${f}.png`, h })));
  const withClips = g => { g.goals.forEach(x => { x.clip = OCT_CLIPS[x.id] ? 'https://youtu.be/' + OCT_CLIPS[x.id] : ''; x.from = ''; x.to = ''; }); return g; };
  const DEF = () => ({ news: seedNews(), lead: 'n10', pushes: [], live: {}, gotm: withClips(seedGotm()), sponsors: seedSponsors(), partners: seedPartners(), partnerLook: 'light', staff: [], awards: seedAwards(), potm: seedPotm(), crowd: {} });

  const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
  const str = (x, d) => typeof x === 'string' ? x.slice(0, 4000) : d;
  function clean(d) {
    const def = DEF(), out = {};
    out.news = Array.isArray(d.news) ? d.news.filter(isObj).map(n => ({ id: str(n.id, 'n' + Math.random().toString(36).slice(2, 8)), tag: str(n.tag, 'News'), date: str(n.date, ''), title: str(n.title, ''), dek: str(n.dek, ''), body: str(n.body, ''), img: str(n.img, '') || NEWS_IMG[str(n.id, '')] || '', imgs: photos(n.imgs), match: Number.isInteger(n.match) && SPL.matches[n.match] ? n.match : null, at: Number.isFinite(+n.at) ? +n.at : 0, alert: !!n.alert, status: n.status === 'draft' || n.status === 'scheduled' ? n.status : 'live' })) : def.news.map(n => Object.assign({}, n, { img: n.img || NEWS_IMG[n.id] || '' }));
    out.lead = str(d.lead, def.lead);
    out.pushes = Array.isArray(d.pushes) ? d.pushes.filter(isObj).slice(-200).map(p => ({ id: str(p.id, ''), at: +p.at || 0, title: str(p.title, ''), body: str(p.body, ''), aud: str(p.aud, 'all'), kind: str(p.kind, 'manual'), story: str(p.story, ''), match: Number.isInteger(p.match) ? p.match : null })) : [];
    out.live = {};
    if (isObj(d.live)) Object.keys(d.live).forEach(k => { const L = d.live[k], i = +k; if (!isObj(L) || !SPL.matches[i]) return;
      out.live[i] = { phase: ['pre', '1H', 'HT', '2H', 'FT'].includes(L.phase) ? L.phase : 'pre', t0: +L.t0 || 0, base: +L.base || 0, sheet: !!L.sheet,
        ev: Array.isArray(L.ev) ? L.ev.filter(e => Array.isArray(e) && ['G', 'D', 'Y', 'R', 'S', 'HT', 'FT'].includes(e[3])).slice(0, 80).map(e => { e = e.slice(0, 10); if (e[8] != null && !SPL.clubs[e[8]]) e[8] = null; if (e[9] != null) e[9] = String(e[9]).slice(0, 40); return e; }) : [] }; });
    const g = isObj(d.gotm) ? d.gotm : {};
    out.gotm = { month: str(g.month, def.gotm.month), closes: str(g.closes, def.gotm.closes), open: g.open !== false, winner: str(g.winner, ''),
      goals: Array.isArray(g.goals) && g.goals.length ? g.goals.filter(isObj).slice(0, 8).map((x, j) => ({ id: str(x.id, 'g' + (j + 1)), player: str(x.player, ''), team: C[x.team] ? x.team : 'TAM', match: str(x.match, ''), min: str(x.min, ''), how: str(x.how, '') , clip: str(x.clip, '').slice(0, 200), from: str(x.from, '').slice(0, 8), to: str(x.to, '').slice(0, 8)})) : def.gotm.goals,
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
    // monthly awards: kept as the admin wrote them, with every text field capped; the app reads potm and gotm, which the admin keeps in step
    const pick = x => { const o = {}; Object.keys(x).slice(0, 16).forEach(k => { const v = x[k]; if (typeof v === 'string') o[k] = v.slice(0, 600); else if (typeof v === 'number') o[k] = v; }); return o; };
    const aw = isObj(d.awards) && Array.isArray(d.awards.months) ? d.awards : def.awards;
    out.awards = { months: aw.months.filter(isObj).slice(-24).map(m => ({ key: str(m.key, ''), month: str(m.month, ''), stage: ['shortlist', 'voting', 'announced'].includes(m.stage) ? m.stage : 'shortlist', opens: str(m.opens, ''), closes: str(m.closes, ''),
      potm: { picks: isObj(m.potm) && Array.isArray(m.potm.picks) ? m.potm.picks.filter(isObj).slice(0, 8).map(pick) : [], winner: isObj(m.potm) ? str(m.potm.winner, '') : '' },
      gotm: { picks: isObj(m.gotm) && Array.isArray(m.gotm.picks) ? m.gotm.picks.filter(isObj).slice(0, 8).map(pick) : [], winner: isObj(m.gotm) ? str(m.gotm.winner, '') : '' } })) };
    // Guess the crowd and attendance, per match: open for guesses, the prize, the official attendance and the winner
    out.crowd = {}; if (isObj(d.crowd)) Object.keys(d.crowd).forEach(k => { const x = d.crowd[k], i = +k; if (!isObj(x) || !SPL.matches[i]) return;
      const w = isObj(x.winner) ? { name: str(x.winner.name, '').slice(0, 24), guess: +x.winner.guess || 0, off: +x.winner.off || 0 } : null;
      out.crowd[i] = { open: !!x.open, prize: str(x.prize, '').slice(0, 80), attendance: Number.isInteger(x.attendance) ? x.attendance : null, guesses: +x.guesses || 0, winner: w, at: +x.at || 0 }; });
    const pm = isObj(d.potm) ? d.potm : def.potm;
    out.potm = { month: str(pm.month, def.potm.month), mkey: str(pm.mkey, def.potm.mkey), closes: str(pm.closes, ''), open: pm.open !== false, winner: str(pm.winner, ''),
      list: Array.isArray(pm.list) ? pm.list.filter(isObj).slice(0, 8).map(x => ({ id: str(x.id, ''), name: str(x.name, ''), team: C[x.team] ? x.team : 'TAM', n: +x.n || 0, line: str(x.line, ''), how: str(x.how, '') })) : def.potm.list, base: isObj(pm.base) ? pm.base : {} };
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
  return { KEY, EVK, SLOTS, IMG, picUrl, isOut, picsOf, read, write, update, reset, track, events, esc };
})();
