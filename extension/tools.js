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
  menu.append(
    menuItem(ICONS.area, 'Screenshot an area', () => selectArea()),
    menuItem(ICONS.screen, 'Screenshot visible screen', () => copyImage(fullViewport())),
    textItem,
    el('div', 'height:1px;background:#30414b;margin:4px 0;'),
    menuItem(['M6 6l12 12', 'M18 6L6 18'], 'Hide until reload', () => host.remove())
  );
  wrap.append(toast, menu, fab);
  root.append(wrap);

  const menuOpen = () => menu.style.display === 'flex';
  function openMenu() {
    textItem.lastChild.textContent = selectedText() ? 'Copy selected text' : 'Copy page text';
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
  async function copyImage(rect) {
    host.style.visibility = 'hidden';
    const blob = captureCropped(rect).finally(() => { host.style.visibility = 'visible'; });
    try {
      await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]);
      say('Screenshot copied. Paste it anywhere.');
    } catch (error) { say('Could not copy screenshot: ' + error.message, true); }
  }

  function selectArea() {
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
      copyImage(r);
    });
  }

  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === 'tools-remove') { host.remove(); window.__tabPrivacyTools = false; }
  });

  document.documentElement.append(host);
})();
