import { extractMarkdown } from './converter.js';

browser.runtime.onMessage.addListener((msg) => {
  if (msg.type !== 'GET_MARKDOWN') return;
  return browser.storage.sync.get('rules').then(({ rules = {} }) => ({
    markdown: extractMarkdown(document, rules),
  }));
});
