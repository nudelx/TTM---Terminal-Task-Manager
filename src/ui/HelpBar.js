'use strict';

const blessed = require('neo-blessed');

const HINTS = [
  ['add', 'add'],
  ['edit', 'edit'],
  ['delete', 'del'],
  ['toggleStatus', 'status'],
  ['cyclePriority', 'prio'],
  ['quit', 'quit'],
];

function createHelpBar({ parent, theme, keys }) {
  const text = HINTS
    .map(([action, label]) => {
      const k = keys.keysFor(action)[0] || '';
      return `{cyan-fg}[${k}]{/} ${label}`;
    })
    .join('  ');

  const box = blessed.box({
    parent,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    style: theme.get('help'),
    content: ` ${text}`,
  });

  return { box };
}

module.exports = { createHelpBar };
