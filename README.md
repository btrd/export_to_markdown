# Export to Markdown — Firefox Extension

A Firefox extension that converts any web page to Markdown and copies it to your clipboard in one click.

## Features

- Extracts main content — prefers `<article>` over `<body>`, stripping `<nav>`, `<footer>`, `<aside>`, `<script>`, and `<style>` automatically
- Preserves headings, bold, italic, links, lists, inline code, and fenced code blocks with language hints
- Prepends the page title as `# H1` and the source URL as a blockquote
- **Single-page mode** — copy the current tab instantly
- **Multi-page mode** — select multiple open tabs, copy all at once separated by `---`; Ctrl+click tabs before opening the popup to pre-select them
- **Site-specific rules** — define per-hostname CSS selectors to pick a content root (`select`) or strip unwanted elements (`hide`) via the Settings page
- **Dark mode** popup and settings page (respects system `prefers-color-scheme`)
- Localized in 16 languages with RTL support

## Supported Languages

English · French · Spanish · German · Italian · Portuguese (BR & PT) · Japanese · Chinese (Simplified) · Arabic · Korean · Russian · Polish · Dutch · Turkish · Indonesian

## Site-Specific Rules

Open the extension's **Settings** page (right-click the toolbar icon → Manage Extension → Options, or via `about:addons`) to define per-site rules.

Each rule has:

| Field                   | Description                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| **Hostname**            | Base hostname, e.g. `leboncoin.fr`. Matches subdomains automatically (`www.leboncoin.fr` ✓). |
| **Select** _(optional)_ | CSS selector for the content root. Falls back to `article ?? body` if omitted or no match.   |
| **Hide**                | CSS selectors (one per line) for elements to strip before converting.                        |

Example — strip similar-ad sidebars on leboncoin:

```
Hostname : leboncoin.fr
Select   : [data-qa-id="adview-body"]
Hide     : [data-qa-id="adview-similar-ads"]
```

Saving a rule for a hostname that already exists **merges** the new hide selectors (deduplicated) rather than overwriting.

## Development

### Requirements

- Node.js 22 (see `.nvmrc`) — web-ext crashes on Node 24
- Yarn

### Setup

```bash
yarn install
```

### Build

```bash
yarn build       # one-shot build → dist/
yarn watch       # rebuild on file changes
```

### Lint

```bash
yarn lint        # check JS and JSON files
yarn lint:fix    # auto-fix
```

### Tests

```bash
yarn test              # run all specs (45 tests)
yarn test:watch        # watch mode
yarn test:coverage     # with coverage report
```

### Load in Firefox (development)

1. `yarn build`
2. Open `about:debugging` → **This Firefox** → **Load Temporary Add-on**
3. Select `manifest.json`

Or use web-ext for live-reloading:

```bash
yarn ext:run
```

### Package / Release

```bash
yarn package     # build + zip → export-to-markdown.xpi (unsigned, for sideloading)
```

For a signed release, push a version tag — the CI/CD pipeline handles the rest:

```bash
# bump version in manifest.json and package.json first
git tag v1.0.0
git push origin v1.0.0
```

The release workflow signs the XPI via the AMO API and attaches it to a GitHub Release.

## Project Structure

```
src/
  converter.js        # Pure HTML→Markdown logic (no browser APIs, fully testable)
  content.js          # Content script — reads storage rules, calls converter
  popup.js            # Popup UI — single/multi-page modes, i18n, RTL
  options.js          # Settings page — CRUD for site-specific rules
  __tests__/
    converter.test.js
    popup.test.js
_locales/             # i18n message files (one directory per locale)
icons/                # Extension icons — 48/96/128 px, light + dark variants
.github/
  workflows/
    ci.yml            # Lint + test on every push / PR
    release.yml       # Sign XPI and publish GitHub Release on v* tag push
  dependabot.yml      # Weekly dependency updates for npm and GitHub Actions
popup.html
options.html
manifest.json
web-ext-config.mjs
amo-metadata.json
```

## CI/CD

| Workflow | Trigger             | Steps                                                   |
| -------- | ------------------- | ------------------------------------------------------- |
| CI       | push / PR on `main` | lint, test                                              |
| Release  | `v*` tag push       | lint, test, sign XPI via AMO API, create GitHub Release |

The release workflow requires two repository secrets:

| Secret               | Where to get it                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `WEB_EXT_API_KEY`    | [addons.mozilla.org developer hub](https://addons.mozilla.org/developers/) → API credentials |
| `WEB_EXT_API_SECRET` | same                                                                                         |

## Architecture

The conversion pipeline is intentionally split so the core logic is testable without a browser:

```
content.js  ──read storage──▶  converter.js  ──turndown──▶  Markdown string
                                     ▲
                               (pure function, tested with jsdom)
```

`converter.js` exports a single `extractMarkdown(document, rules)` function that takes a DOM `document` and an optional rules map, and returns a Markdown string. It has no dependency on any browser extension API.

## License

MIT
