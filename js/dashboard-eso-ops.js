// ─── DASHBOARD: ESO UNDER GAME OPS ────────────────────────────────────────────
// ESO used to be two sidebar tabs under "// Features" (Guild Sync + Sync
// Files). They're one page now (#tab-eso in dashboard.html) and the button
// lives under "// Game Ops" with the other games, after Destiny 2.
//
// It's a server-admin tool (it syncs a guild's ranks into a Discord server),
// so it does NOT get data-game-tab — the player-only view in
// dashboard-premium.js keeps hiding it, as before.
// Load AFTER dashboard-d2.js and BEFORE dashboard-premium.js.

(function () {
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l2.5 6.5L21 9l-5 4.5L17.5 21 12 17l-5.5 4L8 13.5 3 9l6.5-.5L12 2z"/></svg>';

  function mount() {
    if (document.getElementById('eso-sidebar-btn')) return;
    const section = document.getElementById('games-sidebar-section');
    const games = Array.from(document.querySelectorAll('.sidebar-item[data-game-tab]'));
    const after = games[games.length - 1] || section;
    if (!after || !after.parentNode) return;
    const btn = document.createElement('button');
    btn.className = 'sidebar-item';
    btn.id = 'eso-sidebar-btn';
    // Kept as an onclick attribute (not a listener) so older scripts that find
    // the ESO button by its onclick text still do.
    btn.setAttribute('onclick', "setTab('eso',this);if(typeof loadEsoTab==='function')loadEsoTab()");
    btn.innerHTML = ICON + 'ESO';
    after.parentNode.insertBefore(btn, after.nextSibling);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
