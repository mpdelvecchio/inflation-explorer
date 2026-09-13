#!/usr/bin/env node
// Pulls raw monthly index levels for the four FRED series this app uses and
// writes them to data/inflation.js. Run this locally whenever new BLS/BEA
// numbers drop, then commit + push the updated JSON. The FRED API key never
// gets written to any file this script produces, and must never be committed
// to the repo — see README.md for how to supply it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const envFile = loadEnvFile(path.join(__dirname, '.env.local'));
const API_KEY = process.env.FRED_API_KEY || envFile.FRED_API_KEY;

if (!API_KEY) {
  console.error(
    'Missing FRED API key.\n' +
    'Either set it for this command:\n' +
    '  FRED_API_KEY=your_key_here node fetch-data.mjs\n' +
    'or create a file named .env.local in this folder (it is git-ignored) containing:\n' +
    '  FRED_API_KEY=your_key_here'
  );
  process.exit(1);
}

const SERIES = {
  cpi_all: { id: 'CPIAUCSL', label: 'CPI — All Urban Consumers' },
  cpi_core: { id: 'CPILFESL', label: 'CPI Core (Less Food & Energy)' },
  pce_all: { id: 'PCEPI', label: 'PCE — All Items' },
  pce_core: { id: 'PCEPILFE', label: 'PCE Core (Less Food & Energy)' },
};

async function fetchSeries(seriesId) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${API_KEY}&file_type=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED request failed for ${seriesId}: ${res.status} ${res.statusText}`);
  const json = await res.json();
  return json.observations.map(o => ({ date: o.date, value: o.value === '.' ? null : parseFloat(o.value) }));
}

const out = { generatedAt: new Date().toISOString(), series: {} };

for (const [key, meta] of Object.entries(SERIES)) {
  console.log(`Fetching ${meta.label} (${meta.id})...`);
  const observations = await fetchSeries(meta.id);
  out.series[key] = { id: meta.id, label: meta.label, observations };
  console.log(`  ${observations.length} monthly observations, latest = ${observations.at(-1).date}`);
}

const destDir = path.join(__dirname, 'data');
fs.mkdirSync(destDir, { recursive: true });
const destFile = path.join(destDir, 'inflation.js');
// A plain <script src> (not fetch/JSON) so the page also works when opened
// directly by double-click -- browsers block fetch() of local files under
// file://, but a <script> tag loading a local file is not subject to that.
fs.writeFileSync(destFile, `window.INFLATION_DATA = ${JSON.stringify(out)};\n`);
console.log(`\nWrote ${destFile}`);
