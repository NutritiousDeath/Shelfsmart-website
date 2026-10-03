// ─── DASHBOARD: MAGIC — BAN LIST CHANNELS ─────────────────────────────────────
// Adds a "// ban list channels" card to the Magic tab (js/dashboard-mtg.js
// must load first — it has the #mtg-banlist-slot this mounts into, and calls
// AuraMtgBanlist.load() whenever the tab opens or refreshes).
//
// Server admins pick a server, then a channel + formats for MTG Arena and a
// separate channel + formats for MTGO, so the two don't crowd each other.
// When an official ban list changes, Aura posts what changed + the updated
// list in that platform's channel.
// Needs Aura Premium for MTG ($5/mo, or $10/mo All Games) or AuraAI Pro /
// Lifetime on that server — the bot checks this, the page just explains it.
//
// Also shows the current official ban lists (Arena + MTGO) Aura enforces.

(function () {
  const API = (typeof RAILWAY_BOT_URL !== 'undefined') ? RAILWAY_BOT_URL : 'https://web-production-01b81.up.railway.app';
  const BILLING_URL = 'dashboard.html?premium=plans';
  const mono = 'font-family:var(--font-mono)';
  const ACCENT = '#b44fff';

  let overview = null;       // GET /api/mtg/banlist
  let guildInfo = null;      // GET /api/mtg/banlist/guild
  let currentGuild = null;
  let serverDd = null;
  let channelDd = null;      // MTG Arena channel
  let mtgoChannelDd = null;  // MTGO channel
  let loading = false;

  const CSS = `
    #mtg-banlist .bl-row { display:grid; grid-template-columns:110px 1fr; gap:12px; align-items:center; margin-top:14px; }
    #mtg-banlist .bl-label { ${mono}; font-size:0.62rem; color:var(--grey); letter-spacing:2px; }
    #mtg-banlist .bl-formats { display:flex; flex-direction:column; gap:12px; }
    #mtg-banlist .bl-group { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
    #mtg-banlist .bl-group-name { ${mono}; font-size:0.6rem; letter-spacing:2px; color:var(--cyan); width:100%; }
    #mtg-banlist .bl-group-all { ${mono}; font-size:0.58rem; letter-spacing:1px; color:var(--grey); cursor:pointer; margin-left:8px; text-decoration:underline; }
    #mtg-banlist .bl-plat { ${mono}; font-size:0.7rem; color:var(--cyan); letter-spacing:2px; margin:16px 0 4px; grid-column:1/-1; }
    #mtg-banlist .bl-chip { ${mono}; font-size:0.68rem; letter-spacing:1px; padding:7px 12px; border:1px solid rgba(255,255,255,0.15); color:var(--grey); cursor:pointer; user-select:none; background:transparent; }
    #mtg-banlist .bl-chip.on { border-color:${ACCENT}; color:var(--white); background:rgba(180,79,255,0.12); box-shadow:0 0 8px rgba(180,79,255,0.35); }
    #mtg-banlist .bl-chip:disabled { opacity:0.4; cursor:not-allowed; }
    #mtg-banlist .bl-actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:18px; align-items:center; }
    #mtg-banlist .bl-status { ${mono}; font-size:0.72rem; line-height:1.8; margin-top:14px; padding:10px 14px; border:1px solid rgba(255,255,255,0.1); }
    #mtg-banlist .bl-badge { ${mono}; font-size:0.56rem; letter-spacing:2px; padding:3px 8px; border:1px solid ${ACCENT}; color:${ACCENT}; text-shadow:0 0 6px rgba(180,79,255,0.6); }
    #mtg-banlist details { margin-top:20px; border-top:1px solid rgba(255,255,255,0.08); padding-top:14px; }
    #mtg-banlist summary { ${mono}; font-size:0.7rem; color:var(--cyan); cursor:pointer; letter-spacing:1px; }
    #mtg-banlist .bl-list { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr)); gap:12px; margin-top:12px; }
    #mtg-banlist .bl-fmt { border:1px solid rgba(255,255,255,0.08); padding:10px 12px; }
    #mtg-banlist .bl-fmt p { ${mono}; font-size:0.66rem; line-height:1.7; color:var(--white); }
    #mtg-banlist .bl-fmt .t { color:${ACCENT}; letter-spacing:1px; margin-bottom:4px; }
    #mtg-banlist .bl-msg { ${mono}; font-size:0.7rem; }
    @media (max-width: 560px) { #mtg-banlist .bl-row { grid-template-columns:1fr; gap:6px; } }
  `;

  const HTML = `
    <style>${CSS}</style>
    <div class="section-card" id="mtg-banlist" style="border-color:rgba(180,79,255,0.35)">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <p class="card-title" style="margin:0">// ban list channels</p>
        <span class="bl-badge">PREMIUM</span>
      </div>
      <p style="${mono};font-size:0.76rem;color:var(--white);line-height:1.9;margin-top:12px">
        When an official Wizards ban list changes, Aura posts what changed and the updated list. MTG Arena and MTGO each get their own channel so they don't crowd each other — use one or both.
        <span style="color:var(--grey)">Needs Aura Premium for MTG ($5/mo) or AuraAI Pro / Lifetime on the server.</span>
      </p>
      <div id="bl-upsell" style="display:none;margin-top:14px;border:1px solid rgba(180,79,255,0.45);background:rgba(180,79,255,0.06);padding:12px 14px">
        <p style="${mono};font-size:0.72rem;color:var(--white);line-height:1.8">⭐ This server isn't covered yet. Get <span style="color:${ACCENT}">Aura Premium — MTG Arena ($5/mo)</span> or All Games ($10/mo) to turn it on for any server you admin.</p>
        <a href="${BILLING_URL}" class="btn-primary" style="display:inline-block;text-decoration:none;margin-top:10px;font-size:0.7rem;padding:8px 16px">SEE PLANS</a>
      </div>
      <div class="bl-row"><span class="bl-label">SERVER</span><div id="bl-server"></div></div>
      <p class="bl-plat" style="margin-top:20px">MTG ARENA</p>
      <div class="bl-row" style="margin-top:6px"><span class="bl-label">CHANNEL</span><div id="bl-channel"></div></div>
      <div class="bl-row" style="align-items:start"><span class="bl-label" style="padding-top:8px">FORMATS</span><div class="bl-formats" id="bl-formats-arena"></div></div>
      <p class="bl-plat" style="margin-top:20px">MTGO / TABLETOP</p>
      <div class="bl-row" style="margin-top:6px"><span class="bl-label">CHANNEL</span><div id="bl-channel-mtgo"></div></div>
      <div class="bl-row" style="align-items:start"><span class="bl-label" style="padding-top:8px">FORMATS</span><div class="bl-formats" id="bl-formats-mtgo"></div></div>
      <div class="bl-actions">
        <button class="btn-primary" id="bl-save">SAVE &amp; TURN ON</button>
        <button class="btn-secondary" id="bl-post" style="font-size:0.65rem;padding:8px 14px">POST CURRENT LIST NOW</button>
        <button class="btn-secondary" id="bl-off" style="font-size:0.65rem;padding:8px 14px;border-color:rgba(255,45,120,0.5);color:var(--pink)">TURN OFF</button>
        <span class="bl-msg" id="bl-msg"></span>
      </div>
      <div class="bl-status" id="bl-status">Pick a server.</div>
      <details id="bl-current">
        <summary>VIEW THE CURRENT BAN LISTS AURA ENFORCES (ARENA + MTGO)</summary>
        <p id="bl-checked" style="${mono};font-size:0.62rem;color:var(--grey);margin-top:10px"></p>
        <div class="bl-list" id="bl-list"></div>
      </details>
    </div>`;

  // ─── HELPERS ────────────────────────────────────────────────────────────────

  async function authHeaders(json) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Not signed in');
    return { Authorization: `Bearer ${session.access_token}`, ...(json ? { 'Content-Type': 'application/json' } : {}) };
  }

  async function api(path, opts = {}) {
    const res = await fetch(`${API}${path}`, { ...opts, headers: await authHeaders(!!opts.body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(data.error || `HTTP ${res.status}`); e.status = res.status; e.data = data; throw e; }
    return data;
  }

  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function ago(iso) {
    if (!iso) return 'never';
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
    const d = Math.floor(s / 86400);
    return d === 1 ? 'yesterday' : `${d} days ago`;
  }

  function msg(text, color) {
    const el = document.getElementById('bl-msg');
    if (!el) return;
    el.textContent = text || '';
    el.style.color = color || 'var(--grey)';
  }

  function adminGuilds() {
    try { return (typeof userGuilds !== 'undefined' && Array.isArray(userGuilds)) ? userGuilds : []; } catch { return []; }
  }

  function selectedFormats() {
    return [...document.querySelectorAll('#mtg-banlist .bl-formats .bl-chip.on')].map((b) => b.dataset.fmt);
  }

  function setBusy(busy) {
    ['bl-save', 'bl-post', 'bl-off'].forEach((id) => { const b = document.getElementById(id); if (b) b.disabled = busy; });
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  const PLATFORMS = [
    { key: 'arena', name: 'MTG ARENA' },
    { key: 'mtgo', name: 'MTGO / TABLETOP' },
  ];
  const platformOf = (f) => f.platform || 'arena';
  // Chip text without the "(MTGO)" suffix — the group heading already says it.
  const chipLabel = (f) => f.label.replace(/\s*\(MTGO\)$/i, '').toUpperCase();

  function renderFormats(selected) {
    if (!overview) return;
    // Nothing saved yet → the Arena formats are on, MTGO is opt-in.
    const on = new Set(selected && selected.length ? selected : overview.formats.filter((f) => platformOf(f) === 'arena').map((f) => f.key));
    for (const p of PLATFORMS) {
      const box = document.getElementById(`bl-formats-${p.key}`);
      if (!box) continue;
      const fmts = overview.formats.filter((f) => platformOf(f) === p.key);
      box.innerHTML = `<div class="bl-group">`
        + fmts.map((f) => `<button type="button" class="bl-chip${on.has(f.key) ? ' on' : ''}" data-fmt="${f.key}">${esc(chipLabel(f))}</button>`).join('')
        + `<span class="bl-group-all">all / none</span></div>`;
      box.querySelectorAll('.bl-chip').forEach((b) => b.addEventListener('click', () => b.classList.toggle('on')));
      box.querySelector('.bl-group-all').addEventListener('click', () => {
        const chips = [...box.querySelectorAll('.bl-chip')];
        const turnOn = chips.some((c) => !c.classList.contains('on'));
        chips.forEach((c) => c.classList.toggle('on', turnOn));
      });
    }
  }

  function renderCurrentList() {
    const list = document.getElementById('bl-list');
    const checked = document.getElementById('bl-checked');
    if (!list || !overview) return;
    const st = overview.status || {};
    checked.textContent = `Source: the official Wizards of the Coast ban lists (Arena checked ${st.hardCodedDate || '—'}${st.mtgoHardCodedDate ? `, MTGO checked ${st.mtgoHardCodedDate}` : ''}) · Scryfall (unofficial) is compared every 6 hours as an early warning only · last check ${ago(st.lastCheck?.at)}${st.lastCheck && st.lastCheck.ok === false ? ' (failed — using last good list)' : ''} · last change ${ago(st.lastChangeAt)}`;
    let lastPlatform = null;
    list.innerHTML = overview.formats.map((f) => {
      const heading = platformOf(f) !== lastPlatform ? `<p class="bl-plat">${(PLATFORMS.find((p) => p.key === platformOf(f)) || { name: platformOf(f).toUpperCase() }).name}</p>` : '';
      lastPlatform = platformOf(f);
      const c = overview.current[f.key] || { banned: [], restricted: [] };
      const banned = c.banned.length ? c.banned.map((x) => esc(x.name) + (x.bo1 ? ' <span style="color:var(--yellow)">(Bo1)</span>' : '')).join(' · ') : '<span style="color:var(--grey)">None</span>';
      const restricted = c.restricted.length ? `<p style="margin-top:6px"><span style="color:var(--cyan)">Restricted (max 1):</span> ${c.restricted.map((x) => esc(x.name)).join(' · ')}</p>` : '';
      const notes = [f.categories && 'all Conspiracy cards, cards that play for ante, and cards Wizards removed for offensive content', f.stickers && 'cards that bring stickers or Attractions'].filter(Boolean);
      const category = notes.length ? `<p style="margin-top:6px;color:var(--grey)">Also banned: ${notes.join('; ')}.</p>` : '';
      return `${heading}<div class="bl-fmt"><p class="t">${esc(chipLabel(f))} — ${c.banned.length} BANNED</p><p>${banned}</p>${restricted}${category}</div>`;
    }).join('');
  }

  function renderStatus() {
    const el = document.getElementById('bl-status');
    const upsell = document.getElementById('bl-upsell');
    if (!el) return;
    upsell.style.display = 'none';
    if (!currentGuild) { el.innerHTML = 'Pick a server.'; el.style.color = 'var(--grey)'; return; }
    if (!guildInfo) { el.innerHTML = 'Loading…'; el.style.color = 'var(--grey)'; return; }
    if (!guildInfo.botInServer) { el.innerHTML = '⚠ Aura isn\'t in this server — invite her first.'; el.style.color = 'var(--yellow)'; return; }
    const cfg = guildInfo.config;
    const via = guildInfo.premium ? 'your Aura Premium' : guildInfo.serverPro ? "this server's AuraAI Pro license" : null;
    if (!guildInfo.ok) upsell.style.display = 'block';
    if (cfg && cfg.enabled) {
      const where = (id, fmtPlatform, name) => {
        const has = (cfg.formats || []).some((k) => platformOf(overview.formats.find((f) => f.key === k) || {}) === fmtPlatform);
        return id && has ? `${name} → <span style="color:var(--cyan)">#${esc(guildChannelName(id) || id)}</span>` : null;
      };
      const parts = [where(cfg.channelId, 'arena', 'Arena'), where(cfg.mtgoChannelId, 'mtgo', 'MTGO')].filter(Boolean);
      el.style.color = cfg.lastError ? 'var(--yellow)' : 'var(--green)';
      el.innerHTML = `● ON — ${parts.join(' · ') || 'no channels'} · last post ${ago(cfg.lastPostedAt)}`
        + (via ? `<br><span style="color:var(--grey)">Covered by ${via}.</span>` : '')
        + (cfg.lastError ? `<br>⚠ ${esc(cfg.lastError)}` : '');
    } else {
      el.style.color = 'var(--grey)';
      el.innerHTML = `○ OFF${via ? ` · this server is covered by ${via} — pick a channel and save.` : ''}`;
    }
    const post = document.getElementById('bl-post');
    const off = document.getElementById('bl-off');
    if (post) post.style.display = cfg && cfg.enabled ? '' : 'none';
    if (off) off.style.display = cfg && cfg.enabled ? '' : 'none';
    const save = document.getElementById('bl-save');
    if (save) save.textContent = cfg && cfg.enabled ? 'SAVE CHANGES' : 'SAVE & TURN ON';
  }

  let channelCache = [];
  function guildChannelName(id) {
    const c = channelCache.find((x) => x.id === id);
    return c ? c.name : null;
  }

  // ─── LOADING ────────────────────────────────────────────────────────────────

  async function pickServer(guildId) {
    currentGuild = guildId || null;
    guildInfo = null;
    channelCache = [];
    msg('');
    renderStatus();
    for (const dd of [channelDd, mtgoChannelDd]) if (dd) dd.setPlaceholder(guildId ? 'Loading channels…' : '— Select a server first —');
    if (!guildId) return;
    try {
      const [info, chans] = await Promise.all([
        api(`/api/mtg/banlist/guild?guildId=${encodeURIComponent(guildId)}`),
        api(`/api/guild-channels?guildId=${encodeURIComponent(guildId)}`).catch(() => ({ channels: [] })),
      ]);
      if (currentGuild !== guildId) return; // switched servers while loading
      guildInfo = info;
      channelCache = chans.channels || [];
      for (const [dd, id] of [[channelDd, info.config?.channelId], [mtgoChannelDd, info.config?.mtgoChannelId]]) {
        if (!dd) continue;
        if (channelCache.length) dd.setChannels(channelCache, id || null);
        else dd.setPlaceholder(info.botInServer === false ? "⚠ Aura isn't in this server" : '⚠ Could not load channels');
      }
      renderFormats(info.config?.formats);
    } catch (err) {
      guildInfo = { botInServer: true, ok: false, config: null };
      msg(err.message, 'var(--pink)');
    }
    renderStatus();
  }

  function mountDropdowns() {
    if (typeof CyberDropdown === 'undefined') return;
    if (!serverDd) {
      serverDd = new CyberDropdown('bl-server', (v) => pickServer(v));
      serverDd.searchInput.placeholder = 'Search servers...';
    }
    if (!channelDd) channelDd = new CyberDropdown('bl-channel', () => {});
    if (!mtgoChannelDd) mtgoChannelDd = new CyberDropdown('bl-channel-mtgo', () => {});
    const guilds = adminGuilds();
    const opts = guilds.map((g) => ({ value: g.id, label: g.name }));
    if (!opts.length) { serverDd.setPlaceholder('— No servers you admin —'); return; }
    serverDd.setStaticOptions(opts, currentGuild);
    serverDd.searchWrap.style.display = opts.length > 6 ? '' : 'none';
    if (!currentGuild) {
      serverDd.setValue('', '— Select server —');
      let start = null;
      try { if (typeof selectedGuildId !== 'undefined' && selectedGuildId && guilds.some((g) => g.id === selectedGuildId)) start = selectedGuildId; } catch { /* ignore */ }
      if (!start && guilds.length === 1) start = guilds[0].id;
      if (start) { serverDd.setValue(start, guilds.find((g) => g.id === start).name); pickServer(start); }
    }
  }

  async function load() {
    const root = document.getElementById('mtg-banlist');
    if (!root || loading) return;
    loading = true;
    try {
      overview = await api('/api/mtg/banlist');
      renderCurrentList();
      if (!document.querySelector('#mtg-banlist .bl-formats .bl-chip')) renderFormats(null);
      mountDropdowns();
      if (currentGuild) await pickServer(currentGuild);
    } catch (err) {
      msg(`Couldn't load the ban list (${err.message})`, 'var(--pink)');
    } finally {
      loading = false;
    }
  }

  // ─── ACTIONS ────────────────────────────────────────────────────────────────

  async function save() {
    if (!currentGuild) return msg('Pick a server first.', 'var(--pink)');
    const formats = selectedFormats();
    if (!formats.length) return msg('Pick at least one format.', 'var(--pink)');
    const isPlat = (k, p) => platformOf(overview.formats.find((f) => f.key === k) || {}) === p;
    const arenaChannelId = channelDd && channelDd.getValue();
    const mtgoChannelId = mtgoChannelDd && mtgoChannelDd.getValue();
    if (formats.some((k) => isPlat(k, 'arena')) && !arenaChannelId) return msg('Pick a channel for MTG Arena (or turn its formats off).', 'var(--pink)');
    if (formats.some((k) => isPlat(k, 'mtgo')) && !mtgoChannelId) return msg('Pick a channel for MTGO (or turn its formats off).', 'var(--pink)');
    setBusy(true);
    msg('Saving…');
    try {
      const r = await api('/api/mtg/banlist/save', { method: 'POST', body: JSON.stringify({ guildId: currentGuild, arenaChannelId, mtgoChannelId, formats, enabled: true }) });
      if (r.warning) msg(r.warning, 'var(--yellow)');
      else msg(r.postedNow ? 'Saved — Aura just posted the current list in the new channel. ✓' : 'Saved ✓', 'var(--green)');
      await pickServer(currentGuild);
    } catch (err) {
      msg(err.message, 'var(--pink)');
      if (err.data && err.data.needsPremium) document.getElementById('bl-upsell').style.display = 'block';
    } finally { setBusy(false); }
  }

  async function postNow() {
    if (!currentGuild) return;
    setBusy(true);
    msg('Posting…');
    try {
      await api('/api/mtg/banlist/post', { method: 'POST', body: JSON.stringify({ guildId: currentGuild }) });
      msg('Posted ✓', 'var(--green)');
      await pickServer(currentGuild);
    } catch (err) { msg(err.message, 'var(--pink)'); } finally { setBusy(false); }
  }

  async function turnOff() {
    if (!currentGuild || !confirm('Stop posting ban list updates in this server?')) return;
    setBusy(true);
    try {
      await api('/api/mtg/banlist/save', { method: 'POST', body: JSON.stringify({ guildId: currentGuild, enabled: false }) });
      msg('Turned off.', 'var(--grey)');
      await pickServer(currentGuild);
    } catch (err) { msg(err.message, 'var(--pink)'); } finally { setBusy(false); }
  }

  // ─── MOUNT ──────────────────────────────────────────────────────────────────

  function mount() {
    const slot = document.getElementById('mtg-banlist-slot');
    if (!slot || document.getElementById('mtg-banlist')) return !!slot;
    slot.innerHTML = HTML;
    document.getElementById('bl-save').addEventListener('click', save);
    document.getElementById('bl-post').addEventListener('click', postNow);
    document.getElementById('bl-off').addEventListener('click', turnOff);
    document.getElementById('bl-post').style.display = 'none';
    document.getElementById('bl-off').style.display = 'none';
    return true;
  }

  window.AuraMtgBanlist = { load: () => { if (mount()) load(); } };

  function init() { mount(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
