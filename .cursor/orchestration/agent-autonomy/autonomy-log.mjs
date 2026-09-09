/**
 * Audit log append-only em .cursor/orchestration-runtime/autonomy/autonomy.jsonl
 */

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { autonomyLogPath, ensureAutonomyDirs } from "./lib.mjs";

export function appendAutonomyLog(entry) {
  ensureAutonomyDirs();
  const record = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    threadId:
      process.env.CURSOR_THREAD_ID ??
      process.env.CODEX_THREAD_ID ??
      process.env.CLAUDE_CODE_SESSION_ID ??
      null,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId ?? null,
    persona: entry.persona,
    issueId: entry.issueId ?? null,
    outcome: entry.outcome ?? "success",
    details: entry.details ?? {},
  };
  appendFileSync(autonomyLogPath, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

export function readAutonomyLog(filters = {}) {
  if (!existsSync(autonomyLogPath)) return [];
  const lines = readFileSync(autonomyLogPath, "utf8").split("\n").filter(Boolean);
  let entries = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // linha corrompida
    }
  }
  if (filters.persona) entries = entries.filter((e) => e.persona === filters.persona);
  if (filters.resourceType) entries = entries.filter((e) => e.resourceType === filters.resourceType);
  if (filters.limit && filters.limit > 0) entries = entries.slice(-filters.limit);
  return entries;
}

export function getAutonomyLogPath() {
  return autonomyLogPath;
}
