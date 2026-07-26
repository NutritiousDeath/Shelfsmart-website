// ─── REACTION ROLES BUILDER ──────────────────────────────────────────────────
  let rrOptionCounter = 0;

  function addReactionRoleOption(existing) {
    const rowId = 'rr-opt-' + (rrOptionCounter++);
    const row = document.createElement('div');
    row.id = rowId;
    row.style = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;padding:10px;background:rgba(0,240,255,0.04);border:1px solid rgba(0,240,255,0.1);border-radius:6px;flex-wrap:wrap';

    const pickerMount = document.createElement('div');
    pickerMount.id = rowId + '-role-picker';
    pickerMount.style = 'flex:1;min-width:160px';
    row.appendChild(pickerMount);

    const labelInput = document.createElement('input');
    labelInput.className = 'cyber-input';
    labelInput.placeholder = 'Button label';
    labelInput.id = rowId + '-label';
    labelInput.maxLength = 80;
    labelInput.style = 'width:140px';
    labelInput.value = existing?.label || '';
    row.appendChild(labelInput);

    const emojiInput = document.createElement('input');
    emojiInput.className = 'cyber-input';
    emojiInput.placeholder = 'Emoji';
    emojiInput.id = rowId + '-emoji';
    emojiInput.style = 'width:70px';
    emojiInput.value = existing?.emoji || '';
    row.appendChild(emojiInput);

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
    row.appendChild(styleSelect);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✕';
    removeBtn.title = 'Remove this role button';
    removeBtn.style = 'background:var(--pink);color:#fff;border:none;border-radius:4px;width:30px;height:34px;cursor:pointer;flex-shrink:0';
    removeBtn.onclick = () => { delete channelPickers[rowId + '-role-picker']; row.remove(); };
    row.appendChild(removeBtn);

    document.getElementById('rr-options-container').appendChild(row);

    const picker = new CyberDropdown(rowId + '-role-picker', null);
    channelPickers[rowId + '-role-picker'] = picker;
    _populateRolePicker(rowId + '-role-picker', existing?.role_id || null);
  }

  function clearReactionRoleForm() {
    document.getElementById('rr-options-container').innerHTML = '';
    Object.keys(channelPickers).forEach(k => { if (k.startsWith('rr-opt-')) delete channelPickers[k]; });
    ['rr-title', 'rr-description', 'rr-embed-subtitle', 'rr-message-text', 'rr-image-url'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  async function loadReactionRoleMenu(guildId) {
    clearReactionRoleForm();
    channelPickers['rr-channel-picker'].setChannels(guildChannelCache, null);

    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch(`${RAILWAY_BOT_URL}/api/reaction-roles?guildId=${guildId}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      if (!res.ok) { setStatus('status-reactionroles', false); return; }
      const data = await res.json();

      if (!data.menu) { setStatus('status-reactionroles', false); return; }

      channelPickers['rr-channel-picker'].setChannels(guildChannelCache, data.menu.channel_id);
      setChannelHint('rr-channel-current', data.menu.channel_id);
      document.getElementById('rr-title').value = data.menu.title || '';
      document.getElementById('rr-description').value = data.menu.description || '';
      document.getElementById('rr-embed-subtitle').value = data.menu.embed_subtitle || '';
      document.getElementById('rr-message-text').value = data.menu.message_text || '';
      document.getElementById('rr-image-url').value = data.menu.image_url || '';
      (data.options || []).forEach(opt => addReactionRoleOption(opt));
      setStatus('status-reactionroles', true);
    } catch (err) {
      console.error('loadReactionRoleMenu error:', err.message);
      setStatus('status-reactionroles', false);
    }
  }

  async function postReactionRoleMenu() {
    if (!selectedGuildId) {
      const e = document.getElementById('rr-error');
      e.textContent = '// Error: Please select your Discord server first!';
      e.style.display = 'block';
      setTimeout(() => e.style.display = 'none', 4000);
      return;
    }

    const channelId = channelPickers['rr-channel-picker'].getValue() || null;
    if (!channelId) {
      const e = document.getElementById('rr-error');
      e.textContent = '// Error: Pick a channel to post in.';
      e.style.display = 'block';
      setTimeout(() => e.style.display = 'none', 4000);
      return;
    }

    const rows = document.querySelectorAll('#rr-options-container > div');
    const options = [];
    rows.forEach(row => {
      const roleId = channelPickers[row.id + '-role-picker']?.getValue();
      if (!roleId) return;
      options.push({
        roleId,
        label: document.getElementById(row.id + '-label')?.value || 'Role',
        emoji: document.getElementById(row.id + '-emoji')?.value || null,
        buttonStyle: document.getElementById(row.id + '-style')?.value || 'blurple',
      });
    });

    if (options.length === 0) {
      const e = document.getElementById('rr-error');
      e.textContent = '// Error: Add at least one role button with a role selected.';
      e.style.display = 'block';
      setTimeout(() => e.style.display = 'none', 4000);
      return;
    }

    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch(`${RAILWAY_BOT_URL}/api/reaction-roles/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({
          guildId: selectedGuildId,
          channelId,
          title: document.getElementById('rr-title').value,
          description: document.getElementById('rr-description').value,
          embedSubtitle: document.getElementById('rr-embed-subtitle').value,
          messageText: document.getElementById('rr-message-text').value,
          imageUrl: document.getElementById('rr-image-url').value,
          options,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unknown error');
      setChannelHint('rr-channel-current', channelId);
      setStatus('status-reactionroles', true);
      showSaved('rr-saved');
    } catch (err) {
      const e = document.getElementById('rr-error');
      e.textContent = '// Error: ' + err.message;
      e.style.display = 'block';
      setTimeout(() => e.style.display = 'none', 6000);
    }
  }

  // Fetch channels from the bot endpoint and populate all pickers