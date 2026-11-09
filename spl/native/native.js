/* Only in the Android demo, never on the website. build.mjs loads it after app.js.
   - Hands over from Android's plain white splash to the HTML roar splash as early as it can.
   - Makes the hardware back button walk the app's own screens instead of leaving.
   - Turns the replay's alerts into real Android notifications: app.js hands over the whole list
     ahead of time (window.SPLSchedule), so goals still arrive on a locked phone. Tapping one
     opens that match centre. */
(function () {
  'use strict';
  const SPL = window.capacitorSplashScreen && capacitorSplashScreen.SplashScreen;
  if (SPL) Promise.race([SPL.hide().catch(() => {}), new Promise(r => setTimeout(r, 300))]);

  const APP = window.capacitorApp && capacitorApp.App;
  if (!window.Capacitor || !Capacitor.isNativePlatform() || !APP || !window.SPLAPP) return;

  // The page draws under the status bar (insetsHandling: css). Dark icons over the white roar splash,
  // white icons once it lifts and the navy app shows.
  const BARS = window.capacitorExports && capacitorExports.SystemBars || (Capacitor.Plugins && Capacitor.Plugins.SystemBars);
  // White icons on the navy or club ground; dark icons when Settings → Appearance is Light.
  const appEl = document.getElementById('app');
  const lightIcons = () => { try { BARS && BARS.setStyle({ style: appEl && appEl.dataset.look === 'light' ? 'LIGHT' : 'DARK' }); } catch (e) {} };
  if (appEl) new MutationObserver(() => { if (!document.getElementById('launch')) lightIcons(); }).observe(appEl, { attributes: true, attributeFilter: ['data-look'] });
  const launch = document.getElementById('launch');
  if (!launch || launch.classList.contains('l-out')) lightIcons();
  else new MutationObserver((_, o) => { if (launch.classList.contains('l-out') || !launch.isConnected) { lightIcons(); o.disconnect(); } }).observe(launch, { attributes: true, attributeFilter: ['class'] });
  setTimeout(lightIcons, 5000);

  const parent = { awards: 'home', pmonth: 'awards', match: 'matches', table: 'matches', club: 'clubs', player: 'stats', tickets: 'home', video: 'home', gotm: 'awards', settings: 'home', search: 'home' };
  APP.addListener('backButton', () => {
    if (SPLAPP.closeStory()) return;
    const v = SPLAPP.state.view;
    if (v === 'match' && SPLAPP.state.from) SPLAPP.go(SPLAPP.state.from);
    else if (v === 'player' && SPLAPP.state.pfrom) SPLAPP.go(SPLAPP.state.pfrom);
    else if (parent[v]) SPLAPP.go(parent[v]);
    else if (v !== 'home') SPLAPP.go('home');
    else APP.minimizeApp();
  });

  const LN = window.capacitorLocalNotifications && capacitorLocalNotifications.LocalNotifications;
  if (!LN) return;
  const CHANNEL = 'match-alerts';
  let ready = null, pending = [];
  const setup = () => ready || (ready = (async () => {
    try { await LN.createChannel({ id: CHANNEL, name: 'Match alerts', description: 'Kick-off, goals and full time', importance: 5, visibility: 1, vibration: true }); } catch (e) {}
    let p = await LN.checkPermissions().catch(() => ({ display: 'denied' }));
    if (p.display !== 'granted') p = await LN.requestPermissions().catch(() => ({ display: 'denied' }));
    return p.display === 'granted';
  })());

  window.SPLSchedule = async list => {
    if (!(await setup())) return;
    if (pending.length) { await LN.cancel({ notifications: pending.map(id => ({ id })) }).catch(() => {}); pending = []; }
    if (!list.length) return;
    const base = 1000 + (Date.now() % 100000);
    const notifications = list.map((a, j) => ({
      id: base + j, title: a.title, body: a.body, channelId: CHANNEL,
      schedule: { at: new Date(Math.max(Date.now() + 300, a.at)), allowWhileIdle: true },
      extra: { match: a.match }, smallIcon: 'ic_stat_spl', iconColor: '#E8363D'
    }));
    pending = notifications.map(n => n.id);
    await LN.schedule({ notifications }).catch(() => {});
  };
  // kick-off reminders (app.js kickReminders): one alert per game, 30 minutes before, with its own ids so the replay's
  // list and the reminders never cancel each other; the ids are kept so a restart can clear the old ones
  const RID = 50000; let rem = [];
  try { rem = JSON.parse(localStorage.getItem('spl-remind-ids') || '[]'); } catch (e) { rem = []; }
  const note = (id, a) => ({ id, title: a.title, body: a.body, channelId: CHANNEL, schedule: { at: new Date(a.at), allowWhileIdle: true }, extra: { match: a.match }, smallIcon: 'ic_stat_spl', iconColor: '#E8363D' });
  window.SPLRemind = async list => {
    if (!(await setup())) return;
    if (rem.length) await LN.cancel({ notifications: rem.map(id => ({ id })) }).catch(() => {});
    const notifications = list.map(a => note(RID + a.match, a));
    rem = notifications.map(n => n.id); try { localStorage.setItem('spl-remind-ids', JSON.stringify(rem)); } catch (e) {}
    if (notifications.length) await LN.schedule({ notifications }).catch(() => {});
  };
  window.SPLRemindTest = async a => { if (await setup()) await LN.schedule({ notifications: [note(RID - 1, a)] }).catch(() => {}); };
  if (SPLAPP.remindSync) SPLAPP.remindSync();
  LN.addListener('localNotificationActionPerformed', ev => {
    const i = ev && ev.notification && ev.notification.extra && ev.notification.extra.match;
    if (typeof i === 'number') SPLAPP.openMatch(i);
  });
  // a replay started before this file loaded (?live) gets its alerts now
  if (SPLAPP.state.sim) SPLAPP.reschedule && SPLAPP.reschedule();
})();

// Push (Firebase Cloud Messaging, Hafiz 6 Nov): alerts the office sends from the admin reach the phone even when it's locked.
// Each phone signs up to topics from the fan's own choices: everyone (all), news alerts (news), live match alerts (live),
// and each club followed and not muted (club_TAM…). The admin's sending function picks the topic per alert.
(function () {
  'use strict';
  const FM = window.capacitorFirebaseMessaging && capacitorFirebaseMessaging.FirebaseMessaging;
  if (!window.Capacitor || !Capacitor.isNativePlatform() || !FM || !window.SPLAPP) return;
  const prefs = () => { try { return JSON.parse(localStorage.getItem('spl-mock') || '{}'); } catch (e) { return {}; } };
  const topicsFor = P => { const st = (P.settings && P.settings.push) || {}, mute = P.mute || {}, t = ['all'];
    if (st.news) t.push('news'); if (st.goals !== false || st.kickoff !== false || st.results !== false) t.push('live');
    const clubs = Object.keys(P.follows || {}).filter(k => P.follows[k]); if (P.fav) clubs.push(P.fav);
    [...new Set(clubs)].filter(k => /^[A-Z]{3}$/.test(k) && !mute[k]).forEach(k => t.push('club_' + k)); return t; };
  let on = [], busy = false;
  async function sync() {
    if (busy) return; busy = true;
    try {
      let p = await FM.checkPermissions(); if (p.receive !== 'granted') p = await FM.requestPermissions();
      if (p.receive !== 'granted') return;
      if (Capacitor.getPlatform() === 'android') await FM.createChannel({ id: 'match-alerts', name: 'Match alerts', description: 'Kick-off, goals, full time and news', importance: 5, visibility: 1, vibration: true }).catch(() => {});
      await FM.getToken().catch(() => null);
      const want = topicsFor(prefs());
      for (const t of want.filter(x => !on.includes(x))) await FM.subscribeToTopic({ topic: t }).catch(() => {});
      for (const t of on.filter(x => !want.includes(x))) await FM.unsubscribeFromTopic({ topic: t }).catch(() => {});
      on = want; try { localStorage.setItem('spl-push-topics', JSON.stringify(on)); } catch (e) {}
    } catch (e) {} finally { busy = false; }
  }
  try { on = JSON.parse(localStorage.getItem('spl-push-topics') || '[]'); } catch (e) { on = []; }
  // after the splash and onboarding have had their moment, then whenever the fan's choices change
  setTimeout(sync, 6000);
  let last = JSON.stringify(topicsFor(prefs()));
  setInterval(() => { const now = JSON.stringify(topicsFor(prefs())); if (now !== last) { last = now; sync(); } }, 15000);
  FM.addListener('notificationActionPerformed', ev => { const d = ev && ev.notification && ev.notification.data || {}; const i = parseInt(d.match, 10);
    if (!isNaN(i)) SPLAPP.openMatch(i); else if (d.article) { SPLAPP.state.article = d.article; SPLAPP.go('article'); } });
})();
