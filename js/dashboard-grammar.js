// ─── GRAMMAR CHECK (native spellcheck free for all, AI check Pro/Lifetime) ──
// Reusable helper: enables native browser spellcheck (free, every tier, no
// button needed) and injects a "Check grammar" button (Pro/Lifetime, uses
// Claude Haiku via /api/grammar-check) next to any text field.
//
// Usage: call attachGrammarCheck('some-field-id') once, any time after that
// field's DOM node exists — safe to call again on re-render, it cleans up
// its own previous injection first.

function attachGrammarCheck(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;

  // Layer 1: native browser spellcheck — free for everyone, nothing to wire
  field.setAttribute('spellcheck', 'true');

  const existingWrap = document.getElementById('gc-wrap-' + fieldId);
  if (existingWrap) existingWrap.remove();
  const existingSuggestion = document.getElementById('gc-suggestion-' + fieldId);
  if (existingSuggestion) existingSuggestion.remove();

  const wrap = document.createElement('div');
  wrap.id = 'gc-wrap-' + fieldId;
  wrap.style = 'margin-top:6px;display:flex;align-items:center;gap:10px;flex-wrap:wrap';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-secondary';
  btn.textContent = '✓ Check grammar';
  btn.style = 'font-size:0.62rem;padding:5px 10px;text-transform:none;letter-spacing:0';
  btn.onclick = () => runGrammarCheck(fieldId);
  wrap.appendChild(btn);

  const status = document.createElement('span');
  status.id = 'gc-status-' + fieldId;
  status.style = 'font-family:var(--font-mono);font-size:0.62rem;color:var(--grey)';
  wrap.appendChild(status);

  field.insertAdjacentElement('afterend', wrap);
}

async function runGrammarCheck(fieldId) {
  const field = document.getElementById(fieldId);
  const statusEl = document.getElementById('gc-status-' + fieldId);
  if (!field || !statusEl) return;

  const existingSuggestion = document.getElementById('gc-suggestion-' + fieldId);
  if (existingSuggestion) existingSuggestion.remove();

  const text = field.value.trim();
  if (!text) { statusEl.textContent = '// Nothing to check'; statusEl.style.color = 'var(--grey)'; return; }
  if (!selectedGuildId) { statusEl.textContent = '// Select a server first'; statusEl.style.color = 'var(--pink)'; return; }

  statusEl.textContent = 'Checking...';
  statusEl.style.color = 'var(--grey)';

  try {
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(`${RAILWAY_BOT_URL}/api/grammar-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({ guildId: selectedGuildId, text }),
    });
    const result = await res.json();

    if (res.status === 402 || result.requiresPro) {
      statusEl.innerHTML = '⭐ Grammar check is a <span style="color:var(--purple)">Pro/Lifetime</span> feature';
      statusEl.style.color = 'var(--grey)';
      return;
    }
    if (!res.ok) throw new Error(result.error || 'Unknown error');

    if (!result.changed) {
      statusEl.textContent = '✅ No issues found';
      statusEl.style.color = 'var(--cyan)';
      return;
    }

    statusEl.textContent = '';
    showGrammarSuggestion(fieldId, result.corrected);
  } catch (err) {
    statusEl.textContent = '// Error: ' + err.message;
    statusEl.style.color = 'var(--pink)';
  }
}

function showGrammarSuggestion(fieldId, corrected) {
  const field = document.getElementById(fieldId);
  const wrap = document.getElementById('gc-wrap-' + fieldId);
  if (!field || !wrap) return;

  const box = document.createElement('div');
  box.id = 'gc-suggestion-' + fieldId;
  box.style = 'margin-top:8px;padding:10px;border:1px solid rgba(0,240,255,0.25);border-radius:6px;background:rgba(0,240,255,0.04)';

  const label = document.createElement('p');
  label.style = 'font-family:var(--font-mono);font-size:0.6rem;color:var(--cyan);margin-bottom:6px';
  label.textContent = 'SUGGESTED CORRECTION';
  box.appendChild(label);

  const preview = document.createElement('p');
  preview.style = 'font-family:var(--font-mono);font-size:0.75rem;color:var(--white);line-height:1.7;margin-bottom:10px;white-space:pre-wrap';
  preview.textContent = corrected;
  box.appendChild(preview);

  const btnRow = document.createElement('div');
  btnRow.style = 'display:flex;gap:8px';

  const acceptBtn = document.createElement('button');
  acceptBtn.type = 'button';
  acceptBtn.className = 'btn-primary';
  acceptBtn.textContent = 'Use this';
  acceptBtn.style = 'font-size:0.62rem;padding:6px 12px';
  acceptBtn.onclick = () => { field.value = corrected; box.remove(); };
  btnRow.appendChild(acceptBtn);

  const dismissBtn = document.createElement('button');
  dismissBtn.type = 'button';
  dismissBtn.className = 'btn-secondary';
  dismissBtn.textContent = 'Dismiss';
  dismissBtn.style = 'font-size:0.62rem;padding:6px 12px';
  dismissBtn.onclick = () => box.remove();
  btnRow.appendChild(dismissBtn);

  box.appendChild(btnRow);
  wrap.insertAdjacentElement('afterend', box);
}
