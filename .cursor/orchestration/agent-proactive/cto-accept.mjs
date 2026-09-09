#!/usr/bin/env node
/** @see cto-decide.mjs — prefer orchestration:cto-decide for full apply flow */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const args = process.argv.slice(2);
const mapped = args.includes("--apply")
  ? [...args.filter((a) => a !== "--apply"), "--apply"]
  : args;
spawnSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), "cto-decide.mjs"), ...mapped], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
