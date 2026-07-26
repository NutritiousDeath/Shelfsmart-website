// ─── MOD LOG SETTINGS ─────────────────────────────────────────────────────────
  const MODLOG_CHECKBOX_TO_FIELD = {
    'modlog-ban': 'ban', 'modlog-warn': 'warn', 'modlog-message': 'message',
    'modlog-purge': 'purge', 'modlog-role': 'role', 'modlog-voice': 'voice',
    'modlog-invite': 'invite', 'modlog-automod': 'automod',
  };

  function loadModLogSettings(s) {
    const settings = s || {};
    // Any one of the per-type channel fields represents "the" modlog channel for display purposes.
    const sharedChannelId = settings.ban_log_channel_id || settings.warn_log_channel_id || settings.message_log_channel_id || null;
    channelPickers['modlog-channel-picker'].setChannels(guildChannelCache, sharedChannelId);
    Object.entries(MODLOG_CHECKBOX_TO_FIELD).forEach(([checkboxId, prefix]) => {
      const el = document.getElementById(checkboxId);
      if (el) el.checked = settings[`${prefix}_log_enabled`] !== false;
    });
    setStatus('status-modlogsettings', !!sharedChannelId);
  }

  async function saveModLogSettings() {
    const e = document.getElementById('modlogsettings-error');
    e.style.display = 'none';
    if (!selectedGuildId) { e.textContent = '// Error: Please select your Discord server first!'; e.style.display = 'block'; return; }
    const discordId = currentUser?.user_metadata?.provider_id || currentUser?.id;
    const channelId = channelPickers['modlog-channel-picker'].getValue() || null;

    const fields = { owner_discord_id: discordId, discord_server_id: selectedGuildId };
    Object.entries(MODLOG_CHECKBOX_TO_FIELD).forEach(([checkboxId, prefix]) => {
      fields[`${prefix}_log_channel_id`] = channelId;
      fields[`${prefix}_log_enabled`] = document.getElementById(checkboxId)?.checked !== false;
    });

    try {
      await sb.from('server_settings').upsert(fields, { onConflict: 'discord_server_id' });
      setStatus('status-modlogsettings', !!channelId);
      showSaved('modlogsettings-saved');
    } catch (err) {
      e.textContent = '// Error: ' + err.message; e.style.display = 'block';
    }
  }

  // ─── MODERATION ACTIONS ───────────────────────────────────────────────────────
  const MODACT_TYPES = ['ban', 'kick', 'mute', 'hardmute', 'timeout', 'tempban'];
  const MODACT_LABELS = { ban: 'banned', kick: 'kicked', mute: 'muted', hardmute: 'hardmuted', timeout: 'timed out', tempban: 'temporarily banned' };
  const MODACT_HAS_DURATION = { mute: true, hardmute: true, timeout: true, tempban: true };
  const MODACT_HAS_PURGE = { ban: true, tempban: true };

  function showModActionSubtab(name) {
    MODACT_TYPES.forEach(t => {
      document.getElementById(`modact-subtab-${t}`).style.display = t === name ? '' : 'none';
      document.getElementById(`modact-subtab-btn-${t}`).classList.toggle('active', t === name);
    });
  }

  const DM_MODE_OPTIONS = [
    { value: 'none', label: 'Do not DM offender' },
    { value: 'reason', label: 'Send server, action and reason' },
  ];

  function updateModActionExample(type) {
    const mode = channelPickers[`modact-${type}-dm`]?.getValue();
    const el = document.getElementById(`modact-${type}-example`);
    const serverName = userGuilds.find(g => g.id === selectedGuildId)?.name || 'Your Server';
    if (mode === 'reason') {
      el.textContent = `Example: You were ${MODACT_LABELS[type]} in ${serverName}. Reason: 'DMing ads'`;
    } else {
      el.textContent = 'Example: N/A';
    }
  }

  function loadModActionSettings(s) {
    const settings = s || {};
    MODACT_TYPES.forEach(type => {
      const defaultMode = (type === 'ban' || type === 'kick' || type === 'tempban') ? 'none' : 'reason';
      channelPickers[`modact-${type}-dm`]?.setStaticOptions(DM_MODE_OPTIONS, settings[`${type}_dm_mode`] || defaultMode);
      updateModActionExample(type);

      if (MODACT_HAS_DURATION[type]) {
        const hEl = document.getElementById(`modact-${type}-hours`);
        const mEl = document.getElementById(`modact-${type}-minutes`);
        if (hEl) hEl.value = settings[`${type}_default_hours`] ?? (type === 'timeout' ? 1 : 0);
        if (mEl) mEl.value = settings[`${type}_default_minutes`] ?? 0;
      }
      if (MODACT_HAS_PURGE[type]) {
        const pEl = document.getElementById(`modact-${type}-purge`);
        if (pEl) pEl.value = settings[`${type}_purge_days`] ?? 2;
      }
    });

    channelPickers['modact-mute-role-picker'] && _populateRolePicker('modact-mute-role-picker', settings.mute_role_id || null);
    document.getElementById('modact-mute-setup-result').textContent = '';
    setStatus('status-modactions', !!settings.mute_role_id);
  }

  async function saveModAction(type) {
    const e = document.getElementById(`modact-${type}-error`);
    e.style.display = 'none';
    if (!selectedGuildId) { e.textContent = '// Error: Please select your Discord server first!'; e.style.display = 'block'; return; }
    const discordId = currentUser?.user_metadata?.provider_id || currentUser?.id;

    const fields = { owner_discord_id: discordId, discord_server_id: selectedGuildId };
    fields[`${type}_dm_mode`] = channelPickers[`modact-${type}-dm`].getValue();

    if (MODACT_HAS_DURATION[type]) {
      fields[`${type}_default_hours`] = Math.max(0, parseInt(document.getElementById(`modact-${type}-hours`).value, 10) || 0);
      fields[`${type}_default_minutes`] = Math.max(0, parseInt(document.getElementById(`modact-${type}-minutes`).value, 10) || 0);
    }
    if (MODACT_HAS_PURGE[type]) {
      fields[`${type}_purge_days`] = Math.min(7, Math.max(0, parseInt(document.getElementById(`modact-${type}-purge`).value, 10) || 0));
    }
    if (type === 'mute') {
      fields.mute_role_id = channelPickers['modact-mute-role-picker'].getValue() || null;
    }

    try {
      await sb.from('server_settings').upsert(fields, { onConflict: 'discord_server_id' });
      if (type === 'mute') setStatus('status-modactions', !!fields.mute_role_id);
      showSaved(`modact-${type}-saved`);
    } catch (err) {
      e.textContent = '// Error: ' + err.message; e.style.display = 'block';
    }
  }

  async function setupMuteRolePermissions() {
    const resultEl = document.getElementById('modact-mute-setup-result');
    if (!selectedGuildId) { resultEl.textContent = '⚠ Select a server first.'; return; }
    const roleId = channelPickers['modact-mute-role-picker'].getValue();
    if (!roleId) { resultEl.textContent = '⚠ Pick a Mute role first.'; return; }

    resultEl.textContent = 'Applying permissions across every channel — this may take a few seconds...';
    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch(`${RAILWAY_BOT_URL}/api/moderation/setup-mute-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ guildId: selectedGuildId, roleId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unknown error');
      let msg = `✅ Done — updated ${result.updated} channel(s).`;
      if (result.errors?.length) msg += ` ⚠ ${result.errors.length} failed: ${result.errors.slice(0, 3).join('; ')}`;
      resultEl.textContent = msg;
    } catch (err) {
      resultEl.textContent = '❌ Error: ' + err.message;
    }
  }