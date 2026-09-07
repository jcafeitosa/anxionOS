#!/usr/bin/env node
/**
 * Shared paths and env for graphify npm scripts.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const versionFile = join(root, ".graphify", "VERSION");
export const vendorDir = join(root, "vendor", "graphify");
export const venvDir = join(root, ".graphify", ".venv");
export const graphifyOut = join(root, ".graphify", "out");
export const graphifyIgnore = join(root, ".graphify", ".graphifyignore");

const isWin = process.platform === "win32";
export const graphifyBin = join(
  venvDir,
  isWin ? "Scripts" : "bin",
  isWin ? "graphify.exe" : "graphify",
);

export function readPinnedCommit() {
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

export function graphifyEnv() {
  return {
    ...process.env,
    GRAPHIFY_OUT: process.env.GRAPHIFY_OUT ?? ".graphify/out",
  };
}

export function resolveGraphifyCmd() {
  if (existsSync(graphifyBin)) {
    return graphifyBin;
  }
  return "graphify";
}
