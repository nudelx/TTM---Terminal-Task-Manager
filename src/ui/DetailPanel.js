'use strict';

const blessed = require('neo-blessed');

function renderContent(task, theme) {
  if (!task) {
    return '{gray-fg}No task selected{/}';
  }
  const statusColor = theme.statusColor(task.status);
  const prioColor = theme.priorityColor(task.priority);
  return [
    `{bold}Title{/}    : ${task.title}`,
    `{bold}Status{/}   : {${statusColor}-fg}${task.status}{/}`,
    `{bold}Priority{/} : {${prioColor}-fg}${task.priority}{/}`,
    `{bold}Created{/}  : ${task.createdAt}`,
    `{bold}Updated{/}  : ${task.updatedAt}`,
    '',
    '{bold}Notes{/}',
    task.notes ? task.notes : '{gray-fg}(none){/}',
  ].join('\n');
}

function createDetailPanel({ parent, theme }) {
  const box = blessed.box({
    parent,
    label: ' Details ',
    top: 0,
    left: '40%',
    width: '60%',
    height: '100%-1',
    border: { type: 'line' },
    style: { border: theme.get('border') },
    tags: true,
    padding: { left: 1, right: 1 },
  });

  function show(task) {
    box.setContent(renderContent(task, theme));
    box.screen.render();
  }

  return { box, show };
}

module.exports = { createDetailPanel };
