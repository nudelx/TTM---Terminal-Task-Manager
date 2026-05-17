'use strict';

const { createTask, updateTask, nextStatus, nextPriority } = require('./Task');

// Pure transformations over a tasks array. Each fn returns a new array,
// never mutates inputs. Out-of-range indices are no-ops.

function isValidIndex(tasks, idx) {
  return Number.isInteger(idx) && idx >= 0 && idx < tasks.length;
}

function add(tasks, data) {
  return [...tasks, createTask(data)];
}

function update(tasks, idx, patch) {
  if (!isValidIndex(tasks, idx)) return tasks;
  return tasks.map((t, i) => (i === idx ? updateTask(t, patch) : t));
}

function remove(tasks, idx) {
  if (!isValidIndex(tasks, idx)) return tasks;
  return tasks.filter((_, i) => i !== idx);
}

function cycleStatus(tasks, idx) {
  if (!isValidIndex(tasks, idx)) return tasks;
  return update(tasks, idx, { status: nextStatus(tasks[idx].status) });
}

function cyclePriority(tasks, idx) {
  if (!isValidIndex(tasks, idx)) return tasks;
  return update(tasks, idx, { priority: nextPriority(tasks[idx].priority) });
}

module.exports = { add, update, remove, cycleStatus, cyclePriority };
