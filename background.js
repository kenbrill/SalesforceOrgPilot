// --- Recently visited Salesforce pages ---
const SF_DOMAINS = /\.(salesforce\.com|lightning\.force\.com|salesforce-setup\.com)$/;
const SKIP_PATHS = /\/(aura|static|servlet|s\/sfsites)/i;

const LOADING_PATTERN = /^loading/i;

// --- Tab grouping by Salesforce environment ---
const GROUP_COLORS = ['green', 'blue', 'purple', 'cyan', 'orange', 'yellow', 'pink', 'grey'];

function classifyTab(url, orgName) {
  let hostname;
  try { hostname = new URL(url).hostname; } catch { return { env: null }; }
  if (!SF_DOMAINS.test(hostname)) return { env: null };

  if (hostname.startsWith(orgName + '--')) {
    const sandboxName = hostname.split('.')[0].split('--')[1];
    return { env: 'sandbox', sandboxName: sandboxName || 'sandbox' };
  }
  if (hostname.startsWith(orgName + '.')) {
    return { env: 'production' };
  }
  return { env: null };
}

function getGroupColor(env, sandboxName) {
  if (env === 'production') return 'red';
  let hash = 0;
  for (let i = 0; i < sandboxName.length; i++) {
    hash = ((hash << 5) - hash + sandboxName.charCodeAt(i)) | 0;
  }
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
}

async function findOrCreateGroup(tabId, title, color, windowId) {
  if (!chrome.tabs.group || !chrome.tabGroups) {
    console.warn('[TabGroup] chrome.tabs.group or chrome.tabGroups API not available');
    return;
  }

  const existing = await chrome.tabGroups.query({ title, windowId });
  if (existing.length > 0) {
    console.log('[TabGroup] Adding tab', tabId, 'to existing group', title);
    await chrome.tabs.group({ tabIds: [tabId], groupId: existing[0].id });
  } else {
    console.log('[TabGroup] Creating new group', title, color, 'for tab', tabId);
    const groupId = await chrome.tabs.group({ tabIds: [tabId], createProperties: { windowId } });
    await chrome.tabGroups.update(groupId, { title, color });
  }
}

async function assignTabToGroup(tab, orgName) {
  const info = classifyTab(tab.url, orgName);
  if (!info.env) return;

  const title = info.env === 'production' ? 'PROD' : info.sandboxName.toUpperCase();
  const color = getGroupColor(info.env, info.sandboxName);
  await findOrCreateGroup(tab.id, title, color, tab.windowId);
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab.url) return;

  let hostname;
  try { hostname = new URL(tab.url).hostname; } catch { return; }
  if (!SF_DOMAINS.test(hostname)) return;

  // On title change, just update the title of an existing entry
  if (changeInfo.title && !LOADING_PATTERN.test(changeInfo.title)) {
    const data = await chrome.storage.local.get('recentPages');
    const pages = data.recentPages || [];
    const existing = pages.find(p => p.url === tab.url);
    if (existing) {
      existing.title = changeInfo.title;
      await chrome.storage.local.set({ recentPages: pages });
    }
    return;
  }

  // On page load complete, add/move the entry to the top
  if (changeInfo.status !== 'complete') return;

  const path = new URL(tab.url).pathname;
  if (SKIP_PATHS.test(path)) return;

  const title = (tab.title && !LOADING_PATTERN.test(tab.title)) ? tab.title : tab.url;
  const entry = { url: tab.url, title, timestamp: Date.now() };

  const data = await chrome.storage.local.get('recentPages');
  let pages = data.recentPages || [];

  // Deduplicate: remove existing entry with same URL
  pages = pages.filter(p => p.url !== entry.url);
  // Add to front
  pages.unshift(entry);
  // Cap at 5
  pages = pages.slice(0, 5);

  await chrome.storage.local.set({ recentPages: pages });

  // Auto-group tab by environment
  const groupConfig = await chrome.storage.sync.get(['orgName', 'tabGroupingEnabled']);
  if (groupConfig.tabGroupingEnabled && groupConfig.orgName) {
    try { await assignTabToGroup(tab, groupConfig.orgName); }
    catch (e) { /* tab may have closed */ }
  }
});

if (chrome.omnibox) {
  chrome.omnibox.onInputEntered.addListener(async (text) => {
    const parts = text.trim().split(/\s+/);

    // If a single word is provided, assume production
    if (parts.length === 1) {
      parts.unshift('prod');
    }

    // Leading ** = new window, * = new tab, default = current tab
    const openInNewWindow = parts[0].startsWith('**');
    const openInNewTab = !openInNewWindow && parts[0].startsWith('*');
    const firstParam = parts[0].replace(/^\*{1,2}/, '').toLowerCase();
    const secondParam = parts[1];
    const secondParamLower = secondParam.toLowerCase();

    // Get stored configuration
    const data = await chrome.storage.sync.get(['prodUrl', 'orgName', 'customTargets']);

    if (!data.orgName) {
      chrome.tabs.create({
        url: chrome.runtime.getURL('popup.html'),
        active: true
      });
      return;
    }

    const orgName = data.orgName;

    let baseUrl;

    if (firstParam === 'prod') {
      baseUrl = `https://${orgName}.my.salesforce.com`;
    } else {
      baseUrl = `https://${orgName}--${firstParam}.sandbox.my.salesforce-setup.com`;
    }

    let url;

    // Pre-compute custom target match (flexible plural: "site" matches "sites" and vice versa)
    const customAltName = secondParamLower.endsWith('s') ? secondParamLower.slice(0, -1) : secondParamLower + 's';
    const customMatch = data.customTargets
      ? data.customTargets.find(t => t.name === secondParamLower || t.name === customAltName)
      : null;

    // Copy current page to another environment
    if (secondParamLower === 'copy') {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) return;

      const currentUrl = new URL(tab.url);
      const currentHost = currentUrl.hostname;

      // Strip org prefix to get the domain tail (e.g. "my.salesforce-setup.com")
      let tail;
      if (currentHost.startsWith(orgName + '--')) {
        // Sandbox: strip "orgName--sbxName." then strip "sandbox."
        tail = currentHost.replace(/^[^.]+\./, '');
        if (tail.startsWith('sandbox.')) tail = tail.slice('sandbox.'.length);
      } else if (currentHost.startsWith(orgName + '.')) {
        // Prod: strip "orgName."
        tail = currentHost.replace(/^[^.]+\./, '');
      } else {
        return;
      }

      // Build new hostname for target environment
      let newHost;
      if (firstParam === 'prod') {
        newHost = `${orgName}.${tail}`;
      } else {
        newHost = `${orgName}--${firstParam}.sandbox.${tail}`;
      }

      url = `https://${newHost}${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
    }
    // Check if sandbox (always goes to prod)
    else if (secondParamLower === 'sandbox') {
      url = `https://${orgName}.my.salesforce-setup.com/lightning/setup/DataManagementCreateTestInstance/home`;
    }
    // Check if devops (only available in prod)
    else if (secondParamLower === 'devops') {
      url = `https://${orgName}.lightning.force.com/sf_devops/DevOpsCenter.app`;
    }
    // Check if login
    else if (secondParamLower === 'login') {
      url = baseUrl;
    }
    // Check if admin
    else if (secondParamLower === 'admin') {
      url = `${baseUrl}/lightning/setup/SetupOneHome/home`;
    }
    // Check if flow
    else if (secondParamLower.substring(0, 4) === 'flow') {
      url = `${baseUrl}/lightning/setup/Flows/home`;
    }
    // Check custom targets (flexible plural matching: "site" matches "sites" and vice versa)
    else if (customMatch) {
      url = baseUrl + customMatch.path;
    }
    // Check if it's a Salesforce ID (18 or 15 character alphanumeric)
    else if (/^[a-zA-Z0-9]{15}$|^[a-zA-Z0-9]{18}$/.test(secondParam)) {
      url = `${baseUrl}/${secondParam}`;
    } else {
      // Remove trailing 's' for plurals
      let objectName = secondParam;
      if (objectName.endsWith('s')) {
        objectName = objectName.slice(0, -1);
      }

      objectName = objectName.charAt(0).toUpperCase() + objectName.slice(1);
      url = `${baseUrl}/lightning/o/${objectName}/list?filterName=__Recent`;
    }

    if (openInNewWindow) {
      chrome.windows.create({ url });
    } else if (openInNewTab) {
      chrome.tabs.create({ url });
    } else {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.update(tab.id, { url });
    }
  });
}

// --- Manual tab grouping command (Ctrl+Shift+G / Ctrl+Shift+G on Mac) ---
chrome.commands.onCommand.addListener(async (command) => {
  console.log('[TabGroup] Command received:', command);

  if (command === 'consolidate-sf-tabs') {
    const data = await chrome.storage.sync.get(['orgName']);
    if (!data.orgName) {
      console.warn('[TabGroup] No orgName configured, skipping');
      return;
    }

    const currentWindow = await chrome.windows.getCurrent();
    const allTabs = await chrome.tabs.query({});
    console.log('[Consolidate] Pulling SF tabs into window', currentWindow.id, 'from', allTabs.length, 'total tabs');

    // Move SF tabs from other windows into the current window
    let moved = 0;
    for (const tab of allTabs) {
      if (!tab.url || tab.windowId === currentWindow.id) continue;
      const info = classifyTab(tab.url, data.orgName);
      if (info.env) {
        try {
          await chrome.tabs.move(tab.id, { windowId: currentWindow.id, index: -1 });
          moved++;
        } catch (e) {
          console.error('[Consolidate] Error moving tab', tab.id, e);
        }
      }
    }
    console.log('[Consolidate] Moved', moved, 'SF tabs into current window');

    // Now group all tabs in the current window
    const windowTabs = await chrome.tabs.query({ windowId: currentWindow.id });
    let grouped = 0;
    const nonSfTabIds = [];
    for (const tab of windowTabs) {
      if (!tab.url) continue;
      try {
        const info = classifyTab(tab.url, data.orgName);
        if (info.env) {
          await assignTabToGroup(tab, data.orgName);
          grouped++;
        } else {
          nonSfTabIds.push(tab.id);
        }
      } catch (e) {
        console.error('[Consolidate] Error grouping tab', tab.id, e);
      }
    }

    // Move non-SF tabs to the beginning
    if (nonSfTabIds.length > 0) {
      try {
        await chrome.tabs.move(nonSfTabIds, { index: 0 });
      } catch (e) {
        console.error('[Consolidate] Error moving non-SF tabs', e);
      }
    }
    console.log('[Consolidate] Grouped', grouped, 'tabs');
    return;
  }

  if (command !== 'group-sf-tabs') return;

  const data = await chrome.storage.sync.get(['orgName']);
  if (!data.orgName) {
    console.warn('[TabGroup] No orgName configured, skipping');
    return;
  }

  const tabs = await chrome.tabs.query({});
  console.log('[TabGroup] Processing', tabs.length, 'tabs for orgName:', data.orgName);
  let grouped = 0;
  const nonSfTabsByWindow = {};
  for (const tab of tabs) {
    if (!tab.url) continue;
    try {
      const info = classifyTab(tab.url, data.orgName);
      if (info.env) {
        await assignTabToGroup(tab, data.orgName);
        grouped++;
      } else {
        if (!nonSfTabsByWindow[tab.windowId]) nonSfTabsByWindow[tab.windowId] = [];
        nonSfTabsByWindow[tab.windowId].push(tab.id);
      }
    } catch (e) {
      console.error('[TabGroup] Error grouping tab', tab.id, tab.url, e);
    }
  }

  // Move non-Salesforce tabs to the beginning of each window
  for (const tabIds of Object.values(nonSfTabsByWindow)) {
    try {
      await chrome.tabs.move(tabIds, { index: 0 });
    } catch (e) {
      console.error('[TabGroup] Error moving non-SF tabs', e);
    }
  }
  console.log('[TabGroup] Grouped', grouped, 'tabs');
});