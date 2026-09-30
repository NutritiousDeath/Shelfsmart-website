// ─── DASHBOARD: GAME OPS (shared) ─────────────────────────────────────────────
// Shared helpers for the player game pages (MTG Arena, Division 2, Destiny 2):
//   • one sidebar section (GAME_SECTION_LABEL) with a button per game, in the
//     order the page scripts load
//   • tab creation, hero markup with Aura art (+ tinted fallback), auth, API
// Load this BEFORE dashboard-mtg.js / dashboard-div2.js / dashboard-d2.js.

(function () {
  const GAME_SECTION_LABEL = '// Game Ops';
  const API = (typeof RAILWAY_BOT_URL !== 'undefined') ? RAILWAY_BOT_URL : 'https://web-production-01b81.up.railway.app';
  const FALLBACK_ART = 'img/mtg/aura-card.png';
  let lastButton = null;

  // Game Ops made the sidebar tall enough to scroll on shorter screens — give
  // its scrollbar (and the main panel's) the dashboard theme instead of the
  // browser's default white one.
  (function styleScrollbars() {
    if (document.getElementById('aura-scrollbar-style')) return;
    const css = document.createElement('style');
    css.id = 'aura-scrollbar-style';
    css.textContent = `
      .sidebar, .main { scrollbar-width: thin; scrollbar-color: rgba(0,240,255,0.28) transparent;
        scrollbar-color: color-mix(in srgb, var(--cyan) 30%, transparent) transparent; }
      .sidebar::-webkit-scrollbar, .main::-webkit-scrollbar { width: 5px; }
      .sidebar::-webkit-scrollbar-track, .main::-webkit-scrollbar-track { background: transparent; }
      .sidebar::-webkit-scrollbar-thumb, .main::-webkit-scrollbar-thumb { background: rgba(0,240,255,0.28); border-radius: 3px; }
      .sidebar::-webkit-scrollbar-thumb:hover, .main::-webkit-scrollbar-thumb:hover { background: rgba(0,240,255,0.55); }
    `;
    (document.head || document.documentElement).appendChild(css);
  })();

  function section() {
    let s = document.getElementById('games-sidebar-section');
    if (s) return s;
    s = document.createElement('span');
    s.className = 'sidebar-section';
    s.id = 'games-sidebar-section';
    s.textContent = GAME_SECTION_LABEL;
    const buttons = Array.from(document.querySelectorAll('.sidebar-item'));
    const anchor = buttons.find((b) => (b.getAttribute('onclick') || '').includes("'eso-download'"))
      || buttons.find((b) => (b.getAttribute('onclick') || '').includes("'eso'"));
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(s, anchor.nextSibling);
    else {
      const aside = document.querySelector('aside');
      if (aside) aside.insertBefore(s, aside.querySelector('.status-indicator') || null);
    }
    return s;
  }

  // Adds a game button under the Game Ops section (in call order).
  function addButton({ id, tab, label, icon, onOpen }) {
    if (document.getElementById(id)) return document.getElementById(id);
    const s = section();
    const btn = document.createElement('button');
    btn.className = 'sidebar-item';
    btn.id = id;
    btn.dataset.gameTab = tab;
    btn.innerHTML = icon + label;
    btn.addEventListener('click', () => { setTab(tab, btn); if (onOpen) onOpen(); });
    const after = lastButton && lastButton.parentNode ? lastButton : s;
    after.parentNode.insertBefore(btn, after.nextSibling);
    lastButton = btn;
    return btn;
  }

  function addTab(tab, html) {
    if (document.getElementById(`tab-${tab}`)) return document.getElementById(`tab-${tab}`);
    const main = document.querySelector('main.main') || document.querySelector('main');
    if (!main) return null;
    const el = document.createElement('div');
    el.className = 'tab';
    el.id = `tab-${tab}`;
    el.innerHTML = html;
    main.appendChild(el);
    return el;
  }

  // Hero block. `art` is the page's own Aura image; until it exists, the MTG
  // card is shown tinted with `tint` (a CSS filter) so the page still looks right.
  function heroHtml({ art, tint, accent, tag, title, text, commands }) {
    const mono = 'font-family:var(--font-mono)';
    return `
      <div class="game-hero" style="display:flex;gap:32px;align-items:center;flex-wrap:wrap;border:1px solid ${accent}59;padding:24px 26px;margin-bottom:24px;background:linear-gradient(135deg, ${accent}1f, rgba(0,191,255,0.04) 60%, transparent)">
        <img src="${art}" alt="Aura" data-fallback="${FALLBACK_ART}" data-tint="${tint || ''}"
          onerror="if(!this.dataset.failed){this.dataset.failed='1';this.src=this.dataset.fallback;this.style.filter=this.dataset.tint;}"
          style="width:260px;max-width:60%;height:auto;border-radius:12px;box-shadow:0 0 26px ${accent}8c, 0 0 2px rgba(0,191,255,0.8)">
        <div style="flex:1;min-width:240px">
          <p class="page-tag">${tag}</p>
          <p class="page-title" style="margin-bottom:10px">${title}</p>
          <p style="${mono};font-size:0.82rem;color:var(--white);line-height:1.9">${text}</p>
          <p style="${mono};font-size:0.72rem;color:var(--cyan);line-height:1.9;margin-top:8px">${commands}</p>
        </div>
      </div>`;
  }

  // Wide hero for 16:9 art: full-width banner with the title over the bottom
  // edge, text underneath. `focus` is the CSS object-position (keep faces in frame).
  function bannerHtml({ art, accent, tag, title, text, commands, focus }) {
    const mono = 'font-family:var(--font-mono)';
    return `
      <div class="game-hero game-hero-banner" style="border:1px solid ${accent}66;margin-bottom:24px;overflow:hidden;background:linear-gradient(160deg, ${accent}14, rgba(0,191,255,0.03) 55%, transparent);box-shadow:0 0 24px ${accent}26">
        <div style="position:relative;background:#050810">
          <img src="${art}" alt="Aura" onerror="this.style.display='none';this.parentNode.style.minHeight='120px'"
            style="display:block;width:100%;height:clamp(200px, 32vw, 360px);object-fit:cover;object-position:${focus || 'center 30%'}">
          <div style="position:absolute;inset:0;background:linear-gradient(180deg, transparent 45%, rgba(5,8,16,0.55) 72%, #050810 100%);pointer-events:none"></div>
          <div style="position:absolute;left:0;top:0;bottom:0;width:4px;background:${accent};box-shadow:0 0 14px ${accent}"></div>
          <div style="position:absolute;left:26px;right:26px;bottom:14px">
            <p class="page-tag" style="color:${accent};text-shadow:0 0 8px #050810">${tag}</p>
            <p class="page-title" style="margin:0;text-shadow:0 0 18px #050810, 0 0 4px #050810">${title}</p>
          </div>
        </div>
        <div style="padding:16px 26px 20px">
          <p style="${mono};font-size:0.82rem;color:var(--white);line-height:1.9">${text}</p>
          <p style="${mono};font-size:0.72rem;color:var(--cyan);line-height:1.9;margin-top:8px">${commands}</p>
        </div>
      </div>`;
  }

  // Small "// heading" card used by the game pages.
  function card(title, inner, { accent, id } = {}) {
    return `<div class="section-card"${id ? ` id="${id}"` : ''} style="${accent ? `border-color:${accent}55` : ''}">
      <p class="card-title">${title}</p>${inner}</div>`;
  }

  function timeAgo(iso) {
    if (!iso) return '—';
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const h = Math.round(mins / 60);
    if (h < 48) return `${h}h ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  async function authHeaders(json) {
    if (typeof sb === 'undefined') throw new Error('Not signed in');
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Not signed in');
    return { Authorization: `Bearer ${session.access_token}`, ...(json ? { 'Content-Type': 'application/json' } : {}) };
  }

  async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${API}${path}`, { method, headers: await authHeaders(!!body), body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(data.error || `HTTP ${res.status}`); e.data = data; e.status = res.status; throw e; }
    return data;
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function stat(label, value, color) {
    return `<div style="border:1px solid rgba(255,255,255,0.08);padding:12px 14px">
      <p style="font-family:var(--font-mono);font-size:0.58rem;color:var(--grey);letter-spacing:2px;margin-bottom:6px">${esc(label)}</p>
      <p style="font-family:var(--font-display);font-size:1rem;color:${color || 'var(--white)'};letter-spacing:1px">${esc(value)}</p>
    </div>`;
  }

  window.AuraGames = { GAME_SECTION_LABEL, API, addButton, addTab, heroHtml, bannerHtml, card, timeAgo, authHeaders, api, esc, stat, section };
})();
