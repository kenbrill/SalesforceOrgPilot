(async function () {
  const data = await chrome.storage.sync.get(['orgName', 'sandboxNames', 'customTargets']);
  const orgName = data.orgName;

  if (!orgName) {
    document.getElementById('no-config').style.display = 'block';
    document.getElementById('open-options-setup').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });
    return;
  }

  document.getElementById('main').style.display = 'block';

  // --- Environment buttons ---
  // sandboxNames are stored with original casing (e.g. "DEV", "QA")
  const sandboxNames = data.sandboxNames || [];
  const envContainer = document.getElementById('env-buttons');
  const envList = ['prod', ...sandboxNames];

  // Detect environment from the current tab's URL
  let selectedEnv = 'prod';
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab && activeTab.url) {
    try {
      const hostname = new URL(activeTab.url).hostname;
      if (hostname.startsWith(orgName + '--')) {
        // Sandbox: extract name between "--" and "."
        const sbxName = hostname.slice(orgName.length + 2).split('.')[0];
        // Match against configured sandbox names (case-insensitive)
        const match = sandboxNames.find(s => s.toLowerCase() === sbxName);
        if (match) selectedEnv = match;
      }
      // If hostname starts with orgName. it's production — selectedEnv stays 'prod'
    } catch { /* not a valid URL, keep default */ }
  }
  // Fall back to last manually selected env if not on a Salesforce page
  if (selectedEnv === 'prod' && activeTab && activeTab.url && !/salesforce|force\.com/.test(activeTab.url)) {
    const local = await chrome.storage.local.get('selectedEnv');
    selectedEnv = local.selectedEnv || 'prod';
    if (!envList.includes(selectedEnv)) selectedEnv = 'prod';
  }

  function renderEnvButtons() {
    envContainer.innerHTML = '';
    for (const env of envList) {
      const btn = document.createElement('button');
      btn.className = 'env-btn' + (env === selectedEnv ? ' selected' : '');
      btn.textContent = env === 'prod' ? 'PROD' : env;
      btn.addEventListener('click', () => {
        selectedEnv = env;
        chrome.storage.local.set({ selectedEnv });
        renderEnvButtons();
      });
      envContainer.appendChild(btn);
    }
  }
  renderEnvButtons();

  // --- URL builders ---
  function buildBaseUrl(env) {
    if (env === 'prod') {
      return `https://${orgName}.my.salesforce.com`;
    }
    return `https://${orgName}--${env.toLowerCase()}.sandbox.my.salesforce.com`;
  }

  function buildSetupUrl(env) {
    if (env === 'prod') {
      return `https://${orgName}.my.salesforce-setup.com`;
    }
    return `https://${orgName}--${env.toLowerCase()}.sandbox.my.salesforce-setup.com`;
  }

  // --- Built-in targets ---
  const builtinTargets = [
    { name: 'Admin', path: '/lightning/setup/SetupOneHome/home', setup: true },
    { name: 'Flows', path: '/lightning/setup/Flows/home', setup: true },
    { name: 'Sandbox', special: 'sandbox' },
    { name: 'DevOps', special: 'devops' }
  ];

  const builtinContainer = document.getElementById('builtin-buttons');
  for (const target of builtinTargets) {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = target.name;
    btn.addEventListener('click', () => navigateTarget(target));
    builtinContainer.appendChild(btn);
  }

  // --- LOGIN button ---
  document.getElementById('login-btn').addEventListener('click', () => {
    navigate(buildBaseUrl(selectedEnv));
  });

  // --- Copy button ---
  document.getElementById('copy-btn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    const currentUrl = new URL(tab.url);
    const currentHost = currentUrl.hostname;

    // Strip org prefix to get the domain tail
    let tail;
    if (currentHost.startsWith(orgName + '--')) {
      tail = currentHost.replace(/^[^.]+\./, '');
      if (tail.startsWith('sandbox.')) tail = tail.slice('sandbox.'.length);
    } else if (currentHost.startsWith(orgName + '.')) {
      tail = currentHost.replace(/^[^.]+\./, '');
    } else {
      return;
    }

    const envLower = selectedEnv === 'prod' ? 'prod' : selectedEnv.toLowerCase();
    let newHost;
    if (envLower === 'prod') {
      newHost = `${orgName}.${tail}`;
    } else {
      newHost = `${orgName}--${envLower}.sandbox.${tail}`;
    }

    const url = `https://${newHost}${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
    navigate(url);
  });

  // --- Custom targets ---
  const customTargets = data.customTargets || [];
  if (customTargets.length > 0) {
    document.getElementById('custom-section').style.display = 'block';
    const customContainer = document.getElementById('custom-buttons');
    for (const target of customTargets) {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = target.name;
      btn.addEventListener('click', () => {
        const url = buildBaseUrl(selectedEnv) + target.path;
        navigate(url);
      });
      customContainer.appendChild(btn);
    }
  }

  // --- Navigation helpers ---
  function navigateTarget(target) {
    let url;
    if (target.special === 'sandbox') {
      url = `https://${orgName}.my.salesforce-setup.com/lightning/setup/DataManagementCreateTestInstance/home`;
    } else if (target.special === 'devops') {
      url = `https://${orgName}.lightning.force.com/sf_devops/DevOpsCenter.app`;
    } else if (target.path === null) {
      url = buildBaseUrl(selectedEnv);
    } else if (target.setup) {
      url = buildSetupUrl(selectedEnv) + target.path;
    } else {
      url = buildBaseUrl(selectedEnv) + target.path;
    }
    navigate(url);
  }

  async function navigate(url) {
    const mode = document.getElementById('open-mode').value;
    if (mode === 'window') {
      await chrome.windows.create({ url });
    } else if (mode === 'tab') {
      await chrome.tabs.create({ url });
    } else {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        await chrome.tabs.update(tabs[0].id, { url });
      } else {
        await chrome.tabs.create({ url });
      }
    }
    window.close();
  }

  // --- Quick Nav ---
  function handleQuickNav() {
    const value = document.getElementById('quick-nav-input').value.trim();
    if (!value) return;

    const baseUrl = buildBaseUrl(selectedEnv);
    let url;

    if (/^[a-zA-Z0-9]{15}$|^[a-zA-Z0-9]{18}$/.test(value)) {
      url = `${baseUrl}/${value}`;
    } else {
      let objectName = value;
      if (objectName.endsWith('s')) {
        objectName = objectName.slice(0, -1);
      }
      objectName = objectName.charAt(0).toUpperCase() + objectName.slice(1);
      url = `${baseUrl}/lightning/o/${objectName}/list?filterName=__Recent`;
    }

    navigate(url);
  }

  document.getElementById('quick-nav-go').addEventListener('click', handleQuickNav);
  document.getElementById('quick-nav-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleQuickNav();
  });

  // --- Recent pages ---
  function formatRelativeTime(timestamp) {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  const recentData = await chrome.storage.local.get('recentPages');
  const recentPages = recentData.recentPages || [];
  if (recentPages.length > 0) {
    document.getElementById('recent-section').style.display = 'block';
    const recentList = document.getElementById('recent-list');
    for (const page of recentPages) {
      const row = document.createElement('div');
      row.className = 'recent-item';
      row.innerHTML = `<span class="recent-title">${page.title.replace(/</g, '&lt;')}</span><span class="recent-time">${formatRelativeTime(page.timestamp)}</span>`;
      row.addEventListener('click', () => navigate(page.url));
      recentList.appendChild(row);
    }
  }

  // --- Settings link ---
  document.getElementById('open-options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
})();
