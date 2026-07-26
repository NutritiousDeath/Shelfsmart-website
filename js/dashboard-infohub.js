// ─── SERVER INFO HUB ──────────────────────────────────────────────────────────
  let infohubPanelsCache = [];
  let infohubEditingPanelId = null;

  const INFOHUB_BANNER_OPTIONS = [
    { value: 'none', label: 'No banner' },
    { value: 'cyan', label: 'Impact banner — Cyan (AuraAI brand)' },
    { value: 'purple', label: 'Impact banner — Purple (AuraAI brand)' },
    { value: 'sunset', label: 'Impact banner — Sunset / Retrowave' },
  ];

  function infohubBannerGradient(style) {
    if (style === 'sunset') return 'linear-gradient(180deg,#3a0d3f,#7a1f4d,#150422)';
    if (style === 'purple') return 'linear-gradient(135deg,#0a0510,#2a0a3f)';
    if (style === 'cyan') return 'linear-gradient(135deg,#050810,#0a2530)';
    return 'none';
  }

  function updateInfoHubPreview() {
    const title = document.getElementById('infohub-title').value || 'Untitled';
    const content = document.getElementById('infohub-content').value;
    const color = document.getElementById('infohub-color').value || '#00f0ff';
    const bannerStyle = channelPickers['infohub-banner-style']?.getValue() || 'none';

    const bannerEl = document.getElementById('infohub-preview-banner');
    if (bannerStyle === 'none') {
      bannerEl.style.display = 'none';
    } else {
      bannerEl.style.display = 'flex';
      bannerEl.style.background = infohubBannerGradient(bannerStyle);
      bannerEl.textContent = title.toUpperCase();
    }

    document.getElementById('infohub-preview-content').textContent = content;
    document.getElementById('infohub-preview-embed').style.borderLeftColor = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#00f0ff';
  }

  function clearInfoHubEditorFields() {
    document.getElementById('infohub-title').value = '';
    document.getElementById('infohub-content').value = '';
    document.getElementById('infohub-color').value = '';
    channelPickers['infohub-banner-style']?.setStaticOptions(INFOHUB_BANNER_OPTIONS, 'cyan');
    updateInfoHubPreview();
  }

  function startNewInfoHubPanel() {
    infohubEditingPanelId = null;
    clearInfoHubEditorFields();
    document.getElementById('infohub-editor-heading').textContent = '// new panel';
    document.getElementById('infohub-delete-btn').style.display = 'none';
    document.getElementById('infohub-editor').style.display = '';
    document.getElementById('infohub-editor').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function editInfoHubPanel(panelId) {
    const panel = infohubPanelsCache.find(p => p.id === panelId);
    if (!panel) return;
    infohubEditingPanelId = panelId;
    document.getElementById('infohub-title').value = panel.title || '';
    document.getElementById('infohub-content').value = panel.content || '';
    document.getElementById('infohub-color').value = panel.color || '';
    channelPickers['infohub-banner-style']?.setStaticOptions(INFOHUB_BANNER_OPTIONS, panel.banner_style || 'cyan');
    updateInfoHubPreview();
    document.getElementById('infohub-editor-heading').textContent = `// editing: ${panel.title}`;
    document.getElementById('infohub-delete-btn').style.display = '';
    document.getElementById('infohub-editor').style.display = '';
    document.getElementById('infohub-editor').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function cancelInfoHubPanel() {
    document.getElementById('infohub-editor').style.display = 'none';
  }

  function renderInfoHubTable() {
    const tbody = document.getElementById('infohub-panel-table-body');
    if (infohubPanelsCache.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="padding:16px;text-align:center;color:var(--grey)">No panels yet — add one above.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    infohubPanelsCache.forEach((panel, i) => {
      const tr = document.createElement('tr');
      tr.style = 'border-bottom:1px solid rgba(0,240,255,0.06)';
      tr.innerHTML = `
        <td style="padding:8px;color:var(--grey)">${i + 1}</td>
        <td style="padding:8px;color:var(--white)">${panel.title}</td>
        <td style="padding:8px;color:var(--grey)">${panel.banner_style === 'none' ? '—' : panel.banner_style}</td>
        <td style="padding:8px"></td>
      `;
      const actionsTd = tr.querySelector('td:last-child');

      const upBtn = document.createElement('button');
      upBtn.textContent = '↑'; upBtn.title = 'Move up';
      upBtn.style = 'background:var(--bg-2);color:var(--cyan);border:1px solid rgba(0,240,255,0.2);border-radius:4px;width:26px;height:26px;cursor:pointer;margin-right:4px';
      upBtn.disabled = i === 0;
      if (i === 0) upBtn.style.opacity = '0.3';
      upBtn.onclick = () => moveInfoHubPanel(i, -1);

      const downBtn = document.createElement('button');
      downBtn.textContent = '↓'; downBtn.title = 'Move down';
      downBtn.style = 'background:var(--bg-2);color:var(--cyan);border:1px solid rgba(0,240,255,0.2);border-radius:4px;width:26px;height:26px;cursor:pointer;margin-right:8px';
      downBtn.disabled = i === infohubPanelsCache.length - 1;
      if (i === infohubPanelsCache.length - 1) downBtn.style.opacity = '0.3';
      downBtn.onclick = () => moveInfoHubPanel(i, 1);

      const editBtn = document.createElement('button');
      editBtn.className = 'btn-secondary';
      editBtn.textContent = 'Edit';
      editBtn.style = 'font-size:0.6rem;padding:4px 10px;margin-right:6px';
      editBtn.onclick = () => editInfoHubPanel(panel.id);

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-secondary';
      delBtn.textContent = 'Delete';
      delBtn.style = 'font-size:0.6rem;padding:4px 10px;border-color:var(--pink);color:var(--pink)';
      delBtn.onclick = () => deleteInfoHubPanelById(panel.id);

      actionsTd.appendChild(upBtn);
      actionsTd.appendChild(downBtn);
      actionsTd.appendChild(editBtn);
      actionsTd.appendChild(delBtn);
      tbody.appendChild(tr);
    });
  }

  async function fetchInfoHubPanels() {
    if (!selectedGuildId) { infohubPanelsCache = []; renderInfoHubTable(); return; }
    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch(`${RAILWAY_BOT_URL}/api/info-hub-panels?guildId=${selectedGuildId}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      const data = await res.json();
      infohubPanelsCache = data.panels || [];
    } catch (err) {
      console.error('fetchInfoHubPanels error:', err.message);
      infohubPanelsCache = [];
    }
    renderInfoHubTable();
    setStatus('status-infohub', infohubPanelsCache.length > 0);
  }

  async function moveInfoHubPanel(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= infohubPanelsCache.length) return;
    const reordered = [...infohubPanelsCache];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    infohubPanelsCache = reordered;
    renderInfoHubTable();

    try {
      const { data: { session } } = await sb.auth.getSession();
      await fetch(`${RAILWAY_BOT_URL}/api/info-hub-panels/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ guildId: selectedGuildId, orderedPanelIds: reordered.map(p => p.id) }),
      });
    } catch (err) {
      console.error('moveInfoHubPanel error:', err.message);
    }
  }

  async function saveInfoHubPanel() {
    const e = document.getElementById('infohub-error');
    e.style.display = 'none';
    if (!selectedGuildId) { e.textContent = '// Error: Please select your Discord server first!'; e.style.display = 'block'; return; }
    const title = document.getElementById('infohub-title').value.trim();
    const content = document.getElementById('infohub-content').value.trim();
    if (!title || !content) { e.textContent = '// Error: Title and content are both required.'; e.style.display = 'block'; return; }

    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch(`${RAILWAY_BOT_URL}/api/info-hub-panels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({
          guildId: selectedGuildId,
          panelId: infohubEditingPanelId,
          title,
          bannerStyle: channelPickers['infohub-banner-style'].getValue(),
          content,
          color: document.getElementById('infohub-color').value.trim(),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unknown error');
      showSaved('infohub-saved');
      await fetchInfoHubPanels();
      cancelInfoHubPanel();
    } catch (err) {
      e.textContent = '// Error: ' + err.message; e.style.display = 'block';
    }
  }

  async function deleteInfoHubPanelById(panelId) {
    if (!confirm('Delete this panel? You\'ll need to Publish again afterward to remove it from Discord too.')) return;
    try {
      const { data: { session } } = await sb.auth.getSession();
      await fetch(`${RAILWAY_BOT_URL}/api/info-hub-panels/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ guildId: selectedGuildId, panelId }),
      });
      if (infohubEditingPanelId === panelId) cancelInfoHubPanel();
      await fetchInfoHubPanels();
    } catch (err) {
      console.error('deleteInfoHubPanelById error:', err.message);
    }
  }

  function deleteInfoHubPanelFromEditor() {
    if (infohubEditingPanelId) deleteInfoHubPanelById(infohubEditingPanelId);
  }

  async function publishInfoHub() {
    const resultEl = document.getElementById('infohub-publish-result');
    if (!selectedGuildId) { resultEl.textContent = '⚠ Select a server first.'; return; }
    const channelId = channelPickers['infohub-channel-picker'].getValue();
    if (!channelId) { resultEl.textContent = '⚠ Pick a channel to publish to.'; return; }

    resultEl.textContent = 'Publishing panels — this may take a few seconds...';
    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch(`${RAILWAY_BOT_URL}/api/info-hub/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ guildId: selectedGuildId, channelId }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || 'Unknown error');
      let msg = `✅ Done — ${result.posted} panel(s) posted, ${result.edited} updated in place.`;
      if (result.errors?.length) msg += ` ⚠ ${result.errors.length} failed: ${result.errors.slice(0, 3).join('; ')}`;
      resultEl.textContent = msg;
    } catch (err) {
      resultEl.textContent = '❌ Error: ' + err.message;
    }
  }

  function loadInfoHubSettings(s) {
    const settings = s || {};
    channelPickers['infohub-channel-picker']?.setChannels(guildChannelCache, settings.info_hub_channel_id || null);
    document.getElementById('infohub-editor').style.display = 'none';
    document.getElementById('infohub-publish-result').textContent = '';
    fetchInfoHubPanels();
  }

  ['infohub-title', 'infohub-content', 'infohub-color'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateInfoHubPreview);
  });