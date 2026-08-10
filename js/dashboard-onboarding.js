// ─── FULL ONBOARDING ──────────────────────────────────────────────────────────
const OB_VARIABLES = ['{user}', '{user.mention}', '{server}', '{membercount}'];

// Working state for the question builder UI. Rebuilt from saved settings on
// load, edited in place as the admin adds/removes questions and options,
// then serialized back into the onboarding_questions JSON shape on save.
// [{ id, question, type: 'single'|'multi', options: [{ id, label, roleId }] }]
let obQuestions = [];
let obIdCounter = 0;
const obRolePickers = {}; // optionId -> CyberDropdown instance

function obNewId() { return 'ob' + (++obIdCounter) + '_' + Date.now().toString(36); }

function initObVarButtons() {
  [['ob-intro-var-buttons', 'ob-intro-message'], ['ob-completion-var-buttons', 'ob-completion-message']].forEach(([containerId, fieldId]) => {
    const container = document.getElementById(containerId);
    if (!container || container.childElementCount > 0) return;
    OB_VARIABLES.forEach(v => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = v;
      btn.className = 'btn-secondary';
      btn.style = 'font-size:0.55rem;padding:5px 8px;text-transform:none;letter-spacing:0';
      btn.onclick = () => {
        const field = document.getElementById(fieldId);
        const start = field.selectionStart ?? field.value.length;
        const end = field.selectionEnd ?? field.value.length;
        field.value = field.value.slice(0, start) + v + field.value.slice(end);
        field.focus();
        field.selectionStart = field.selectionEnd = start + v.length;
      };
      container.appendChild(btn);
    });
  });
}

function loadOnboardingSettings(guildId, s) {
  initObVarButtons();
  const settings = s || {};
  document.getElementById('ob-enabled').checked = !!settings.onboarding_enabled;
  document.getElementById('ob-unlocks-gate').checked = !!settings.onboarding_unlocks_gate;
  document.getElementById('ob-intro-message').value = settings.onboarding_intro_message || '';
  document.getElementById('ob-completion-message').value = settings.onboarding_completion_message || '';

  const saved = Array.isArray(settings.onboarding_questions) ? settings.onboarding_questions : [];
  obQuestions = saved.map(q => ({
    id: obNewId(),
    question: q.question || '',
    type: q.type === 'multi' ? 'multi' : 'single',
    options: (q.options || []).map(o => ({ id: obNewId(), label: o.label || '', roleId: o.role_id || '' })),
  }));
  renderObQuestions();
  document.getElementById('ob-saved').style.display = 'none';
  document.getElementById('ob-error').style.display = 'none';
  setStatus('status-onboarding', !!settings.onboarding_enabled && obQuestions.length > 0);
}

function obAddQuestion() {
  obSyncFromDom();
  obQuestions.push({ id: obNewId(), question: '', type: 'single', options: [] });
  renderObQuestions();
}

function obRemoveQuestion(qId) {
  obSyncFromDom();
  obQuestions.find(q => q.id === qId)?.options.forEach(o => delete obRolePickers[o.id]);
  obQuestions = obQuestions.filter(q => q.id !== qId);
  renderObQuestions();
}

function obAddOption(qId) {
  obSyncFromDom();
  const q = obQuestions.find(q => q.id === qId);
  if (!q) return;
  q.options.push({ id: obNewId(), label: '', roleId: '' });
  renderObQuestions();
}

function obRemoveOption(qId, optId) {
  obSyncFromDom();
  const q = obQuestions.find(q => q.id === qId);
  if (!q) return;
  q.options = q.options.filter(o => o.id !== optId);
  delete obRolePickers[optId];
  renderObQuestions();
}

// Pulls current values out of the DOM back into obQuestions before any
// re-render, so typing in a question/option-label field never gets lost
// when a different row's Add/Remove button triggers a full re-render.
function obSyncFromDom() {
  obQuestions.forEach(q => {
    const qInput = document.getElementById('ob-qtext-' + q.id);
    if (qInput) q.question = qInput.value;
    const typeToggle = document.getElementById('ob-qtype-' + q.id);
    if (typeToggle) q.type = typeToggle.checked ? 'multi' : 'single';
    q.options.forEach(o => {
      const oInput = document.getElementById('ob-olabel-' + o.id);
      if (oInput) o.label = oInput.value;
      const picker = obRolePickers[o.id];
      if (picker) o.roleId = picker.getValue() || '';
    });
  });
}

function renderObQuestions() {
  const container = document.getElementById('ob-questions');
  if (!container) return;
  container.innerHTML = '';

  if (obQuestions.length === 0) {
    container.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.85rem;color:var(--grey)">No questions yet — click "Add Question" below to build your first one.</p>';
  }

  obQuestions.forEach((q, qi) => {
    const card = document.createElement('div');
    card.style = 'border:1px solid rgba(0,240,255,0.15);border-radius:6px;padding:14px;margin-bottom:14px;background:rgba(0,0,0,0.2)';

    const header = document.createElement('div');
    header.style = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px';
    const label = document.createElement('p');
    label.style = 'font-family:var(--font-mono);font-size:0.85rem;color:var(--cyan)';
    label.textContent = `QUESTION ${qi + 1}`;
    header.appendChild(label);
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-secondary';
    removeBtn.textContent = 'Remove Question';
    removeBtn.style = 'font-size:0.6rem;padding:4px 10px';
    removeBtn.onclick = () => obRemoveQuestion(q.id);
    header.appendChild(removeBtn);
    card.appendChild(header);

    const qInput = document.createElement('input');
    qInput.type = 'text';
    qInput.className = 'cyber-input';
    qInput.id = 'ob-qtext-' + q.id;
    qInput.placeholder = 'e.g. Which games do you play?';
    qInput.value = q.question;
    qInput.maxLength = 200;
    qInput.style = 'margin-bottom:10px;width:100%;font-size:0.85rem';
    card.appendChild(qInput);

    const typeLabel = document.createElement('label');
    typeLabel.style = 'display:flex;align-items:center;gap:8px;font-family:var(--font-mono);font-size:0.85rem;color:var(--white);cursor:pointer;margin-bottom:10px';
    const typeToggle = document.createElement('input');
    typeToggle.type = 'checkbox';
    typeToggle.id = 'ob-qtype-' + q.id;
    typeToggle.checked = q.type === 'multi';
    typeToggle.style = 'width:15px;height:15px';
    typeToggle.onchange = () => { obSyncFromDom(); renderObQuestions(); };
    typeLabel.appendChild(typeToggle);
    typeLabel.appendChild(document.createTextNode('Allow multiple answers to this question'));
    card.appendChild(typeLabel);

    const optWrap = document.createElement('div');
    optWrap.style = 'margin-left:6px';

    q.options.forEach(o => {
      const row = document.createElement('div');
      row.style = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap';

      const oInput = document.createElement('input');
      oInput.type = 'text';
      oInput.className = 'cyber-input';
      oInput.id = 'ob-olabel-' + o.id;
      oInput.placeholder = 'Answer label, e.g. Overwatch 2';
      oInput.value = o.label;
      oInput.maxLength = 80;
      oInput.style = 'flex:1;min-width:160px;font-size:0.85rem';
      row.appendChild(oInput);

      const pickerMount = document.createElement('div');
      pickerMount.id = 'ob-role-' + o.id;
      pickerMount.style = 'flex:1;min-width:180px';
      row.appendChild(pickerMount);

      const removeOptBtn = document.createElement('button');
      removeOptBtn.className = 'btn-secondary';
      removeOptBtn.textContent = '✕';
      removeOptBtn.style = 'font-size:0.6rem;padding:6px 10px';
      removeOptBtn.onclick = () => obRemoveOption(q.id, o.id);
      row.appendChild(removeOptBtn);

      optWrap.appendChild(row);
    });

    card.appendChild(optWrap);

    const addOptBtn = document.createElement('button');
    addOptBtn.className = 'btn-secondary';
    addOptBtn.textContent = '+ Add Answer Option';
    addOptBtn.style = 'font-size:0.6rem;padding:6px 10px;margin-top:4px';
    addOptBtn.onclick = () => obAddOption(q.id);
    card.appendChild(addOptBtn);

    container.appendChild(card);

    // Role pickers are mounted after their DOM nodes exist in the container.
    q.options.forEach(o => {
      obRolePickers[o.id] = new CyberDropdown('ob-role-' + o.id, () => {});
      _populateOnboardingRolePicker(obRolePickers[o.id], o.roleId);
    });
  });
}

// Same logic as the shared _populateRolePicker() helper but operates on a
// CyberDropdown instance directly rather than a key in the fixed
// channelPickers registry — onboarding option pickers are created and
// destroyed dynamically as the admin edits questions, so there's no fixed
// count to pre-register at page load like the other pickers.
function _populateOnboardingRolePicker(picker, savedId) {
  picker.list.innerHTML = '';
  picker.options = [];

  if (!guildRoleCache || guildRoleCache.length === 0) {
    picker.setPlaceholder('No roles found');
    return;
  }

  guildRoleCache.forEach(role => {
    const div = document.createElement('div');
    div.className = 'cd-option' + (role.id === savedId ? ' selected' : '');
    const hex = role.color ? '#' + role.color.toString(16).padStart(6, '0') : null;
    div.innerHTML = (hex ? `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${hex};margin-right:6px"></span>` : '') + '@' + role.name;
    div.dataset.value = role.id;
    div.onclick = (e) => {
      e.stopPropagation();
      picker.setValue(role.id, '@' + role.name);
      picker.close();
    };
    picker.list.appendChild(div);
    picker.options.push({ value: role.id, label: role.name, el: div });
  });

  if (savedId) {
    const saved = guildRoleCache.find(r => r.id === savedId);
    if (saved) { picker.value = savedId; picker.selected.querySelector('.cd-label').textContent = '@' + saved.name; }
  } else {
    picker.selected.querySelector('.cd-label').textContent = '— Pick a role —';
  }
}

async function saveOnboardingSettings() {
  const e = document.getElementById('ob-error');
  e.style.display = 'none';
  if (!selectedGuildId) {
    e.textContent = '// Error: Please select your Discord server first!'; e.style.display = 'block';
    return;
  }
  obSyncFromDom();

  const questionsPayload = [];
  for (const q of obQuestions) {
    const questionText = (q.question || '').trim();
    if (!questionText) {
      e.textContent = '// Error: Every question needs text.'; e.style.display = 'block';
      return;
    }
    const options = q.options
      .map(o => ({ label: (o.label || '').trim(), role_id: o.roleId || '' }))
      .filter(o => o.label && o.role_id);
    if (options.length < 2) {
      e.textContent = `// Error: "${questionText}" needs at least 2 answer options, each with a role picked.`; e.style.display = 'block';
      return;
    }
    questionsPayload.push({ question: questionText, type: q.type, options });
  }

  if (document.getElementById('ob-enabled').checked && questionsPayload.length === 0) {
    e.textContent = '// Error: Add at least one question before enabling Full Onboarding.'; e.style.display = 'block';
    return;
  }

  const discordId = currentUser?.user_metadata?.provider_id || currentUser?.id;
  try {
    await sb.from('server_settings').upsert(
      {
        owner_discord_id: discordId, discord_server_id: selectedGuildId,
        onboarding_enabled: document.getElementById('ob-enabled').checked,
        onboarding_unlocks_gate: document.getElementById('ob-unlocks-gate').checked,
        onboarding_intro_message: document.getElementById('ob-intro-message').value,
        onboarding_completion_message: document.getElementById('ob-completion-message').value,
        onboarding_questions: questionsPayload,
      },
      { onConflict: 'discord_server_id' }
    );
    setStatus('status-onboarding', document.getElementById('ob-enabled').checked && questionsPayload.length > 0);
    showSaved('ob-saved');
  } catch (err) {
    e.textContent = '// Error: ' + err.message; e.style.display = 'block';
  }
}