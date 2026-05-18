'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { createFocusRing } = require('../src/ui/widgets/focusRing')

function makeFakeScreen(elements) {
  // Mimic the bits of blessed we use: each element has a focus() that updates
  // screen.focused. createFocusRing accepts plain elements with focus().
  const screen = { focused: null }
  const wrapped = elements.map((name) => ({
    name,
    focus() {
      screen.focused = this
    },
  }))
  return { screen, elements: wrapped }
}

test('next() from no current focus picks element 0', () => {
  const { screen, elements } = makeFakeScreen(['a', 'b', 'c'])
  const ring = createFocusRing(elements)
  ring.next(screen)
  assert.equal(screen.focused, elements[0])
})

test('next() advances through the ring and wraps', () => {
  const { screen, elements } = makeFakeScreen(['a', 'b', 'c'])
  const ring = createFocusRing(elements)
  elements[0].focus()
  ring.next(screen)
  assert.equal(screen.focused, elements[1])
  ring.next(screen)
  assert.equal(screen.focused, elements[2])
  ring.next(screen)
  assert.equal(screen.focused, elements[0])
})

test('prev() goes backwards and wraps to the end', () => {
  const { screen, elements } = makeFakeScreen(['a', 'b', 'c'])
  const ring = createFocusRing(elements)
  elements[0].focus()
  ring.prev(screen)
  assert.equal(screen.focused, elements[2])
  ring.prev(screen)
  assert.equal(screen.focused, elements[1])
})

test('prev() from no current focus picks the last element', () => {
  const { screen, elements } = makeFakeScreen(['a', 'b', 'c'])
  const ring = createFocusRing(elements)
  ring.prev(screen)
  assert.equal(screen.focused, elements[2])
})

test('focusAt() wraps both directions', () => {
  const { screen, elements } = makeFakeScreen(['a', 'b', 'c'])
  const ring = createFocusRing(elements)
  ring.focusAt(4)
  assert.equal(screen.focused, elements[1])
  ring.focusAt(-1)
  assert.equal(screen.focused, elements[2])
})

test('empty ring is a safe no-op', () => {
  const { screen } = makeFakeScreen([])
  const ring = createFocusRing([])
  assert.doesNotThrow(() => ring.next(screen))
  assert.doesNotThrow(() => ring.prev(screen))
  assert.doesNotThrow(() => ring.focusAt(0))
  assert.equal(screen.focused, null)
})

test('the ring snapshots its input array (later mutation is ignored)', () => {
  const { screen, elements } = makeFakeScreen(['a', 'b'])
  const ring = createFocusRing(elements)
  elements.push({
    name: 'c',
    focus() {
      screen.focused = this
    },
  })
  elements[0].focus()
  ring.next(screen)
  assert.equal(screen.focused.name, 'b')
  ring.next(screen)
  assert.equal(screen.focused.name, 'a')
})
