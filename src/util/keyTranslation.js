'use strict';

// blessed/neo-blessed doesn't parse xterm's "modifyOtherKeys" format 2
// sequences (CSI 27;<modifier>;<keycode>~) nor the CSI u format
// (CSI <keycode>;<modifier>u). Without translation, the digits get
// re-emitted as if typed.
//
// We intercept incoming data BEFORE blessed's readline parser sees it,
// substituting Ctrl+Enter sequences with a literal \n. blessed parses \n
// as name='linefeed', which TextEditor uses as the newline trigger.
const TRANSLATIONS = [
  { pattern: /\x1b\[27[;:]5[;:]13[~^$]/g, replacement: '\n' },
  { pattern: /\x1b\[13;5u/g, replacement: '\n' },
];

function transform(buf) {
  if (!Buffer.isBuffer(buf)) return buf;
  const before = buf.toString('utf8');
  let after = before;
  for (const { pattern, replacement } of TRANSLATIONS) {
    after = after.replace(pattern, replacement);
  }
  return after === before ? buf : Buffer.from(after, 'utf8');
}

function installKeyTranslation(screen) {
  const input = screen && screen.program && screen.program.input;
  if (!input || input.__ttmTranslated) return;
  input.__ttmTranslated = true;

  const forwarded = input.listeners('data').slice();
  input.removeAllListeners('data');

  function ttmDataListener(buf) {
    const data = transform(buf);
    for (const fn of forwarded) {
      try { fn.call(input, data); } catch (_) { /* swallow */ }
    }
  }
  input.on('data', ttmDataListener);

  const origOn = input.on.bind(input);
  const origPrepend = input.prependListener.bind(input);
  const origRemove = input.removeListener.bind(input);

  function addData(event, fn) {
    if (event === 'data' && fn !== ttmDataListener) {
      forwarded.push(fn);
      return input;
    }
    return origOn(event, fn);
  }
  function prependData(event, fn) {
    if (event === 'data' && fn !== ttmDataListener) {
      forwarded.unshift(fn);
      return input;
    }
    return origPrepend(event, fn);
  }
  input.on = addData;
  input.addListener = addData;
  input.prependListener = prependData;
  input.removeListener = function (event, fn) {
    if (event === 'data' && fn !== ttmDataListener) {
      const i = forwarded.indexOf(fn);
      if (i >= 0) forwarded.splice(i, 1);
      return input;
    }
    return origRemove(event, fn);
  };
}

module.exports = { installKeyTranslation };
