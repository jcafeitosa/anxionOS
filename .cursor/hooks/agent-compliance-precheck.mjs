#!/usr/bin/env node
/**
 * Hook beforeSubmitPrompt — pre-check leve de compliance.
 * Nao bloqueia o prompt; emite aviso stderr para o agente corrigir antes de codar.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateDialogueDisplayWarnings } from "../orchestration/agent-compliance/compliance-lib.mjs";
import { loadSessions } from "../orchestration/agent-dialogue/session-tracker.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const complianceCli = join(repoRoot, ".cursor/orchestration/agent-compliance/compliance-check.mjs");

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => resolve(data));
    if (process.stdin.isTTY) resolve("");
  });
}

async function main() {
  await readStdin();

  for (const warning of evaluateDialogueDisplayWarnings({ projectRoot: repoRoot })) {
    process.stderr.write(
      `agent-compliance-precheck: ${warning.code} — ${warning.message}\n`,
    );
    process.stderr.write(`  Corrigir: ${warning.fix}\n`);
  }

  const store = loadSessions();
  const sessions = Object.values(store.sessions);
  if (sessions.length === 0) {
    process.stdout.write(JSON.stringify({}));
    process.exit(0);
  }

  for (const session of sessions) {
    if (!existsSync(complianceCli)) continue;
    const result = spawnSync(
      process.execPath,
      [complianceCli, "--pre-work", "--issue", session.issueId, "--persona", session.persona, "--json"],
      { cwd: repoRoot, encoding: "utf8" },
    );
    if (result.status !== 0) {
      process.stderr.write(
        `agent-compliance-precheck: sessao ${session.persona} · ${session.issueId} — compliance pre-work FALHOU\n`,
      );
      if (result.stderr) process.stderr.write(result.stderr);
      if (result.stdout) process.stderr.write(result.stdout);
      process.stderr.write(
        "  Corrigir: npm run orchestration:compliance -- --pre-work --issue " +
          `${session.issueId} --persona ${session.persona}\n`,
      );
    }
  }

  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`agent-compliance-precheck error: ${err.message}\n`);
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
});
