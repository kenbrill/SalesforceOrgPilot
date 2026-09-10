(async function () {
  const config = await chrome.storage.sync.get([
    'prodUrl',
    'orgName',
    'namedOrgs',
    'watermarkEnabled',
    'fontSize',
    'opacity',
    'prodColor',
    'sandboxColor',
    'position',
    'urlBlacklist'
  ]);

  // Watermark needs either a production org (orgName) or at least one named org;
  // Trailhead Playground / DE-only users only configure Named Orgs.
  const hasNamedOrgs = (config.namedOrgs || []).some(o => o.name && o.domain);
  if (!config.watermarkEnabled || (!config.prodUrl && !hasNamedOrgs)) return;

  const currentHost = window.location.hostname.toLowerCase();
  const blacklist = config.urlBlacklist || [];
  const isBlacklisted = blacklist.some(entry => {
    if (!entry) return false;
    if (entry.startsWith('*.')) return currentHost.endsWith(entry.slice(1));
    return currentHost === entry || currentHost.endsWith('.' + entry);
  });
  if (isBlacklisted) return;

  const hostname = currentHost;
  const orgName = config.orgName || (config.prodUrl ? config.prodUrl.split('.')[0] : '');

  // Production hostnames start with "orgname." (e.g. sangoma.lightning.force.com,
  // sangoma.my.salesforce-setup.com). Sandbox hostnames contain "--"
  // (e.g. sangoma--dev.sandbox.lightning.force.com). Named orgs (Trailhead
  // Playgrounds / DE orgs) have their own random domains configured in options
  // (e.g. mindful-unicorn-ghtysl-dev-ed.trailblaze.lightning.force.com).
  const namedOrg = (config.namedOrgs || []).find(o =>
    o.name && o.domain && hostname.startsWith(o.domain + '.'));
  const isProduction = !namedOrg &&
    hostname.startsWith(orgName + '.') && !hostname.startsWith(orgName + '--');

  // Label: named org alias (e.g. "MOOSE"), else sandbox name, else PRODUCTION
  let label = 'PRODUCTION';
  if (namedOrg) {
    label = namedOrg.name.toUpperCase();
  } else if (!isProduction) {
    // Sandbox label: name between "--" and the next ".", using the full org prefix
    const sandboxName = hostname.startsWith(orgName + '--')
      ? hostname.slice(orgName.length + 2).split('.')[0]
      : null;
    label = sandboxName ? sandboxName.toUpperCase() : 'SANDBOX';
  }
  // Named orgs share the sandbox color (decided in design: "like sandboxes")
  const color = isProduction
    ? (config.prodColor || '#ff4444')
    : (config.sandboxColor || '#006600');
  const fontSize = config.fontSize || 120;
  const opacity = (config.opacity || 20) / 100;
  const position = config.position || 'diagonal';

  function injectWatermark() {
    // Inject keyframe animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes sfq-fadein {
        from { opacity: 0; }
      }
      @keyframes sfq-pulse {
        0%, 100% { opacity: ${opacity}; }
        50% { opacity: ${opacity * 0.6}; }
      }
    `;
    document.documentElement.appendChild(style);

    const el = document.createElement('div');
    el.id = 'sfq-watermark';
    el.textContent = label;

    const base = {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '2147483647',
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fontSize: fontSize + 'px',
      color: color,
      opacity: opacity,
      userSelect: 'none',
      lineHeight: '1',
      textShadow: 'none',
      animation: 'sfq-fadein 0.8s ease-out, sfq-pulse 4s ease-in-out 1s infinite'
    };

    if (position === 'diagonal') {
      Object.assign(base, {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) rotate(-45deg)',
        whiteSpace: 'nowrap'
      });
    } else if (position === 'top-left') {
      Object.assign(base, {
        top: '10px',
        left: '10px'
      });
    } else if (position === 'top-right') {
      Object.assign(base, {
        top: '10px',
        right: '10px'
      });
    } else if (position === 'top-center') {
      Object.assign(base, {
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        whiteSpace: 'nowrap'
      });
    } else if (position === 'center') {
      Object.assign(base, {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        whiteSpace: 'nowrap'
      });
    }

    Object.assign(el.style, base);
    document.documentElement.appendChild(el);

    let reappearTimer = null;

    function showAndArm() {
      clearTimeout(reappearTimer);
      el.style.display = '';
      el.style.transition = '';
      el.style.opacity = opacity;
      el.style.animation = 'sfq-fadein 0.8s ease-out, sfq-pulse 4s ease-in-out 1s infinite';
      const hide = () => {
        document.removeEventListener('click', hide);
        document.removeEventListener('keydown', hide);
        el.style.animation = 'none';
        el.style.transition = 'opacity 0.5s ease-out';
        el.style.opacity = '0';
        setTimeout(() => { el.style.display = 'none'; }, 500);
        reappearTimer = setTimeout(showAndArm, 30000);
      };
      document.addEventListener('click', hide, { once: true });
      document.addEventListener('keydown', hide, { once: true });
    }

    showAndArm();

    // Re-show watermark on SPA navigation (Salesforce Lightning changes URL without full reload)
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        showAndArm();
      }
    }).observe(document, { subtree: true, childList: true });
  }

  if (document.body) {
    injectWatermark();
  } else {
    document.addEventListener('DOMContentLoaded', injectWatermark);
  }
})();
