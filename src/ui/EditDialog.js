'use strict';

const blessed = require('neo-blessed');
const { STATUSES, PRIORITIES } = require('../domain/Task');
const { createTextEditor } = require('./widgets/TextEditor');

function createEditDialog({ parent, theme, keys }) {
  let pendingResolve = null;

  const container = blessed.box({
    parent,
    label: ' Task ',
    top: 'center',
    left: 'center',
    width: '70%',
    height: 24,
    border: { type: 'line' },
    style: { border: theme.get('dialogBorder') },
    hidden: true,
    padding: { left: 1, right: 1 },
    tags: true,
  });

  function makeLabel(top, text) {
    blessed.text({
      parent: container,
      top,
      left: 0,
      content: text,
      tags: true,
      style: { bold: true },
    });
  }

  const inputStyle = {
    fg: 'white',
    border: theme.get('border'),
    focus: { border: theme.get('inputBorderFocus') },
  };

  function makeTextbox(top, width) {
    const t = blessed.textbox({
      parent: container,
      top,
      left: 0,
      height: 3,
      width,
      inputOnFocus: false,
      border: { type: 'line' },
      style: inputStyle,
    });
    t.on('focus', () => {
      if (!t._reading) t.readInput();
    });
    return t;
  }

  makeLabel(0, 'Title');
  const titleInput = makeTextbox(1, '100%-4');

  makeLabel(5, `Status (${STATUSES.join(' / ')})`);
  const statusInput = makeTextbox(6, 22);

  makeLabel(10, `Priority (${PRIORITIES.join(' / ')})`);
  const priorityInput = makeTextbox(11, 22);

  makeLabel(15, 'Notes  {gray-fg}(C-enter = newline, arrows = move){/}');

  function isOpen() {
    return !container.hidden;
  }

  function close(result) {
    if (container.hidden) return;
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
      notes: notesEditor.getValue() || '',
    };
  }

  const notesEditor = createTextEditor({
    parent: container,
    top: 16,
    left: 0,
    width: '100%-4',
    height: 5,
    theme,
    onSubmit: () => { if (isOpen()) close(collect()); },
    onExitUp: () => priorityInput.focus(),
    onExitDown: () => titleInput.focus(),
  });

  blessed.text({
    parent: container,
    bottom: 0,
    left: 0,
    tags: true,
    style: { fg: 'gray' },
    content: '{cyan-fg}[enter]{/} save / next   {cyan-fg}[C-enter]{/} newline   {cyan-fg}[tab]{/} field   {cyan-fg}[esc]{/} cancel',
  });

  const singleLineFields = [titleInput, statusInput, priorityInput];
  singleLineFields.forEach((el, i) => {
    el.on('submit', () => {
      const next = singleLineFields[i + 1];
      if (next) next.focus();
      else notesEditor.focus();
    });
  });

  const focusOrder = [titleInput, statusInput, priorityInput, notesEditor.box];

  function focusAt(idx) {
    const n = focusOrder.length;
    focusOrder[((idx % n) + n) % n].focus();
  }

  function currentFocusIndex() {
    return focusOrder.indexOf(container.screen.focused);
  }

  // blessed textbox/textarea set screen.grabKeys = true during input, which
  // suppresses screen-level .key() handlers. ignoreLocked lets specific keys
  // bypass that filter so our dialog shortcuts still work while editing.
  parent.ignoreLocked = parent.ignoreLocked || [];
  ['save', 'cancel', 'next', 'prev'].forEach((action) => {
    keys.keysFor(action).forEach((k) => {
      if (!parent.ignoreLocked.includes(k)) parent.ignoreLocked.push(k);
    });
  });

  keys.bind(parent, 'save', () => { if (isOpen()) close(collect()); });
  keys.bind(parent, 'cancel', () => { if (isOpen()) close(null); });
  keys.bind(parent, 'next', () => {
    if (!isOpen()) return;
    const i = currentFocusIndex();
    focusAt(i < 0 ? 0 : i + 1);
  });
  keys.bind(parent, 'prev', () => {
    if (!isOpen()) return;
    const i = currentFocusIndex();
    focusAt(i < 0 ? focusOrder.length - 1 : i - 1);
  });

  function open(task) {
    titleInput.setValue(task ? task.title : '');
    statusInput.setValue(task ? task.status : 'todo');
    priorityInput.setValue(task ? task.priority : 'med');
    notesEditor.setValue(task ? task.notes || '' : '');
    container.show();
    container.setFront();
    titleInput.focus();
    container.screen.render();
    return new Promise((resolve) => {
      pendingResolve = resolve;
    });
  }

  return { open, isOpen };
}

module.exports = { createEditDialog };
