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

  const config = {
    prodUrl,
    orgName,
    watermarkEnabled: document.getElementById('watermarkEnabled').checked,
    fontSize: parseInt(document.getElementById('fontSize').value),
    opacity: parseInt(document.getElementById('opacity').value),
    prodColor: document.getElementById('prodColor').value,
    sandboxColor: document.getElementById('sandboxColor').value,
    position: document.getElementById('position').value,
    customTargets
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
    'customTargets'
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

loadConfig();