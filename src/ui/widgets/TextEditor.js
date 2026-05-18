'use strict';

const blessed = require('neo-blessed');
const E = require('./editorState');

function escapeTags(text) {
  return String(text).replace(/[{}]/g, (c) => (c === '{' ? '{open}' : '{close}'));
}

function createTextEditor({
  parent,
  top,
  left,
  width,
  height,
  theme,
  singleLine = false,
  onSubmit,
  onExitUp,
  onExitDown,
}) {
  let state = E.fromString('');

  const box = blessed.box({
    parent,
    top,
    left,
    width,
    height,
    border: { type: 'line' },
    style: {
      fg: 'white',
      border: theme.get('border'),
      focus: { border: theme.get('inputBorderFocus') },
    },
    keys: false,
    input: true,
    keyable: true,
    scrollable: true,
    alwaysScroll: true,
    tags: true,
  });

  const isFocused = () => box.screen && box.screen.focused === box;

  function ensureCursorVisible() {
    if (typeof box.scrollTo !== 'function') return;
    const visibleRows = Math.max(1, (box.height || 0) - 2);
    const top = box.childBase || 0;
    if (state.row < top) box.scrollTo(state.row);
    else if (state.row >= top + visibleRows) box.scrollTo(state.row - visibleRows + 1);
  }

  function renderCursorRow(line) {
    const at = state.col < line.length ? line[state.col] : ' ';
    const before = line.slice(0, state.col);
    const after = state.col < line.length ? line.slice(state.col + 1) : '';
    return `${escapeTags(before)}{inverse}${escapeTags(at)}{/inverse}${escapeTags(after)}`;
  }

  function render() {
    if (!isFocused()) {
      box.setContent(state.lines.map(escapeTags).join('\n'));
    } else {
      const out = state.lines.map((line, i) => (i === state.row ? renderCursorRow(line) : escapeTags(line)));
      box.setContent(out.join('\n'));
      ensureCursorVisible();
    }
    box.screen.render();
  }

  // Map a blessed key event to a state-transition function (or null for no-op).
  function keyToTransition(ch, key) {
    const name = key.name;
    // Ctrl+Enter / Ctrl+J arrive as 'linefeed' after keyTranslation; newline.
    if (name === 'linefeed') return singleLine ? null : (s) => E.insertNewline(s);
    // Other ctrl combos and escape bubble to screen-level handlers.
    if (key.ctrl || name === 'escape') return null;
    // Plain Enter saves — caller does it via onSubmit, not via state.
    if (name === 'return' || name === 'enter') return 'submit';

    if (name === 'left') return E.moveLeft;
    if (name === 'right') return E.moveRight;
    if (name === 'up') return 'up';
    if (name === 'down') return 'down';
    if (name === 'home') return E.moveHome;
    if (name === 'end') return E.moveEnd;
    if (name === 'backspace') return E.backspace;
    if (name === 'delete') return E.del;
    if (ch && ch.length === 1 && ch >= ' ') return (s) => E.insertChar(s, ch);
    return null;
  }

  function handleKey(ch, key) {
    if (!isFocused() || !key) return;
    const transition = keyToTransition(ch, key);
    if (transition === null) return;
    if (transition === 'submit') {
      if (typeof onSubmit === 'function') onSubmit();
      return;
    }
    if (transition === 'up') {
      const next = E.moveUp(state);
      if (next === null) { if (typeof onExitUp === 'function') onExitUp(); return; }
      state = next;
    } else if (transition === 'down') {
      const next = E.moveDown(state);
      if (next === null) { if (typeof onExitDown === 'function') onExitDown(); return; }
      state = next;
    } else {
      state = transition(state);
    }
    render();
  }

  box.on('keypress', handleKey);
  box.on('focus', render);
  box.on('blur', render);

  return {
    box,
    focus: () => box.focus(),
    getValue: () => E.toString(state),
    setValue: (v) => { state = E.fromString(v); render(); },
  };
}

module.exports = { createTextEditor };
