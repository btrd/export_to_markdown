import { extractMarkdown } from './converter.js';

browser.runtime.onMessage.addListener((msg) => {
  if (msg.type !== 'GET_MARKDOWN') return;
  return Promise.resolve({ markdown: extractMarkdown(document) });
});
