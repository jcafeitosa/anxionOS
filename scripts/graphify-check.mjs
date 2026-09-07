#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { graphifyOut, root } from "./graphify-env.mjs";

execFileSync(process.execPath, [join(root, "scripts/graphify-doctor.mjs")], { stdio: "inherit" });
execFileSync(process.execPath, [join(root, "scripts/graphify-index.mjs")], { stdio: "inherit" });

const graphPath = join(graphifyOut, "graph.json");
if (!existsSync(graphPath)) {
  console.error(`graphify check: missing ${graphPath}`);
  process.exit(1);
}

const data = JSON.parse(readFileSync(graphPath, "utf8"));
const nodes = Array.isArray(data.nodes) ? data.nodes.length : 0;
const links = Array.isArray(data.links) ? data.links.length : Array.isArray(data.edges) ? data.edges.length : 0;

if (nodes === 0) {
  console.error("graphify check: graph.json has zero nodes");
  process.exit(1);
}

console.log(`graphify check: ok (${nodes} nodes, ${links} edges)`);
