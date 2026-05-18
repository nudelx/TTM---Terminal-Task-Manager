'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const E = require('../src/ui/widgets/editorState')

test('fromString / toString roundtrip', () => {
  const s = E.fromString('hello\nworld')
  assert.deepEqual(s.lines, ['hello', 'world'])
  assert.equal(s.row, 0)
  assert.equal(s.col, 0)
  assert.equal(E.toString(s), 'hello\nworld')
})

test('fromString of empty value yields single empty line', () => {
  const s = E.fromString('')
  assert.deepEqual(s.lines, [''])
  assert.equal(E.toString(s), '')
})

test('insertChar at start of line', () => {
  const s = E.insertChar(E.fromString('bc'), 'a')
  assert.equal(E.toString(s), 'abc')
  assert.equal(s.col, 1)
})

test('insertNewline splits the line at the cursor', () => {
  let s = E.fromString('hello world')
  s = { ...s, col: 5 }
  s = E.insertNewline(s)
  assert.deepEqual(s.lines, ['hello', ' world'])
  assert.equal(s.row, 1)
  assert.equal(s.col, 0)
})

test('moveLeft wraps to previous line at column 0', () => {
  let s = E.fromString('ab\ncd')
  s = { ...s, row: 1, col: 0 }
  s = E.moveLeft(s)
  assert.equal(s.row, 0)
  assert.equal(s.col, 2)
})

test('moveRight wraps to next line at end of line', () => {
  let s = E.fromString('ab\ncd')
  s = { ...s, row: 0, col: 2 }
  s = E.moveRight(s)
  assert.equal(s.row, 1)
  assert.equal(s.col, 0)
})

test('moveUp returns null at row 0', () => {
  assert.equal(E.moveUp(E.fromString('hi')), null)
})

test('moveDown returns null at last row', () => {
  const s = E.fromString('hi')
  assert.equal(E.moveDown(s), null)
})

test('moveUp clamps column to new line length', () => {
  let s = E.fromString('ab\nfoo bar')
  s = { ...s, row: 1, col: 7 }
  s = E.moveUp(s)
  assert.equal(s.row, 0)
  assert.equal(s.col, 2)
})

test('backspace at column 0 merges with previous line', () => {
  let s = E.fromString('ab\ncd')
  s = { ...s, row: 1, col: 0 }
  s = E.backspace(s)
  assert.deepEqual(s.lines, ['abcd'])
  assert.equal(s.row, 0)
  assert.equal(s.col, 2)
})

test('del at end of line merges with next line', () => {
  let s = E.fromString('ab\ncd')
  s = { ...s, row: 0, col: 2 }
  s = E.del(s)
  assert.deepEqual(s.lines, ['abcd'])
  assert.equal(s.row, 0)
  assert.equal(s.col, 2)
})

test('moveHome / moveEnd', () => {
  let s = E.fromString('hello')
  s = { ...s, col: 3 }
  assert.equal(E.moveHome(s).col, 0)
  assert.equal(E.moveEnd(s).col, 5)
})

test('inputs are not mutated', () => {
  const a = E.fromString('hi')
  const linesRef = a.lines
  E.insertChar(a, 'x')
  assert.equal(a.lines, linesRef)
  assert.deepEqual(a.lines, ['hi'])
})
