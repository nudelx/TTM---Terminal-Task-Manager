'use strict'

const path = require('path')
const blessed = require('neo-blessed')

const ConfigLoader = require('./config/ConfigLoader')
const { createTheme } = require('./config/Theme')
const { createKeybindings } = require('./config/Keybindings')
const { createJsonTaskStore } = require('./storage/JsonTaskStore')
const T = require('./domain/tasksReducer')

const { createTaskListPanel } = require('./ui/TaskListPanel')
const { createDetailPanel } = require('./ui/DetailPanel')
const { createHelpBar } = require('./ui/HelpBar')
const { createEditDialog } = require('./ui/EditDialog')
const { createConfirmDialog } = require('./ui/ConfirmDialog')
const { installKeyTranslation } = require('./util/keyTranslation')

function createApp() {
  const theme = createTheme(ConfigLoader.load('theme'))
  const keys = createKeybindings(ConfigLoader.load('keys'))
  const store = createJsonTaskStore(path.join(ConfigLoader.USER_CONFIG_DIR, 'tasks.json'))

  let tasks = []
  let modalOpen = false

  const screen = blessed.screen({
    smartCSR: true,
    title: 'ttm  terminal task manager',
    fullUnicode: true,
  })
  installKeyTranslation(screen)

  const detail = createDetailPanel({ parent: screen, theme })
  const list = createTaskListPanel({
    parent: screen,
    theme,
    onSelect: (task, number) => detail.show(task, number),
  })
  createHelpBar({ parent: screen, theme, keys })

  const editDialog = createEditDialog({ screen, theme, keys })
  const confirmDialog = createConfirmDialog({ parent: screen, theme })

  function persist(nextTasks) {
    tasks = nextTasks
    store.save(tasks)
    list.setTasks(tasks)
  }

  // Run an async modal flow with the modalOpen guard and focus-restore baked in.
  async function withModal(fn) {
    modalOpen = true
    try {
      return await fn()
    } finally {
      modalOpen = false
      list.focus()
    }
  }

  async function handleAdd() {
    const data = await withModal(() => editDialog.open(null))
    if (!data || !data.title.trim()) return
    persist(T.add(tasks, data))
  }

  async function handleEdit() {
    const idx = list.selectedIndex()
    const task = list.selectedTask()
    if (!task) return
    const data = await withModal(() => editDialog.open(task))
    if (!data) return
    persist(T.update(tasks, idx, data))
  }

  async function handleDelete() {
    const idx = list.selectedIndex()
    const task = list.selectedTask()
    if (!task) return
    const ok = await withModal(() => confirmDialog.open(`Delete "${task.title}"?`))
    if (!ok) return
    persist(T.remove(tasks, idx))
  }

  function handleToggleStatus() {
    persist(T.cycleStatus(tasks, list.selectedIndex()))
  }

  function handleCyclePriority() {
    persist(T.cyclePriority(tasks, list.selectedIndex()))
  }

  function handleRefresh() {
    tasks = store.load()
    list.setTasks(tasks)
    list.refreshLayout()
    detail.refreshLayout()
    screen.render()
  }

  async function handleQuit() {
    const ok = await withModal(() => confirmDialog.open('Quit ttm?'))
    if (ok) process.exit(0)
  }

  function guard(fn) {
    return () => {
      if (!modalOpen) fn()
    }
  }

  function bindKeys() {
    keys.bind(screen, 'forceQuit', () => process.exit(0))
    keys.bind(screen, 'quit', guard(handleQuit))
    keys.bind(
      screen,
      'navigateDown',
      guard(() => list.moveDown()),
    )
    keys.bind(
      screen,
      'navigateUp',
      guard(() => list.moveUp()),
    )
    keys.bind(screen, 'add', guard(handleAdd))
    keys.bind(screen, 'edit', guard(handleEdit))
    keys.bind(screen, 'delete', guard(handleDelete))
    keys.bind(screen, 'toggleStatus', guard(handleToggleStatus))
    keys.bind(screen, 'cyclePriority', guard(handleCyclePriority))
    keys.bind(screen, 'refresh', guard(handleRefresh))
  }

  // neo-blessed's own resize handler does alloc() + render() BEFORE notifying
  // children (see node_modules/neo-blessed/lib/widgets/screen.js ~line 144).
  // That means a screen.on('resize') listener fires AFTER blessed has already
  // painted the new geometry with the OLD content — leaving the corrupted-
  // looking overlay we saw. Prepending a listener to program's 'resize' lets
  // our panel content refresh before blessed's auto-render, so the new frame
  // paints the new state in a single pass.
  function installResizeHandler() {
    const program = screen.program
    if (!program || typeof program.prependListener !== 'function') return
    program.prependListener('resize', () => {
      list.refreshLayout()
      detail.refreshLayout()
    })
  }

  function start() {
    bindKeys()
    installResizeHandler()
    tasks = store.load()
    list.setTasks(tasks)
    list.focus()
    screen.render()
  }

  return { start }
}

module.exports = createApp
