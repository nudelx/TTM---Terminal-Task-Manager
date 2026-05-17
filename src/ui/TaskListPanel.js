'use strict';

const blessed = require('neo-blessed');

function formatRow(task, theme) {
  const statusColor = theme.statusColor(task.status);
  const prioColor = theme.priorityColor(task.priority);
  const status = `{${statusColor}-fg}${task.status.padEnd(5)}{/}`;
  const prio = `{${prioColor}-fg}${task.priority[0].toUpperCase()}{/}`;
  return `${status} ${prio}  ${task.title}`;
}

function createTaskListPanel({ parent, theme, onSelect }) {
  let tasks = [];

  const box = blessed.list({
    parent,
    label: ' Tasks ',
    top: 0,
    left: 0,
    width: '40%',
    height: '100%-1',
    border: { type: 'line' },
    style: {
      border: theme.get('border'),
      focus: { border: theme.get('borderFocused') },
      selected: theme.get('selected'),
      item: { fg: 'white' },
    },
    keys: false,
    mouse: true,
    tags: true,
  });

  function emitSelected() {
    if (typeof onSelect === 'function') {
      onSelect(tasks[box.selected] || null);
    }
  }

  box.on('select item', emitSelected);

  function setTasks(next) {
    tasks = Array.isArray(next) ? next : [];
    box.setItems(tasks.map((t) => formatRow(t, theme)));
    if (tasks.length === 0) {
      box.select(0);
      emitSelected();
    } else {
      const idx = Math.min(Math.max(box.selected || 0, 0), tasks.length - 1);
      box.select(idx);
      emitSelected();
    }
    box.screen.render();
  }

  return {
    box,
    setTasks,
    selectedTask: () => tasks[box.selected] || null,
    selectedIndex: () => box.selected,
    moveDown: () => { box.down(1); box.screen.render(); },
    moveUp: () => { box.up(1); box.screen.render(); },
    focus: () => box.focus(),
  };
}

module.exports = { createTaskListPanel };
