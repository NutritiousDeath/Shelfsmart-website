// ─── ESO GUILD ROLE SYNC ──────────────────────────────────────────────────
// Dashboard side of utils/eso-roster.js. Lets a server admin add one or more
// ESO guild branches, then map each branch's ranks to Discord roles via a
// blanket 10-slot editor (matches ESO's own 10-rank guild cap).
//
// Depends on globals declared in dashboard.html's main inline <script>:
// sb, RAILWAY_BOT_URL, selectedGuildId, channelPickers, CyberDropdown,
// guildRoleCache, _populateRolePicker, showSaved — same pattern as
// dashboard-reactionroles.js.

let esoGuildsData = [];

async function loadEsoTab() {
  const container = document.getElementById('eso-guilds-container');
  if (!container) return;

  if (!selectedGuildId) {
    container.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.68rem;color:var(--grey)">Select your server to configure ESO guild sync.</p>';
    return;
  }
  loadEsoSyncToken();
  container.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.68rem;color:var(--grey)">Loading...</p>';

  // Drop any dynamic pickers from a previous render so we don't leak stale entries
  Object.keys(channelPickers).forEach(k => { if (k.startsWith('eso-guild-')) delete channelPickers[k]; });

  try {
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(`${RAILWAY_BOT_URL}/api/eso-guilds?guildId=${selectedGuildId}`, {
      headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    esoGuildsData = data.guilds || [];
    renderEsoGuilds();
  } catch (err) {
    console.error('loadEsoTab error:', err.message);
    container.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.68rem;color:var(--pink)">⚠️ Could not load ESO guild config — is the bot in this server?</p>';
  }
}

function esoEscapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function renderEsoGuilds() {
  const container = document.getElementById('eso-guilds-container');
  container.innerHTML = '';

  if (esoGuildsData.length === 0) {
    container.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.68rem;color:var(--grey)">No ESO guild branches added yet. Use "+ Add Guild" above to add your first one.</p>';
    return;
  }

  esoGuildsData.forEach(g => {
    const card = document.createElement('div');
    card.className = 'section-card';
    card.id = 'eso-guild-' + g.id;

    const header = document.createElement('div');
    header.style = 'display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px';
    header.innerHTML = `<p class="card-title">// ${esoEscapeHtml(g.guild_name)}</p>`;
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✕ Remove guild';
    removeBtn.style = 'background:var(--pink);color:#fff;border:none;border-radius:4px;padding:6px 10px;cursor:pointer;font-family:var(--font-mono);font-size:0.62rem;flex-shrink:0';
    removeBtn.onclick = () => deleteEsoGuildConfirm(g.id);
    header.appendChild(removeBtn);
    card.appendChild(header);

    const slotsWrap = document.createElement('div');
    g.slots.forEach(slot => {
      const row = document.createElement('div');
      row.style = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;padding:10px;background:rgba(0,240,255,0.04);border:1px solid rgba(0,240,255,0.1);border-radius:6px;flex-wrap:wrap';

      const num = document.createElement('span');
      num.textContent = '#' + slot.slot_number;
      num.style = 'font-family:var(--font-mono);font-size:0.6rem;color:var(--grey);width:22px;flex-shrink:0';
      row.appendChild(num);

      const nameInput = document.createElement('input');
      nameInput.className = 'cyber-input';
      nameInput.placeholder = 'ESO rank name (e.g. Officer)';
      nameInput.id = 'eso-guild-' + g.id + '-slot-' + slot.slot_number + '-name';
      nameInput.style = 'flex:1;min-width:160px';
      nameInput.value = slot.eso_rank_name || '';
      row.appendChild(nameInput);

      const pickerMount = document.createElement('div');
      pickerMount.id = 'eso-guild-' + g.id + '-slot-' + slot.slot_number + '-role-picker';
      pickerMount.style = 'flex:1;min-width:160px';
      row.appendChild(pickerMount);

      slotsWrap.appendChild(row);
    });
    card.appendChild(slotsWrap);

    const fallbackLabel = document.createElement('label');
    fallbackLabel.className = 'field-label';
    fallbackLabel.innerHTML = 'Fallback role <span style="color:var(--grey)">(for any rank not mapped above)</span>';
    card.appendChild(fallbackLabel);
    const fallbackMount = document.createElement('div');
    fallbackMount.id = 'eso-guild-' + g.id + '-fallback-picker';
    card.appendChild(fallbackMount);

    const saveWrap = document.createElement('div');
    saveWrap.style = 'margin-top:14px';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-primary';
    saveBtn.textContent = 'Save mapping';
    saveBtn.onclick = () => saveEsoRankRoles(g.id);
    saveWrap.appendChild(saveBtn);
    card.appendChild(saveWrap);

    const savedMsg = document.createElement('p');
    savedMsg.className = 'save-msg';
    savedMsg.id = 'eso-guild-' + g.id + '-saved';
    savedMsg.textContent = '// Mapping saved';
    card.appendChild(savedMsg);

    const errorMsg = document.createElement('p');
    errorMsg.className = 'save-msg';
    errorMsg.id = 'eso-guild-' + g.id + '-error';
    errorMsg.style.color = 'var(--pink)';
    card.appendChild(errorMsg);

    container.appendChild(card);

    // Mount CyberDropdowns only after the DOM nodes above actually exist
    g.slots.forEach(slot => {
      const pickerId = 'eso-guild-' + g.id + '-slot-' + slot.slot_number + '-role-picker';
      const picker = new CyberDropdown(pickerId, null);
      channelPickers[pickerId] = picker;
      _populateRolePicker(pickerId, slot.discord_role_id || null);
    });
    const fallbackPickerId = 'eso-guild-' + g.id + '-fallback-picker';
    const fallbackPicker = new CyberDropdown(fallbackPickerId, null);
    channelPickers[fallbackPickerId] = fallbackPicker;
    _populateRolePicker(fallbackPickerId, g.fallback_role_id || null);
  });
}

async function addEsoGuildPrompt() {
  if (!selectedGuildId) return;
  const input = document.getElementById('eso-new-guild-name');
  const name = (input?.value || '').trim();
  if (!name) return;

  try {
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(`${RAILWAY_BOT_URL}/api/eso-guilds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({ guildId: selectedGuildId, guildName: name }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Unknown error');
    input.value = '';
    await loadEsoTab();
  } catch (err) {
    const e = document.getElementById('eso-add-error');
    if (e) { e.textContent = '// Error: ' + err.message; e.style.display = 'block'; setTimeout(() => e.style.display = 'none', 5000); }
  }
}

async function deleteEsoGuildConfirm(esoGuildId) {
  if (!confirm('Remove this ESO guild branch and its rank mapping? This cannot be undone.')) return;
  try {
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(`${RAILWAY_BOT_URL}/api/eso-guilds/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({ guildId: selectedGuildId, esoGuildId }),
    });
    if (!res.ok) { const result = await res.json(); throw new Error(result.error || 'Unknown error'); }
    await loadEsoTab();
  } catch (err) {
    console.error('deleteEsoGuildConfirm error:', err.message);
  }
}

async function saveEsoRankRoles(esoGuildId) {
  const guild = esoGuildsData.find(g => g.id === esoGuildId);
  if (!guild) return;

  const slots = guild.slots.map(slot => {
    const nameEl = document.getElementById('eso-guild-' + esoGuildId + '-slot-' + slot.slot_number + '-name');
    const pickerId = 'eso-guild-' + esoGuildId + '-slot-' + slot.slot_number + '-role-picker';
    const roleId = channelPickers[pickerId]?.getValue() || null;
    return { slot_number: slot.slot_number, eso_rank_name: nameEl?.value || '', discord_role_id: roleId };
  });
  const fallbackRoleId = channelPickers['eso-guild-' + esoGuildId + '-fallback-picker']?.getValue() || null;

  try {
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(`${RAILWAY_BOT_URL}/api/eso-rank-roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({ guildId: selectedGuildId, esoGuildId, slots, fallbackRoleId }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Unknown error');
    showSaved('eso-guild-' + esoGuildId + '-saved');
  } catch (err) {
    const e = document.getElementById('eso-guild-' + esoGuildId + '-error');
    if (e) { e.textContent = '// Error: ' + err.message; e.style.display = 'block'; setTimeout(() => e.style.display = 'none', 5000); }
  }
}

// ─── SYNC TOKEN (per-server) ──────────────────────────────────────────────

async function loadEsoSyncToken() {
  const field = document.getElementById('eso-sync-token-field');
  if (!field || !selectedGuildId) return;
  field.value = 'Loading...';

  try {
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(`${RAILWAY_BOT_URL}/api/eso-sync-token?guildId=${selectedGuildId}`, {
      headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Unknown error');
    field.value = result.token;
  } catch (err) {
    field.value = '';
    console.error('loadEsoSyncToken error:', err.message);
  }
}

function copyEsoSyncToken() {
  const field = document.getElementById('eso-sync-token-field');
  if (!field || !field.value) return;
  navigator.clipboard.writeText(field.value).then(() => {
    showSaved('eso-token-saved');
  }).catch(() => {
    const e = document.getElementById('eso-token-error');
    if (e) { e.textContent = '// Could not copy — select and copy manually'; e.style.display = 'block'; setTimeout(() => e.style.display = 'none', 5000); }
  });
}

async function regenerateEsoSyncTokenConfirm() {
  if (!confirm('Regenerate this server\'s sync token? Any companion app still using the old token will stop working until you update its config with the new one.')) return;

  try {
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(`${RAILWAY_BOT_URL}/api/eso-sync-token/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({ guildId: selectedGuildId }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Unknown error');
    document.getElementById('eso-sync-token-field').value = result.token;
    showSaved('eso-token-saved');
  } catch (err) {
    const e = document.getElementById('eso-token-error');
    if (e) { e.textContent = '// Error: ' + err.message; e.style.display = 'block'; setTimeout(() => e.style.display = 'none', 5000); }
  }
}
