'use strict';

const crypto = require('crypto');

const STATUSES = ['todo', 'doing', 'done'];
const PRIORITIES = ['low', 'med', 'high'];

function nowIso() {
  return new Date().toISOString();
}

function normalize(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function createTask(input) {
  const data = input || {};
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (!title) {
    throw new Error('Task title is required');
  }
  const ts = nowIso();
  return {
    id: crypto.randomUUID(),
    title,
    status: normalize(data.status, STATUSES, 'todo'),
    priority: normalize(data.priority, PRIORITIES, 'med'),
    notes: typeof data.notes === 'string' ? data.notes : '',
    createdAt: ts,
    updatedAt: ts,
  };
}

function updateTask(task, patch) {
  const next = { ...task };
  if (typeof patch.title === 'string' && patch.title.trim()) {
    next.title = patch.title.trim();
  }
  if (patch.status !== undefined) {
    next.status = normalize(patch.status, STATUSES, task.status);
  }
  if (patch.priority !== undefined) {
    next.priority = normalize(patch.priority, PRIORITIES, task.priority);
  }
  if (typeof patch.notes === 'string') {
    next.notes = patch.notes;
  }
  next.updatedAt = nowIso();
  return next;
}

function cycle(values, current) {
  const idx = values.indexOf(current);
  return values[(idx + 1) % values.length];
}

function nextStatus(status) {
  return cycle(STATUSES, status);
}

function nextPriority(priority) {
  return cycle(PRIORITIES, priority);
}

module.exports = {
  STATUSES,
  PRIORITIES,
  createTask,
  updateTask,
  nextStatus,
  nextPriority,
};
