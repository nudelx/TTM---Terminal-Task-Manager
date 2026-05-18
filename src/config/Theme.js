'use strict'

function createTheme(data) {
  const tree = data || {}

  function get(pathStr, fallback) {
    const value = String(pathStr)
      .split('.')
      .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), tree)
    return value === undefined ? fallback : value
  }

  return {
    get,
    statusColor: (status) => get(`status.${status}`, 'white'),
    priorityColor: (priority) => get(`priority.${priority}`, 'white'),
  }
}

module.exports = { createTheme }
