// ─── MY LICENSES ──────────────────────────────────────────────────────────────
  async function loadMyLicenses() {
    const container = document.getElementById('licenses-list');
    if (!container) return;
    container.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.65rem;color:var(--grey)">Loading...</p>';
    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch(`${RAILWAY_BOT_URL}/api/licenses`, {
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      const data = await res.json();
      renderLicensesList(data.licenses || []);
    } catch (err) {
      container.innerHTML = `<p style="font-family:var(--font-mono);font-size:0.65rem;color:var(--pink)">Couldn't load licenses: ${err.message}</p>`;
    }
  }

  function renderLicensesList(licenses) {
    const container = document.getElementById('licenses-list');
    if (licenses.length === 0) {
      container.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.7rem;color:var(--grey)">No licenses yet — purchase Pro or Lifetime above to get one.</p>';
      return;
    }

    container.innerHTML = '';
    licenses.forEach(lic => {
      const assignedGuild = lic.guild_id ? userGuilds.find(g => g.id === lic.guild_id) : null;
      const row = document.createElement('div');
      row.style = 'display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding:14px;background:rgba(0,240,255,0.03);border:1px solid rgba(0,240,255,0.12);border-radius:6px;margin-bottom:10px';

      const statusColor = lic.status === 'active' ? 'var(--green)' : lic.status === 'past_due' ? 'var(--yellow)' : 'var(--pink)';
      const tierLabel = lic.tier === 'lifetime' ? 'Lifetime' : 'Pro Monthly';
      const assignedLabel = lic.guild_id ? (assignedGuild ? `Assigned to ${assignedGuild.name}` : `Assigned to server ID ${lic.guild_id}`) : 'Not assigned to any server';

      row.innerHTML = `
        <div>
          <p style="font-family:var(--font-display);font-size:0.8rem;font-weight:700;color:var(--white)">${tierLabel} <span style="color:${statusColor};font-family:var(--font-mono);font-size:0.6rem;text-transform:uppercase;margin-left:6px">${lic.status}</span></p>
          <p style="font-family:var(--font-mono);font-size:0.68rem;color:var(--grey);margin-top:4px">${assignedLabel}</p>
        </div>
      `;

      const actionsDiv = document.createElement('div');
      actionsDiv.style = 'display:flex;gap:8px;flex-shrink:0';

      if (lic.status === 'active') {
        if (!lic.guild_id) {
          const assignBtn = document.createElement('button');
          assignBtn.className = 'btn-primary';
          assignBtn.textContent = selectedGuildId ? 'Assign to current server' : 'Select a server first';
          assignBtn.disabled = !selectedGuildId;
          assignBtn.style = 'font-size:0.6rem;padding:8px 14px';
          assignBtn.onclick = () => assignLicenseToCurrentServer(lic.id);
          actionsDiv.appendChild(assignBtn);
        } else {
          if (selectedGuildId && lic.guild_id !== selectedGuildId) {
            const reassignBtn = document.createElement('button');
            reassignBtn.className = 'btn-secondary';
            reassignBtn.textContent = 'Reassign to current server';
            reassignBtn.style = 'font-size:0.6rem;padding:8px 14px';
            reassignBtn.onclick = () => assignLicenseToCurrentServer(lic.id);
            actionsDiv.appendChild(reassignBtn);
          }
          const unassignBtn = document.createElement('button');
          unassignBtn.className = 'btn-secondary';
          unassignBtn.textContent = 'Unassign';
          unassignBtn.style = 'font-size:0.6rem;padding:8px 14px;border-color:var(--pink);color:var(--pink)';
          unassignBtn.onclick = () => unassignLicenseById(lic.id);
          actionsDiv.appendChild(unassignBtn);
        }
      }

      row.appendChild(actionsDiv);
      container.appendChild(row);
    });
  }

  async function assignLicenseToCurrentServer(licenseId) {
    if (!selectedGuildId) return;
    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch(`${RAILWAY_BOT_URL}/api/licenses/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ licenseId, guildId: selectedGuildId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unknown error');
      await loadMyLicenses();
      updateConfigCardStatuses();
    } catch (err) {
      alert('Couldn\'t assign license: ' + err.message);
    }
  }

  async function unassignLicenseById(licenseId) {
    if (!confirm('Unassign this license? Pro features will stop working on that server until you assign a license to it again.')) return;
    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch(`${RAILWAY_BOT_URL}/api/licenses/unassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ licenseId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unknown error');
      await loadMyLicenses();
      updateConfigCardStatuses();
    } catch (err) {
      alert('Couldn\'t unassign license: ' + err.message);
    }
  }

  function updateSecurityStatus() {
    const s = lastBotConfigSettings || {};
    const anyActive = !!s.domain_blacklist_enabled || !!s.honeypot_enabled;
    setStatus('status-security', anyActive);
  }