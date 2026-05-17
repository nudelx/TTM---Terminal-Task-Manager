'use strict';

// blessed/neo-blessed doesn't parse xterm's "modifyOtherKeys" format 2
// sequences (CSI 27;<modifier>;<keycode>~). Without a translation, terminals
// that emit these end up inserting the raw digits as if they were typed.
//
// We monkey-patch the TTY input stream's emit() so that 'data' events are
// rewritten BEFORE any downstream listener (readline keypress parser, blessed
// program data emitter, etc.) sees them.
const TRANSLATIONS = [
  // Ctrl+Enter  -> \n  (which blessed parses as name='enter')
  { pattern: /\x1b\[27;5;13[~^$]/g, replacement: '\n' },
];

function installKeyTranslation(screen) {
  const input = screen && screen.program && screen.program.input;
  if (!input || input.__ttmTranslated) return;
  input.__ttmTranslated = true;

  const origEmit = input.emit.bind(input);
  input.emit = function (event, data, ...rest) {
    if (event === 'data' && Buffer.isBuffer(data)) {
      let s = data.toString('utf8');
      for (const { pattern, replacement } of TRANSLATIONS) {
        s = s.replace(pattern, replacement);
      }
      data = Buffer.from(s, 'utf8');
    }
    return origEmit(event, data, ...rest);
  };
}

module.exports = { installKeyTranslation };
