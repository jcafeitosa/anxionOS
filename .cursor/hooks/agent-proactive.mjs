#!/usr/bin/env node
/** Hook de sessão — check proativo */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function parsePersona(argv) {
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--persona") return argv[i + 1];
  }
  return process.env.PROACTIVE_PERSONA ?? process.env.DIALOGUE_FROM_PERSONA ?? "orchestrator";
}

const persona = parsePersona(process.argv.slice(2));
console.log(`\n=== Proactive session check (${persona}) ===\n`);

const check = spawnSync(
  "npm",
  ["run", "orchestration:proactive", "--", "check", "--persona", persona],
  { cwd: root, encoding: "utf8" },
);

if (check.stdout) console.log(check.stdout);
if (check.stderr) console.error(check.stderr);
process.exit(check.status ?? 0);
