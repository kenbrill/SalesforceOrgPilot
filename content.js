(async function () {
  const config = await chrome.storage.sync.get([
    'prodUrl',
    'orgName',
    'watermarkEnabled',
    'fontSize',
    'opacity',
    'prodColor',
    'sandboxColor',
    'position'
  ]);

  if (!config.watermarkEnabled || !config.prodUrl) return;

  const hostname = window.location.hostname;
  const orgName = config.orgName || config.prodUrl.split('.')[0];

  // Production hostnames start with "orgname." (e.g. sangoma.lightning.force.com,
  // sangoma.my.salesforce-setup.com). Sandbox hostnames contain "--"
  // (e.g. sangoma--dev.sandbox.lightning.force.com, sangoma--dev.my.salesforce-setup.com).
  const isProduction = hostname.startsWith(orgName + '.') && !hostname.startsWith(orgName + '--');

  // Extract sandbox name from hostname (e.g. "sangoma--dive.sandbox..." → "dive")
  let label = 'PRODUCTION';
  if (!isProduction) {
    const prefix = hostname.split('.')[0];
    const sandboxName = prefix.split('--')[1];
    label = sandboxName ? sandboxName.toUpperCase() : 'SANDBOX';
  }
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
      textShadow: `0 0 10px ${color}, 0 0 30px ${color}`,
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

    function showAndArm() {
      el.style.display = '';
      el.style.transition = '';
      el.style.opacity = opacity;
      el.style.animation = 'sfq-fadein 0.8s ease-out, sfq-pulse 4s ease-in-out 1s infinite';
      const hide = () => {
        el.style.animation = 'none';
        el.style.transition = 'opacity 0.5s ease-out';
        el.style.opacity = '0';
        setTimeout(() => { el.style.display = 'none'; }, 500);
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
