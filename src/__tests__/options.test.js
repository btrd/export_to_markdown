import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetMessage = vi.fn((key) => key);
const mockStorageGet = vi.fn();
const mockStorageSet = vi.fn();

vi.stubGlobal('browser', {
  i18n: { getMessage: mockGetMessage },
  storage: { sync: { get: mockStorageGet, set: mockStorageSet } },
});

Element.prototype.scrollIntoView = vi.fn();

const OPTIONS_DOM = `
  <h1 id="options-title"></h1>
  <p id="options-subtitle"></p>
  <h2 id="options-form-heading"></h2>
  <h2 id="options-rules-heading"></h2>
  <label id="options-label-hostname"></label>
  <label id="options-label-select"></label>
  <label id="options-label-hide"></label>
  <input type="text" id="input-hostname" />
  <input type="text" id="input-select" />
  <textarea id="input-hide"></textarea>
  <p id="form-error" class="form-error" hidden></p>
  <button class="primary" id="btn-save"></button>
  <button id="btn-cancel" hidden></button>
  <div id="rules-list"></div>
`;

async function setupDOM(rules = {}) {
  document.body.innerHTML = OPTIONS_DOM;
  mockStorageGet.mockResolvedValue({ rules });
  mockStorageSet.mockResolvedValue(undefined);
  vi.resetModules();
  await import('../options.js');
  await new Promise((r) => setTimeout(r, 10));
}

function hostnameInput() {
  return document.getElementById('input-hostname');
}
function selectInput() {
  return document.getElementById('input-select');
}
function hideInput() {
  return document.getElementById('input-hide');
}
function saveBtn() {
  return document.getElementById('btn-save');
}
function cancelBtn() {
  return document.getElementById('btn-cancel');
}
function formError() {
  return document.getElementById('form-error');
}
function rulesList() {
  return document.getElementById('rules-list');
}

async function clickSave() {
  saveBtn().click();
  await new Promise((r) => setTimeout(r, 10));
}

describe('options — initialization', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetMessage.mockImplementation((key) => key);
    await setupDOM();
  });

  it('populates static labels from i18n', () => {
    expect(document.getElementById('options-title').textContent).toBe('optionsTitle');
    expect(document.getElementById('options-subtitle').textContent).toBe(
      'optionsSubtitle'
    );
    expect(document.getElementById('btn-save').textContent).toBe('optionsSaveRule');
  });

  it('renders the empty-rules message on first load', () => {
    expect(rulesList().querySelector('.empty')).not.toBeNull();
  });

  it('cancel button is hidden initially', () => {
    expect(cancelBtn().hidden).toBe(true);
  });

  it('hostname input is enabled initially', () => {
    expect(hostnameInput().disabled).toBe(false);
  });

  it('form error is hidden initially', () => {
    expect(formError().hidden).toBe(true);
  });
});

describe('options — renderRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMessage.mockImplementation((key) => key);
  });

  it('renders a card for each rule', async () => {
    await setupDOM({
      'example.com': { select: '.content', hide: ['.ads'] },
      'other.org': { hide: ['.sidebar'] },
    });
    expect(rulesList().querySelectorAll('.rule-card').length).toBe(2);
  });

  it('renders a select badge when the rule has a select selector', async () => {
    await setupDOM({ 'example.com': { select: '.content' } });
    const badge = rulesList().querySelector('.rule-type.select');
    expect(badge).not.toBeNull();
    expect(badge.nextElementSibling.textContent).toBe('.content');
  });

  it('renders hide badges for each hide selector', async () => {
    await setupDOM({ 'example.com': { hide: ['.ads', '.sidebar'] } });
    const badges = rulesList().querySelectorAll('.rule-type.hide');
    expect(badges.length).toBe(2);
  });

  it('renders no select badge when the rule has no select', async () => {
    await setupDOM({ 'example.com': { hide: ['.ads'] } });
    expect(rulesList().querySelector('.rule-type.select')).toBeNull();
  });

  it('renders no hide badges when the rule has no hide array', async () => {
    await setupDOM({ 'example.com': { select: '.content' } });
    expect(rulesList().querySelectorAll('.rule-type.hide').length).toBe(0);
  });

  it('shows the hostname in the card header', async () => {
    await setupDOM({ 'test.com': { select: '.x' } });
    expect(rulesList().querySelector('.rule-hostname').textContent).toBe('test.com');
  });
});

describe('options — delete rule', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetMessage.mockImplementation((key) => key);
    await setupDOM({ 'example.com': { select: '.content' } });
  });

  it('removes the card after clicking delete', async () => {
    mockStorageGet.mockResolvedValue({
      rules: { 'example.com': { select: '.content' } },
    });
    const deleteBtn = rulesList().querySelector('.btn-delete');
    deleteBtn.click();
    await new Promise((r) => setTimeout(r, 10));
    expect(rulesList().querySelector('.rule-card')).toBeNull();
  });
});

describe('options — edit rule', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetMessage.mockImplementation((key) => key);
    await setupDOM({
      'example.com': { select: '.content', hide: ['.ads', '.sidebar'] },
    });
  });

  it('populates the form with existing values on edit click', () => {
    rulesList().querySelector('.btn-edit').click();
    expect(hostnameInput().value).toBe('example.com');
    expect(selectInput().value).toBe('.content');
    expect(hideInput().value).toBe('.ads\n.sidebar');
  });

  it('disables the hostname input in edit mode', () => {
    rulesList().querySelector('.btn-edit').click();
    expect(hostnameInput().disabled).toBe(true);
  });

  it('shows the cancel button in edit mode', () => {
    rulesList().querySelector('.btn-edit').click();
    expect(cancelBtn().hidden).toBe(false);
  });

  it('changes save button label to update in edit mode', () => {
    rulesList().querySelector('.btn-edit').click();
    expect(saveBtn().textContent).toBe('optionsUpdateRule');
  });

  it('resets the form on cancel', () => {
    rulesList().querySelector('.btn-edit').click();
    cancelBtn().click();
    expect(hostnameInput().value).toBe('');
    expect(hostnameInput().disabled).toBe(false);
    expect(cancelBtn().hidden).toBe(true);
    expect(saveBtn().textContent).toBe('optionsSaveRule');
  });

  it('populates empty strings when rule has no select or hide', async () => {
    await setupDOM({ 'bare.com': {} });
    rulesList().querySelector('.btn-edit').click();
    expect(selectInput().value).toBe('');
    expect(hideInput().value).toBe('');
  });
});

describe('options — save validation', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetMessage.mockImplementation((key) => key);
    await setupDOM({});
  });

  it('does nothing when hostname is empty', async () => {
    hostnameInput().value = '';
    selectInput().value = '.content';
    await clickSave();
    expect(mockStorageSet).not.toHaveBeenCalled();
  });

  it('does nothing when hostname is present but no selectors provided', async () => {
    hostnameInput().value = 'example.com';
    selectInput().value = '';
    hideInput().value = '';
    await clickSave();
    expect(mockStorageSet).not.toHaveBeenCalled();
  });

  it('shows error for hostname containing a space', async () => {
    hostnameInput().value = 'bad hostname.com';
    selectInput().value = '.content';
    await clickSave();
    expect(formError().hidden).toBe(false);
    expect(formError().textContent).toBe('optionsErrorHostname');
  });

  it('shows error for hostname containing a slash', async () => {
    hostnameInput().value = 'example.com/path';
    selectInput().value = '.content';
    await clickSave();
    expect(formError().hidden).toBe(false);
  });

  it('shows error for hostname containing a colon', async () => {
    hostnameInput().value = 'example.com:8080';
    selectInput().value = '.content';
    await clickSave();
    expect(formError().hidden).toBe(false);
  });

  it('shows error for an invalid select selector', async () => {
    hostnameInput().value = 'example.com';
    selectInput().value = '[invalid:::selector';
    await clickSave();
    expect(formError().hidden).toBe(false);
    expect(formError().textContent).toBe('optionsErrorSelector');
  });

  it('shows error for an invalid hide selector', async () => {
    hostnameInput().value = 'example.com';
    selectInput().value = '';
    hideInput().value = '[invalid:::selector';
    await clickSave();
    expect(formError().hidden).toBe(false);
    expect(formError().textContent).toBe('optionsErrorSelector');
  });

  it('clears error on each save attempt', async () => {
    hostnameInput().value = 'bad hostname';
    selectInput().value = '.x';
    await clickSave();
    expect(formError().hidden).toBe(false);

    hostnameInput().value = 'example.com';
    await clickSave();
    expect(formError().hidden).toBe(true);
  });
});

describe('options — save in add mode', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetMessage.mockImplementation((key) => key);
    await setupDOM({});
  });

  it('saves a new rule with select and hide', async () => {
    hostnameInput().value = 'example.com';
    selectInput().value = '.content';
    hideInput().value = '.ads\n.sidebar';
    await clickSave();

    expect(mockStorageSet).toHaveBeenCalledWith({
      rules: {
        'example.com': { select: '.content', hide: ['.ads', '.sidebar'] },
      },
    });
  });

  it('saves a rule with only a select selector', async () => {
    hostnameInput().value = 'example.com';
    selectInput().value = '.content';
    hideInput().value = '';
    await clickSave();

    const saved = mockStorageSet.mock.calls[0][0];
    expect(saved.rules['example.com'].select).toBe('.content');
    expect(saved.rules['example.com'].hide).toEqual([]);
  });

  it('saves a rule with only hide selectors (no select key)', async () => {
    hostnameInput().value = 'example.com';
    selectInput().value = '';
    hideInput().value = '.ads';
    await clickSave();

    const saved = mockStorageSet.mock.calls[0][0];
    expect(saved.rules['example.com']).not.toHaveProperty('select');
    expect(saved.rules['example.com'].hide).toEqual(['.ads']);
  });

  it('normalises the hostname to lowercase', async () => {
    hostnameInput().value = 'Example.COM';
    selectInput().value = '.content';
    await clickSave();

    const saved = mockStorageSet.mock.calls[0][0];
    expect(saved.rules).toHaveProperty('example.com');
  });

  it('merges hide selectors with an existing rule', async () => {
    mockStorageGet.mockResolvedValue({
      rules: { 'example.com': { select: '.old', hide: ['.existing'] } },
    });
    hostnameInput().value = 'example.com';
    selectInput().value = '';
    hideInput().value = '.new';
    await clickSave();

    const saved = mockStorageSet.mock.calls[0][0];
    expect(saved.rules['example.com'].hide).toEqual(['.existing', '.new']);
    expect(saved.rules['example.com'].select).toBe('.old');
  });

  it('deduplicates hide selectors when merging', async () => {
    mockStorageGet.mockResolvedValue({
      rules: { 'example.com': { hide: ['.ads'] } },
    });
    hostnameInput().value = 'example.com';
    selectInput().value = '';
    hideInput().value = '.ads\n.new';
    await clickSave();

    const saved = mockStorageSet.mock.calls[0][0];
    expect(saved.rules['example.com'].hide).toEqual(['.ads', '.new']);
  });

  it('resets the form after saving', async () => {
    hostnameInput().value = 'example.com';
    selectInput().value = '.content';
    await clickSave();

    expect(hostnameInput().value).toBe('');
    expect(selectInput().value).toBe('');
    expect(cancelBtn().hidden).toBe(true);
  });
});

describe('options — save in edit mode', () => {
  const INITIAL_RULES = { 'example.com': { select: '.content', hide: ['.ads'] } };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetMessage.mockImplementation((key) => key);
    await setupDOM(INITIAL_RULES);
    rulesList().querySelector('.btn-edit').click();
  });

  it('updates the rule under the same hostname', async () => {
    selectInput().value = '.new-content';
    hideInput().value = '.new-ads';
    await clickSave();

    const saved = mockStorageSet.mock.calls[0][0];
    expect(saved.rules['example.com'].select).toBe('.new-content');
    expect(saved.rules['example.com'].hide).toEqual(['.new-ads']);
  });

  it('does not create duplicate hostname keys when saving in edit mode', async () => {
    mockStorageGet.mockResolvedValue({ rules: INITIAL_RULES });
    selectInput().value = '.updated';
    hideInput().value = '';
    await clickSave();

    const saved = mockStorageSet.mock.calls[0][0];
    expect(Object.keys(saved.rules)).toEqual(['example.com']);
  });

  it('resets to add mode after saving in edit mode', async () => {
    selectInput().value = '.x';
    hideInput().value = '';
    await clickSave();

    expect(hostnameInput().disabled).toBe(false);
    expect(cancelBtn().hidden).toBe(true);
    expect(saveBtn().textContent).toBe('optionsSaveRule');
  });
});
