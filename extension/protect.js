(() => {
  'use strict';
  // Each registration runs once at document_start in the page's MAIN world.
  for (const [key, value] of Object.entries({hidden: false, visibilityState: 'visible', webkitHidden: false, webkitVisibilityState: 'visible'})) {
    try { Object.defineProperty(document, key, {configurable: true, get: () => value}); } catch {}
  }
  try { Object.defineProperty(document, 'hasFocus', {configurable: true, value: () => true}); } catch {}
  const stop = event => {
    // Keep input/button focus events intact for forms and accessibility.
    if (event.type.includes('visibilitychange') || event.target === window || event.target === document) {
      event.stopImmediatePropagation();
    }
  };
  for (const type of ['visibilitychange', 'webkitvisibilitychange', 'blur', 'focus']) {
    window.addEventListener(type, stop, true);
  }
})();
