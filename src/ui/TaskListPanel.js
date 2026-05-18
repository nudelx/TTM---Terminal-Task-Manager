'use strict'

const blessed = require('neo-blessed')

// Visible widths: num(3) + ' ' + prio(1) + '  ' + title(?) + ' ' + statusIcon(1) + ' '
// trailing space keeps the icon off the rightmost column (neo-blessed clips there).
const FIXED_WIDTH = 3 + 1 + 1 + 2 + 1 + 1 + 1

// Terminal cell width for a code point — code points above the BMP (emojis like
// 🤓 📖) render as two cells. padEnd uses string length, which counts the two
// surrogate halves of an emoji as 2 but the emoji visually takes 2 cells too,
// so naive padding drifts by 1 per emoji. Iterating by code point gives the
// real cell count for right-alignment.
function visibleWidth(str) {
  let w = 0
  for (const ch of String(str)) {
    w += ch.codePointAt(0) > 0xffff ? 2 : 1
  }
  return w
}

function fitTitle(raw, maxWidth) {
  let text = ''
  let width = 0
  for (const ch of raw) {
    const chW = ch.codePointAt(0) > 0xffff ? 2 : 1
    if (width + chW > maxWidth) {
      return { text: text + '…', width: width + 1 }
    }
    text += ch
    width += chW
  }
  return { text, width }
}

function formatRow(task, number, theme, innerWidth) {
  const statusColor = theme.statusColor(task.status)
  const prioColor = theme.priorityColor(task.priority)
  const num = String(number).padEnd(3)
  const prio = `{${prioColor}-fg}${task.priority[0].toUpperCase()}{/}`
  const status = `{${statusColor}-fg}${theme.statusIcon(task.status)}{/}`

  const titleMax = Math.max(1, innerWidth - FIXED_WIDTH)
  const raw = task.title || ''
  const fit = visibleWidth(raw) > titleMax ? fitTitle(raw, titleMax - 1) : { text: raw, width: visibleWidth(raw) }
  const padding = ' '.repeat(Math.max(0, titleMax - fit.width))

  return `${num} ${prio}  ${fit.text}${padding} ${status} `
}

function createTaskListPanel({ parent, theme, onSelect }) {
  let tasks = []

  const box = blessed.list({
    parent,
    label: ' Tasks (0) ',
    top: 0,
    left: 0,
    width: '40%',
    height: '100%-1',
    border: { type: 'line' },
    style: {
      border: theme.get('border'),
      focus: { border: theme.get('borderFocused') },
      selected: theme.get('selected'),
      item: { fg: 'white' },
    },
    keys: false,
    mouse: true,
    tags: true,
    padding: { left: 1, top: 1, right: 1 },
  })

  function emitSelected() {
    if (typeof onSelect !== 'function') return
    if (tasks.length === 0) {
      onSelect(null, null)
      return
    }
    const idx = box.selected
    onSelect(tasks[idx] || null, idx + 1)
  }

  box.on('select item', emitSelected)

  function updateLabel() {
    box.setLabel(` Tasks (${tasks.length}) `)
  }

  function innerWidth() {
    const w = typeof box.width === 'number' ? box.width : 0
    const iw = typeof box.iwidth === 'number' ? box.iwidth : 2
    return Math.max(1, w - iw)
  }

  function rerenderItems() {
    const w = innerWidth()
    box.setItems(tasks.map((t, i) => formatRow(t, i + 1, theme, w)))
  }

  function setTasks(next) {
    tasks = Array.isArray(next) ? next : []
    rerenderItems()
    updateLabel()
    if (tasks.length === 0) {
      box.select(0)
    } else {
      const idx = Math.min(Math.max(box.selected || 0, 0), tasks.length - 1)
      box.select(idx)
    }
    emitSelected()
    box.screen.render()
  }

  box.screen.on('resize', () => {
    if (!tasks.length) return
    const sel = box.selected
    rerenderItems()
    box.select(Math.min(sel, tasks.length - 1))
    box.screen.render()
  })

  return {
    box,
    setTasks,
    selectedTask: () => tasks[box.selected] || null,
    selectedIndex: () => (tasks.length === 0 ? -1 : box.selected),
    selectedNumber: () => (tasks.length === 0 ? null : box.selected + 1),
    moveDown: () => {
      box.down(1)
      box.screen.render()
    },
    moveUp: () => {
      box.up(1)
      box.screen.render()
    },
    focus: () => box.focus(),
  }
}

module.exports = { createTaskListPanel }
