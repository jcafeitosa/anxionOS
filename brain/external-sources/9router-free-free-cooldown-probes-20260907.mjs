import fs from 'node:fs';
import assert from 'node:assert/strict';
const root = process.argv[2] || '/tmp/anxionos-9router-review';
const source = fs.readFileSync(`${root}/src/app/api/providers/suggested-models/filters.js`, 'utf8');
const { FILTERS } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const cases = [
  { id: 'vendor/small:free', context_length: 32000, pricing: { prompt: '0', completion: '0' } },
  { id: 'vendor/tagged:free', context_length: 262144 },
  { id: 'vendor/numeric:free', context_length: 262144, pricing: { prompt: 0, completion: 0 } },
  { id: 'vendor/decimal:free', context_length: 262144, pricing: { prompt: '0.000000000000', completion: '0.000000000000' } },
  { id: 'vendor/extra-cost', context_length: 262144, pricing: { prompt: '0', completion: '0', request: '0.01' } },
  { id: 'vendor/accepted:free', context_length: 262144, pricing: { prompt: '0', completion: '0' } },
];
const selected = new Set(FILTERS['openrouter-free'](cases).map(m => m.id));
const results = cases.map(m => ({ id: m.id, selectedByActual9routerFilter: selected.has(m.id) }));
assert.deepEqual(results.map(m => m.selectedByActual9routerFilter), [false, false, false, false, true, true]);
// This expiry helper does not depend on the imported error rules; stub only those constants.
const fallback = fs.readFileSync(`${root}/open-sse/services/accountFallback.js`, 'utf8')
  .replace(/^import .*;\n/, 'const ERROR_RULES=[];const BACKOFF_CONFIG={};const TRANSIENT_COOLDOWN_MS=30000;\n');
const mod = await import('data:text/javascript;base64,' + Buffer.from(fallback).toString('base64'));
const now = Date.now();
const connection = { modelLock_target: new Date(now + 600000).toISOString(), modelLock_unrelated: new Date(now + 30000).toISOString(), modelLock___all: new Date(now + 1200000).toISOString() };
const displaySeconds = Math.round((Date.parse(mod.getEarliestModelLockUntil(connection)) - now) / 1000);
assert.equal(displaySeconds, 30);
results.push({ probe: 'retry-time-aggregation', displaySeconds, targetReleaseAtLeastSeconds: 1200 });
const report = { sourceCommit: 'eb712ca821f0ba6bc41043fbd14494c5af5daba5', scope: 'Actual upstream filter and expiry helper; synthetic data, no provider inference', results };
fs.writeFileSync(new URL('./free-cooldown-probes.json', import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
