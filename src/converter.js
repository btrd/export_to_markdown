import TurndownService from 'turndown';

const td = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

// Override the default code block rule so that ```lang fences are emitted
// instead of indented blocks, and the language hint is preserved from
// the CSS class (e.g. class="language-js" → ```js).
td.addRule('fencedCodeBlock', {
  filter: (node) =>
    node.nodeName === 'PRE' && node.firstChild?.nodeName === 'CODE',
  replacement: (_, node) => {
    const lang =
      node.firstChild.getAttribute('class')?.match(/language-(\S+)/)?.[1] ?? '';
    return `\n\`\`\`${lang}\n${node.firstChild.textContent}\n\`\`\`\n`;
  },
});

// Tags that add chrome around the main content — strip them before converting
// so the output isn't polluted with menus, footers, and tracking scripts.
const STRIP_TAGS = ['nav', 'footer', 'aside', 'script', 'style', 'noscript'];

export function extractMarkdown(document) {
  // Prefer <article> when present — it's the semantic main content element.
  // Fall back to <body> for pages that don't use it.
  const article = document.querySelector('article') ?? document.body;

  // Clone so we can mutate (strip tags) without touching the live DOM.
  const clone = article.cloneNode(true);
  STRIP_TAGS.forEach((tag) => clone.querySelectorAll(tag).forEach((el) => el.remove()));

  const title = document.title ? `# ${document.title}\n\n` : '';
  const url = `> Source: ${document.location.href}\n\n`;
  return title + url + td.turndown(clone.innerHTML);
}
