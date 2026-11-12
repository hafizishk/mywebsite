/* SPLNEWS: the newsroom's engine (Hafiz, 9 Nov). It follows the season as it unfolds and writes in the house style
   (docs/STYLE.md, measured from the PL's 2026/27 match reports):
   - results(D): every finished league game, the stored ones plus games finished in the matchday console
   - storylines(D): what the season is about right now: runs, the title race, the bottom, the scoring chart, milestones
   - postMatch(D, i) / preMatch(D, i): a draft report or preview built only from facts we hold, with the facts listed
   Placeholders in [BRACKETS] are for FAS to fill (near misses, saves, quotes): never invented. */
var SPLNEWS = (function () {
  'use strict';
  const C = SPL.clubs, NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const word = n => n >= 0 && n <= 9 ? NUM[n] : String(n), cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const ord = n => n + (n % 100 > 10 && n % 100 < 14 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'));
  const ordW = n => (['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'][n]) || ord(n);
  const ART = { LCS: 'the Sailors' };
  const H = k => C[k].short, S = k => ART[k] || C[k].short, F = k => C[k].name;
  // positions in words to tenth, then 11th (PL: "rise to seventh", "move up to 14th"); small numbers in words
  const posW = n => n <= 10 ? ordW(n) : ord(n), pts = n => `${word(n)} ${n === 1 ? 'point' : 'points'}`;
  const venue = v => String(v || '').replace(/ Stadium$/, '');
  // MW6's Sunday games (1 Nov), final, and their scorers; the stored scorer list stands before them (data/notes.md)
  const SUNDAY = { 22: [0, 4], 23: [0, 0] }, SUNDAY_GOALS = { 22: [['Shawal Anuar', '31', 'LCS'], ['Antonio Mance', '37', 'LCS', 'pen'], ['Matthias Phaeton', '81', 'LCS'], ['Lennart Thy', '85', 'LCS']] }; // spl.sg MW6 roundup
  const pname = (k, n) => ((SPL.squads[k] || []).find(p => p[0] === n) || [n, '#' + n])[1];
  const scoreOfEv = (m, ev) => { const s = [0, 0]; (ev || []).forEach(e => { if (e[3] === 'G') s[e[4] === m[2] ? 0 : 1]++; }); return s; };

  // ---------- the season so far ----------
  function results(D) {
    const live = (D && D.live) || {};
    return SPL.matches.map((m, i) => {
      const L = live[i];
      if (L && L.phase === 'FT') return { i, m, date: m[1], h: m[2], a: m[3], s: scoreOfEv(m, L.ev), ev: L.ev, console: true };
      if (m[4]) return { i, m, date: m[1], h: m[2], a: m[3], s: m[4], goals: m[6] };
      if (SUNDAY[i]) return { i, m, date: m[1], h: m[2], a: m[3], s: SUNDAY[i], goals: SUNDAY_GOALS[i] || [] };
      return null;
    }).filter(Boolean).sort((x, y) => x.date.localeCompare(y.date) || x.i - y.i);
  }
  const resFor = (R, k) => R.filter(r => r.h === k || r.a === k).map(r => { const home = r.h === k, f = home ? r.s[0] : r.s[1], a = home ? r.s[1] : r.s[0];
    return { r, opp: home ? r.a : r.h, home, f, a, res: f > a ? 'W' : f < a ? 'L' : 'D' }; });
  function table(R) {
    const t = {}; Object.keys(C).forEach(k => { t[k] = { k, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
    R.forEach(r => [[r.h, r.s[0], r.s[1]], [r.a, r.s[1], r.s[0]]].forEach(([k, f, a]) => { const x = t[k]; if (!x) return; x.p++; x.gf += f; x.ga += a; if (f > a) { x.w++; x.pts += 3; } else if (f === a) { x.d++; x.pts++; } else x.l++; }));
    return Object.values(t).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf).map((x, j) => Object.assign(x, { pos: j + 1 }));
  }
  // goals per player: the stored list (after MW6's Saturday), topped up with Sunday's and the console's
  function scorers(D, R) {
    const o = SPL.scorers.map(x => ({ name: x[0], club: x[1], g: x[2] }));
    const add = (name, club) => { const x = o.find(y => y.name === name); if (x) x.g++; };
    // MW6's Sunday goals, unless that game was loaded in the console (its goals are counted from there)
    const R0 = R || results(D); Object.keys(SUNDAY_GOALS).forEach(i => { if (R0.some(r => r.i === +i && r.console)) return; SUNDAY_GOALS[i].forEach(g => add(g[0], g[2])); });
    R0.filter(r => r.console).forEach(r => (r.ev || []).forEach(e => { if (e[3] === 'G' && e[7] !== 'og') { const n = pname(e[4], e[5]), x = o.find(y => y.name === n); if (x) x.g++; else o.push({ name: n, club: e[4], g: 1, partial: true }); } }));
    return o.sort((a, b) => b.g - a.g);
  }
  // a club's current run, newest first
  function run(list) {
    if (!list.length) return null; const last = list[list.length - 1].res; let n = 0;
    for (let j = list.length - 1; j >= 0 && list[j].res === last; j--) n++;
    let unb = 0; for (let j = list.length - 1; j >= 0 && list[j].res !== 'L'; j--) unb++;
    let winless = 0; for (let j = list.length - 1; j >= 0 && list[j].res !== 'W'; j--) winless++;
    let cs = 0; for (let j = list.length - 1; j >= 0 && list[j].a === 0; j--) cs++;
    return { last, n, unb, winless, cs };
  }

  // ---------- storylines: what the season is about right now ----------
  function storylines(D) {
    const R = results(D), T = table(R), sc = scorers(D, R), out = [];
    const add = (weight, kind, clubs, text, head) => out.push({ weight, kind, clubs, text, head });
    // the title race
    const [a, b] = T, gap = a.pts - b.pts, inHand = b.p - a.p;
    if (gap <= 1) add(95, 'title', [a.k, b.k], `${F(a.k)} lead the table on ${pts(a.pts)}${gap ? `, one ahead of ${S(b.k)}` : `, level with ${S(b.k)} on goal difference`}${inHand < 0 ? `, who have ${word(-inHand)} ${-inHand === 1 ? 'game' : 'games'} in hand` : ''}.`, `Title race: ${H(a.k)} ${gap ? 'a point clear' : 'top on goal difference'}`);
    else add(70, 'title', [a.k], `${F(a.k)} are ${word(gap)} points clear at the top on ${pts(a.pts)}${inHand < 0 ? `, though ${S(b.k)} have ${word(-inHand)} ${-inHand === 1 ? 'game' : 'games'} in hand` : ''}.`, `${H(a.k)} ${word(gap)} points clear`);
    const z = T[T.length - 1]; add(55, 'bottom', [z.k], `${F(z.k)} are bottom on ${pts(z.pts)} after ${word(z.p)} games.`, `${H(z.k)} bottom`);
    // the scoring chart
    const [p1, p2] = sc; if (p1) add(80, 'scorers', [p1.club], `${p1.name} leads the scoring charts on ${p1.g} goals${p2 ? `, ${p1.g - p2.g ? word(p1.g - p2.g) + ' clear of ' + p2.name : 'level with ' + p2.name}` : ''}.`, `${p1.name} leads the scoring charts on ${p1.g}`);
    // each club's run
    Object.keys(C).forEach(k => { const L = resFor(R, k), r = run(L); if (!r) return; const w = L.filter(x => x.res === 'W').length;
      if (r.last === 'W' && r.n >= 3) add(60 + r.n * 4, 'run', [k], `${F(k)} have won ${word(r.n)} league games in a row.`, `${H(k)} make it ${word(r.n).toUpperCase()} in a row`);
      else if (r.last === 'L' && r.n >= 3) add(58 + r.n * 4, 'run', [k], `${F(k)} have lost ${word(r.n)} league games in a row.`, `${H(k)}: ${word(r.n)} defeats in a row`);
      else if (r.winless >= 4) add(50 + r.winless * 3, 'run', [k], `${F(k)} are without a win in ${word(r.winless)} league games.`, `${H(k)} without a win in ${word(r.winless)}`);
      if (r.unb >= 5 && !(r.last === 'W' && r.n >= r.unb)) add(56 + r.unb, 'run', [k], `${F(k)} are unbeaten in ${word(r.unb)} league games.`, `${H(k)} unbeaten in ${word(r.unb)}`);
      if (r.cs >= 3) add(48 + r.cs, 'run', [k], `${F(k)} have kept ${word(r.cs)} clean sheets in a row.`, `${word(r.cs)} clean sheets in a row for ${H(k)}`);
      if (w === 1 && r.last === 'W' && r.n === 1) add(62, 'first', [k], `${F(k)} won for the first time this season in their last game.`, `${H(k)} off the mark`);
      const gf = L.reduce((t, x) => t + x.f, 0); if (gf >= 20 && gf - L[L.length - 1].f < Math.floor(gf / 10) * 10) add(50, 'milestone', [k], `${F(k)} have scored ${gf} league goals, the first side to reach ${Math.floor(gf / 10) * 10}.`.replace(', the first side to reach', T.filter(x => x.gf >= Math.floor(gf / 10) * 10).length === 1 ? ', the first side to reach' : ', reaching'), `${H(k)} reach ${Math.floor(gf / 10) * 10} goals`);
    });
    return out.sort((x, y) => y.weight - x.weight);
  }

  // ---------- writing: the PL's shape, our facts ----------
  const V = ['struck', 'fired', 'curled', 'drilled', 'turned in', 'slotted home', 'lashed in', 'swept home', 'headed in', 'tucked away'];
  const minuteIn = e => e[2] ? `in stoppage time${e[1] >= 90 ? '' : ' at the end of the first half'}` : `in the ${e[1] <= 10 ? ordW(e[1]) : ord(e[1])} minute`;
  const absMin = e => (e[1] || 0) + (e[2] || 0) / 100;
  function goalsOf(r) {
    if (r.ev) return r.ev.filter(e => e[3] === 'G').sort((x, y) => (x[0] - y[0]) || absMin(x) - absMin(y)).map(e => ({ e, team: e[4], who: pname(e[8] || e[4], e[5]), ast: e[6] ? pname(e[4], e[6]) : '', pen: e[7] === 'pen', og: e[7] === 'og', min: e[1], add: e[2] }));
    const inSq = (k, n) => (SPL.squads[k] || []).some(p => p[1] === n);
    return (r.goals || []).map(g => { const mm = String(g[1]).match(/(\d+)(?:\+(\d+))?/) || [0, 0, 0], other = g[2] === r.h ? r.a : r.h;
      return { team: g[2], who: g[0], ast: '', pen: g[3] === 'pen', og: !inSq(g[2], g[0]) && inSq(other, g[0]), min: +mm[1], add: +(mm[2] || 0), approx: !r.m[4] && !SUNDAY_GOALS[r.i] }; });
  }
  const who = g => g.og ? `an own goal from ${g.who}` : g.who;
  function postMatch(D, i) {
    const R = results(D), r = R.find(x => x.i === i); if (!r) return null;
    const m = r.m, [h, a] = [r.h, r.a], [sh, sa] = r.s, win = sh > sa ? h : sa > sh ? a : null, lose = win === h ? a : win === a ? h : null;
    const T = table(R), pos = k => T.find(x => x.k === k), before = table(R.filter(x => x !== r && (x.date < r.date || (x.date === r.date && x.i < r.i)))), posB = k => before.find(x => x.k === k);
    const G = goalsOf(r), facts = [], by = {}; G.forEach(g => { if (!g.og) by[g.who] = (by[g.who] || 0) + 1; });
    const multi = Object.entries(by).filter(([, n]) => n >= 2).sort((x, y) => y[1] - x[1])[0];
    const Lw = win && resFor(R.filter(x => x.date <= r.date), win), Ll = lose && resFor(R.filter(x => x.date <= r.date), lose);
    const rw = Lw && run(Lw), rl = Ll && run(Ll), firstWin = win && Lw.filter(x => x.res === 'W').length === 1;
    const sc = scorers(D, R), lead = sc[0], scoreTxt = `${Math.max(sh, sa)}-${Math.min(sh, sa)}`, ven = m[5];
    facts.push(`${H(h)} ${sh}-${sa} ${H(a)}, ${venue(ven)}`);
    // headline: one hook, at most one word in capitals
    let head, dek;
    const nm = s => s;
    if (!win) { head = sh + sa >= 4 ? `${H(h)} and ${H(a)} share the points in ${word(sh + sa)}-goal THRILLER` : sh === 0 ? `${H(h)} and ${H(a)} play out goalless draw` : `${H(h)} and ${H(a)} share the points`; }
    else if (rw && rw.n >= 3) head = `${H(win)} make it ${word(rw.n).toUpperCase()} in a row with win over ${H(lose)}`;
    else if (multi && multi[1] >= 3) head = `${nm(multi[0])} hat-trick fires ${H(win)} past ${H(lose)}`;
    else if (multi) head = `${nm(multi[0])} hits double as ${H(win)} beat ${H(lose)}`;
    else if (firstWin) head = `${H(win)} beat ${H(lose)} for first win of the season`;
    else if (pos(win).pos === 1 && posB(win) && posB(win).pos !== 1) head = `${H(win)} go TOP with victory over ${H(lose)}`;
    else if (rl && rl.n >= 3) head = `${H(win)} beat ${H(lose)} to inflict ${ordW(rl.n)} straight defeat`;
    else head = `${H(win)} beat ${H(lose)} at ${venue(ven)}`;
    const named = [...new Set(G.filter(g => !g.og).map(g => nm(g.who)))];
    dek = !G.length ? `Neither side could find a way through at ${venue(ven)}` : `${named.length > 1 ? named.slice(0, -1).join(', ') + ' and ' + named.slice(-1) : named[0] || 'An own goal'} on target as ${win ? `${H(win)} win ${scoreTxt}` : `the sides draw ${scoreTxt}`}${win ? ` and ${posB(win) && posB(win).pos === pos(win).pos ? 'stay ' + (pos(win).pos === 1 ? 'top' : posW(pos(win).pos)) : 'move up to ' + posW(pos(win).pos)}` : ''}`;
    // the top five
    const P = [];
    const firstScorer = multi ? multi[0] : (G.find(g => g.team === win && !g.og) || G[0] || {}).who;
    const conseq = win ? (rw && rw.n >= 3 ? `for a ${ordW(rw.n)} straight league win` : firstWin ? 'for their first win of the season' : rl && rl.n >= 3 ? `, condemning ${S(lose)} to a ${ordW(rl.n)} straight defeat` : pos(win).pos === 1 ? (posB(win) && posB(win).pos === 1 ? 'to stay top of the table' : 'to go top of the table') : posB(win) && posB(win).pos === pos(win).pos ? `to stay ${posW(pos(win).pos)}` : `to move up to ${posW(pos(win).pos)}`) : (sh + sa >= 4 ? 'in an entertaining draw' : '');
    const sp = c => c.startsWith(',') ? c : ' ' + c;
    if (win && firstScorer) P.push(`${firstScorer} ${multi ? (multi[1] >= 3 ? 'scored a hat-trick' : 'scored twice') : G[0] && G[0].who === firstScorer && G.length > 1 ? 'opened the scoring' : 'was on target'} as ${F(win)} beat ${F(lose)} ${scoreTxt} at ${ven}${sp(conseq)}.`);
    else if (win) P.push(`${F(win)} beat ${F(lose)} ${scoreTxt} at ${ven}${sp(conseq)}.`);
    else P.push(`${F(h)} and ${F(a)} drew ${sh}-${sa} at ${ven}${sh + sa ? (conseq ? ' ' + conseq : '') : ', with neither side able to find a breakthrough'}.`);
    const others = G.filter(g => g.who !== firstScorer || g.og), list = a => { const u = [...new Set(a.map(g => g.og ? `an own goal from ${g.who}` : g.who))]; return u.length > 1 ? u.slice(0, -1).join(', ') + ' and ' + u.slice(-1) : u[0]; };
    const mine = others.filter(g => g.team === (win || h)), theirs = others.filter(g => g.team !== (win || h));
    if (mine.length) P.push(`${cap(list(mine))} ${new Set(mine.map(g => g.who)).size > 1 ? 'were also on the scoresheet' : 'also found the net'}${win ? '' : ` for ${S(h)}`}.`);
    const levelled = theirs.length === 1 && (() => { const t = [0, 0]; for (const g of G) { t[g.team === h ? 0 : 1]++; if (g === theirs[0]) return t[0] === t[1]; } return false; })();
    if (theirs.length) P.push(levelled ? `${cap(list(theirs))} had drawn ${S(theirs[0].team)} level in between.` : `${cap(list(theirs))} scored for ${S(win ? lose : a)}.`);
    const reds = (r.ev || []).filter(e => e[3] === 'R'), vars = (r.ev || []).filter(e => e[3] === 'D');
    reds.forEach(e => { P.push(`${pname(e[4], e[5])} was sent off ${minuteIn(e)}, leaving ${S(e[4])} with 10 men.`); facts.push(`Red card: ${pname(e[4], e[5])} (${H(e[4])})`); });
    if (vars.length) P.push(`${vars.length === 1 ? `${cap(S(vars[0][4]))} had a goal ruled out by VAR` : `VAR ruled out ${word(vars.length)} goals`}${vars[0][9] ? ' for ' + vars[0][9] : ''}.`);
    // where they stand
    const tl = k => `${cap(S(k))} ${pos(k).pos === 1 ? (posB(k) && posB(k).pos === 1 ? 'stay top' : 'go top') : (posB(k) && posB(k).pos > pos(k).pos ? 'move up to ' : posB(k) && posB(k).pos < pos(k).pos ? 'drop to ' : 'stay ') + posW(pos(k).pos)} on ${pts(pos(k).pts)}`;
    if (win) P.push(`${tl(win)}, while ${S(lose)} ${pos(lose).pos === T.length ? 'remain bottom' : 'are ' + posW(pos(lose).pos)} on ${pts(pos(lose).pts)}.`); else P.push(`${tl(h)}, with ${S(a)} ${posW(pos(a).pos)} on ${pts(pos(a).pts)}.`);
    if (lead && G.some(g => g.who === lead.name)) { P.push(`${lead.name} moves on to ${lead.g} for the season, top of the scoring charts.`); facts.push(`Top scorer: ${lead.name}, ${lead.g}`); }
    // how the match unfolded, in order. We know who, when and the score, not how: the goal is told by what it did
    // to the score ("put the Sailors ahead", "doubled their lead"); FAS adds the finish and the chances.
    const U = [], run2 = [0, 0], seen = new Set(), sur = n => { if (seen.has(n)) { const w = n.split(' '); return ['Kim', 'Yang', 'Cho', 'Lee', 'Seo', 'Song', 'Park', 'Woo', 'Xia', 'Hariss', 'Shawal', 'Hami', 'Faris', 'Ilhan', 'Irfan'].includes(w[0]) ? w[0] : w.slice(-1)[0]; } seen.add(n); return n; };
    if (firstScorer) seen.add(firstScorer);
    let prev = null;
    const evs = r.ev ? r.ev.filter(e => ['G', 'R', 'D'].includes(e[3])).sort((x, y) => (x[0] - y[0]) || absMin(x) - absMin(y)) : G.map(g => [g.min > 45 ? 2 : 1, g.min, g.add, 'G', g.team, null, null, null, null, null, g]);
    evs.forEach(e => {
      const g = e[10] || (e[3] === 'G' ? G.find(x => x.e === e) : null), gap = prev ? Math.round(absMin(e) - absMin(prev)) : 99;
      const when = prev && e[0] === prev[0] && gap >= 1 && gap <= 10 && !e[2] ? `${word(gap)} ${gap === 1 ? 'minute' : 'minutes'} later` : (g && g.approx ? (e[1] < 40 ? 'in the first half' : e[1] <= 45 ? 'before the break' : e[1] < 75 ? 'after the break' : 'late on') : e[2] && e[1] <= 45 ? 'in first-half stoppage time' : minuteIn(e));
      if (e[3] === 'G') { const side = g.team === h ? 0 : 1, them = 1 - side, was = run2.slice(); run2[side]++;
        const k = S(g.team), lead = run2[side] - run2[them], before = was[side] - was[them];
        const did = before === 0 && lead === 1 ? (was[side] === 0 ? `put ${k} ahead` : `put ${k} back in front`) : before === -1 && lead === 0 ? `drew ${k} level` : before < -1 ? `pulled one back for ${k}` : lead === 2 && before === 1 ? 'doubled the lead' : `made it ${Math.max(...run2)}-${Math.min(...run2)}`;
        U.push(g.og ? `${cap(when)}, ${sur(g.who)} turned the ball into his own net to ${did.replace(/^put /, 'put ').replace(/^made it/, 'make it').replace(/^doubled/, 'double').replace(/^drew/, 'draw').replace(/^pulled/, 'pull')}.` :
          g.pen ? `${sur(g.who)} ${did} from the penalty spot ${when}${g.ast ? ` after ${g.ast} was brought down` : ''}.` :
          `${sur(g.who)} ${did} ${when}${g.ast ? `, set up by ${g.ast}` : ''}.`); }
      else if (e[3] === 'R') U.push(`${pname(e[4], e[5])} was shown a red card ${when}, leaving ${S(e[4])} with 10 men.`);
      else if (e[3] === 'D') U.push(`${pname(e[4], e[5])} thought he had scored ${when}, but the goal was ruled out by VAR${e[9] ? ' for ' + e[9] : ''}.`);
      prev = e; });
    U.push('[HOW THE GOALS WERE SCORED, AND A CHANCE, SAVE OR WOODWORK]');
    const x = D && D.crowd && D.crowd[i]; if (x && x.attendance) facts.push(`Crowd ${x.attendance.toLocaleString()}`);
    if (rw && rw.n >= 2) facts.push(`${H(win)}: ${word(rw.n)} wins in a row`); if (rl && rl.n >= 2) facts.push(`${H(lose)}: ${word(rl.n)} defeats in a row`);
    facts.push(`Table: ${[win || h, lose || a].map(k => H(k) + ' ' + ord(pos(k).pos)).join(', ')}`);
    const body = P.join('\n\n') + '\n\nHow the match unfolded\n\n' + U.join('\n\n');
    const story = storylines(D).filter(s => s.clubs.some(k => k === h || k === a)).slice(0, 4);
    return { head, dek, body, facts, story, words: body.split(/\s+/).length, approx: G.some(g => g.approx) };
  }

  function preMatch(D, i) {
    const R = results(D), m = SPL.matches[i], [h, a] = [m[2], m[3]], T = table(R), pos = k => T.find(x => x.k === k);
    const fh = resFor(R, h), fa = resFor(R, a), rh = run(fh), ra = run(fa), sc = scorers(D, R);
    const top = k => sc.filter(x => x.club === k)[0], facts = [], P = [];
    const tied = pos(h).pts === pos(a).pts;
    P.push(`${tied ? `Two sides level on ${pts(pos(h).pts)} meet` : `${F(h)}, ${posW(pos(h).pos)}, host ${F(a)}, ${posW(pos(a).pos)},`} at ${m[5]}${tied ? '' : ` with ${Math.abs(pos(h).pts - pos(a).pts) === 1 ? 'a point' : word(Math.abs(pos(h).pts - pos(a).pts)) + ' points'} between them`}.`);
    const form = (k, r, L) => { if (!r) return ''; const last = L[L.length - 1];
      return cap(r.last === 'W' && r.n >= 2 ? `${S(k)} have won ${word(r.n)} in a row` : r.last === 'L' && r.n >= 2 ? `${S(k)} have lost ${word(r.n)} in a row` : r.winless >= 3 ? `${S(k)} are without a win in ${word(r.winless)}` : `${S(k)} ${last.res === 'W' ? 'won' : last.res === 'D' ? 'drew' : 'lost'} ${Math.max(last.f, last.a)}-${Math.min(last.f, last.a)} ${last.res === 'D' ? 'with' : last.res === 'W' ? 'against' : 'to'} ${S(last.opp)} last time out`); };
    const th = top(h), ta = top(a);
    P.push(`${form(h, rh, fh)}${th ? `, with ${th.name} on ${word(th.g)} ${th.g === 1 ? 'goal' : 'goals'}` : ''}, while ${form(a, ra, fa).replace(/^The /, 'the ')}${ta ? ` and ${ta.name} has ${word(ta.g)}` : ''}.`);
    const past = ((SPL.h2hPast || {})[[h, a].sort().join('|')] || []).concat(R.filter(r => (r.h === h && r.a === a) || (r.h === a && r.a === h)).map(r => [r.date, r.h, r.s[0], r.a, r.s[1]])).sort((x, y) => y[0].localeCompare(x[0]));
    if (past[0]) { const [d, ph, ps, pa, pas] = past[0], mo = new Date(d + 'T12:00').toLocaleDateString('en-GB', { month: 'long' }); P.push(ps === pas ? `The last meeting finished ${ps}-${pas} in ${mo}.` : `The last meeting went ${S(ps > pas ? ph : pa)}'s way, ${Math.max(ps, pas)}-${Math.min(ps, pas)} in ${mo}.`); facts.push(`Last meeting: ${H(ph)} ${ps}-${pas} ${H(pa)}`); }
    facts.unshift(`Table: ${H(h)} ${ord(pos(h).pos)}, ${pos(h).pts} pts · ${H(a)} ${ord(pos(a).pos)}, ${pos(a).pts} pts`);
    facts.push(`Form: ${H(h)} ${fh.slice(-5).map(x => x.res).join(' ')} · ${H(a)} ${fa.slice(-5).map(x => x.res).join(' ')}`);
    if (th || ta) facts.push(`Scorers: ${[th, ta].filter(Boolean).map(x => `${x.name.split(' ').slice(-1)} ${x.g}`).join(' · ')}`);
    const story = storylines(D).filter(s => s.clubs.some(k => k === h || k === a)).slice(0, 3);
    return { head: `${H(h)} v ${H(a)}: preview`, dek: P[0], body: P.join(' '), facts, story };
  }

  // ---------- the matchweek roundup, in spl.sg's own format (its MW3–6 roundups, 2026/27) ----------
  // "SINGAPORE, 2 NOVEMBER 2026 – " intro, then per game: a nickname headline, "Home 1-1 Away | Venue | 30 October",
  // the scorers, the goals in order, and Facts (red cards). We hold who, when and the score; FAS adds how.
  const NICK = { GEY: 'Eagles', TAM: 'Stags', LCS: 'Sailors', JUR: 'White Swans', BKF: 'Tigers', TPU: 'Jaguars', HGU: 'Cheetahs', YLS: 'Young Lions' };
  const VEN = v => String(v || '').replace(/ Stadium$/, '');
  const dayMonth = d => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  function roundup(D, mw) {
    const R = results(D), all = R.filter(r => r.m[0] === mw && !(r.m[7] || '').startsWith('Postponed')); if (!all.length) return null;
    const used = new Set(), blocks = [], clauses = [];
    all.forEach(r => {
      const pm = postMatch(D, r.i); if (!pm) return;
      const [sh, sa] = r.s, h = r.h, a = r.a, win = sh > sa ? h : sa > sh ? a : null, lose = win ? (win === h ? a : h) : null;
      const Rb = R.filter(x => x.date < r.date || (x.date === r.date && x.i < r.i)), T0 = table(Rb), T1 = table(R.filter(x => x.date < r.date || (x.date === r.date && x.i <= r.i)));
      const rw = win && run(resFor(R.filter(x => x.date <= r.date), win)), firstW = win && resFor(R.filter(x => x.date <= r.date), win).filter(x => x.res === 'W').length === 1;
      const Tend = table(R.filter(x => x.m[0] <= mw)), top = win && T1[0].k === win && T0[0].k !== win && Tend[0].k === win, derby = [h, a].sort().join() === 'GEY,TAM';
      const opts = !win ? (derby ? ['Eastern Derby ends all square'] : sh === 0 ? [`Honours even between ${H(h)} and ${H(a)}`] : [`${NICK[h]} and ${NICK[a]} share the spoils`, `${H(h)} and ${H(a)} share the spoils`])
        : firstW ? [`${H(win)} claim first win of the season`] : top ? [`${H(win)} return to SPL summit`, `${H(win)} go top with win over ${H(lose)}`]
        : Math.abs(sh - sa) >= 4 ? [`${H(win)} run riot against ${NICK[lose]}`] : rw && rw.n >= 3 && rw.n === resFor(R.filter(x => x.date <= r.date), win).length ? [`${NICK[win]} keep perfect record intact`]
        : rw && rw.n >= 3 ? [`${H(win)} make it ${word(rw.n)} in a row`] : [`${H(win)} see off ${H(lose)}`, `${H(win)} overcome the ${NICK[lose]}`, `${H(win)} brush aside ${H(lose)}`];
      const head = opts.find(o => !used.has(o.split(' ')[1])) || opts[0]; used.add(head.split(' ')[1]);
      const goals = goalsOf(r), by = {}; goals.forEach(g => { (by[g.team] = by[g.team] || {}); const k = g.who; (by[g.team][k] = by[g.team][k] || []).push(`${g.og ? 'O.G. ' : g.pen ? 'pen. ' : ''}${g.add ? g.min + '+' + g.add : g.min}’`); });
      const sideStr = k => Object.entries(by[k] || {}).map(([n, ms]) => `${n} ${ms.join(', ')}`).join(', ');
      const scorers = [sideStr(h), sideStr(a)].filter(Boolean).join(' | ');
      const [top5, unf] = pm.body.split('\n\nHow the match unfolded\n\n'), paras = [top5.split('\n\n')[0]].concat((unf || '').split('\n\n').filter(p => p && !p.startsWith('[')));
      const reds = (r.ev || []).filter(e => e[3] === 'R').map(e => `Red Card – ${pname(e[4], e[5])} (${H(e[4])}) ${e[2] ? e[1] + '+' + e[2] : e[1]}’`);
      // photos where spl.sg puts them: one under the fixture line, a second part-way through when there's room
      const withPh = paras.length >= 3 ? [...paras.slice(0, 2), '[PHOTO]', ...paras.slice(2)] : paras;
      blocks.push([head, `${H(h)} ${sh}-${sa} ${H(a)} | ${VEN(r.m[5])} | ${dayMonth(r.date)}`, scorers, '[PHOTO]', ...withPh, '[HOW THE GOALS CAME, AND A CHANCE OR SAVE]', ...(reds.length ? ['Facts', ...reds] : [])].filter(Boolean).join('\n\n'));
      clauses.push(!win ? (derby ? `${F(h)} and ${F(a)} played out ${sh ? 'a ' + sh + '-' + sa + ' draw' : 'a goalless stalemate'} in the Eastern Derby` : `${F(h)} and ${F(a)} ${sh ? 'shared the points in a ' + sh + '-' + sa + ' draw' : 'played out a goalless draw'}`)
        : firstW ? `${F(win)} picked up a first victory of the season against ${F(lose)}` : top ? `${F(win)} went top with a win over ${F(lose)}` : `${F(win)} beat ${F(lose)} ${Math.max(sh, sa)}-${Math.min(sh, sa)}`);
    });
    const last = all[all.length - 1].date, pub = new Date(new Date(last + 'T12:00:00').getTime() + 864e5).toISOString().slice(0, 10);
    const intro = `SINGAPORE, ${new Date(pub + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()} – ${clauses.slice(0, 2).join(', while ')}.${clauses.length > 2 ? ' ' + cap(clauses.slice(2).join(', while ')) + '.' : ''} We recap all the action here…`;
    return { head: `2026/27 Singapore Premier League Matchweek ${mw}: Roundup`, dek: clauses[0] ? cap(clauses[0]) + '.' : '', body: [intro, ...blocks].join('\n\n'), mw, games: all.length };
  }
  // ---------- the matchweek preview, in spl.sg's format (its MW3–6 previews, 2026/27) ----------
  // Title on the round's big game; two-sentence intro; per game a headline, the case in a few short paragraphs, a photo
  // part-way through, and the fixture and broadcast line.
  function mwPreview(D, mw) {
    const R = results(D), T = table(R), pos = k => T.find(x => x.k === k);
    const games = SPL.matches.map((m, i) => ({ m, i })).filter(x => x.m[0] === mw && !(x.m[7] || '').startsWith('Postponed') && !R.some(r => r.i === x.i));
    if (!games.length) return null;
    const hook = g => { const [h, a] = [g.m[2], g.m[3]], ph = pos(h), pa = pos(a), lh = resFor(R, h), la = resFor(R, a), rh = run(lh), ra = run(la);
      const derby = [h, a].sort().join() === 'GEY,TAM', topTwo = Math.max(ph.pos, pa.pos) <= 2, wl = (k, L) => L.length && !L.some(x => x.res === 'W');
      const score = (derby ? 50 : 0) + (topTwo ? 40 : 0) + (12 - ph.pos - pa.pos);
      const head = derby ? 'Eastern Derby takes centre stage' : topTwo ? `Top two meet as ${NICK[h]} host ${NICK[a]}` : wl(h, lh) && wl(a, la) ? `${H(h)} and ${H(a)} chase a first win` : wl(h, lh) ? `${H(h)} seek a first win against ${H(a)}` : wl(a, la) ? `${H(a)} seek a first win at ${H(h)}`
        : rh && rh.last === 'L' && rh.n >= 2 && ra && ra.last === 'L' && ra.n >= 1 ? `Wounded ${NICK[h]} and ${NICK[a]} face off` : (rh && rh.last === 'W' && rh.n >= 2) ? `${H(h)} look to make it ${word(rh.n + 1)} in a row` : (ra && ra.last === 'W' && ra.n >= 2) ? `${H(a)} look to make it ${word(ra.n + 1)} in a row` : `${NICK[h]} welcome the ${NICK[a]}`;
      return { score, head, derby }; };
    const G = games.map(g => Object.assign(g, hook(g))), big = G.slice().sort((x, y) => y.score - x.score)[0];
    const kick = m => { const t = String(m[7] || '').match(/(\d+)\.(\d+)\s*(AM|PM)/i); return t ? `${t[1]}:${t[2]}${t[3].toLowerCase()}` : '7:30pm'; };
    const blocks = G.map(g => { const pm = preMatch(D, g.i), sent = pm.body.split(/(?<=\.)\s+/);
      const paras = sent.length > 2 ? [sent.slice(0, 2).join(' '), '[PHOTO]', sent.slice(2).join(' ')] : [sent.join(' '), '[PHOTO]'];
      const when = new Date(g.m[1] + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^(\w+) /, '$1, ');
      // the form and suspension line (Hafiz, 12 Nov): wins in the last five for both, and anyone sent off in his club's last game
      const [h, a] = [g.m[2], g.m[3]], last5 = k => resFor(R, k).slice(-5), wins = k => last5(k).filter(x => x.res === 'W').length;
      const wn = n => n === 0 ? 'no wins' : n === 1 ? 'one win' : word(n) + ' wins';
      const formL = last5(h).length && last5(a).length ? `${cap(S(h))} have ${wn(wins(h))} in their last ${word(last5(h).length)}; ${S(a)} ${wins(a) === wins(h) ? 'the same' : 'have ' + wn(wins(a)).replace(/ wins?$/, '')}.` : '';
      const banned = [h, a].map(k => { const lg = resFor(R, k).slice(-1)[0]; if (!lg) return null; const r = lg.r;
        const ev = (r.ev || []).filter(e => e[3] === 'R' && e[4] === k).map(e => pname(e[4], e[5]));
        const dr = (SPL.reds || []).filter(x => x[0] === r.date && x[1] === r.h && x[2] === r.a && x[3] === k).map(x => x[4]);
        const who = [...new Set(ev.concat(dr))]; if (!who.length) return null; const opp = r.h === k ? r.a : r.h;
        return `${who.join(' and ')} ${who.length > 1 ? 'are' : 'is'} set to miss out for ${S(k)} after ${who.length > 1 ? 'their red cards' : 'his red card'} against ${S(opp)}.`; }).filter(Boolean);
      const extra = [formL, ...banned].filter(Boolean).join(' ');
      return [g.head, ...paras, extra || '[A LINE ON FORM, A KEY PLAYER OR A SUSPENSION]', `${F(g.m[2])} vs ${F(g.m[3])} | ${when} | ${kick(g.m)} | ${g.m[5]} | Watch on YouTube or meWATCH`].join('\n\n'); });
    const [a, b] = [big.m[2], big.m[3]], others = G.filter(g => g !== big);
    const lead = pos(a).pos < pos(b).pos ? a : b, gap = Math.abs(pos(a).pts - pos(b).pts);
    const intro = (big.derby ? `A clash between Eastern rivals ${F(a)} and ${F(b)} headlines Matchweek ${mw} of the 2026/27 Singapore Premier League (SPL)` : `${F(a)}, ${posW(pos(a).pos)}, host ${F(b)}, ${posW(pos(b).pos)}, in the game that headlines Matchweek ${mw} of the 2026/27 Singapore Premier League (SPL)`) + `, with ${gap ? (gap === 1 ? 'a point' : word(gap) + ' points') + ' between them' : 'the two level on points'}${pos(lead).pos === 1 ? ' and top spot on the line' : ''}.` +
      (others.length ? ` Elsewhere, ${others.map(g => `${F(g.m[2])} host ${F(g.m[3])}`).join(others.length > 2 ? ', ' : ' and ').replace(/, ([^,]*)$/, ' and $1')}.` : '');
    return { head: `SPL 2026/27 Matchweek ${mw}: ${big.head}`, dek: `${big.derby ? 'The Eastern Derby' : `${H(a)} v ${H(b)}`}, plus ${others.map(g => `${H(g.m[2])} v ${H(g.m[3])}`).join(', ').replace(/, ([^,]*)$/, ' and $1') || 'the rest of the round'}: all you need to know.`, body: ['[PHOTO]', intro, ...blocks].join('\n\n').replace(/^\[PHOTO\]\n\n/, ''), mw, games: G.length };
  }
  const nextMw = D => { const R = results(D), up = SPL.matches.map((m, i) => ({ m, i })).filter(x => !(x.m[7] || '').startsWith('Postponed') && !R.some(r => r.i === x.i)); return up.length ? Math.min(...up.map(x => x.m[0])) : null; };
  const latestMw = D => { const R = results(D).filter(r => !(r.m[7] || '').startsWith('Postponed')); return R.length ? Math.max(...R.map(r => r.m[0])) : null; };

  // a short story from a storyline, for the newsroom
  function storyDraft(D, s) {
    const R = results(D), k = s.clubs[0], L = resFor(R, k), last = L.slice(-6).reverse().map(x => `${x.res === 'W' ? 'beat' : x.res === 'D' ? 'drew with' : 'lost to'} ${S(x.opp)} ${Math.max(x.f, x.a)}-${Math.min(x.f, x.a)}`);
    const body = [s.text, last.length ? `Their last ${word(Math.min(6, last.length))}: ${last.join(', ')}.` : '', '[CONTEXT: QUOTE, NEXT FIXTURE OR HISTORY]'].filter(Boolean).join('\n\n');
    return { head: s.head, dek: s.text, body };
  }
  // who a note is about (Hafiz, 10 Nov, option C): the official writes freely; on Add, names are matched to the two
  // squads. A tag is 'CLUB:num' when sure, or '?word|CLUB:num|CLUB:num' when a name fits more than one player.
  const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const NOTNAME = new Set(['the', 'and', 'for', 'from', 'with', 'shot', 'save', 'saved', 'goal', 'box', 'bar', 'post', 'head', 'header', 'headed', 'corner', 'free', 'kick', 'cross', 'ball', 'area', 'wide', 'late', 'over', 'off', 'his', 'her', 'own', 'pen', 'card', 'line', 'yard', 'yards', 'near', 'far', 'top', 'low', 'high', 'left', 'right']);
  const near = (a, b) => { if (a === b) return true; if (a.length < 5 || Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, e = 0; while (i < a.length && j < b.length) { if (a[i] === b[j]) { i++; j++; continue; } if (++e > 1) return false; if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; } } return e + (a.length - i) + (b.length - j) <= 1; };
  function tagNames(text, clubs) {
    const toks = fold(text).split(/[^a-z']+/).map(t => t.replace(/'s$|'/g, '')).filter(t => t.length > 2 && !NOTNAME.has(t));
    const ps = []; clubs.forEach(k => (SPL.squads[k] || []).forEach(p => ps.push({ k, n: p[0], parts: fold(p[1]).split(/[\s-]+/).filter(w => w.length > 2) })));
    const hits = toks.map(t => ps.filter(p => p.parts.some(w => w === t)).concat(ps.filter(p => !p.parts.some(w => w === t) && p.parts.some(w => near(t, w)))));
    // exact before fuzzy: if any exact match exists for a token, drop the near ones
    const best = toks.map((t, x) => { const ex = hits[x].filter(p => p.parts.includes(t)); return ex.length ? ex : hits[x]; });
    const out = [], used = new Set(), key = p => p.k + ':' + p.n;
    // two tokens naming the same player ("joshua pereira") settle it
    best.forEach((h, x) => { if (x && h.length > 1) { const both = h.filter(p => best[x - 1].includes(p)); if (both.length === 1) { best[x] = both; best[x - 1] = both; } } });
    best.forEach((h, x) => { if (!h.length) return; if (h.length === 1) { if (!used.has(key(h[0]))) { used.add(key(h[0])); out.push(key(h[0])); } return; }
      if (h.length <= 4 && !h.some(p => used.has(key(p)))) { const q = '?' + toks[x] + '|' + h.map(key).join('|'); if (!out.includes(q)) out.push(q); } });
    return out.slice(0, 8);
  }
  const POSW = { GK: 'goalkeeper', DF: 'defender', MF: 'midfielder', FW: 'forward' };
  const tagged = t => { const [k, n] = String(t).split(':'), p = (SPL.squads[k] || []).find(x => x[0] === +n); return p ? { name: p[1], club: F(k), short: H(k), k, shirt: p[0], position: POSW[p[2]] } : null; };
  // a note for the writer: the line, then who it is about; an unsettled name is flagged so it is not used
  const noteLine = ([m, t, tags]) => { const who = (tags || []).filter(x => x[0] !== '?').map(tagged).filter(Boolean), open = (tags || []).filter(x => x[0] === '?').map(x => x.slice(1).split('|')[0]);
    return `${m}': ${t}${who.length ? ` [who: ${who.map(p => `${p.name} (${p.club}, ${p.position}, #${p.shirt})`).join('; ')}]` : ''}${open.length ? ` [not sure who "${open.join('", "')}" is: do not name them]` : ''}`; };

  // the background a report writer needs, all worked out after the result (Hafiz, 10 Nov): the table, each side's last
  // five and runs, the season tally of everyone who scored, earlier meetings, and who the officials' notes are about
  function context(D, i, notes) {
    const R = results(D), r = R.find(x => x.i === i); if (!r) return null;
    const upTo = R.filter(x => x.date < r.date || (x.date === r.date && x.i <= r.i)), before = upTo.filter(x => x !== r);
    const T = table(upTo), T0 = table(before), sc = scorers(D, upTo);
    const row = (t, k) => { const x = t.find(y => y.k === k); return { position: x.pos, played: x.p, won: x.w, drawn: x.d, lost: x.l, goals_for: x.gf, goals_against: x.ga, points: x.pts }; };
    const side = k => { const L = resFor(upTo, k), ru = run(L) || {};
      return { club: F(k), table_before: row(T0, k), table_after: row(T, k),
        last_five_including_this: L.slice(-5).map(x => `${x.res} ${x.home ? 'v' : 'at'} ${H(x.opp)} ${x.f}-${x.a} (${x.r.date})`),
        unbeaten_run: ru.unb || 0, winless_run: ru.winless || 0, clean_sheets_in_a_row: ru.cs || 0, league_games_won_this_season: L.filter(x => x.res === 'W').length }; };
    const G = goalsOf(r), names = [...new Set(G.filter(g => !g.og).map(g => g.who))];
    const meetings = before.filter(x => [x.h, x.a].sort().join() === [r.h, r.a].sort().join()).map(x => `${x.date}: ${H(x.h)} ${x.s[0]}-${x.s[1]} ${H(x.a)}`);
    // names in the officials' notes, matched to the two squads (surname or first name, whole word)
    // who the notes name: the official's tags (older notes without tags are matched now)
    const people = []; (notes || []).forEach(nt => (Array.isArray(nt[2]) ? nt[2] : tagNames(nt[1], [r.h, r.a])).forEach(t => { const p = t[0] !== '?' && tagged(t); if (p && !people.some(x => x.name === p.name)) people.push({ name: p.name, club: p.club, shirt: p.shirt, position: p.position }); }));
    return { table_after_this_game: T.map(x => `${x.pos}. ${F(x.k)} P${x.p} ${x.pts} pts, GD ${x.gf - x.ga > 0 ? '+' : ''}${x.gf - x.ga}`),
      home_side: side(r.h), away_side: side(r.a),
      scorers_season_tally_after_this_game: names.map(n => { const x = sc.find(y => y.name === n); const now = G.filter(g => g.who === n && !g.og).length; return x && !x.partial ? { player: n, league_goals_this_season: x.g, of_which_this_game: now, top_of_the_scoring_chart: sc[0].g === x.g } : { player: n, of_which_this_game: now, season_tally: 'not on record (only the top of the scoring chart is stored), so do not say how many he has this season or that it was his first' }; }),
      top_scorers_after_this_game: sc.slice(0, 5).map(x => `${x.name} (${H(x.club)}) ${x.g}`),
      earlier_meetings_this_season: meetings, players_named_in_notes: people };
  }
  // what the AI writer gets for a matchweek roundup (Hafiz, 10 Nov, option A): each game in date order with the lines
  // spl.sg's format fixes (score line, scorers, red cards), what happened, the official's notes and the background
  function roundupFacts(D, mw) {
    const R = results(D), all = R.filter(r => r.m[0] === mw && !(r.m[7] || '').startsWith('Postponed')); if (!all.length) return null;
    const last = all[all.length - 1].date, pub = new Date(new Date(last + 'T12:00:00').getTime() + 864e5);
    const mn = e => e[2] ? `${e[1]}+${e[2]}` : String(e[1]);
    return { competition: 'AIA Singapore Premier League 2026/27', matchweek: mw, dateline: `SINGAPORE, ${pub.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}`,
      table_after_the_matchweek: table(R.filter(x => x.m[0] <= mw)).map(x => `${x.pos}. ${F(x.k)} P${x.p} ${x.pts} pts, GD ${x.gf - x.ga > 0 ? '+' : ''}${x.gf - x.ga}`),
      top_scorers_after_the_matchweek: scorers(D, R.filter(x => x.m[0] <= mw)).slice(0, 5).map(x => `${x.name} (${H(x.club)}) ${x.g}`),
      games: all.map(r => { const [h, a] = [r.h, r.a], goals = goalsOf(r), by = {};
        goals.forEach(g => { (by[g.team] = by[g.team] || {}); (by[g.team][g.who] = by[g.team][g.who] || []).push(`${g.og ? 'O.G. ' : g.pen ? 'pen. ' : ''}${g.add ? g.min + '+' + g.add : g.min}’`); });
        const side = k => Object.entries(by[k] || {}).map(([n, ms]) => `${n} ${ms.join(', ')}`).join(', ');
        const ev = (r.ev || []).filter(e => ['G', 'D', 'Y', 'R', 'S'].includes(e[3])).map(e => { const k = e[4];
          if (e[3] === 'G') return `${mn(e)}' ${e[7] === 'og' ? 'own goal by ' + pname(e[8] || k, e[5]) + ' for ' + F(k) : e[7] === 'pen' ? 'penalty scored by ' + pname(k, e[5]) + ' (' + F(k) + ')' : 'goal, ' + pname(k, e[5]) + ' (' + F(k) + ')' + (e[6] ? ', assist ' + pname(k, e[6]) : '')}`;
          if (e[3] === 'D') return `${mn(e)}' goal by ${pname(k, e[5])} (${F(k)}) ruled out after a VAR review${e[9] ? ' for ' + e[9] : ''}`;
          if (e[3] === 'S') return `${mn(e)}' substitution, ${F(k)}: ${pname(k, e[5])} on, ${pname(k, e[6])} off`;
          return `${mn(e)}' ${e[3] === 'Y' ? 'yellow' : 'red'} card, ${pname(k, e[5])} (${F(k)})`; });
        const reds = (r.ev || []).filter(e => e[3] === 'R').map(e => `Red Card – ${pname(e[4], e[5])} (${H(e[4])}) ${mn(e)}’`);
        const raw = (D.live && D.live[r.i] && D.live[r.i].notes) || [], notes = raw.map(noteLine), ctx = context(D, r.i, raw);
        return { home: F(h), away: F(a), score: `${H(h)} ${r.s[0]}-${r.s[1]} ${H(a)}`, ground: r.m[5],
          copy_these_lines_exactly: { score_line: `${H(h)} ${r.s[0]}-${r.s[1]} ${H(a)} | ${VEN(r.m[5])} | ${dayMonth(r.date)}`, scorers_line: [side(h), side(a)].filter(Boolean).join(' | ') || null, facts_lines: reds },
          events_in_order: r.ev ? ev : goals.map(g => `${g.add ? g.min + '+' + g.add : g.min}' ${g.og ? 'own goal by ' + g.who + ' for ' + F(g.team) : (g.pen ? 'penalty scored by ' : 'goal, ') + g.who + ' (' + F(g.team) + ')'}`),
          events_complete: !!r.ev, officials_notes: notes, background: ctx }; }) };
  }
  return { results, table, scorers, storylines, postMatch, preMatch, roundup, roundupFacts, tagNames, tagged, noteLine, latestMw, mwPreview, nextMw, storyDraft, context, word, ord };
})();
