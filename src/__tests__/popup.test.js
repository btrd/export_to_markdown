import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetMessage = vi.fn((key) => key);
const mockGetUILanguage = vi.fn(() => 'en');
const mockQuery = vi.fn();
const mockExecuteScript = vi.fn();
const mockSendMessage = vi.fn();
const mockWriteText = vi.fn();

vi.stubGlobal('browser', {
  i18n: { getMessage: mockGetMessage, getUILanguage: mockGetUILanguage },
  tabs: { query: mockQuery, sendMessage: mockSendMessage },
  scripting: { executeScript: mockExecuteScript },
});
vi.stubGlobal('navigator', { clipboard: { writeText: mockWriteText } });

async function setupDOM() {
  document.documentElement.removeAttribute('dir');
  document.body.innerHTML = `
    <h1 id="title"></h1>
    <div class="mode-tabs">
      <button id="mode-single" class="active"></button>
      <button id="mode-multi"></button>
    </div>
    <div id="panel-single"><button id="copy" class="action-btn"></button></div>
    <div id="panel-multi" hidden>
      <div class="tab-actions">
        <button id="select-all"></button>
        <button id="deselect-all"></button>
      </div>
      <div id="tab-list"></div>
      <button id="copy-multi" class="action-btn" disabled></button>
    </div>
  `;
  vi.resetModules();
  await import('../popup.js');
  await Promise.resolve();
}

const TABS = [
  { id: 1, title: 'Page One', url: 'https://one.com/', favIconUrl: '' },
  { id: 2, title: 'Page Two', url: 'https://two.com/', favIconUrl: '' },
  { id: 3, title: 'About blank', url: 'about:blank',   favIconUrl: '' },
];

describe('popup — single page mode', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetMessage.mockImplementation((key) => key);
    mockGetUILanguage.mockReturnValue('en');
    mockQuery.mockResolvedValue([TABS[0]]);
    await setupDOM();
  });

  it('sets title and button text from i18n on load', () => {
    expect(document.getElementById('title').textContent).toBe('popupTitle');
    expect(document.getElementById('copy').textContent).toBe('copyButton');
  });

  it('shows copying state while fetching', async () => {
    mockExecuteScript.mockResolvedValue([]);
    mockSendMessage.mockReturnValue(new Promise(() => {}));

    document.getElementById('copy').click();
    await Promise.resolve();

    expect(document.getElementById('copy').textContent).toBe('copying');
    expect(document.getElementById('copy').disabled).toBe(true);
  });

  it('shows success state after copy', async () => {
    mockExecuteScript.mockResolvedValue([]);
    mockSendMessage.mockResolvedValue({ markdown: '# Hello' });
    mockWriteText.mockResolvedValue(undefined);

    document.getElementById('copy').click();
    await new Promise((r) => setTimeout(r, 50));

    const btn = document.getElementById('copy');
    expect(btn.textContent).toBe('copied');
    expect(btn.className).toContain('success');
    expect(btn.disabled).toBe(false);
  });

  it('copies empty string when sendMessage returns null', async () => {
    mockExecuteScript.mockResolvedValue([]);
    mockSendMessage.mockResolvedValue(null);
    mockWriteText.mockResolvedValue(undefined);

    document.getElementById('copy').click();
    await new Promise((r) => setTimeout(r, 50));

    expect(mockWriteText).toHaveBeenCalledWith('');
    expect(document.getElementById('copy').textContent).toBe('copied');
  });

  it('shows error state when no active tab is found', async () => {
    mockQuery.mockResolvedValue([]);
    document.getElementById('copy').click();
    await new Promise((r) => setTimeout(r, 50));

    const btn = document.getElementById('copy');
    expect(btn.textContent).toBe('copyError');
    expect(btn.className).toContain('error');
  });

  it('shows error state when clipboard write fails', async () => {
    mockExecuteScript.mockResolvedValue([]);
    mockSendMessage.mockResolvedValue({ markdown: '# Hello' });
    mockWriteText.mockRejectedValue(new Error('denied'));

    document.getElementById('copy').click();
    await new Promise((r) => setTimeout(r, 50));

    const btn = document.getElementById('copy');
    expect(btn.textContent).toBe('copyError');
    expect(btn.className).toContain('error');
  });

  it('resets button label after 2 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockExecuteScript.mockResolvedValue([]);
    mockSendMessage.mockResolvedValue({ markdown: '# Hello' });
    mockWriteText.mockResolvedValue(undefined);

    document.getElementById('copy').click();
    await vi.runAllTimersAsync();

    expect(document.getElementById('copy').textContent).toBe('copyButton');
    expect(document.getElementById('copy').className).not.toContain('success');
    vi.useRealTimers();
  });

  it('resets copy button label after 2 seconds on error', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockExecuteScript.mockResolvedValue([]);
    mockSendMessage.mockRejectedValue(new Error('denied'));

    document.getElementById('copy').click();
    await vi.runAllTimersAsync();

    expect(document.getElementById('copy').textContent).toBe('copyButton');
    expect(document.getElementById('copy').className).not.toContain('error');
    vi.useRealTimers();
  });

  it('sets dir=rtl for Arabic locale', async () => {
    mockGetUILanguage.mockReturnValue('ar');
    await setupDOM();
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
  });

  it('does not set dir=rtl for English locale', () => {
    expect(document.documentElement.getAttribute('dir')).toBeNull();
  });
});

describe('popup — multi-page mode', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetMessage.mockImplementation((key, args) =>
      args ? `${key}(${args})` : key
    );
    mockGetUILanguage.mockReturnValue('en');
    await setupDOM();
  });

  async function openMultiMode() {
    mockQuery
      .mockResolvedValueOnce(TABS)                 // allTabs
      .mockResolvedValueOnce([TABS[0], TABS[1]]); // highlightedTabs
    document.getElementById('mode-multi').click();
    await new Promise((r) => setTimeout(r, 50));
  }

  it('switches to multi panel on mode click', async () => {
    await openMultiMode();
    expect(document.getElementById('panel-single').hidden).toBe(true);
    expect(document.getElementById('panel-multi').hidden).toBe(false);
  });

  it('renders one row per tab', async () => {
    await openMultiMode();
    const rows = document.querySelectorAll('#tab-list .tab-item');
    expect(rows.length).toBe(TABS.length);
  });

  it('pre-checks highlighted tabs', async () => {
    await openMultiMode();
    const checkboxes = document.querySelectorAll('#tab-list input');
    expect(checkboxes[0].checked).toBe(true);
    expect(checkboxes[1].checked).toBe(true);
  });

  it('uses the url as label when a tab has no title', async () => {
    const noTitle = [{ id: 5, title: '', url: 'https://notitle.com/', favIconUrl: '' }];
    mockQuery
      .mockResolvedValueOnce(noTitle)
      .mockResolvedValueOnce([noTitle[0]]);
    document.getElementById('mode-multi').click();
    await new Promise((r) => setTimeout(r, 50));

    const span = document.querySelector('#tab-list .tab-title');
    expect(span.textContent).toBe('https://notitle.com/');
  });

  it('renders an img for tabs with a favIconUrl', async () => {
    const withIcon = [{ id: 4, title: 'Icon Tab', url: 'https://icon.com/', favIconUrl: 'https://icon.com/icon.png' }];
    mockQuery
      .mockResolvedValueOnce(withIcon)
      .mockResolvedValueOnce([withIcon[0]]);
    document.getElementById('mode-multi').click();
    await new Promise((r) => setTimeout(r, 50));

    const img = document.querySelector('#tab-list img.tab-favicon');
    expect(img).not.toBeNull();
    expect(img.src).toBe('https://icon.com/icon.png');
    expect(img.alt).toBe('');
  });

  it('disables restricted tabs', async () => {
    await openMultiMode();
    const checkboxes = document.querySelectorAll('#tab-list input');
    expect(checkboxes[2].disabled).toBe(true);
  });

  it('select-all checks all non-restricted tabs', async () => {
    await openMultiMode();
    document.getElementById('deselect-all').click();
    document.getElementById('select-all').click();
    const enabled = [...document.querySelectorAll('#tab-list input:not(:disabled)')];
    expect(enabled.every((cb) => cb.checked)).toBe(true);
  });

  it('deselect-all unchecks all tabs', async () => {
    await openMultiMode();
    document.getElementById('deselect-all').click();
    const enabled = [...document.querySelectorAll('#tab-list input:not(:disabled)')];
    expect(enabled.every((cb) => !cb.checked)).toBe(true);
  });

  it('copy button is disabled when nothing selected', async () => {
    await openMultiMode();
    document.getElementById('deselect-all').click();
    expect(document.getElementById('copy-multi').disabled).toBe(true);
  });

  it('copy button label shows selected count', async () => {
    await openMultiMode();
    expect(document.getElementById('copy-multi').textContent).toBe('copySelected(2)');
  });

  it('copies concatenated markdown from selected tabs', async () => {
    await openMultiMode();
    mockExecuteScript.mockResolvedValue([]);
    mockSendMessage
      .mockResolvedValueOnce({ markdown: '# Page One' })
      .mockResolvedValueOnce({ markdown: '# Page Two' });
    mockWriteText.mockResolvedValue(undefined);

    document.getElementById('copy-multi').click();
    await new Promise((r) => setTimeout(r, 100));

    expect(mockWriteText).toHaveBeenCalledWith('# Page One\n\n---\n\n# Page Two');
  });

  it('skips failed tabs and copies the rest', async () => {
    await openMultiMode();
    mockExecuteScript.mockResolvedValue([]);
    mockSendMessage
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce({ markdown: '# Page Two' });
    mockWriteText.mockResolvedValue(undefined);

    document.getElementById('copy-multi').click();
    await new Promise((r) => setTimeout(r, 100));

    expect(mockWriteText).toHaveBeenCalledWith('# Page Two');
    expect(document.getElementById('copy-multi').textContent).toBe('copied');
  });

  it('shows error when all tabs fail', async () => {
    await openMultiMode();
    mockExecuteScript.mockResolvedValue([]);
    mockSendMessage.mockRejectedValue(new Error('failed'));
    mockWriteText.mockResolvedValue(undefined);

    document.getElementById('copy-multi').click();
    await new Promise((r) => setTimeout(r, 100));

    expect(document.getElementById('copy-multi').textContent).toBe('copyError');
  });

  it('resets copy-multi button label after 2 seconds', async () => {
    await openMultiMode();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockExecuteScript.mockResolvedValue([]);
    mockSendMessage
      .mockResolvedValueOnce({ markdown: '# Page One' })
      .mockResolvedValueOnce({ markdown: '# Page Two' });
    mockWriteText.mockResolvedValue(undefined);

    document.getElementById('copy-multi').click();
    await vi.runAllTimersAsync();

    expect(document.getElementById('copy-multi').textContent).toBe('copySelected(2)');
    expect(document.getElementById('copy-multi').className).not.toContain('success');
    vi.useRealTimers();
  });

  it('switches back to single panel', async () => {
    await openMultiMode();
    document.getElementById('mode-single').click();
    expect(document.getElementById('panel-single').hidden).toBe(false);
    expect(document.getElementById('panel-multi').hidden).toBe(true);
  });

  it('opens in multi mode automatically when multiple tabs are highlighted', async () => {
    mockQuery
      .mockResolvedValueOnce([TABS[0], TABS[1]]) // initial highlighted check → 2 tabs
      .mockResolvedValueOnce(TABS)                // allTabs in renderTabList
      .mockResolvedValueOnce([TABS[0], TABS[1]]); // highlightedTabs in renderTabList
    await setupDOM();
    await new Promise((r) => setTimeout(r, 50));

    expect(document.getElementById('panel-multi').hidden).toBe(false);
    expect(document.getElementById('panel-single').hidden).toBe(true);
    expect(document.getElementById('mode-multi').classList.contains('active')).toBe(true);
  });

  it('opens in single mode when only one tab is highlighted', async () => {
    mockQuery.mockResolvedValueOnce([TABS[0]]); // initial highlighted check → 1 tab
    await setupDOM();
    await new Promise((r) => setTimeout(r, 50));

    expect(document.getElementById('panel-single').hidden).toBe(false);
    expect(document.getElementById('panel-multi').hidden).toBe(true);
  });
});
