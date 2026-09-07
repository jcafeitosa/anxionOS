#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "vendor/archify/archify/bin/archify.mjs");
const specsDir = join(root, ".archify/specs");
const artifactsDir = join(root, ".archify/artifacts");

mkdirSync(artifactsDir, { recursive: true });

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
  const input = join(specsDir, spec);
  const base = spec.replace(/\.json$/, ".html");
  const output = join(artifactsDir, base);
  console.log(`deliver ${type} → ${base}`);
  execFileSync(
    process.execPath,
    [cli, "deliver", type, input, output, "--quality", "showcase", "--json"],
    { stdio: "inherit" },
  );
}

console.log(`archify: ${specs.length} artifact(s) delivered to .archify/artifacts/`);
