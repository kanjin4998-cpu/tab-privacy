'use strict';
// Takes a screenshot of the visible part of the sender's tab. Needs access to the site (granted when the tools are turned on).
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'capture' || !sender.tab) return;
  chrome.tabs.captureVisibleTab(sender.tab.windowId, {format: 'png'})
    .then(dataUrl => sendResponse({ok: true, dataUrl}))
    .catch(error => sendResponse({ok: false, error: error.message}));
  return true;
});
