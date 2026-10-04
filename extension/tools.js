(() => {
  'use strict';
  // Isolated-world content script: a small button that copies a screenshot area or the page text to the clipboard.
  if (window.top !== window || window.__tabPrivacyTools) return;
  window.__tabPrivacyTools = true;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const el = (tag, style, text) => {
    const node = document.createElement(tag);
    if (style) node.style.cssText = style;
    if (text) node.textContent = text;
    return node;
  };
  const icon = paths => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    for (const d of paths) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      svg.append(path);
    }
    return svg;
  };
  const ICONS = {
    area: ['M4 8V5a1 1 0 0 1 1-1h3', 'M16 4h3a1 1 0 0 1 1 1v3', 'M20 16v3a1 1 0 0 1-1 1h-3', 'M8 20H5a1 1 0 0 1-1-1v-3', 'M10 12h4'],
    screen: ['M3 5h18v12H3z', 'M8 21h8', 'M12 17v4'],
    text: ['M6 3h9l4 4v14H6z', 'M14 3v5h5', 'M9 13h7', 'M9 17h7'],
    ask: ['M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z', 'M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z'],
    gear: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'],
    fab: ['M4 8V5a1 1 0 0 1 1-1h3', 'M16 4h3a1 1 0 0 1 1 1v3', 'M20 16v3a1 1 0 0 1-1 1h-3', 'M8 20H5a1 1 0 0 1-1-1v-3', 'M12 9v6', 'M9 12h6']
  };

  const MINT = '#98edc5';
  const DARK = '#101b23';
  const FONT = '13px system-ui,-apple-system,sans-serif';

  // Floating button, menu and toast live in a closed shadow root so the page's CSS and scripts can't touch them.
  const host = el('div', 'all:initial;position:fixed;right:16px;bottom:16px;z-index:2147483647;');
  const root = host.attachShadow({mode: 'closed'});
  const wrap = el('div', `font:${FONT};color:#ecf4f4;display:flex;flex-direction:column;align-items:flex-end;gap:8px;`);
  const toast = el('div', `display:none;background:${DARK};border:1px solid #30414b;border-radius:10px;padding:8px 12px;max-width:260px;`);
  const menu = el('div', `display:none;flex-direction:column;background:${DARK};border:1px solid #30414b;border-radius:12px;padding:6px;box-shadow:0 8px 24px rgba(0,0,0,.35);`);
  const fab = el('button', `all:unset;box-sizing:border-box;width:40px;height:40px;border-radius:50%;background:${DARK};color:${MINT};border:1px solid #30414b;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35);opacity:.8;`);
  fab.title = 'Tab Privacy tools';
  fab.setAttribute('aria-label', 'Tab Privacy tools');
  fab.append(icon(ICONS.fab));
  fab.addEventListener('mouseenter', () => { fab.style.opacity = '1'; });
  fab.addEventListener('mouseleave', () => { fab.style.opacity = '.8'; });

  const menuItem = (iconPaths, label, onClick) => {
    const item = el('button', `all:unset;display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;white-space:nowrap;font:${FONT};color:#ecf4f4;`);
    item.append(icon(iconPaths), el('span', '', label));
    item.addEventListener('mouseenter', () => { item.style.background = '#2a3a46'; });
    item.addEventListener('mouseleave', () => { item.style.background = 'none'; });
    item.addEventListener('click', event => { event.stopPropagation(); closeMenu(); onClick(); });
    return item;
  };
  const textItem = menuItem(ICONS.text, 'Copy page text', () => copyText());
  const askSelectionItem = menuItem(ICONS.ask, 'Ask AI about selected text', () => openChat({context: pendingSelection}));
  const label = text => el('div', 'padding:6px 12px 2px;font-size:10px;letter-spacing:1.5px;color:#7f9aa0;', text);
  const divider = () => el('div', 'height:1px;background:#30414b;margin:4px 0;');
  menu.append(
    label('ASK AI'),
    menuItem(ICONS.ask, 'Ask AI about an area', () => selectArea(rect => askAboutRect(rect))),
    menuItem(ICONS.ask, 'Ask AI about visible screen', () => askAboutRect(fullViewport())),
    askSelectionItem,
    divider(),
    label('COPY'),
    menuItem(ICONS.area, 'Screenshot an area', () => selectArea(rect => copyImage(rect))),
    menuItem(ICONS.screen, 'Screenshot visible screen', () => copyImage(fullViewport())),
    menuItem(ICONS.ask, 'Screenshot area, then paste in Claude.ai', () => selectArea(rect => screenshotForClaude(rect))),
    textItem,
    divider(),
    menuItem(ICONS.gear, 'AI settings', () => chrome.runtime.sendMessage({type: 'open-options'})),
    menuItem(['M6 6l12 12', 'M18 6L6 18'], 'Hide until reload', () => host.remove())
  );
  const panel = el('div', `display:none;flex-direction:column;width:380px;max-width:calc(100vw - 32px);height:min(540px,calc(100vh - 110px));background:${DARK};border:1px solid #30414b;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.45);overflow:hidden;color-scheme:dark;scrollbar-color:#3a4d59 transparent;`);
  wrap.append(toast, panel, menu, fab);
  root.append(wrap);

  const menuOpen = () => menu.style.display === 'flex';
  let pendingSelection = '';
  function openMenu() {
    pendingSelection = selectedText();
    textItem.lastChild.textContent = pendingSelection ? 'Copy selected text' : 'Copy page text';
    askSelectionItem.style.display = pendingSelection ? 'flex' : 'none';
    menu.style.display = 'flex';
  }
  function closeMenu() { menu.style.display = 'none'; }
  fab.addEventListener('click', event => { event.stopPropagation(); menuOpen() ? closeMenu() : openMenu(); });
  window.addEventListener('click', closeMenu, true);

  let toastTimer;
  function say(message, isError) {
    toast.textContent = message;
    toast.style.borderColor = isError ? '#ff8f8f' : MINT;
    toast.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 2500);
  }

  const selectedText = () => String(getSelection() || '').trim();
  async function copyText() {
    const text = selectedText() || document.body.innerText || document.documentElement.innerText || '';
    try {
      await navigator.clipboard.writeText(text);
      say(`Copied ${text.length.toLocaleString()} characters`);
    } catch (error) { say('Could not copy text: ' + error.message, true); }
  }

  const fullViewport = () => ({x: 0, y: 0, w: window.innerWidth, h: window.innerHeight});
  const nextPaint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 30))));

  async function captureCropped(rect) {
    await nextPaint();
    const response = await chrome.runtime.sendMessage({type: 'capture'});
    if (!response?.ok) throw new Error(response?.error || 'Screenshot failed');
    const bitmap = await createImageBitmap(await (await fetch(response.dataUrl)).blob());
    const scale = bitmap.width / window.innerWidth;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(rect.w * scale));
    canvas.height = Math.max(1, Math.round(rect.h * scale));
    canvas.getContext('2d').drawImage(bitmap, Math.round(rect.x * scale), Math.round(rect.y * scale), canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create image')), 'image/png'));
  }

  // The ClipboardItem takes a promise so the clipboard write happens inside the user's click.
  async function copyImage(rect, message) {
    host.style.visibility = 'hidden';
    const blob = captureCropped(rect).finally(() => { host.style.visibility = 'visible'; });
    try {
      await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]);
      say(message || 'Screenshot copied. Paste it anywhere.');
      return true;
    } catch (error) {
      say('Could not copy screenshot: ' + error.message, true);
      return false;
    }
  }

  // Free route that uses your own claude.ai plan: copy the screenshot, then open a new Claude chat to paste it into.
  async function screenshotForClaude(rect) {
    if (await copyImage(rect, 'Screenshot copied. Paste it into Claude with Cmd+V (Ctrl+V on Windows).')) {
      chrome.runtime.sendMessage({type: 'open-url', url: 'https://claude.ai/new'});
    }
  }

  function selectArea(onSelect) {
    const layerHost = el('div', 'all:initial;position:fixed;inset:0;z-index:2147483647;');
    const layer = layerHost.attachShadow({mode: 'closed'});
    const shade = el('div', 'position:fixed;inset:0;cursor:crosshair;background:rgba(0,0,0,.35);');
    const box = el('div', `position:fixed;display:none;border:2px solid ${MINT};box-shadow:0 0 0 100vmax rgba(0,0,0,.35);background:transparent;pointer-events:none;`);
    const hint = el('div', `position:fixed;top:16px;left:50%;transform:translateX(-50%);background:${DARK};color:#ecf4f4;font:${FONT};padding:8px 14px;border-radius:10px;border:1px solid #30414b;`, 'Drag to select an area. Esc to cancel.');
    shade.append(hint);
    layer.append(shade, box);
    document.documentElement.append(layerHost);

    let start = null;
    const rectOf = event => ({x: Math.min(start.x, event.clientX), y: Math.min(start.y, event.clientY), w: Math.abs(event.clientX - start.x), h: Math.abs(event.clientY - start.y)});
    const finish = () => {
      layerHost.remove();
      window.removeEventListener('keydown', onKey, true);
    };
    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); finish(); }
    };
    window.addEventListener('keydown', onKey, true);
    shade.addEventListener('mousedown', event => {
      event.preventDefault();
      start = {x: event.clientX, y: event.clientY};
      shade.style.background = 'transparent';
      hint.style.display = 'none';
      box.style.display = 'block';
    });
    shade.addEventListener('mousemove', event => {
      if (!start) return;
      const r = rectOf(event);
      Object.assign(box.style, {left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px'});
    });
    shade.addEventListener('mouseup', event => {
      if (!start) return;
      const r = rectOf(event);
      finish();
      if (r.w < 5 || r.h < 5) { say('Area too small. Try again.', true); return; }
      onSelect(r);
    });
  }


  // ---- Ask AI ----
  // Shrinks a screenshot so it is quick to upload and within AI image limits.
  async function toAiImage(blob) {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const toBlob = (type, quality) => new Promise(resolve => canvas.toBlob(resolve, type, quality));
    let out = await toBlob('image/png');
    if (!out || out.size > 3.5e6) out = await toBlob('image/jpeg', 0.85);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read the screenshot'));
      reader.readAsDataURL(out);
    });
  }

  async function askAboutRect(rect) {
    host.style.visibility = 'hidden';
    let image;
    try { image = await toAiImage(await captureCropped(rect)); }
    catch (error) { host.style.visibility = 'visible'; say('Could not take the screenshot: ' + error.message, true); return; }
    // Show the widget again before opening the chat so the question box can take focus.
    host.style.visibility = 'visible';
    openChat({image});
  }

  const bubbleStyle = mine => `align-self:${mine ? 'flex-end' : 'flex-start'};max-width:88%;padding:9px 12px;border-radius:12px;line-height:1.5;user-select:text;word-break:break-word;background:${mine ? '#24493f' : '#1a2a34'};`;

  // Small safe markdown renderer built from DOM nodes (code blocks, lists, bold, inline code).
  function renderInline(parent, text) {
    const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*)/g;
    let last = 0, match;
    while ((match = pattern.exec(text))) {
      if (match.index > last) parent.append(text.slice(last, match.index));
      const token = match[0];
      if (token.startsWith('`')) parent.append(el('code', 'background:#0b1319;padding:1px 5px;border-radius:5px;font:12px ui-monospace,Menlo,monospace;', token.slice(1, -1)));
      else parent.append(el('strong', '', token.slice(2, -2)));
      last = match.index + token.length;
    }
    if (last < text.length) parent.append(text.slice(last));
  }
  function renderMarkdown(container, text) {
    const fence = /```[^\n]*\n?([\s\S]*?)```/g;
    let last = 0, match;
    const blocks = chunk => {
      for (const block of chunk.split(/\n{2,}/)) {
        const lines = block.split('\n').filter(line => line.trim());
        if (!lines.length) continue;
        if (lines.every(line => /^\s*[-*•]\s+/.test(line)) || lines.every(line => /^\s*\d+[.)]\s+/.test(line))) {
          const list = el(/^\s*\d/.test(lines[0]) ? 'ol' : 'ul', 'margin:4px 0;padding-left:20px;');
          for (const line of lines) { const item = el('li', 'margin:2px 0;'); renderInline(item, line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '')); list.append(item); }
          container.append(list);
        } else {
          const paragraph = el('p', 'margin:4px 0;');
          lines.forEach((line, index) => {
            if (index) paragraph.append(document.createElement('br'));
            const heading = /^#{1,4}\s+(.*)$/.exec(line);
            if (heading) paragraph.append(el('strong', '', heading[1])); else renderInline(paragraph, line);
          });
          container.append(paragraph);
        }
      }
    };
    while ((match = fence.exec(text))) {
      blocks(text.slice(last, match.index));
      container.append(el('pre', 'margin:6px 0;padding:10px;background:#0b1319;border-radius:8px;overflow:auto;font:12px ui-monospace,Menlo,monospace;white-space:pre;', match[1].replace(/\n$/, '')));
      last = match.index + match[0].length;
    }
    blocks(text.slice(last));
  }

  const panelHeader = el('div', 'display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #30414b;');
  const panelTitle = el('div', 'flex:1;font-weight:600;', 'Ask AI');
  const iconButton = (paths, title, onClick) => {
    const button = el('button', `all:unset;display:flex;padding:6px;border-radius:8px;cursor:pointer;color:#a6bdc4;`);
    button.title = title; button.setAttribute('aria-label', title); button.append(icon(paths));
    button.addEventListener('mouseenter', () => { button.style.background = '#2a3a46'; });
    button.addEventListener('mouseleave', () => { button.style.background = 'none'; });
    button.addEventListener('click', onClick);
    return button;
  };
  panelHeader.append(panelTitle, iconButton(ICONS.gear, 'AI settings', () => chrome.runtime.sendMessage({type: 'open-options'})), iconButton(['M6 6l12 12', 'M18 6L6 18'], 'Close', () => closeChat()));
  const log = el('div', 'flex:1;overflow:auto;scrollbar-color:#3a4d59 #101b23;padding:12px;display:flex;flex-direction:column;gap:10px;');
  const composer = el('div', 'border-top:1px solid #30414b;padding:10px 12px;display:flex;flex-direction:column;gap:8px;');
  const input = el('textarea', `all:unset;box-sizing:border-box;width:100%;min-height:44px;max-height:120px;padding:9px 11px;border-radius:10px;border:1px solid #30414b;background:#1a2a34;color:#ecf4f4;font:${FONT};white-space:pre-wrap;overflow:auto;`);
  input.rows = 2;
  input.placeholder = 'Ask a question, or press Send for an explanation';
  const pageTextLabel = el('label', 'display:flex;align-items:center;gap:6px;font-size:12px;color:#96aaaf;cursor:pointer;');
  const pageTextBox = el('input', 'margin:0;');
  pageTextBox.type = 'checkbox';
  pageTextLabel.append(pageTextBox, el('span', '', 'Also send the page text'));
  const sendButton = el('button', `all:unset;padding:8px 16px;border-radius:9px;background:${MINT};color:#102c22;font:600 13px system-ui;cursor:pointer;`, 'Send');
  const composerRow = el('div', 'display:flex;align-items:center;justify-content:space-between;gap:8px;');
  composerRow.append(pageTextLabel, sendButton);
  composer.append(input, composerRow);
  panel.append(panelHeader, log, composer);
  // Keep keystrokes in the panel from triggering the page's own shortcuts.
  for (const type of ['keydown', 'keyup', 'keypress']) panel.addEventListener(type, event => event.stopPropagation());

  let chat = null;
  function addBubble(text, mine, error) {
    const bubble = el('div', bubbleStyle(mine) + (error ? 'background:#3a1f24;color:#ffc4c4;' : ''));
    if (mine || error) bubble.textContent = text; else renderMarkdown(bubble, text);
    log.append(bubble);
    log.scrollTop = log.scrollHeight;
    return bubble;
  }
  function openChat({image, context}) {
    chat = {image: image || null, context: context || '', history: [], busy: false};
    log.replaceChildren();
    if (image) {
      const thumb = el('img', 'align-self:flex-start;max-width:100%;max-height:150px;border-radius:8px;border:1px solid #30414b;object-fit:contain;background:#0b1319;');
      thumb.src = image;
      log.append(thumb);
    } else if (context) {
      log.append(el('div', 'align-self:stretch;max-height:90px;overflow:auto;padding:8px 10px;border-left:3px solid #98edc5;background:#1a2a34;border-radius:6px;color:#b9cfd1;font-size:12px;white-space:pre-wrap;', context.length > 400 ? context.slice(0, 400) + '…' : context));
    }
    log.append(el('div', 'color:#96aaaf;font-size:12px;', image ? 'Ask about this screenshot, or press Send for an explanation.' : 'Ask about the selected text, or press Send for an explanation.'));
    input.value = '';
    pageTextBox.checked = false;
    menu.style.display = 'none';
    panel.style.display = 'flex';
    input.focus();
  }
  function closeChat() { panel.style.display = 'none'; chat = null; }

  async function sendMessage() {
    if (!chat || chat.busy) return;
    const first = chat.history.length === 0;
    const typed = input.value.trim();
    const question = typed || (first ? 'Explain what this shows and anything I should know.' : '');
    if (!question) return;
    let apiText = question;
    if (first) {
      const parts = [];
      if (chat.context) parts.push(`Selected text:\n"""\n${chat.context.slice(0, 20000)}\n"""`);
      if (pageTextBox.checked) parts.push(`Page text (may be partial):\n"""\n${(document.body?.innerText || '').slice(0, 20000)}\n"""`);
      apiText = parts.length ? parts.join('\n\n') + '\n\n' + question : question;
    }
    chat.history.push({role: 'user', text: question, apiText});
    addBubble(question, true);
    input.value = '';
    chat.busy = true;
    sendButton.style.opacity = '.5';
    const thinking = el('div', 'color:#96aaaf;font-size:12px;', 'Thinking…');
    log.append(thinking);
    log.scrollTop = log.scrollHeight;
    const current = chat;
    const messages = current.history.map((message, index) => ({role: message.role, text: message.apiText || message.text, image: index === 0 ? current.image : undefined}));
    let reply;
    try { reply = await chrome.runtime.sendMessage({type: 'ask', messages}); }
    catch (error) { reply = {ok: false, error: error.message}; }
    thinking.remove();
    current.busy = false;
    sendButton.style.opacity = '1';
    if (chat !== current) return;
    if (reply?.ok) {
      current.history.push({role: 'assistant', text: reply.text});
      addBubble(reply.text, false);
    } else {
      // Drop the failed turn so the question can be sent again.
      current.history.pop();
      input.value = question;
      const bubble = addBubble(reply?.error || 'Something went wrong.', false, true);
      if (reply?.code === 'no-key') {
        const open = el('button', `all:unset;display:block;margin-top:8px;padding:6px 12px;border-radius:8px;background:${MINT};color:#102c22;font:600 12px system-ui;cursor:pointer;`, 'Open AI settings');
        open.addEventListener('click', () => chrome.runtime.sendMessage({type: 'open-options'}));
        bubble.append(open);
      }
    }
    input.focus();
  }
  sendButton.addEventListener('click', sendMessage);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); sendMessage(); }
    else if (event.key === 'Escape') { closeChat(); }
  });

  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === 'tools-remove') { host.remove(); window.__tabPrivacyTools = false; }
  });

  document.documentElement.append(host);
})();
