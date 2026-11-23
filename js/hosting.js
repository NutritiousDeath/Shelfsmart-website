// ─── SHELFSMART GAMING — HOSTING LOGIN + SERVER PANEL ─────────────────────────
// Used by hosting/index.html (sign in / create account / email link) and
// hosting/panel.html (the customer's server panel).
//
// Signs in with Supabase Auth (email + password, or a one-time email link).
// This is SEPARATE from the Discord login used by the AuraAI dashboard: the
// session is kept under its own storage key so signing in here never signs
// you out of the dashboard (and the other way round).
//
// The panel never reads the database directly. Everything goes through the
// AuraAI gateway on Railway (/api/hosting/*), which checks the signed-in
// account owns the server before queueing anything.
//
// Orders: the panel also holds the order form (nothing is made until an admin
// clicks Create — later Stripe will) and, for admins only, the order list
// with Create / Reject, plus Delete on customer servers.

(function () {
  const SUPABASE_URL = 'https://uptxufmqqwjytffhbcdd.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_ywJBdP4VLUWuRVdjdgvAuA_HQ_9Ro--'; // publishable key, safe to be public
  const API = 'https://web-production-01b81.up.railway.app';
  const PANEL_URL = location.origin + '/hosting/panel.html';
  const LOGIN_URL = '/hosting/';

  const REFRESH_MS = 15 * 1000;
  const JOB_POLL_MS = 1500;
  const JOB_POLL_MAX = 30;
  const NAME_RE = /^[A-Za-z0-9_]{3,16}$/;
  // Bedrock Edition: Xbox gamertags (letters, numbers, single spaces, optional #1234 ending).
  const GAMERTAG_RE = /^(?=.{1,16}$)[A-Za-z0-9]+(?: [A-Za-z0-9]+)*(?:#[0-9]{1,4})?$/;
  const isBedrock = (s) => s && s.edition === 'bedrock';

  if (!window.supabase) { console.error('supabase-js failed to load'); return; }
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { storageKey: 'ssg-hosting-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function timeAgo(iso) {
    if (!iso) return '';
    const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    return `${Math.floor(s / 86400)} d ago`;
  }

  // Supabase's error text, turned into something a customer can act on.
  function authMessage(err) {
    const m = String(err?.message || err || '');
    if (/invalid login credentials/i.test(m)) return 'That email and password don\'t match. Check them, or use "Email me a link".';
    if (/email not confirmed/i.test(m)) return 'Confirm your email first. Check your inbox (and spam) for the link we sent.';
    if (/already registered|already exists/i.test(m)) return 'There\'s already an account with that email. Sign in instead.';
    if (/rate limit|too many|security purposes/i.test(m)) return 'Too many attempts. Wait a minute, then try again.';
    if (/password/i.test(m) && /(least|short|weak)/i.test(m)) return 'Use a longer password: at least 8 characters.';
    if (/signups? not allowed|user not found|not allowed for otp/i.test(m)) return 'There\'s no account with that email. Create one first.';
    return m || 'Something went wrong. Try again.';
  }

  function note(el, text, kind) {
    if (!el) return;
    el.textContent = text || '';
    el.className = `form-note${kind ? ` ${kind}` : ''}`;
  }

  // ─── SIGN-IN PAGE ─────────────────────────────────────────────────────────

  async function initLogin() {
    const authNote = $('#auth-note');
    const tabs = ['signin', 'signup', 'link'];

    function show(name) {
      for (const t of tabs) {
        const on = t === name;
        $(`#tab-${t}`).setAttribute('aria-selected', String(on));
        $(`#form-${t}`).hidden = !on;
      }
      note(authNote, '');
      $(`#form-${name} input`)?.focus();
    }
    for (const t of tabs) $(`#tab-${t}`).addEventListener('click', () => show(t));
    document.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => {
      const email = $('#si-email').value;
      show(b.dataset.goto);
      if (email) $('#ml-email').value = email;
    }));

    // Arriving from a confirmation email or sign-in link, or already signed in.
    const { data: { session } } = await sb.auth.getSession();
    if (session) { location.replace(PANEL_URL); return; }
    sb.auth.onAuthStateChange((event, s) => { if (s && event === 'SIGNED_IN') location.replace(PANEL_URL); });

    const params = new URLSearchParams(location.hash.slice(1) || location.search);
    if (params.get('error_description')) note(authNote, `That link didn't work: ${params.get('error_description')}. Request a new one.`, 'err');

    async function busy(form, fn) {
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try { await fn(); } finally { btn.disabled = false; }
    }

    $('#form-signin').addEventListener('submit', (e) => {
      e.preventDefault();
      busy(e.target, async () => {
        note(authNote, 'Signing in…');
        const { error } = await sb.auth.signInWithPassword({ email: $('#si-email').value.trim(), password: $('#si-pass').value });
        if (error) return note(authNote, authMessage(error), 'err');
        location.replace(PANEL_URL);
      });
    });

    $('#form-signup').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = $('#su-email').value.trim();
      const pass = $('#su-pass').value;
      if (pass.length < 8) return note(authNote, 'Use a longer password: at least 8 characters.', 'err');
      if (pass !== $('#su-pass2').value) return note(authNote, 'The two passwords don\'t match.', 'err');
      busy(e.target, async () => {
        note(authNote, 'Creating your account…');
        const { data, error } = await sb.auth.signUp({ email, password: pass, options: { emailRedirectTo: PANEL_URL } });
        if (error) return note(authNote, authMessage(error), 'err');
        // Supabase returns a user with no identities when the email is already taken.
        if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          return note(authNote, 'There\'s already an account with that email. Sign in instead.', 'err');
        }
        if (data?.session) { location.replace(PANEL_URL); return; }
        e.target.reset();
        note(authNote, `Check ${email} for a confirmation link. Open it to finish creating your account.`, 'ok');
      });
    });

    $('#form-link').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = $('#ml-email').value.trim();
      busy(e.target, async () => {
        note(authNote, 'Sending your link…');
        const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: PANEL_URL } });
        if (error) return note(authNote, authMessage(error), 'err');
        note(authNote, `If there's an account for ${email}, a sign-in link is on its way. It expires soon, so use it shortly.`, 'ok');
      });
    });
  }

  // ─── PANEL ────────────────────────────────────────────────────────────────

  let session = null;
  let lastData = null;
  const busy = new Set();      // server ids with an action in flight
  const notes = new Map();     // server id -> { text, kind }, survives re-renders
  let timer = null;

  const LABEL = { start: 'Start', stop: 'Stop', restart: 'Restart', whitelist_add: 'Player added', whitelist_remove: 'Player removed', say: 'Message', backup: 'Backup', create_server: 'Server created', delete_server: 'Delete server' };
  let ordersData = null;
  let ordersAt = 0;               // orders change rarely: refreshed once a minute, or right after an action
  const ORDERS_EVERY_MS = 60 * 1000;
  let fastTimer = null;

  async function api(path, { method = 'GET', body } = {}) {
    const { data } = await sb.auth.getSession();
    session = data.session;
    if (!session) { location.replace(LOGIN_URL); throw new Error('Not signed in'); }
    const res = await fetch(API + path, {
      method,
      headers: { Authorization: `Bearer ${session.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) {
      await sb.auth.signOut();
      location.replace(LOGIN_URL);
      throw new Error('Not signed in');
    }
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
    return json;
  }

  function stateOf(s) {
    if (s.status === 'suspended') return { text: 'Suspended', cls: 'building' };
    if (s.status === 'missing') return { text: 'Unavailable', cls: 'planned' };
    if (!s.live) return { text: 'No data yet', cls: 'planned' };
    if (s.live.crashed) return { text: 'Crashed', cls: 'building' };
    return s.live.running ? { text: 'Online', cls: 'live' } : { text: 'Offline', cls: 'planned' };
  }

  function addressHtml(s) {
    // Bedrock has no SRV records, so players type the address and port in
    // two separate boxes. Show (and copy) them separately.
    if (s.address && isBedrock(s)) {
      const m = /^(.*?)(?::(\d{1,5}))?$/.exec(s.address);
      const host = m ? m[1] : s.address;
      const port = m && m[2] ? m[2] : '';
      return `<span class="addr-label">Server address</span><span class="addr-value">${esc(host)}</span>
        <button type="button" class="btn ghost slim" data-copy="${esc(host)}">Copy</button>
        <span class="addr-label addr-port">Port</span><span class="addr-value">${esc(port || '—')}</span>
        ${port ? `<button type="button" class="btn ghost slim" data-copy="${esc(port)}">Copy</button>` : ''}`;
    }
    if (s.address) {
      return `<span class="addr-label">Address</span><span class="addr-value">${esc(s.address)}</span>
        <button type="button" class="btn ghost slim" data-copy="${esc(s.address)}">Copy</button>`;
    }
    return `<span class="addr-label">Address</span><span class="addr-soon">Coming soon. We'll show it here as soon as it's set.</span>`;
  }

  function jobLine(j) {
    const icon = j.status === 'done' ? '✓' : j.status === 'failed' ? '✕' : '…';
    const what = `${LABEL[j.action] || j.action}${j.arg ? ` ${j.arg}` : ''}`;
    const result = j.result || (j.status === 'queued' ? 'Waiting for the host…' : 'Working…');
    return `<li><span class="ico ${esc(j.status)}">${icon}</span><span class="what">${esc(what)}</span>
      <span>${esc(result)}</span><span>${esc(j.from ? `${j.from}, ` : '')}${esc(timeAgo(j.createdAt))}</span></li>`;
  }

  function serverHtml(s, hostOk) {
    const st = stateOf(s);
    const live = s.live || {};
    const running = !!live.running;
    const can = hostOk && s.status === 'active' && !busy.has(s.id);
    const dis = (cond) => (can && cond ? '' : 'disabled');
    const online = new Set(live.players || []);
    const whitelist = live.whitelist || [];
    const n = notes.get(s.id);
    const bed = isBedrock(s);
    const nameWord = bed ? 'Xbox gamertag' : 'Minecraft name';

    return `<article class="srv${running ? ' on' : ''}" data-id="${esc(s.id)}" aria-labelledby="srv-${esc(s.id)}">
      <div class="srv-head">
        <h2 id="srv-${esc(s.id)}">${esc(s.name)}</h2>
        <span class="edition${bed ? ' bedrock' : ''}">${bed ? 'Bedrock' : 'Java'}</span>
        <p class="status ${st.cls}">${esc(st.text)}</p>
        ${busy.has(s.id) ? '<span class="busy">Working…</span>' : ''}
      </div>
      <div class="addr">${addressHtml(s)}</div>

      <dl class="srv-stats">
        <div><dt>Players online</dt><dd>${s.live ? `${esc(live.online)} / ${esc(live.max)}` : '—'}</dd></div>
        <div><dt>Version</dt><dd>${esc(live.version || '—')}</dd></div>
        <div><dt>Last update</dt><dd>${esc(live.updatedAt ? timeAgo(live.updatedAt) : '—')}</dd></div>
      </dl>

      <div class="srv-actions">
        <button class="btn" data-act="start" ${dis(!running)}>Start</button>
        <button class="btn ghost" data-act="restart" ${dis(running)}>Restart</button>
        <button class="btn danger" data-act="stop" ${dis(running)}>Stop</button>
      </div>
      <p class="srv-note${n ? ` ${n.kind}` : ''}" role="status" aria-live="polite">${esc(n?.text || '')}</p>

      <section class="srv-section">
        <h3>Who can join <span class="muted">· ${bed ? 'Allowlist' : 'Whitelist'}</span></h3>
        <p>Only players on this list can join. It's always on, which keeps bots and strangers out. ${running ? '' : 'Start the server to change it.'}</p>
        <div class="chips">${whitelist.length
          ? whitelist.map((name) => `<span class="chip${online.has(name) ? ' online' : ''}" title="${online.has(name) ? 'Online now' : ''}">${esc(name)}<button type="button" data-remove="${esc(name)}" aria-label="Remove ${esc(name)}" ${dis(running)}>×</button></span>`).join('')
          : `<p class="muted">Nobody yet. Add your own ${nameWord} first.</p>`}</div>
        <form class="inline-form" data-form="whitelist">
          <input name="player" maxlength="${bed ? 24 : 16}" placeholder="${nameWord}" aria-label="${nameWord} to add" autocomplete="off" ${running ? '' : 'disabled'}>
          <button class="btn slim" type="submit" ${dis(running)}>Add player</button>
        </form>
      </section>

      <section class="srv-section">
        <h3>Message everyone online</h3>
        <form class="inline-form" data-form="say">
          <input name="message" maxlength="200" placeholder="Server restarting in 5 minutes" aria-label="Message to send" autocomplete="off" ${running ? '' : 'disabled'}>
          <button class="btn slim" type="submit" ${dis(running)}>Send</button>
        </form>
      </section>

      ${(s.recentJobs || []).length ? `<section class="srv-section"><h3>Recent activity</h3><ul class="activity">${s.recentJobs.map(jobLine).join('')}</ul></section>` : ''}
      ${s.deletable ? `<div class="srv-admin"><span>Admin</span><button type="button" class="btn danger slim" data-delete="1" ${hostOk && !busy.has(s.id) ? '' : 'disabled'}>Delete server</button><span>Stops it, takes a last backup, then removes it from the host.</span></div>` : ''}
    </article>`;
  }

  function render(data) {
    lastData = data;
    $('#account-email').textContent = data.email || session?.user?.email || '';
    $('#admin-badge').hidden = !data.isAdmin;
    $('#account-bar').hidden = false;

    const hostLine = $('#host-line');
    const hostOk = !!data.host?.online && !data.host?.problem;
    hostLine.className = `host-line ${hostOk ? 'ok' : 'bad'}`;
    hostLine.innerHTML = `<span class="dot"></span>${esc(hostOk ? 'The host is online. Controls are ready.' : (data.host?.problem || 'The host is offline right now.'))}`;

    const box = $('#servers');
    // Don't wipe what someone is typing during an auto-refresh.
    if (box.contains(document.activeElement) && document.activeElement.tagName === 'INPUT' && document.activeElement.value) return;

    if (!data.servers.length) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = data.servers.map((s) => serverHtml(s, hostOk)).join('');
  }

  // ─── ORDERS ───────────────────────────────────────────────────────────────

  const ORDER_STATE = {
    pending: { text: 'Waiting for review', cls: 'building' },
    creating: { text: 'Being set up', cls: 'live' },
    active: { text: 'Ready', cls: 'live' },
    failed: { text: 'Setup hit a problem', cls: 'building' },
    rejected: { text: 'Not approved', cls: 'planned' },
    cancelled: { text: 'Cancelled', cls: 'planned' },
    deleted: { text: 'Deleted', cls: 'planned' },
  };
  const MODE = { survival: 'Survival', creative: 'Creative', adventure: 'Adventure' };
  const WORLD = { normal: 'Normal', large_biomes: 'Large biomes', amplified: 'Amplified', flat: 'Superflat' };

  function orderMeta(o) {
    return `<ul class="order-meta">
      <li><b>${esc(MODE[o.gamemode] || o.gamemode)}</b>, ${esc(o.difficulty)}</li>
      <li>World: <b>${esc(WORLD[o.worldType] || o.worldType)}</b>${o.seed ? ` (seed ${esc(o.seed)})` : ''}</li>
      <li>Up to <b>${esc(o.maxPlayers)}</b> players, PvP ${o.pvp ? 'on' : 'off'}</li>
      <li>Whitelist: <b>${esc([o.ownerName, ...(o.players || [])].join(', '))}</b></li>
    </ul>`;
  }

  function orderCard(o) {
    const st = ORDER_STATE[o.status] || { text: o.status, cls: 'planned' };
    const text = {
      pending: 'We\'ll check it and set it up soon. It shows up on this page as soon as it\'s ready.',
      creating: 'Aura is building your server now. This usually takes a few minutes. This page updates on its own.',
      failed: `${o.note ? `${o.note} ` : ''}We've been told and will try again.`,
      rejected: o.note || 'This order wasn\'t approved.',
    }[o.status] || '';
    return `<article class="order-card" data-order="${esc(o.id)}">
      <p class="status ${st.cls}">${esc(st.text)}</p>
      <h3>${esc(o.serverName)}</h3>
      <p>${esc(text)}</p>
      ${orderMeta(o)}
      ${o.status === 'pending' ? '<div class="actions"><button type="button" class="btn ghost slim" data-cancel-order="1">Cancel order</button></div>' : ''}
      <p class="form-note" data-order-note role="status" aria-live="polite"></p>
    </article>`;
  }

  function renderOrders() {
    const box = $('#orders');
    const formSection = $('#order-section');
    if (!ordersData) return;
    const { slots, orders } = ordersData;
    const servers = lastData?.servers || [];
    const latest = orders[0];
    const open = orders.some((o) => o.status === 'pending' || o.status === 'creating');
    const showLatest = latest && ['pending', 'creating', 'failed', 'rejected'].includes(latest.status);

    let html = showLatest ? orderCard(latest) : '';
    if (!open) {
      if (slots.soldOut) {
        html += `<div class="order-cta"><p><span class="spots">All ${esc(slots.total)} server spots are taken.</span> <a href="/pages/contact.html?topic=hosting">Join the waitlist</a> and we'll email you when one opens.</p></div>`;
        formSection.hidden = true;
      } else if (formSection.hidden) {
        html += `<div class="order-cta">
          <button type="button" class="btn" data-open-order="1">Set up a new server</button>
          <p><span class="spots">${esc(slots.available)} of ${esc(slots.total)} spots open.</span> ${servers.length ? 'Want another world? Order one here.' : 'You don\'t have a server yet. Order one and it appears here when it\'s ready.'}</p>
        </div>`;
      }
    } else {
      formSection.hidden = true;
    }
    box.innerHTML = html;
    renderAdmin();

    clearTimeout(fastTimer);
    const creating = open || (ordersData.admin?.orders || []).some((o) => o.status === 'creating');
    if (creating) fastTimer = setTimeout(() => { if (!document.hidden && !busy.size) load({ orders: true }); }, 5000);
  }

  function renderAdmin() {
    const section = $('#admin-section');
    const admin = ordersData?.admin;
    if (!admin) { section.hidden = true; return; }
    section.hidden = false;
    const { slots } = ordersData;
    $('#admin-slots').textContent = `Spots in use: ${slots.used} of ${slots.total}. Pending orders don't take a spot until you click Create.`;
    const list = admin.orders;
    if (!list.length) { $('#admin-orders').innerHTML = '<p class="muted">No orders yet.</p>'; return; }
    const rank = { pending: 0, failed: 1, creating: 2 };
    const sorted = [...list].sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9));
    const hostOk = !!lastData?.host?.online && !lastData?.host?.problem;
    $('#admin-orders').innerHTML = `<ul class="admin-list">${sorted.map((o) => {
      const st = ORDER_STATE[o.status] || { text: o.status, cls: 'planned' };
      const canAct = o.status === 'pending' || o.status === 'failed';
      return `<li data-admin-order="${esc(o.id)}">
        <div>
          <h3>${esc(o.serverName)}</h3>
          <p class="who">${esc(o.email)} · ${esc(timeAgo(o.createdAt))}</p>
          <p class="status ${st.cls}">${esc(st.text)}</p>
          ${o.note ? `<p class="who">${esc(o.note)}</p>` : ''}
          ${orderMeta(o)}
        </div>
        <div class="btns">${canAct
          ? `<button type="button" class="btn slim" data-admin="create" ${hostOk && !slots.soldOut ? '' : 'disabled'} title="${hostOk ? (slots.soldOut ? 'All spots are in use' : '') : 'The host is offline'}">${o.status === 'failed' ? 'Try again' : 'Create server'}</button>
             <button type="button" class="btn ghost slim" data-admin="reject">Reject</button>`
          : ''}</div>
        <p class="form-note order-note" data-order-note role="status" aria-live="polite"></p>
      </li>`;
    }).join('')}</ul>`;
  }

  async function load(opts = {}) {
    try {
      const wantOrders = opts.orders || !ordersData || Date.now() - ordersAt >= ORDERS_EVERY_MS;
      const [servers, orders] = await Promise.all([
        api('/api/hosting/servers'),
        wantOrders ? api('/api/hosting/orders').catch((err) => { if (err.message === 'Not signed in') throw err; return null; }) : Promise.resolve(null),
      ]);
      render(servers);
      if (orders) { ordersData = orders; ordersAt = Date.now(); }
      if (ordersData) renderOrders();
      if (!servers.servers.length && !ordersData) $('#servers').innerHTML = '<p class="muted">No servers on this account yet.</p>';
    } catch (err) {
      if (err.message === 'Not signed in') return;
      if (!lastData) $('#servers').innerHTML = `<p class="form-note err">Couldn't load your servers: ${esc(err.message)}</p>`;
    }
  }

  function orderNote(scope, text, kind) {
    const el = scope?.querySelector('[data-order-note]') || $('#order-note');
    note(el, text, kind);
  }

  async function submitOrder(form) {
    const f = form.elements;
    const body = {
      serverName: f.serverName.value.trim(),
      motd: f.motd.value.trim(),
      gamemode: f.gamemode.value,
      difficulty: f.difficulty.value,
      worldType: f.worldType.value,
      seed: f.seed.value.trim(),
      maxPlayers: Number(f.maxPlayers.value),
      pvp: f.pvp.checked,
      ownerName: f.ownerName.value.trim(),
      players: f.players.value,
    };
    const noteEl = $('#order-note');
    if (!/^[A-Za-z0-9][A-Za-z0-9 _'\-]{1,30}[A-Za-z0-9]$/.test(body.serverName.replace(/\s+/g, ' '))) { f.serverName.focus(); return note(noteEl, 'Server name: 3–32 letters, numbers, spaces, - _ or \', starting and ending with a letter or number.', 'err'); }
    if (!NAME_RE.test(body.ownerName)) { f.ownerName.focus(); return note(noteEl, 'Your Minecraft name: 3–16 letters, numbers or underscores.', 'err'); }
    if (!Number.isInteger(body.maxPlayers) || body.maxPlayers < 1 || body.maxPlayers > 10) { f.maxPlayers.focus(); return note(noteEl, 'Max players: 1 to 10.', 'err'); }
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    note(noteEl, 'Sending your order…', 'wait');
    try {
      await api('/api/hosting/order', { method: 'POST', body });
      form.reset();
      note(noteEl, '');
      $('#order-section').hidden = true;
      await load({ orders: true });
      $('#orders').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      note(noteEl, err.message, 'err');
    } finally {
      btn.disabled = false;
    }
  }

  async function ordersClick(e) {
    const btn = e.target.closest('button');
    if (!btn || btn.disabled) return;

    if (btn.dataset.openOrder) {
      $('#order-section').hidden = false;
      renderOrders();
      $('#o-name').focus();
      $('#order-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (btn.dataset.cancelOrder) {
      const card = btn.closest('[data-order]');
      if (!confirm('Cancel this order?')) return;
      btn.disabled = true;
      try { await api('/api/hosting/order/cancel', { method: 'POST', body: { orderId: card.dataset.order } }); await load({ orders: true }); }
      catch (err) { btn.disabled = false; orderNote(card, err.message, 'err'); }
      return;
    }

    if (btn.dataset.admin) {
      const row = btn.closest('[data-admin-order]');
      const orderId = row.dataset.adminOrder;
      const name = row.querySelector('h3')?.textContent || 'this server';
      let body = { orderId, action: btn.dataset.admin };
      if (btn.dataset.admin === 'create' && !confirm(`Create "${name}" on the host now?`)) return;
      if (btn.dataset.admin === 'reject') {
        const reason = prompt('Reason the customer will see (optional):', '');
        if (reason === null) return;
        body.reason = reason;
      }
      row.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      orderNote(row, btn.dataset.admin === 'create' ? 'Sending to the host…' : 'Saving…', 'wait');
      try { await api('/api/hosting/admin/order', { method: 'POST', body }); await load({ orders: true }); }
      catch (err) { orderNote(row, err.message, 'err'); row.querySelectorAll('button').forEach((b) => { b.disabled = false; }); }
    }
  }

  async function deleteServer(serverId) {
    const server = lastData?.servers.find((s) => s.id === serverId);
    if (!server) return;
    const typed = prompt(`This deletes "${server.name}" from the host (a last backup is taken first).\n\nType the server's name to confirm:`, '');
    if (typed === null) return;
    if (typed.trim() !== server.name) return setNote(serverId, 'The name didn\'t match, so nothing was deleted.', 'err');
    busy.add(serverId);
    setNote(serverId, 'Delete server: sending to the host…', 'wait');
    if (lastData) render(lastData);
    try {
      const { job } = await api('/api/hosting/admin/server/delete', { method: 'POST', body: { serverId, confirmName: typed.trim() } });
      const done = await waitForJob(job.id);
      busy.delete(serverId);
      if (!done) setNote(serverId, 'Still working. This page updates on its own.', 'wait');
      else if (done.status === 'done') setNote(serverId, `✓ ${done.result || 'Deleted.'}`, 'ok');
      else setNote(serverId, `✕ ${done.result || 'That didn\'t work.'}`, 'err');
      await load({ orders: true });
    } catch (err) {
      busy.delete(serverId);
      setNote(serverId, err.message, 'err');
      if (lastData) render(lastData);
    }
  }

  async function waitForJob(id) {
    for (let i = 0; i < JOB_POLL_MAX; i++) {
      await new Promise((r) => setTimeout(r, JOB_POLL_MS));
      try {
        const { job } = await api(`/api/hosting/job?id=${encodeURIComponent(id)}`);
        if (job.status === 'done' || job.status === 'failed') return job;
      } catch (_) { /* keep trying */ }
    }
    return null;
  }

  function setNote(id, text, kind) {
    if (text) notes.set(id, { text, kind }); else notes.delete(id);
    const el = document.querySelector(`.srv[data-id="${CSS.escape(id)}"] .srv-note`);
    if (el) { el.textContent = text || ''; el.className = `srv-note${kind ? ` ${kind}` : ''}`; }
  }

  async function run(serverId, action, arg) {
    if (busy.has(serverId)) return;
    if (action === 'stop' && !confirm('Stop the server? Everyone online will be disconnected.')) return;
    if (action === 'restart' && !confirm('Restart the server? Everyone online will be disconnected for about a minute.')) return;
    if (action === 'whitelist_remove' && !confirm(`Remove ${arg}? They won't be able to join until you add them again.`)) return;

    busy.add(serverId);
    setNote(serverId, `${LABEL[action]}${arg ? ` ${arg}` : ''}: sending to the host…`, 'wait');
    if (lastData) render(lastData);
    try {
      const { job } = await api('/api/hosting/action', { method: 'POST', body: { serverId, action, arg } });
      const done = await waitForJob(job.id);
      busy.delete(serverId);
      if (!done) setNote(serverId, 'Still working. This page updates on its own.', 'wait');
      else if (done.status === 'done') setNote(serverId, `✓ ${done.result || 'Done.'}`, 'ok');
      else setNote(serverId, `✕ ${done.result || 'That didn\'t work.'}`, 'err');
      await load();
      if (['start', 'stop', 'restart'].includes(action)) setTimeout(load, 12000);
    } catch (err) {
      busy.delete(serverId);
      setNote(serverId, err.message, 'err');
      if (lastData) render(lastData);
    }
  }

  async function initPanel() {
    const { data } = await sb.auth.getSession();
    session = data.session;
    if (!session) { location.replace(LOGIN_URL); return; }
    // Clean the token out of the address bar after an email-link sign-in.
    if (location.hash.includes('access_token')) history.replaceState(null, '', location.pathname);

    sb.auth.onAuthStateChange((event, s) => {
      session = s;
      if (event === 'SIGNED_OUT') location.replace(LOGIN_URL);
    });

    const box = $('#servers');
    box.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn || btn.disabled) return;
      const id = btn.closest('.srv')?.dataset.id;
      if (btn.dataset.act) return run(id, btn.dataset.act);
      if (btn.dataset.delete) return deleteServer(id);
      if (btn.dataset.remove) return run(id, 'whitelist_remove', btn.dataset.remove);
      if (btn.dataset.copy) {
        navigator.clipboard?.writeText(btn.dataset.copy).then(() => {
          btn.textContent = 'Copied';
          setTimeout(() => { btn.textContent = 'Copy'; }, 1400);
        }).catch(() => {});
      }
    });
    box.addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      const id = form.closest('.srv')?.dataset.id;
      const input = form.querySelector('input');
      const value = input.value.trim();
      if (form.dataset.form === 'whitelist') {
        const bed = isBedrock(lastData?.servers.find((x) => x.id === id));
        const name = bed ? value.replace(/\s+/g, ' ') : value;
        if (bed && !GAMERTAG_RE.test(name)) return setNote(id, 'Xbox gamertags are up to 16 letters, numbers and single spaces.', 'err');
        if (!bed && !NAME_RE.test(name)) return setNote(id, 'Minecraft names are 3–16 letters, numbers or underscores.', 'err');
        input.value = '';
        return run(id, 'whitelist_add', name);
      }
      if (form.dataset.form === 'say') {
        if (!value) return setNote(id, 'Type a message first.', 'err');
        input.value = '';
        return run(id, 'say', value);
      }
    });

    // Orders + admin.
    $('#orders').addEventListener('click', ordersClick);
    $('#admin-section').addEventListener('click', ordersClick);
    $('#order-form').addEventListener('submit', (e) => { e.preventDefault(); submitOrder(e.target); });
    $('#order-cancel').addEventListener('click', () => { $('#order-section').hidden = true; note($('#order-note'), ''); renderOrders(); });

    // Account: change password, sign out.
    const pwForm = $('#password-form');
    const pwNote = $('#password-note');
    $('#btn-password').addEventListener('click', () => { pwForm.hidden = false; note(pwNote, ''); $('#np-1').focus(); });
    $('#btn-password-cancel').addEventListener('click', () => { pwForm.hidden = true; pwForm.reset(); });
    pwForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const p1 = $('#np-1').value;
      if (p1.length < 8) return note(pwNote, 'Use at least 8 characters.', 'err');
      if (p1 !== $('#np-2').value) return note(pwNote, 'The two passwords don\'t match.', 'err');
      const btn = pwForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      const { error } = await sb.auth.updateUser({ password: p1 });
      btn.disabled = false;
      if (error) return note(pwNote, authMessage(error), 'err');
      pwForm.reset();
      note(pwNote, 'Password changed.', 'ok');
      setTimeout(() => { pwForm.hidden = true; note(pwNote, ''); }, 2500);
    });
    $('#btn-signout').addEventListener('click', async () => {
      await sb.auth.signOut();
      location.replace(LOGIN_URL);
    });

    await load();
    clearInterval(timer);
    timer = setInterval(() => { if (!document.hidden && !busy.size) load(); }, REFRESH_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
  }

  if (document.getElementById('servers')) initPanel();
  else if (document.getElementById('form-signin')) initLogin();
})();
