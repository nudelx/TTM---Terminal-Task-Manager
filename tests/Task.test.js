'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const {
  STATUSES,
  PRIORITIES,
  createTask,
  updateTask,
  nextStatus,
  nextPriority,
} = require('../src/domain/Task')

test('createTask requires a non-empty title', () => {
  assert.throws(() => createTask({}))
  assert.throws(() => createTask({ title: '   ' }))
  assert.throws(() => createTask({ title: 123 }))
})

test('createTask normalizes status and priority', () => {
  const t = createTask({ title: 'x', status: 'bogus', priority: 'nope' })
  assert.equal(t.status, 'todo')
  assert.equal(t.priority, 'med')
})

test('createTask trims the title', () => {
  assert.equal(createTask({ title: '  hi  ' }).title, 'hi')
})

test('createTask stamps timestamps', () => {
  const t = createTask({ title: 'x' })
  assert.match(t.createdAt, /^\d{4}-\d{2}-\d{2}T/)
  assert.equal(t.createdAt, t.updatedAt)
})

test('updateTask is non-mutating and bumps updatedAt', async () => {
  const base = createTask({ title: 'x' })
  await new Promise((r) => setTimeout(r, 5))
  const next = updateTask(base, { title: 'y' })
  assert.notEqual(next, base)
  assert.equal(base.title, 'x')
  assert.equal(next.title, 'y')
  assert.notEqual(next.updatedAt, base.updatedAt)
})

test('updateTask ignores empty title and invalid status/priority', () => {
  const t = createTask({ title: 'x', status: 'doing', priority: 'high' })
  const u = updateTask(t, { title: '   ', status: 'bad', priority: 'bad' })
  assert.equal(u.title, 'x')
  assert.equal(u.status, 'doing')
  assert.equal(u.priority, 'high')
})

test('nextStatus / nextPriority cycle through the allowed values', () => {
  let s = STATUSES[0]
  const seen = new Set()
  for (let i = 0; i < STATUSES.length; i++) {
    seen.add(s)
    s = nextStatus(s)
  }
  assert.deepEqual([...seen].sort(), [...STATUSES].sort())

  let p = PRIORITIES[0]
  const pseen = new Set()
  for (let i = 0; i < PRIORITIES.length; i++) {
    pseen.add(p)
    p = nextPriority(p)
  }
  assert.deepEqual([...pseen].sort(), [...PRIORITIES].sort())
})
