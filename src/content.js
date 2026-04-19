import { extractMarkdown } from './converter.js';
import { MSG_GET_MARKDOWN } from './constants.js';

browser.runtime.onMessage.addListener((msg) => {
  if (msg.type !== MSG_GET_MARKDOWN) return;
  return browser.storage.sync.get('rules').then(({ rules = {} }) => ({
    markdown: extractMarkdown(document, rules),
  }));
});
