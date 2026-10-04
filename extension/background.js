'use strict';

// Keep the API key out of reach of content scripts.
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.setAccessLevel({accessLevel: 'TRUSTED_CONTEXTS'}).catch(() => {});
});
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.setAccessLevel({accessLevel: 'TRUSTED_CONTEXTS'}).catch(() => {});
});

const DEFAULT_MODELS = {anthropic: 'claude-haiku-4-5-20251001', gemini: 'gemini-2.5-flash'};
const SYSTEM_PROMPT = 'You are a helpful assistant built into a browser extension. The user may share a screenshot of part of their screen and, optionally, the text of the page. Explain what is shown, answer their question clearly and concisely, and say so when you are unsure. Use short paragraphs and lists. Reply in the language the user writes in.';

// Takes a screenshot of the visible part of the sender's tab. Needs access to the site (granted when the tools are turned on).
function capture(sender) {
  return chrome.tabs.captureVisibleTab(sender.tab.windowId, {format: 'png'})
    .then(dataUrl => ({ok: true, dataUrl}))
    .catch(error => ({ok: false, error: error.message}));
}

const splitDataUrl = dataUrl => {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(dataUrl || '');
  return match ? {mime: match[1], data: match[2]} : null;
};

async function readError(response) {
  let detail = '';
  try {
    const body = await response.json();
    detail = body?.error?.message || body?.message || '';
  } catch {}
  if (response.status === 401 || response.status === 403) return `The API key was rejected (${response.status}). ${detail}`.trim();
  if (response.status === 429) return `Rate limit or quota reached. ${detail}`.trim();
  return `The AI service returned an error (${response.status}). ${detail}`.trim();
}

async function askAnthropic(settings, messages) {
  const body = {
    model: settings.model || DEFAULT_MODELS.anthropic,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: messages.map(message => {
      const image = splitDataUrl(message.image);
      const content = [];
      if (image) content.push({type: 'image', source: {type: 'base64', media_type: image.mime, data: image.data}});
      content.push({type: 'text', text: message.text || '(no text)'});
      return {role: message.role === 'assistant' ? 'assistant' : 'user', content};
    })
  };
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000)
  });
  if (!response.ok) throw new Error(await readError(response));
  const json = await response.json();
  const text = (json.content || []).filter(block => block.type === 'text').map(block => block.text).join('\n').trim();
  if (!text) throw new Error('The AI returned an empty answer.');
  return text;
}

async function askGemini(settings, messages) {
  const model = settings.model || DEFAULT_MODELS.gemini;
  const body = {
    systemInstruction: {parts: [{text: SYSTEM_PROMPT}]},
    contents: messages.map(message => {
      const image = splitDataUrl(message.image);
      const parts = [];
      if (image) parts.push({inlineData: {mimeType: image.mime, data: image.data}});
      parts.push({text: message.text || '(no text)'});
      return {role: message.role === 'assistant' ? 'model' : 'user', parts};
    })
  };
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {'content-type': 'application/json', 'x-goog-api-key': settings.apiKey},
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000)
  });
  if (!response.ok) throw new Error(await readError(response));
  const json = await response.json();
  const text = (json.candidates?.[0]?.content?.parts || []).map(part => part.text || '').join('\n').trim();
  if (!text) throw new Error(json.promptFeedback?.blockReason ? `Blocked by the AI service: ${json.promptFeedback.blockReason}` : 'The AI returned an empty answer.');
  return text;
}

async function ask(messages) {
  const settings = await chrome.storage.local.get({provider: 'anthropic', apiKey: '', model: ''});
  if (!settings.apiKey) return {ok: false, code: 'no-key', error: 'Add your API key in the AI settings first.'};
  try {
    const text = settings.provider === 'gemini' ? await askGemini(settings, messages) : await askAnthropic(settings, messages);
    return {ok: true, text};
  } catch (error) {
    return {ok: false, error: error.name === 'TimeoutError' ? 'The AI took too long to answer. Try again.' : error.message};
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only this extension's own pages and content scripts can reach these handlers.
  if (sender.id !== chrome.runtime.id) return;
  if (message?.type === 'capture' && sender.tab) {
    capture(sender).then(sendResponse);
    return true;
  }
  if (message?.type === 'ask' && Array.isArray(message.messages)) {
    ask(message.messages).then(sendResponse);
    return true;
  }
  if (message?.type === 'open-options') {
    chrome.runtime.openOptionsPage();
  }
});
