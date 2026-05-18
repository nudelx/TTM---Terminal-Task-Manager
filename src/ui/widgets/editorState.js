'use strict'

// Pure cursor/text operations for the multi-line editor.
// State shape: { lines: string[], row: int, col: int }.
// Each function returns the next state without mutating its inputs.
// moveUp / moveDown return null at the document boundary so the caller
// can route focus elsewhere (the editor uses this to exit to siblings).

function fromString(value) {
  const str = typeof value === 'string' ? value : ''
  const lines = str.split('\n')
  return { lines: lines.length > 0 ? lines : [''], row: 0, col: 0 }
}

function toString(state) {
  return state.lines.join('\n')
}

function clampCol(state) {
  const max = state.lines[state.row].length
  return state.col > max ? { ...state, col: max } : state
}

function moveLeft(state) {
  if (state.col > 0) return { ...state, col: state.col - 1 }
  if (state.row > 0) {
    return {
      ...state,
      row: state.row - 1,
      col: state.lines[state.row - 1].length,
    }
  }
  return state
}

function moveRight(state) {
  if (state.col < state.lines[state.row].length) return { ...state, col: state.col + 1 }
  if (state.row < state.lines.length - 1) return { ...state, row: state.row + 1, col: 0 }
  return state
}

function moveUp(state) {
  if (state.row === 0) return null
  return clampCol({ ...state, row: state.row - 1 })
}

function moveDown(state) {
  if (state.row === state.lines.length - 1) return null
  return clampCol({ ...state, row: state.row + 1 })
}

function moveHome(state) {
  return { ...state, col: 0 }
}

function moveEnd(state) {
  return { ...state, col: state.lines[state.row].length }
}

function insertChar(state, ch) {
  const line = state.lines[state.row]
  const lines = state.lines.slice()
  lines[state.row] = line.slice(0, state.col) + ch + line.slice(state.col)
  return { lines, row: state.row, col: state.col + 1 }
}

function insertNewline(state) {
  const line = state.lines[state.row]
  const lines = state.lines.slice()
  lines.splice(state.row, 1, line.slice(0, state.col), line.slice(state.col))
  return { lines, row: state.row + 1, col: 0 }
}

function backspace(state) {
  if (state.col > 0) {
    const line = state.lines[state.row]
    const lines = state.lines.slice()
    lines[state.row] = line.slice(0, state.col - 1) + line.slice(state.col)
    return { lines, row: state.row, col: state.col - 1 }
  }
  if (state.row > 0) {
    const prev = state.lines[state.row - 1]
    const curr = state.lines[state.row]
    const lines = state.lines.slice()
    lines.splice(state.row - 1, 2, prev + curr)
    return { lines, row: state.row - 1, col: prev.length }
  }
  return state
}

function del(state) {
  if (state.col < state.lines[state.row].length) {
    const line = state.lines[state.row]
    const lines = state.lines.slice()
    lines[state.row] = line.slice(0, state.col) + line.slice(state.col + 1)
    return { lines, row: state.row, col: state.col }
  }
  if (state.row < state.lines.length - 1) {
    const curr = state.lines[state.row]
    const next = state.lines[state.row + 1]
    const lines = state.lines.slice()
    lines.splice(state.row, 2, curr + next)
    return { lines, row: state.row, col: state.col }
  }
  return state
}

module.exports = {
  fromString,
  toString,
  moveLeft,
  moveRight,
  moveUp,
  moveDown,
  moveHome,
  moveEnd,
  insertChar,
  insertNewline,
  backspace,
  del,
}
