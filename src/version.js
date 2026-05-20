'use strict'

const pkg = require('../package.json')

// Display form: drop the semver pre-release hyphen so "0.0.1-b" reads as "0.0.1b".
const VERSION = pkg.version.replace(/-(?=[a-z])/i, '')

module.exports = { VERSION }
