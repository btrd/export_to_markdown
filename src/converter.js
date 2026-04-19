import TurndownService from 'turndown';

const td = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

td.addRule('fencedCodeBlock', {
  filter: (node) =>
    node.nodeName === 'PRE' && node.firstChild?.nodeName === 'CODE',
  replacement: (_, node) => {
    const lang =
      node.firstChild.getAttribute('class')?.match(/language-(\S+)/)?.[1] ?? '';
    return `\n\`\`\`${lang}\n${node.firstChild.textContent}\n\`\`\`\n`;
  },
});

const STRIP_TAGS = ['nav', 'footer', 'aside', 'script', 'style', 'noscript'];

export function extractMarkdown(document) {
  const article = document.querySelector('article') ?? document.body;
  const clone = article.cloneNode(true);
  STRIP_TAGS.forEach((tag) => clone.querySelectorAll(tag).forEach((el) => el.remove()));

  const title = document.title ? `# ${document.title}\n\n` : '';
  const url = `> Source: ${document.location.href}\n\n`;
  return title + url + td.turndown(clone.innerHTML);
}
