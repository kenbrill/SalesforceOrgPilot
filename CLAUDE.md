# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Salesforce Quick Navigator** — a Chrome Extension (Manifest V3) that provides environment identification (watermarks) and quick navigation for Salesforce orgs. It targets `*.salesforce.com` and `*.lightning.force.com` domains.

## Architecture

- **manifest.json** — Extension config (Manifest V3). Uses omnibox keyword `sf`, storage permission, and content script injection at `document_start`.
- **options.html / options.js** — Fully implemented settings page. Saves/loads config via `chrome.storage.sync`. Configurable: production URL, watermark toggle, font size, opacity, colors (prod/sandbox), and position.
- **content.js** — Content script injected into Salesforce pages. Runs at `document_start`.
- **background.js** — Service worker for background tasks.
- **icons/** — Extension icons (16, 32, 48, 128px).

## Versioning

**Every time code is modified**, increment the `version` field in `manifest.json` by `0.01` (e.g. `1.21` → `1.22`). This applies to any change to `.js`, `.html`, or `.css` files — not to documentation-only changes like CLAUDE.md.

## Build & Development

No build system — vanilla JS/HTML/CSS loaded directly by Chrome. To develop:

1. Open `chrome://extensions/` with Developer Mode enabled
2. Click "Load unpacked" and select this directory
3. After code changes, click the reload button on the extension card

No package manager, bundler, or test framework is configured.

## Key Technical Details

- All user settings persist in `chrome.storage.sync` (syncs across Chrome instances)
- The `orgName` is derived from the production URL by splitting on `.` and taking the first segment
- Content script matches: `*://*.salesforce.com/*`, `*://*.lightning.force.com/*`, and `*://*.salesforce-setup.com/*`
- Environment detection (production vs sandbox) uses the `orgName`: hostname starting with `orgName.` = production, `orgName--` = sandbox
- Watermark defaults: 120px font, 20% opacity, red (#ff4444) for production, green (#44aa44) for sandbox, diagonal position

## Storage Config Shape

```js
{
  prodUrl: string,        // e.g. "sangoma.lightning.force.com"
  orgName: string,        // extracted from prodUrl (first subdomain segment)
  watermarkEnabled: bool,
  fontSize: number,       // 50-300
  opacity: number,        // 5-50 (percent)
  prodColor: string,      // hex color
  sandboxColor: string,   // hex color
  position: string        // "diagonal" | "top-left" | "top-right" | "center"
}
```
