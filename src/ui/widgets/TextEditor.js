'use strict';

const blessed = require('neo-blessed');

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
  onSubmit,
  onExitUp,
  onExitDown,
}) {
  let lines = [''];
  let row = 0;
  let col = 0;

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

  function clampCol() {
    if (col < 0) col = 0;
    if (col > lines[row].length) col = lines[row].length;
  }

  function isFocused() {
    return box.screen && box.screen.focused === box;
  }

  function ensureCursorVisible() {
    if (typeof box.scrollTo !== 'function') return;
    const visibleRows = Math.max(1, (box.height || 0) - 2);
    const top = box.childBase || 0;
    if (row < top) box.scrollTo(row);
    else if (row >= top + visibleRows) box.scrollTo(row - visibleRows + 1);
  }

  function render() {
    if (!isFocused()) {
      box.setContent(lines.map(escapeTags).join('\n'));
    } else {
      const out = lines.map((line, i) => {
        if (i !== row) return escapeTags(line);
        const at = col < line.length ? line[col] : ' ';
        const before = line.slice(0, col);
        const after = col < line.length ? line.slice(col + 1) : '';
        return `${escapeTags(before)}{inverse}${escapeTags(at)}{/inverse}${escapeTags(after)}`;
      });
      box.setContent(out.join('\n'));
      ensureCursorVisible();
    }
    box.screen.render();
  }

  function insertNewline() {
    const cur = lines[row];
    lines[row] = cur.slice(0, col);
    lines.splice(row + 1, 0, cur.slice(col));
    row++;
    col = 0;
  }

  function handleKey(ch, key) {
    if (!isFocused() || !key) return;
    const name = key.name;

    // \n arrives as name='linefeed' (blessed renames it from 'enter' for \n
    // sequences). This is what Ctrl+J sends natively and what our key
    // translator emits for Ctrl+Enter. Insert a newline.
    if (name === 'linefeed') {
      insertNewline();
      render();
      return;
    }

    if (key.ctrl || name === 'escape') {
      return;
    }

    // Plain Enter (\r) submits/saves. blessed emits both 'return' (original)
    // and a synthetic 'enter' event for \r; both should save.
    if (name === 'return' || name === 'enter') {
      if (typeof onSubmit === 'function') onSubmit();
      return;
    }

    if (name === 'left') {
      if (col > 0) col--;
      else if (row > 0) { row--; col = lines[row].length; }
    } else if (name === 'right') {
      if (col < lines[row].length) col++;
      else if (row < lines.length - 1) { row++; col = 0; }
    } else if (name === 'up') {
      if (row > 0) { row--; clampCol(); }
      else if (typeof onExitUp === 'function') { onExitUp(); return; }
      else return;
    } else if (name === 'down') {
      if (row < lines.length - 1) { row++; clampCol(); }
      else if (typeof onExitDown === 'function') { onExitDown(); return; }
      else return;
    } else if (name === 'home') {
      col = 0;
    } else if (name === 'end') {
      col = lines[row].length;
    } else if (name === 'backspace') {
      if (col > 0) {
        lines[row] = lines[row].slice(0, col - 1) + lines[row].slice(col);
        col--;
      } else if (row > 0) {
        const prevLen = lines[row - 1].length;
        lines[row - 1] = lines[row - 1] + lines[row];
        lines.splice(row, 1);
        row--;
        col = prevLen;
      }
    } else if (name === 'delete') {
      if (col < lines[row].length) {
        lines[row] = lines[row].slice(0, col) + lines[row].slice(col + 1);
      } else if (row < lines.length - 1) {
        lines[row] = lines[row] + lines[row + 1];
        lines.splice(row + 1, 1);
      }
    } else if (ch && ch.length === 1 && ch >= ' ') {
      lines[row] = lines[row].slice(0, col) + ch + lines[row].slice(col);
      col++;
    } else {
      return;
    }

    render();
  }

  box.on('keypress', handleKey);
  box.on('focus', render);
  box.on('blur', render);

  function getValue() {
    return lines.join('\n');
  }

  function setValue(v) {
    const str = typeof v === 'string' ? v : '';
    lines = str.split('\n');
    if (lines.length === 0) lines = [''];
    row = 0;
    col = 0;
    render();
  }

  return {
    box,
    focus: () => box.focus(),
    getValue,
    setValue,
  };
}

module.exports = { createTextEditor };
