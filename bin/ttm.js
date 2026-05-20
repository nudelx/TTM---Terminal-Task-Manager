#!/usr/bin/env node
'use strict'

const { VERSION } = require('../src/version')

const argv = process.argv.slice(2)
if (argv.includes('-v') || argv.includes('--version')) {
  process.stdout.write(`ttm ${VERSION}\n`)
  process.exit(0)
}
if (argv.includes('-h') || argv.includes('--help')) {
  process.stdout.write(
    `ttm ${VERSION} — terminal task manager\n` +
      `\n` +
      `Usage: ttm [options]\n` +
      `\n` +
      `Options:\n` +
      `  -v, --version   Print version and exit\n` +
      `  -h, --help      Print this help and exit\n`,
  )
  process.exit(0)
}

const createApp = require('../src/App')

try {
  createApp().start()
} catch (err) {
  console.error('Failed to start ttm:', err && err.message ? err.message : err)
  process.exit(1)
}
