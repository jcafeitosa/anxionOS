#!/usr/bin/env node
/**
 * Post-turn hook: pending-broadcast + detecção de fim silencioso (No Silent Work).
 *
 * O agente grava pending-broadcast.json em autonomy (runtime Cursor) antes de encerrar o turno.
 * Formato: { type, fromPersona, issueId, gate, body, verdict?, toPersona? }
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getOrchestrationPaths } from "../orchestration/agent-config/load-config.mjs";
import {
  getActiveSession,
  getTurnState,
  loadSessions,
  resetTurnState,
} from "../orchestration/agent-dialogue/session-tracker.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const autonomyDir = getOrchestrationPaths({ projectRoot: repoRoot }).paths.autonomy;
const pendingPath = join(autonomyDir, "pending-broadcast.json");
const pendingEscalatePath = join(autonomyDir, "pending-escalate.json");

function hasCodeChanges() {
  try {
    const out = execFileSync("git", ["diff", "--name-only", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const changed = out
      .split("\n")
      .filter(Boolean)
      .filter(
        (p) =>
          p.startsWith("backend/") ||
          p.startsWith("frontend/") ||
          p.startsWith("docs/"),
      );
    return changed.length > 0;
  } catch {
    return false;
  }
}


const complianceCli = join(repoRoot, ".cursor/orchestration/agent-compliance/compliance-check.mjs");

function runStopComplianceCheck() {
  const store = loadSessions();
  for (const persona of Object.keys(store.sessions)) {
    const session = store.sessions[persona];
    if (!existsSync(complianceCli)) continue;
    const hasPending = existsSync(pendingPath);
    const result = spawnSync(
      process.execPath,
      [complianceCli, "--pre-commit", "--issue", session.issueId, "--persona", persona, "--json"],
      { cwd: repoRoot, encoding: "utf8" },
    );
    if (result.status !== 0 && !hasPending) {
      process.stderr.write(
        `agent-orchestration: COMPLIANCE BLOCK — ${persona} · ${session.issueId} falhou pre-commit (sem pending-broadcast)\n`,
      );
      if (result.stderr) process.stderr.write(result.stderr);
      writeFileSync(
        pendingEscalatePath,
        JSON.stringify({
          persona,
          issueId: session.issueId,
          reason: "compliance-pre-commit-failed",
          createdAt: new Date().toISOString(),
          body: `@orchestrator Compliance pre-commit falhou para **${persona}** · **${session.issueId}**. Rodar orchestration:compliance --pre-commit.`,
        }, null, 2) + "\n",
        "utf8",
      );
    } else if (result.status === 0) {
      process.stderr.write(`agent-orchestration: compliance pre-commit OK (${persona})\n`);
    }
  }
}

function processPendingBroadcast() {
  if (!existsSync(pendingPath)) return;

  let pending;
  try {
    pending = JSON.parse(readFileSync(pendingPath, "utf8"));
  } catch {
    process.stderr.write("agent-orchestration: invalid pending-broadcast.json\n");
    return;
  }

  const args = [
    join(repoRoot, ".cursor/orchestration/agent-dialogue/broadcast.mjs"),
    "post",
    "--type",
    pending.type ?? "status",
    "--issue",
    pending.issueId,
    "--body",
    pending.body,
    "--mirror-taskboard",
  ];

  if (pending.fromPersona) args.push("--from-persona", pending.fromPersona);
  if (pending.toPersona) args.push("--to-persona", pending.toPersona);
  if (pending.gate) args.push("--gate", pending.gate);
  if (pending.verdict) args.push("--verdict", pending.verdict);

  try {
    execFileSync(process.execPath, args, {
      cwd: repoRoot,
      stdio: process.stderr.isTTY ? "inherit" : "pipe",
      env: {
        ...process.env,
        ...(process.stderr.isTTY ? { DIALOGUE_TERMINAL: "1" } : {}),
      },
    });
    unlinkSync(pendingPath);
  } catch (err) {
    process.stderr.write(`agent-orchestration: broadcast failed: ${err.message}\n`);
  }
}

function checkSilentEnd() {
  const store = loadSessions();
  const personas = Object.keys(store.sessions);
  if (personas.length === 0) return;

  const codeChanged = hasCodeChanges();

  for (const persona of personas) {
    const session = getActiveSession(persona);
    const turn = getTurnState(persona);
    const dialogueThisTurn = turn?.dialogueThisTurn === true;

    if (!dialogueThisTurn) {
      process.stderr.write(
        `agent-orchestration: NO-SILENT-WORK — sessão ativa "${persona}" (${session.issueId}) sem broadcast neste turno\n`,
      );

      writeFileSync(
        pendingEscalatePath,
        `${JSON.stringify(
          {
            persona,
            issueId: session.issueId,
            reason: "silent-end",
            codeChanges: codeChanged,
            createdAt: new Date().toISOString(),
            body:
              `@orchestrator Turno encerrado sem broadcast visível. Persona **${persona}** · **${session.issueId}**. ` +
              (codeChanged
                ? "Houve alterações de código — publicar handoff/verdict."
                : "Publicar status antes do próximo turno."),
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
    }

    if (codeChanged && !dialogueThisTurn) {
      process.stderr.write(
        `agent-orchestration: bloqueio suave — código alterado sem broadcast no turno (${persona})\n`,
      );
    }

    resetTurnState(persona);
  }
}

async function main() {
  await readStdin();
  processPendingBroadcast();
  runStopComplianceCheck();
  checkSilentEnd();
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => resolve(data));
    if (process.stdin.isTTY) resolve("");
  });
}

main();
