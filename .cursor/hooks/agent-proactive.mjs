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

const lifecycle = spawnSync(
  "npm",
  ["run", "orchestration:lifecycle-cleanup", "--", "--json"],
  { cwd: root, encoding: "utf8" },
);
if (lifecycle.stdout) {
  try {
    const cleanup = JSON.parse(lifecycle.stdout);
    if (cleanup.counts?.sessionsEnded || cleanup.counts?.hiresDismissed) {
      console.log(
        `lifecycle-cleanup: ${cleanup.counts.sessionsEnded} sessão(ões), ` +
          `${cleanup.counts.hiresDismissed} hire(s) encerrados`,
      );
    }
  } catch {
    /* ignore parse errors */
  }
}

const check = spawnSync(
  "npm",
  ["run", "orchestration:proactive", "--", "check", "--persona", persona],
  { cwd: root, encoding: "utf8" },
);

if (check.stdout) console.log(check.stdout);
if (check.stderr) console.error(check.stderr);

const chatPending = spawnSync("npm", ["run", "orchestration:chat", "--", "--check-pending"], {
  cwd: root,
  encoding: "utf8",
});
if (chatPending.stdout?.includes("CURSOR_CHAT_DIALOGUE")) {
  console.log("\n=== Pending chat (colar no turno) ===\n");
  console.log(chatPending.stdout);
}

const dispatchStatus = spawnSync(
  "npm",
  ["run", "orchestration:dispatch", "--", "status", "--json"],
  { cwd: root, encoding: "utf8" },
);
if (dispatchStatus.stdout) {
  try {
    const status = JSON.parse(dispatchStatus.stdout);
    if (status.pending > 0) {
      console.log(`\ndispatch queue: ${status.pending} pending`);
    }
  } catch {
    /* ignore */
  }
}

const dispatch = spawnSync(
  "npm",
  ["run", "orchestration:dispatch", "--", "inject", "--limit", "3"],
  { cwd: root, encoding: "utf8" },
);
if (dispatch.stdout && dispatch.stdout.includes("CURSOR_DISPATCH_QUEUE")) {
  console.log("\n=== Dispatch queue (spawn Task subagents) ===\n");
  console.log(dispatch.stdout);
  console.log("\nJSON batch: npm run orchestration:dispatch -- spawn-plan --json");
}

process.exit(check.status ?? 0);
