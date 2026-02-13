# Salesforce Quick Navigator

A Chrome Extension (Manifest V3) that provides environment identification watermarks and quick navigation for Salesforce orgs.

## Features

### Environment Watermark

Automatically displays a watermark identifying whether you're in **Production** or a **Sandbox** (showing the sandbox name). The watermark appears on page load so you can verify your environment at a glance, then disappears on your first click or keypress to stay out of the way. It reappears on the next page load.

Customizable via the options page:

| Setting | Default | Range |
|---|---|---|
| Font size | 120px | 50-300px |
| Opacity | 20% | 5-50% |
| Production color | `#ff4444` (red) | Any hex color |
| Sandbox color | `#006600` (green) | Any hex color |
| Position | Diagonal | Diagonal, Top Left, Top Right, Top Center, Center |

### Omnibox Quick Navigation

Type **`sf`** in the Chrome address bar followed by a target to quickly navigate anywhere in your Salesforce org. Single-word commands default to production; prefix with a sandbox name to target a sandbox.

```
sf <target>                    # goes to production
sf <sandbox> <target>          # goes to a sandbox
```

**Environments:**
- Single word defaults to **production** (e.g., `sf cases` → prod cases)
- Two words: first word is the sandbox name (e.g., `sf dev cases` → dev sandbox cases)

**Targets:**

| Target | Destination |
|---|---|
| `admin` | Setup Home |
| `flow` / `flows` | Flow Builder |
| `login` | Base URL / login page for the org |
| `copy` | Current page in another environment |
| `sandbox` | Sandbox creation page |
| `devops` | DevOps Center (production only) |
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
```

## Installation

1. Clone or download this repository
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer Mode** (toggle in the top right)
4. Click **Load unpacked** and select this directory
5. Open the extension's **Options** page to configure your production URL

## Configuration

Open the extension options page to set:

1. **Production URL** — Your Salesforce production domain (e.g., `myorg.lightning.force.com`). The org name is extracted from the first segment of this URL and used for environment detection and navigation.
2. **Watermark settings** — Toggle, font size, opacity, colors, and position.

All settings sync across Chrome instances via `chrome.storage.sync`.

## How Environment Detection Works

The extension determines the environment from the page hostname:

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
├── background.js    # Omnibox navigation handler
├── options.html     # Settings page UI
├── options.js       # Settings page logic
└── icons/           # Extension icons (16, 32, 48, 128px)
```

## Development

No build tools required — vanilla JS, HTML, and CSS loaded directly by Chrome.

After making changes, go to `chrome://extensions/` and click the reload button on the extension card.
