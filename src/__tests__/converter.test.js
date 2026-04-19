import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { extractMarkdown } from '../converter.js';

function makeDocument(body, { title = '', href = 'https://example.com/' } = {}) {
  const dom = new JSDOM(`<!DOCTYPE html><body>${body}</body>`, {
    url: href,
  });
  Object.defineProperty(dom.window.document, 'title', { value: title, writable: true });
  return dom.window.document;
}

describe('extractMarkdown', () => {
  it('includes the page title as an h1', () => {
    const doc = makeDocument('<p>Hello</p>', { title: 'My Page' });
    expect(extractMarkdown(doc)).toMatch(/^# My Page/);
  });

  it('includes the source URL as a blockquote', () => {
    const doc = makeDocument('<p>Hello</p>', { href: 'https://example.com/article' });
    expect(extractMarkdown(doc)).toContain('> Source: https://example.com/article');
  });

  it('converts headings to ATX style', () => {
    const doc = makeDocument('<h1>Title</h1><h2>Sub</h2>');
    const md = extractMarkdown(doc);
    expect(md).toContain('# Title');
    expect(md).toContain('## Sub');
  });

  it('converts paragraphs to plain text', () => {
    const doc = makeDocument('<p>Hello world</p>');
    expect(extractMarkdown(doc)).toContain('Hello world');
  });

  it('converts bold and italic', () => {
    const doc = makeDocument('<p><strong>bold</strong> and <em>italic</em></p>');
    const md = extractMarkdown(doc);
    expect(md).toContain('**bold**');
    expect(md).toMatch(/[_*]italic[_*]/);
  });

  it('converts unordered lists with dash bullets', () => {
    const doc = makeDocument('<ul><li>One</li><li>Two</li></ul>');
    const md = extractMarkdown(doc);
    expect(md).toMatch(/^-\s+One/m);
    expect(md).toMatch(/^-\s+Two/m);
  });

  it('converts ordered lists', () => {
    const doc = makeDocument('<ol><li>First</li><li>Second</li></ol>');
    const md = extractMarkdown(doc);
    expect(md).toMatch(/^1\.\s+First/m);
    expect(md).toMatch(/^2\.\s+Second/m);
  });

  it('converts links', () => {
    const doc = makeDocument('<a href="https://example.com">Example</a>');
    expect(extractMarkdown(doc)).toContain('[Example](https://example.com)');
  });

  it('converts inline code', () => {
    const doc = makeDocument('<p><code>foo()</code></p>');
    expect(extractMarkdown(doc)).toContain('`foo()`');
  });

  it('converts fenced code blocks with language', () => {
    const doc = makeDocument('<pre><code class="language-js">const x = 1;</code></pre>');
    const md = extractMarkdown(doc);
    expect(md).toContain('```js');
    expect(md).toContain('const x = 1;');
    expect(md).toContain('```');
  });

  it('converts fenced code blocks without language', () => {
    const doc = makeDocument('<pre><code>plain code</code></pre>');
    expect(extractMarkdown(doc)).toContain('```\nplain code\n```');
  });

  it('strips <nav> elements', () => {
    const doc = makeDocument('<nav>Menu</nav><p>Content</p>');
    const md = extractMarkdown(doc);
    expect(md).not.toContain('Menu');
    expect(md).toContain('Content');
  });

  it('strips <footer> elements', () => {
    const doc = makeDocument('<footer>Footer</footer><p>Content</p>');
    expect(extractMarkdown(doc)).not.toContain('Footer');
  });

  it('strips <aside> elements', () => {
    const doc = makeDocument('<aside>Sidebar</aside><p>Content</p>');
    expect(extractMarkdown(doc)).not.toContain('Sidebar');
  });

  it('strips <script> elements', () => {
    const doc = makeDocument('<script>alert(1)</script><p>Content</p>');
    expect(extractMarkdown(doc)).not.toContain('alert');
  });

  it('prefers <article> over <body> when present', () => {
    const doc = makeDocument('<aside>Outside</aside><article><p>Inside</p></article>');
    const md = extractMarkdown(doc);
    expect(md).toContain('Inside');
    expect(md).not.toContain('Outside');
  });

  it('omits title line when document has no title', () => {
    const doc = makeDocument('<p>Content</p>', { title: '' });
    expect(extractMarkdown(doc)).not.toMatch(/^#\s/);
  });
});
