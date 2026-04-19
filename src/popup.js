// Wrapper so callers don't need to pass undefined explicitly when there are no
// substitutions — browser.i18n.getMessage treats an empty array differently
// from undefined in some Firefox versions.
const i18n = (key, ...subs) => browser.i18n.getMessage(key, subs.length ? subs : undefined);

const RTL_LOCALES = ['ar', 'he', 'fa', 'ur'];
if (RTL_LOCALES.includes(browser.i18n.getUILanguage().split('-')[0])) {
  document.documentElement.setAttribute('dir', 'rtl');
}

// Populate all static labels from the active locale.
document.getElementById('title').textContent        = i18n('popupTitle');
document.getElementById('mode-single').textContent  = i18n('modeSingle');
document.getElementById('mode-multi').textContent   = i18n('modeMultiple');
document.getElementById('copy').textContent         = i18n('copyButton');
document.getElementById('select-all').textContent   = i18n('selectAll');
document.getElementById('deselect-all').textContent = i18n('deselectAll');

// ── Helpers ──────────────────────────────────────────────────────────────────

// browser:, about:, moz-extension: etc. cannot be scripted — attempting to
// inject content.js into them throws a permission error.
const RESTRICTED = /^(about:|moz-extension:|chrome:|data:|javascript:)/;

function isRestricted(url) {
  return !url || RESTRICTED.test(url);
}

// Injects the content script if not already present, then asks it to convert
// the page. executeScript is idempotent — re-injecting is safe.
async function fetchMarkdown(tabId) {
  await browser.scripting.executeScript({ target: { tabId }, files: ['dist/content.js'] });
  const response = await browser.tabs.sendMessage(tabId, { type: 'GET_MARKDOWN' });
  return response?.markdown ?? '';
}

// ── Single-page mode ─────────────────────────────────────────────────────────

const copyBtn = document.getElementById('copy');
const resetTimers = new WeakMap();

// Applies a visual state (success/error) to a button and resets it after 2 s.
function setBtn(btn, state, label, resetLabel) {
  btn.className = `action-btn${state ? ` ${state}` : ''}`;
  btn.textContent = label;
  clearTimeout(resetTimers.get(btn));
  if (resetLabel !== undefined) {
    resetTimers.set(btn, setTimeout(() => setBtn(btn, '', resetLabel), 2000));
  }
}

copyBtn.addEventListener('click', async () => {
  copyBtn.textContent = i18n('copying');
  copyBtn.disabled = true;
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs.length) throw new Error('no active tab');
    const markdown = await fetchMarkdown(tabs[0].id);
    await navigator.clipboard.writeText(markdown);
    setBtn(copyBtn, 'success', i18n('copied'), i18n('copyButton'));
  } catch {
    setBtn(copyBtn, 'error', i18n('copyError'), i18n('copyButton'));
  } finally {
    copyBtn.disabled = false;
  }
});

// ── Multi-page mode ───────────────────────────────────────────────────────────

const copyMultiBtn = document.getElementById('copy-multi');

function updateCopyMultiBtn() {
  const checked = document.querySelectorAll('#tab-list input:checked');
  const n = checked.length;
  copyMultiBtn.disabled = n === 0;
  copyMultiBtn.textContent = n > 0
    ? i18n('copySelected', String(n))
    : i18n('noTabsSelected');
}

async function renderTabList() {
  const tabList = document.getElementById('tab-list');
  tabList.innerHTML = '';

  // Fetch both lists in parallel — highlighted tabs are used to pre-check
  // any tabs the user already Ctrl+clicked before opening the popup.
  const [allTabs, highlightedTabs] = await Promise.all([
    browser.tabs.query({ currentWindow: true }),
    browser.tabs.query({ highlighted: true, currentWindow: true }),
  ]);
  const highlightedIds = new Set(highlightedTabs.map((t) => t.id));

  for (const tab of allTabs) {
    const restricted = isRestricted(tab.url);

    const item = document.createElement('label');
    item.className = `tab-item${restricted ? ' restricted' : ''}`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.tabId = tab.id;
    checkbox.disabled = restricted;
    checkbox.checked = !restricted && highlightedIds.has(tab.id);
    checkbox.addEventListener('change', updateCopyMultiBtn);

    const favicon = tab.favIconUrl
      ? Object.assign(document.createElement('img'), {
          src: tab.favIconUrl,
          className: 'tab-favicon',
          alt: '',
        })
      : Object.assign(document.createElement('span'), {
          className: 'tab-favicon-placeholder',
        });

    const title = Object.assign(document.createElement('span'), {
      className: 'tab-title',
      textContent: tab.title || tab.url,
      title: tab.title || tab.url,
    });

    item.append(checkbox, favicon, title);
    tabList.appendChild(item);
  }

  updateCopyMultiBtn();
}

document.getElementById('select-all').addEventListener('click', () => {
  document.querySelectorAll('#tab-list input:not(:disabled)').forEach((cb) => {
    cb.checked = true;
  });
  updateCopyMultiBtn();
});

document.getElementById('deselect-all').addEventListener('click', () => {
  document.querySelectorAll('#tab-list input:not(:disabled)').forEach((cb) => {
    cb.checked = false;
  });
  updateCopyMultiBtn();
});

copyMultiBtn.addEventListener('click', async () => {
  const checkboxes = [...document.querySelectorAll('#tab-list input:checked')];
  const tabIds = checkboxes.map((cb) => Number(cb.dataset.tabId));

  copyMultiBtn.textContent = i18n('copying');
  copyMultiBtn.disabled = true;

  try {
    // Use allSettled so a single failing tab doesn't abort the whole batch.
    const results = await Promise.allSettled(tabIds.map((id) => fetchMarkdown(id)));
    const pages = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value);

    if (pages.length === 0) throw new Error('all tabs failed');

    await navigator.clipboard.writeText(pages.join('\n\n---\n\n'));
    setBtn(copyMultiBtn, 'success', i18n('copied'), i18n('copySelected', String(tabIds.length)));
  } catch {
    setBtn(copyMultiBtn, 'error', i18n('copyError'), i18n('noTabsSelected'));
  } finally {
    copyMultiBtn.disabled = false;
  }
});

// ── Mode toggle ───────────────────────────────────────────────────────────────

const panelSingle   = document.getElementById('panel-single');
const panelMulti    = document.getElementById('panel-multi');
const modeSingleBtn = document.getElementById('mode-single');
const modeMultiBtn  = document.getElementById('mode-multi');

function switchToSingle() {
  modeSingleBtn.classList.add('active');
  modeMultiBtn.classList.remove('active');
  panelSingle.hidden = false;
  panelMulti.hidden  = true;
}

function switchToMulti() {
  modeMultiBtn.classList.add('active');
  modeSingleBtn.classList.remove('active');
  panelSingle.hidden = true;
  panelMulti.hidden  = false;
  renderTabList();
}

modeSingleBtn.addEventListener('click', switchToSingle);
modeMultiBtn.addEventListener('click', switchToMulti);

// If the user already Ctrl+selected multiple tabs before opening the popup,
// default to multi mode so they don't have to switch manually.
browser.tabs.query({ highlighted: true, currentWindow: true }).then((tabs) => {
  if (tabs.length > 1) switchToMulti();
});
