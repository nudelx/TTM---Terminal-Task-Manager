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
  const fit =
    visibleWidth(raw) > titleMax
      ? fitTitle(raw, titleMax - 1)
      : { text: raw, width: visibleWidth(raw) }
  const padding = ' '.repeat(Math.max(0, titleMax - fit.width))

  return `${num} ${prio}  ${fit.text}${padding} ${status} `
}

function formatHeader(label, count, theme, innerWidth) {
  const color = theme.statusColor('done')
  const text = `── ${label} (${count}) `
  const pad = Math.max(0, innerWidth - visibleWidth(text))
  return `{${color}-fg}${text}${'─'.repeat(pad)}{/}`
}

// Split tasks into visible rows: active tasks at top, the Done section anchored
// to the bottom with blank filler in between when space allows. Filler is
// dropped when content would overflow — the list falls back to a natural layout
// and scrolls. Each task row carries its original index so selection still maps
// back to the App's tasks array after grouping.
function buildRows(tasks, innerHeight) {
  const active = []
  const done = []
  tasks.forEach((task, originalIndex) => {
    const row = { kind: 'task', task, originalIndex }
    if (task.status === 'done') done.push(row)
    else active.push(row)
  })
  const rows = active.slice()
  if (done.length === 0) return rows

  // header + blank row below it (matches the panel's top padding above active) + done tasks
  const doneSectionRows = 2 + done.length
  const fillerCount = Math.max(0, (innerHeight || 0) - active.length - doneSectionRows)
  for (let i = 0; i < fillerCount; i++) rows.push({ kind: 'filler' })
  rows.push({ kind: 'header', label: 'Done', count: done.length })
  rows.push({ kind: 'filler' })
  rows.push(...done)
  return rows
}

function createTaskListPanel({ parent, theme, onSelect }) {
  let tasks = []
  let rows = []
  let lastSelectedOriginalIndex = -1

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

  function currentRow() {
    return rows[box.selected]
  }

  // Search outward from `from` for the nearest task row, preferring `dir`.
  function findTaskRow(from, dir) {
    for (let i = from; i >= 0 && i < rows.length; i += dir) {
      if (rows[i] && rows[i].kind === 'task') return i
    }
    for (let i = from; i >= 0 && i < rows.length; i -= dir) {
      if (rows[i] && rows[i].kind === 'task') return i
    }
    return -1
  }

  function taskNumberAt(idx) {
    let n = 0
    for (let i = 0; i <= idx; i++) if (rows[i] && rows[i].kind === 'task') n++
    return n
  }

  function emitSelected() {
    if (typeof onSelect !== 'function') return
    const row = currentRow()
    if (!row || row.kind !== 'task') {
      lastSelectedOriginalIndex = -1
      onSelect(null, null)
      return
    }
    lastSelectedOriginalIndex = row.originalIndex
    onSelect(row.task, taskNumberAt(box.selected))
  }

  // Mouse can land on a header or filler row; snap to the nearest task row
  // instead. The follow-up box.select() re-fires 'select item' with the task.
  box.on('select item', () => {
    const row = currentRow()
    if (row && row.kind !== 'task') {
      let target = findTaskRow(box.selected + 1, 1)
      if (target < 0) target = findTaskRow(box.selected - 1, -1)
      if (target >= 0 && target !== box.selected) {
        box.select(target)
        box.screen.render()
        return
      }
    }
    emitSelected()
  })

  function updateLabel() {
    box.setLabel(` Tasks (${tasks.length}) `)
  }

  function innerWidth() {
    const w = typeof box.width === 'number' ? box.width : 0
    const iw = typeof box.iwidth === 'number' ? box.iwidth : 2
    return Math.max(1, w - iw)
  }

  function innerHeight() {
    const h = typeof box.height === 'number' ? box.height : 0
    const ih = typeof box.iheight === 'number' ? box.iheight : 2
    return Math.max(0, h - ih)
  }

  function rerenderItems() {
    const w = innerWidth()
    rows = buildRows(tasks, innerHeight())
    let n = 0
    box.setItems(
      rows.map((row) => {
        if (row.kind === 'header') return formatHeader(row.label, row.count, theme, w)
        if (row.kind === 'filler') return ''
        n += 1
        return formatRow(row.task, n, theme, w)
      }),
    )
  }

  // Find the row that now represents the previously-selected task. Falls back
  // to clamping the visible index when the prior task is gone (deletion).
  function restoreSelection(prevVisible) {
    if (rows.length === 0) return 0
    if (lastSelectedOriginalIndex >= 0) {
      const found = rows.findIndex(
        (r) => r.kind === 'task' && r.originalIndex === lastSelectedOriginalIndex,
      )
      if (found >= 0) return found
    }
    const clamped = Math.min(Math.max(prevVisible || 0, 0), rows.length - 1)
    const row = rows[clamped]
    if (row && row.kind === 'task') return clamped
    return findTaskRow(clamped, 1)
  }

  function setTasks(next) {
    tasks = Array.isArray(next) ? next : []
    const prev = box.selected
    rerenderItems()
    updateLabel()
    if (rows.length === 0) {
      box.select(0)
    } else {
      const target = restoreSelection(prev)
      box.select(target >= 0 ? target : 0)
    }
    emitSelected()
    box.screen.render()
  }

  // Recompute row widths and filler for the current box geometry. Called by App
  // before blessed renders on resize, so the new frame uses the new sizes.
  function refreshLayout() {
    const sel = box.selected || 0
    rerenderItems()
    if (rows.length) {
      const target = restoreSelection(sel)
      box.select(target >= 0 ? target : 0)
    }
    updateLabel()
  }

  function move(dir) {
    if (rows.length === 0) return
    const target = findTaskRow(box.selected + dir, dir)
    if (target >= 0 && target !== box.selected) {
      box.select(target)
      box.screen.render()
    }
  }

  return {
    box,
    setTasks,
    refreshLayout,
    selectedTask: () => {
      const row = currentRow()
      return row && row.kind === 'task' ? row.task : null
    },
    selectedIndex: () => {
      const row = currentRow()
      return row && row.kind === 'task' ? row.originalIndex : -1
    },
    selectedNumber: () => {
      const row = currentRow()
      return row && row.kind === 'task' ? taskNumberAt(box.selected) : null
    },
    moveDown: () => move(1),
    moveUp: () => move(-1),
    focus: () => box.focus(),
  }
}

module.exports = { createTaskListPanel }
