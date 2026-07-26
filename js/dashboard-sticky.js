// ─── STICKY MESSAGES ──────────────────────────────────────────────────────────
  const STICKY_VARIABLES = [
    '{user}', '{user.mention}', '{user.name}', '{user.avatar}',
    '{server}', '{server.name}', '{server.icon}', '{membercount}',
    '{channel}', '{channel.name}', '{channel.mention}',
    '{date}', '{time}', '{random:option1|option2|option3}',
  ];
  let stickyLastFocusedField = null;
  let stickyEditorMode = 'message'; // 'message' | 'template'
  let stickyEditingChannelId = null; // null = creating a new sticky
  let stickyEditingTemplateId = null; // null = creating a new template
  let stickyListCache = [];
  let stickyTemplatesCache = [];

  function showStickySubtab(name) {
    document.getElementById('sticky-subtab-messages').style.display = name === 'messages' ? '' : 'none';
    document.getElementById('sticky-subtab-templates').style.display = name === 'templates' ? '' : 'none';
    document.getElementById('sticky-subtab-btn-messages').classList.toggle('active', name === 'messages');
    document.getElementById('sticky-subtab-btn-templates').classList.toggle('active', name === 'templates');
    document.getElementById('sticky-editor').style.display = 'none';
  }

  function initStickyVarButtons() {
    const container = document.getElementById('sticky-var-buttons');
    if (!container || container.childElementCount > 0) return;
    STICKY_VARIABLES.forEach(v => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = v;
      btn.className = 'btn-secondary';
      btn.style = 'font-size:0.55rem;padding:5px 8px;text-transform:none;letter-spacing:0';
      btn.onclick = () => {
        const field = stickyLastFocusedField || document.getElementById('sticky-description');
        const start = field.selectionStart ?? field.value.length;
        const end = field.selectionEnd ?? field.value.length;
        field.value = field.value.slice(0, start) + v + field.value.slice(end);
        field.focus();
        field.selectionStart = field.selectionEnd = start + v.length;
        updateStickyPreview();
      };
      container.appendChild(btn);
    });

    document.querySelectorAll('.sticky-field').forEach(el => {
      el.addEventListener('focus', () => { stickyLastFocusedField = el; });
      el.addEventListener('input', updateStickyPreview);
    });
    document.getElementById('sticky-banner-style').addEventListener('change', () => {
      const isNone = document.getElementById('sticky-banner-style').value === 'none';
      document.getElementById('sticky-image-url-wrap').style.display = isNone ? '' : 'none';
      updateStickyPreview();
    });
  }

  // Client-side preview only — sample values, not the real server-side resolver.
  function resolveStickyPreviewText(text) {
    if (!text) return '';
    const pickedChannelId = channelPickers['sticky-channel-picker']?.getValue();
    const channelName = guildChannelCache.find(c => c.id === pickedChannelId)?.name || 'general';
    const serverName = userGuilds.find(g => g.id === selectedGuildId)?.name || 'Your Server';
    let out = text.replace(/\{random:([^}]+)\}/g, (_, list) => list.split('|')[0].trim());
    const map = {
      '{user}': 'YourName', '{user.mention}': '@YourName', '{user.name}': 'YourName', '{user.avatar}': '',
      '{server}': serverName, '{server.name}': serverName, '{server.icon}': '', '{membercount}': '1,204',
      '{channel}': '#' + channelName, '{channel.name}': channelName, '{channel.mention}': '#' + channelName,
      '{date}': new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      '{time}': new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };
    for (const [token, val] of Object.entries(map)) out = out.split(token).join(val);
    return out;
  }

  function updateStickyPreview() {
    const msgText = resolveStickyPreviewText(document.getElementById('sticky-message-text').value);
    const title = resolveStickyPreviewText(document.getElementById('sticky-title').value);
    const desc = resolveStickyPreviewText(document.getElementById('sticky-description').value);
    const subtitle = resolveStickyPreviewText(document.getElementById('sticky-embed-subtitle').value);
    const color = document.getElementById('sticky-color').value || '#00f0ff';
    const bannerStyle = document.getElementById('sticky-banner-style').value;
    const imageUrl = document.getElementById('sticky-image-url').value;

    document.getElementById('sticky-preview-msgtext').textContent = msgText;
    document.getElementById('sticky-preview-title').textContent = title;
    document.getElementById('sticky-preview-desc').textContent = desc;
    document.getElementById('sticky-preview-subtitle').textContent = subtitle;
    document.getElementById('sticky-preview-embed').style.borderLeftColor = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#00f0ff';

    const img = document.getElementById('sticky-preview-image');
    if (bannerStyle !== 'none') {
      const grad = bannerStyle === 'sunset' ? 'linear-gradient(180deg,#3a0d3f,#7a1f4d,#150422)' : bannerStyle === 'purple' ? 'linear-gradient(135deg,#0a0510,#2a0a3f)' : 'linear-gradient(135deg,#050810,#0a2530)';
      img.style.display = 'flex';
      img.removeAttribute('src');
      img.style.background = grad;
      img.style.height = '90px';
      img.style.alignItems = 'center';
      img.style.justifyContent = 'center';
      img.style.color = '#fff';
      img.style.fontWeight = '900';
      img.style.fontFamily = 'Orbitron, sans-serif';
      img.alt = (title || subtitle || 'ANNOUNCEMENT').toUpperCase();
      img.textContent = img.alt;
    } else if (imageUrl) {
      img.style.display = 'block';
      img.src = imageUrl;
      img.style.background = 'none';
      img.textContent = '';
    } else {
      img.style.display = 'none';
    }
  }

  function clearStickyEditorFields() {
    ['sticky-title', 'sticky-description', 'sticky-embed-subtitle', 'sticky-message-text', 'sticky-image-url', 'sticky-color', 'sticky-template-name'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('sticky-banner-style').value = 'none';
    document.getElementById('sticky-enabled').checked = true;
    document.getElementById('sticky-expires').value = '';
    document.getElementById('sticky-image-url-wrap').style.display = '';
  }

  function showStickyEditor(mode, heading) {
    stickyEditorMode = mode;
    document.getElementById('sticky-editor-heading').textContent = heading;
    document.getElementById('sticky-message-only-fields').style.display = mode === 'message' ? '' : 'none';
    document.getElementById('sticky-template-only-fields').style.display = mode === 'template' ? '' : 'none';
    document.getElementById('sticky-enabled-wrap').style.display = mode === 'message' ? '' : 'none';
    document.getElementById('sticky-save-as-template-wrap').style.display = mode === 'message' ? '' : 'none';
    document.getElementById('sticky-editor').style.display = '';
    initStickyVarButtons();
    updateStickyPreview();
    document.getElementById('sticky-editor').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function cancelStickyEditor() {
    document.getElementById('sticky-editor').style.display = 'none';
  }

  // ── Messages: table + create/edit ──────────────────────────────────────────
  function stickyExpiresLabel(expiresAt) {
    if (!expiresAt) return 'Never';
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 'Expired';
    const hours = Math.round(diffMs / 3600000);
    return hours < 1 ? '<1h' : hours === 1 ? '1 hour' : hours < 24 ? `${hours} hours` : `${Math.round(hours / 24)}d`;
  }

  function renderStickyTable() {
    const channelFilter = (document.getElementById('sticky-filter-channel')?.value || '').toLowerCase();
    const contentFilter = (document.getElementById('sticky-filter-content')?.value || '').toLowerCase();
    const tbody = document.getElementById('sticky-table-body');

    const rows = stickyListCache.filter(s => {
      const channelName = (guildChannelCache.find(c => c.id === s.channel_id)?.name || '').toLowerCase();
      const content = `${s.title || ''} ${s.description || ''}`.toLowerCase();
      return channelName.includes(channelFilter) && content.includes(contentFilter);
    });

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="padding:16px;text-align:center;color:var(--grey)">No sticky messages yet.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    rows.forEach(s => {
      const channelName = guildChannelCache.find(c => c.id === s.channel_id)?.name || '(deleted channel)';
      const contentSnippet = (s.title || s.description || '').slice(0, 60);
      const tr = document.createElement('tr');
      tr.style = 'border-bottom:1px solid rgba(0,240,255,0.06)';
      tr.innerHTML = `
        <td style="padding:8px;color:var(--white)">#${channelName}${s.enabled ? '' : ' <span style="color:var(--grey)">(disabled)</span>'}</td>
        <td style="padding:8px;color:var(--grey)">${contentSnippet || '<em>(no title/description)</em>'}</td>
        <td style="padding:8px;color:var(--grey)">${stickyExpiresLabel(s.expires_at)}</td>
        <td style="padding:8px"></td>
      `;
      const actionsTd = tr.querySelector('td:last-child');
      const editBtn = document.createElement('button');
      editBtn.className = 'btn-secondary';
      editBtn.textContent = 'Edit';
      editBtn.style = 'font-size:0.6rem;padding:4px 10px;margin-right:6px';
      editBtn.onclick = () => editSticky(s.channel_id);
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-secondary';
      delBtn.textContent = 'Delete';
      delBtn.style = 'font-size:0.6rem;padding:4px 10px;border-color:var(--pink);color:var(--pink)';
      delBtn.onclick = () => deleteStickyByChannel(s.channel_id);
      actionsTd.appendChild(editBtn);
      actionsTd.appendChild(delBtn);
      tbody.appendChild(tr);
    });
  }

  async function fetchStickyList() {
    if (!selectedGuildId) { stickyListCache = []; renderStickyTable(); return; }
    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch(`${RAILWAY_BOT_URL}/api/sticky-list?guildId=${selectedGuildId}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      const data = await res.json();
      stickyListCache = data.stickies || [];
    } catch (err) {
      console.error('fetchStickyList error:', err.message);
      stickyListCache = [];
    }
    renderStickyTable();
  }

  function startNewSticky() {
    stickyEditingChannelId = null;
    clearStickyEditorFields();
    channelPickers['sticky-channel-picker'].setChannels(guildChannelCache, null);
    document.getElementById('sticky-delete-btn').style.display = 'none';
    showStickyEditor('message', '// new sticky message');
  }

  async function editSticky(channelId) {
    stickyEditingChannelId = channelId;
    clearStickyEditorFields();
    channelPickers['sticky-channel-picker'].setChannels(guildChannelCache, channelId);
    const channelName = guildChannelCache.find(c => c.id === channelId)?.name || channelId;
    document.getElementById('sticky-delete-btn').style.display = '';

    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch(`${RAILWAY_BOT_URL}/api/sticky?guildId=${selectedGuildId}&channelId=${channelId}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      const data = await res.json();
      if (data.sticky) {
        document.getElementById('sticky-title').value = data.sticky.title || '';
        document.getElementById('sticky-description').value = data.sticky.description || '';
        document.getElementById('sticky-embed-subtitle').value = data.sticky.embed_subtitle || '';
        document.getElementById('sticky-message-text').value = data.sticky.message_text || '';
        document.getElementById('sticky-image-url').value = data.sticky.image_url || '';
        document.getElementById('sticky-color').value = data.sticky.color || '';
        document.getElementById('sticky-banner-style').value = data.sticky.banner_style || 'none';
        document.getElementById('sticky-enabled').checked = data.sticky.enabled !== false;
        document.getElementById('sticky-image-url-wrap').style.display = (data.sticky.banner_style && data.sticky.banner_style !== 'none') ? 'none' : '';

        if (data.sticky.expires_at) {
          const hoursLeft = (new Date(data.sticky.expires_at).getTime() - Date.now()) / 3600000;
          const closest = [1, 6, 24].find(h => hoursLeft <= h) || 24;
          document.getElementById('sticky-expires').value = String(closest);
        } else {
          document.getElementById('sticky-expires').value = '';
        }
      }
    } catch (err) {
      console.error('editSticky error:', err.message);
    }
    showStickyEditor('message', `// editing sticky in #${channelName}`);
  }

  async function deleteStickyByChannel(channelId) {
    if (!confirm('Delete this sticky message and remove it from the channel?')) return;
    try {
      const { data: { session } } = await sb.auth.getSession();
      await fetch(`${RAILWAY_BOT_URL}/api/sticky/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ guildId: selectedGuildId, channelId }),
      });
      if (stickyEditingChannelId === channelId) cancelStickyEditor();
      await fetchStickyList();
    } catch (err) {
      console.error('deleteStickyByChannel error:', err.message);
    }
  }

  function deleteFromStickyEditor() {
    if (stickyEditorMode === 'message' && stickyEditingChannelId) {
      deleteStickyByChannel(stickyEditingChannelId).then(() => cancelStickyEditor());
    } else if (stickyEditorMode === 'template' && stickyEditingTemplateId) {
      deleteStickyByTemplateId(stickyEditingTemplateId).then(() => cancelStickyEditor());
    }
  }

  // ── Templates: table + create/edit ─────────────────────────────────────────
  function renderStickyTemplateTable() {
    const nameFilter = (document.getElementById('sticky-template-filter-name')?.value || '').toLowerCase();
    const tbody = document.getElementById('sticky-template-table-body');
    const rows = stickyTemplatesCache.filter(t => (t.name || '').toLowerCase().includes(nameFilter));

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="padding:16px;text-align:center;color:var(--grey)">No templates saved yet.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    rows.forEach(t => {
      const contentSnippet = (t.title || t.description || '').slice(0, 60);
      const tr = document.createElement('tr');
      tr.style = 'border-bottom:1px solid rgba(0,240,255,0.06)';
      tr.innerHTML = `
        <td style="padding:8px;color:var(--white)">${t.name}</td>
        <td style="padding:8px;color:var(--grey)">${contentSnippet || '<em>(empty)</em>'}</td>
        <td style="padding:8px"></td>
      `;
      const actionsTd = tr.querySelector('td:last-child');
      const editBtn = document.createElement('button');
      editBtn.className = 'btn-secondary';
      editBtn.textContent = 'Edit';
      editBtn.style = 'font-size:0.6rem;padding:4px 10px;margin-right:6px';
      editBtn.onclick = () => editStickyTemplate(t.id);
      const useBtn = document.createElement('button');
      useBtn.className = 'btn-secondary';
      useBtn.textContent = 'Use for New Message';
      useBtn.style = 'font-size:0.6rem;padding:4px 10px;margin-right:6px';
      useBtn.onclick = () => useTemplateForNewSticky(t.id);
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-secondary';
      delBtn.textContent = 'Delete';
      delBtn.style = 'font-size:0.6rem;padding:4px 10px;border-color:var(--pink);color:var(--pink)';
      delBtn.onclick = () => deleteStickyByTemplateId(t.id);
      actionsTd.appendChild(editBtn);
      actionsTd.appendChild(useBtn);
      actionsTd.appendChild(delBtn);
      tbody.appendChild(tr);
    });
  }

  async function fetchStickyTemplates() {
    if (!selectedGuildId) { stickyTemplatesCache = []; renderStickyTemplateTable(); return; }
    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch(`${RAILWAY_BOT_URL}/api/sticky-templates?guildId=${selectedGuildId}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      const data = await res.json();
      stickyTemplatesCache = data.templates || [];
    } catch (err) {
      console.error('fetchStickyTemplates error:', err.message);
      stickyTemplatesCache = [];
    }
    renderStickyTemplateTable();
  }

  function applyTemplateFieldsToEditor(t) {
    document.getElementById('sticky-title').value = t.title || '';
    document.getElementById('sticky-description').value = t.description || '';
    document.getElementById('sticky-embed-subtitle').value = t.embed_subtitle || '';
    document.getElementById('sticky-message-text').value = t.message_text || '';
    document.getElementById('sticky-image-url').value = t.image_url || '';
    document.getElementById('sticky-color').value = t.color || '';
    document.getElementById('sticky-banner-style').value = t.banner_style || 'none';
    document.getElementById('sticky-image-url-wrap').style.display = (t.banner_style && t.banner_style !== 'none') ? 'none' : '';
  }

  function startNewStickyTemplate() {
    stickyEditingTemplateId = null;
    clearStickyEditorFields();
    document.getElementById('sticky-delete-btn').style.display = 'none';
    showStickyEditor('template', '// new template');
  }

  function editStickyTemplate(templateId) {
    const t = stickyTemplatesCache.find(x => x.id === templateId);
    if (!t) return;
    stickyEditingTemplateId = templateId;
    clearStickyEditorFields();
    applyTemplateFieldsToEditor(t);
    document.getElementById('sticky-template-name').value = t.name;
    document.getElementById('sticky-delete-btn').style.display = '';
    showStickyEditor('template', `// editing template: ${t.name}`);
  }

  // Jumps to the Messages tab with this template's fields pre-filled, ready to pick a channel.
  function useTemplateForNewSticky(templateId) {
    const t = stickyTemplatesCache.find(x => x.id === templateId);
    if (!t) return;
    showStickySubtab('messages');
    stickyEditingChannelId = null;
    clearStickyEditorFields();
    applyTemplateFieldsToEditor(t);
    channelPickers['sticky-channel-picker'].setChannels(guildChannelCache, null);
    document.getElementById('sticky-delete-btn').style.display = 'none';
    showStickyEditor('message', `// new sticky message (from template: ${t.name})`);
  }

  async function deleteStickyByTemplateId(templateId) {
    if (!confirm('Delete this template?')) return;
    try {
      const { data: { session } } = await sb.auth.getSession();
      await fetch(`${RAILWAY_BOT_URL}/api/sticky-templates/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ guildId: selectedGuildId, templateId }),
      });
      await fetchStickyTemplates();
    } catch (err) {
      console.error('deleteStickyByTemplateId error:', err.message);
    }
  }

  // ── Shared save + save-as-template ─────────────────────────────────────────
  async function saveStickyFromEditor() {
    const e = document.getElementById('sticky-error');
    e.style.display = 'none';

    if (stickyEditorMode === 'message') {
      const channelId = channelPickers['sticky-channel-picker'].getValue();
      if (!channelId) { e.textContent = '// Error: Pick a channel first.'; e.style.display = 'block'; return; }
      try {
        const { data: { session } } = await sb.auth.getSession();
        const res = await fetch(`${RAILWAY_BOT_URL}/api/sticky`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
          body: JSON.stringify({
            guildId: selectedGuildId, channelId,
            title: document.getElementById('sticky-title').value,
            description: document.getElementById('sticky-description').value,
            embedSubtitle: document.getElementById('sticky-embed-subtitle').value,
            messageText: document.getElementById('sticky-message-text').value,
            imageUrl: document.getElementById('sticky-image-url').value,
            bannerStyle: document.getElementById('sticky-banner-style').value,
            color: document.getElementById('sticky-color').value,
            enabled: document.getElementById('sticky-enabled').checked,
            expiresInHours: document.getElementById('sticky-expires').value || null,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Unknown error');
        setStatus('status-sticky', true);
        showSaved('sticky-saved');
        await fetchStickyList();
        cancelStickyEditor();
      } catch (err) {
        e.textContent = '// Error: ' + err.message; e.style.display = 'block';
      }
    } else {
      const name = document.getElementById('sticky-template-name').value.trim();
      if (!name) { e.textContent = '// Error: Give this template a name.'; e.style.display = 'block'; return; }
      try {
        const { data: { session } } = await sb.auth.getSession();
        const res = await fetch(`${RAILWAY_BOT_URL}/api/sticky-templates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
          body: JSON.stringify({
            guildId: selectedGuildId, name, templateId: stickyEditingTemplateId,
            title: document.getElementById('sticky-title').value,
            description: document.getElementById('sticky-description').value,
            embedSubtitle: document.getElementById('sticky-embed-subtitle').value,
            messageText: document.getElementById('sticky-message-text').value,
            imageUrl: document.getElementById('sticky-image-url').value,
            bannerStyle: document.getElementById('sticky-banner-style').value,
            color: document.getElementById('sticky-color').value,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Unknown error');
        showSaved('sticky-saved');
        await fetchStickyTemplates();
        cancelStickyEditor();
      } catch (err) {
        e.textContent = '// Error: ' + err.message; e.style.display = 'block';
      }
    }
  }

  // "Save Current As Template" — available while editing a message, without leaving message mode.
  async function saveCurrentEditorAsTemplate() {
    const name = prompt('Name this template (e.g. "Rules Reminder"):');
    if (!name) return;
    try {
      const { data: { session } } = await sb.auth.getSession();
      await fetch(`${RAILWAY_BOT_URL}/api/sticky-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({
          guildId: selectedGuildId, name,
          title: document.getElementById('sticky-title').value,
          description: document.getElementById('sticky-description').value,
          embedSubtitle: document.getElementById('sticky-embed-subtitle').value,
          messageText: document.getElementById('sticky-message-text').value,
          imageUrl: document.getElementById('sticky-image-url').value,
          bannerStyle: document.getElementById('sticky-banner-style').value,
          color: document.getElementById('sticky-color').value,
        }),
      });
      await fetchStickyTemplates();
      showSaved('sticky-saved');
    } catch (err) {
      const e = document.getElementById('sticky-error');
      e.textContent = '// Error: ' + err.message; e.style.display = 'block';
    }
  }