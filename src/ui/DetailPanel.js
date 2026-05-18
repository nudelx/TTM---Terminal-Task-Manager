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
    `{bold}Status{/}   : {${statusColor}-fg}${task.status}{/}`,
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

  // blessed's wide-char (emoji) width accounting drifts by one cell after each
  // wide char, so back-buffer cells past the emoji don't line up with the
  // terminal cells they appear in. clearRegion isn't enough because draw()
  // skips cells where back-buffer matches the prior frame (olines). Force a
  // full re-emit of the panel's rows by invalidating olines for those rows.
  function invalidatePriorFrame() {
    const screen = box.screen
    if (!screen.olines) return
    const y = box.atop
    const h = box.height
    if (typeof y !== 'number' || typeof h !== 'number') return
    for (let row = y; row < y + h; row++) {
      const cells = screen.olines[row]
      if (!cells) continue
      for (let col = 0; col < cells.length; col++) {
        cells[col] = [-1, ' ']
      }
    }
  }

  function show(task, number) {
    box.setContent(renderContent(task, number, theme))
    invalidatePriorFrame()
    box.screen.render()
  }

  return { box, show }
}

module.exports = { createDetailPanel }
