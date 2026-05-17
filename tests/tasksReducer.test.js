'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const T = require('../src/domain/tasksReducer');

function seed() {
  return [
    { title: 'a', status: 'todo', priority: 'med', notes: '', createdAt: 't', updatedAt: 't' },
    { title: 'b', status: 'doing', priority: 'high', notes: '', createdAt: 't', updatedAt: 't' },
  ];
}

test('add appends a new task without mutating input', () => {
  const before = seed();
  const after = T.add(before, { title: 'c' });
  assert.equal(after.length, 3);
  assert.equal(before.length, 2);
  assert.equal(after[2].title, 'c');
});

test('update at valid index returns a new array', () => {
  const before = seed();
  const after = T.update(before, 0, { title: 'A' });
  assert.equal(after[0].title, 'A');
  assert.equal(before[0].title, 'a');
});

test('update at invalid index is a no-op (same reference)', () => {
  const before = seed();
  assert.equal(T.update(before, -1, { title: 'x' }), before);
  assert.equal(T.update(before, 99, { title: 'x' }), before);
});

test('remove drops the indexed task', () => {
  const before = seed();
  const after = T.remove(before, 0);
  assert.equal(after.length, 1);
  assert.equal(after[0].title, 'b');
});

test('cycleStatus moves through STATUSES', () => {
  const before = seed();
  const a = T.cycleStatus(before, 0);
  assert.equal(a[0].status, 'doing');
  const b = T.cycleStatus(a, 0);
  assert.equal(b[0].status, 'done');
  const c = T.cycleStatus(b, 0);
  assert.equal(c[0].status, 'todo');
});

test('cyclePriority moves through PRIORITIES', () => {
  const before = seed();
  const a = T.cyclePriority(before, 1);
  assert.equal(a[1].priority, 'low');
  const b = T.cyclePriority(a, 1);
  assert.equal(b[1].priority, 'med');
});
