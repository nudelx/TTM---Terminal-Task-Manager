'use strict';

const path = require('path');
const blessed = require('neo-blessed');

const ConfigLoader = require('./config/ConfigLoader');
const { createTheme } = require('./config/Theme');
const { createKeybindings } = require('./config/Keybindings');
const { createJsonTaskStore } = require('./storage/JsonTaskStore');
const {
  createTask,
  updateTask,
  nextStatus,
  nextPriority,
} = require('./domain/Task');

const { createTaskListPanel } = require('./ui/TaskListPanel');
const { createDetailPanel } = require('./ui/DetailPanel');
const { createHelpBar } = require('./ui/HelpBar');
const { createEditDialog } = require('./ui/EditDialog');
const { createConfirmDialog } = require('./ui/ConfirmDialog');

function createApp() {
  const theme = createTheme(ConfigLoader.load('theme'));
  const keys = createKeybindings(ConfigLoader.load('keys'));
  const store = createJsonTaskStore(path.join(ConfigLoader.USER_CONFIG_DIR, 'tasks.json'));

  let tasks = [];
  let modalOpen = false;

  const screen = blessed.screen({
    smartCSR: true,
    title: 'ttm — terminal task manager',
    fullUnicode: true,
  });

  const detail = createDetailPanel({ parent: screen, theme });
  const list = createTaskListPanel({
    parent: screen,
    theme,
    onSelect: (task) => detail.show(task),
  });
  createHelpBar({ parent: screen, theme, keys });

  const editDialog = createEditDialog({ parent: screen, theme, keys });
  const confirmDialog = createConfirmDialog({ parent: screen, theme });

  function persist(nextTasks) {
    tasks = nextTasks;
    store.save(tasks);
    list.setTasks(tasks);
  }

  function replaceTask(updated) {
    persist(tasks.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function handleAdd() {
    modalOpen = true;
    const data = await editDialog.open(null);
    modalOpen = false;
    list.focus();
    if (!data || !data.title.trim()) return;
    persist([...tasks, createTask(data)]);
  }

  async function handleEdit() {
    const task = list.selectedTask();
    if (!task) return;
    modalOpen = true;
    const data = await editDialog.open(task);
    modalOpen = false;
    list.focus();
    if (!data) return;
    replaceTask(updateTask(task, data));
  }

  async function handleDelete() {
    const task = list.selectedTask();
    if (!task) return;
    modalOpen = true;
    const ok = await confirmDialog.open(`Delete "${task.title}"?`);
    modalOpen = false;
    list.focus();
    if (!ok) return;
    persist(tasks.filter((t) => t.id !== task.id));
  }

  function handleToggleStatus() {
    const task = list.selectedTask();
    if (!task) return;
    replaceTask(updateTask(task, { status: nextStatus(task.status) }));
  }

  function handleCyclePriority() {
    const task = list.selectedTask();
    if (!task) return;
    replaceTask(updateTask(task, { priority: nextPriority(task.priority) }));
  }

  function guard(fn) {
    return () => {
      if (modalOpen) return;
      fn();
    };
  }

  function bindKeys() {
    keys.bind(screen, 'forceQuit', () => process.exit(0));
    keys.bind(screen, 'quit', guard(() => process.exit(0)));
    keys.bind(screen, 'navigateDown', guard(() => list.moveDown()));
    keys.bind(screen, 'navigateUp', guard(() => list.moveUp()));
    keys.bind(screen, 'add', guard(() => { handleAdd(); }));
    keys.bind(screen, 'edit', guard(() => { handleEdit(); }));
    keys.bind(screen, 'delete', guard(() => { handleDelete(); }));
    keys.bind(screen, 'toggleStatus', guard(handleToggleStatus));
    keys.bind(screen, 'cyclePriority', guard(handleCyclePriority));
  }

  function start() {
    bindKeys();
    tasks = store.load();
    list.setTasks(tasks);
    list.focus();
    screen.render();
  }

  return { start };
}

module.exports = createApp;
