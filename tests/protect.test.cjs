const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup() {
  const handlers = {};
  const document = {};
  const window = {addEventListener(type, fn, capture) {assert.equal(capture, true); handlers[type] = fn;}};
  vm.runInNewContext(fs.readFileSync('extension/protect.js', 'utf8'), {document, window});
  return {document, window, handlers};
}
test('reports visible and focused', () => {
  const {document} = setup();
  assert.equal(document.hidden, false);
  assert.equal(document.visibilityState, 'visible');
  assert.equal(document.webkitHidden, false);
  assert.equal(document.hasFocus(), true);
});
test('blocks visibility and window focus signals but preserves form focus', () => {
  const {document, window, handlers} = setup();
  for (const [type, target, expected] of [['visibilitychange', document, true], ['webkitvisibilitychange', document, true], ['blur', window, true], ['focus', window, true], ['blur', {}, false], ['focus', {}, false]]) {
    let stopped = false;
    handlers[type]({type, target, stopImmediatePropagation() {stopped = true;}});
    assert.equal(stopped, expected);
  }
});
