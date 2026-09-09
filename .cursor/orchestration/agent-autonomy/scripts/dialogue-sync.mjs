#!/usr/bin/env node
/** Tail novas entradas de dialogue.jsonl desde último checkpoint. */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getOrchestrationPaths } from "../../agent-config/load-config.mjs";
import { getDialogueLogPath, readDialogueMessages } from "../../agent-dialogue/dialogue-log.mjs";

const checkpointPath = join(
  getOrchestrationPaths().paths.autonomy,
  "dialogue-sync-state.json",
);

function loadCheckpoint() {
  if (!existsSync(checkpointPath)) return { lastTimestamp: null, lastCount: 0 };
  return JSON.parse(readFileSync(checkpointPath, "utf8"));
}

function saveCheckpoint(state) {
  writeFileSync(checkpointPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

const state = loadCheckpoint();
const messages = readDialogueMessages({ since: state.lastTimestamp ?? undefined });

if (messages.length === 0) {
  console.log("dialogue-sync: no new messages");
  process.exit(0);
}

for (const m of messages) {
  const gate = m.gate ? ` ${m.gate}` : "";
  console.log(`[new] ${m.type}${gate} · ${m.from.name} · ${m.issueId ?? "-"}`);
}

const last = messages[messages.length - 1];
saveCheckpoint({
  lastTimestamp: last.timestamp,
  lastCount: (state.lastCount ?? 0) + messages.length,
  syncedAt: new Date().toISOString(),
});
console.log(`dialogue-sync: ${messages.length} new message(s)`);
