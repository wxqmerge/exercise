#!/usr/bin/env node
// One-time migration: convert entries from array reps/weights to single values
const fs = require('fs');
const path = require('path');

const ENTRIES_FILE = path.join(__dirname, '../data/entries.json');

function normalizeValue(v) {
  if (Array.isArray(v)) {
    const first = v.find(x => x !== '' && x != null) ?? v[0] ?? '';
    return String(first);
  }
  return v == null ? '' : String(v);
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return { reps: '', weights: '' };
  return {
    reps: normalizeValue(entry.reps),
    weights: normalizeValue(entry.weights),
  };
}

function normalizeAll(all) {
  const out = {};
  for (const [type, days] of Object.entries(all || {})) {
    out[type] = {};
    for (const [day, exMap] of Object.entries(days || {})) {
      out[type][day] = {};
      for (const [id, entry] of Object.entries(exMap || {})) {
        out[type][day][id] = normalizeEntry(entry);
      }
    }
  }
  return out;
}

if (!fs.existsSync(ENTRIES_FILE)) {
  console.log('No entries file found at', ENTRIES_FILE);
  process.exit(0);
}

const raw = fs.readFileSync(ENTRIES_FILE, 'utf8');
let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error('Failed to parse entries.json', e);
  process.exit(1);
}

const migrated = normalizeAll(data);
fs.writeFileSync(ENTRIES_FILE, JSON.stringify(migrated, null, 2));
console.log('Migrated entries to single values');
console.log('File:', ENTRIES_FILE);
