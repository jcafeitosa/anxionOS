/**
 * pending-escalate.json — fila de escalações dos hooks (stop, silence-watch).
 * Consumida por proactive check e lifecycle cleanup.
 */

import { existsSync, readFileSync, renameSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getOrchestrationPaths } from "../agent-config/load-config.mjs";

export function pendingEscalatePath(projectRoot = null) {
  const paths = getOrchestrationPaths(projectRoot ? { projectRoot } : undefined).paths;
  return join(paths.autonomy, "pending-escalate.json");
}

export function pendingEscalateArchiveDir(projectRoot = null) {
  const paths = getOrchestrationPaths(projectRoot ? { projectRoot } : undefined).paths;
  return join(paths.autonomy, "escalate-archive");
}

export function readPendingEscalation(projectRoot = null) {
  const path = pendingEscalatePath(projectRoot);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Move pending-escalate.json to archive and return the drained entry.
 * @param {{ acknowledgedBy?: string, projectRoot?: string }} opts
 */
export function drainPendingEscalation(opts = {}) {
  const path = pendingEscalatePath(opts.projectRoot);
  const entry = readPendingEscalation(opts.projectRoot);
  if (!entry) return null;

  const archiveDir = pendingEscalateArchiveDir(opts.projectRoot);
  if (!existsSync(archiveDir)) mkdirSync(archiveDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const archivePath = join(archiveDir, `${stamp}-${entry.reason ?? "escalate"}.json`);
  const archived = {
    ...entry,
    drainedAt: new Date().toISOString(),
    acknowledgedBy: opts.acknowledgedBy ?? "lifecycle",
  };
  writeFileSync(archivePath, `${JSON.stringify(archived, null, 2)}\n`, "utf8");

  try {
    renameSync(path, archivePath);
  } catch {
    writeFileSync(path, "", "utf8");
  }

  return archived;
}

/**
 * @returns {import('../agent-proactive/triggers.mjs').TriggerResult|null}
 */
export function pendingEscalationToTrigger(entry) {
  if (!entry) return null;
  const severity =
    entry.reason === "compliance-pre-commit-failed" || entry.reason === "silent-end"
      ? "escalate"
      : "warn";
  return {
    id: `pending-escalate-${entry.reason ?? "unknown"}`,
    label: "Escalação pendente (hook)",
    severity,
    whoActs: "Orquestrador",
    personas: ["orchestrator"],
    issueId: entry.issueId ?? null,
    summary: `${entry.reason ?? "escalate"}: ${entry.persona ?? "orchestrator"} · ${entry.issueId ?? "sem issue"}`,
    recommendation: entry.body ?? "Revisar dialogue e publicar status/handoff.",
    actionKind: severity === "escalate" ? "act-dialogue" : "suggest",
    actPayload:
      severity === "escalate"
        ? {
            type: "escalate",
            gate: "G0",
            body:
              entry.body ??
              `@orchestrator Escalação pendente (${entry.reason}). Corrigir compliance/dialogue.`,
            mirrorTaskboard: false,
          }
        : undefined,
    meta: { source: "pending-escalate.json", reason: entry.reason, createdAt: entry.createdAt },
  };
}
