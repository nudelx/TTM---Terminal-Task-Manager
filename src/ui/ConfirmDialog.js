'use strict';

const blessed = require('neo-blessed');

function createConfirmDialog({ parent, theme }) {
  const box = blessed.question({
    parent,
    label: ' Confirm ',
    border: { type: 'line' },
    style: { border: theme.get('dialogBorder') },
    top: 'center',
    left: 'center',
    width: 60,
    height: 7,
    keys: true,
    mouse: true,
    tags: true,
    hidden: true,
  });

  function open(message) {
    return new Promise((resolve) => {
      box.ask(message, (_err, ok) => resolve(Boolean(ok)));
    });
  }

  return { open };
}

module.exports = { createConfirmDialog };
