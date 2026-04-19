import { describe, it, expect, vi, beforeEach } from 'vitest';

let messageListener;
const mockAddListener = vi.fn((fn) => { messageListener = fn; });
const mockStorageGet = vi.fn();

vi.stubGlobal('browser', {
  runtime: { onMessage: { addListener: mockAddListener } },
  storage: { sync: { get: mockStorageGet } },
});

describe('content script', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockAddListener.mockImplementation((fn) => { messageListener = fn; });
    vi.resetModules();
    await import('../content.js');
  });

  it('registers a message listener on load', () => {
    expect(mockAddListener).toHaveBeenCalledOnce();
    expect(typeof messageListener).toBe('function');
  });

  it('returns undefined for non-GET_MARKDOWN messages', () => {
    expect(messageListener({ type: 'OTHER' })).toBeUndefined();
    expect(messageListener({ type: 'PING' })).toBeUndefined();
  });

  it('returns a promise with markdown for GET_MARKDOWN', async () => {
    mockStorageGet.mockResolvedValue({ rules: {} });
    const result = messageListener({ type: 'GET_MARKDOWN' });
    expect(result).toBeInstanceOf(Promise);
    const response = await result;
    expect(response).toHaveProperty('markdown');
    expect(typeof response.markdown).toBe('string');
  });

  it('defaults to empty rules when storage has no rules key', async () => {
    mockStorageGet.mockResolvedValue({});
    const response = await messageListener({ type: 'GET_MARKDOWN' });
    expect(response).toHaveProperty('markdown');
  });

  it('passes stored rules to extractMarkdown', async () => {
    const rules = { 'example.com': { hide: ['nav'] } };
    mockStorageGet.mockResolvedValue({ rules });
    const response = await messageListener({ type: 'GET_MARKDOWN' });
    expect(response.markdown).toBeDefined();
  });
});
