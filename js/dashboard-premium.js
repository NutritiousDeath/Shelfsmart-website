// ─── DASHBOARD: AURA PREMIUM ──────────────────────────────────────────────────
// Self-mounting (like dashboard-mtg.js): adds an "Aura Premium" section to the
// top of the Billing tab and a small status strip to the MTG Arena tab.
//
// Aura Premium is PER PLAYER (not per server — that's AuraAI Pro/Lifetime):
//   • One Game  — $5/mo  (MTG Arena, Division 2 or Destiny 2)
//   • All Games — $10/mo (all of them + future games)
//   • Free: 3 AI builds a month; syncing / vault / locker always free
//
// Talks to Railway: GET /api/premium/status, POST /api/premium/checkout,
// POST /api/premium/portal (all authenticated with the Supabase session).

(function () {
  const API = (typeof RAILWAY_BOT_URL !== 'undefined') ? RAILWAY_BOT_URL : 'https://web-production-01b81.up.railway.app';
  const GAMES = [
    { id: 'mtg', label: 'MTG Arena' },
    { id: 'div2', label: 'Division 2' },
    { id: 'd2', label: 'Destiny 2' },
  ];
  const mono = 'font-family:var(--font-mono)';
  let selectedGame = 'mtg';
  let lastStatus = null;

  // ─── MARKUP ─────────────────────────────────────────────────────────────────

  const CSS = `
    #premium-section .pm-plans { display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:16px; margin-top:16px; }
    #premium-section .pm-plan { border:1px solid rgba(0,240,255,0.25); padding:18px 18px 16px; position:relative; background:rgba(0,240,255,0.03); }
    #premium-section .pm-plan.best { border-color:rgba(180,79,255,0.7); background:linear-gradient(135deg, rgba(180,79,255,0.12), rgba(0,240,255,0.04)); box-shadow:0 0 18px rgba(180,79,255,0.25); }
    #premium-section .pm-tag { position:absolute; top:-10px; right:12px; background:var(--purple); color:#fff; ${mono}; font-size:0.55rem; letter-spacing:2px; padding:3px 8px; }
    #premium-section .pm-name { font-family:var(--font-display); font-size:0.85rem; letter-spacing:2px; color:var(--white); }
    #premium-section .pm-price { font-family:var(--font-display); font-size:1.5rem; color:var(--cyan); margin:8px 0 4px; }
    #premium-section .pm-price small { font-size:0.7rem; color:var(--grey); }
    #premium-section .pm-list { ${mono}; font-size:0.7rem; color:var(--white); line-height:1.9; margin:10px 0 14px; padding-left:16px; }
    #premium-section .pm-games { display:flex; gap:6px; flex-wrap:wrap; margin:6px 0 12px; }
    #premium-section .pm-game { ${mono}; font-size:0.62rem; letter-spacing:1px; padding:6px 10px; border:1px solid rgba(255,255,255,0.15); background:transparent; color:var(--grey); cursor:pointer; }
    #premium-section .pm-game.on { border-color:var(--cyan); color:var(--cyan); background:rgba(0,240,255,0.08); }
    #premium-section .pm-status { display:flex; justify-content:space-between; gap:12px; align-items:center; flex-wrap:wrap; border:1px solid rgba(255,255,255,0.08); padding:12px 14px; }
    #premium-section .pm-msg { ${mono}; font-size:0.68rem; margin-top:10px; min-height:1em; }
    #premium-section button[disabled] { opacity:0.5; cursor:not-allowed; }
  `;

  // Player view: players (not server owners) only need MTG Arena + Aura Premium.
  const PLAYER_CSS = `
    body.aura-player-mode .sidebar > *:not([data-player-keep]):not(.status-indicator) { display:none !important; }
    body.aura-player-mode #tab-billing > *:not(#premium-section):not(.page-tag):not(.page-title):not(style):not(#pm-player-note) { display:none !important; }
    #pm-player-btn { width:100%; max-width:320px; font-family:var(--font-display); font-size:0.68rem; font-weight:700; letter-spacing:2px; padding:13px 24px;
      background:linear-gradient(90deg, rgba(180,79,255,0.9), rgba(0,240,255,0.85)); color:#050810; border:none; cursor:pointer;
      clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%); }
    #pm-player-btn:hover { filter:brightness(1.15); }
    #pm-player-sub { font-family:var(--font-mono); font-size:0.6rem; color:var(--grey); letter-spacing:0.5px; margin:-4px 0 6px; max-width:320px; line-height:1.7; }
  `;

  const SECTION_HTML = `
    <style>${CSS}</style>
    <div class="section-card" id="premium-section" style="border-color:rgba(180,79,255,0.45)">
      <p class="card-title">// aura premium — game features</p>
      <p style="${mono};font-size:0.66rem;color:var(--grey);line-height:1.8;letter-spacing:0.5px">
        For <span style="color:var(--white)">you as a player</span>, in any server with AuraAI — separate from AuraAI server licenses.
        AI builds for MTG Arena, Division 2 and Destiny 2. Everyone gets <span style="color:var(--cyan)">3 free AI builds a month</span>; syncing, collections, exports, vaults and gear lockers are always free.
      </p>
      <div class="pm-status" style="margin-top:14px">
        <div>
          <p style="${mono};font-size:0.58rem;color:var(--grey);letter-spacing:2px;margin-bottom:4px">YOUR PLAN</p>
          <p id="pm-plan" style="font-family:var(--font-display);font-size:0.95rem;color:var(--white);letter-spacing:1px">Loading…</p>
          <p id="pm-sub" style="${mono};font-size:0.66rem;color:var(--grey);margin-top:4px"></p>
        </div>
        <button class="btn-secondary" id="pm-manage" style="display:none;font-size:0.65rem;padding:7px 14px">Manage subscription</button>
      </div>
      <div class="pm-plans" id="pm-plans">
        <div class="pm-plan">
          <p class="pm-name">ONE GAME</p>
          <p class="pm-price">$5 <small>/ month</small></p>
          <div class="pm-games" id="pm-games"></div>
          <ul class="pm-list">
            <li>Unlimited AI builds &amp; refines for that game</li>
            <li>Other games keep the 3 free builds</li>
            <li>Upgrade to All Games anytime</li>
          </ul>
          <button class="btn-primary" id="pm-buy-one" style="width:100%">SUBSCRIBE</button>
        </div>
        <div class="pm-plan best">
          <span class="pm-tag">BEST VALUE</span>
          <p class="pm-name">ALL GAMES</p>
          <p class="pm-price">$10 <small>/ month</small></p>
          <ul class="pm-list">
            <li>Unlimited AI builds in MTG Arena, Division 2 &amp; Destiny 2</li>
            <li>Every future game Aura supports</li>
            <li>Already on One Game? Upgrading only charges the difference</li>
          </ul>
          <button class="btn-primary" id="pm-buy-all" style="width:100%">SUBSCRIBE</button>
        </div>
      </div>
      <p class="pm-msg" id="pm-msg"></p>
    </div>`;

  // ─── DATA ───────────────────────────────────────────────────────────────────

  async function authHeaders() {
    if (typeof sb === 'undefined') throw new Error('Not signed in');
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Not signed in');
    return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
  }

  const gameLabel = (id) => (GAMES.find((g) => g.id === id) || {}).label || id;
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '');
  const fmtUtcDate = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

  function msg(text, color) {
    const el = document.getElementById('pm-msg');
    if (el) { el.textContent = text || ''; el.style.color = color || 'var(--grey)'; }
  }

  function render(s) {
    lastStatus = s;
    const plan = document.getElementById('pm-plan');
    const sub = document.getElementById('pm-sub');
    const manage = document.getElementById('pm-manage');
    if (!plan) return;
    const left = Math.max(0, s.usage.freeLimit - s.usage.used);
    const resets = (() => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)); })();

    if (s.all) {
      plan.innerHTML = `⭐ <span style="color:var(--purple)">ALL GAMES</span>`;
      plan.style.color = 'var(--white)';
    } else if (s.games.length) {
      plan.innerHTML = `⭐ ${s.games.map(gameLabel).join(' + ').toUpperCase()}`;
    } else {
      plan.textContent = 'FREE';
    }

    const bits = [];
    if (s.owner) bits.push('Owner — everything unlocked');
    else if (s.comps.length) bits.push(`🎁 Comped: ${s.comps.map((c) => (c === 'all' ? 'All Games' : gameLabel(c))).join(', ')}`);
    if (s.subscription) {
      bits.push(s.subscription.status === 'past_due'
        ? '⚠️ Payment problem — update your card in Manage subscription'
        : s.subscription.cancelsAtPeriodEnd ? `Ends ${fmtDate(s.subscription.renewsAt)} (canceled)` : `Renews ${fmtDate(s.subscription.renewsAt)}`);
    }
    if (!s.all) bits.push(`${left} of ${s.usage.freeLimit} free AI builds left${s.games.length ? ' for other games' : ''} · resets ${fmtUtcDate(resets)}`);
    sub.textContent = bits.join(' · ');
    manage.style.display = s.subscription ? '' : 'none';

    // Plan buttons
    const one = document.getElementById('pm-buy-one');
    const all = document.getElementById('pm-buy-all');
    const hasSelected = s.all || s.games.includes(selectedGame);
    one.disabled = s.all || hasSelected || (!!s.subscription && s.subscription.plan === 'one');
    one.textContent = s.all ? 'INCLUDED IN ALL GAMES' : hasSelected ? 'YOU HAVE THIS GAME' : (s.subscription && s.subscription.plan === 'one') ? 'UPGRADE TO ALL GAMES →' : `SUBSCRIBE — ${gameLabel(selectedGame).toUpperCase()}`;
    all.disabled = s.all;
    all.textContent = s.all ? (s.owner || s.comps.includes('all') ? 'UNLOCKED' : 'CURRENT PLAN') : (s.subscription && s.subscription.plan === 'one') ? 'UPGRADE TO ALL GAMES' : 'SUBSCRIBE';

    renderStrip(s);
  }

  function renderGames() {
    const wrap = document.getElementById('pm-games');
    if (!wrap) return;
    wrap.innerHTML = '';
    for (const g of GAMES) {
      const b = document.createElement('button');
      b.className = `pm-game${g.id === selectedGame ? ' on' : ''}`;
      b.textContent = g.label.toUpperCase();
      b.addEventListener('click', () => { selectedGame = g.id; renderGames(); if (lastStatus) render(lastStatus); });
      wrap.appendChild(b);
    }
  }

  async function loadPremiumStatus() {
    try {
      const res = await fetch(`${API}/api/premium/status`, { headers: await authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      render(data);
    } catch (err) {
      if (err.message === 'Not signed in') return; // page still logging in — we retry when a tab opens
      const plan = document.getElementById('pm-plan');
      if (plan) plan.textContent = '—';
      msg(`Couldn't load your Premium status (${err.message}).`, 'var(--pink)');
    }
  }

  async function checkout(plan) {
    msg('Opening secure checkout…');
    ['pm-buy-one', 'pm-buy-all'].forEach((id) => { const b = document.getElementById(id); if (b) b.disabled = true; });
    try {
      const res = await fetch(`${API}/api/premium/checkout`, { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ plan, game: plan === 'one' ? selectedGame : undefined }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.upgraded) {
        msg('✅ Upgraded to All Games! Stripe only charges the difference for the rest of this month.', 'var(--green)');
        setTimeout(loadPremiumStatus, 2500);
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      msg(err.message, 'var(--pink)');
      if (lastStatus) render(lastStatus);
    }
  }

  async function openPortal() {
    msg('Opening Stripe…');
    try {
      const res = await fetch(`${API}/api/premium/portal`, { method: 'POST', headers: await authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      window.location.href = data.url;
    } catch (err) {
      msg(err.message, 'var(--pink)');
    }
  }

  // ─── MTG TAB STRIP ──────────────────────────────────────────────────────────

  function renderStrip(s) {
    const tab = document.getElementById('tab-mtg');
    if (!tab) return;
    let strip = document.getElementById('pm-mtg-strip');
    if (!strip) {
      strip = document.createElement('div');
      strip.id = 'pm-mtg-strip';
      strip.className = 'section-card';
      strip.style.cssText = 'border-color:rgba(180,79,255,0.45);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 18px';
      const hero = tab.querySelector('.mtg-hero');
      if (hero && hero.parentNode) hero.parentNode.insertBefore(strip, hero.nextSibling); else tab.prepend(strip);
    }
    const mtg = s.all || s.games.includes('mtg');
    const left = Math.max(0, s.usage.freeLimit - s.usage.used);
    strip.innerHTML = mtg
      ? `<p style="${mono};font-size:0.74rem;color:var(--white)">⭐ <span style="color:var(--purple)">Aura Premium</span> — unlimited AI deck builds &amp; refines.</p>`
      : `<p style="${mono};font-size:0.74rem;color:var(--white);line-height:1.8">🎟️ <span style="color:var(--cyan)">${left} of ${s.usage.freeLimit}</span> free AI builds left this month. Syncing, collection, exports &amp; wildcard checks are always free.</p>
         <button class="btn-primary" style="font-size:0.7rem;padding:8px 16px" id="pm-strip-btn">GET PREMIUM</button>`;
    const btn = document.getElementById('pm-strip-btn');
    if (btn) btn.addEventListener('click', goToBilling);
  }

  function goToBilling() {
    const btn = Array.from(document.querySelectorAll('.sidebar-item')).find((b) => (b.getAttribute('onclick') || '').includes("'billing'"));
    if (btn) btn.click();
    setTimeout(() => { const el = document.getElementById('premium-section'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 150);
  }

  // ─── PLAYER VIEW ────────────────────────────────────────────────────────────
  // The dashboard's "Access required — upgrade to Pro" wall is for server
  // owners. Players who only want the game features get a player view instead:
  // the MTG Arena tab + the Aura Premium card, nothing else.

  const INTENT_KEY = 'auraPlayerIntent';
  let playerMode = false;

  function sidebarButton(name) {
    return Array.from(document.querySelectorAll('.sidebar-item')).find((b) => (b.getAttribute('onclick') || '').includes(`'${name}'`));
  }

  function openTarget(target) {
    if (target === 'billing') goToBilling();
    else { const mtg = document.getElementById('mtg-sidebar-btn'); if (mtg) mtg.click(); }
  }

  function enterPlayerMode(target) {
    if (!playerMode) {
      playerMode = true;
      document.body.classList.add('aura-player-mode');
      const mtg = document.getElementById('mtg-sidebar-btn');
      if (mtg) { mtg.setAttribute('data-player-keep', ''); if (mtg.previousElementSibling) mtg.previousElementSibling.setAttribute('data-player-keep', ''); }
      const bill = sidebarButton('billing');
      if (bill) { bill.setAttribute('data-player-keep', ''); if (bill.previousElementSibling?.classList.contains('sidebar-section')) bill.previousElementSibling.setAttribute('data-player-keep', ''); }
      const overlay = document.getElementById('paywall-overlay');
      if (overlay) overlay.classList.add('hidden');
      const billing = document.getElementById('tab-billing');
      if (billing && !document.getElementById('pm-player-note')) {
        const note = document.createElement('p');
        note.id = 'pm-player-note';
        note.style.cssText = `${mono};font-size:0.62rem;color:var(--grey);margin:-6px 0 14px;letter-spacing:0.5px`;
        note.innerHTML = 'Run a Discord server? <a href="#" id="pm-owner-link" style="color:var(--cyan)">AuraAI Pro</a> unlocks the full server dashboard.';
        const title = billing.querySelector('.page-title');
        billing.insertBefore(note, title ? title.nextSibling : billing.firstChild);
        note.querySelector('#pm-owner-link').addEventListener('click', (e) => { e.preventDefault(); document.body.classList.remove('aura-player-mode'); playerMode = false; if (overlay) overlay.classList.remove('hidden'); });
      }
    }
    openTarget(target || 'mtg');
    loadPremiumStatus();
  }

  function addPaywallButton() {
    const stripeBtn = document.getElementById('paywall-stripe-btn');
    if (!stripeBtn || document.getElementById('pm-player-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'pm-player-btn';
    btn.textContent = '🎮 PLAYER? GAME FEATURES →';
    btn.addEventListener('click', () => enterPlayerMode('mtg'));
    const sub = document.createElement('p');
    sub.id = 'pm-player-sub';
    sub.textContent = 'MTG Arena sync, Division 2 & Destiny 2 builds — free to start, no server needed.';
    stripeBtn.parentNode.insertBefore(btn, stripeBtn);
    stripeBtn.parentNode.insertBefore(sub, stripeBtn);
  }

  function readIntent() {
    const params = new URLSearchParams(window.location.search);
    let intent = null;
    if (params.get('premium')) intent = `premium:${params.get('premium')}`;
    else if (params.get('tab') === 'mtg') intent = 'tab:mtg';
    try {
      if (intent) sessionStorage.setItem(INTENT_KEY, intent); // survives the Discord login redirect
      else intent = sessionStorage.getItem(INTENT_KEY);
    } catch (e) { /* storage blocked — fine */ }
    if (params.get('premium') || params.get('tab')) history.replaceState(null, '', window.location.pathname);
    return intent;
  }

  function clearIntent() { try { sessionStorage.removeItem(INTENT_KEY); } catch (e) { /* ignore */ } }

  // Waits for the dashboard's own login/access check to finish, then routes.
  function routeWhenReady(intent) {
    let tries = 0;
    const timer = setInterval(async () => {
      tries++;
      const loading = document.getElementById('loading');
      const ready = !loading || loading.classList.contains('hidden');
      if (!ready && tries < 80) return;
      clearInterval(timer);
      const overlay = document.getElementById('paywall-overlay');
      const walled = overlay && !overlay.classList.contains('hidden');
      if (walled) addPaywallButton();

      const [kind, value] = (intent || '').split(':');
      const target = kind === 'premium' ? 'billing' : kind === 'tab' ? 'mtg' : null;
      if (target) {
        clearIntent();
        if (walled) enterPlayerMode(target); else openTarget(target);
        if (kind === 'premium' && value === 'success') { msg('✅ Welcome to Aura Premium! It can take a few seconds to activate — this refreshes automatically.', 'var(--green)'); setTimeout(loadPremiumStatus, 3000); setTimeout(loadPremiumStatus, 8000); }
        if (kind === 'premium' && value === 'cancelled') msg('Checkout cancelled — nothing was charged.', 'var(--grey)');
        return;
      }
      // Already a player (Premium, or has used free builds)? Skip the wall.
      if (walled) {
        try {
          const res = await fetch(`${API}/api/premium/status`, { headers: await authHeaders() });
          const st = await res.json();
          if (res.ok && (st.all || (st.games || []).length || (st.usage && st.usage.used > 0))) enterPlayerMode('mtg');
        } catch (e) { /* stay on the wall */ }
      }
    }, 250);
  }

  // ─── MOUNT ──────────────────────────────────────────────────────────────────

  function mount() {
    const billing = document.getElementById('tab-billing');
    if (billing && !document.getElementById('premium-section')) {
      const holder = document.createElement('div');
      holder.innerHTML = SECTION_HTML;
      const title = billing.querySelector('.page-title');
      const anchor = title ? title.nextSibling : billing.firstChild;
      while (holder.firstChild) billing.insertBefore(holder.firstChild, anchor);
      renderGames();
      document.getElementById('pm-buy-one').addEventListener('click', () => checkout(lastStatus && lastStatus.subscription && lastStatus.subscription.plan === 'one' ? 'all' : 'one'));
      document.getElementById('pm-buy-all').addEventListener('click', () => checkout('all'));
      document.getElementById('pm-manage').addEventListener('click', openPortal);
    }
    // Refresh whenever Billing or MTG Arena is opened.
    for (const b of document.querySelectorAll('.sidebar-item')) {
      const oc = b.getAttribute('onclick') || '';
      if (oc.includes("'billing'") || b.id === 'mtg-sidebar-btn') b.addEventListener('click', loadPremiumStatus);
    }
    // Player view + links from Discord / Stripe (?premium=…, ?tab=mtg).
    const style = document.createElement('style');
    style.textContent = PLAYER_CSS;
    document.head.appendChild(style);
    routeWhenReady(readIntent());
    loadPremiumStatus();
  }

  window.loadPremiumStatus = loadPremiumStatus;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(mount, 0));
  else setTimeout(mount, 0);
})();
