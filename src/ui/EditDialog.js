'use strict';

const blessed = require('neo-blessed');
const { STATUSES, PRIORITIES } = require('../domain/Task');
const { createTextEditor } = require('./widgets/TextEditor');
const { createFocusRing } = require('./widgets/focusRing');

// blessed textbox/textarea set screen.grabKeys = true during input, which
// suppresses screen-level .key() handlers. Adding a key to screen.ignoreLocked
// lets it bypass that filter so our dialog shortcuts still fire while editing.
function unlockKeys(screen, keys, actions) {
  screen.ignoreLocked = screen.ignoreLocked || [];
  for (const action of actions) {
    for (const k of keys.keysFor(action)) {
      if (!screen.ignoreLocked.includes(k)) screen.ignoreLocked.push(k);
    }
  }
}

function createEditDialog({ screen, theme, keys }) {
  let pendingResolve = null;

  const container = blessed.box({
    parent: screen,
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

  makeLabel(0, 'Title');
  makeLabel(5, `Status (${STATUSES.join(' / ')})`);
  makeLabel(10, `Priority (${PRIORITIES.join(' / ')})`);
  makeLabel(15, 'Notes  {gray-fg}(C-enter = newline, arrows = move){/}');

  const isOpen = () => !container.hidden;

  function close(result) {
    if (container.hidden) return;
    container.hide();
    container.screen.render();
    const resolve = pendingResolve;
    pendingResolve = null;
    if (resolve) resolve(result);
  }

  const editors = {};

  function collect() {
    return {
      title: editors.title.getValue() || '',
      status: editors.status.getValue() || 'todo',
      priority: editors.priority.getValue() || 'med',
      notes: editors.notes.getValue() || '',
    };
  }

  editors.title = createTextEditor({
    parent: container,
    top: 1,
    left: 0,
    width: '100%-4',
    height: 3,
    theme,
    singleLine: true,
    onSubmit: () => editors.status.focus(),
    onExitDown: () => editors.status.focus(),
  });

  editors.status = createTextEditor({
    parent: container,
    top: 6,
    left: 0,
    width: 22,
    height: 3,
    theme,
    singleLine: true,
    onSubmit: () => editors.priority.focus(),
    onExitUp: () => editors.title.focus(),
    onExitDown: () => editors.priority.focus(),
  });

  editors.priority = createTextEditor({
    parent: container,
    top: 11,
    left: 0,
    width: 22,
    height: 3,
    theme,
    singleLine: true,
    onSubmit: () => editors.notes.focus(),
    onExitUp: () => editors.status.focus(),
    onExitDown: () => editors.notes.focus(),
  });

  editors.notes = createTextEditor({
    parent: container,
    top: 16,
    left: 0,
    width: '100%-4',
    height: 5,
    theme,
    onSubmit: () => { if (isOpen()) close(collect()); },
    onExitUp: () => editors.priority.focus(),
    onExitDown: () => editors.title.focus(),
  });

  blessed.text({
    parent: container,
    bottom: 0,
    left: 0,
    tags: true,
    style: { fg: 'gray' },
    content: '{cyan-fg}[enter]{/} save / next   {cyan-fg}[C-enter]{/} newline   {cyan-fg}[tab]{/} field   {cyan-fg}[esc]{/} cancel',
  });

  const focusRing = createFocusRing([
    editors.title.box,
    editors.status.box,
    editors.priority.box,
    editors.notes.box,
  ]);

  unlockKeys(screen, keys, ['save', 'cancel', 'next', 'prev']);

  keys.bind(screen, 'save', () => { if (isOpen()) close(collect()); });
  keys.bind(screen, 'cancel', () => { if (isOpen()) close(null); });
  keys.bind(screen, 'next', () => { if (isOpen()) focusRing.next(screen); });
  keys.bind(screen, 'prev', () => { if (isOpen()) focusRing.prev(screen); });

  function open(task) {
    editors.title.setValue(task ? task.title : '');
    editors.status.setValue(task ? task.status : 'todo');
    editors.priority.setValue(task ? task.priority : 'med');
    editors.notes.setValue(task ? task.notes || '' : '');
    container.show();
    container.setFront();
    editors.title.focus();
    container.screen.render();
    return new Promise((resolve) => { pendingResolve = resolve; });
  }

  return { open, isOpen };
}

module.exports = { createEditDialog };
