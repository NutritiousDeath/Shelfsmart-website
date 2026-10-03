// ─── DASHBOARD: WHY AURA ──────────────────────────────────────────────────────
// 1. A "Why Aura" page in the sidebar (under // Main, right after Overview) —
//    a cyberpunk advert for what Aura does. Visible in the player view too.
// 2. A popup the FIRST time a free user logs in. They tick "I've seen this"
//    and press Continue; it never pops up on its own again. Saved per account
//    (user_access.why_aura_seen_at via the mark_why_aura_seen() function — see
//    dashboard_why_aura.sql) and in this browser as a backup.
//
//    Preview it any time: dashboard.html?whyaura=preview
//
// Load AFTER dashboard-premium.js.

(function () {
  const INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=1479991514351538350&permissions=2251799813900304&integration_type=0&scope=bot+applications.commands';
  const SEEN_KEY = 'auraWhySeen';
  const IMG = { mtg: 'img/mtg/aura-card.png', div2: 'img/div2/aura-banner.jpg', d2: 'img/d2/aura-banner.jpg' };
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>';

  // ─── STYLES ─────────────────────────────────────────────────────────────────

  const CSS = `
    .why { --why-accent: var(--cyan); }
    .why * { box-sizing: border-box; }
    .why .w-mono { font-family: var(--font-mono); }
    .why .w-hero { position: relative; overflow: hidden; border: 1px solid rgba(0,240,255,0.35); padding: clamp(28px, 5vw, 56px) clamp(18px, 4vw, 44px);
      margin-bottom: 26px; background:
        radial-gradient(1200px 300px at 85% -10%, rgba(180,79,255,0.22), transparent 60%),
        radial-gradient(900px 260px at -10% 110%, rgba(0,240,255,0.16), transparent 60%),
        linear-gradient(180deg, rgba(5,8,16,0.6), rgba(5,8,16,0.95)); }
    .why .w-hero::before { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0.18;
      background: repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 3px); }
    .why .w-hero::after { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--cyan); box-shadow: 0 0 18px var(--cyan); }
    .why .w-tag { font-family: var(--font-mono); font-size: 0.66rem; letter-spacing: 4px; color: var(--pink); text-transform: uppercase; margin-bottom: 14px; }
    .why .w-title { font-family: var(--font-display); font-weight: 900; font-size: clamp(2.4rem, 8vw, 5.4rem); line-height: 0.95; letter-spacing: 0.08em; color: #fff; margin: 0 0 16px;
      text-shadow: 0 0 12px var(--cyan), 0 0 34px rgba(0,240,255,0.45); position: relative; display: inline-block; }
    .why .w-title span { color: var(--cyan); }
    .why .w-title::before, .why .w-title::after { content: attr(data-text); position: absolute; left: 0; top: 0; width: 100%; overflow: hidden; pointer-events: none; }
    .why .w-title::before { color: var(--pink); clip-path: inset(0 0 62% 0); opacity: 0; animation: whyGlitch 4.2s infinite steps(1); }
    .why .w-title::after { color: #fff; clip-path: inset(58% 0 0 0); opacity: 0; animation: whyGlitch 3.1s infinite steps(1) 0.7s; }
    /* Invisible most of the time; a quick slice-and-shift every few seconds. */
    @keyframes whyGlitch { 0%, 88%, 100% { opacity: 0; transform: none; } 90% { opacity: 0.85; transform: translate(4px,-1px); } 93% { opacity: 0.85; transform: translate(-4px,1px); } 96% { opacity: 0.6; transform: translate(2px,0); } }
    .why .w-sub { font-family: var(--font-display); font-size: clamp(0.85rem, 2.2vw, 1.15rem); letter-spacing: 3px; color: var(--white); margin-bottom: 14px; }
    .why .w-lead { font-family: var(--font-mono); font-size: 0.86rem; line-height: 1.95; color: var(--grey); max-width: 720px; }
    .why .w-lead b { color: var(--white); font-weight: 400; }
    .why .w-cta { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 24px; }
    .why .w-btn { font-family: var(--font-display); font-size: 0.68rem; font-weight: 700; letter-spacing: 2px; padding: 13px 22px; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
      border: 1px solid var(--cyan); color: #050810; background: var(--cyan); box-shadow: 0 0 18px rgba(0,240,255,0.35); clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%); }
    .why .w-btn.alt { background: transparent; color: var(--cyan); box-shadow: none; }
    .why .w-btn:hover { filter: brightness(1.15); }
    .why .w-btn:focus-visible, .why-pop button:focus-visible, .why-pop input:focus-visible { outline: 2px solid var(--pink); outline-offset: 3px; }
    .why .w-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-top: 30px; }
    .why .w-stat { border: 1px solid rgba(255,255,255,0.08); padding: 12px 14px; background: rgba(5,8,16,0.55); }
    .why .w-stat p:first-child { font-family: var(--font-display); font-size: 1.05rem; color: var(--cyan); letter-spacing: 1px; }
    .why .w-stat p:last-child { font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 2px; color: var(--grey); margin-top: 4px; text-transform: uppercase; }
    .why .w-h { font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 4px; color: var(--cyan); margin: 34px 0 6px; text-transform: uppercase; }
    .why .w-h2 { font-family: var(--font-display); font-size: clamp(1.05rem, 3vw, 1.5rem); letter-spacing: 3px; color: var(--white); margin-bottom: 18px; }
    .why .w-games { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(380px, 100%), 1fr)); gap: 16px; }
    .why .w-game { border: 1px solid rgba(255,255,255,0.1); background: rgba(5,8,16,0.6); display: flex; flex-direction: column; overflow: hidden; position: relative; }
    .why .w-game .art { height: 180px; background: #050810; overflow: hidden; position: relative; }
    .why .w-game .art img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .why .w-game .art::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 50%, rgba(5,8,16,0.95)); }
    .why .w-game .art.text { display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 2.6rem; letter-spacing: 6px; color: rgba(255,255,255,0.12);
      background: radial-gradient(400px 160px at 50% 40%, rgba(255,214,102,0.14), transparent), #050810; }
    .why .w-game .body { padding: 16px 18px 18px; flex: 1; }
    .why .w-game .name { font-family: var(--font-display); font-size: 0.9rem; letter-spacing: 3px; margin-bottom: 4px; }
    .why .w-game .hook { font-family: var(--font-mono); font-size: 0.74rem; color: var(--white); margin-bottom: 12px; line-height: 1.7; }
    .why .w-game ul { list-style: none; padding: 0; margin: 0; font-family: var(--font-mono); font-size: 0.68rem; line-height: 1.85; color: var(--grey); }
    .why .w-game li { padding-left: 16px; position: relative; margin-bottom: 4px; }
    .why .w-game li::before { content: "›"; position: absolute; left: 0; color: var(--game, var(--cyan)); }
    .why .w-game code { color: var(--game, var(--cyan)); font-family: var(--font-mono); }
    .why .w-game .bar { position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--game, var(--cyan)); box-shadow: 0 0 12px var(--game, var(--cyan)); z-index: 2; }
    .why .w-diff { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); gap: 14px; }
    .why .w-tile { border: 1px solid rgba(180,79,255,0.3); background: linear-gradient(180deg, rgba(180,79,255,0.08), transparent); padding: 18px; }
    .why .w-tile .k { font-family: var(--font-mono); font-size: 0.58rem; letter-spacing: 3px; color: var(--purple); }
    .why .w-tile .t { font-family: var(--font-display); font-size: 0.86rem; letter-spacing: 2px; color: var(--white); margin: 6px 0 8px; }
    .why .w-tile .d { font-family: var(--font-mono); font-size: 0.68rem; line-height: 1.8; color: var(--grey); }
    .why .w-tools { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr)); gap: 10px; }
    .why .w-tool { font-family: var(--font-mono); font-size: 0.68rem; color: var(--white); border-left: 2px solid var(--cyan); padding: 10px 12px; background: rgba(0,240,255,0.04); line-height: 1.6; }
    .why .w-tool span { display: block; color: var(--grey); font-size: 0.6rem; }
    .why .w-plans { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(210px, 100%), 1fr)); gap: 14px; }
    .why .w-plan { border: 1px solid rgba(255,255,255,0.1); padding: 18px; background: rgba(5,8,16,0.6); position: relative; }
    .why .w-plan.hot { border-color: var(--cyan); box-shadow: 0 0 22px rgba(0,240,255,0.18); }
    /* Server Pro: neon purple (same purple as the Lifetime badge) so it draws the eye. */
    .why .w-plan.pro { border-color: #b44fff; background: linear-gradient(180deg, rgba(180,79,255,0.14), rgba(5,8,16,0.75) 70%);
      box-shadow: 0 0 22px rgba(180,79,255,0.45), 0 0 60px rgba(180,79,255,0.15), inset 0 0 24px rgba(180,79,255,0.08); animation: whyProPulse 3.2s ease-in-out infinite; }
    .why .w-plan.pro .pn { color: #d9a6ff; }
    .why .w-plan.pro .pp { color: #fff; text-shadow: 0 0 10px #b44fff, 0 0 26px rgba(180,79,255,0.7); }
    .why .w-plan.pro .pp small { color: #d9a6ff; text-shadow: none; }
    .why .w-plan.pro li { color: #cdb8e6; }
    .why .w-plan.pro li::before { color: #b44fff; text-shadow: 0 0 6px #b44fff; }
    .why .w-plan.pro .flag { background: #b44fff; color: #fff; box-shadow: 0 0 12px #b44fff; }
    @keyframes whyProPulse { 0%, 100% { box-shadow: 0 0 22px rgba(180,79,255,0.45), 0 0 60px rgba(180,79,255,0.15), inset 0 0 24px rgba(180,79,255,0.08); }
      50% { box-shadow: 0 0 30px rgba(180,79,255,0.7), 0 0 80px rgba(180,79,255,0.28), inset 0 0 30px rgba(180,79,255,0.12); } }
    @media (prefers-reduced-motion: reduce) { .why .w-plan.pro { animation: none; } }
    .why .w-plan .pn { font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 3px; color: var(--grey); }
    .why .w-plan .pp { font-family: var(--font-display); font-size: 1.5rem; color: var(--white); margin: 8px 0 2px; letter-spacing: 1px; }
    .why .w-plan .pp small { font-size: 0.7rem; color: var(--grey); letter-spacing: 1px; }
    .why .w-plan ul { list-style: none; padding: 0; margin: 12px 0 0; font-family: var(--font-mono); font-size: 0.66rem; line-height: 1.9; color: var(--grey); }
    .why .w-plan li::before { content: "✓ "; color: var(--green); }
    .why .w-plan .flag { position: absolute; top: -9px; right: 12px; font-family: var(--font-mono); font-size: 0.55rem; letter-spacing: 2px; padding: 3px 8px; background: var(--cyan); color: #050810; }
    .why .w-end { text-align: center; border: 1px solid rgba(255,45,120,0.35); padding: 34px 18px; margin-top: 34px; background: linear-gradient(180deg, rgba(255,45,120,0.07), transparent); }
    .why .w-end .w-cta { justify-content: center; }
    .why .w-fine { font-family: var(--font-mono); font-size: 0.58rem; color: var(--grey); line-height: 1.8; margin-top: 22px; opacity: 0.8; }
    @media (prefers-reduced-motion: reduce) { .why .w-title::before, .why .w-title::after { animation: none; } }

    /* ── popup ── */
    .why-pop { position: fixed; inset: 0; z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 16px;
      background: rgba(3,5,10,0.86); backdrop-filter: blur(4px); }
    .why-pop[hidden] { display: none; }
    .why-pop .box { width: 100%; max-width: 560px; max-height: calc(100vh - 32px); overflow: auto; position: relative; border: 1px solid var(--cyan);
      background: linear-gradient(180deg, rgba(8,13,26,0.98), rgba(5,8,16,0.98)); box-shadow: 0 0 40px rgba(0,240,255,0.25), inset 0 0 60px rgba(180,79,255,0.06);
      padding: 26px clamp(18px, 4vw, 30px) 22px; clip-path: polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 22px 100%, 0 calc(100% - 22px));
      scrollbar-width: thin; scrollbar-color: rgba(0,240,255,0.3) transparent; }
    .why-pop.full .box { max-width: 1100px; height: calc(100vh - 32px); padding-top: 18px; }
    .why-pop .x { position: absolute; top: 10px; right: 14px; background: none; border: none; color: var(--grey); font-size: 20px; cursor: pointer; line-height: 1; z-index: 3; }
    .why-pop .ptag { font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 4px; color: var(--pink); margin-bottom: 8px; }
    .why-pop .ptitle { font-family: var(--font-display); font-size: clamp(1.4rem, 5vw, 2rem); font-weight: 900; letter-spacing: 4px; color: #fff; text-shadow: 0 0 14px var(--cyan); margin-bottom: 10px; }
    .why-pop .ptitle span { color: var(--cyan); }
    .why-pop .plead { font-family: var(--font-mono); font-size: 0.74rem; line-height: 1.85; color: var(--grey); margin-bottom: 14px; }
    .why-pop .plist { list-style: none; padding: 0; margin: 0 0 18px; font-family: var(--font-mono); font-size: 0.72rem; line-height: 1.8; color: var(--white); }
    .why-pop .plist li { padding: 7px 0 7px 22px; position: relative; border-top: 1px solid rgba(255,255,255,0.05); }
    .why-pop .plist li::before { content: "▸"; position: absolute; left: 4px; color: var(--cyan); }
    .why-pop .plist b { color: var(--cyan); font-weight: 400; }
    .why-pop .more { width: 100%; font-family: var(--font-display); font-size: 0.68rem; font-weight: 700; letter-spacing: 2px; padding: 13px; cursor: pointer;
      background: transparent; color: var(--cyan); border: 1px solid var(--cyan); margin-bottom: 16px; }
    .why-pop .more:hover { background: rgba(0,240,255,0.08); }
    .why-pop .ack { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px; }
    .why-pop.full .ack { position: sticky; bottom: -22px; background: rgba(5,8,16,0.97); padding-bottom: 14px; margin: 0 -4px; padding-left: 4px; padding-right: 4px; z-index: 2; }
    .why-pop label { display: flex; align-items: center; gap: 10px; font-family: var(--font-mono); font-size: 0.7rem; color: var(--white); cursor: pointer; }
    .why-pop input[type=checkbox] { width: 18px; height: 18px; accent-color: var(--cyan); cursor: pointer; }
    .why-pop .go { font-family: var(--font-display); font-size: 0.68rem; font-weight: 700; letter-spacing: 2px; padding: 12px 22px; cursor: pointer; border: 1px solid var(--cyan);
      background: var(--cyan); color: #050810; box-shadow: 0 0 16px rgba(0,240,255,0.35); }
    .why-pop .go:disabled { background: transparent; color: var(--grey); border-color: rgba(255,255,255,0.15); box-shadow: none; cursor: not-allowed; }
    .why-pop .hint { width: 100%; font-family: var(--font-mono); font-size: 0.58rem; color: var(--grey); margin-top: 2px; }
    .why-pop .full-body { display: none; }
    .why-pop.full .short-body { display: none; }
    .why-pop.full .full-body { display: block; }
  `;

  // ─── CONTENT ────────────────────────────────────────────────────────────────

  function pageHtml() {
    return `
      <div class="w-hero">
        <p class="w-tag">// transmission incoming — aura is online</p>
        <h1 class="w-title" data-text="WHY AURA">WHY <span>AURA</span></h1>
        <p class="w-sub">THE AI GAMING COMPANION THAT CHECKS HER OWN WORK</p>
        <p class="w-lead">Most AI bots guess. Aura reads <b>your</b> collection, <b>your</b> vault and <b>the official rules</b> — then double-checks every deck, build and answer before you ever see it. Anything that doesn't hold up gets cut, and she tells you why.</p>
        <div class="w-cta">
          <a class="w-btn" href="${INVITE_URL}" target="_blank" rel="noopener">⚡ ADD AURA TO YOUR SERVER</a>
          <button class="w-btn alt" type="button" data-why="premium">🎮 PLAYER PLANS</button>
        </div>
        <div class="w-stats">
          <div class="w-stat"><p>4 GAMES</p><p>MTG Arena · Division 2 · Destiny 2 · ESO</p></div>
          <div class="w-stat"><p>50+</p><p>slash commands</p></div>
          <div class="w-stat"><p>100%</p><p>of deck cards ban-checked</p></div>
          <div class="w-stat"><p>FREE</p><p>to start — no card needed</p></div>
        </div>
      </div>

      <p class="w-h">// what she does</p>
      <p class="w-h2">BUILT FOR THE GAMES YOU ACTUALLY PLAY</p>
      <div class="w-games">
        <div class="w-game" style="--game:#b44fff">
          <div class="bar"></div>
          <div class="art"><img src="${IMG.mtg}" alt="Aura — MTG Arena" style="object-position:center 22%" onerror="this.style.display='none'"></div>
          <div class="body">
            <p class="name" style="color:#b44fff">MAGIC: THE GATHERING</p>
            <p class="hook">Decks built from the cards you <i>own</i>.</p>
            <ul>
              <li><b style="color:var(--white);font-weight:400">Aura Sync</b> reads your Arena collection automatically</li>
              <li><code>/mtg-build</code> — a deck from your collection, any Arena format</li>
              <li><code>/mtg-refine</code> — its strongest version + exactly what to craft</li>
              <li><code>/mtg-rules</code> — answers from the official Comprehensive Rules</li>
              <li>Every card checked against Arena's ban list — ban watch DMs you if one gets banned</li>
            </ul>
          </div>
        </div>
        <div class="w-game" style="--game:#ff7a1a">
          <div class="bar"></div>
          <div class="art"><img src="${IMG.div2}" alt="Aura — The Division 2" style="object-position:center 30%" onerror="this.style.display='none'"></div>
          <div class="body">
            <p class="name" style="color:#ff7a1a">THE DIVISION 2</p>
            <p class="hook">A build planner that knows your gear.</p>
            <ul>
              <li><code>/div-build</code> — your own private planning thread with Aura</li>
              <li><code>/div-gear</code> — a locker of the gear you actually have</li>
              <li>Builds planned around your locker — then refined as you talk it through</li>
            </ul>
          </div>
        </div>
        <div class="w-game" style="--game:#4fd1ff">
          <div class="bar"></div>
          <div class="art"><img src="${IMG.d2}" alt="Aura — Destiny 2" style="object-position:center 30%" onerror="this.style.display='none'"></div>
          <div class="body">
            <p class="name" style="color:#4fd1ff">DESTINY 2</p>
            <p class="hook">Builds from <i>your</i> vault, not a wishlist.</p>
            <ul>
              <li><code>/d2-link</code> — connect your Bungie account</li>
              <li><code>/d2-vault</code> — exotics, armor sets and duplicates at a glance</li>
              <li><code>/d2-build</code> — every piece checked against Bungie's own data</li>
            </ul>
          </div>
        </div>
        <div class="w-game" style="--game:#ffd666">
          <div class="bar"></div>
          <div class="art text">ESO</div>
          <div class="body">
            <p class="name" style="color:#ffd666">ELDER SCROLLS ONLINE</p>
            <p class="hook">Guild ranks that keep themselves up to date.</p>
            <ul>
              <li>In-game guild ranks mirrored to Discord roles automatically</li>
              <li><code>/eso</code> — trials, sets, CP, pledges, prices and more</li>
              <li><code>/pat-verify</code> — verify Pithka Achievement Tracker clears</li>
            </ul>
          </div>
        </div>
      </div>

      <p class="w-h">// built different</p>
      <p class="w-h2">SHE DOESN'T MAKE THINGS UP</p>
      <div class="w-diff">
        <div class="w-tile"><p class="k">01 // VERIFIED</p><p class="t">CHECKS HER WORK</p><p class="d">Every card, piece and rule is checked against real game data. Anything invalid is removed — and she shows you what and why.</p></div>
        <div class="w-tile"><p class="k">02 // PERSONAL</p><p class="t">USES WHAT YOU OWN</p><p class="d">Your Arena collection, your Destiny vault, your Division locker. Advice you can actually use tonight — not after a week of farming.</p></div>
        <div class="w-tile"><p class="k">03 // MEMORY</p><p class="t">REMEMBERS THE THREAD</p><p class="d">Reply to any deck or build — "cheaper", "more removal", "swap the exotic" — and she reworks that exact one.</p></div>
        <div class="w-tile"><p class="k">04 // CURRENT</p><p class="t">NEVER STALE</p><p class="d">Card data refreshed daily, the official Arena ban list built in and re-checked every few hours, and the official rulebook on hand.</p></div>
      </div>

      <p class="w-h">// and your server</p>
      <p class="w-h2">ONE BOT INSTEAD OF SIX</p>
      <div class="w-tools">
        <div class="w-tool">Moderation &amp; mod log<span>ban, mute, timeout, warnings, full logs</span></div>
        <div class="w-tool">Tickets<span>support panels with claim &amp; close</span></div>
        <div class="w-tool">Temp voice channels<span>join-to-create, owner controls</span></div>
        <div class="w-tool">Leveling &amp; XP<span>ranks, leaderboard, level-up posts</span></div>
        <div class="w-tool">Onboarding<span>welcome cards, question flows, member gate</span></div>
        <div class="w-tool">Reaction roles<span>button menus for self-assign roles</span></div>
        <div class="w-tool">Social alerts<span>Twitch, YouTube &amp; Kick go-live posts</span></div>
        <div class="w-tool">Security<span>link blacklist &amp; anti-raid honeypot</span></div>
        <div class="w-tool">Info hub &amp; embeds<span>rules, links and announcements, styled</span></div>
        <div class="w-tool">Events &amp; signups<span>RSVPs with reminders</span></div>
        <div class="w-tool">Tags &amp; suggestions<span>saved answers and a suggestion box</span></div>
        <div class="w-tool">MTG ban list channel<span>posts every Arena ban list change</span></div>
      </div>

      <p class="w-h">// plans</p>
      <p class="w-h2">START FREE. UPGRADE WHEN SHE EARNS IT.</p>
      <div class="w-plans">
        <div class="w-plan"><p class="pn">FREE</p><p class="pp">$0</p>
          <ul><li>3 AI builds a month (any game)</li><li>Collection sync, exports, vault &amp; locker</li><li>Rules lookups &amp; chat</li><li>All free server tools</li></ul></div>
        <div class="w-plan hot"><span class="flag">PLAYERS</span><p class="pn">PREMIUM — ONE GAME</p><p class="pp">$5<small> /mo</small></p>
          <ul><li>Unlimited AI builds &amp; refines for one game</li><li>MTG: the ban list channel for your server</li><li>Cancel anytime</li></ul></div>
        <div class="w-plan"><p class="pn">PREMIUM — ALL GAMES</p><p class="pp">$10<small> /mo</small></p>
          <ul><li>Every game, unlimited</li><li>New games included as they launch</li><li>Cancel anytime</li></ul></div>
        <div class="w-plan pro"><span class="flag">SERVER OWNERS</span><p class="pn">SERVER PRO</p><p class="pp">$9<small> /mo · or $79 once</small></p>
          <ul><li>For server owners</li><li>Pro tools: sticky messages, security, warn system, advanced logs</li><li>Lifetime option — pay once, keep it</li></ul></div>
      </div>
      <p class="w-fine">Unlimited AI builds have a fair-use limit of 100 a month. AI can make mistakes — Aura checks her work, but always look a deck or build over before spending resources on it.</p>

      <div class="w-end">
        <p class="w-tag" style="margin-bottom:8px">// end of transmission</p>
        <p class="w-h2" style="margin-bottom:6px">READY WHEN YOU ARE.</p>
        <p class="w-lead" style="margin:0 auto">Add Aura to your server, or just use her as a player in any server she's already in.</p>
        <div class="w-cta">
          <a class="w-btn" href="${INVITE_URL}" target="_blank" rel="noopener">⚡ ADD AURA TO YOUR SERVER</a>
          <button class="w-btn alt" type="button" data-why="premium">🎮 SEE PLAYER PLANS</button>
        </div>
        <p class="w-fine">AuraAI is not affiliated with Wizards of the Coast, Ubisoft, Bungie or ZeniMax. Game names are trademarks of their owners.</p>
      </div>`;
  }

  function popupHtml(name) {
    return `
      <div class="box" role="dialog" aria-modal="true" aria-labelledby="why-pop-title">
        <button class="x" type="button" aria-label="Close" data-why="close">×</button>
        <div class="short-body">
          <p class="ptag">// new operator detected</p>
          <p class="ptitle" id="why-pop-title">WELCOME${name ? `, ${escapeHtml(name).toUpperCase()}` : ''}. <span>I'M AURA.</span></p>
          <p class="plead">Your AI gaming companion — and unlike most, I check my own work before you see it.</p>
          <ul class="plist">
            <li><b>MTG Arena</b> — decks from the cards you own, every card ban-checked</li>
            <li><b>Division 2 &amp; Destiny 2</b> — builds from your actual gear and vault</li>
            <li><b>ESO</b> — guild ranks synced to Discord roles automatically</li>
            <li><b>Your server</b> — moderation, tickets, leveling, alerts and more</li>
            <li><b>Free to start</b> — 3 AI builds a month, no card needed</li>
          </ul>
          <button class="more" type="button" data-why="expand">⚡ SHOW ME WHY AURA →</button>
        </div>
        <div class="full-body why">${pageHtml()}</div>
        <div class="ack">
          <label><input type="checkbox" id="why-pop-check"> I've seen this — don't show it again</label>
          <button class="go" type="button" id="why-pop-go" disabled>CONTINUE</button>
          <p class="hint" id="why-pop-hint">Tick the box to continue. You can always find this again under <span style="color:var(--cyan)">Why Aura</span> in the sidebar.</p>
        </div>
      </div>`;
  }

  // ─── HELPERS ────────────────────────────────────────────────────────────────

  function escapeHtml(t) {
    return String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const user = () => { try { return typeof currentUser !== 'undefined' ? currentUser : null; } catch { return null; } };
  const access = () => { try { return typeof userAccess !== 'undefined' ? userAccess : null; } catch { return null; } };
  const owner = () => { try { return typeof isOwner !== 'undefined' && isOwner; } catch { return false; } };
  const discordIdOf = (u) => (u && (u.user_metadata?.provider_id || u.id)) || 'anon';
  const seenKey = () => `${SEEN_KEY}:${discordIdOf(user())}`;
  function locallySeen() { try { return localStorage.getItem(seenKey()) === '1'; } catch { return false; } }
  function rememberLocally() { try { localStorage.setItem(seenKey(), '1'); } catch { /* storage blocked */ } }

  function sidebarButton(name) {
    return Array.from(document.querySelectorAll('.sidebar-item')).find((b) => (b.getAttribute('onclick') || '').includes(`'${name}'`));
  }

  // "Player plans" → the Aura Premium card on Billing. On the paywall, go
  // through the player view first (dashboard-premium.js adds that button).
  function openPlans() {
    closePopup(false);
    const wall = document.getElementById('paywall-overlay');
    const walled = wall && !wall.classList.contains('hidden');
    const playerBtn = document.getElementById('pm-player-btn');
    if (walled && playerBtn) playerBtn.click();
    setTimeout(() => {
      const bill = sidebarButton('billing');
      if (bill) bill.click();
      setTimeout(() => { const el = document.getElementById('premium-section'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 200);
    }, walled ? 300 : 0);
  }

  // ─── SIDEBAR + PAGE ─────────────────────────────────────────────────────────

  function mount() {
    if (!document.getElementById('why-aura-style')) {
      const st = document.createElement('style');
      st.id = 'why-aura-style';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    const main = document.querySelector('main.main') || document.querySelector('main');
    if (main && !document.getElementById('tab-why')) {
      const tab = document.createElement('div');
      tab.className = 'tab why';
      tab.id = 'tab-why';
      tab.innerHTML = pageHtml();
      main.appendChild(tab);
      tab.addEventListener('click', onAction);
    }
    if (!document.getElementById('why-sidebar-btn')) {
      const overview = sidebarButton('overview');
      if (overview && overview.parentNode) {
        const btn = document.createElement('button');
        btn.className = 'sidebar-item';
        btn.id = 'why-sidebar-btn';
        btn.setAttribute('data-player-keep', ''); // players see it too
        btn.setAttribute('onclick', "setTab('why',this)");
        btn.innerHTML = `${ICON}<span style="color:var(--pink);text-shadow:0 0 8px rgba(255,45,120,0.5)">Why Aura</span>`;
        overview.parentNode.insertBefore(btn, overview.nextSibling);
      }
    }
  }

  function onAction(e) {
    const el = e.target.closest('[data-why]');
    if (!el) return;
    const act = el.getAttribute('data-why');
    if (act === 'premium') { e.preventDefault(); openPlans(); }
    else if (act === 'expand') { const pop = document.getElementById('why-pop'); if (pop) { pop.classList.add('full'); pop.querySelector('.box').scrollTop = 0; } }
    else if (act === 'close') closePopup(false);
  }

  // ─── FIRST-LOGIN POPUP ──────────────────────────────────────────────────────

  let lastFocus = null;

  function openPopup() {
    if (document.getElementById('why-pop')) return;
    const u = user();
    const name = u?.user_metadata?.full_name || u?.user_metadata?.name || '';
    const pop = document.createElement('div');
    pop.className = 'why-pop';
    pop.id = 'why-pop';
    pop.innerHTML = popupHtml(name.split(/[#\s]/)[0]);
    document.body.appendChild(pop);
    lastFocus = document.activeElement;
    pop.addEventListener('click', onAction);
    const check = pop.querySelector('#why-pop-check');
    const go = pop.querySelector('#why-pop-go');
    check.addEventListener('change', () => { go.disabled = !check.checked; });
    go.addEventListener('click', () => closePopup(true));
    pop.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopup(false); });
    setTimeout(() => pop.querySelector('.more')?.focus(), 50);
  }

  async function closePopup(markSeen) {
    const pop = document.getElementById('why-pop');
    if (!pop) return;
    pop.remove();
    if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch { /* ignore */ }
    if (!markSeen) return;
    rememberLocally();
    try {
      if (typeof sb !== 'undefined' && sb.rpc) {
        const { error } = await sb.rpc('mark_why_aura_seen');
        if (error) console.warn('Why Aura: could not save "seen" to your account (saved in this browser):', error.message);
        const a = access();
        if (a && !error) a.why_aura_seen_at = new Date().toISOString();
      }
    } catch (err) { console.warn('Why Aura: save failed:', err.message); }
  }

  // Waits for the dashboard's own login/access check, then decides.
  function maybePopup() {
    const params = new URLSearchParams(window.location.search);
    const preview = params.get('whyaura') === 'preview';
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      const loading = document.getElementById('loading');
      const ready = (!loading || loading.classList.contains('hidden')) && user();
      if (!ready && tries < 120) return;
      clearInterval(timer);
      if (!user()) return;
      if (preview) { openPopup(); return; }
      const a = access();
      const tier = (a && a.tier) || 'free';
      const free = tier === 'free' && !owner();
      const seen = (a && a.why_aura_seen_at) || locallySeen();
      if (free && !seen) openPopup();
    }, 250);
  }

  window.AuraWhy = { open: openPopup, page: () => { const b = document.getElementById('why-sidebar-btn'); if (b) b.click(); } };

  function init() { mount(); maybePopup(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
