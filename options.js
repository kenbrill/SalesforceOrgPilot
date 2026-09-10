function extractOrgName(input) {
  let host = input.replace(/^https?:\/\//, '').split('/')[0];
  const tails = [
    '.sandbox.my.salesforce-setup.com',
    '.sandbox.my.salesforce.com',
    '.lightning.force.com',
    '.my.salesforce-setup.com',
    '.my.salesforce.com',
    '.salesforce.com',
    '.force.com',
  ];
  for (const tail of tails) {
    if (host.endsWith(tail)) return host.slice(0, -tail.length);
  }
  return host.split('.')[0];
}

// --- Setup mode: production org vs standalone orgs (Trailhead / DE) ---
// Standalone users have no production URL at all, so prod-only UI is hidden.
function applySetupMode(mode) {
  const isProd = mode === 'prod';
  document.getElementById('prodSection').style.display = isProd ? '' : 'none';
  document.getElementById('sandboxSection').style.display = isProd ? '' : 'none';
}

for (const radio of document.querySelectorAll('input[name="setupMode"]')) {
  radio.addEventListener('change', (e) => applySetupMode(e.target.value));
}

document.getElementById('saveBtn').addEventListener('click', async () => {
  // Setup mode separates production-org users (prod URL + sandboxes) from
  // standalone-org users (Trailhead Playgrounds / DE) who only configure Named Orgs.
  const setupMode = document.querySelector('input[name="setupMode"]:checked').value;
  const prodUrl = document.getElementById('prodUrl').value.trim();

  if (setupMode === 'prod' && !prodUrl) {
    showMessage('Please enter a production URL', false);
    return;
  }
  const hasProd = setupMode === 'prod' && prodUrl.length > 0;
  const orgName = hasProd ? extractOrgName(prodUrl) : '';

  // Collect custom targets
  const customTargets = [];
  const rows = document.querySelectorAll('#customTargets .target-row');
  for (const row of rows) {
    const name = row.querySelector('.target-name').value.trim().toLowerCase();
    let path = row.querySelector('.target-path').value.trim();
    if (!name || !path) continue;
    if (/\s/.test(name)) {
      showMessage(`Target name "${name}" cannot contain spaces`, false);
      return;
    }
    // Extract pathname if a full URL was pasted
    if (path.startsWith('http')) {
      try {
        path = new URL(path).pathname;
      } catch (e) {
        showMessage(`Invalid URL for target "${name}"`, false);
        return;
      }
    }
    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    customTargets.push({ name, path });
  }

  // Parse sandbox names from comma-separated input (prod setups only)
  const sandboxNamesRaw = document.getElementById('sandboxNames').value;
  const sandboxNames = setupMode === 'prod'
    ? sandboxNamesRaw
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
    : [];

  const urlBlacklist = document.getElementById('urlBlacklist').value
    .split('\n')
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0);

  const namedOrgs = collectNamedOrgs();
  if (namedOrgs === null) return; // validation failed
  if (!hasProd && namedOrgs.length === 0) {
    showMessage('Standalone setup needs at least one Named Org', false);
    return;
  }

  const config = {
    prodUrl: hasProd ? prodUrl : '',
    orgName,
    watermarkEnabled: document.getElementById('watermarkEnabled').checked,
    fontSize: parseInt(document.getElementById('fontSize').value),
    opacity: parseInt(document.getElementById('opacity').value),
    prodColor: document.getElementById('prodColor').value,
    sandboxColor: document.getElementById('sandboxColor').value,
    position: document.getElementById('position').value,
    customTargets,
    sandboxNames,
    tabGroupingEnabled: document.getElementById('tabGroupingEnabled').checked,
    urlBlacklist,
    namedOrgs
  };

  await chrome.storage.sync.set(config);
  showMessage('Configuration saved!', true);
});

// Update range displays
document.getElementById('fontSize').addEventListener('input', (e) => {
  document.getElementById('fontSizeValue').textContent = e.target.value;
});

document.getElementById('opacity').addEventListener('input', (e) => {
  document.getElementById('opacityValue').textContent = e.target.value;
});

document.getElementById('prodColor').addEventListener('input', (e) => {
  document.getElementById('prodColorValue').textContent = e.target.value;
});

document.getElementById('sandboxColor').addEventListener('input', (e) => {
  document.getElementById('sandboxColorValue').textContent = e.target.value;
});

// Custom targets management
function addTargetRow(name = '', path = '') {
  const container = document.getElementById('customTargets');
  const row = document.createElement('div');
  row.className = 'target-row';
  row.innerHTML = `
    <input type="text" class="target-name" placeholder="name" value="${name}">
    <input type="text" class="target-path" placeholder="/lightning/setup/..." value="${path}">
    <button type="button" class="remove-target">X</button>
  `;
  row.querySelector('.remove-target').addEventListener('click', () => {
    row.remove();
    updateAddButton();
  });
  container.appendChild(row);
  updateAddButton();
}

function updateAddButton() {
  const count = document.querySelectorAll('#customTargets .target-row').length;
  document.getElementById('addTargetBtn').disabled = count >= 10;
}

document.getElementById('addTargetBtn').addEventListener('click', () => {
  addTargetRow();
});

// Named orgs management (standalone orgs: Trailhead Playgrounds / DE)
function addNamedOrgRow(name = '', domain = '') {
  const container = document.getElementById('namedOrgs');
  const row = document.createElement('div');
  row.className = 'target-row';
  row.innerHTML = `
    <input type="text" class="org-name" placeholder="alias (e.g. moose)" value="${name}">
    <input type="text" class="org-domain" placeholder="mindful-unicorn-ghtysl-dev-ed.trailblaze" value="${domain}">
    <button type="button" class="remove-target">X</button>
  `;
  row.querySelector('.remove-target').addEventListener('click', () => {
    row.remove();
  });
  container.appendChild(row);
}

// Salesforce domain tails for extracting an org's full prefix, most specific first
const ORG_TAILS = [
  '.my.salesforce-setup.com',
  '.my.salesforce.com',
  '.lightning.force.com',
  '.salesforce-setup.com',
  '.salesforce.com',
  '.force.com'
];

function collectNamedOrgs() {
  const orgs = [];
  for (const row of document.querySelectorAll('#namedOrgs .target-row')) {
    const name = row.querySelector('.org-name').value.trim().toLowerCase();
    let domain = row.querySelector('.org-domain').value.trim().toLowerCase();
    if (!name || !domain) continue;
    if (/\s/.test(name)) {
      showMessage(`Org alias "${name}" cannot contain spaces`, false);
      return null;
    }
    if (['prod', 'copy', 'sandbox', 'devops', 'login', 'admin', 'flow', 'flows'].includes(name)) {
      showMessage(`"${name}" is a reserved keyword and can't be used as an org alias`, false);
      return null;
    }
    // Accept a full URL or hostname; keep the FULL org prefix by stripping a known
    // Salesforce tail, so multi-segment prefixes like "brave-moose-1234-dev-ed.trailblaze"
    // survive. A bare prefix ("myorg") passes through unchanged.
    domain = domain.replace(/^https?:\/\//, '').split('/')[0];
    for (const tail of ORG_TAILS) {
      if (domain.endsWith(tail)) {
        domain = domain.slice(0, -tail.length);
        break;
      }
    }
    orgs.push({ name, domain });
  }
  return orgs;
}

document.getElementById('addNamedOrgBtn').addEventListener('click', () => {
  addNamedOrgRow();
});

// Load existing configuration
async function loadConfig() {
  const data = await chrome.storage.sync.get([
    'prodUrl',
    'watermarkEnabled',
    'fontSize',
    'opacity',
    'prodColor',
    'sandboxColor',
    'position',
    'customTargets',
    'sandboxNames',
    'tabGroupingEnabled',
    'urlBlacklist',
    'namedOrgs'
  ]);

  if (data.prodUrl) {
    document.getElementById('prodUrl').value = data.prodUrl;
  }
  // Restore setup mode: prod when a production URL is set (also covers configs
  // saved before setup mode existed), standalone otherwise.
  const setupMode = data.prodUrl ? 'prod' : 'standalone';
  document.querySelector(`input[name="setupMode"][value="${setupMode}"]`).checked = true;
  applySetupMode(setupMode);
  if (data.watermarkEnabled !== undefined) {
    document.getElementById('watermarkEnabled').checked = data.watermarkEnabled;
  }
  if (data.fontSize) {
    document.getElementById('fontSize').value = data.fontSize;
    document.getElementById('fontSizeValue').textContent = data.fontSize;
  }
  if (data.opacity) {
    document.getElementById('opacity').value = data.opacity;
    document.getElementById('opacityValue').textContent = data.opacity;
  }
  if (data.prodColor) {
    document.getElementById('prodColor').value = data.prodColor;
    document.getElementById('prodColorValue').textContent = data.prodColor;
  }
  if (data.sandboxColor) {
    document.getElementById('sandboxColor').value = data.sandboxColor;
    document.getElementById('sandboxColorValue').textContent = data.sandboxColor;
  }
  if (data.position) {
    document.getElementById('position').value = data.position;
  }
  if (data.sandboxNames && data.sandboxNames.length) {
    document.getElementById('sandboxNames').value = data.sandboxNames.join(', ');
  }
  if (data.tabGroupingEnabled !== undefined) {
    document.getElementById('tabGroupingEnabled').checked = data.tabGroupingEnabled;
  }
  if (data.customTargets && data.customTargets.length) {
    for (const target of data.customTargets) {
      addTargetRow(target.name, target.path);
    }
  }
  if (data.urlBlacklist && data.urlBlacklist.length) {
    document.getElementById('urlBlacklist').value = data.urlBlacklist.join('\n');
  }
  if (data.namedOrgs && data.namedOrgs.length) {
    for (const org of data.namedOrgs) {
      addNamedOrgRow(org.name, org.domain);
    }
  }
}

function showMessage(text, isSuccess) {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.className = 'message ' + (isSuccess ? 'success' : 'error');
  setTimeout(() => {
    messageEl.className = 'message';
  }, 3000);
}

// --- Keyboard shortcut ---
document.getElementById('openShortcutsBtn').addEventListener('click', () => {
  const url = typeof browser !== 'undefined'
    ? 'about:addons'
    : 'chrome://extensions/shortcuts';
  chrome.tabs.create({ url });
});

// --- Export / Import ---
document.getElementById('exportBtn').addEventListener('click', async () => {
  const data = await chrome.storage.sync.get(null);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sfnav-config.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const config = JSON.parse(event.target.result);
      const hasOrgs = Array.isArray(config.namedOrgs) && config.namedOrgs.length > 0;
      if (typeof config !== 'object' || (!config.prodUrl && !hasOrgs)) {
        showImportMessage('Invalid config file: needs prodUrl or namedOrgs', false);
        return;
      }
      await chrome.storage.sync.set(config);
      showImportMessage('Settings imported! Reloading...', true);
      setTimeout(() => location.reload(), 1000);
    } catch {
      showImportMessage('Invalid JSON file', false);
    }
  };
  reader.readAsText(file);
});

function showImportMessage(text, isSuccess) {
  const el = document.getElementById('importMessage');
  el.textContent = text;
  el.className = 'message ' + (isSuccess ? 'success' : 'error');
  if (!isSuccess) {
    setTimeout(() => { el.className = 'message'; }, 3000);
  }
}

// --- Scan browser history for sandbox names ---
document.getElementById('scanHistoryBtn').addEventListener('click', async () => {
  const prodUrl = document.getElementById('prodUrl').value.trim();
  if (!prodUrl) {
    showScanMessage('Sandbox scan needs a production URL. For Trailhead Playgrounds / DE orgs, use Named Orgs instead.', false);
    return;
  }

  const orgName = extractOrgName(prodUrl);
  const prefix = orgName + '--';

  // Search history for Salesforce domains
  const queries = [
    chrome.history.search({ text: orgName + '.salesforce.com', maxResults: 10000, startTime: 0 }),
    chrome.history.search({ text: orgName + '.lightning.force.com', maxResults: 10000, startTime: 0 }),
    chrome.history.search({ text: orgName + '.salesforce-setup.com', maxResults: 10000, startTime: 0 })
  ];

  const results = (await Promise.all(queries)).flat();

  const found = new Set();
  for (const item of results) {
    try {
      const hostname = new URL(item.url).hostname;
      if (hostname.startsWith(prefix)) {
        const sandboxName = hostname.split('.')[0].split('--')[1];
        if (sandboxName) found.add(sandboxName.toLowerCase());
      }
    } catch (e) {
      // skip malformed URLs
    }
  }

  if (found.size === 0) {
    showScanMessage('No sandbox URLs found in browser history', false);
    return;
  }

  // Merge with existing sandbox names
  const existing = document.getElementById('sandboxNames').value
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0);

  const merged = [...new Set([...existing, ...found])].sort();
  document.getElementById('sandboxNames').value = merged.join(', ');
  showScanMessage(`Found ${found.size} sandbox(es): ${[...found].sort().join(', ')}`, true);
});

function showScanMessage(text, isSuccess) {
  const el = document.getElementById('scanMessage');
  el.textContent = text;
  el.className = 'message ' + (isSuccess ? 'success' : 'error');
  setTimeout(() => { el.className = 'message'; }, 5000);
}

// --- Scan browser history for standalone (named) orgs ---
document.getElementById('scanNamedOrgsBtn').addEventListener('click', async () => {
  // Production URL is optional: it's only used to skip your own org in the results.
  const prodUrl = document.getElementById('prodUrl').value.trim();
  const orgName = prodUrl ? extractOrgName(prodUrl) : '';

  // 'force.com' matches *.salesforce.com and *.force.com; 'salesforce-setup'
  // covers the setup domains.
  const queries = [
    chrome.history.search({ text: 'force.com', maxResults: 10000, startTime: 0 }),
    chrome.history.search({ text: 'salesforce-setup', maxResults: 10000, startTime: 0 })
  ];
  const results = (await Promise.all(queries)).flat();

  // Standard Salesforce tails, most specific first. Strip the FIRST match so the
  // full random org prefix (e.g. "brave-moose-1234-dev-ed.trailblaze") is kept.
  const tails = [
    '.my.salesforce-setup.com',
    '.my.salesforce.com',
    '.lightning.force.com',
    '.salesforce-setup.com',
    '.salesforce.com',
    '.force.com'
  ];

  // Shared Salesforce hostnames that would otherwise show up as "orgs"
  const SHARED_SF_PREFIXES = new Set([
    'trailhead', 'trailheadapp', 'org62', 'help', 'developer', 'login', 'test',
    'www', 'my', 'signup', 'secure', 'status', 'trust', 'salesforce', 'work',
    'partners', 'events', 'ideas', 'success', 'admin', 'knowledge'
  ]);

  // Domains already configured in the Named Orgs rows (compared as full prefixes)
  const knownDomains = new Set();
  for (const row of document.querySelectorAll('#namedOrgs .target-row')) {
    let d = row.querySelector('.org-domain').value.trim().toLowerCase();
    d = d.replace(/^https?:\/\//, '').split('/')[0];
    for (const tail of ORG_TAILS) {
      if (d.endsWith(tail)) { d = d.slice(0, -tail.length); break; }
    }
    if (d) knownDomains.add(d);
  }

  const found = new Set();
  for (const item of results) {
    try {
      const hostname = new URL(item.url).hostname.toLowerCase();
      let prefix = null;
      for (const tail of tails) {
        if (hostname.endsWith(tail)) {
          prefix = hostname.slice(0, -tail.length);
          break;
        }
      }
      if (!prefix) continue;
      // Skip the configured org itself and any sandbox-style hosts.
      // Multi-segment prefixes ("...-dev-ed.trailblaze") are expected - keep them.
      if (orgName && (prefix === orgName || prefix.startsWith(orgName + '.') || prefix.startsWith(orgName + '--'))) continue;
      if (prefix.includes('--')) continue;
      if (/\s/.test(prefix)) continue;
      // Shared Salesforce properties, not customer orgs (trailhead, help, login, ...)
      if (SHARED_SF_PREFIXES.has(prefix.split('.')[0])) continue;
      if (knownDomains.has(prefix)) continue;
      found.add(prefix);
    } catch (e) {
      // skip malformed URLs
    }
  }

  if (found.size === 0) {
    showNamedScanMessage('No other orgs found. Orgs show up after you visit them in this browser at least once - or add a row manually below.', false);
    return;
  }

  for (const prefix of found) {
    addNamedOrgRow('', prefix);
  }
  showNamedScanMessage(`Found ${found.size} candidate org(s) - add an alias for each you want to keep`, true);
});

function showNamedScanMessage(text, isSuccess) {
  const el = document.getElementById('scanNamedMessage');
  el.textContent = text;
  el.className = 'message ' + (isSuccess ? 'success' : 'error');
  setTimeout(() => { el.className = 'message'; }, 5000);
}

loadConfig();