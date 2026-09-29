// ─── DASHBOARD: DIVISION 2 TAB ────────────────────────────────────────────────
// Self-mounting page under "// Game Ops" (needs js/dashboard-games.js first).
// Per PLAYER (tied to the Discord login), not per server:
//   • Agent profile — what Aura has learned from /div-build chats
//   • Last build plan
//   • Gear locker — search the Division 2 item list, add / remove
// Talks to Railway: GET /api/div2/overview, GET /api/div2/search,
// POST /api/div2/locker/add, POST /api/div2/locker/remove.

(function () {
  const G = window.AuraGames;
  if (!G) { console.error('dashboard-games.js must load before dashboard-div2.js'); return; }
  const { esc, stat, card, timeAgo } = G;
  const ACCENT = '#ff6a00';
  const BANNER = 'img/div2/aura-banner.jpg';
  const mono = 'font-family:var(--font-mono)';

  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5"/></svg>';

  const RARITY_COLOR = { exotic: '#ff4d4d', named: '#ffc94d', 'gear set': '#4dff9a', 'high-end': '#ff9f40' };
  let loaded = false;
  let searchTimer = null;
  let pending = null; // item picked in search, waiting for ADD

  const CSS = `
    #tab-div2 .d2v-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; }
    #tab-div2 .dv-row { display:flex; align-items:center; gap:10px; padding:9px 12px; border:1px solid rgba(255,255,255,0.07); margin-top:6px; }
    #tab-div2 .dv-row:hover { border-color:${ACCENT}55; }
    #tab-div2 .dv-slot { ${mono}; font-size:0.56rem; letter-spacing:1.5px; color:var(--grey); width:74px; flex-shrink:0; text-transform:uppercase; }
    #tab-div2 .dv-name { font-family:var(--font-display); font-size:0.72rem; letter-spacing:1px; color:var(--white); }
    #tab-div2 .dv-what { ${mono}; font-size:0.62rem; color:var(--grey); margin-top:2px; }
    #tab-div2 .dv-rar { ${mono}; font-size:0.52rem; letter-spacing:1.5px; padding:2px 6px; border:1px solid; text-transform:uppercase; flex-shrink:0; }
    #tab-div2 .dv-x { margin-left:auto; background:transparent; border:1px solid rgba(255,42,109,0.4); color:var(--pink); ${mono}; font-size:0.6rem; padding:4px 9px; cursor:pointer; flex-shrink:0; }
    #tab-div2 .dv-x:hover { background:rgba(255,42,109,0.12); }
    #tab-div2 .dv-search { position:relative; }
    #tab-div2 .dv-search input { width:100%; box-sizing:border-box; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.15); color:var(--white); ${mono}; font-size:0.78rem; padding:11px 12px; outline:none; }
    #tab-div2 .dv-search input:focus { border-color:${ACCENT}; box-shadow:0 0 10px ${ACCENT}44; }
    #tab-div2 .dv-results { border:1px solid ${ACCENT}44; border-top:none; background:#070b16; max-height:320px; overflow:auto; }
    #tab-div2 .dv-res { display:flex; gap:10px; align-items:center; padding:9px 12px; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.05); }
    #tab-div2 .dv-res:hover, #tab-div2 .dv-res.on { background:${ACCENT}18; }
    #tab-div2 .dv-chip { display:inline-block; ${mono}; font-size:0.62rem; padding:4px 9px; margin:3px 4px 0 0; border:1px solid rgba(255,255,255,0.12); color:var(--white); }
    #tab-div2 .dv-msg { ${mono}; font-size:0.68rem; margin-top:10px; min-height:1em; }
    #tab-div2 .dv-filter { ${mono}; font-size:0.6rem; letter-spacing:1px; padding:5px 10px; border:1px solid rgba(255,255,255,0.15); background:transparent; color:var(--grey); cursor:pointer; margin:0 4px 4px 0; }
    #tab-div2 .dv-filter.on { border-color:${ACCENT}; color:${ACCENT}; background:${ACCENT}14; }
  `;

  const TAB_HTML = `
    <style>${CSS}</style>
    ${G.bannerHtml({
      art: BANNER, accent: ACCENT, focus: 'center 28%',
      tag: '// division 2 companion',
      title: 'AURA // DIVISION 2',
      text: 'Aura keeps a locker of the gear and weapons you actually own, learns how you like to play, and plans builds from your stash — every piece, talent and set bonus checked against the real Division 2 item list.',
      commands: '/div-build · /div-gear',
    })}

    <div class="d2v-grid" id="dv-stats" style="margin-bottom:20px"></div>

    ${card('// gear locker', `
      <p style="${mono};font-size:0.66rem;color:var(--grey);line-height:1.8;margin-bottom:12px">
        Add what's in your stash. Spelling can be rough — pick the match from the list. Aura only builds from items in here (plus anything you mention in a /div-build chat).
      </p>
      <div class="dv-search">
        <input id="dv-q" type="text" autocomplete="off" maxlength="80" placeholder="Search gear or weapons — e.g. big alejandro, strikers chest…">
        <div class="dv-results" id="dv-results" style="display:none"></div>
      </div>
      <p class="dv-msg" id="dv-msg"></p>
      <div id="dv-filters" style="margin-top:14px"></div>
      <div id="dv-locker"><p style="${mono};font-size:0.7rem;color:var(--grey)">Loading…</p></div>
    `, { accent: ACCENT })}

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px">
      ${card('// last build plan', '<div id="dv-plan"><p style="font-family:var(--font-mono);font-size:0.7rem;color:var(--grey)">Loading…</p></div>', { accent: ACCENT })}
      ${card('// what aura knows about you', '<div id="dv-profile"><p style="font-family:var(--font-mono);font-size:0.7rem;color:var(--grey)">Loading…</p></div>', { accent: ACCENT })}
    </div>

    ${card('// how it works', `
      <ol style="${mono};font-size:0.72rem;color:var(--white);line-height:2.1;padding-left:18px">
        <li>Fill your <span style="color:${ACCENT}">gear locker</span> here, or in Discord with <span style="color:var(--cyan)">/div-gear</span>.</li>
        <li>Run <span style="color:var(--cyan)">/div-build</span> — Aura opens a private thread just for you.</li>
        <li>Tell her what you're after: "a skill build for legendary missions", "tanky DZ build with what I have"…</li>
        <li>She plans it from your locker, checks every piece against the item list, and remembers your style for next time.</li>
        <li>Keep chatting in the thread to tweak it — "swap the chest", "more armor", "I don't own that".</li>
      </ol>
    `)}

    ${card('// discord commands', `
      <div style="${mono};font-size:0.72rem;line-height:2.1;color:var(--white)">
        <p><span style="color:var(--cyan)">/div-build</span> — your private build planner thread</p>
        <p><span style="color:var(--cyan)">/div-gear list</span> — see your locker</p>
        <p><span style="color:var(--cyan)">/div-gear add item:"…"</span> — add a piece (rough spelling is fine)</p>
        <p><span style="color:var(--cyan)">/div-gear remove item:"…"</span> — remove a piece</p>
      </div>
    `)}

    <p style="${mono};font-size:0.58rem;color:var(--grey);line-height:1.8;margin-top:6px;letter-spacing:0.5px">
      Item data from <a href="https://github.com/div2hub/game-data" target="_blank" rel="noopener" style="color:var(--cyan)">div2hub/game-data</a> (CC BY 4.0), refreshed daily.
      AuraAI is a fan-made tool and isn't affiliated with or endorsed by Ubisoft or Massive Entertainment.
    </p>
  `;

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  const rarityBadge = (r) => (r ? `<span class="dv-rar" style="color:${RARITY_COLOR[r] || 'var(--grey)'};border-color:${RARITY_COLOR[r] || 'var(--grey)'}66">${esc(r)}</span>` : '');

  let lockerCache = [];
  let filter = 'all';

  function renderStats(locker, lastPlan) {
    const weapons = locker.filter((i) => i.kind === 'weapon').length;
    const exotics = locker.filter((i) => i.rarity === 'exotic').length;
    document.getElementById('dv-stats').innerHTML = [
      stat('LOCKER ITEMS', String(locker.length), ACCENT),
      stat('GEAR', String(locker.length - weapons)),
      stat('WEAPONS', String(weapons)),
      stat('EXOTICS', String(exotics), RARITY_COLOR.exotic),
      stat('LAST PLAN', lastPlan ? timeAgo(lastPlan.at) : '—', 'var(--cyan)'),
    ].join('');
  }

  function renderFilters() {
    const slots = ['all', ...new Set(lockerCache.map((i) => i.slot).filter(Boolean))];
    const el = document.getElementById('dv-filters');
    el.innerHTML = lockerCache.length > 4 ? slots.map((s) => `<button class="dv-filter${s === filter ? ' on' : ''}" data-slot="${esc(s)}">${esc(s.toUpperCase())}</button>`).join('') : '';
    el.querySelectorAll('.dv-filter').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.slot; renderFilters(); renderLocker(); }));
  }

  function renderLocker() {
    const el = document.getElementById('dv-locker');
    if (!lockerCache.length) {
      el.innerHTML = `<p style="${mono};font-size:0.72rem;color:var(--grey);line-height:1.8;margin-top:10px">Your locker is empty. Search above to add your first piece — start with your exotics and named items, they matter most.</p>`;
      return;
    }
    const list = filter === 'all' ? lockerCache : lockerCache.filter((i) => i.slot === filter);
    el.innerHTML = list.map((i) => `
      <div class="dv-row">
        <span class="dv-slot">${esc(i.slot || i.kind)}</span>
        <div style="min-width:0">
          <p class="dv-name">${esc(i.name)}</p>
          <p class="dv-what">${esc(i.what || '')}${i.talent ? ` · <span style="color:${ACCENT}">${esc(i.talent)}</span>` : ''}</p>
        </div>
        ${rarityBadge(i.rarity)}
        <button class="dv-x" data-name="${esc(i.name)}" title="Remove from locker">REMOVE</button>
      </div>`).join('');
    el.querySelectorAll('.dv-x').forEach((b) => b.addEventListener('click', () => removeItem(b.dataset.name, b)));
  }

  function renderPlan(p) {
    const el = document.getElementById('dv-plan');
    if (!p) {
      el.innerHTML = `<p style="${mono};font-size:0.72rem;color:var(--grey);line-height:1.8">No plan yet. Run <span style="color:var(--cyan)">/div-build</span> in Discord and Aura will plan one from your locker.</p>`;
      return;
    }
    const rows = [...(p.gear || []), ...(p.weapons || [])].map((x) => `
      <div class="dv-row" style="margin-top:4px;padding:7px 10px">
        <span class="dv-slot">${esc(x.slot)}</span>
        <div style="min-width:0"><p class="dv-name" style="font-size:0.66rem">${esc(x.item)}</p>${x.talent ? `<p class="dv-what" style="color:${ACCENT}">${esc(x.talent)}</p>` : ''}</div>
      </div>`).join('');
    const skills = Array.isArray(p.skills) ? p.skills.join(' · ') : (p.skills || '');
    el.innerHTML = `
      <p style="font-family:var(--font-display);font-size:0.9rem;color:var(--white);letter-spacing:1px">${esc(p.build_name || 'Build')}</p>
      <p style="${mono};font-size:0.64rem;color:var(--grey);margin:4px 0 8px">${[p.specialization, skills].filter(Boolean).map(esc).join(' · ')}${p.at ? ` · ${esc(timeAgo(p.at))}` : ''}</p>
      ${rows}
      <p style="${mono};font-size:0.62rem;color:var(--grey);margin-top:10px">Want changes? Open your /div-build thread and tell Aura.</p>`;
  }

  const PROFILE_LABELS = { role: 'Role', activities: 'Plays', specialization: 'Specialization', weapon_preferences: 'Weapons', playstyle: 'Playstyle', difficulty: 'Difficulty', group: 'Group', notes: 'Notes' };

  function renderProfile(profile) {
    const el = document.getElementById('dv-profile');
    const rows = Object.entries(PROFILE_LABELS).filter(([k]) => profile[k] && (!Array.isArray(profile[k]) || profile[k].length))
      .map(([k, label]) => `<p style="${mono};font-size:0.7rem;line-height:1.9"><span style="color:var(--grey);display:inline-block;min-width:110px">${label}</span><span style="color:var(--white)">${esc(Array.isArray(profile[k]) ? profile[k].join(', ') : profile[k])}</span></p>`);
    const notOwned = (profile.not_owned || []).slice(-12);
    el.innerHTML = rows.length || notOwned.length
      ? rows.join('') + (notOwned.length ? `<p style="${mono};font-size:0.6rem;color:var(--grey);letter-spacing:1.5px;margin-top:12px">YOU SAID YOU DON'T OWN</p><div>${notOwned.map((n) => `<span class="dv-chip" style="color:var(--grey)">${esc(n)}</span>`).join('')}</div>` : '')
      : `<p style="${mono};font-size:0.72rem;color:var(--grey);line-height:1.8">Nothing yet — Aura learns your role, activities and playstyle as you chat in <span style="color:var(--cyan)">/div-build</span>.</p>`;
  }

  function msg(text, color) {
    const el = document.getElementById('dv-msg');
    if (el) { el.textContent = text || ''; el.style.color = color || 'var(--grey)'; }
  }

  // ─── DATA ───────────────────────────────────────────────────────────────────

  async function loadDiv2Tab() {
    try {
      const data = await G.api('/api/div2/overview');
      lockerCache = data.locker || [];
      if (filter !== 'all' && !lockerCache.some((i) => i.slot === filter)) filter = 'all';
      renderStats(lockerCache, data.lastPlan);
      renderFilters();
      renderLocker();
      renderPlan(data.lastPlan);
      renderProfile(data.profile || {});
      loaded = true;
    } catch (err) {
      if (err.message === 'Not signed in') return;
      document.getElementById('dv-locker').innerHTML = `<p style="${mono};font-size:0.72rem;color:var(--pink)">Couldn't load your locker (${esc(err.message)}).</p>`;
    }
  }

  function showResults(results) {
    const box = document.getElementById('dv-results');
    if (!results.length) { box.style.display = 'block'; box.innerHTML = `<p style="${mono};font-size:0.68rem;color:var(--grey);padding:10px 12px">No matches — try another spelling.</p>`; return; }
    box.style.display = 'block';
    box.innerHTML = results.map((r, i) => `
      <div class="dv-res" data-i="${i}">
        <div style="min-width:0;flex:1">
          <p class="dv-name" style="font-size:0.68rem">${esc(r.name)}</p>
          <p class="dv-what">${esc(r.what || r.kind)}${r.talent ? ` · ${esc(r.talent)}` : ''}</p>
        </div>
        ${rarityBadge(r.rarity)}
        <span style="${mono};font-size:0.6rem;color:${ACCENT};flex-shrink:0">+ ADD</span>
      </div>`).join('');
    box.querySelectorAll('.dv-res').forEach((row) => row.addEventListener('click', () => addItem(results[Number(row.dataset.i)])));
  }

  function onSearchInput(e) {
    const q = e.target.value.trim();
    clearTimeout(searchTimer);
    if (q.length < 2) { document.getElementById('dv-results').style.display = 'none'; return; }
    searchTimer = setTimeout(async () => {
      try {
        const data = await G.api(`/api/div2/search?q=${encodeURIComponent(q)}`);
        if (document.getElementById('dv-q').value.trim() === q) showResults(data.results || []);
      } catch (err) { msg(`Search failed: ${err.message}`, 'var(--pink)'); }
    }, 250);
  }

  async function addItem(item) {
    if (pending) return;
    pending = item;
    msg(`Adding ${item.name}…`);
    try {
      const data = await G.api('/api/div2/locker/add', { method: 'POST', body: { name: item.name } });
      msg(data.status === 'already' ? `${data.name} is already in your locker.` : `✅ Added ${data.name}.`, 'var(--green)');
      document.getElementById('dv-q').value = '';
      document.getElementById('dv-results').style.display = 'none';
      await loadDiv2Tab();
    } catch (err) {
      msg(err.message, 'var(--pink)');
    } finally {
      pending = null;
    }
  }

  async function removeItem(name, btn) {
    btn.disabled = true;
    btn.textContent = '…';
    try {
      await G.api('/api/div2/locker/remove', { method: 'POST', body: { name } });
      msg(`Removed ${name}.`, 'var(--grey)');
      await loadDiv2Tab();
    } catch (err) {
      msg(err.message, 'var(--pink)');
      btn.disabled = false;
      btn.textContent = 'REMOVE';
    }
  }

  // ─── MOUNT ──────────────────────────────────────────────────────────────────

  function init() {
    G.addButton({ id: 'div2-sidebar-btn', tab: 'div2', label: 'Division 2', icon: ICON, onOpen: () => loadDiv2Tab() });
    const tab = G.addTab('div2', TAB_HTML);
    if (!tab) return;
    renderStats([], null);
    const q = tab.querySelector('#dv-q');
    q.addEventListener('input', onSearchInput);
    q.addEventListener('keydown', (e) => { if (e.key === 'Escape') { q.value = ''; tab.querySelector('#dv-results').style.display = 'none'; } });
    document.addEventListener('click', (e) => { if (!e.target.closest('#tab-div2 .dv-search')) { const r = document.getElementById('dv-results'); if (r) r.style.display = 'none'; } });
  }

  window.loadDiv2Tab = loadDiv2Tab;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
