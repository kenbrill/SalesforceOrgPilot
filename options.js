document.getElementById('saveBtn').addEventListener('click', async () => {
  const prodUrl = document.getElementById('prodUrl').value.trim();
  
  if (!prodUrl) {
    showMessage('Please enter a production URL', false);
    return;
  }
  
  // Extract the organization name from the URL
  const orgName = prodUrl.split('.')[0];
  
  const config = {
    prodUrl,
    orgName,
    watermarkEnabled: document.getElementById('watermarkEnabled').checked,
    fontSize: parseInt(document.getElementById('fontSize').value),
    opacity: parseInt(document.getElementById('opacity').value),
    prodColor: document.getElementById('prodColor').value,
    sandboxColor: document.getElementById('sandboxColor').value,
    position: document.getElementById('position').value
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

// Load existing configuration
async function loadConfig() {
  const data = await chrome.storage.sync.get([
    'prodUrl',
    'watermarkEnabled',
    'fontSize',
    'opacity',
    'prodColor',
    'sandboxColor',
    'position'
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