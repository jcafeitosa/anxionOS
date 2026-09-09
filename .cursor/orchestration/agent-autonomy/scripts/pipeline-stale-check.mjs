#!/usr/bin/env node
/** Flag issues in_progress > 24h sem comentário recente. */

import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const STALE_MS = 24 * 60 * 60 * 1000;

const result = spawnSync("node", ["scripts/taskboard.mjs", "list", "--status", "in_progress", "--compact"], {
  cwd: repoRoot,
  encoding: "utf8",
});

if (result.status !== 0) {
  console.error("pipeline-stale-check: taskboard list failed");
  process.exit(1);
}

let data;
try {
  data = JSON.parse(result.stdout);
} catch {
  console.log("pipeline-stale-check: no in_progress issues");
  process.exit(0);
}

const tasks = data.tasks ?? [];
const now = Date.now();
let staleCount = 0;

for (const task of tasks) {
  const updated = task.updatedAt ? Date.parse(task.updatedAt) : null;
  if (!updated) continue;
  if (now - updated > STALE_MS) {
    staleCount += 1;
    console.log(`STALE: ${task.identifier} · ${task.title} · updated ${task.updatedAt}`);
  }
}

if (staleCount === 0) {
  console.log("pipeline-stale-check: no stale in_progress issues");
} else {
  console.log(`pipeline-stale-check: ${staleCount} stale issue(s) flagged`);
}
