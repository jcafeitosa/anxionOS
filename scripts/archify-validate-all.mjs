#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "vendor/archify/archify/bin/archify.mjs");
const specsDir = join(root, ".archify/specs");

const typeFromFilename = (name) => {
  const match = name.match(/\.(architecture|workflow|sequence|dataflow|lifecycle)\.json$/);
  return match?.[1];
};

const specs = readdirSync(specsDir).filter((f) => typeFromFilename(f));

if (specs.length === 0) {
  console.error("No Archify specs found in .archify/specs/");
  process.exit(1);
}

for (const spec of specs) {
  const type = typeFromFilename(spec);
  const path = join(specsDir, spec);
  console.log(`validate ${type} ${spec}`);
  execFileSync(
    process.execPath,
    [cli, "validate", type, path, "--quality", "showcase", "--json"],
    { stdio: "inherit" },
  );
}

console.log(`archify: ${specs.length} spec(s) passed showcase validation`);
