chrome.omnibox.onInputEntered.addListener(async (text) => {
  const parts = text.trim().split(/\s+/);
  
  // If a single word is provided, assume production
  if (parts.length === 1) {
    parts.unshift('prod');
  }

  const firstParam = parts[0].toLowerCase();
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
  
  chrome.tabs.create({ url });
});