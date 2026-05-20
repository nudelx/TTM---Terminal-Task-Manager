'use strict'

const blessed = require('neo-blessed')
const { formatDateWithRelative } = require('../util/time')

function renderContent(task, number, theme) {
  if (!task) {
    return '{gray-fg}No task selected{/}'
  }
  const statusColor = theme.statusColor(task.status)
  const prioColor = theme.priorityColor(task.priority)
  return [
    `{bold}Number{/}   : ${number}`,
    `{bold}Title{/}    : ${task.title}`,
    `{bold}Status{/}   : {${statusColor}-fg}${theme.statusIcon(task.status)} ${task.status}{/}`,
    `{bold}Priority{/} : {${prioColor}-fg}${task.priority}{/}`,
    `{bold}Created{/}  : ${formatDateWithRelative(task.createdAt)}`,
    `{bold}Updated{/}  : ${formatDateWithRelative(task.updatedAt)}`,
    '',
    '{bold}Notes{/}',
    '',
    task.notes ? task.notes : '{gray-fg}(none){/}',
  ].join('\n')
}

function createDetailPanel({ parent, theme }) {
  const box = blessed.box({
    parent,
    label: ' Details ',
    top: 0,
    left: '40%',
    width: '60%',
    height: '100%-1',
    border: { type: 'line' },
    style: { border: theme.get('border') },
    tags: true,
    padding: { left: 1, right: 1, top: 1 },
  })

  let current = { task: null, number: null }

  function show(task, number) {
    current = { task, number }
    box.setContent(renderContent(task, number, theme))
    box.screen.render()
  }

  // Re-flow content at the new geometry. Called by App before blessed renders
  // on resize, so the new frame paints the new state directly.
  function refreshLayout() {
    box.setContent(renderContent(current.task, current.number, theme))
  }

  return { box, show, refreshLayout }
}

module.exports = { createDetailPanel }
