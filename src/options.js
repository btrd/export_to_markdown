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

function makeSelectorRow(type, value) {
  const row = document.createElement('div');
  row.className = 'rule-row';
  const badge = document.createElement('span');
  badge.className = `rule-type ${type}`;
  badge.textContent = type;
  const code = document.createElement('code');
  code.textContent = value;
  row.append(badge, code);
  return row;
}

function renderRules(rules) {
  rulesList.replaceChildren();

  const entries = Object.entries(rules);
  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No rules defined.';
    rulesList.appendChild(empty);
    return;
  }

  for (const [hostname, rule] of entries) {
    const card = document.createElement('div');
    card.className = 'rule-card';

    const header = document.createElement('div');
    header.className = 'rule-header';

    const hostnameSpan = document.createElement('span');
    hostnameSpan.className = 'rule-hostname';
    hostnameSpan.textContent = hostname;

    const actions = document.createElement('div');
    actions.className = 'rule-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => startEdit(hostname, rule));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger btn-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', async () => {
      const updated = await getRules();
      delete updated[hostname];
      await setRules(updated);
      renderRules(updated);
    });

    actions.append(editBtn, deleteBtn);
    header.append(hostnameSpan, actions);
    card.appendChild(header);

    if (rule.select) card.appendChild(makeSelectorRow('select', rule.select));
    (rule.hide ?? []).forEach((s) => card.appendChild(makeSelectorRow('hide', s)));

    rulesList.appendChild(card);
  }
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
