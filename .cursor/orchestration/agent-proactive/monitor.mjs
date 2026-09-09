#!/usr/bin/env node
/** Monitor proativo — poll taskboard + dialogue */

import { appendProactiveLog } from "./proactive-log.mjs";
import { evaluateTriggers, formatTriggerResults } from "./triggers.mjs";

function parseArgs(argv) {
  const opts = { persona: "orchestrator", intervalSec: 600, once: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--interval") opts.intervalSec = Number(argv[++i]);
    else if (a === "--once") opts.once = true;
    else if (a === "--help" || a === "-h") {
      console.log("Usage: node monitor.mjs [--persona SLUG] [--interval SEC] [--once]");
      process.exit(0);
    } else throw new Error(`Opção desconhecida: ${a}`);
  }
  return opts;
}

async function tick(opts) {
  const results = await evaluateTriggers(opts.persona);
  console.log(`\n[${new Date().toISOString()}] monitor · ${opts.persona}`);
  console.log(formatTriggerResults(results, "text"));
  for (const r of results.filter((x) => x.severity !== "info")) {
    appendProactiveLog({
      triggerId: r.id,
      action: "monitor",
      persona: opts.persona,
      issueId: r.issueId,
      severity: r.severity,
      summary: r.summary,
    });
  }
}

const opts = parseArgs(process.argv.slice(2));
if (opts.once) {
  await tick(opts);
  process.exit(0);
}

console.log(`monitor — ${opts.intervalSec}s (Ctrl+C)`);
await tick(opts);
const timer = setInterval(() => tick(opts).catch((e) => console.error(e.message)), opts.intervalSec * 1000);
process.on("SIGINT", () => { clearInterval(timer); process.exit(0); });
