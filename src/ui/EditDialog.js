'use strict';

const blessed = require('neo-blessed');
const { STATUSES, PRIORITIES } = require('../domain/Task');

function createEditDialog({ parent, theme, keys }) {
  let pendingResolve = null;

  const container = blessed.box({
    parent,
    label: ' Task ',
    top: 'center',
    left: 'center',
    width: '70%',
    height: 18,
    border: { type: 'line' },
    style: { border: theme.get('dialogBorder') },
    hidden: true,
    padding: { left: 1, right: 1 },
    tags: true,
  });

  function makeLabel(top, text) {
    blessed.text({ parent: container, top, left: 0, content: text, style: { bold: true } });
  }

  function makeInput(top, width) {
    return blessed.textbox({
      parent: container,
      top,
      left: 0,
      height: 1,
      width,
      inputOnFocus: true,
      style: {
        bg: theme.get('input.bg', 'black'),
        fg: theme.get('input.fg', 'white'),
        focus: theme.get('inputFocus'),
      },
    });
  }

  makeLabel(0, 'Title');
  const titleInput = makeInput(1, '100%-4');

  makeLabel(3, `Status (${STATUSES.join(' / ')})`);
  const statusInput = makeInput(4, 20);

  makeLabel(6, `Priority (${PRIORITIES.join(' / ')})`);
  const priorityInput = makeInput(7, 20);

  makeLabel(9, 'Notes');
  const notesInput = makeInput(10, '100%-4');

  blessed.text({
    parent: container,
    bottom: 0,
    left: 0,
    tags: true,
    style: { fg: 'gray' },
    content: '{cyan-fg}[enter]{/} next field   {cyan-fg}[C-s]{/} save   {cyan-fg}[esc]{/} cancel',
  });

  const fields = [titleInput, statusInput, priorityInput, notesInput];

  function close(result) {
    container.hide();
    container.screen.render();
    const resolve = pendingResolve;
    pendingResolve = null;
    if (resolve) resolve(result);
  }

  function collect() {
    return {
      title: titleInput.getValue() || '',
      status: statusInput.getValue() || 'todo',
      priority: priorityInput.getValue() || 'med',
      notes: notesInput.getValue() || '',
    };
  }

  fields.forEach((el, i) => {
    el.on('submit', () => {
      if (i < fields.length - 1) {
        fields[i + 1].focus();
      } else {
        close(collect());
      }
    });
    el.on('cancel', () => close(null));
    keys.bind(el, 'save', () => close(collect()));
    keys.bind(el, 'cancel', () => close(null));
  });

  function open(task) {
    titleInput.setValue(task ? task.title : '');
    statusInput.setValue(task ? task.status : 'todo');
    priorityInput.setValue(task ? task.priority : 'med');
    notesInput.setValue(task ? task.notes || '' : '');
    container.show();
    container.setFront();
    titleInput.focus();
    container.screen.render();
    return new Promise((resolve) => {
      pendingResolve = resolve;
    });
  }

  return { open };
}

module.exports = { createEditDialog };
