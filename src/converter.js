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
    return `\n\`\`\`${lang}\n${node.firstChild.textContent.trimEnd()}\n\`\`\`\n`;
  },
});

// Tags that add chrome around the main content — strip them before converting
// so the output isn't polluted with menus, footers, and tracking scripts.
const STRIP_TAGS = ['nav', 'footer', 'aside', 'script', 'style', 'noscript'];

// Match a hostname against a rules key, supporting subdomains:
// key "example.com" matches "example.com" and "www.example.com".
function findRules(hostname, rules) {
  const entry = Object.keys(rules).find(
    (key) => hostname === key || hostname.endsWith(`.${key}`)
  );
  return entry ? rules[entry] : {};
}

export function extractMarkdown(document, rules = {}) {
  const siteRules = findRules(document.location.hostname, rules);

  // Use the site-specific select rule if defined, then fall back to
  // <article> (semantic main content), then <body>.
  const root =
    (siteRules.select && document.querySelector(siteRules.select)) ??
    document.querySelector('article') ??
    document.body;

  // Clone so we can mutate (strip tags) without touching the live DOM.
  const clone = root.cloneNode(true);

  const hideSelectors = [...STRIP_TAGS, ...(siteRules.hide ?? [])];
  hideSelectors.forEach((selector) => {
    try {
      clone.querySelectorAll(selector).forEach((el) => el.remove());
    } catch {
      // Invalid selectors should not break the conversion.
    }
  });

  const title = document.title ? `# ${document.title}\n\n` : '';
  const url = `> Source: ${document.location.href}\n\n`;
  return title + url + td.turndown(clone.innerHTML);
}
