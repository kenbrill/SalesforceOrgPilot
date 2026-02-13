chrome.omnibox.onInputEntered.addListener(async (text) => {
  const parts = text.trim().split(/\s+/);
  
  // If a single Salesforce ID is provided, assume production
  if (parts.length === 1 && /^[a-zA-Z0-9]{15}$|^[a-zA-Z0-9]{18}$/.test(parts[0])) {
    parts.unshift('prod');
  }

  if (parts.length < 2) return;

  const firstParam = parts[0].toLowerCase();
  const secondParam = parts[1];
  const secondParamLower = secondParam.toLowerCase();

  // Get stored configuration
  const data = await chrome.storage.sync.get(['prodUrl', 'orgName']);
  
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
  
  // Check if sandbox (always goes to prod)
  if (secondParamLower === 'sandbox') {
    url = `https://${orgName}.my.salesforce-setup.com/lightning/setup/DataManagementCreateTestInstance/home`;
  }
  // Check if devops (only available in prod)
  else if (secondParamLower === 'devops') {
    url = `https://${orgName}.lightning.force.com/sf_devops/DevOpsCenter.app`;
  }
  // Check if admin
  else if (secondParamLower === 'admin') {
    url = `${baseUrl}/lightning/setup/SetupOneHome/home`;
  }
  // Check if flow
  else if (secondParamLower === 'flow' || secondParamLower === 'flows') {
    url = `${baseUrl}/lightning/setup/Flows/home`;
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