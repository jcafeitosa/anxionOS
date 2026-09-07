#!/usr/bin/env node
import { execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  graphifyBin,
  graphifyEnv,
  graphifyIgnore,
  graphifyOut,
  readPinnedCommit,
  resolveGraphifyCmd,
  root,
  vendorDir,
  versionFile,
  venvDir,
} from "./graphify-env.mjs";

const errors = [];

if (!existsSync(versionFile)) errors.push(`missing ${versionFile}`);
if (!existsSync(graphifyIgnore)) errors.push(`missing ${graphifyIgnore}`);
if (!existsSync(vendorDir)) errors.push(`missing ${vendorDir} — run npm install`);
if (!existsSync(venvDir)) errors.push(`missing ${venvDir} — run npm install`);
if (!existsSync(graphifyBin)) errors.push(`missing CLI ${graphifyBin} — run npm install`);

if (existsSync(versionFile) && existsSync(`${vendorDir}/.git`)) {
  const pinned = readPinnedCommit();
  const head = execSync("git rev-parse HEAD", { cwd: vendorDir, encoding: "utf8" }).trim();
  if (head !== pinned) {
    errors.push(`vendor/graphify @ ${head.slice(0, 7)} ≠ pinned ${pinned.slice(0, 7)}`);
  }
}

const cmd = resolveGraphifyCmd();
const version = spawnSync(cmd, ["--version"], { cwd: root, encoding: "utf8", env: graphifyEnv() });
if (version.status !== 0) {
  errors.push(`graphify --version failed: ${version.stderr || version.stdout}`);
} else {
  console.log(version.stdout.trim());
}

if (errors.length) {
  for (const e of errors) console.error(`graphify doctor: ${e}`);
  process.exit(1);
}

console.log(`graphify doctor: ok (out=${graphifyOut})`);
