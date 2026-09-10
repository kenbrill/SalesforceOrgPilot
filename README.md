# Salesforce Quick Navigator

A browser extension (Manifest V3) for Chrome and Firefox that provides environment identification watermarks and quick navigation for Salesforce orgs.

It supports two org topologies:
- **Paid org with sandboxes** — predictable domains (`myorg.lightning.force.com`, `myorg--dev.sandbox.my.salesforce.com`)
- **Standalone orgs** (Trailhead Playgrounds, Developer Editions) — unpredictable random domains (`mindful-unicorn-ghtysl-dev-ed.trailblaze.lightning.force.com`), handled via **Named Orgs**

## Features

### Environment Watermark

Automatically displays a watermark identifying whether you're in **Production**, a **Sandbox** (showing the sandbox name), or a **Named Org** (showing its alias). The watermark appears on page load so you can verify your environment at a glance, then disappears on your first click or keypress to stay out of the way. It reappears on the next page load.

Customizable via the options page:

| Setting | Default | Range |
|---|---|---|
| Font size | 120px | 50-300px |
| Opacity | 20% | 5-50% |
| Production color | `#ff4444` (red) | Any hex color |
| Sandbox color | `#006600` (green) | Any hex color |
| Position | Diagonal | Diagonal, Top Left, Top Right, Top Center, Center |

### Omnibox Quick Navigation

Type **`sf`** in the browser address bar followed by a target to quickly navigate anywhere in your Salesforce org. Single-word commands default to production; prefix with a sandbox or named-org alias to target another org.

```
sf <target>                    # goes to production (current tab)
sf <sandbox> <target>          # goes to a sandbox (current tab)
sf *<sandbox> <target>         # opens in a new tab
sf **<sandbox> <target>        # opens in a new window
```

**Environments:**
- Single word defaults to **production** (e.g., `sf cases` → prod cases)
- Two words: first word is the sandbox name (e.g., `sf dev cases` → dev sandbox cases) or a **Named Org alias** (e.g., `sf moose cases` → your Moose playground)
- `sf moose copy` / `sf copy` work to and from named orgs too

**Tab/Window behavior:**
- No prefix — navigates in the **current tab** (default)
- `*` prefix — opens in a **new tab** (e.g., `sf *dev cases`)
- `**` prefix — opens in a **new window** (e.g., `sf **dev cases`)

**Targets:**

| Target | Destination |
|---|---|
| `admin` | Setup Home |
| `flow` / `flows` | Flow Builder |
| `login` | Base URL / login page for the org |
| `copy` | Current page in another environment |
| `sandbox` | Sandbox creation page |
| `devops` | DevOps Center (production only) |
| Custom target name | User-defined path (see Custom Targets) |
| Any object name (e.g., `account`, `contact`) | Recent list view for that object |
| 15 or 18-character Salesforce ID | Direct record navigation |

**Examples:**
```
sf account            → Production Account list
sf flow               → Production Flow Builder
sf admin              → Production Setup Home
sf 001xx000003DGbY    → Navigate directly to a production record
sf login              → Production base URL
sf dev login          → Dev sandbox base URL
sf dive copy          → Open current page in dive sandbox
sf copy               → Open current page in production
sf dev flow           → Dev sandbox Flow Builder
sf qa admin           → QA sandbox Setup Home
sf dev 001xx000003DGbY   → Navigate to a record in dev sandbox
sf *prod admin           → Production Setup Home in a new tab
sf **dev cases           → Dev sandbox cases in a new window
sf users                 → Custom target "users" in production
sf dev users             → Custom target "users" in dev sandbox
sf moose admin           → Moose playground Setup Home (named org)
sf moose copy            → Open current page in the Moose playground
sf copy                  → Open current page in production (works from named orgs too)
```

### Popup Dashboard

Click the extension icon to open a quick-access popup with:

- **Environment selector** — Switch between Production, your configured sandboxes, and your Named Orgs with one click. The selected environment is remembered across popup opens.
- **Navigate buttons** — Admin, Flows, Sandbox, DevOps on the first row; Login and Copy on the second. Copy takes the current tab's page and opens it in the selected environment.
- **Custom targets** — Any custom targets you've configured appear in their own section.
- **Recent Pages** — Shows the last 5 Salesforce pages you visited, with relative timestamps ("just now", "5m ago", "2h ago"). Click any entry to navigate back. Respects the open-in dropdown.
- **Quick Nav** — Type a Salesforce ID (15 or 18 characters) or an object name to navigate directly. Includes autocomplete suggestions for standard objects (Account, Contact, Lead, Opportunity, Case, etc.).
- **Open in dropdown** — Choose whether links open in the current tab, a new tab, or a new window.

Configure sandbox names in the options page (comma-separated, e.g. `DEV, QA, UAT`). They display with whatever casing you enter but URLs are always lowercase.

### Tab Grouping by Environment

Automatically organizes Salesforce tabs into color-coded browser tab groups by environment. Production tabs go into a red **PROD** group, and each sandbox gets its own distinctly colored group (e.g., green **DEV**, blue **QA**).

- **Auto-grouping** — Enable in options to automatically group every Salesforce tab as it loads
- **Manual grouping** — Press **Alt+Shift+G** (**Option+Shift+G** on Mac) to sort all open Salesforce tabs into groups at once. Works even when auto-grouping is off.
- Tabs that navigate between environments are automatically moved to the correct group
- Non-Salesforce tabs are never affected
- Each browser window maintains its own set of groups
- Empty groups are automatically removed by the browser

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| **Alt+S** (Option+S on Mac) | Open the popup |
| **Alt+Shift+G** (Option+Shift+G on Mac) | Group all Salesforce tabs by environment |
| **Alt+Shift+T** (Option+Shift+T on Mac) | Pull all Salesforce tabs into current window and group |

Remap shortcuts at:
- **Chrome**: `chrome://extensions/shortcuts`
- **Firefox**: `about:addons` → Extensions → Salesforce OrgPilot → Manage

## Installation

This extension works in **Chrome** and **Firefox 139+** (requires tab grouping API support).

### Chrome
1. Clone or download this repository
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer Mode** (toggle in the top right)
4. Click **Load unpacked** and select this directory
5. Open the extension's **Options** page to configure your production URL

### Firefox
1. Clone or download this repository
2. Open `about:debugging#/runtime/this-firefox` in Firefox
3. Click **Load Temporary Add-on**
4. Select the `manifest-firefox.json` file from this directory (Chrome's `manifest.json` must stay free of Firefox-only keys like `background.scripts`, which Chrome rejects)
5. Open the extension's **Options** page to configure your production URL

**Note:** Firefox 139+ is required for full tab grouping functionality. Earlier versions will have all features except automatic tab grouping.

## Configuration

Open the extension options page to set:

1. **Setup mode** — Pick **Production org** if you have one, or **Standalone orgs only** (Trailhead Playgrounds / Developer Editions); prod-only sections are hidden in standalone mode.
2. **Production URL** (prod setups) — Your Salesforce production domain (e.g., `myorg.lightning.force.com` or `myorg.develop.lightning.force.com`). The org prefix is extracted by stripping the standard Salesforce domain suffix, so multi-segment org names (like Developer Edition orgs with `.develop`) are handled correctly.
3. **Sandbox Names** (prod setups) — Comma-separated list of sandbox environment names (e.g., `DEV, QA, UAT`). These appear as buttons in the popup dashboard. Sandbox creation requires paid licenses, so Trailhead Playgrounds and Developer Edition orgs can't appear here — use Named Orgs instead.
4. **Named Orgs** — Alias + domain-prefix pairs for standalone orgs (Trailhead Playgrounds, Developer Editions) whose domains are random rather than derived from your prod org. Example: alias `moose` → domain `brave-moose-1234-dev-ed.trailblaze`. Aliases appear as environment buttons in the popup, work as omnibox environments (`sf moose admin`), get their own watermark label and tab group, and support Copy in both directions. A history scan fills in candidate domains automatically — just add aliases.
5. **Tab Grouping** — Toggle auto-grouping of Salesforce tabs by environment. Off by default.
6. **Watermark settings** — Toggle, font size, opacity, colors, and position.
7. **Custom Targets** — Up to 10 custom name/URL pairs. Paste a full Salesforce URL and the path is extracted automatically. Target names support flexible plural matching (`site` matches `sites` and vice versa).

All settings sync across browser instances via `chrome.storage.sync`.

### Export / Import Settings

From the options page, you can **Export** your entire configuration as a `sfnav-config.json` file for backup or sharing, and **Import** a previously exported file to restore settings. Import validates the file before applying and reloads the page on success.

## How Environment Detection Works

The extension determines the environment from the page hostname:

- **Named Orgs** — Hostname starts with a configured org domain (e.g., `mindful-unicorn-ghtysl-dev-ed.trailblaze.lightning.force.com`); the alias is displayed as the watermark label
- **Production** — Hostname starts with `orgName.` (e.g., `myorg.lightning.force.com`)
- **Sandbox** — Hostname contains `orgName--` (e.g., `myorg--dev.sandbox.lightning.force.com`), with the sandbox name extracted and displayed as the watermark label

Supported domains:
- `*.salesforce.com`
- `*.lightning.force.com`
- `*.salesforce-setup.com`

## Project Structure

```
├── manifest.json    # Extension configuration (Manifest V3)
├── content.js       # Watermark injection (runs on Salesforce pages)
├── background.js    # Omnibox navigation, tab grouping, and command handler
├── popup.html       # Popup dashboard UI
├── popup.js         # Popup dashboard logic
├── options.html     # Settings page UI
├── options.js       # Settings page logic
└── icons/           # Extension icons (16, 32, 48, 128px)
```

## Development

No build tools required — vanilla JS, HTML, and CSS loaded directly by the browser.

After making changes:
- **Chrome**: Go to `chrome://extensions/` and click the reload button on the extension card
- **Firefox**: Go to `about:debugging#/runtime/this-firefox` and click **Reload**

## Changelog

### 1.62

- **Added a Setup mode: production org vs standalone orgs** — the options page now asks up front whether you have a production org (prod URL + optional sandboxes) or only standalone orgs (Trailhead Playgrounds / Developer Editions). Standalone mode hides the prod-only sections, and every prod-URL requirement was removed: the Named Orgs history scan runs without one, the popup shows named-org environments instead of the setup screen, the watermark and tab grouping work from named orgs alone, and the omnibox resolves `prod` to your first named org (Sandbox/DevOps commands and buttons are treated as prod-only).
- **Fixed manual tab grouping ignoring Named Orgs** — Alt+Shift+G (group) and Alt+Shift+T (consolidate) classified tabs without passing the named-orgs config, so playground/DE tabs were never grouped. Auto-grouping on page load was unaffected.

### 1.61

- **Fixed Named Orgs domains being truncated on save** — `collectNamedOrgs` cut domain prefixes at the first dot, silently corrupting Trailhead/DE orgs like `brave-moose-1234-dev-ed.trailblaze` into `brave-moose-1234-dev-ed` (which broke navigation, watermark, grouping, and Copy). Full prefixes are now preserved; pasting a full URL or hostname still works.
- **Fixed invisible error messages in the options page** — failure messages (scan found nothing, missing production URL, invalid target, etc.) were rendered with `display: none` and could never be seen. They now show in red; the zero-result scan message also explains that orgs appear only after you've visited them in this browser.

### 1.60

- **Fixed extension failing to load in Chrome** — the manifest contained the Firefox-only `background.scripts` key, which Chrome rejects in Manifest V3 (`'background.scripts' requires manifest version of 2 or lower`). Chrome's `manifest.json` now uses `service_worker` only; Firefox users load `manifest-firefox.json` instead.
- **Fixed Copy producing broken URLs from named orgs** — copying a page from a standalone org (e.g. `org.trailblaze.lightning.force.com`) generated an invalid double-dot hostname. Prefix stripping now includes the separator, in both the popup and the omnibox.
- **Fixed sandbox name extraction for multi-segment org names** — for org prefixes containing a dot (e.g. `myorg.develop`), the watermark showed `SANDBOX` instead of the actual sandbox name. Detection now matches the popup's logic.
- **Fixed Named Orgs history scan finding nothing** — the scan discarded org prefixes containing a dot, which filtered out every Trailhead Playground / Developer Edition domain. It now keeps full prefixes like `brave-moose-1234-dev-ed.trailblaze`, skips the configured org, sandbox-style hosts, and shared Salesforce properties (`trailhead`, `org62`, `developer`, ...).
- **Fixed manifest charset warnings** — added `<meta charset="utf-8">` to the popup and options pages and removed non-ASCII characters from extension files, eliminating `odd character 'â€”'` warnings on load.

### 1.59

- **Added Named Orgs** — support for standalone orgs whose domains aren't derived from a paid production org (Trailhead Playgrounds, Developer Editions). Configure alias + domain pairs in the options page (with a browser-history scanner to discover candidates); aliases work as environments in the popup, omnibox (`sf <alias> <target>`), Copy, watermark labels, and tab groups.
