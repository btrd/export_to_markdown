# Export to Markdown — Firefox Extension

A Firefox extension that converts any web page to Markdown and copies it to your clipboard.

## Features

- Extracts the main content (prefers `<article>` over `<body>`)
- Strips navigation, footers, sidebars, scripts and styles
- Preserves headings, bold, italic, links, lists, inline code, and fenced code blocks with language hints
- Prepends the page title and source URL
- **Single-page mode** — one click to copy the current tab
- **Multi-page mode** — select multiple tabs (Ctrl+click tabs first to pre-select them), copy all at once with `---` separators
- Localized in 16 languages

## Supported Languages

English · French · Spanish · German · Italian · Portuguese (BR & PT) · Japanese · Chinese (Simplified) · Arabic · Korean · Russian · Polish · Dutch · Turkish · Indonesian

## Development

### Requirements

- Node.js 22 (see `.nvmrc`)
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
yarn test              # run all specs
yarn test:watch        # watch mode
yarn test:coverage     # with coverage report
```

### Package

```bash
yarn package     # build + zip → export-to-markdown.xpi
```

### Load in Firefox

1. Run `yarn build`
2. Open `about:debugging` → **This Firefox** → **Load Temporary Add-on**
3. Select `manifest.json`

### Release

Push a tag to trigger the release workflow, which runs CI and attaches the XPI to a GitHub Release:

```bash
# bump version in manifest.json and package.json first
git tag v1.0.0
git push origin v1.0.0
```

For a signed release (required for permanent installs outside Developer Edition), upload the XPI manually at [addons.mozilla.org](https://addons.mozilla.org).

## Project Structure

```
src/
  converter.js        # Pure HTML→Markdown logic (no browser APIs, fully testable)
  content.js          # Content script — wires converter to the browser message API
  popup.js            # Popup UI — single/multi-page modes, i18n, RTL support
  __tests__/
    converter.test.js
    popup.test.js
_locales/             # i18n message files (one directory per locale)
icons/                # Extension icons (48px, 96px)
.github/workflows/
  ci.yml              # Lint + test on every push / PR
  release.yml         # Build XPI and publish GitHub Release on tag push
popup.html
manifest.json
```

## CI/CD

| Workflow | Trigger | Steps |
|---|---|---|
| CI | push / PR on `main` | lint, test |
| Release | `v*` tag push | lint, test, build XPI, GitHub Release |

## License

MIT
