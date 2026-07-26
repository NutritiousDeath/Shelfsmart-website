// ─── NEW MEMBER GATE ──────────────────────────────────────────────────────────
  const NMG_VARIABLES = ['{user}', '{user.mention}', '{server}', '{membercount}'];
  let nmgLastFocusedField = null;

  function initNmgVarButtons() {
    const container = document.getElementById('nmg-dm-var-buttons');
    if (!container || container.childElementCount > 0) return;
    NMG_VARIABLES.forEach(v => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = v;
      btn.className = 'btn-secondary';
      btn.style = 'font-size:0.55rem;padding:5px 8px;text-transform:none;letter-spacing:0';
      btn.onclick = () => {
        const field = document.getElementById('nmg-dm-message');
        const start = field.selectionStart ?? field.value.length;
        const end = field.selectionEnd ?? field.value.length;
        field.value = field.value.slice(0, start) + v + field.value.slice(end);
        field.focus();
        field.selectionStart = field.selectionEnd = start + v.length;
      };
      container.appendChild(btn);
    });
  }

  function renderUnlockChannelsList(savedIds) {
    const container = document.getElementById('nmg-unlock-channels');
    if (!container) return;
    container.innerHTML = '';
    const saved = new Set(savedIds || []);
    const relevant = guildChannelCache.filter(c => c.type === 0 || c.type === 5).sort((a, b) => a.position - b.position);

    if (relevant.length === 0) {
      container.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.65rem;color:var(--grey)">No channels loaded yet — select a server first.</p>';
      return;
    }

    relevant.forEach(ch => {
      const label = document.createElement('label');
      label.style = 'display:flex;align-items:center;gap:8px;padding:4px 0;font-family:var(--font-mono);font-size:0.7rem;color:var(--white);cursor:pointer';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = ch.id;
      cb.checked = saved.has(ch.id);
      cb.style = 'width:15px;height:15px';
      cb.className = 'nmg-unlock-checkbox';
      label.appendChild(cb);
      label.appendChild(document.createTextNode('#' + ch.name));
      container.appendChild(label);
    });
  }

  // Excludes whichever role is currently picked as the gate role in Step 2,
  // since a role can't unlock itself — matches the warning text in Step 3.
  function renderUnlockRolesList(savedIds) {
    const container = document.getElementById('nmg-unlock-roles');
    if (!container) return;
    container.innerHTML = '';
    const saved = new Set(savedIds || []);
    const gateRoleId = channelPickers['nmg-role-picker']?.getValue();
    const relevant = (guildRoleCache || []).filter(r => r.id !== gateRoleId && r.name !== '@everyone').sort((a, b) => (b.position || 0) - (a.position || 0));

    if (relevant.length === 0) {
      container.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.65rem;color:var(--grey)">No roles loaded yet — select a server first.</p>';
      return;
    }

    relevant.forEach(r => {
      const label = document.createElement('label');
      label.style = 'display:flex;align-items:center;gap:8px;padding:4px 0;font-family:var(--font-mono);font-size:0.7rem;color:var(--white);cursor:pointer';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = r.id;
      cb.checked = saved.has(r.id);
      cb.style = 'width:15px;height:15px';
      cb.className = 'nmg-unlock-role-checkbox';
      label.appendChild(cb);
      label.appendChild(document.createTextNode('@' + r.name));
      container.appendChild(label);
    });
  }

  function loadNewMemberGateSettings(guildId, s) {
    initNmgVarButtons();
    const settings = s || {};
    _populateRolePicker('nmg-role-picker', settings.new_member_role_id || null);
    renderUnlockRolesList(settings.new_member_unlock_role_ids || []);
    document.getElementById('nmg-dm-message').value = settings.new_member_dm_message || '';
    document.getElementById('nmg-enabled').checked = !!settings.new_member_gate_enabled;
    renderUnlockChannelsList(settings.new_member_unlock_channel_ids || []);
    document.getElementById('nmg-lockdown-result').textContent = '';
    setStatus('status-newmembergate', !!settings.new_member_gate_enabled && !!settings.new_member_role_id && (settings.new_member_unlock_role_ids || []).length > 0);
  }

  async function saveNewMemberGateSettings() {
    const e = document.getElementById('nmg-error');
    e.style.display = 'none';
    if (!selectedGuildId) {
      e.textContent = '// Error: Please select your Discord server first!'; e.style.display = 'block';
      return;
    }
    const discordId = currentUser?.user_metadata?.provider_id || currentUser?.id;
    const roleId = channelPickers['nmg-role-picker'].getValue() || null;
    const unlockRoleIds = Array.from(document.querySelectorAll('.nmg-unlock-role-checkbox:checked')).map(cb => cb.value);
    const unlockChannelIds = Array.from(document.querySelectorAll('.nmg-unlock-checkbox:checked')).map(cb => cb.value);

    if (roleId && unlockRoleIds.includes(roleId)) {
      e.textContent = '// Error: The New Member role can\'t also be checked as an Unlock role.'; e.style.display = 'block';
      return;
    }

    try {
      await sb.from('server_settings').upsert(
        {
          owner_discord_id: discordId, discord_server_id: selectedGuildId,
          new_member_role_id: roleId,
          new_member_unlock_role_ids: unlockRoleIds,
          new_member_dm_message: document.getElementById('nmg-dm-message').value,
          new_member_gate_enabled: document.getElementById('nmg-enabled').checked,
          new_member_unlock_channel_ids: unlockChannelIds,
        },
        { onConflict: 'discord_server_id' }
      );
      setStatus('status-newmembergate', document.getElementById('nmg-enabled').checked && !!roleId && unlockRoleIds.length > 0);
      showSaved('nmg-saved');
    } catch (err) {
      e.textContent = '// Error: ' + err.message; e.style.display = 'block';
    }
  }

  async function applyNewMemberLockdown() {
    const resultEl = document.getElementById('nmg-lockdown-result');
    if (!selectedGuildId) { resultEl.textContent = '⚠ Select a server first.'; return; }
    const roleId = channelPickers['nmg-role-picker'].getValue();
    if (!roleId) { resultEl.textContent = '⚠ Pick a role in Step 2 first.'; return; }

    const unlockChannelIds = Array.from(document.querySelectorAll('.nmg-unlock-checkbox:checked')).map(cb => cb.value);
    resultEl.textContent = 'Applying lockdown across every channel — this may take a few seconds...';

    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch(`${RAILWAY_BOT_URL}/api/new-member-gate/apply-lockdown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ guildId: selectedGuildId, roleId, unlockChannelIds }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unknown error');
      let msg = `✅ Done — ${result.unlocked} channel(s) left visible, ${result.locked} hidden from this role${result.skipped ? ` (${result.skipped} thread(s) skipped — they inherit visibility from their parent channel automatically)` : ''}.`;
      if (result.errors && result.errors.length > 0) {
        msg += ` ⚠ ${result.errors.length} channel(s) failed: ${result.errors.slice(0, 3).join('; ')}`;
      }
      resultEl.textContent = msg;
    } catch (err) {
      resultEl.textContent = '❌ Error: ' + err.message;
    }
  }