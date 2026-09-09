#!/usr/bin/env node
/**
 * Integração taskboard ↔ hire/dismiss.
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ISSUE_SCOPE_MAP, ON_DEMAND_SPECIALISTS, ON_DEMAND_WORKERS, GATE_LEAD_MAP } from "./levels.mjs";
import { registerHire, findActiveByTarget, listActive } from "./roster.mjs";
import { dismissHire } from "./roster.mjs";
import { assertIssueId, repoRoot } from "./registry.mjs";
import { formatIssueIdHint } from "../agent-config/load-config.mjs";

function fetchIssue(issueId) {
  const r = spawnSync("node", ["scripts/taskboard.mjs", "get", issueId], { cwd: repoRoot, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`Taskboard indisponível: ${issueId}`);
  const parsed = JSON.parse(r.stdout);
  return parsed.task ?? parsed;
}

export function detectHiresFromIssue(issue) {
  const text = `${issue.title ?? ""} ${issue.description ?? ""} ${(issue.labels ?? []).join(" ")}`;
  const hires = [];
  const seen = new Set();
  for (const rule of ISSUE_SCOPE_MAP) {
    if (!rule.match.test(text)) continue;
    for (const slug of [...(rule.personas ?? []), ...(rule.workers ?? [])]) {
      if (!seen.has(slug)) { seen.add(slug); hires.push({ slug, reason: `escopo: ${rule.match}` }); }
    }
    if (rule.gate) {
      for (const slug of ON_DEMAND_SPECIALISTS[rule.gate] ?? []) {
        if (!seen.has(slug)) { seen.add(slug); hires.push({ slug, reason: `gate ${rule.gate}` }); }
      }
    }
  }
  if ((issue.status ?? issue.state) === "in_review") {
    for (const [lead, gate] of Object.entries(GATE_LEAD_MAP)) {
      if (!seen.has(lead)) { seen.add(lead); hires.push({ slug: lead, reason: `in_review ${gate}` }); }
    }
  }
  return hires;
}

export function delegateAutoHire(issueId) {
  assertIssueId(issueId);
  const issue = fetchIssue(issueId);
  const suggestions = detectHiresFromIssue(issue);
  const hired = [];
  for (const s of suggestions) {
    if (findActiveByTarget(issueId, s.slug)) continue;
    const isWorker = ON_DEMAND_WORKERS.includes(s.slug);
    const hirer = isWorker ? "orchestrator" : "orchestrator";
    try {
      hired.push(registerHire({
        issueId,
        target: s.slug,
        targetType: isWorker ? "worker" : "specialist",
        hiredBy: hirer,
        hiredByLevel: "A",
        reason: s.reason,
        evidence: `auto-delegate ${issueId}`,
      }));
    } catch (e) {
      if (!e.message.includes("Máximo") && !e.message.includes("já contratado")) throw e;
    }
  }
  return { issueId, hired };
}

export function dismissAllForIssue(issueId, evidence = "issue done") {
  assertIssueId(issueId);
  const active = listActive(issueId);
  const dismissed = active.map((a) => dismissHire(a.id, { dismissedBy: "orchestrator", evidence, rejected: false }));
  return { issueId, dismissedCount: dismissed.length };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const issueIdx = args.indexOf("--issue");
  const issueId = issueIdx >= 0 ? args[issueIdx + 1]?.toUpperCase() : null;
  if (!issueId) { console.error(`Usage: taskboard-sync.mjs delegate|done --issue ${formatIssueIdHint()}`); process.exit(1); }
  const result = cmd === "done" ? dismissAllForIssue(issueId) : delegateAutoHire(issueId);
  console.log(JSON.stringify(result, null, 2));
}
