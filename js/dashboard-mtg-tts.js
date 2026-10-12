// ─── DASHBOARD: MTG → TTS COMMANDER TABLE (sub-page) ──────────────────────────
// A showcase page for the four-player Commander table built in Tabletop
// Simulator. It sits under the Magic: The Gathering button in the "// Game Ops"
// sidebar section as an indented sub-item, with its own tab. Static content —
// no calls to the bot.
//
// Load AFTER js/dashboard-mtg.js (and before the other game pages) so the
// sub-item lands directly under the MTG button.
//
// To finish later:
//   • REPO_URL     — the public GitHub repo (button shows when set)
//   • WORKSHOP_URL — the Steam Workshop page, once it's public (button shows when set)
//   • HERO_IMAGE   — drop a screenshot of the table at this path; until then the
//                    hero shows without an image.

(function () {
  const REPO_URL = '';
  const WORKSHOP_URL = '';
  const HERO_IMAGE = 'img/mtg/tts-table.jpg';
  const ACCENT = '#b44fff';

  const ICON_TABLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="6" width="18" height="12" rx="2"/><rect x="6.5" y="8.5" width="3" height="4.2" rx="0.5"/><rect x="14.5" y="11.3" width="3" height="4.2" rx="0.5"/><path d="M3 12h3M18 12h3"/></svg>';

  const mono = 'font-family:var(--font-mono)';

  function list(items) {
    return `<ul style="${mono};font-size:0.78rem;color:var(--white);line-height:1.85;margin:0;padding-left:18px">${items.map((i) => `<li style="margin-bottom:4px">${i}</li>`).join('')}</ul>`;
  }

  function featureCard(title, items) {
    return `<div style="border:1px solid ${ACCENT}40;padding:16px 18px;background:linear-gradient(160deg, ${ACCENT}0f, transparent 70%)">
      <p style="${mono};font-size:0.7rem;color:var(--cyan);letter-spacing:2px;margin-bottom:10px">${title}</p>
      ${list(items)}
    </div>`;
  }

  function statTile(value, label) {
    return `<div style="border:1px solid rgba(255,255,255,0.08);padding:14px 16px;text-align:center">
      <p style="font-family:var(--font-display);font-size:1.4rem;color:${ACCENT};letter-spacing:1px;text-shadow:0 0 10px ${ACCENT}99">${value}</p>
      <p style="${mono};font-size:0.58rem;color:var(--grey);letter-spacing:2px;margin-top:6px">${label}</p>
    </div>`;
  }

  function linkButtons() {
    const btns = [];
    if (WORKSHOP_URL) btns.push(`<a href="${WORKSHOP_URL}" target="_blank" rel="noopener" class="btn-primary" style="display:inline-block;text-decoration:none">▶ OPEN IN TABLETOP SIMULATOR</a>`);
    if (REPO_URL) btns.push(`<a href="${REPO_URL}" target="_blank" rel="noopener" class="btn-secondary" style="display:inline-block;text-decoration:none">⌥ VIEW ON GITHUB</a>`);
    if (!btns.length) return `<p style="${mono};font-size:0.72rem;color:var(--grey)">Public release coming after four-player playtests.</p>`;
    return `<div style="display:flex;gap:12px;flex-wrap:wrap">${btns.join('')}</div>`;
  }

  const TAB_HTML = `
    <div class="game-hero" style="border:1px solid ${ACCENT}59;margin-bottom:24px;overflow:hidden;background:linear-gradient(135deg, ${ACCENT}1f, rgba(0,191,255,0.04) 60%, transparent);box-shadow:0 0 24px ${ACCENT}26">
      <img src="${HERO_IMAGE}" alt="The Commander table in Tabletop Simulator" onerror="this.style.display='none'"
        style="display:block;width:100%;height:clamp(200px, 32vw, 360px);object-fit:cover;object-position:center">
      <div style="padding:22px 26px">
        <p class="page-tag">// magic: the gathering · tabletop simulator</p>
        <p class="page-title" style="margin-bottom:10px">MTG // COMMANDER TABLE</p>
        <span style="display:inline-block;${mono};font-size:0.6rem;letter-spacing:2px;color:#050810;background:${ACCENT};padding:4px 10px;margin-bottom:14px;box-shadow:0 0 12px ${ACCENT}">IN DEVELOPMENT · TESTING</span>
        <p style="${mono};font-size:0.82rem;color:var(--white);line-height:1.9">
          A fully automated, four-player Commander table, built from scratch in Lua for Tabletop Simulator.
          It follows the turn structure, runs the stack, reads each card's rules text and sets up its triggers,
          and keeps the numbers straight. It always proposes and never decides for you — whenever a choice is yours
          (targets, modes, "may" effects, trigger order), the table asks.
        </p>
        <p style="${mono};font-size:0.72rem;color:var(--cyan);line-height:1.9;margin-top:8px">
          Official rules, no house rules — a real kitchen-table Commander night, from anywhere, without the paperwork.
        </p>
      </div>
    </div>

    <div class="section-card">
      <p class="card-title">// what it does</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:14px">
        ${featureCard('GETTING INTO A GAME', [
          'Import any deck — paste a list or drop in an Archidekt or Moxfield link',
          'Four seats with reconnect: rejoin and your hand is still there',
          'Proper mulligans (friendly / unfriendly) and a first-player pick',
        ])}
        ${featureCard('RUNNING THE TURN', [
          'Every phase and step in order, including extra combats and extra turns',
          'Summoning sickness, tapped state, mana pools that empty on time',
          'A real stack — choose trigger order, counterspells work, "can\'t be countered" respected',
        ])}
        ${featureCard('READING THE CARDS', [
          'Builds triggered, static and activated abilities from Oracle text',
          'Anthems and lords update card stats live; keyword grants like Slivers apply everywhere',
          'Replacement effects for life, draws, tokens and counters',
        ])}
        ${featureCard('COMBAT', [
          'Attackers pick a target each; blocks from the defending seat',
          'First strike, double strike, trample, deathtouch',
          'Commander damage, poison / infect, commander tax and the command-zone choice',
        ])}
        ${featureCard('MANA & COSTS', [
          'A mana pool per player — lands, rocks, creatures and treasures',
          'Restricted mana (creature-only, Cavern of Souls with its "can\'t be countered" part enforced)',
        ])}
        ${featureCard('QUALITY OF LIFE', [
          'Library search with plain-language filters and a big hover preview',
          'Tokens, counters, goad, soulbond, suspend and more',
          'Planechase box with the planar die and every plane',
          'Solo test mode — one person runs all four seats',
        ])}
      </div>
    </div>

    <div class="section-card">
      <p class="card-title">// how it's built</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:12px;margin-bottom:16px">
        ${statTile('~26,000', 'LINES OF LUA')}
        ${statTile('~40', 'MODULES')}
        ${statTile('4', 'SEATS')}
        ${statTile('100s', 'TEST SCENARIOS')}
      </div>
      ${list([
        '<span style="color:var(--cyan)">Rules engine</span> — a parser that turns Oracle text into structured effects and triggers, plus an event bus so everything on the table can react to everything else',
        '<span style="color:var(--cyan)">Card data</span> — Scryfall, through a custom Cloudflare Workers relay that caches, batches and retries (with a direct-import fallback)',
        '<span style="color:var(--cyan)">Assets</span> — table, mana art, trackers and planar card backs generated with custom Python tools, plus its own soundtrack',
        '<span style="color:var(--cyan)">Testing</span> — a standalone harness runs the Lua against hundreds of scripted card scenarios, plus an in-game test guide',
        '<span style="color:var(--cyan)">Debug tools</span> — <span style="color:var(--white)">!perf</span>, <span style="color:var(--white)">!errors</span>, <span style="color:var(--white)">!unstick</span>, <span style="color:var(--white)">!resync</span>',
      ])}
    </div>

    <div class="section-card">
      <p class="card-title">// where it is now</p>
      <p style="${mono};font-size:0.78rem;color:var(--white);line-height:1.9;margin-bottom:12px">
        The core is built and under test: deck import, turn structure, the stack, combat, mana, triggers, static effects and Planechase.
        Now it's real-table testing and working through the card pool deck by deck — Slivers, artifacts &amp; blink, Zoo, tokens and aristocrats so far.
        Every card the table can't fully automate is documented, so players know exactly what they handle by hand.
      </p>
      <p style="${mono};font-size:0.7rem;color:var(--cyan);letter-spacing:2px;margin-bottom:8px">NEXT</p>
      ${list([
        'Four-player playtests with the whole group',
        'More card coverage, one deck at a time',
        'Opening the table up for everyone',
      ])}
    </div>

    <div class="section-card" style="border-color:rgba(0,191,255,0.35)">
      <p class="card-title">// bring an aura deck</p>
      <p style="${mono};font-size:0.78rem;color:var(--white);line-height:1.9;margin-bottom:14px">
        Build or tune a Commander deck with <span style="color:var(--cyan)">/mtg-build</span> or <span style="color:var(--cyan)">/mtg-refine</span> in Discord,
        then paste the decklist straight into the table's importer.
      </p>
      ${linkButtons()}
    </div>

    <p style="${mono};font-size:0.6rem;color:var(--grey);line-height:1.8;margin:8px 4px 24px">
      Unofficial fan project — not affiliated with or endorsed by Wizards of the Coast. Magic: The Gathering and its card names, art and symbols are property of Wizards of the Coast. Card data courtesy of Scryfall. Tabletop Simulator is a product of Berserk Games.
    </p>
  `;

  function mount() {
    if (document.getElementById('mtg-tts-sidebar-btn')) return;
    if (!window.AuraGames) { console.error('dashboard-games.js must load before dashboard-mtg-tts.js'); return; }
    const btn = window.AuraGames.addButton({
      id: 'mtg-tts-sidebar-btn', tab: 'mtg-tts',
      label: '<span style="display:inline-block;line-height:1.2;vertical-align:middle">Commander Table<br><span style="font-size:0.85em;opacity:0.7">Tabletop Sim</span></span>',
      icon: ICON_TABLE,
    });
    // Sub-item look: indented under the MTG button, a little smaller, with a
    // faint guide line (the normal cyan line still shows when it's active).
    btn.classList.add('sidebar-subitem');
    // Always directly under the MTG button, whatever order the game pages load in.
    const mtgBtn = document.getElementById('mtg-sidebar-btn');
    if (mtgBtn && mtgBtn.nextSibling !== btn) mtgBtn.parentNode.insertBefore(btn, mtgBtn.nextSibling);
    if (!document.getElementById('aura-subitem-style')) {
      const css = document.createElement('style');
      css.id = 'aura-subitem-style';
      css.textContent = `
        .sidebar-item.sidebar-subitem { margin-left: 14px; width: calc(100% - 14px); font-size: 0.62rem; padding-top: 7px; padding-bottom: 7px; }
        .sidebar-item.sidebar-subitem:not(.active) { border-left-color: ${ACCENT}55; }
        .sidebar-item.sidebar-subitem svg { width: 12px; height: 12px; }
      `;
      (document.head || document.documentElement).appendChild(css);
    }
    window.AuraGames.addTab('mtg-tts', TAB_HTML);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
