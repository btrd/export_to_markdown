const i18n = (key) => browser.i18n.getMessage(key);

const hostnameInput = document.getElementById('input-hostname');
const selectInput = document.getElementById('input-select');
const hideInput = document.getElementById('input-hide');
const saveBtn = document.getElementById('btn-save');
const cancelBtn = document.getElementById('btn-cancel');
const rulesList = document.getElementById('rules-list');
const formError = document.getElementById('form-error');

// Populate static labels from the active locale.
document.getElementById('options-title').textContent = i18n('optionsTitle');
document.getElementById('options-subtitle').textContent = i18n('optionsSubtitle');
document.getElementById('options-form-heading').textContent = i18n('optionsFormHeading');
document.getElementById('options-rules-heading').textContent =
  i18n('optionsRulesHeading');
document.getElementById('options-label-hostname').textContent =
  i18n('optionsLabelHostname');
document.getElementById('options-label-select').textContent = i18n('optionsLabelSelect');
document.getElementById('options-label-hide').textContent = i18n('optionsLabelHide');
cancelBtn.textContent = i18n('optionsCancel');

let editingHostname = null;

async function getRules() {
  const { rules = {} } = await browser.storage.sync.get('rules');
  return rules;
}

async function setRules(rules) {
  await browser.storage.sync.set({ rules });
}

function showError(msg) {
  formError.textContent = msg;
  formError.hidden = false;
}

function clearError() {
  formError.hidden = true;
  formError.textContent = '';
}

function isValidHostname(hostname) {
  return (
    hostname.length > 0 &&
    !hostname.includes(' ') &&
    !hostname.includes('/') &&
    !hostname.includes(':')
  );
}

function isValidSelector(selector) {
  try {
    document.createDocumentFragment().querySelector(selector);
    return true;
  } catch {
    return false;
  }
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
    empty.textContent = i18n('optionsNoRules');
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
    editBtn.textContent = i18n('optionsEdit');
    editBtn.addEventListener('click', () => startEdit(hostname, rule));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger btn-delete';
    deleteBtn.textContent = i18n('optionsDelete');
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
  saveBtn.textContent = i18n('optionsUpdateRule');
  clearError();
  hostnameInput.scrollIntoView({ behavior: 'smooth' });
}

function resetForm() {
  editingHostname = null;
  hostnameInput.value = '';
  hostnameInput.disabled = false;
  selectInput.value = '';
  hideInput.value = '';
  cancelBtn.hidden = true;
  saveBtn.textContent = i18n('optionsSaveRule');
  clearError();
}

saveBtn.addEventListener('click', async () => {
  clearError();

  const hostname = hostnameInput.value.trim().toLowerCase();
  const select = selectInput.value.trim() || undefined;
  const hide = hideInput.value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!hostname || (!select && hide.length === 0)) return;

  if (!isValidHostname(hostname)) {
    showError(i18n('optionsErrorHostname'));
    hostnameInput.focus();
    return;
  }

  if (select && !isValidSelector(select)) {
    showError(i18n('optionsErrorSelector'));
    selectInput.focus();
    return;
  }

  const invalidHide = hide.find((s) => !isValidSelector(s));
  if (invalidHide) {
    showError(i18n('optionsErrorSelector'));
    hideInput.focus();
    return;
  }

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
resetForm();
