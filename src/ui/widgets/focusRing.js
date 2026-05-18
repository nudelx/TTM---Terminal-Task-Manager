'use strict'

// Cyclic focus ring over a fixed list of blessed elements. Each element must
// support .focus() and be reachable via screen.focused for indexing.

function createFocusRing(elements) {
  const ring = elements.slice()
  const size = ring.length

  function indexOfCurrent(screen) {
    return ring.indexOf(screen.focused)
  }

  function focusAt(i) {
    if (size === 0) return
    const wrapped = ((i % size) + size) % size
    ring[wrapped].focus()
  }

  function next(screen) {
    const i = indexOfCurrent(screen)
    focusAt(i < 0 ? 0 : i + 1)
  }

  function prev(screen) {
    const i = indexOfCurrent(screen)
    focusAt(i < 0 ? size - 1 : i - 1)
  }

  return { next, prev, focusAt }
}

module.exports = { createFocusRing }
