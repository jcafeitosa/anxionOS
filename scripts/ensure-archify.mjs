#!/usr/bin/env node
/**
 * Ensures vendor/archify is present at the pinned commit (.archify/VERSION).
 * Used by npm postinstall and CI — no git submodule required.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vendorDir = join(root, "vendor", "archify");
const versionFile = join(root, ".archify", "VERSION");

function readPinnedCommit() {
  const raw = readFileSync(versionFile, "utf8");
  const line = raw
    .split("\n")
    .map((l) => l.trim())
    .find((l) => /^[0-9a-f]{40}$/i.test(l));
  if (!line) {
    throw new Error(`No commit SHA found in ${versionFile}`);
  }
  return line;
}

function run(cmd, cwd = root) {
  execSync(cmd, { cwd, stdio: "inherit" });
}

function currentHead() {
  if (!existsSync(join(vendorDir, ".git"))) return null;
  return execSync("git rev-parse HEAD", { cwd: vendorDir, encoding: "utf8" }).trim();
}

const pinned = readPinnedCommit();
const head = currentHead();

if (head === pinned) {
  console.log(`archify: vendor/archify @ ${pinned.slice(0, 7)} (ok)`);
} else if (head) {
  console.log(`archify: updating vendor/archify ${head.slice(0, 7)} → ${pinned.slice(0, 7)}`);
  run(`git fetch --depth 1 origin ${pinned}`);
  run(`git checkout --detach ${pinned}`);
} else {
  console.log(`archify: cloning vendor/archify @ ${pinned.slice(0, 7)}`);
  run("mkdir -p vendor");
  run(
    `git clone --depth 1 https://github.com/tt-a1i/archify.git vendor/archify`,
    root,
  );
  run(`git fetch --depth 1 origin ${pinned}`, vendorDir);
  run(`git checkout --detach ${pinned}`, vendorDir);
}

const archifyPkg = join(vendorDir, "archify");
if (existsSync(join(archifyPkg, "package.json"))) {
  run("npm install --omit=dev", archifyPkg);
}
