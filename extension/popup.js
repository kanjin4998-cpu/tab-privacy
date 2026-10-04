'use strict';
const status = document.querySelector('#status');
const reload = document.querySelector('#reload');
const ALL_ORIGINS = ['http://*/*', 'https://*/*'];
// Chrome only allows screenshots with access to all sites, so the tools ask for that even when the button shows on one site.
const SCREENSHOT_ORIGINS = ['<all_urls>'];
let tab, pattern, features;

const hex = text => [...new TextEncoder().encode(text)].map(x => x.toString(16).padStart(2, '0')).join('');

function defineFeatures() {
  const site = pattern ? hex(pattern) : null;
  return {
    protect: {file: 'protect.js', world: 'MAIN', allFrames: true, needsReload: true, permission: null, siteId: site && 'site-' + site, allId: 'all-sites'},
    tools: {file: 'tools.js', world: 'ISOLATED', allFrames: false, needsReload: false, permission: SCREENSHOT_ORIGINS, siteId: site && 'tools-site-' + site, allId: 'tools-all'}
  };
}

async function currentMode(feature) {
  const ids = [feature.allId, feature.siteId].filter(Boolean);
  const registered = (await chrome.scripting.getRegisteredContentScripts({ids})).map(script => script.id);
  if (registered.includes(feature.allId)) return 'all';
  if (feature.siteId && registered.includes(feature.siteId)) return 'site';
  return 'off';
}

async function render() {
  for (const group of document.querySelectorAll('.seg')) {
    const feature = features[group.dataset.feature];
    const mode = await currentMode(feature);
    for (const button of group.querySelectorAll('button')) {
      button.disabled = button.dataset.mode === 'site' && !pattern;
      button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    }
  }
}

async function setMode(name, mode) {
  const feature = features[name];
  const previous = await currentMode(feature);
  if (previous === mode) return;
  if (mode !== 'off') {
    // The permission prompt must come directly from the user's click.
    const granted = await chrome.permissions.request({origins: feature.permission || (mode === 'all' ? ALL_ORIGINS : [pattern])});
    if (!granted) { status.textContent = 'Site access was not granted.'; return; }
  }
  const existing = (await chrome.scripting.getRegisteredContentScripts({ids: [feature.allId, feature.siteId].filter(Boolean)})).map(script => script.id);
  if (existing.length) await chrome.scripting.unregisterContentScripts({ids: existing});
  if (mode !== 'off') {
    await chrome.scripting.registerContentScripts([{
      id: mode === 'all' ? feature.allId : feature.siteId,
      matches: mode === 'all' ? ALL_ORIGINS : [pattern],
      js: [feature.file], runAt: 'document_start', world: feature.world, allFrames: feature.allFrames, persistAcrossSessions: true
    }]);
  }
  if (feature.needsReload) {
    reload.hidden = false;
  } else if (tab?.id !== undefined) {
    // The tools button can appear or disappear straight away without a reload.
    try {
      if (mode === 'off') await chrome.tabs.sendMessage(tab.id, {type: 'tools-remove'});
      else if (pattern) await chrome.scripting.executeScript({target: {tabId: tab.id}, files: [feature.file]});
    } catch {}
  }
  status.textContent = mode === 'off' ? 'Turned off.' : mode === 'all' ? 'On for all sites.' : 'On for this site.';
}

(async () => {
  try {
    [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    let url;
    try { url = new URL(tab.url); } catch {}
    const regular = url && ['https:', 'http:'].includes(url.protocol) && url.hostname !== 'chromewebstore.google.com' && !(url.hostname === 'chrome.google.com' && url.pathname.startsWith('/webstore'));
    if (regular) {
      pattern = `${url.protocol}//${url.hostname}/*`;
      document.querySelector('#site').textContent = url.hostname;
    } else {
      document.querySelector('#site').textContent = 'This page can’t be modified.';
      status.textContent = 'Open a regular website to use “This site”. “All sites” still works.';
    }
    features = defineFeatures();
    await render();
  } catch (error) { status.textContent = error.message; }
})();

for (const group of document.querySelectorAll('.seg')) {
  group.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button || button.disabled || !features) return;
    for (const b of document.querySelectorAll('.seg button')) b.disabled = true;
    try { await setMode(group.dataset.feature, button.dataset.mode); }
    catch (error) { status.textContent = error.message; }
    await render();
  });
}

document.querySelector('#ai-settings').addEventListener('click', () => { chrome.runtime.openOptionsPage(); window.close(); });

reload.addEventListener('click', async () => {
  try { await chrome.tabs.reload(tab.id); window.close(); }
  catch (error) { status.textContent = error.message; }
});
