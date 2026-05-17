'use strict';

const blessed = require('neo-blessed');

const OK = 0;
const CANCEL = 1;

function createConfirmDialog({ parent, theme }) {
  let resolveFn = null;
  let focused = CANCEL;
  let messageText = '';

  const container = blessed.box({
    parent,
    label: ' Confirm ',
    top: 'center',
    left: 'center',
    width: 60,
    height: 7,
    border: { type: 'line' },
    style: { border: theme.get('dialogBorder') },
    hidden: true,
    padding: { left: 1, right: 1 },
    keys: false,
    input: true,
    keyable: true,
    tags: true,
  });

  function button(label, isFocused) {
    return isFocused ? `{inverse} ${label} {/inverse}` : ` ${label} `;
  }

  function render() {
    const ok = button('[ OK ]', focused === OK);
    const cancel = button('[ Cancel ]', focused === CANCEL);
    container.setContent(`${messageText}\n\n       ${ok}    ${cancel}`);
    container.screen.render();
  }

  function finish(value) {
    container.hide();
    container.screen.render();
    const r = resolveFn;
    resolveFn = null;
    if (r) r(value);
  }

  container.on('keypress', (ch, key) => {
    if (!key) return;
    const name = key.name;
    if (name === 'left' || name === 'right' || name === 'tab') {
      focused = focused === OK ? CANCEL : OK;
      render();
      return;
    }
    if (name === 'return' || name === 'enter') {
      finish(focused === OK);
      return;
    }
    if (name === 'escape') {
      finish(false);
      return;
    }
    if (ch === 'y' || ch === 'Y') return finish(true);
    if (ch === 'n' || ch === 'N') return finish(false);
  });

  function open(message) {
    messageText = message || '';
    focused = CANCEL;
    container.show();
    container.setFront();
    container.focus();
    render();
    return new Promise((r) => { resolveFn = r; });
  }

  return { open };
}

module.exports = { createConfirmDialog };
