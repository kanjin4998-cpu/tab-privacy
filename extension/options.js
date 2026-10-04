'use strict';
const PROVIDERS = {
  anthropic: {
    models: ['claude-haiku-4-5-20251001', 'claude-sonnet-5-5'],
    help: 'Create a key at console.anthropic.com/settings/keys. Haiku is the cheaper, faster choice.'
  },
  gemini: {
    models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    help: 'Free option: create a key at aistudio.google.com/apikey (as far as I know, no payment card is needed for the free tier). If a model name stops working, check Google’s current model list and type the new name.'
  }
};
const $ = id => document.getElementById(id);
const provider = $('provider'), key = $('key'), model = $('model'), result = $('result');

function show(message, kind) { result.textContent = message; result.className = kind || ''; }

function renderProvider(keepModel) {
  const info = PROVIDERS[provider.value];
  $('keyhelp').textContent = info.help;
  $('models').replaceChildren(...info.models.map(name => Object.assign(document.createElement('option'), {value: name})));
  if (!keepModel || !model.value) model.value = info.models[0];
}

async function save() {
  await chrome.storage.local.set({provider: provider.value, apiKey: key.value.trim(), model: model.value.trim()});
}

(async () => {
  const saved = await chrome.storage.local.get({provider: 'gemini', apiKey: '', model: ''});
  provider.value = saved.provider;
  key.value = saved.apiKey;
  model.value = saved.model;
  renderProvider(true);
})();

provider.addEventListener('change', () => { model.value = ''; renderProvider(false); });

$('save').addEventListener('click', async () => { await save(); show('Saved.', 'ok'); });

$('test').addEventListener('click', async () => {
  const button = $('test');
  button.disabled = true;
  show('Testing…');
  try {
    await save();
    const reply = await chrome.runtime.sendMessage({type: 'ask', messages: [{role: 'user', text: 'Reply with exactly: Connected.'}]});
    show(reply?.ok ? 'Working. The AI replied: ' + reply.text : reply?.error || 'No reply.', reply?.ok ? 'ok' : 'err');
  } catch (error) { show(error.message, 'err'); }
  button.disabled = false;
});
