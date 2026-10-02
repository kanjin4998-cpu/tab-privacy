'use strict';
const button = document.querySelector('#toggle');
const status = document.querySelector('#status');
const reload = document.querySelector('#reload');
let tab, pattern, id, enabled;
function render() {
  button.textContent = enabled ? 'Turn off for this site' : 'Turn on for this site';
  status.textContent = enabled ? 'Enabled for future page loads.' : 'Off for future page loads.';
  button.disabled = false;
}
(async () => {
  try {
    [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const url = new URL(tab.url);
    if (!['https:', 'http:'].includes(url.protocol) || url.hostname === 'chromewebstore.google.com' || (url.hostname === 'chrome.google.com' && url.pathname.startsWith('/webstore'))) {
      throw new Error('Open a regular HTTP or HTTPS website to use Tab Privacy.');
    }
    pattern = `${url.protocol}//${url.hostname}/*`;
    id = 'site-' + [...new TextEncoder().encode(pattern)].map(x => x.toString(16).padStart(2, '0')).join('');
    document.querySelector('#site').textContent = url.hostname;
    enabled = (await chrome.scripting.getRegisteredContentScripts({ids: [id]})).length > 0;
    render();
  } catch (error) { status.textContent = error.message; button.textContent = 'Unavailable on this page'; }
})();
button.addEventListener('click', async () => {
  button.disabled = true;
  try {
    if (enabled) {
      await chrome.scripting.unregisterContentScripts({ids: [id]});
      enabled = false;
    } else {
      // Request optional access directly within the user's click gesture.
      const granted = await chrome.permissions.request({origins: [pattern]});
      if (!granted) { render(); status.textContent = 'Site access was not granted.'; return; }
      await chrome.scripting.registerContentScripts([{id, matches: [pattern], js: ['protect.js'], runAt: 'document_start', world: 'MAIN', allFrames: true, persistAcrossSessions: true}]);
      enabled = true;
    }
    render(); reload.hidden = false;
  } catch (error) { status.textContent = error.message; button.disabled = false; }
});
reload.addEventListener('click', async () => {
  try { await chrome.tabs.reload(tab.id); window.close(); }
  catch (error) { status.textContent = error.message; }
});
