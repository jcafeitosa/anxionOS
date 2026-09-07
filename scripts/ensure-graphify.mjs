#!/usr/bin/env node
/**
 * Ensures vendor/graphify is present at the pinned commit (.graphify/VERSION)
 * and installs graphifyy into .graphify/.venv (Python ≥ 3.10).
 *
 * Uses PyPI wheels (graphifyy==pypi pin in .graphify/VERSION) because
 * editable installs can fail on newer Python (e.g. 3.14 + graspologic/gensim).
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  graphifyBin,
  readPinnedCommit,
  root,
  vendorDir,
  venvDir,
} from "./graphify-env.mjs";

function run(cmd, cwd = root) {
  execSync(cmd, { cwd, stdio: "inherit" });
}

function currentHead() {
  if (!existsSync(join(vendorDir, ".git"))) return null;
  return execSync("git rev-parse HEAD", { cwd: vendorDir, encoding: "utf8" }).trim();
}

function resolvePython() {
  const candidates = ["python3", "python"];
  for (const bin of candidates) {
    const r = spawnSync(bin, ["--version"], { encoding: "utf8" });
    if (r.status === 0) return bin;
  }
  throw new Error("graphify: Python 3.10+ required (python3 not found)");
}

function pythonMinor(python) {
  const r = spawnSync(
    python,
    ["-c", "import sys; print(f\"{sys.version_info[0]}.{sys.version_info[1]}\")"],
    { encoding: "utf8" },
  );
  if (r.status !== 0) throw new Error("graphify: could not detect Python version");
  const [major, minor] = r.stdout.trim().split(".").map(Number);
  if (major < 3 || (major === 3 && minor < 10)) {
    throw new Error(`graphify: Python 3.10+ required (found ${r.stdout.trim()})`);
  }
  return { major, minor };
}

function readPinnedPypiVersion() {
  const raw = readFileSync(join(root, ".graphify", "VERSION"), "utf8");
  const line = raw
    .split("\n")
    .map((l) => l.trim())
    .find((l) => /^pypi=/.test(l));
  if (!line) {
    throw new Error("No pypi= version in .graphify/VERSION");
  }
  return line.split("=", 2)[1];
}

const pinned = readPinnedCommit();
const head = currentHead();

if (head === pinned) {
  console.log(`graphify: vendor/graphify @ ${pinned.slice(0, 7)} (ok)`);
} else if (head) {
  console.log(`graphify: updating vendor/graphify ${head.slice(0, 7)} → ${pinned.slice(0, 7)}`);
  run(`git fetch --depth 1 origin ${pinned}`, vendorDir);
  run(`git checkout --detach ${pinned}`, vendorDir);
} else {
  console.log(`graphify: cloning vendor/graphify @ ${pinned.slice(0, 7)}`);
  run("mkdir -p vendor");
  run("git clone --depth 1 https://github.com/Graphify-Labs/graphify.git vendor/graphify");
  run(`git fetch --depth 1 origin ${pinned}`, vendorDir);
  run(`git checkout --detach ${pinned}`, vendorDir);
}

const pypiVersion = readPinnedPypiVersion();
const python = resolvePython();
pythonMinor(python);

if (!existsSync(join(venvDir, "pyvenv.cfg"))) {
  console.log("graphify: creating .graphify/.venv");
  run(`${python} -m venv .graphify/.venv`);
}

const pip = join(venvDir, process.platform === "win32" ? "Scripts" : "bin", "pip");
run(`"${pip}" install -q --upgrade pip`);
console.log(`graphify: installing graphifyy==${pypiVersion} from PyPI`);
run(`"${pip}" install -q "graphifyy==${pypiVersion}"`);

if (!existsSync(graphifyBin)) {
  throw new Error(`graphify: CLI not found at ${graphifyBin} after install`);
}

const version = execSync(`"${graphifyBin}" --version`, { encoding: "utf8" }).trim();
console.log(`graphify: ${version} ready (${graphifyBin})`);