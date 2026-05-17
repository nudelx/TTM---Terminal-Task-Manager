'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const USER_CONFIG_DIR = path.join(os.homedir(), '.ttm');
const DEFAULTS_DIR = path.join(__dirname, '..', '..', 'config');

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    process.stderr.write(`ttm: ignoring malformed config "${filePath}": ${err.message}\n`);
    return null;
  }
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(target, source) {
  if (!isPlainObject(source)) return target;
  const out = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = out[key];
    out[key] = isPlainObject(sv) && isPlainObject(tv) ? deepMerge(tv, sv) : sv;
  }
  return out;
}

function load(name) {
  const defaults = readJsonSafe(path.join(DEFAULTS_DIR, `default-${name}.json`)) || {};
  const user = readJsonSafe(path.join(USER_CONFIG_DIR, `${name}.json`));
  return deepMerge(defaults, user || {});
}

module.exports = { load, USER_CONFIG_DIR };
