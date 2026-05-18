'use strict'

function createKeybindings(map) {
  const data = map || {}

  function keysFor(action) {
    const keys = data[action]
    return Array.isArray(keys) ? keys : []
  }

  function bind(target, action, handler) {
    const keys = keysFor(action)
    if (keys.length && target && typeof target.key === 'function') {
      target.key(keys, handler)
    }
  }

  return { keysFor, bind }
}

module.exports = { createKeybindings }
