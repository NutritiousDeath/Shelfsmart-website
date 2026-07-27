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

    infohubSelectedThemeId = settings.info_hub_theme_id || null;
    document.getElementById('infohub-themed-panels').style.display = 'none';
    document.getElementById('infohub-themed-publish-result').textContent = '';

    if (settings.info_hub_mode === 'themed') {
      showInfoHubSubtab('themed');
      if (infohubSelectedThemeId) selectInfoHubTheme(infohubSelectedThemeId);
    } else {
      showInfoHubSubtab('custom');
    }
  }

  ['infohub-title', 'infohub-content', 'infohub-color'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateInfoHubPreview);
  });

  // ─── SERVER INFO HUB: THEMED MODE ─────────────────────────────────────────────
  // Add a new entry here every time you finish generating a full 7-image set
  // and push it to images/banners/{id}/ in the dashboard repo. Nothing else
  // needs to change — the gallery below checks live whether each theme is
  // actually complete before showing it as selectable.
  const INFO_HUB_THEMES = [
    { id: 'theme1', label: 'Theme 1' },
  ];

  // Kept in sync with STANDARD_PANEL_SLUGS in commands/info-hub.js.
  const INFOHUB_STANDARD_PANELS = [
    { slug: 'welcome', label: 'Welcome' },
    { slug: 'rules', label: 'Rules' },
    { slug: 'links', label: 'Links' },
    { slug: 'mods', label: 'Mods' },
    { slug: 'faq', label: 'FAQ' },
    { slug: 'socials', label: 'Socials' },
    { slug: 'announcements', label: 'Announcements' },
  ];

  const INFOHUB_IMAGE_BASE = 'https://uptight-shelf-smart-flow.com/images/banners';

  let infohubSelectedThemeId = null;
  let infohubThemedContentCache = {}; // slug -> { content, color }

  function showInfoHubSubtab(name) {
    document.getElementById('infohub-subtab-custom').style.display = name === 'custom' ? '' : 'none';
    document.getElementById('infohub-subtab-themed').style.display = name === 'themed' ? '' : 'none';
    document.getElementById('infohub-subtab-btn-custom').classList.toggle('active', name === 'custom');
    document.getElementById('infohub-subtab-btn-themed').classList.toggle('active', name === 'themed');
    if (name === 'themed') renderInfoHubThemeGallery();
  }

  // Same-origin check (dashboard and theme images both live on
  // uptight-shelf-smart-flow.com) — no CORS issue, just a plain HEAD request.
  function checkImageExists(url) {
    // A real <img> load, with a cache-busting query param, instead of
    // fetch(HEAD). Browsers can be surprisingly persistent about caching a
    // failed fetch() response even across a hard page refresh — this
    // guarantees a genuinely fresh check every single time, not a
    // potentially stale "this 404'd before" result from a moment ago.
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = `${url}?_check=${Date.now()}`;
    });
  }

  async function checkThemeCompleteness(themeId) {
    const checks = await Promise.all(
      INFOHUB_STANDARD_PANELS.map(p => checkImageExists(`${INFOHUB_IMAGE_BASE}/${themeId}/${p.slug}.png`))
    );
    return checks.every(ok => ok);
  }

  async function renderInfoHubThemeGallery() {
    const gallery = document.getElementById('infohub-theme-gallery');
    gallery.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.65rem;color:var(--grey)">Checking available themes...</p>';

    const completeness = await Promise.all(INFO_HUB_THEMES.map(t => checkThemeCompleteness(t.id)));
    const completeThemes = INFO_HUB_THEMES.filter((t, i) => completeness[i]);

    if (completeThemes.length === 0) {
      gallery.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.65rem;color:var(--grey)">No complete themes yet — a theme only appears here once all 7 of its images exist at images/banners/{theme}/ in your dashboard repo.</p>';
      return;
    }

    gallery.innerHTML = '';
    completeThemes.forEach(theme => {
      const tile = document.createElement('div');
      tile.style = `cursor:pointer;border:2px solid ${theme.id === infohubSelectedThemeId ? 'var(--cyan)' : 'rgba(0,240,255,0.15)'};border-radius:6px;overflow:hidden;transition:border-color 0.2s`;
      tile.innerHTML = `
        <div style="height:70px;background:#050810;background-image:url('${INFOHUB_IMAGE_BASE}/${theme.id}/welcome.png');background-size:cover;background-position:center"></div>
        <p style="font-family:var(--font-mono);font-size:0.65rem;color:var(--white);text-align:center;padding:6px 4px">${theme.label}</p>
      `;
      tile.onclick = () => selectInfoHubTheme(theme.id);
      gallery.appendChild(tile);
    });
  }

  async function selectInfoHubTheme(themeId) {
    infohubSelectedThemeId = themeId;
    renderInfoHubThemeGallery(); // refresh to show the new selection border
    document.getElementById('infohub-themed-heading').textContent = `// ${INFO_HUB_THEMES.find(t => t.id === themeId)?.label || themeId} — panel content`;
    document.getElementById('infohub-themed-panels').style.display = '';
    await fetchThemedInfoHubContent();
    renderThemedPanelList();
  }

  async function fetchThemedInfoHubContent() {
    if (!selectedGuildId) { infohubThemedContentCache = {}; return; }
    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch(`${RAILWAY_BOT_URL}/api/info-hub-themed-content?guildId=${selectedGuildId}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      const data = await res.json();
      infohubThemedContentCache = {};
      (data.content || []).forEach(row => { infohubThemedContentCache[row.panel_slug] = row; });
    } catch (err) {
      console.error('fetchThemedInfoHubContent error:', err.message);
      infohubThemedContentCache = {};
    }
  }

  function renderThemedPanelList() {
    const container = document.getElementById('infohub-themed-panel-list');
    container.innerHTML = '';
    INFOHUB_STANDARD_PANELS.forEach(p => {
      const existing = infohubThemedContentCache[p.slug];
      const row = document.createElement('div');
      row.style = 'display:flex;gap:14px;padding:12px;background:rgba(0,240,255,0.03);border:1px solid rgba(0,240,255,0.1);border-radius:6px;margin-bottom:10px;flex-wrap:wrap';
      row.innerHTML = `
        <img src="${INFOHUB_IMAGE_BASE}/${infohubSelectedThemeId}/${p.slug}.png" style="width:120px;height:34px;object-fit:cover;border-radius:4px;flex-shrink:0" alt="${p.label}">
        <div style="flex:1;min-width:200px">
          <p style="font-family:var(--font-display);font-size:0.7rem;color:var(--cyan);margin-bottom:6px">${p.label}</p>
          <textarea class="cyber-input infohub-themed-content-field" data-slug="${p.slug}" rows="2" placeholder="Content for ${p.label}...">${existing?.content || ''}</textarea>
        </div>
        <input class="cyber-input infohub-themed-color-field" data-slug="${p.slug}" type="text" placeholder="#00f0ff" value="${existing?.color || ''}" style="width:100px;flex-shrink:0">
      `;
      container.appendChild(row);
    });
  }

  async function saveThemedInfoHubContent() {
    const e = document.getElementById('infohub-themed-error');
    e.style.display = 'none';
    if (!selectedGuildId) { e.textContent = '// Error: Please select your Discord server first!'; e.style.display = 'block'; return; }
    if (!infohubSelectedThemeId) { e.textContent = '// Error: Pick a theme first.'; e.style.display = 'block'; return; }

    try {
      const { data: { session } } = await sb.auth.getSession();
      const contentFields = document.querySelectorAll('.infohub-themed-content-field');
      for (const field of contentFields) {
        const slug = field.dataset.slug;
        const colorField = document.querySelector(`.infohub-themed-color-field[data-slug="${slug}"]`);
        await fetch(`${RAILWAY_BOT_URL}/api/info-hub-themed-content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
          body: JSON.stringify({ guildId: selectedGuildId, panelSlug: slug, content: field.value, color: colorField?.value || null }),
        });
      }
      showSaved('infohub-themed-saved');
      setStatus('status-infohub', true);
    } catch (err) {
      e.textContent = '// Error: ' + err.message; e.style.display = 'block';
    }
  }

  async function publishThemedInfoHubAction() {
    const resultEl = document.getElementById('infohub-themed-publish-result');
    if (!selectedGuildId) { resultEl.textContent = '⚠ Select a server first.'; return; }
    if (!infohubSelectedThemeId) { resultEl.textContent = '⚠ Pick a theme first.'; return; }
    const channelId = channelPickers['infohub-channel-picker'].getValue();
    if (!channelId) { resultEl.textContent = '⚠ Pick a channel to publish to.'; return; }

    resultEl.textContent = 'Publishing themed panels — this may take a few seconds...';
    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch(`${RAILWAY_BOT_URL}/api/info-hub/publish-themed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ guildId: selectedGuildId, channelId, themeId: infohubSelectedThemeId }),
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