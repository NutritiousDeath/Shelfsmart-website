// ─── SUPPORT TICKETS BUILDER v2 ───────────────────────────────────────────────
// Multi-panel (up to 5), embed-based panel message, per-ticket-type category
// routing (create/claimed/closed), transcript settings, and command toggles.
// Talks to /api/tickets/panels + /api/tickets/panel(/create|/save|/publish|/delete).

let ticketPanelsCache = [];
let ticketCurrentPanelId = null;
let ticketCurrentMode = 'buttons';
let ticketManagerRoleIds = [];
let ticketTypeCounter = 0;
let ticketTypePickers = {}; // rowId -> { create: CyberDropdown, claimed: CyberDropdown, closed: CyberDropdown }

const TICKET_MAX_PANELS = 5;

// ─── VIEW SWITCHING ───────────────────────────────────────────────────────────

function showTicketPanelList() {
  document.getElementById('ticket-panel-list-view').style.display = '';
  document.getElementById('ticket-panel-editor-view').style.display = 'none';
  ticketCurrentPanelId = null;
}

function showTicketPanelEditorView() {
  document.getElementById('ticket-panel-list-view').style.display = 'none';
  document.getElementById('ticket-panel-editor-view').style.display = '';
}

function resetTicketPanels() {
  ticketPanelsCache = [];
  ticketCurrentPanelId = null;
  document.getElementById('ticket-panel-list').innerHTML = '';
  document.getElementById('ticket-panel-count').textContent = `0 / ${TICKET_MAX_PANELS}`;
  document.getElementById('ticket-panel-empty-hint').style.display = '';
  showTicketPanelList();
}

// ─── PANEL LIST ───────────────────────────────────────────────────────────────

async function loadTicketPanelsList(guildId) {
  document.getElementById('ticket-panel-list').innerHTML = '<p style="font-family:var(--font-mono);font-size:0.65rem;color:var(--grey)">Loading...</p>';
  try {
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(`${RAILWAY_BOT_URL}/api/tickets/panels?guildId=${guildId}`, {
      headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
    });
    if (!res.ok) { setStatus('status-tickets', false); document.getElementById('ticket-panel-list').innerHTML = ''; return; }
    const data = await res.json();
    ticketPanelsCache = data.panels || [];
    renderTicketPanelList();
    setStatus('status-tickets', ticketPanelsCache.some(p => p.status === 'published'));
  } catch (err) {
    console.error('loadTicketPanelsList error:', err.message);
    setStatus('status-tickets', false);
  }
}

function renderTicketPanelList() {
  const container = document.getElementById('ticket-panel-list');
  const countEl = document.getElementById('ticket-panel-count');
  const emptyHint = document.getElementById('ticket-panel-empty-hint');
  const createBtn = document.getElementById('ticket-create-panel-btn');

  countEl.textContent = `${ticketPanelsCache.length} / ${TICKET_MAX_PANELS}`;
  createBtn.disabled = ticketPanelsCache.length >= TICKET_MAX_PANELS;
  createBtn.style.opacity = createBtn.disabled ? '0.5' : '1';
  emptyHint.style.display = ticketPanelsCache.length === 0 ? '' : 'none';

  container.innerHTML = '';
  ticketPanelsCache.forEach(panel => {
    const row = document.createElement('div');
    row.style = 'display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:rgba(0,240,255,0.04);border:1px solid rgba(0,240,255,0.1);border-radius:6px;margin-bottom:8px;cursor:pointer';
    row.onclick = () => openTicketPanelEditor(panel.id);

    const left = document.createElement('div');
    const channel = guildChannelCache.find(c => c.id === panel.publish_channel_id);
    left.innerHTML = `<p style="font-weight:600;font-size:0.85rem">${panel.name || 'Untitled panel'}</p>` +
      `<p style="font-family:var(--font-mono);font-size:0.6rem;color:var(--grey);margin-top:2px">${channel ? '#' + channel.name : 'No channel set'}</p>`;

    const right = document.createElement('span');
    right.textContent = panel.status === 'published' ? 'Published' : 'Draft';
    right.style = `font-family:var(--font-mono);font-size:0.6rem;padding:3px 10px;border-radius:10px;${panel.status === 'published' ? 'background:rgba(0,255,136,0.15);color:var(--green)' : 'background:rgba(255,255,255,0.08);color:var(--grey)'}`;

    row.appendChild(left);
    row.appendChild(right);
    container.appendChild(row);
  });
}

async function createTicketPanel() {
  if (!selectedGuildId) return;
  if (ticketPanelsCache.length >= TICKET_MAX_PANELS) return;
  try {
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(`${RAILWAY_BOT_URL}/api/tickets/panel/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({ guildId: selectedGuildId, name: 'New ticketing panel' }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Unknown error');
    await loadTicketPanelsList(selectedGuildId);
    openTicketPanelEditor(result.panel.id);
  } catch (err) {
    alert('Could not create panel: ' + err.message);
  }
}

// ─── PANEL EDITOR ─────────────────────────────────────────────────────────────

async function openTicketPanelEditor(panelId) {
  ticketCurrentPanelId = panelId;
  showTicketPanelEditorView();
  document.getElementById('ticket-types-container').innerHTML = '';
  document.getElementById('ticket-commands-toggles').innerHTML = '<p style="font-family:var(--font-mono);font-size:0.65rem;color:var(--grey)">Loading...</p>';
  ticketTypePickers = {};

  try {
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(`${RAILWAY_BOT_URL}/api/tickets/panel?panelId=${panelId}&guildId=${selectedGuildId}`, {
      headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not load panel');

    const panel = data.panel;
    document.getElementById('ticket-panel-name').value = panel.name || '';
    channelPickers['ticket-channel-picker'].setChannels(guildChannelCache, panel.publish_channel_id || null);
    channelPickers['ticket-transcript-channel-picker'].setChannels(guildChannelCache, panel.transcript_channel_id || null);

    ticketManagerRoleIds = Array.isArray(panel.manager_role_ids) ? [...panel.manager_role_ids] : [];
    renderTicketManagerRoleChips();
    document.getElementById('ticket-manager-roles-picker').style.display = 'none';
    renderTicketRolePickerOptions();

    const embed = panel.panel_embed || {};
    document.getElementById('ticket-panel-embed-title').value = embed.title || '';
    document.getElementById('ticket-panel-embed-desc').value = embed.description || '';
    document.getElementById('ticket-panel-embed-color').value = embed.color || '#00f0ff';
    document.getElementById('ticket-panel-embed-image').value = embed.image_url || '';

    setTicketPanelMode(panel.mode === 'dropdown' ? 'dropdown' : 'buttons');

    (data.types || []).forEach(t => addTicketType(t));

    document.getElementById('ticket-transcript-enabled').checked = !!panel.transcript_enabled;
    document.getElementById('ticket-transcript-dm').checked = !!panel.transcript_dm_opener;

    renderTicketCommandToggles(panel);
  } catch (err) {
    const e = document.getElementById('ticket-error');
    e.textContent = '// Error loading panel: ' + err.message;
    e.style.display = 'block';
    setTimeout(() => e.style.display = 'none', 5000);
  }
}

function setTicketPanelMode(mode) {
  ticketCurrentMode = mode;
  const bBtn = document.getElementById('ticket-mode-buttons-btn');
  const dBtn = document.getElementById('ticket-mode-dropdown-btn');
  bBtn.style.background = mode === 'buttons' ? 'var(--cyan)' : '';
  bBtn.style.color = mode === 'buttons' ? '#000' : '';
  dBtn.style.background = mode === 'dropdown' ? 'var(--cyan)' : '';
  dBtn.style.color = mode === 'dropdown' ? '#000' : '';
}

function renderTicketCommandToggles(panel) {
  const container = document.getElementById('ticket-commands-toggles');
  container.innerHTML = '';
  const commands = [
    { key: 'cmdClaimEnabled', dbKey: 'cmd_claim_enabled', name: '/ticket-claim', desc: 'Claim a ticket.' },
    { key: 'cmdCloseEnabled', dbKey: 'cmd_close_enabled', name: '/ticket-close', desc: 'Close a ticket.' },
    { key: 'cmdDeleteEnabled', dbKey: 'cmd_delete_enabled', name: '/ticket-delete', desc: 'Delete a ticket.' },
    { key: 'cmdReopenEnabled', dbKey: 'cmd_reopen_enabled', name: '/ticket-reopen', desc: 'Reopen a closed ticket.' },
  ];
  commands.forEach(cmd => {
    const row = document.createElement('label');
    row.style = 'display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(0,240,255,0.04);border:1px solid rgba(0,240,255,0.1);border-radius:6px;margin-bottom:8px;cursor:pointer';
    row.innerHTML = `<input type="checkbox" id="ticket-${cmd.key}" ${panel[cmd.dbKey] !== false ? 'checked' : ''}>` +
      `<span><span style="font-weight:600;font-size:0.8rem">${cmd.name}</span><br><span style="font-family:var(--font-mono);font-size:0.6rem;color:var(--grey)">${cmd.desc}</span></span>`;
    container.appendChild(row);
  });
}

// ─── MANAGER ROLES (multi-select) ────────────────────────────────────────────

function toggleTicketRolePicker() {
  const picker = document.getElementById('ticket-manager-roles-picker');
  picker.style.display = picker.style.display === 'none' ? '' : 'none';
  if (picker.style.display !== 'none') renderTicketRolePickerOptions();
}

function renderTicketRolePickerOptions() {
  const picker = document.getElementById('ticket-manager-roles-picker');
  picker.innerHTML = '';
  (guildRoleCache || []).forEach(role => {
    const row = document.createElement('label');
    row.style = 'display:flex;align-items:center;gap:8px;padding:6px 4px;cursor:pointer;font-family:var(--font-mono);font-size:0.7rem';
    const checked = ticketManagerRoleIds.includes(role.id);
    row.innerHTML = `<input type="checkbox" ${checked ? 'checked' : ''} data-role-id="${role.id}"> ${role.name}`;
    row.querySelector('input').onchange = (e) => {
      if (e.target.checked) {
        if (ticketManagerRoleIds.length >= 10) { e.target.checked = false; return; }
        ticketManagerRoleIds.push(role.id);
      } else {
        ticketManagerRoleIds = ticketManagerRoleIds.filter(id => id !== role.id);
      }
      renderTicketManagerRoleChips();
    };
    picker.appendChild(row);
  });
}

function renderTicketManagerRoleChips() {
  const container = document.getElementById('ticket-manager-roles-chips');
  container.innerHTML = '';
  document.getElementById('ticket-manager-role-count').textContent = `(${ticketManagerRoleIds.length}/10)`;
  ticketManagerRoleIds.forEach(roleId => {
    const role = (guildRoleCache || []).find(r => r.id === roleId);
    const chip = document.createElement('span');
    chip.style = 'display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:rgba(0,240,255,0.12);border:1px solid rgba(0,240,255,0.3);border-radius:12px;font-family:var(--font-mono);font-size:0.65rem';
    chip.innerHTML = `${role ? role.name : roleId} <span style="cursor:pointer;color:var(--pink)">✕</span>`;
    chip.querySelector('span').onclick = () => {
      ticketManagerRoleIds = ticketManagerRoleIds.filter(id => id !== roleId);
      renderTicketManagerRoleChips();
      renderTicketRolePickerOptions();
    };
    container.appendChild(chip);
  });
}

// ─── TICKET TYPES (buttons / dropdown options, each with 3 category routes) ─

function addTicketType(existing) {
  const rowId = 'tk-type-' + (ticketTypeCounter++);
  const row = document.createElement('div');
  row.id = rowId;
  row.style = 'padding:14px;background:rgba(0,240,255,0.04);border:1px solid rgba(0,240,255,0.1);border-radius:6px;margin-bottom:12px';

  const topLine = document.createElement('div');
  topLine.style = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px';

  const labelInput = document.createElement('input');
  labelInput.className = 'cyber-input';
  labelInput.placeholder = 'Label (e.g. Open ticket)';
  labelInput.id = rowId + '-label';
  labelInput.maxLength = 80;
  labelInput.style = 'flex:1;min-width:160px';
  labelInput.value = existing?.label || '';
  topLine.appendChild(labelInput);

  const emojiInput = document.createElement('input');
  emojiInput.className = 'cyber-input';
  emojiInput.placeholder = 'Emoji';
  emojiInput.id = rowId + '-emoji';
  emojiInput.style = 'width:70px';
  emojiInput.value = existing?.emoji || '';
  topLine.appendChild(emojiInput);

  const styleSelect = document.createElement('select');
  styleSelect.className = 'cyber-input';
  styleSelect.id = rowId + '-style';
  styleSelect.style = 'width:100px';
  ['blurple', 'grey', 'green', 'red'].forEach(styleName => {
    const opt = document.createElement('option');
    opt.value = styleName;
    opt.textContent = styleName;
    if ((existing?.button_style || 'blurple') === styleName) opt.selected = true;
    styleSelect.appendChild(opt);
  });
  topLine.appendChild(styleSelect);

  const removeBtn = document.createElement('button');
  removeBtn.textContent = '✕';
  removeBtn.title = 'Remove this ticket type';
  removeBtn.style = 'background:var(--pink);color:#fff;border:none;border-radius:4px;width:30px;height:34px;cursor:pointer;flex-shrink:0';
  removeBtn.onclick = () => { row.remove(); delete ticketTypePickers[rowId]; };
  topLine.appendChild(removeBtn);

  row.appendChild(topLine);

  // Category routing — the actual MEE6 mechanic: a real channel is created
  // under "create", then physically moved to "claimed"/"closed" as the
  // ticket's state changes.
  const catGrid = document.createElement('div');
  catGrid.style = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:10px';

  const catFields = [
    { key: 'create', label: 'Category: ticket created' },
    { key: 'claimed', label: 'Category: claimed' },
    { key: 'closed', label: 'Category: closed' },
  ];
  ticketTypePickers[rowId] = {};
  catFields.forEach(f => {
    const wrap = document.createElement('div');
    const lbl = document.createElement('p');
    lbl.textContent = f.label;
    lbl.style = 'font-family:var(--font-mono);font-size:0.6rem;color:var(--grey);margin-bottom:4px';
    const mount = document.createElement('div');
    mount.id = rowId + '-cat-' + f.key;
    wrap.appendChild(lbl);
    wrap.appendChild(mount);
    catGrid.appendChild(wrap);
  });
  row.appendChild(catGrid);

  const questionsHint = document.createElement('p');
  questionsHint.textContent = 'Optional popup questions when someone opens this ticket type (leave blank to skip):';
  questionsHint.style = 'font-family:var(--font-mono);font-size:0.6rem;color:var(--grey);margin-bottom:6px';
  row.appendChild(questionsHint);

  const existingQuestions = Array.isArray(existing?.modal_questions) ? existing.modal_questions : [];
  for (let i = 0; i < 3; i++) {
    const qInput = document.createElement('input');
    qInput.className = 'cyber-input';
    qInput.placeholder = `Question ${i + 1} (optional)`;
    qInput.id = rowId + '-q' + i;
    qInput.maxLength = 200;
    qInput.style = 'margin-bottom:6px';
    qInput.value = existingQuestions[i]?.label || '';
    row.appendChild(qInput);
  }

  document.getElementById('ticket-types-container').appendChild(row);

  // Mount the 3 category pickers now that their containers exist in the DOM.
  catFields.forEach(f => {
    const cd = new CyberDropdown(rowId + '-cat-' + f.key);
    const savedId = existing ? existing[f.key + '_category_id'] : null;
    cd.setChannels(guildChannelCache, savedId || null, [4]);
    ticketTypePickers[rowId][f.key] = cd;
  });
}

// ─── SAVE / PUBLISH / DELETE ──────────────────────────────────────────────────

function collectTicketTypesFromForm() {
  const rows = document.querySelectorAll('#ticket-types-container > div');
  const types = [];
  rows.forEach(row => {
    const label = document.getElementById(row.id + '-label')?.value?.trim();
    if (!label) return;
    const modalQuestions = [0, 1, 2]
      .map(i => document.getElementById(row.id + '-q' + i)?.value?.trim())
      .filter(Boolean)
      .map(q => ({ label: q, style: 'paragraph', required: true }));
    const pickers = ticketTypePickers[row.id] || {};
    types.push({
      label,
      emoji: document.getElementById(row.id + '-emoji')?.value || null,
      buttonStyle: document.getElementById(row.id + '-style')?.value || 'blurple',
      createCategoryId: pickers.create?.getValue() || null,
      claimedCategoryId: pickers.claimed?.getValue() || null,
      closedCategoryId: pickers.closed?.getValue() || null,
      modalQuestions,
    });
  });
  return types;
}

async function saveTicketPanel(publish) {
  if (!selectedGuildId || !ticketCurrentPanelId) return;

  const publishChannelId = channelPickers['ticket-channel-picker'].getValue() || null;
  const transcriptChannelId = channelPickers['ticket-transcript-channel-picker'].getValue() || null;
  const types = collectTicketTypesFromForm();

  if (publish) {
    if (!publishChannelId) return showTicketError('Pick a publish channel before publishing.');
    if (types.length === 0) return showTicketError('Add at least one ticket type before publishing.');
  }

  const payload = {
    panelId: ticketCurrentPanelId,
    guildId: selectedGuildId,
    name: document.getElementById('ticket-panel-name').value?.trim() || 'New ticketing panel',
    publishChannelId,
    managerRoleIds: ticketManagerRoleIds,
    panelEmbed: {
      title: document.getElementById('ticket-panel-embed-title').value || null,
      description: document.getElementById('ticket-panel-embed-desc').value || null,
      color: document.getElementById('ticket-panel-embed-color').value || '#00f0ff',
      image_url: document.getElementById('ticket-panel-embed-image').value || null,
    },
    mode: ticketCurrentMode,
    transcriptEnabled: document.getElementById('ticket-transcript-enabled').checked,
    transcriptChannelId,
    transcriptDmOpener: document.getElementById('ticket-transcript-dm').checked,
    cmdClaimEnabled: document.getElementById('ticket-cmdClaimEnabled')?.checked !== false,
    cmdCloseEnabled: document.getElementById('ticket-cmdCloseEnabled')?.checked !== false,
    cmdDeleteEnabled: document.getElementById('ticket-cmdDeleteEnabled')?.checked !== false,
    cmdReopenEnabled: document.getElementById('ticket-cmdReopenEnabled')?.checked !== false,
    types,
  };

  try {
    const { data: { session } } = await sb.auth.getSession();
    const saveRes = await fetch(`${RAILWAY_BOT_URL}/api/tickets/panel/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify(payload),
    });
    const saveResult = await saveRes.json();
    if (!saveRes.ok) throw new Error(saveResult.error || 'Unknown error');

    if (publish) {
      const pubRes = await fetch(`${RAILWAY_BOT_URL}/api/tickets/panel/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ panelId: ticketCurrentPanelId, guildId: selectedGuildId }),
      });
      const pubResult = await pubRes.json();
      if (!pubRes.ok) throw new Error(pubResult.error || 'Could not publish');
    }

    showSaved('ticket-saved');
    setStatus('status-tickets', true);
    await loadTicketPanelsList(selectedGuildId);
  } catch (err) {
    showTicketError(err.message);
  }
}

function showTicketError(msg) {
  const e = document.getElementById('ticket-error');
  e.textContent = '// Error: ' + msg;
  e.style.display = 'block';
  setTimeout(() => e.style.display = 'none', 5000);
}

async function deleteTicketPanel() {
  if (!ticketCurrentPanelId) return;
  if (!confirm('Delete this panel? This also removes its live message in Discord. Existing open tickets are not affected.')) return;

  try {
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(`${RAILWAY_BOT_URL}/api/tickets/panel/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({ panelId: ticketCurrentPanelId, guildId: selectedGuildId }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Unknown error');
    showTicketPanelList();
    await loadTicketPanelsList(selectedGuildId);
  } catch (err) {
    alert('Could not delete panel: ' + err.message);
  }
}