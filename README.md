# Export to Markdown — Firefox Extension

A Firefox extension that converts any web page to Markdown and copies it to your clipboard.

## Features

- Extracts the main content (prefers `<article>` over `<body>`)
- Strips navigation, footers, sidebars, scripts and styles
- Preserves headings, bold, italic, links, lists, inline code, and fenced code blocks with language hints
- Prepends the page title and source URL
- One click → copied to clipboard, with visual feedback
- Localized in 16 languages

## Supported Languages

English · French · Spanish · German · Italian · Portuguese (BR & PT) · Japanese · Chinese (Simplified) · Arabic · Korean · Russian · Polish · Dutch · Turkish · Indonesian

## Development

### Requirements

- Node.js ≥ 18
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

### Load in Firefox

1. Run `yarn build`
2. Open `about:debugging` → **This Firefox** → **Load Temporary Add-on**
3. Select `manifest.json`

For a permanent install, sign the extension via [addons.mozilla.org](https://addons.mozilla.org) or use Firefox Developer Edition / Nightly with `xpinstall.signatures.required = false`.

## Project Structure

```
src/
  converter.js        # Pure HTML→Markdown logic (testable, no browser APIs)
  content.js          # Content script — wires converter to browser message API
  popup.js            # Popup UI logic
  __tests__/
    converter.test.js
    popup.test.js
_locales/             # i18n message files
icons/                # Extension icons (48px, 96px)
popup.html
manifest.json
```

## License

MIT
