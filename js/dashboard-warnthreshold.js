// ─── WARN THRESHOLD ───────────────────────────────────────────────────────────
  function loadWarnThresholdSettings(s) {
    const settings = s || {};
    document.getElementById('warnthreshold-count').value = settings.warn_auto_action_threshold || 0;
    document.getElementById('warnthreshold-minutes').value = settings.warn_auto_action_minutes || 60;
    setStatus('status-warnthreshold', !!(settings.warn_auto_action_threshold > 0));
  }

  async function saveWarnThreshold() {
    const e = document.getElementById('warnthreshold-error');
    e.style.display = 'none';
    if (!selectedGuildId) { e.textContent = '// Error: Please select your Discord server first!'; e.style.display = 'block'; return; }
    const discordId = currentUser?.user_metadata?.provider_id || currentUser?.id;
    const count = Math.max(0, parseInt(document.getElementById('warnthreshold-count').value, 10) || 0);
    const minutes = Math.max(1, parseInt(document.getElementById('warnthreshold-minutes').value, 10) || 60);

    try {
      await sb.from('server_settings').upsert(
        { owner_discord_id: discordId, discord_server_id: selectedGuildId, warn_auto_action_threshold: count, warn_auto_action_minutes: minutes },
        { onConflict: 'discord_server_id' }
      );
      setStatus('status-warnthreshold', count > 0);
      showSaved('warnthreshold-saved');
    } catch (err) {
      e.textContent = '// Error: ' + err.message; e.style.display = 'block';
    }
  }