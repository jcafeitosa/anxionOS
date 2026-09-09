#!/usr/bin/env node
/**
 * Wrapper CLI — delega para ~/.cursor/orchestration/bin/orchestration.mjs ou cópia local.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const globalBin = join(process.env.ORCHESTRATION_HOME ?? join(homedir(), ".cursor", "orchestration"), "bin", "orchestration.mjs");
const localBin = join(scriptDir, "..", ".cursor", "orchestration", "bin", "orchestration.mjs");

const bin = existsSync(globalBin) ? globalBin : localBin;

if (!existsSync(bin)) {
  console.error("Framework de orquestração não encontrado.");
  console.error("Execute: npm run orchestration:install-global");
  process.exit(1);
}

const result = spawnSync(process.execPath, [bin, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
