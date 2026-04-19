const hostnameInput = document.getElementById('input-hostname');
const selectInput   = document.getElementById('input-select');
const hideInput     = document.getElementById('input-hide');
const saveBtn       = document.getElementById('btn-save');
const cancelBtn     = document.getElementById('btn-cancel');
const rulesList     = document.getElementById('rules-list');

let editingHostname = null;

async function getRules() {
  const { rules = {} } = await browser.storage.sync.get('rules');
  return rules;
}

async function setRules(rules) {
  await browser.storage.sync.set({ rules });
}

function renderRules(rules) {
  rulesList.innerHTML = '';

  const entries = Object.entries(rules);
  if (entries.length === 0) {
    rulesList.innerHTML = '<p class="empty">No rules defined.</p>';
    return;
  }

  for (const [hostname, rule] of entries) {
    const card = document.createElement('div');
    card.className = 'rule-card';

    const selectRow = rule.select
      ? `<div class="rule-row"><span class="rule-type select">select</span><code>${rule.select}</code></div>`
      : '';

    const hideRows = (rule.hide ?? [])
      .map((s) => `<div class="rule-row"><span class="rule-type hide">hide</span><code>${s}</code></div>`)
      .join('');

    card.innerHTML = `
      <div class="rule-header">
        <span class="rule-hostname">${hostname}</span>
        <div class="rule-actions">
          <button class="btn-edit" data-hostname="${hostname}">Edit</button>
          <button class="danger btn-delete" data-hostname="${hostname}">Delete</button>
        </div>
      </div>
      ${selectRow}${hideRows}
    `;

    rulesList.appendChild(card);
  }

  rulesList.querySelectorAll('.btn-edit').forEach((btn) => {
    btn.addEventListener('click', () => startEdit(btn.dataset.hostname, rules[btn.dataset.hostname]));
  });

  rulesList.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const updated = await getRules();
      delete updated[btn.dataset.hostname];
      await setRules(updated);
      renderRules(updated);
    });
  });
}

function startEdit(hostname, rule) {
  editingHostname = hostname;
  hostnameInput.value = hostname;
  hostnameInput.disabled = true;
  selectInput.value = rule.select ?? '';
  hideInput.value = (rule.hide ?? []).join('\n');
  cancelBtn.hidden = false;
  saveBtn.textContent = 'Update rule';
  hostnameInput.scrollIntoView({ behavior: 'smooth' });
}

function resetForm() {
  editingHostname = null;
  hostnameInput.value = '';
  hostnameInput.disabled = false;
  selectInput.value = '';
  hideInput.value = '';
  cancelBtn.hidden = true;
  saveBtn.textContent = 'Save rule';
}

saveBtn.addEventListener('click', async () => {
  const hostname = hostnameInput.value.trim().toLowerCase();
  const select   = selectInput.value.trim() || undefined;
  const hide     = hideInput.value.split('\n').map((s) => s.trim()).filter(Boolean);

  if (!hostname || (!select && hide.length === 0)) return;

  const rules = await getRules();

  if (editingHostname) {
    delete rules[editingHostname];
    rules[hostname] = { select, hide };
  } else {
    // Merge with existing rule for this hostname, deduplicating hide selectors.
    const existing = rules[hostname] ?? {};
    rules[hostname] = {
      select: select ?? existing.select,
      hide: [...new Set([...(existing.hide ?? []), ...hide])],
    };
    // Clean up undefined select
    if (!rules[hostname].select) delete rules[hostname].select;
  }

  await setRules(rules);
  renderRules(rules);
  resetForm();
});

cancelBtn.addEventListener('click', resetForm);

getRules().then(renderRules);
