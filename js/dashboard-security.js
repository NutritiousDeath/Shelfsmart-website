// ─── SECURITY: DOMAIN BLACKLIST + HONEYPOT ───────────────────────────────────
  let domainBlacklistCache = [];

  function showSecuritySubtab(name) {
    document.getElementById('security-subtab-domains').style.display = name === 'domains' ? '' : 'none';
    document.getElementById('security-subtab-honeypot').style.display = name === 'honeypot' ? '' : 'none';
    document.getElementById('security-subtab-btn-domains').classList.toggle('active', name === 'domains');
    document.getElementById('security-subtab-btn-honeypot').classList.toggle('active', name === 'honeypot');
  }

  function renderDomainList() {
    const container = document.getElementById('security-domain-list');
    if (domainBlacklistCache.length === 0) {
      container.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.65rem;color:var(--grey)">No domains added yet.</p>';
      return;
    }
    container.innerHTML = '';
    domainBlacklistCache.forEach(d => {
      const row = document.createElement('div');
      row.style = 'display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:rgba(0,0,0,0.2);border-radius:4px;margin-bottom:6px;font-family:var(--font-mono);font-size:0.7rem';
      row.innerHTML = `<span style="color:var(--white)">${d.domain}</span>`;
      const delBtn = document.createElement('button');
      delBtn.textContent = '✕';
      delBtn.style = 'background:var(--pink);color:#fff;border:none;border-radius:4px;width:24px;height:24px;cursor:pointer';
      delBtn.onclick = () => removeBlacklistedDomain(d.domain);
      row.appendChild(delBtn);
      container.appendChild(row);
    });
  }

  async function fetchDomainBlacklist() {
    if (!selectedGuildId) { domainBlacklistCache = []; renderDomainList(); return; }
    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch(`${RAILWAY_BOT_URL}/api/domain-blacklist?guildId=${selectedGuildId}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      const data = await res.json();
      domainBlacklistCache = data.domains || [];
    } catch (err) {
      console.error('fetchDomainBlacklist error:', err.message);
      domainBlacklistCache = [];
    }
    renderDomainList();
  }

  async function addBlacklistedDomain() {
    const input = document.getElementById('security-domain-input');
    const domain = input.value.trim();
    if (!domain || !selectedGuildId) return;
    try {
      const { data: { session } } = await sb.auth.getSession();
      await fetch(`${RAILWAY_BOT_URL}/api/domain-blacklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ guildId: selectedGuildId, domain }),
      });
      input.value = '';
      await fetchDomainBlacklist();
    } catch (err) {
      console.error('addBlacklistedDomain error:', err.message);
    }
  }

  async function removeBlacklistedDomain(domain) {
    try {
      const { data: { session } } = await sb.auth.getSession();
      await fetch(`${RAILWAY_BOT_URL}/api/domain-blacklist/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ guildId: selectedGuildId, domain }),
      });
      await fetchDomainBlacklist();
    } catch (err) {
      console.error('removeBlacklistedDomain error:', err.message);
    }
  }

  function loadDomainBlacklistSettings(s) {
    const settings = s || {};
    document.getElementById('security-domains-enabled').checked = !!settings.domain_blacklist_enabled;
    document.getElementById('security-domain-punishment').value = settings.domain_blacklist_punishment || 'delete';
    document.getElementById('security-domain-timeout-minutes').value = settings.domain_blacklist_timeout_minutes || 10;
    document.getElementById('security-domain-timeout-wrap').style.display = settings.domain_blacklist_punishment === 'delete_timeout' ? '' : 'none';
  }

  async function saveDomainBlacklistSettings() {
    const e = document.getElementById('security-domains-error');
    e.style.display = 'none';
    if (!selectedGuildId) { e.textContent = '// Error: Please select your Discord server first!'; e.style.display = 'block'; return; }
    const discordId = currentUser?.user_metadata?.provider_id || currentUser?.id;

    try {
      await sb.from('server_settings').upsert(
        {
          owner_discord_id: discordId, discord_server_id: selectedGuildId,
          domain_blacklist_enabled: document.getElementById('security-domains-enabled').checked,
          domain_blacklist_punishment: document.getElementById('security-domain-punishment').value,
          domain_blacklist_timeout_minutes: Math.max(1, parseInt(document.getElementById('security-domain-timeout-minutes').value, 10) || 10),
        },
        { onConflict: 'discord_server_id' }
      );
      updateSecurityStatus();
      showSaved('security-domains-saved');
    } catch (err) {
      e.textContent = '// Error: ' + err.message; e.style.display = 'block';
    }
  }

  function loadHoneypotSettings(s) {
    const settings = s || {};
    document.getElementById('security-honeypot-enabled').checked = !!settings.honeypot_enabled;
    channelPickers['security-honeypot-channel-picker'].setChannels(guildChannelCache, settings.honeypot_channel_id || null);
    document.getElementById('security-honeypot-punishment').value = settings.honeypot_punishment || 'kick';
    document.getElementById('security-honeypot-timeout-minutes').value = settings.honeypot_timeout_minutes || 60;
    document.getElementById('security-honeypot-timeout-wrap').style.display = settings.honeypot_punishment === 'timeout' ? '' : 'none';
  }

  async function saveHoneypotSettings() {
    const e = document.getElementById('security-honeypot-error');
    e.style.display = 'none';
    if (!selectedGuildId) { e.textContent = '// Error: Please select your Discord server first!'; e.style.display = 'block'; return; }
    const discordId = currentUser?.user_metadata?.provider_id || currentUser?.id;
    const channelId = channelPickers['security-honeypot-channel-picker'].getValue() || null;

    try {
      await sb.from('server_settings').upsert(
        {
          owner_discord_id: discordId, discord_server_id: selectedGuildId,
          honeypot_enabled: document.getElementById('security-honeypot-enabled').checked,
          honeypot_channel_id: channelId,
          honeypot_punishment: document.getElementById('security-honeypot-punishment').value,
          honeypot_timeout_minutes: Math.max(1, parseInt(document.getElementById('security-honeypot-timeout-minutes').value, 10) || 60),
        },
        { onConflict: 'discord_server_id' }
      );
      updateSecurityStatus();
      showSaved('security-honeypot-saved');
    } catch (err) {
      e.textContent = '// Error: ' + err.message; e.style.display = 'block';
    }
  }