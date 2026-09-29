// ─── DASHBOARD: DESTINY 2 TAB ─────────────────────────────────────────────────
// Self-mounting page under "// Game Ops" (needs js/dashboard-games.js first).
// Per PLAYER (tied to the Discord login), not per server:
//   • Bungie link — link / unlink (official Bungie sign-in, same as DIM)
//   • Vault overview — characters, exotics, armor sets, duplicates, weapon types
//   • Recent builds from /d2-build
// Talks to Railway: GET /api/d2/status, POST /api/d2/link-url,
// POST /api/d2/unlink, GET /api/d2/vault.

(function () {
  const G = window.AuraGames;
  if (!G) { console.error('dashboard-games.js must load before dashboard-d2.js'); return; }
  const { esc, stat, card, timeAgo } = G;
  const ACCENT = '#a970ff';
  const EXOTIC = '#e8c547';
  const BANNER = 'img/d2/aura-banner.jpg';
  const mono = 'font-family:var(--font-mono)';

  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/></svg>';
  const CLASS_ICON = { Titan: '🛡️', Hunter: '🏹', Warlock: '🔮' };
  let status = null;
  let busy = false;

  const CSS = `
    #tab-d2 .d2-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; }
    #tab-d2 .d2-cols { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:20px; }
    #tab-d2 .d2-char { border:1px solid ${ACCENT}44; padding:14px 16px; background:linear-gradient(135deg, ${ACCENT}12, transparent); }
    #tab-d2 .d2-chip { display:inline-block; ${mono}; font-size:0.64rem; padding:4px 9px; margin:4px 5px 0 0; border:1px solid rgba(255,255,255,0.12); color:var(--white); }
    #tab-d2 .d2-chip.ex { border-color:${EXOTIC}66; color:${EXOTIC}; }
    #tab-d2 .d2-line { display:flex; justify-content:space-between; gap:10px; ${mono}; font-size:0.7rem; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05); color:var(--white); }
    #tab-d2 .d2-line span:last-child { color:var(--grey); flex-shrink:0; }
    #tab-d2 .d2-sub { ${mono}; font-size:0.58rem; color:var(--grey); letter-spacing:2px; margin:14px 0 4px; }
    #tab-d2 .d2-build { border:1px solid rgba(255,255,255,0.08); padding:12px 14px; margin-top:8px; }
    #tab-d2 .d2-build pre { ${mono}; font-size:0.66rem; color:var(--white); line-height:1.8; white-space:pre-wrap; margin:0; }
    #tab-d2 .d2-msg { ${mono}; font-size:0.68rem; margin-top:10px; min-height:1em; }
    #tab-d2 .d2-link-btn { font-family:var(--font-display); font-size:0.68rem; font-weight:700; letter-spacing:2px; padding:12px 22px; border:none; cursor:pointer;
      background:linear-gradient(90deg, ${ACCENT}, var(--cyan)); color:#050810; clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%); }
    #tab-d2 .d2-link-btn:hover { filter:brightness(1.15); }
    #tab-d2 button[disabled] { opacity:0.5; cursor:not-allowed; }
  `;

  const loadingP = `<p style="${mono};font-size:0.7rem;color:var(--grey)">Loading…</p>`;

  const TAB_HTML = `
    <style>${CSS}</style>
    ${G.bannerHtml({
      art: BANNER, accent: ACCENT, focus: 'center 18%',
      tag: '// destiny 2 companion',
      title: 'AURA // GUARDIAN',
      text: 'Link your Bungie account and Aura reads your vault — every weapon, exotic and armor set across your characters — then builds loadouts from what you actually own, with every perk, aspect and fragment checked against Bungie\'s own data.',
      commands: '/d2-link · /d2-vault · /d2-build',
    })}

    ${card('// bungie link', `<div id="d2-link-box">${loadingP}</div><p class="d2-msg" id="d2-msg"></p>`, { accent: ACCENT })}

    <div id="d2-vault-wrap" style="display:none">
      <div class="d2-grid" id="d2-stats" style="margin-bottom:20px"></div>
      <div class="d2-grid" id="d2-chars" style="margin-bottom:20px"></div>
      <div class="d2-cols">
        ${card('// exotics', `<div id="d2-exotics">${loadingP}</div>`, { accent: EXOTIC })}
        ${card('// armor sets', `<div id="d2-sets">${loadingP}</div>`, { accent: ACCENT })}
      </div>
      <div class="d2-cols">
        ${card('// weapon types', `<div id="d2-types">${loadingP}</div>`)}
        ${card('// duplicates to clean up', `<div id="d2-dupes">${loadingP}</div>`)}
      </div>
      ${card('// recent builds', `<div id="d2-builds">${loadingP}</div>`, { accent: ACCENT })}
    </div>

    ${card('// how it works', `
      <ol style="${mono};font-size:0.72rem;color:var(--white);line-height:2.1;padding-left:18px">
        <li>Link your Bungie account — the button above or <span style="color:var(--cyan)">/d2-link</span>. It's Bungie's own sign-in; Aura never sees your password.</li>
        <li>Aura reads your characters and vault (read-only — she can't move or delete anything).</li>
        <li>Run <span style="color:var(--cyan)">/d2-build</span> with a goal: "Grandmasters", "solo dungeon", "Trials"… or build around an exotic.</li>
        <li>Every piece is checked against Bungie's item data, and she only uses gear you own.</li>
        <li>Reply to the build in Discord to refine it — "more grenade uptime", "swap the exotic".</li>
      </ol>
    `)}

    ${card('// discord commands', `
      <div style="${mono};font-size:0.72rem;line-height:2.1;color:var(--white)">
        <p><span style="color:var(--cyan)">/d2-link</span> — link (or check) your Bungie account · <span style="color:var(--cyan)">/d2-link action:Unlink</span> to remove it</p>
        <p><span style="color:var(--cyan)">/d2-vault</span> — exotics, armor sets and duplicates at a glance</p>
        <p><span style="color:var(--cyan)">/d2-build class goal element exotic</span> — a build from your vault (all options optional)</p>
        <p style="color:var(--grey)">Reply to any build Aura posts to refine it.</p>
      </div>
    `)}

    <p style="${mono};font-size:0.58rem;color:var(--grey);line-height:1.8;margin-top:6px;letter-spacing:0.5px">
      Uses the official Bungie.net API. Your Bungie tokens are stored encrypted and only used to read your inventory; links expire after 90 days of not being refreshed.
      AuraAI is a fan-made tool and isn't affiliated with or endorsed by Bungie.
    </p>
  `;

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  function msg(text, color) {
    const el = document.getElementById('d2-msg');
    if (el) { el.textContent = text || ''; el.style.color = color || 'var(--grey)'; }
  }

  function renderLink(s) {
    const box = document.getElementById('d2-link-box');
    if (!s.configured) {
      box.innerHTML = `<p style="${mono};font-size:0.72rem;color:var(--grey)">Destiny 2 isn't switched on yet — check back soon.</p>`;
      return;
    }
    if (!s.linked) {
      box.innerHTML = `
        <p style="${mono};font-size:0.72rem;color:var(--white);line-height:1.8;margin-bottom:14px">Not linked yet. Sign in with Bungie so Aura can read your vault.</p>
        <button class="d2-link-btn" id="d2-link-btn">LINK BUNGIE ACCOUNT →</button>`;
      box.querySelector('#d2-link-btn').addEventListener('click', linkAccount);
      return;
    }
    const expires = s.linkExpires ? new Date(s.linkExpires) : null;
    const soon = expires && expires.getTime() - Date.now() < 7 * 86400000;
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <div>
          <p style="${mono};font-size:0.58rem;color:var(--grey);letter-spacing:2px;margin-bottom:4px">LINKED AS</p>
          <p style="font-family:var(--font-display);font-size:0.95rem;color:${ACCENT};letter-spacing:1px">${esc(s.displayName || 'Guardian')}</p>
          ${expires ? `<p style="${mono};font-size:0.62rem;color:${soon ? 'var(--pink)' : 'var(--grey)'};margin-top:4px">${soon ? '⚠️ ' : ''}Link good until ${esc(expires.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }))} — using Aura keeps it fresh</p>` : ''}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn-secondary" id="d2-refresh-btn" style="font-size:0.65rem;padding:7px 14px">REFRESH VAULT</button>
          <button class="btn-secondary" id="d2-relink-btn" style="font-size:0.65rem;padding:7px 14px">RE-LINK</button>
          <button class="btn-secondary" id="d2-unlink-btn" style="font-size:0.65rem;padding:7px 14px;color:var(--pink);border-color:rgba(255,42,109,0.45)">UNLINK</button>
        </div>
      </div>`;
    box.querySelector('#d2-refresh-btn').addEventListener('click', loadVault);
    box.querySelector('#d2-relink-btn').addEventListener('click', linkAccount);
    box.querySelector('#d2-unlink-btn').addEventListener('click', unlinkAccount);
  }

  const lines = (pairs, empty) => (pairs.length
    ? pairs.map(([n, c]) => `<div class="d2-line"><span>${esc(n)}</span><span>${esc(c)}</span></div>`).join('')
    : `<p style="${mono};font-size:0.7rem;color:var(--grey)">${empty}</p>`);

  function renderVault(v) {
    document.getElementById('d2-stats').innerHTML = [
      stat('WEAPONS', String(v.weaponCount), 'var(--cyan)'),
      stat('ARMOR', String(v.armorCount)),
      stat('EXOTIC WEAPONS', String((v.exoticWeapons || []).length), EXOTIC),
      stat('EXOTIC ARMOR', String(Object.values(v.exoticArmorByClass || {}).reduce((n, l) => n + l.length, 0)), EXOTIC),
      stat('DUPLICATES', String((v.duplicates || []).length), (v.duplicates || []).length ? 'var(--pink)' : undefined),
    ].join('');

    document.getElementById('d2-chars').innerHTML = (v.characters || []).map((c) => `
      <div class="d2-char">
        <p style="font-family:var(--font-display);font-size:0.85rem;color:var(--white);letter-spacing:2px">${CLASS_ICON[c.cls] || '◆'} ${esc(String(c.cls || '').toUpperCase())}</p>
        <p style="font-family:var(--font-display);font-size:1.3rem;color:${EXOTIC};margin:6px 0 2px">✦ ${esc(c.light ?? '—')}</p>
        <p style="${mono};font-size:0.64rem;color:var(--grey)">${esc(c.subclass || 'Subclass unknown')}</p>
      </div>`).join('');

    const exArmor = Object.entries(v.exoticArmorByClass || {});
    document.getElementById('d2-exotics').innerHTML = `
      <p class="d2-sub" style="margin-top:0">WEAPONS · ${(v.exoticWeapons || []).length}</p>
      <div>${(v.exoticWeapons || []).map((n) => `<span class="d2-chip ex">${esc(n)}</span>`).join('') || `<span style="${mono};font-size:0.7rem;color:var(--grey)">None found</span>`}</div>
      ${exArmor.map(([cls, list]) => `
        <p class="d2-sub">${esc(String(cls).toUpperCase())} ARMOR · ${list.length}</p>
        <div>${list.map((n) => `<span class="d2-chip ex">${esc(n)}</span>`).join('')}</div>`).join('')}`;

    document.getElementById('d2-sets').innerHTML = `
      <p style="${mono};font-size:0.62rem;color:var(--grey);line-height:1.7;margin-bottom:6px">Pieces you own per set — 2 and 4 pieces unlock the set bonuses.</p>
      ${lines(v.sets || [], 'No set armor yet.')}`;
    document.getElementById('d2-types').innerHTML = lines(v.byType || [], 'No weapons found.');
    document.getElementById('d2-dupes').innerHTML = (v.duplicates || []).length
      ? `<p style="${mono};font-size:0.62rem;color:var(--grey);line-height:1.7;margin-bottom:6px">Legendary weapons you have more than one of — check the rolls and free up vault space.</p>${lines(v.duplicates.map(([n, c]) => [n, `×${c}`]), '')}`
      : `<p style="${mono};font-size:0.7rem;color:var(--grey)">No duplicate legendaries — tidy vault! ✨</p>`;

    document.getElementById('d2-builds').innerHTML = (v.builds || []).length
      ? v.builds.map((b) => {
        const p = b.params || {};
        const tags = [p.cls || p.class, p.goal, p.element, p.exotic].filter(Boolean).map((t) => `<span class="d2-chip">${esc(t)}</span>`).join('');
        return `<div class="d2-build">
          <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px"><div>${tags}</div><span style="${mono};font-size:0.6rem;color:var(--grey)">${esc(timeAgo(b.at))}</span></div>
          <pre>${esc(b.text)}</pre></div>`;
      }).join('')
      : `<p style="${mono};font-size:0.72rem;color:var(--grey);line-height:1.8">No builds yet. Run <span style="color:var(--cyan)">/d2-build</span> in Discord — your last 5 show up here.</p>`;
  }

  // ─── DATA ───────────────────────────────────────────────────────────────────

  async function loadD2Tab() {
    try {
      status = await G.api('/api/d2/status');
      renderLink(status);
      document.getElementById('d2-vault-wrap').style.display = status.linked ? '' : 'none';
      if (status.linked) await loadVault();
    } catch (err) {
      if (err.message === 'Not signed in') return;
      document.getElementById('d2-link-box').innerHTML = `<p style="${mono};font-size:0.72rem;color:var(--pink)">Couldn't check your Bungie link (${esc(err.message)}).</p>`;
    }
  }

  async function loadVault() {
    if (busy) return;
    busy = true;
    msg('Reading your vault from Bungie…');
    try {
      const v = await G.api('/api/d2/vault');
      renderVault(v);
      document.getElementById('d2-vault-wrap').style.display = '';
      msg(`Vault read ${new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}.`, 'var(--green)');
    } catch (err) {
      if (err.data && err.data.notLinked) { status = { ...(status || {}), configured: true, linked: false }; renderLink(status); document.getElementById('d2-vault-wrap').style.display = 'none'; }
      msg(err.message, 'var(--pink)');
    } finally {
      busy = false;
    }
  }

  async function linkAccount() {
    msg('Opening Bungie sign-in…');
    try {
      const { url } = await G.api('/api/d2/link-url', { method: 'POST', body: {} });
      window.location.href = url;
    } catch (err) { msg(err.message, 'var(--pink)'); }
  }

  async function unlinkAccount() {
    const btn = document.getElementById('d2-unlink-btn');
    if (btn.dataset.confirm !== '1') {
      btn.dataset.confirm = '1';
      btn.textContent = 'CLICK AGAIN TO UNLINK';
      setTimeout(() => { if (btn.isConnected) { btn.dataset.confirm = ''; btn.textContent = 'UNLINK'; } }, 4000);
      return;
    }
    btn.disabled = true;
    try {
      await G.api('/api/d2/unlink', { method: 'POST', body: {} });
      msg('Unlinked. Aura no longer has access to your Bungie account.', 'var(--grey)');
      await loadD2Tab();
    } catch (err) { msg(err.message, 'var(--pink)'); btn.disabled = false; }
  }

  // ─── MOUNT ──────────────────────────────────────────────────────────────────

  function init() {
    G.addButton({ id: 'd2-sidebar-btn', tab: 'd2', label: 'Destiny 2', icon: ICON, onOpen: () => loadD2Tab() });
    G.addTab('d2', TAB_HTML);
  }

  window.loadD2Tab = loadD2Tab;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
