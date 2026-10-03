// ─── DASHBOARD: MTG ARENA TAB ─────────────────────────────────────────────────
// Self-mounting: adds its button under the shared "// Game Ops" sidebar
// section (js/dashboard-games.js, which must load first) and its own tab panel.
//
// The tab is per-USER (tied to the Discord login), not per-server:
//   • Aura Sync status  — linked?, last sync, card counts (GET /api/mtg/status)
//   • Sync token        — generate + copy, shown once (POST /api/mtg/token)
//   • Download          — downloads/AuraSync.zip (Windows app)
//   • Ban list channel  — js/dashboard-mtg-banlist.js mounts into #mtg-banlist-slot
//   • Setup steps, Discord commands, and fine print
//
// Aura Premium status + subscribe live in js/dashboard-premium.js, which adds
// a strip to this tab and the plans to the Billing tab.
//
// PREVIEW MODE: while COMING_SOON is true the tab shows the full interface
// with every button switched off, no calls to the bot, and a diagonal
// COMING SOON banner. Flip it to false to go live.

(function () {
  const API = (typeof RAILWAY_BOT_URL !== 'undefined') ? RAILWAY_BOT_URL : 'https://web-production-01b81.up.railway.app';
  const AURA_SYNC_VERSION = '0.2.0';
  const DOWNLOAD_URL = 'downloads/AuraSync.zip';
  const CARD_IMAGE = 'img/mtg/aura-card.png';
  const COMING_SOON = false;

  // ─── MOUNT ──────────────────────────────────────────────────────────────────

  const ICON_CARDS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="7" y="3" width="12" height="17" rx="1.5" transform="rotate(8 13 11.5)"/><rect x="4" y="4" width="12" height="17" rx="1.5"/></svg>';

  function mountSidebar() {
    if (document.getElementById('mtg-sidebar-btn')) return;
    // Lives under the shared "// Game Ops" section (js/dashboard-games.js).
    if (!window.AuraGames) { console.error('dashboard-games.js must load before dashboard-mtg.js'); return; }
    window.AuraGames.addButton({
      id: 'mtg-sidebar-btn', tab: 'mtg', label: '<span style="display:inline-block;line-height:1.2;vertical-align:middle">Magic:<br>The Gathering</span>', icon: ICON_CARDS,
      onOpen: () => loadMtgTab(),
    });
  }

  function mountTab() {
    if (document.getElementById('tab-mtg')) return;
    const main = document.querySelector('main.main') || document.querySelector('main');
    if (!main) return;
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.id = 'tab-mtg';
    tab.innerHTML = COMING_SOON ? previewWrap(TAB_HTML) : TAB_HTML;
    main.appendChild(tab);

    if (COMING_SOON) { lockPreview(tab); return; }
    tab.querySelector('#mtg-generate-btn').addEventListener('click', generateToken);
    tab.querySelector('#mtg-copy-btn').addEventListener('click', copyToken);
    tab.querySelector('#mtg-refresh-btn').addEventListener('click', loadMtgTab);
  }

  // ─── COMING SOON PREVIEW ────────────────────────────────────────────────────

  const PREVIEW_CSS = `
    #tab-mtg .mtg-preview { position: relative; }
    #tab-mtg .mtg-preview-body { pointer-events: none; user-select: none; }
    #tab-mtg .mtg-preview-body > *:not(.mtg-hero) { opacity: 0.4; filter: saturate(0.6); }
    #tab-mtg .mtg-soon-layer { position: absolute; inset: 0; z-index: 5; pointer-events: none; overflow: clip; }
    #tab-mtg .mtg-soon-sticky { position: sticky; top: max(480px, 58vh); height: 0; margin-top: max(480px, 58vh); }
    #tab-mtg .mtg-soon-band {
      position: absolute; left: -20%; right: -20%; top: -46px;
      transform: rotate(-7deg);
      background: linear-gradient(90deg, rgba(180,79,255,0.0), rgba(180,79,255,0.88) 18%, rgba(120,40,200,0.92) 50%, rgba(180,79,255,0.88) 82%, rgba(180,79,255,0.0));
      border-top: 2px solid var(--cyan); border-bottom: 2px solid var(--cyan);
      box-shadow: 0 0 28px rgba(180,79,255,0.7), 0 0 60px rgba(0,240,255,0.25);
      padding: 16px 0 12px; text-align: center;
    }
    #tab-mtg .mtg-soon-title {
      font-family: var(--font-display); font-weight: 900; font-size: clamp(2rem, 6vw, 4.2rem);
      letter-spacing: 0.35em; color: #fff; line-height: 1;
      text-shadow: 0 0 10px var(--cyan), 0 0 26px var(--cyan), 0 0 44px rgba(180,79,255,0.9);
      animation: mtgSoonPulse 2.6s ease-in-out infinite;
    }
    #tab-mtg .mtg-soon-sub {
      font-family: var(--font-mono); font-size: clamp(0.6rem, 1.4vw, 0.8rem); letter-spacing: 0.4em;
      color: var(--cyan); margin-top: 10px;
    }
    @keyframes mtgSoonPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.78; } }
    @media (prefers-reduced-motion: reduce) { #tab-mtg .mtg-soon-title { animation: none; } }
  `;

  function previewWrap(html) {
    return `<style>${PREVIEW_CSS}</style>
      <div class="mtg-preview">
        <div class="mtg-soon-layer" aria-hidden="true">
          <div class="mtg-soon-sticky">
            <div class="mtg-soon-band">
              <div class="mtg-soon-title">COMING SOON</div>
              <div class="mtg-soon-sub">MTG PREMIUM // AURA SYNC</div>
            </div>
          </div>
        </div>
        <div class="mtg-preview-body" aria-disabled="true">${html}</div>
      </div>`;
  }

  // Everything visible, nothing usable: sample stats, no bot calls, no download.
  function lockPreview(tab) {
    tab.querySelector('#mtg-status').innerHTML = [
      stat('STATUS', 'COMING SOON', 'var(--purple)'),
      stat('LAST SYNC', '—'),
      stat('UNIQUE CARDS', '—', 'var(--cyan)'),
      stat('TOTAL COPIES', '—'),
    ].join('');
    tab.querySelectorAll('button').forEach((b) => { b.disabled = true; b.tabIndex = -1; });
    tab.querySelectorAll('a').forEach((a) => { a.removeAttribute('href'); a.removeAttribute('download'); a.tabIndex = -1; });
  }

  // ─── MARKUP ─────────────────────────────────────────────────────────────────

  const mono = 'font-family:var(--font-mono)';
  const TAB_HTML = `
    <div class="mtg-hero game-hero" style="display:flex;gap:32px;align-items:center;flex-wrap:wrap;border:1px solid rgba(180,79,255,0.35);padding:24px 26px;margin-bottom:24px;background:linear-gradient(135deg, rgba(180,79,255,0.10), rgba(0,191,255,0.04) 60%, transparent)">
      <img src="${CARD_IMAGE}" alt="Aura — MTG Arena companion" style="width:260px;max-width:60%;height:auto;border-radius:12px;box-shadow:0 0 26px rgba(180,79,255,0.55), 0 0 2px rgba(0,191,255,0.8)">
      <div style="flex:1;min-width:240px">
        <p class="page-tag">// mtg arena companion</p>
        <p class="page-title" style="margin-bottom:10px">AURA // MAGIC: THE GATHERING</p>
        <p style="${mono};font-size:0.82rem;color:var(--white);line-height:1.9">
          Sync your MTG Arena collection to AuraAI, then ask Aura what you own, what you're missing, and what to build — right in Discord.
        </p>
        <p style="${mono};font-size:0.72rem;color:var(--cyan);line-height:1.9;margin-top:8px">
          /mtg-collection &nbsp;·&nbsp; /mtg-export &nbsp;·&nbsp; /mtg-wildcards &nbsp;·&nbsp; /mtg-build
        </p>
      </div>
    </div>

    <div class="section-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <p class="card-title" style="margin:0">// your sync</p>
        <button class="btn-secondary" id="mtg-refresh-btn" style="font-size:0.65rem;padding:6px 12px">↻ REFRESH</button>
      </div>
      <div id="mtg-status" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:16px">
        <p style="${mono};font-size:0.75rem;color:var(--grey)">Loading…</p>
      </div>
      <div id="mtg-problem" style="display:none;margin-top:14px;border:1px solid rgba(255,184,48,0.45);padding:10px 14px;${mono};font-size:0.72rem;color:var(--yellow);line-height:1.8"></div>
    </div>

    <div id="mtg-banlist-slot"></div>

    <div class="section-card">
      <p class="card-title">// sync token</p>
      <p style="${mono};font-size:0.78rem;color:var(--white);line-height:1.9">
        Aura Sync needs your personal token to link to your AuraAI account. Generating a new one replaces the old one — Aura Sync will ask for the new token.
      </p>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:14px">
        <button class="btn-primary" id="mtg-generate-btn">⚿ GENERATE SYNC TOKEN</button>
        <span id="mtg-token-msg" style="${mono};font-size:0.7rem;color:var(--grey)"></span>
      </div>
      <div id="mtg-token-box" style="display:none;margin-top:16px;border:1px solid rgba(0,191,255,0.45);background:rgba(0,191,255,0.05);padding:14px 16px">
        <p style="${mono};font-size:0.6rem;color:var(--grey);letter-spacing:2px;margin-bottom:8px">YOUR NEW TOKEN — SHOWN ONCE</p>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <code id="mtg-token-value" style="${mono};font-size:0.8rem;color:var(--cyan);word-break:break-all;flex:1;min-width:220px"></code>
          <button class="btn-secondary" id="mtg-copy-btn" style="font-size:0.65rem;padding:6px 14px">COPY</button>
        </div>
        <p style="${mono};font-size:0.66rem;color:var(--pink);margin-top:10px;line-height:1.8">
          Paste it into Aura Sync (Settings → Change sync token). Don't share it — anyone with it can overwrite your synced collection.
        </p>
      </div>
    </div>

    <div class="section-card" style="border-color:rgba(0,191,255,0.35);text-align:center;padding:30px 24px">
      <p style="${mono};font-size:0.62rem;color:var(--grey);letter-spacing:3px;margin-bottom:14px">AURA SYNC FOR WINDOWS — VERSION ${AURA_SYNC_VERSION}</p>
      <a href="${DOWNLOAD_URL}" download class="btn-primary" style="display:inline-block;text-decoration:none;font-size:0.85rem;padding:14px 32px">⬇ DOWNLOAD AURA SYNC</a>
      <p style="${mono};font-size:0.62rem;color:var(--grey);margin-top:14px">Windows 10 / 11 · about 100 KB · nothing else to install</p>
    </div>

    <div class="section-card">
      <p class="card-title">// setup</p>
      <ol style="${mono};font-size:0.78rem;color:var(--white);line-height:2.4;padding-left:20px">
        <li>Download Aura Sync above and extract the zip.</li>
        <li>Run <code style="color:var(--cyan)">AuraSync.exe</code>. If Windows shows <span style="color:var(--yellow)">"Windows protected your PC"</span>, click <span style="color:var(--cyan)">More info → Run anyway</span>.</li>
        <li>It installs itself and adds <span style="color:var(--cyan)">Aura Sync</span> to your Start menu — right-click it there and choose <span style="color:var(--cyan)">Pin to taskbar</span>.</li>
        <li>Generate a sync token above and paste it when Aura Sync asks.</li>
        <li>Open MTG Arena. Aura Sync syncs your collection automatically whenever it changes — keep it running while you play.</li>
      </ol>
    </div>

    <div class="section-card">
      <p class="card-title">// ask aura in discord</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;${mono};font-size:0.74rem;line-height:1.8">
        <div><span style="color:var(--cyan)">/mtg-collection</span><br><span style="color:var(--grey)">Your collection by rarity, colour, and set.</span></div>
        <div><span style="color:var(--cyan)">/mtg-export</span><br><span style="color:var(--grey)">A file for Moxfield, Archidekt, MTGGoldfish, ManaBox, or plain text.</span></div>
        <div><span style="color:var(--cyan)">/mtg-wildcards</span><br><span style="color:var(--grey)">Paste a decklist — see what you're missing and the wildcard cost.</span></div>
        <div><span style="color:var(--cyan)">/mtg-build</span><br><span style="color:var(--grey)">Aura builds a deck from cards you own, in any Arena format. Every card double-checked.</span></div>
        <div><span style="color:var(--cyan)">/mtg-link</span><br><span style="color:var(--grey)">Get a sync token from Discord instead of here.</span></div>
      </div>
    </div>

    <div class="section-card" style="border-color:rgba(255,255,255,0.1)">
      <p style="${mono};font-size:0.6rem;color:var(--grey);line-height:1.8">
        Aura Sync reads MTG Arena's memory read-only using the open-source mtga-tracker-daemon, the same method other Arena trackers use. This isn't officially supported by Wizards of the Coast — use at your own risk.
        AuraAI is not affiliated with, endorsed, sponsored, or approved by Wizards of the Coast. Magic: The Gathering and MTG Arena are trademarks of Wizards of the Coast LLC.
        AI-built decks can contain mistakes — always review a deck before spending wildcards.
      </p>
    </div>`;

  // ─── DATA ───────────────────────────────────────────────────────────────────

  async function authHeaders() {
    if (typeof sb === 'undefined') throw new Error('Not signed in');
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Not signed in');
    return { Authorization: `Bearer ${session.access_token}` };
  }

  function ago(iso) {
    if (!iso) return '—';
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
    const d = Math.floor(s / 86400);
    return d === 1 ? 'yesterday' : `${d} days ago`;
  }

  const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : '—');

  function stat(label, value, color) {
    return `<div style="border:1px solid rgba(255,255,255,0.08);padding:12px 14px">
      <p style="${mono};font-size:0.58rem;color:var(--grey);letter-spacing:2px;margin-bottom:6px">${label}</p>
      <p style="font-family:var(--font-display);font-size:1rem;color:${color || 'var(--white)'};letter-spacing:1px">${value}</p>
    </div>`;
  }

  async function loadMtgTab() {
    if (COMING_SOON) return;
    // Ban list channel card (js/dashboard-mtg-banlist.js).
    if (window.AuraMtgBanlist) window.AuraMtgBanlist.load();
    const box = document.getElementById('mtg-status');
    const problem = document.getElementById('mtg-problem');
    if (!box) return;
    try {
      const res = await fetch(`${API}/api/mtg/status`, { headers: await authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const s = await res.json();

      const status = !s.linked
        ? stat('STATUS', 'NOT LINKED', 'var(--pink)')
        : s.lastSync ? stat('STATUS', 'SYNCING', 'var(--green)') : stat('STATUS', 'WAITING FOR FIRST SYNC', 'var(--yellow)');
      box.innerHTML = [
        status,
        stat('LAST SYNC', s.lastSync ? ago(s.lastSync.at) : '—'),
        stat('UNIQUE CARDS', s.lastSync ? fmt(s.lastSync.uniqueCards) : '—', 'var(--cyan)'),
        stat('TOTAL COPIES', s.lastSync ? fmt(s.lastSync.totalCards) : '—'),
      ].join('');

      if (s.lastProblem) {
        const text = s.lastProblem.status === 'flagged_drop'
          ? `⚠ Your last sync (${ago(s.lastProblem.at)}) was held back: your collection looked much smaller than before, so nothing was changed. This usually means Arena hadn't finished loading.`
          : `⚠ Your last sync attempt (${ago(s.lastProblem.at)}) didn't go through: ${s.lastProblem.note || s.lastProblem.status}.`;
        problem.textContent = text;
        problem.style.display = 'block';
      } else {
        problem.style.display = 'none';
      }

      const btn = document.getElementById('mtg-generate-btn');
      if (btn) btn.textContent = s.linked ? '⚿ GENERATE NEW SYNC TOKEN' : '⚿ GENERATE SYNC TOKEN';
      btn.dataset.linked = s.linked ? '1' : '';
    } catch (err) {
      box.innerHTML = `<p style="${mono};font-size:0.75rem;color:var(--pink)">Couldn't load your sync status (${err.message}). Try Refresh.</p>`;
    }
  }

  async function generateToken() {
    const btn = document.getElementById('mtg-generate-btn');
    const msg = document.getElementById('mtg-token-msg');
    if (btn.dataset.linked && !confirm('Generate a new sync token?\n\nYour current token will stop working — Aura Sync will ask you to paste the new one.')) return;
    btn.disabled = true;
    msg.style.color = 'var(--grey)';
    msg.textContent = 'Generating…';
    try {
      const res = await fetch(`${API}/api/mtg/token`, { method: 'POST', headers: await authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) throw new Error(data.error || `HTTP ${res.status}`);
      document.getElementById('mtg-token-value').textContent = data.token;
      document.getElementById('mtg-token-box').style.display = 'block';
      msg.style.color = 'var(--green)';
      msg.textContent = 'New token ready — copy it below.';
      loadMtgTab();
    } catch (err) {
      msg.style.color = 'var(--pink)';
      msg.textContent = `Couldn't generate a token: ${err.message}`;
    } finally {
      btn.disabled = false;
    }
  }

  async function copyToken() {
    const value = document.getElementById('mtg-token-value').textContent;
    const btn = document.getElementById('mtg-copy-btn');
    try { await navigator.clipboard.writeText(value); btn.textContent = 'COPIED ✓'; }
    catch { btn.textContent = 'SELECT + CTRL+C'; }
    setTimeout(() => { btn.textContent = 'COPY'; }, 2500);
  }

  // Exposed for the sidebar button and for anything else that wants to refresh it.
  window.loadMtgTab = loadMtgTab;

  function init() { mountSidebar(); mountTab(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
