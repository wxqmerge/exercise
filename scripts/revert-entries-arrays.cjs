#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ENTRIES_FILE = path.join(__dirname, '../data/entries.json');
if (!fs.existsSync(ENTRIES_FILE)) process.exit(0);
const data = JSON.parse(fs.readFileSync(ENTRIES_FILE,'utf8'));
function toArray(v){ const s = v==null?'':String(v); return [s,s,s]; }
const out = {};
for (const [type,days] of Object.entries(data||{})){
  out[type]={};
  for (const [day,exMap] of Object.entries(days||{})){
    out[type][day]={};
    for (const [id,entry] of Object.entries(exMap||{})){
      out[type][day][id]={ reps: toArray(entry.reps), weights: toArray(entry.weights) };
    }
  }
}
fs.writeFileSync(ENTRIES_FILE, JSON.stringify(out,null,2));
console.log('Reverted to arrays');
