#!/usr/bin/env node
/**
 * Registry central de recursos autônomos por persona.
 */

import { appendAutonomyLog, readAutonomyLog } from "./autonomy-log.mjs";
import {
  FORBIDDEN_COMMAND_PATTERNS,
  ISSUE_ID_RE,
  assertSafeCommand,
  loadRegistry,
  printJson,
  registryPath,
} from "./lib.mjs";

function usage(exitCode = 0) {
  console.log(`anxionOS Agent Autonomy — registry

Commands:
  list [--persona SLUG] [--type hooks|loops|crons|goals] [--json]
  validate
  audit [--limit N]
  path

Docs: .cursor/orchestration/AUTONOMY.md`);
  process.exit(exitCode);
}

function parseListArgs(argv) {
  const opts = { persona: null, type: null, asJson: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--type") opts.type = argv[++i];
    else if (a === "--json") opts.asJson = true;
    else throw new Error(`Unknown option: ${a}`);
  }
  return opts;
}

function cmdList(argv) {
  const opts = parseListArgs(argv);
  const registry = loadRegistry();
  const resources = { ...registry.resources };

  if (opts.type) {
    if (!resources[opts.type]) throw new Error(`Invalid --type`);
    const filtered = opts.persona
      ? resources[opts.type].filter((r) => r.persona === opts.persona)
      : resources[opts.type];
    if (opts.asJson) {
      printJson({ type: opts.type, items: filtered });
    } else if (filtered.length === 0) {
      console.log(`(nenhum recurso ${opts.type})`);
    } else {
      for (const item of filtered) {
        const issue = item.issueId ? ` · ${item.issueId}` : "";
        const status = item.enabled ? "on" : "off";
        console.log(`${item.id}\t${opts.type}\t${item.persona}${issue}\t[${status}]`);
      }
    }
    return;
  }

  if (opts.asJson) {
    const all = opts.persona
      ? Object.fromEntries(
          Object.entries(resources).map(([k, v]) => [k, v.filter((r) => r.persona === opts.persona)]),
        )
      : resources;
    printJson({ version: registry.version, updatedAt: registry.updatedAt, resources: all });
    return;
  }

  console.log(`Registry v${registry.version} · updated ${registry.updatedAt}\n`);
  for (const [kind, items] of Object.entries(resources)) {
    const filtered = opts.persona ? items.filter((r) => r.persona === opts.persona) : items;
    console.log(`## ${kind} (${filtered.length})`);
    if (filtered.length === 0) {
      console.log("  (vazio)\n");
      continue;
    }
    for (const item of filtered) {
      const issue = item.issueId ? ` · ${item.issueId}` : "";
      const status = item.enabled ? "on" : "off";
      console.log(`  ${item.id}\t${item.persona}${issue}\t[${status}]`);
    }
    console.log("");
  }
}

function validateResource(kind, item, errors) {
  if (!item.id) errors.push(`${kind}: missing id`);
  if (!item.persona) errors.push(`${kind} ${item.id}: missing persona`);
  if ((kind === "loops" || kind === "goals") && !item.issueId) {
    errors.push(`${kind} ${item.id}: requires issueId ANX-*`);
  }
  if (item.issueId && !ISSUE_ID_RE.test(item.issueId)) {
    errors.push(`${kind} ${item.id}: invalid issueId ${item.issueId}`);
  }
  if (kind === "crons" && item.command) {
    for (const pattern of FORBIDDEN_COMMAND_PATTERNS) {
      if (pattern.test(item.command)) errors.push(`${kind} ${item.id}: forbidden command`);
    }
  }
}

function cmdValidate() {
  const registry = loadRegistry();
  const errors = [];
  for (const [kind, items] of Object.entries(registry.resources)) {
    for (const item of items) validateResource(kind, item, errors);
  }
  if (errors.length > 0) {
    console.error("VALIDATION FAILED:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("Registry valid.");
  appendAutonomyLog({ action: "validate", resourceType: "registry", persona: "orchestrator" });
}

function cmdAudit(argv) {
  let limit = 20;
  if (argv[0] === "--limit" && argv[1]) limit = Number(argv[1]);
  const entries = readAutonomyLog({ limit });
  if (entries.length === 0) {
    console.log("(audit log vazio)");
    return;
  }
  for (const e of entries) {
    console.log(
      `[${e.timestamp}] ${e.persona} · ${e.action} · ${e.resourceType}${e.resourceId ? `:${e.resourceId}` : ""} · ${e.outcome}`,
    );
  }
}

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd || cmd === "--help" || cmd === "-h") usage();

try {
  switch (cmd) {
    case "list":
      cmdList(rest);
      break;
    case "validate":
      cmdValidate();
      break;
    case "audit":
      cmdAudit(rest);
      break;
    case "path":
      console.log(registryPath);
      break;
    default:
      usage(1);
  }
} catch (err) {
  console.error(`registry error: ${err.message}`);
  process.exit(1);
}
