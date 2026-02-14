document.getElementById('saveBtn').addEventListener('click', async () => {
  const prodUrl = document.getElementById('prodUrl').value.trim();

  if (!prodUrl) {
    showMessage('Please enter a production URL', false);
    return;
  }

  // Extract the organization name from the URL
  const orgName = prodUrl.split('.')[0];

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

  // Parse sandbox names from comma-separated input
  const sandboxNamesRaw = document.getElementById('sandboxNames').value;
  const sandboxNames = sandboxNamesRaw
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const config = {
    prodUrl,
    orgName,
    watermarkEnabled: document.getElementById('watermarkEnabled').checked,
    fontSize: parseInt(document.getElementById('fontSize').value),
    opacity: parseInt(document.getElementById('opacity').value),
    prodColor: document.getElementById('prodColor').value,
    sandboxColor: document.getElementById('sandboxColor').value,
    position: document.getElementById('position').value,
    customTargets,
    sandboxNames,
    tabGroupingEnabled: document.getElementById('tabGroupingEnabled').checked
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
    'tabGroupingEnabled'
  ]);

  if (data.prodUrl) {
    document.getElementById('prodUrl').value = data.prodUrl;
  }
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
}

function showMessage(text, isSuccess) {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.className = 'message' + (isSuccess ? ' success' : '');
  setTimeout(() => {
    messageEl.className = 'message';
  }, 3000);
}

// --- Keyboard shortcut ---
document.getElementById('openShortcutsBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
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
      if (typeof config !== 'object' || !config.prodUrl) {
        showImportMessage('Invalid config file: missing prodUrl', false);
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
  el.className = 'message' + (isSuccess ? ' success' : '');
  if (!isSuccess) {
    setTimeout(() => { el.className = 'message'; }, 3000);
  }
}

// --- Scan browser history for sandbox names ---
document.getElementById('scanHistoryBtn').addEventListener('click', async () => {
  const prodUrl = document.getElementById('prodUrl').value.trim();
  if (!prodUrl) {
    showScanMessage('Please enter a production URL first', false);
    return;
  }

  const orgName = prodUrl.split('.')[0];
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
  el.className = 'message' + (isSuccess ? ' success' : '');
  setTimeout(() => { el.className = 'message'; }, 5000);
}

loadConfig();