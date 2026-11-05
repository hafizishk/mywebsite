/* SPL admin — what FAS's office uses to run the app. Every change is written to the shared store (store.js),
   which the app reads; open the app in another tab, or watch the phone preview, and it changes as you save.
   One IIFE: state A, a function per page returning HTML, one render(), delegated clicks keyed on data-*. */
(function () {
  'use strict';
  const C = SPL.clubs, E = SPLSTORE.esc, root = document.getElementById('adm');
  const A = { page: 'overview', live: 23, evType: 'G', evTeam: null, news: null, flash: '', pushWhen: 'now', pushAud: 'all' };
  const TONIGHT = [23, 22];
  let D = SPLSTORE.read();
  const save = (fn, msg) => { D = SPLSTORE.update(fn); if (msg) flash(msg); render(); };
  const flash = msg => { A.flash = msg; clearTimeout(flash.t); flash.t = setTimeout(() => { A.flash = ''; render(); }, 2600); };
  const short = k => C[k].short;
  const crest = (k, px) => `<span class="crest cr-${k}" style="width:${px}px;height:${px}px" role="img" aria-label="${C[k].name}"></span>`;
  const fmt = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const hm = ts => new Date(ts).toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const ICON = {
    overview: 'M3 12l9-8 9 8M5 10v10h14V10', matchday: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7l4 3-1.5 4.5h-5L8 10z', news: 'M4 5h16v14H4zM8 9h8M8 13h8M8 17h5',
    push: 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0', votes: 'M4 12l5 5L20 6', sponsors: 'M3 7h18v10H3zM7 7v10M17 7v10', analytics: 'M4 20V10M10 20V4M16 20v-7M22 20H2', settings: 'M12 9a3 3 0 100 6 3 3 0 000-6zM4 12h2M18 12h2M12 4v2M12 18v2'
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
  function stats() {
    const ev = SPLSTORE.events(), by = (kind) => { const o = {}; ev.filter(e => e[1] === kind).forEach(e => { o[e[2]] = (o[e[2]] || 0) + 1; }); return o; };
    return { ev, views: by('view'), taps: by('tap'), imp: by('imp'), articles: by('article'), push: by('push'), votes: ev.filter(e => e[1] === 'vote').length, first: ev.length ? ev[0][0] : 0 };
  }
  const VIEW_NAMES = { 'home:tonight': 'Home · Matchday', 'home:news': 'Home · News', watch: 'Watch', matches: 'Season · Matches', table: 'Season · Table', 'stats:players': 'Stats · Players', 'stats:clubstats': 'Stats · Clubs', clubs: 'Clubs', players: 'Players', player: 'Player profile', gotm: 'Goal of the Month', pmonth: 'Player of the Month', settings: 'Settings', search: 'Search', tickets: 'Tickets', video: 'Video', article: 'News article', onboard: 'Onboarding', partners: 'Partners screen' };
  const viewName = k => VIEW_NAMES[k] || (k.startsWith('match:') ? 'Match centre · ' + k.slice(6) : k.startsWith('club:') ? 'Club · ' + (C[k.slice(5)] ? C[k.slice(5)].short : k.slice(5)) : k);

  // ---------- pages ----------
  function overview() {
    const st = stats(), drafts = D.news.filter(n => n.status === 'draft').length, unsold = Object.values(D.sponsors).filter(s => !s.partner).length, empty = D.partners.filter(p => !p.logo && !p.name).length;
    const todo = [
      D.gotm.open && !D.gotm.winner ? [`Goal of the Month (${E(D.gotm.month)}) closes ${fmt(D.gotm.closes)}`, 'votes', 'Review'] : null,
      !D.gotm.open && !D.gotm.winner ? ['Goal of the Month is closed: publish the winner', 'votes', 'Publish'] : null,
      drafts ? [`${drafts} news ${drafts === 1 ? 'story' : 'stories'} in draft`, 'news', 'Open'] : null,
      unsold ? [`${unsold} of ${Object.keys(D.sponsors).length} section sponsor slots have no partner`, 'sponsors', 'Fill'] : null,
      empty ? [`${empty} empty logo ${empty === 1 ? 'space' : 'spaces'} on the partners screen`, 'sponsors', 'Add logos'] : null
    ].filter(Boolean);
    const card = i => { const m = SPL.matches[i], c = clockOf(i), s = scoreOf(i), on = c.phase !== 'pre';
      return `<div class="panel" style="display:flex;flex-direction:column;gap:14px"><div style="display:flex;justify-content:space-between" class="lbl"><span class="${on && c.phase !== 'FT' ? 'live' : ''}">${on ? (c.phase === 'FT' ? 'Full time' : 'Live · ' + c.label) : 'Tonight · 7.30PM'}</span><span>${E(m[5])}</span></div>
        <div class="score"><div class="t">${crest(m[2], 46)}<span class="d" style="font-size:15px">${short(m[2])}</span></div><span class="big" style="font-size:46px">${on ? s[0] + '–' + s[1] : 'VS'}</span><div class="t">${crest(m[3], 46)}<span class="d" style="font-size:15px">${short(m[3])}</span></div></div>
        <button class="btn" data-console="${i}">${on ? 'Open the console' : 'Run this game live'}</button></div>`; };
    return head('Overview', 'Sunday 1 November · Matchweek 6') + `
      <div class="grid2">${TONIGHT.map(card).join('')}</div>
      <div class="grid2">
        <div class="panel"><h2>Waiting on you</h2>${todo.length ? todo.map(t => `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line2)"><span style="flex:1;font-size:14px">${t[0]}</span><button class="btn2 sm" data-page="${t[1]}">${t[2]}</button></div>`).join('') : '<p class="note">Nothing waiting.</p>'}</div>
        <div class="panel"><h2>In the app<span class="lbl">${CL.on ? 'every phone' : 'this device'}</span></h2><div class="grid3" style="gap:10px">${[[st.ev.filter(e => e[1] === 'view').length, 'Screens viewed'], [st.ev.filter(e => e[1] === 'tap').length, 'Taps'], [Object.values(st.articles).reduce((a, b) => a + b, 0), 'Articles read'], [st.votes, 'Votes cast'], [Object.values(st.push).reduce((a, b) => a + b, 0), 'Alerts received'], [st.views.partners || 0, 'Partner screen shown']].map(([n, l]) => `<div style="padding:10px 0"><div class="big" style="font-size:38px">${n}</div><div class="lbl">${l}</div></div>`).join('')}</div><button class="lnk" data-page="analytics">All analytics</button></div>
      </div>
      <div class="panel"><h2>Latest notifications</h2>${pushTable(D.pushes.slice(-5).reverse())}</div>`;
  }
  const head = (t, sub, actions) => `<div class="ph"><div><h1>${t}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${actions || ''}</div>`;

  function matchday() {
    const i = A.live, m = SPL.matches[i], L = D.live[i] || { phase: 'pre', ev: [] }, c = clockOf(i), s = scoreOf(i);
    if (!A.evTeam || (A.evTeam !== m[2] && A.evTeam !== m[3])) A.evTeam = m[2];
    const squad = SPL.squads[A.evTeam].slice().sort((a, b) => a[0] - b[0]);
    const opts = (sel, none) => (none ? `<option value="">${none}</option>` : '') + squad.map(p => `<option value="${p[0]}" ${sel === p[0] ? 'selected' : ''}>${p[0]} · ${E(p[1])}</option>`).join('');
    const next = { pre: ['Kick off', '1H'], '1H': ['Half time', 'HT'], HT: ['Start second half', '2H'], '2H': ['Full time', 'FT'], FT: null }[L.phase];
    const nowMin = c.phase === 'pre' ? 1 : c.n;
    const evs = (L.ev || []).slice().sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]) || ((a[2] || 0) - (b[2] || 0)));
    const label = e => e[3] === 'G' ? `Goal · <b>${E(pname(e[4], e[5]))}</b>${e[7] === 'pen' ? ' (pen)' : ''}${e[6] ? ` <span class="note">assist ${E(pname(e[4], e[6]))}</span>` : ''}` : e[3] === 'Y' ? `Yellow card · ${E(pname(e[4], e[5]))}` : e[3] === 'R' ? `Red card · ${E(pname(e[4], e[5]))}` : e[3] === 'S' ? `Sub · ${E(pname(e[4], e[5]))} on, ${E(pname(e[4], e[6]))} off` : e[3] === 'HT' ? 'Half time' : 'Full time';
    const mark = e => e[3] === 'G' ? '<span style="width:10px;height:10px;border-radius:50%;background:#fff;display:inline-block"></span>' : e[3] === 'Y' ? '<span style="width:8px;height:11px;background:#F5C518;display:inline-block"></span>' : e[3] === 'R' ? '<span style="width:8px;height:11px;background:#E8363D;display:inline-block"></span>' : e[3] === 'S' ? '<span class="ok" style="font-weight:700">⇅</span>' : '';
    return head('Matchday console', 'What a match official enters at the ground goes straight to every phone: score, clock, goals, cards, changes.') + `
      <div class="tabs">${TONIGHT.map(j => { const mm = SPL.matches[j]; return `<button class="stab ${j === i ? 'on' : ''}" data-live="${j}">${short(mm[2])} v ${short(mm[3])}</button>`; }).join('')}</div>
      <div class="row" style="gap:24px">
        <div style="flex:1;display:flex;flex-direction:column;gap:16px;min-width:0">
          <div class="panel" style="display:flex;flex-direction:column;gap:16px">
            <div style="display:flex;justify-content:space-between" class="lbl"><span>${fmt(m[1])} · ${E(m[5])}</span><span class="${c.phase === '1H' || c.phase === '2H' ? 'live' : ''}">${{ pre: 'Not started', '1H': 'First half', HT: 'Half time', '2H': 'Second half', FT: 'Full time' }[c.phase]}</span></div>
            <div class="score"><div class="t">${crest(m[2], 64)}<span class="d" style="font-size:18px">${C[m[2]].name}</span></div><div style="display:flex;flex-direction:column;align-items:center;gap:6px"><span class="big" style="font-size:72px">${s[0]}–${s[1]}</span><span class="big ${c.phase === '1H' || c.phase === '2H' ? 'live' : ''}" style="font-size:28px" data-aclock="${i}">${c.label}</span></div><div class="t">${crest(m[3], 64)}<span class="d" style="font-size:18px">${C[m[3]].name}</span></div></div>
            <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">${next ? `<button class="btn ${L.phase === 'pre' ? 'red' : ''}" data-phase="${next[1]}">${next[0]}</button>` : ''}${c.phase === '1H' || c.phase === '2H' ? '<button class="btn2" data-nudge="-1">Clock −1 min</button><button class="btn2" data-nudge="1">Clock +1 min</button>' : ''}${L.phase !== 'pre' ? '<button class="lnk danger" data-resetmatch="1" style="margin-left:8px">Reset this game</button>' : ''}</div>
          </div>
          <div class="panel" style="display:flex;flex-direction:column;gap:14px;${L.phase === 'pre' ? 'opacity:.45;pointer-events:none' : ''}">
            <h2 style="margin:0">Add to the match</h2>
            <div class="tabs" style="gap:24px">${[['G', 'Goal'], ['Y', 'Yellow card'], ['R', 'Red card'], ['S', 'Substitution']].map(([k, l]) => `<button class="stab ${A.evType === k ? 'on' : ''}" data-evtype="${k}">${l}</button>`).join('')}</div>
            <div class="seg">${[m[2], m[3]].map(k => `<button class="${A.evTeam === k ? 'on' : ''}" data-evteam="${k}">${crest(k, 22)}${C[k].name}</button>`).join('')}</div>
            <div class="grid3">
              <label class="fld"><span>${A.evType === 'S' ? 'Coming on' : 'Player'}</span><select class="in" id="evP">${opts(null)}</select></label>
              ${A.evType === 'G' ? `<label class="fld"><span>Assist</span><select class="in" id="evA">${opts(null, 'No assist')}</select></label>` : A.evType === 'S' ? `<label class="fld"><span>Going off</span><select class="in" id="evA">${opts(null)}</select></label>` : '<span></span>'}
              <label class="fld"><span>Minute</span><input class="in" id="evM" value="${nowMin > (c.cap || 90) ? (c.cap + '+' + (nowMin - c.cap)) : nowMin}" inputmode="numeric" placeholder="e.g. 34 or 45+2"></label>
            </div>
            <div style="display:flex;align-items:center;gap:22px;flex-wrap:wrap">${A.evType === 'G' ? '<label class="chk"><input type="checkbox" id="evPen"> Penalty</label>' : ''}<label class="chk"><input type="checkbox" id="evPush" ${A.evType === 'G' || A.evType === 'R' ? 'checked' : ''}> Send an alert to fans</label><span style="flex:1"></span><button class="btn" data-addev="1">Add ${{ G: 'goal', Y: 'yellow card', R: 'red card', S: 'substitution' }[A.evType]}</button></div>
          </div>
          <div class="panel"><h2>Timeline<span class="lbl">${evs.length} ${evs.length === 1 ? 'entry' : 'entries'}</span></h2>${evs.length ? evs.slice().reverse().map(e => `<div class="tl"><span class="big" style="font-size:18px;color:var(--muted)">${minText(e)}</span><span style="display:flex;justify-content:center">${mark(e)}</span><span>${e[4] ? crest(e[4], 16) + ' ' : ''}${label(e)}</span>${e[3] === 'HT' || e[3] === 'FT' ? '<span></span>' : `<button class="lnk danger" data-delev="${(L.ev || []).indexOf(e)}">Remove</button>`}</div>`).join('') : '<p class="note">Nothing yet. Kick off, then add goals, cards and changes as they happen.</p>'}</div>
          <p class="note">Possession, shots and corners need a data provider or a stats spotter; this console covers what a match official sees. Team sheets are confirmed from each club's submitted line-up in the full build.</p>
        </div>
        <div><div class="phone-cap"><span class="lbl">The app, live</span><button class="lnk" data-reloadphone="1">Reload</button></div><div class="phone"><iframe id="phone" src="index.html?embed&match=${i}" title="App preview"></iframe></div></div>
      </div>`;
  }

  const TAGS = ['Preview', 'Roundup', 'Review', 'Fixtures', 'Club news', 'Announcement', 'Interview'];
  const IMGS = [['', 'No image'], ['bn-DERBY', 'Eastern Derby poster'], ['bn-SAILORS', 'Sailors celebration']];
  const IMG_URL = { 'bn-DERBY': 'assets/news/eastern-derby-poster.png', 'bn-SAILORS': 'assets/news/sailors-celebration.png' };
  function news() {
    const list = D.news.slice().sort((a, b) => b.date.localeCompare(a.date));
    const n = A.news === 'new' ? { id: '', tag: 'Announcement', date: new Date().toISOString().slice(0, 10), title: '', dek: '', body: '', img: '', status: 'draft' } : D.news.find(x => x.id === A.news);
    return head('News', 'Stories in the app\'s News tab, the lead story on Home, and search.', '<button class="btn" data-newnews="1">New story</button>') + `
      <div class="row" style="gap:24px">
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:16px">
          <div class="panel"><table class="tbl"><thead><tr><th style="width:90px">Status</th><th>Story</th><th style="width:90px">Date</th><th style="width:60px"></th></tr></thead><tbody>${list.map(x => `<tr class="click ${n && n.id === x.id ? 'sel' : ''}" data-editnews="${E(x.id)}"><td class="lbl ${x.status === 'live' ? 'ok' : ''}">${x.status === 'live' ? 'Published' : 'Draft'}</td><td><div style="display:flex;flex-direction:column;gap:3px"><span class="lbl">${E(x.tag)}${D.lead === x.id ? ' · <span style="color:#fff">Lead story</span>' : ''}</span><span style="font-weight:600">${E(x.title) || '<span class="note">Untitled</span>'}</span></div></td><td class="note">${fmt(x.date)}</td><td class="note">Edit</td></tr>`).join('')}</tbody></table></div>
          ${n ? `<div class="panel" style="display:flex;flex-direction:column;gap:14px"><h2 style="margin:0">${n.id ? 'Edit story' : 'New story'}</h2>
            <div class="grid3"><label class="fld"><span>Kind</span><select class="in" id="nTag">${TAGS.map(t => `<option ${t === n.tag ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label class="fld"><span>Date</span><input class="in" type="date" id="nDate" value="${E(n.date)}"></label><label class="fld"><span>Picture</span><select class="in" id="nImg">${IMGS.map(([k, l]) => `<option value="${k}" ${k === n.img ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
            <label class="fld"><span>Headline</span><input class="in" id="nTitle" value="${E(n.title)}" maxlength="120"></label>
            <label class="fld"><span>Standfirst · one or two lines under the headline</span><input class="in" id="nDek" value="${E(n.dek)}" maxlength="220"></label>
            <label class="fld"><span>Story · a blank line starts a new paragraph</span><textarea class="in" id="nBody" rows="10">${E(n.body)}</textarea></label>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn" data-savenews="live">${n.status === 'live' && n.id ? 'Save' : 'Publish'}</button><button class="btn2" data-savenews="draft">${n.status === 'live' && n.id ? 'Unpublish' : 'Save as draft'}</button>${n.id && n.status === 'live' ? `<button class="btn2" data-lead="${E(n.id)}" ${D.lead === n.id ? 'disabled' : ''}>${D.lead === n.id ? 'Lead story' : 'Make lead story'}</button>` : ''}${n.id ? `<button class="btn2" data-notifynews="${E(n.id)}" ${n.status !== 'live' ? 'disabled' : ''}>Send as a notification</button>` : ''}<span style="flex:1"></span>${n.id ? `<button class="lnk danger" data-delnews="${E(n.id)}">Delete</button>` : ''}</div></div>` : '<p class="note">Pick a story to edit, or start a new one.</p>'}
        </div>
        <div><div class="phone-cap"><span class="lbl">${n && n.id && n.status === 'live' ? 'This story in the app' : 'News in the app'}</span><button class="lnk" data-reloadphone="1">Reload</button></div><div class="phone"><iframe id="phone" src="index.html?embed${n && n.id && n.status === 'live' ? '&article=' + encodeURIComponent(n.id) : ''}" title="App preview"></iframe></div></div>
      </div>`;
  }

  const audName = a => a === 'all' ? 'Everyone' : a === 'news' ? 'News alerts on' : a.startsWith('club:') && C[a.slice(5)] ? C[a.slice(5)].short + ' followers' : a;
  const pushTable = list => list.length ? `<table class="tbl"><thead><tr><th style="width:150px">When</th><th>Notification</th><th style="width:150px">To</th><th style="width:100px">Kind</th><th style="width:90px"></th></tr></thead><tbody>${list.map(p => `<tr><td class="note">${hm(p.at)}</td><td><div style="display:flex;flex-direction:column;gap:2px"><b>${E(p.title)}</b><span class="note">${E(p.body)}</span></div></td><td>${audName(p.aud)}</td><td class="lbl">${p.kind === 'live' ? 'Match alert' : 'Sent by hand'}</td><td class="lbl ${p.at > Date.now() ? 'warn' : 'ok'}">${p.at > Date.now() ? 'Scheduled' : 'Sent'}</td></tr>`).join('')}</tbody></table>` : '<p class="note">No notifications sent yet.</p>';
  // starters in the PL style (Hafiz, 5 Nov): FAS's team edits them before sending
  const PUSH_STARTERS = [['October Awards 🏆', 'Who impressed you this month? Vote for Player and Goal of the Month before Monday.'],
    ['The Eastern Derby 🔥', '2nd v 1st at Our Tampines Hub tonight. Win and you go top. Kick-off 7.30PM.'],
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
        <div style="display:flex;flex-direction:column;gap:8px"><span class="lbl">On a locked phone</span><div class="lock"><span class="lbl" style="color:#DCDAF0">Sunday 1 November</span><span class="tm">19:28</span><div class="nt"><span style="width:30px;height:30px;flex:none;background:url(assets/league/spl-lion.png) center/70% no-repeat #fff;border-radius:4px"></span><span style="display:flex;flex-direction:column;gap:2px;min-width:0"><span style="font:600 11px 'Inter',sans-serif;color:#DCDAF0">SPL · now</span><b id="lkT" style="font-size:13px">${E(pre.title) || 'Title'}</b><span id="lkB" style="font-size:12px;color:#DCDAF0">${E(pre.body) || 'Message'}</span></span></div></div></div>
      </div>
      <div class="panel"><h2>Sent and scheduled</h2>${pushTable(D.pushes.slice().reverse())}</div>`;
  }

  function votes() {
    const g = D.gotm, st = stats(), mine = (() => { try { return (JSON.parse(localStorage.getItem('spl-mock') || '{}').votes || {})[g.month]; } catch (e) { return null; } })();
    const tally = id => (+g.base[id] || 0) + (mine === id ? 1 : 0), total = g.goals.reduce((a, x) => a + tally(x.id), 0) || 1;
    const players = []; Object.keys(SPL.squads).forEach(k => SPL.squads[k].forEach(p => players.push([k, p[1]])));
    return head('Votes', 'Goal of the Month: the shortlist, the vote and the result, all shown in the app.') + `
      <div class="panel" style="display:flex;flex-direction:column;gap:14px">
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap"><h2 style="margin:0">Goal of the Month</h2><span class="lbl ${g.winner ? 'ok' : g.open ? 'live' : 'warn'}">${g.winner ? 'Result published' : g.open ? 'Voting open' : 'Voting closed'}</span><span style="flex:1"></span>
          ${g.winner ? '<button class="btn2 sm" data-gotm="reopen">Start a new month</button>' : g.open ? '<button class="btn2 sm" data-gotm="close">Close voting</button>' : '<button class="btn2 sm" data-gotm="open">Reopen voting</button>'}${!g.winner ? '<button class="btn sm" data-gotm="publish">Publish the winner</button>' : ''}</div>
        <div class="grid3"><label class="fld"><span>Month</span><input class="in" id="gMonth" value="${E(g.month)}"></label><label class="fld"><span>Voting closes</span><input class="in" type="date" id="gCloses" value="${E(g.closes)}"></label><span></span></div>
        <table class="tbl"><thead><tr><th>Player</th><th>Match</th><th style="width:80px">Minute</th><th>How it went in</th><th style="width:170px">Votes</th><th style="width:60px"></th></tr></thead><tbody>
          ${g.goals.map((x, j) => { const pct = Math.round(100 * tally(x.id) / total); return `<tr ${g.winner === x.id ? 'class="sel"' : ''}><td><select class="in" data-gf="${j}:player">${players.map(([k, n]) => `<option value="${k}|${E(n)}" ${n === x.player && k === x.team ? 'selected' : ''}>${E(n)} · ${short(k)}</option>`).join('')}</select></td><td><input class="in" data-gf="${j}:match" value="${E(x.match)}"></td><td><input class="in" data-gf="${j}:min" value="${E(x.min)}"></td><td><input class="in" data-gf="${j}:how" value="${E(x.how)}"></td><td><div style="display:flex;flex-direction:column;gap:6px"><span><b class="big" style="font-size:22px">${pct}%</b> <span class="note">${tally(x.id).toLocaleString()}${g.winner === x.id ? ' · winner' : ''}</span></span><div class="bar"><span style="width:${pct}%"></span></div></div></td><td><button class="lnk danger" data-delgoal="${j}">Remove</button></td></tr>`; }).join('')}
        </tbody></table>
        <div style="display:flex;gap:10px;align-items:center"><button class="btn" data-savegotm="1">Save shortlist</button>${g.goals.length < 6 ? '<button class="btn2" data-addgoal="1">Add a goal</button>' : ''}<span class="note" style="margin-left:auto">${total.toLocaleString()} votes. Counts before this demo are placeholders; each fan's vote is real.</span></div>
      </div>
      <p class="note">Player of the Match runs itself: the app opens the vote at full time with three players from the game.</p>`;
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

  function analytics() {
    const st = stats(), top = o => Object.entries(o).sort((a, b) => b[1] - a[1]);
    const bars = (rows, name) => { const max = rows.length ? rows[0][1] : 1; return rows.length ? rows.slice(0, 12).map(([k, n]) => `<div style="display:grid;grid-template-columns:200px 1fr 50px;gap:12px;align-items:center;padding:7px 0"><span style="font-size:13px">${E(name(k))}</span><div class="bar"><span style="width:${Math.round(100 * n / max)}%"></span></div><span class="big" style="font-size:18px;text-align:right">${n}</span></div>`).join('') : '<p class="note">Nothing recorded yet.</p>'; };
    const tapName = k => { const [a, b] = k.split(':'); return ({ go: 'Opened', match: 'Match centre', club: 'Club page', player: 'Player', article: 'Article', video: 'Video', story: 'Moments story', tickets: 'Tickets', vote: 'Goal of the Month vote', potm: 'Player of the Match vote', follow: 'Follow', htab: 'Home tab', mtab: 'Match tab', ttab: 'Table tab', ctab: 'Club tab', sim: 'Replay', remind: 'Remind me', cal: 'Add to calendar', pick: 'Club picker', ob: 'Onboarding', toast: 'Tapped an alert' }[a] || a) + (b && a !== 'match' && a !== 'potm' ? ' · ' + b : ''); };
    return head('Analytics', st.first ? (CL.on ? `Recorded from every phone since ${hm(st.first)}. The latest 4,000 events, refreshed every 30 seconds.` : `Recorded in the app on this device since ${hm(st.first)}. In the live app every install reports here.`) : 'Nothing recorded yet. Open the app and use it, then come back.', '<button class="lnk danger" data-clearstats="1">Clear</button>') + `
      <div class="grid4">${[[st.ev.filter(e => e[1] === 'view').length, 'Screens viewed'], [st.ev.filter(e => e[1] === 'tap').length, 'Taps'], [Object.values(st.articles).reduce((a, b) => a + b, 0), 'Articles read'], [Object.values(st.imp).reduce((a, b) => a + b, 0), 'Sponsor views']].map(([n, l]) => `<div class="panel"><div class="big" style="font-size:52px">${n}</div><div class="lbl">${l}</div></div>`).join('')}</div>
      <div class="grid2"><div class="panel"><h2>Screens</h2>${bars(top(st.views), viewName)}</div><div class="panel"><h2>What fans tap</h2>${bars(top(st.taps), tapName)}</div></div>
      <div class="grid2"><div class="panel"><h2>Sponsor sections seen</h2>${bars(top(st.imp), k => SPLSTORE.SLOTS[k] || k)}</div><div class="panel"><h2>Stories read</h2>${bars(top(st.articles), id => (D.news.find(n => n.id === id) || { title: id }).title)}</div></div>`;
  }

  function settings() {
    return head('Settings', 'Who can use this admin, and what each person can change.') + `
      <div class="panel"><h2>People</h2><table class="tbl"><thead><tr><th>Name</th><th>Team</th><th>Can use</th></tr></thead><tbody>
        ${[['[NAME]', 'Marketing', 'Everything'], ['[NAME]', 'Digital content', 'News, notifications, votes'], ['[NAME]', 'Commercial', 'Sponsors, analytics'], ['[NAME]', 'Match officials (one per ground)', 'Matchday console for their game']].map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="note">${r[2]}</td></tr>`).join('')}
      </tbody></table><p class="note" style="margin-top:12px">Staff sign in with their FAS email. A new person gets a login in Supabase (Authentication &gt; Users) and a line on the staff list; every save records who made it.</p></div>
      <div class="panel"><h2>Demo data</h2><p class="note">Puts news, votes, sponsors and partners back as they started and clears analytics and live games. The app follows.</p><button class="btn2" data-resetall="1" style="margin-top:10px">Reset the demo</button></div>`;
  }

  // ---------- shell ----------
  const PAGES = { overview: ['Overview', overview], matchday: ['Matchday', matchday], news: ['News', news], push: ['Notifications', push], votes: ['Votes', votes], sponsors: ['Sponsors', sponsors], analytics: ['Analytics', analytics], settings: ['Settings', settings] };
  // ---------- staff sign-in (backend.js set): only logins on the FAS staff list get past this ----------
  const CL = window.SPLCLOUD || { on: false, state: { status: 'demo' } };
  A.authed = !CL.on; A.checking = CL.on;
  function signinPage() {
    return `<div class="signin"><span class="spl-h" role="img" aria-label="Singapore Premier League"></span><h1>App admin</h1><p class="note">Football Association of Singapore staff only.</p>
      <label class="lbl" for="siE">Email</label><input id="siE" type="email" autocomplete="username" value="${E(A.siEmail || '')}">
      <label class="lbl" for="siP">Password</label><input id="siP" type="password" autocomplete="current-password">
      ${A.siErr ? `<p class="err">${E(A.siErr)}</p>` : ''}<button class="btn" data-signin="1" ${A.siBusy ? 'disabled' : ''}>${A.siBusy ? 'Signing in…' : 'Sign in'}</button></div>`;
  }
  const statusLine = () => { const st = CL.state; if (!CL.on) return '<span class="cs demo">Demo · this browser only</span>';
    if (st.status === 'live') return `<span class="cs live">Live · saved${st.updatedAt ? ' ' + new Date(st.updatedAt).toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' }) : ''}</span>`;
    return `<span class="cs off" title="${E(st.error || '')}">${st.status === 'connecting' ? 'Connecting…' : 'Offline · changes wait'}</span>`; };
  function render() {
    if (CL.on && (A.checking || !A.authed)) { root.innerHTML = A.checking ? '<div class="signin"><p class="note">Checking your sign-in…</p></div>' : signinPage(); return; }
    const liveNow = TONIGHT.some(i => { const p = (D.live[i] || {}).phase; return p === '1H' || p === '2H' || p === 'HT'; });
    const keep = document.scrollingElement.scrollTop;
    root.innerHTML = `<aside class="side"><span class="spl-h" role="img" aria-label="Singapore Premier League"></span><span class="lbl" style="margin-top:-12px">App admin · FAS</span>
      <nav>${Object.keys(PAGES).map(k => `<button class="nv ${A.page === k ? 'on' : ''}" data-page="${k}">${icon(k)}${PAGES[k][0]}${k === 'matchday' && liveNow ? '<span class="ct live">LIVE</span>' : k === 'news' && D.news.some(n => n.status === 'draft') ? `<span class="ct">${D.news.filter(n => n.status === 'draft').length}</span>` : ''}</button>`).join('')}</nav>
      <div class="who">${statusLine()}<span style="font-size:13px;font-weight:600">${CL.on ? E(CL.state.email) : '[STAFF NAME]'}</span><span class="lbl">FAS staff</span>${CL.on ? '<button class="lnk" data-signout="1" style="margin-top:6px;text-align:left">Sign out</button>' : ''}<a class="lnk" href="index.html" target="_blank" rel="noopener" style="margin-top:8px">Open the app ↗</a></div></aside>
      <main class="main">${PAGES[A.page][1]()}</main>${A.flash ? `<div class="flash">${E(A.flash)}</div>` : ''}`;
    document.scrollingElement.scrollTop = keep;
  }

  // ---------- actions ----------
  const val = id => { const el = document.getElementById(id); return el ? el.value : ''; };
  function setLive(i, fn) { save(d => { const L = d.live[i] || { phase: 'pre', t0: 0, base: 0, ev: [], sheet: false }; fn(L, d); d.live[i] = L; }); }
  function livePush(d, i, title, body) { d.pushes.push({ id: uid('p'), at: Date.now(), title, body, aud: 'all', kind: 'live', match: i }); }
  async function doSignIn() {
    A.siEmail = val('siE').trim(); const pw = val('siP'); if (!A.siEmail || !pw) { A.siErr = 'Enter your email and password.'; render(); return; }
    A.siBusy = true; A.siErr = ''; render();
    const r = await CL.signIn(A.siEmail, pw); A.siBusy = false;
    if (!r.ok) { A.siErr = r.msg; render(); return; }
    A.authed = true; await CL.pull(); await CL.pullEvents(); D = SPLSTORE.read(); render();
  }
  root.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.target.id === 'siE' || e.target.id === 'siP')) doSignIn(); });
  root.addEventListener('click', e => {
    { const st = e.target.closest('[data-starter]'); if (st) { const p = PUSH_STARTERS[+st.dataset.starter]; A.pushPre = { title: p[0], body: p[1] }; A.pushAud = val('pAud') || A.pushAud; render(); return; } }
    if (e.target.closest('[data-signin]')) { doSignIn(); return; }
    if (e.target.closest('[data-signout]')) { CL.signOut().then(() => { A.authed = false; render(); }); return; }

    const t = e.target.closest('[data-page],[data-console],[data-live],[data-phase],[data-nudge],[data-resetmatch],[data-evtype],[data-evteam],[data-addev],[data-delev],[data-reloadphone],[data-newnews],[data-editnews],[data-savenews],[data-lead],[data-delnews],[data-notifynews],[data-sendpush],[data-gotm],[data-savegotm],[data-addgoal],[data-delgoal],[data-savesp],[data-savept],[data-ptclear],[data-clearstats],[data-resetall],[data-ptlook]');
    if (!t) return; const d = t.dataset;
    if (d.page) { A.page = d.page; render(); document.scrollingElement.scrollTop = 0; return; }
    if (d.console) { A.page = 'matchday'; A.live = +d.console; A.evTeam = null; render(); return; }
    if (d.live) { A.live = +d.live; A.evTeam = null; render(); return; }
    if (d.phase) { const i = A.live, m = SPL.matches[i], ph = d.phase, notify = true;
      setLive(i, (L, D2) => { const c = clockOf(i), s = scoreOf(i);
        if (ph === '1H') { L.phase = '1H'; L.t0 = Date.now(); L.base = 0; if (notify) livePush(D2, i, `Kick-off · ${short(m[2])} v ${short(m[3])}`, `${m[5]} · follow it live in the app`); }
        if (ph === 'HT') { L.phase = 'HT'; L.ev.push([1, 45, Math.max(0, c.n - 45), 'HT']); livePush(D2, i, `Half time ⏸️ ${short(m[2])} ${s[0]}–${s[1]} ${short(m[3])}`, `Back for the second half in 15 minutes at ${m[5]}.`); }
        if (ph === '2H') { L.phase = '2H'; L.t0 = Date.now(); L.base = 45; }
        if (ph === 'FT') { L.phase = 'FT'; L.ev.push([2, 90, Math.max(0, c.n - 90), 'FT']); livePush(D2, i, `Full time 🏁 ${short(m[2])} ${s[0]}–${s[1]} ${short(m[3])}`, 'Who was your Player of the Match? Vote now.'); } });
      flash({ '1H': 'Kicked off. The app is live.', HT: 'Half time sent.', '2H': 'Second half under way.', FT: 'Full time. The vote opens in the app.' }[ph]); render(); return; }
    if (d.nudge) { setLive(A.live, L => { L.t0 -= (+d.nudge) * 60000; }); return; }
    if (d.resetmatch) { if (!confirm('Clear this game\'s score, clock and timeline?')) return; save(d2 => { delete d2.live[A.live]; }, 'Game reset.'); return; }
    if (d.evtype) { A.evType = d.evtype; render(); return; }
    if (d.evteam) { A.evTeam = d.evteam; render(); return; }
    if (d.addev) { const i = A.live, m = SPL.matches[i], k = A.evTeam, p = +val('evP'), a = +val('evA') || 0, raw = val('evM').trim(), mm = raw.match(/^(\d{1,3})(?:\s*\+\s*(\d{1,2}))?$/);
      if (!mm) { flash('Minute: a number like 34, or 45+2.'); render(); return; }
      if (A.evType === 'S' && (!a || a === p)) { flash('Pick who comes on and who goes off.'); render(); return; }
      const min = +mm[1], add = +(mm[2] || 0), half = (min > 45 || ['2H', 'FT'].includes((D.live[i] || {}).phase)) && !(min === 45 && add && (D.live[i] || {}).phase !== '2H') ? 2 : 1;
      const ev = [half, min, add, A.evType, k, p, A.evType === 'G' || A.evType === 'S' ? a : 0]; if (A.evType === 'G' && document.getElementById('evPen').checked) ev[7] = 'pen';
      const alert = document.getElementById('evPush').checked;
      setLive(i, (L, D2) => { L.ev.push(ev); if (!alert) return; const s = [0, 0]; L.ev.forEach(x => { if (x[3] === 'G') s[x[4] === m[2] ? 0 : 1]++; });
        const who = pname(k, p) + (ev[7] === 'pen' ? ' (pen)' : '');
        if (ev[3] === 'G') livePush(D2, i, `GOAL! ⚽ ${short(m[2])} ${s[0]}–${s[1]} ${short(m[3])}`, `${minText(ev)} ${who}. Tap to follow it live.`);
        if (ev[3] === 'R') livePush(D2, i, `Red card · ${short(k)}`, `${minText(ev)} ${who} is sent off`);
        if (ev[3] === 'Y') livePush(D2, i, `Yellow card · ${short(k)}`, `${minText(ev)} ${who}`);
        if (ev[3] === 'S') livePush(D2, i, `Substitution · ${short(k)}`, `${minText(ev)} ${pname(k, p)} on for ${pname(k, a)}`); });
      flash({ G: 'Goal added', Y: 'Yellow card added', R: 'Red card added', S: 'Substitution added' }[A.evType] + (alert ? ' and sent to fans.' : '.')); render(); return; }
    if (d.delev) { setLive(A.live, L => { L.ev.splice(+d.delev, 1); }); flash('Removed.'); render(); return; }
    if (d.reloadphone) { const f = document.getElementById('phone'); if (f) f.src = f.src; return; }
    if (d.newnews) { A.news = 'new'; render(); return; }
    if (d.editnews) { A.news = d.editnews; render(); return; }
    if (d.savenews) { const title = val('nTitle').trim(); if (!title) { flash('Give the story a headline.'); render(); return; }
      const n = { id: A.news === 'new' ? uid('n') : A.news, tag: val('nTag'), date: val('nDate') || new Date().toISOString().slice(0, 10), title, dek: val('nDek').trim(), body: val('nBody'), img: val('nImg'), status: d.savenews };
      save(d2 => { const j = d2.news.findIndex(x => x.id === n.id); if (j >= 0) d2.news[j] = n; else d2.news.push(n); if (n.status === 'draft' && d2.lead === n.id) { const other = d2.news.find(x => x.status === 'live' && x.id !== n.id); d2.lead = other ? other.id : ''; } }, n.status === 'live' ? 'Published. It\'s in the app now.' : 'Saved as a draft.');
      A.news = n.id; render(); return; }
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
  root.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'pWhen') { A.pushWhen = t.value; A.pushPre = { title: val('pTitle'), body: val('pBody') }; A.pushAud = val('pAud'); render(); }
    if (t.dataset && t.dataset.ptlogo !== undefined) { const f = t.files && t.files[0]; if (!f) return;
      // shrink to at most 480px wide, as PNG, so the stored logo stays small
      const r = new FileReader(); r.onload = () => { const img = new Image(); img.onload = () => { const s = Math.min(1, 480 / img.width, 240 / img.height), c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); const url = c.toDataURL('image/png'); save(d2 => { d2.partners[+t.dataset.ptlogo].logo = url; }, 'Logo added.'); }; img.src = r.result; }; r.readAsDataURL(f); }
  });
  root.addEventListener('input', e => { if (e.target.id === 'pTitle') { const el = document.getElementById('lkT'); if (el) el.textContent = e.target.value || 'Title'; } if (e.target.id === 'pBody') { const el = document.getElementById('lkB'); if (el) el.textContent = e.target.value || 'Message'; } });
  // the app writes analytics and votes into the same storage; keep the numbers current
  window.addEventListener('storage', e => { if (e.key === SPLSTORE.KEY) D = SPLSTORE.read(); if (['analytics', 'overview', 'votes', 'sponsors'].includes(A.page) && !document.activeElement.matches('input,textarea,select')) render(); });
  setInterval(() => { document.querySelectorAll('[data-aclock]').forEach(el => { const c = clockOf(+el.dataset.aclock); if (el.textContent !== c.label) el.textContent = c.label; }); }, 1000);
  const q = new URLSearchParams(location.search); if (q.get('page') && PAGES[q.get('page')]) A.page = q.get('page');
  if (CL.on) {
    CL.checkAdmin().then(ok => { A.checking = false; A.authed = ok; if (ok) CL.pullEvents().then(() => { if (A.page === 'analytics' || A.page === 'overview') render(); }); D = SPLSTORE.read(); render(); });
    CL.onChange(() => { const el = root.querySelector('.who .cs'); if (el) el.outerHTML = statusLine(); });
    setInterval(() => { if (A.authed && ['analytics', 'overview'].includes(A.page)) CL.pullEvents().then(ok => { if (ok && !document.activeElement.matches('input,textarea,select')) render(); }); }, 30000);
  }
  render();
})();
