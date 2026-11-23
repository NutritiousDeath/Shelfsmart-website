// ─── DASHBOARD: MINECRAFT TAB ─────────────────────────────────────────────────
// Self-mounting page under "// Game Ops" (needs js/dashboard-games.js first).
// Per PLAYER (tied to the Discord login): shows the Minecraft servers this
// account manages, hosted on Andrew's machine through Crafty Controller.
//   • host status (is the machine talking to Aura?)
//   • each server: status, players, version, address, CPU / RAM
//   • start / stop / restart / backup
//   • whitelist add / remove, broadcast a message
//   • recent activity
// Talks to Railway: GET /api/mc/servers, POST /api/mc/action,
// GET /api/mc/job?id=…, POST /api/mc/server/address.

(function () {
  const G = window.AuraGames;
  if (!G) { console.error('dashboard-games.js must load before dashboard-minecraft.js'); return; }
  const { esc, card, timeAgo } = G;
  const ACCENT = '#4dff9a';
  const BANNER = 'img/mc/aura-banner.jpg';
  const mono = 'font-family:var(--font-mono)';
  const REFRESH_MS = 15 * 1000;
  const JOB_POLL_MS = 1500;
  const JOB_POLL_MAX = 30;

  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 12l9-5M12 12v10M12 12L3 7"/></svg>';

  const LABEL = { start: 'Start', stop: 'Stop', restart: 'Restart', backup: 'Backup', whitelist_add: 'List +', whitelist_remove: 'List −', say: 'Say', create_server: 'Created', delete_server: 'Delete server' };

  let timer = null;
  let busy = new Set();      // server ids with an action in flight
  let lastData = null;
  let editingAddress = null; // server id whose address box is open

  // Java uses Minecraft names + a whitelist; Bedrock uses Xbox gamertags
  // (spaces allowed) + an allowlist, and players always type the port.
  const JAVA_NAME = /^[A-Za-z0-9_]{3,16}$/;
  const GAMERTAG = /^(?=.{1,16}$)[A-Za-z0-9]+(?: [A-Za-z0-9]+)*(?:#[0-9]{1,4})?$/;
  const isBedrock = (s) => s && s.edition === 'bedrock';
  function splitAddress(addr) {
    const m = /^(.*?)(?::(\d{1,5}))?$/.exec(String(addr || ''));
    return { host: m ? m[1] : '', port: m && m[2] ? m[2] : '' };
  }

  const CSS = `
    #tab-mc .mc-host { display:flex; align-items:center; gap:12px; flex-wrap:wrap; border:1px solid rgba(255,255,255,0.08); padding:12px 16px; margin-bottom:20px; ${mono}; font-size:0.7rem; color:var(--grey); }
    #tab-mc .mc-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
    #tab-mc .mc-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:10px; margin:14px 0; }
    #tab-mc .mc-head { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
    #tab-mc .mc-name { font-family:var(--font-display); font-size:1rem; letter-spacing:1.5px; color:var(--white); }
    #tab-mc .mc-pill { ${mono}; font-size:0.56rem; letter-spacing:1.5px; padding:3px 8px; border:1px solid; text-transform:uppercase; }
    #tab-mc .mc-btn { ${mono}; font-size:0.62rem; letter-spacing:1.5px; padding:8px 14px; background:transparent; border:1px solid ${ACCENT}66; color:${ACCENT}; cursor:pointer; text-transform:uppercase; }
    #tab-mc .mc-btn:hover:not(:disabled) { background:${ACCENT}18; box-shadow:0 0 10px ${ACCENT}33; }
    #tab-mc .mc-btn.warn { border-color:rgba(255,42,109,0.5); color:var(--pink); }
    #tab-mc .mc-btn.warn:hover:not(:disabled) { background:rgba(255,42,109,0.12); box-shadow:0 0 10px rgba(255,42,109,0.25); }
    #tab-mc .mc-btn:disabled { opacity:0.35; cursor:not-allowed; }
    #tab-mc .mc-input { background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.15); color:var(--white); ${mono}; font-size:0.74rem; padding:8px 10px; outline:none; min-width:0; }
    #tab-mc .mc-input:focus { border-color:${ACCENT}; box-shadow:0 0 10px ${ACCENT}44; }
    #tab-mc .mc-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:10px; }
    #tab-mc .mc-chip { display:inline-flex; align-items:center; gap:6px; ${mono}; font-size:0.64rem; padding:4px 8px; margin:4px 6px 0 0; border:1px solid rgba(255,255,255,0.12); color:var(--white); }
    #tab-mc .mc-chip.on { border-color:${ACCENT}88; color:${ACCENT}; }
    #tab-mc .mc-chip button { background:none; border:none; color:var(--pink); cursor:pointer; font-size:0.8rem; padding:0; line-height:1; }
    #tab-mc .mc-label { ${mono}; font-size:0.58rem; letter-spacing:2px; color:var(--grey); margin-top:16px; }
    #tab-mc .mc-msg { ${mono}; font-size:0.68rem; margin-top:10px; min-height:1em; }
    #tab-mc .mc-job { display:flex; gap:10px; ${mono}; font-size:0.64rem; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05); color:var(--grey); }
    #tab-mc .mc-addr { ${mono}; font-size:0.78rem; color:var(--cyan); cursor:pointer; border-bottom:1px dashed rgba(var(--accent-rgb),0.4); }
    #tab-mc .mc-link { ${mono}; font-size:0.6rem; color:var(--grey); background:none; border:none; cursor:pointer; text-decoration:underline; padding:0; }
    #tab-mc .mc-ed { ${mono}; font-size:0.56rem; letter-spacing:1px; padding:3px 8px; border:1px solid var(--line); color:var(--grey); }
    #tab-mc .mc-ed.bedrock { color:var(--green); border-color:rgba(var(--green-rgb),0.45); }
    #tab-mc .mc-connect { display:flex; gap:14px; flex-wrap:wrap; align-items:center; }
    #tab-mc .mc-connect span.k { ${mono}; font-size:0.58rem; color:var(--grey); margin-right:6px; }
  `;

  const TAB_HTML = `
    <style>${CSS}</style>
    ${G.bannerHtml({
      art: BANNER, accent: ACCENT, focus: 'center 35%',
      tag: '// minecraft hosting',
      title: 'AURA // MINECRAFT',
      text: 'Your Minecraft servers, hosted by Aura. Start and stop them, manage who can join, and see who\'s online — from here or straight from Discord.',
      commands: '/mc status · /mc start · /mc stop · /mc whitelist add',
    })}
    <div class="mc-host" id="mc-host"><span class="mc-dot" style="background:var(--grey)"></span>Checking the host…</div>
    <div id="mc-servers"><p style="${mono};font-size:0.7rem;color:var(--grey)">Loading…</p></div>
  `;

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  function stateOf(s) {
    if (s.status === 'missing') return { text: 'Removed from host', color: 'var(--grey)' };
    if (s.status === 'suspended') return { text: 'Suspended', color: 'var(--pink)' };
    if (!s.live) return { text: 'No data yet', color: 'var(--grey)' };
    if (s.live.crashed) return { text: 'Crashed', color: '#ffc94d' };
    return s.live.running ? { text: 'Online', color: ACCENT } : { text: 'Offline', color: 'var(--pink)' };
  }

  function renderHost(agent) {
    const el = document.getElementById('mc-host');
    if (!el) return;
    let color = 'var(--pink)';
    let text = `Host offline${agent.lastSeen ? ` — last heard from ${esc(timeAgo(agent.lastSeen))}` : ''}. Servers can't be controlled until it's back.`;
    if (agent.online && agent.craftyOk === false) { color = '#ffc94d'; text = 'Host is online, but Crafty isn\'t answering it.'; }
    else if (agent.online) { color = ACCENT; text = `Host online${agent.host ? ` · ${esc(agent.host)}` : ''}${agent.version ? ` · agent v${esc(agent.version)}` : ''}`; }
    el.innerHTML = `<span class="mc-dot" style="background:${color};box-shadow:0 0 8px ${color}"></span><span style="color:${color === ACCENT ? 'var(--white)' : color}">${text}</span>`;
  }

  // Crafty sometimes reports sizes as raw bytes (e.g. "1288564736") and
  // sometimes already formatted (e.g. "1.2GB"). Show bytes as GB/MB.
  function fmtSize(v) {
    if (v == null || v === '') return null;
    const s = String(v).trim();
    if (!/^\d+(\.\d+)?$/.test(s)) return s;
    const n = Number(s);
    if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
    if (n >= 1024 ** 2) return `${Math.round(n / 1024 ** 2)} MB`;
    return `${Math.round(n / 1024)} KB`;
  }

  function stat(label, value, color) {
    return `<div style="border:1px solid rgba(255,255,255,0.08);padding:10px 12px">
      <p style="${mono};font-size:0.54rem;color:var(--grey);letter-spacing:2px;margin-bottom:5px">${esc(label)}</p>
      <p style="font-family:var(--font-display);font-size:0.9rem;color:${color || 'var(--white)'};letter-spacing:1px">${esc(value)}</p>
    </div>`;
  }

  function jobLine(j) {
    const color = j.status === 'done' ? ACCENT : j.status === 'failed' ? 'var(--pink)' : 'var(--cyan)';
    const icon = j.status === 'done' ? '✓' : j.status === 'failed' ? '✕' : '…';
    return `<div class="mc-job"><span style="color:${color};width:12px">${icon}</span>
      <span style="color:var(--white);min-width:96px">${esc(LABEL[j.action] || j.action)}${j.arg ? ` ${esc(j.arg)}` : ''}</span>
      <span style="flex:1;min-width:0">${esc(j.result || (j.status === 'queued' ? 'Waiting for the host…' : 'Working…'))}</span>
      <span style="flex-shrink:0">${esc(j.source === 'discord' ? 'discord · ' : '')}${esc(timeAgo(j.createdAt))}</span></div>`;
  }

  function serverCard(s, agentOnline) {
    const st = stateOf(s);
    const live = s.live || {};
    const running = !!live.running;
    const controllable = agentOnline && s.status === 'active' && !busy.has(s.id);
    const dis = (cond) => (controllable && cond ? '' : 'disabled');
    const online = new Set(live.players || []);
    const whitelist = live.whitelist || [];
    const bed = isBedrock(s);
    const listWord = bed ? 'ALLOWLIST' : 'WHITELIST';
    const nameWord = bed ? 'Xbox gamertag' : 'Minecraft name';

    let shown = '';
    if (s.address && bed) {
      const { host, port } = splitAddress(s.address);
      shown = `<span class="mc-connect">
          <span><span class="k">SERVER ADDRESS</span><span class="mc-addr" data-copy="${esc(host)}" title="Click to copy">${esc(host)}</span></span>
          <span><span class="k">PORT</span>${port ? `<span class="mc-addr" data-copy="${esc(port)}" title="Click to copy">${esc(port)}</span>` : '<span style="color:var(--pink)">missing — edit to add it</span>'}</span>
        </span> <button class="mc-link" data-addr-edit="${s.id}">edit</button>`;
    } else if (s.address) {
      shown = `<span class="mc-addr" data-copy="${esc(s.address)}" title="Click to copy">${esc(s.address)}</span> <button class="mc-link" data-addr-edit="${s.id}">edit</button>`;
    }
    const address = editingAddress === s.id
      ? `<div class="mc-row" style="margin-top:6px"><input class="mc-input" data-addr-input="${s.id}" maxlength="96" placeholder="${bed ? 'play.example.com:19132' : 'play.example.com:25565'}" value="${esc(s.address || '')}" style="flex:1;max-width:320px">
           <button class="mc-btn" data-addr-save="${s.id}">Save</button><button class="mc-link" data-addr-cancel="1">cancel</button></div>`
      : (shown || `<button class="mc-link" data-addr-edit="${s.id}" style="color:var(--cyan)">+ set the address players connect to${bed ? ' (with the port)' : ''}</button>`);

    return card(`// ${esc(s.name.toLowerCase())}`, `
      <div class="mc-head">
        <span class="mc-name">${esc(s.name)}</span>
        <span class="mc-ed${bed ? ' bedrock' : ''}">${bed ? 'BEDROCK' : 'JAVA'}</span>
        <span class="mc-pill" style="color:${st.color};border-color:${st.color}">${esc(st.text)}</span>
        ${busy.has(s.id) ? `<span style="${mono};font-size:0.6rem;color:var(--cyan)">working…</span>` : ''}
      </div>
      <div style="margin-top:8px">${address}</div>

      <div class="mc-grid">
        ${stat('PLAYERS', s.live ? `${live.online}/${live.max}` : '—', running ? ACCENT : null)}
        ${stat('VERSION', live.version || '—')}
        ${stat('CPU', live.cpu != null && running ? `${Number(live.cpu).toFixed(1)}%` : '—')}
        ${stat('RAM', running && live.mem ? `${fmtSize(live.mem)}${live.memPercent != null ? ` · ${live.memPercent}%` : ''}` : '—')}
        ${stat('WORLD', fmtSize(live.worldSize) || '—')}
      </div>

      <div class="mc-row">
        <button class="mc-btn" data-act="start" data-id="${s.id}" ${dis(!running)}>Start</button>
        <button class="mc-btn warn" data-act="stop" data-id="${s.id}" ${dis(running)}>Stop</button>
        <button class="mc-btn" data-act="restart" data-id="${s.id}" ${dis(running)}>Restart</button>
        <button class="mc-btn" data-act="backup" data-id="${s.id}" ${dis(true)}>Backup</button>
      </div>

      <p class="mc-label">${listWord} — WHO CAN JOIN ${whitelist.length ? `(${whitelist.length})` : ''}</p>
      <div>${whitelist.length
        ? whitelist.map((n) => `<span class="mc-chip${online.has(n) ? ' on' : ''}" title="${online.has(n) ? 'Online now' : ''}">${online.has(n) ? '● ' : ''}${esc(n)}<button data-wl-remove="${esc(n)}" data-id="${s.id}" title="Remove" ${dis(running)}>×</button></span>`).join('')
        : `<p style="${mono};font-size:0.66rem;color:var(--grey);margin-top:6px">Nobody yet.</p>`}</div>
      <div class="mc-row">
        <input class="mc-input" data-wl-input="${s.id}" maxlength="${bed ? 24 : 16}" placeholder="${nameWord}" style="width:190px">
        <button class="mc-btn" data-wl-add="${s.id}" ${dis(running)}>Add</button>
        ${!running && s.status === 'active' ? `<span style="${mono};font-size:0.6rem;color:var(--grey)">server must be running</span>` : ''}
      </div>

      <p class="mc-label">MESSAGE EVERYONE ONLINE</p>
      <div class="mc-row">
        <input class="mc-input" data-say-input="${s.id}" maxlength="200" placeholder="Server restarting in 5 minutes…" style="flex:1;max-width:420px">
        <button class="mc-btn" data-say="${s.id}" ${dis(running)}>Send</button>
      </div>

      <p class="mc-msg" data-msg="${s.id}"></p>

      ${(s.recentJobs || []).length ? `<p class="mc-label">RECENT ACTIVITY</p><div>${s.recentJobs.map(jobLine).join('')}</div>` : ''}
      ${live.updatedAt ? `<p style="${mono};font-size:0.56rem;color:var(--grey);margin-top:10px">Updated ${esc(timeAgo(live.updatedAt))}</p>` : ''}
    `, { accent: st.color === ACCENT ? ACCENT : undefined });
  }

  function render(data) {
    lastData = data;
    renderHost(data.agent || {});
    const el = document.getElementById('mc-servers');
    if (!el) return;
    if (!data.servers.length) {
      el.innerHTML = card('// no servers yet', `<p style="${mono};font-size:0.74rem;color:var(--white);line-height:1.9">
        You don't have a Minecraft server with Aura yet. Hosting plans are coming soon — keep an eye on the AuraAI Discord.</p>`, { accent: ACCENT });
      return;
    }
    // Don't wipe what someone is typing during an auto-refresh.
    const typing = el.contains(document.activeElement) && document.activeElement.tagName === 'INPUT';
    if (typing) return;
    el.innerHTML = data.servers.map((s) => serverCard(s, !!data.agent?.online)).join('');
  }

  function msg(serverId, text, color) {
    const el = document.querySelector(`#tab-mc [data-msg="${serverId}"]`);
    if (el) { el.textContent = text || ''; el.style.color = color || 'var(--grey)'; }
  }

  // ─── DATA ───────────────────────────────────────────────────────────────────

  async function loadMcTab() {
    try {
      render(await G.api('/api/mc/servers'));
    } catch (err) {
      if (err.message === 'Not signed in') return;
      const el = document.getElementById('mc-servers');
      if (el && !lastData) el.innerHTML = `<p style="${mono};font-size:0.72rem;color:var(--pink)">Couldn't load your servers (${esc(err.message)}).</p>`;
    }
  }

  async function waitForJob(id) {
    for (let i = 0; i < JOB_POLL_MAX; i++) {
      await new Promise((r) => setTimeout(r, JOB_POLL_MS));
      try {
        const { job } = await G.api(`/api/mc/job?id=${encodeURIComponent(id)}`);
        if (job.status === 'done' || job.status === 'failed') return job;
      } catch (_) { /* keep trying */ }
    }
    return null;
  }

  async function runAction(serverId, action, arg) {
    if (busy.has(serverId)) return;
    if (action === 'stop' && !confirm('Stop the server? Everyone online will be disconnected.')) return;
    if (action === 'restart' && !confirm('Restart the server? Everyone online will be disconnected for about a minute.')) return;
    busy.add(serverId);
    if (lastData) render(lastData);
    msg(serverId, `${LABEL[action]}${arg ? ` ${arg}` : ''} — sending to the host…`, 'var(--cyan)');
    try {
      const { job } = await G.api('/api/mc/action', { method: 'POST', body: { serverId, action, arg } });
      const done = await waitForJob(job.id);
      busy.delete(serverId);
      await loadMcTab();
      if (!done) msg(serverId, 'Still working — this page will update on its own.', 'var(--cyan)');
      else if (done.status === 'done') msg(serverId, `✓ ${done.result || 'Done.'}`, ACCENT);
      else msg(serverId, `✕ ${done.result || 'Failed.'}`, 'var(--pink)');
      // Starts/restarts take a while to show as online — check again soon.
      if (['start', 'restart', 'stop'].includes(action)) setTimeout(loadMcTab, 12000);
    } catch (err) {
      busy.delete(serverId);
      if (lastData) render(lastData);
      msg(serverId, err.message, 'var(--pink)');
    }
  }

  async function saveAddress(serverId, address) {
    try {
      await G.api('/api/mc/server/address', { method: 'POST', body: { serverId, address } });
      editingAddress = null;
      await loadMcTab();
    } catch (err) { msg(serverId, err.message, 'var(--pink)'); }
  }

  // ─── EVENTS ─────────────────────────────────────────────────────────────────

  function onClick(e) {
    const t = e.target.closest('button, [data-copy]');
    if (!t || t.disabled) return;
    const d = t.dataset;
    if (d.act) return runAction(d.id, d.act);
    if (d.wlRemove) return runAction(d.id, 'whitelist_remove', d.wlRemove);
    if (d.wlAdd) {
      const input = document.querySelector(`#tab-mc [data-wl-input="${d.wlAdd}"]`);
      const server = lastData?.servers?.find((x) => x.id === d.wlAdd);
      const bed = isBedrock(server);
      const name = bed ? input.value.trim().replace(/\s+/g, ' ') : input.value.trim();
      if (bed && !GAMERTAG.test(name)) return msg(d.wlAdd, 'Xbox gamertags are up to 16 letters, numbers and single spaces.', 'var(--pink)');
      if (!bed && !JAVA_NAME.test(name)) return msg(d.wlAdd, 'Minecraft names are 3–16 letters, numbers or underscores.', 'var(--pink)');
      input.value = '';
      return runAction(d.wlAdd, 'whitelist_add', name);
    }
    if (d.say) {
      const input = document.querySelector(`#tab-mc [data-say-input="${d.say}"]`);
      const text = input.value.trim();
      if (!text) return msg(d.say, 'Type a message first.', 'var(--pink)');
      input.value = '';
      return runAction(d.say, 'say', text);
    }
    if (d.addrEdit) { editingAddress = d.addrEdit; document.activeElement?.blur(); return render(lastData); }
    if (d.addrCancel) { editingAddress = null; document.activeElement?.blur(); return render(lastData); }
    if (d.addrSave) {
      const input = document.querySelector(`#tab-mc [data-addr-input="${d.addrSave}"]`);
      return saveAddress(d.addrSave, input.value.trim());
    }
    if (d.copy) {
      navigator.clipboard?.writeText(d.copy).then(() => { const old = t.textContent; t.textContent = 'copied!'; setTimeout(() => { t.textContent = old; }, 1200); }).catch(() => {});
    }
  }

  function onKeydown(e) {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
    const d = e.target.dataset;
    const id = d.wlInput || d.sayInput || d.addrInput;
    if (!id) return;
    const btn = document.querySelector(`#tab-mc [data-${d.wlInput ? 'wl-add' : d.sayInput ? 'say' : 'addr-save'}="${id}"]`);
    if (btn && !btn.disabled) btn.click();
  }

  // ─── MOUNT ──────────────────────────────────────────────────────────────────

  function tabVisible() {
    const tab = document.getElementById('tab-mc');
    return !!tab && tab.classList.contains('active') && !document.hidden;
  }

  function init() {
    G.addButton({ id: 'mc-sidebar-btn', tab: 'mc', label: 'Minecraft', icon: ICON, onOpen: () => loadMcTab() });
    const tab = G.addTab('mc', TAB_HTML);
    if (!tab) return;
    tab.addEventListener('click', onClick);
    tab.addEventListener('keydown', onKeydown);
    clearInterval(timer);
    timer = setInterval(() => { if (tabVisible()) loadMcTab(); }, REFRESH_MS);
  }

  window.loadMcTab = loadMcTab;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
