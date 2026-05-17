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

  const inputStyle = {
    fg: 'white',
    border: theme.get('border'),
    focus: { border: theme.get('inputBorderFocus') },
  };

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
    // Manually start readInput on focus so blessed doesn't rewindFocus on Enter
    // (rewindFocus would fight our explicit field-advance chain).
    t.on('focus', () => { if (!t._reading) t.readInput(); });
    return t;
  }

  makeLabel(0, 'Title');
  const titleInput = makeTextbox(1, '100%-4');

  makeLabel(5, `Status (${STATUSES.join(' / ')})`);
  const statusInput = makeTextbox(6, 22);

  makeLabel(10, `Priority (${PRIORITIES.join(' / ')})`);
  const priorityInput = makeTextbox(11, 22);

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

  // Enter on single-line fields advances to the next; from priority, go to notes.
  const singleLine = [titleInput, statusInput, priorityInput];
  singleLine.forEach((el, i) => {
    el.on('submit', () => {
      const next = singleLine[i + 1];
      if (next) next.focus();
      else notesEditor.focus();
    });
  });

  const focusRing = createFocusRing([
    titleInput,
    statusInput,
    priorityInput,
    notesEditor.box,
  ]);

  unlockKeys(screen, keys, ['save', 'cancel', 'next', 'prev']);

  keys.bind(screen, 'save', () => { if (isOpen()) close(collect()); });
  keys.bind(screen, 'cancel', () => { if (isOpen()) close(null); });
  keys.bind(screen, 'next', () => { if (isOpen()) focusRing.next(screen); });
  keys.bind(screen, 'prev', () => { if (isOpen()) focusRing.prev(screen); });

  function open(task) {
    titleInput.setValue(task ? task.title : '');
    statusInput.setValue(task ? task.status : 'todo');
    priorityInput.setValue(task ? task.priority : 'med');
    notesEditor.setValue(task ? task.notes || '' : '');
    container.show();
    container.setFront();
    titleInput.focus();
    container.screen.render();
    return new Promise((resolve) => { pendingResolve = resolve; });
  }

  return { open, isOpen };
}

module.exports = { createEditDialog };
