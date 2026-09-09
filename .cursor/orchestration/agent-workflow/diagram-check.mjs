#!/usr/bin/env node
/**
 * Verifica cobertura de diagramas Mermaid em docs de orquestração.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const DEFAULT_PATHS = [
  join(root, ".cursor/orchestration/workflows"),
  join(root, ".cursor/orchestration"),
];

const SKIP_FILES = new Set(["diagram-check.mjs"]);

function parseArgs(argv) {
  const opts = { paths: [], verbose: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--path") opts.paths.push(argv[++i]);
    else if (a === "--verbose" || a === "-v") opts.verbose = true;
    else if (a === "--help" || a === "-h") {
      console.log("Usage: diagram-check.mjs [--path DIR] [--verbose]");
      process.exit(0);
    }
  }
  if (opts.paths.length === 0) {
    opts.paths = DEFAULT_PATHS.map((p) => relative(root, p));
  }
  return opts;
}

function collectMarkdownFiles(dir, acc = []) {
  if (!statSync(dir, { throwIfNoEntry: false })) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      collectMarkdownFiles(full, acc);
    } else if (entry.isFile() && extname(entry.name) === ".md" && !SKIP_FILES.has(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function analyzeFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  const mermaidBlocks = [...content.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1]);
  const types = { flowchart: false, sequence: false, state: false, gantt: false, other: false, total: mermaidBlocks.length };
  for (const block of mermaidBlocks) {
    const head = block.trim().split("\n")[0].toLowerCase();
    if (head.startsWith("flowchart") || head.startsWith("graph ")) types.flowchart = true;
    else if (head.startsWith("sequencediagram")) types.sequence = true;
    else if (head.startsWith("statediagram")) types.state = true;
    else if (head.startsWith("gantt")) types.gantt = true;
    else types.other = true;
  }
  const isWorkflow = filePath.includes("/workflows/") && !filePath.endsWith("/workflows/README.md");
  const workflowOk = !isWorkflow || (types.flowchart && (types.sequence || types.state));
  return { filePath, types, workflowOk, isWorkflow };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const files = [];
  for (const p of opts.paths) {
    const abs = p.startsWith("/") ? p : join(root, p);
    collectMarkdownFiles(abs, files);
  }
  const results = files.map(analyzeFile).sort((a, b) => a.filePath.localeCompare(b.filePath));
  const withMermaid = results.filter((r) => r.types.total > 0);
  const workflowFiles = results.filter((r) => r.isWorkflow);
  const workflowOk = workflowFiles.filter((r) => r.workflowOk);
  const totalMermaid = results.reduce((sum, r) => sum + r.types.total, 0);
  console.log("anxionOS — diagram coverage report\n");
  console.log(`Files scanned:     ${results.length}`);
  console.log(`Files with mermaid: ${withMermaid.length} (${results.length ? Math.round((withMermaid.length / results.length) * 100) : 0}%)`);
  console.log(`Total mermaid blocks: ${totalMermaid}`);
  if (workflowFiles.length > 0) console.log(`Workflow files OK:  ${workflowOk.length}/${workflowFiles.length}`);
  console.log("");
  const failing = results.filter((r) => r.isWorkflow && !r.workflowOk);
  if (failing.length > 0) {
    console.log("Missing required diagrams:");
    for (const f of failing) {
      const rel = relative(root, f.filePath);
      const missing = [];
      if (!f.types.flowchart) missing.push("flowchart");
      if (!f.types.sequence && !f.types.state) missing.push("sequence|stateDiagram");
      console.log(`  ✗ ${rel} — need: ${missing.join(", ")}`);
    }
    console.log("");
  }
  if (opts.verbose) {
    console.log("Per-file breakdown:");
    for (const r of results) {
      const rel = relative(root, r.filePath);
      const tags = [];
      if (r.types.flowchart) tags.push("flowchart");
      if (r.types.sequence) tags.push("sequence");
      if (r.types.state) tags.push("state");
      if (r.types.gantt) tags.push("gantt");
      const mark = r.types.total === 0 ? "○" : r.workflowOk || !r.isWorkflow ? "✓" : "✗";
      console.log(`  ${mark} ${rel} (${r.types.total}) [${tags.join(", ") || "none"}]`);
    }
  }
  const coveragePct = results.length ? Math.round((withMermaid.length / results.length) * 100) : 100;
  console.log(`Coverage: ${coveragePct}%`);
  if (failing.length > 0) process.exit(1);
}

main();
