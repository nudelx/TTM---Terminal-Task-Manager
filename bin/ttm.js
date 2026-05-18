#!/usr/bin/env node
'use strict'

const createApp = require('../src/App')

try {
  createApp().start()
} catch (err) {
  console.error('Failed to start ttm:', err && err.message ? err.message : err)
  process.exit(1)
}
