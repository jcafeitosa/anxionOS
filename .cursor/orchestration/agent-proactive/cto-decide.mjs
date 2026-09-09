#!/usr/bin/env node
/**
 * CTO Decision Authority — Renata Oliveira decide com evidência.
 *
 * Usage:
 *   npm run orchestration:cto-decide -- --list-pending
 *   npm run orchestration:cto-decide -- --issue ANX-221
 *   npm run orchestration:cto-decide -- --issue ANX-221 --subject "aceitar G7"
 *   npm run orchestration:cto-decide -- --issue ANX-221 --dry-run
 *   npm run orchestration:cto-decide -- --issue ANX-221 --apply
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { appendDialogueMessage } from "../agent-dialogue/dialogue-log.mjs";
import { getPersona } from "../agent-dialogue/personas.mjs";
import { createDialogueMessage } from "../agent-dialogue/protocol.mjs";
import { decisionToVerdict, evaluateEvidence } from "./cto-evidence.mjs";
import { fetchBoardState } from "./taskboard-fetch.mjs";
import { dismissHire } from "../agent-hire/roster.mjs";
import { assertIssueId } from "../agent-hire/registry.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const MAC_TASKCTL = "/Applications/Codex Taskboard.app/Contents/Resources/bin/taskctl";

function resolveTaskctl() {
  const fromPath = spawnSync("which", ["taskctl"], { encoding: "utf8" });
  if (fromPath.status === 0 && fromPath.stdout.trim()) return fromPath.stdout.trim();
  if (existsSync(MAC_TASKCTL)) return MAC_TASKCTL;
  return null;
}

const taskctl = resolveTaskctl();

function parseArgs(argv) {
  const opts = { issue: null, subject: null, json: false, apply: false, dryRun: false, listPending: false, hireReject: null, hireOverrideDismiss: null, evidence: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--issue") opts.issue = argv[++i]?.toUpperCase();
    else if (a === "--subject") opts.subject = argv[++i];
    else if (a === "--json") opts.json = true;
    else if (a === "--apply") opts.apply = true;
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--list-pending") opts.listPending = true;
    else if (a === "--hire-reject") opts.hireReject = argv[++i];
    else if (a === "--hire-override-dismiss") opts.hireOverrideDismiss = argv[++i];
    else if (a === "--evidence") opts.evidence = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log(`Usage: cto-decide.mjs [--list-pending] [--issue ANX-N] [--subject TEXT] [--apply] [--dry-run] [--json]`);
      process.exit(0);
    } else throw new Error(`Opção desconhecida: ${a}`);
  }
  return opts;
}

function runTaskboardGet(issueId) {
  const out = execFileSync("node", ["scripts/taskboard.mjs", "get", issueId], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const j = JSON.parse(out);
  return j.task ?? j;
}

function runCommentList(issueId) {
  if (!taskctl) return [];
  try {
    const out = execFileSync(taskctl, ["comment", "list", issueId, "--json"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
    return JSON.parse(out).comments ?? [];
  } catch {
    return [];
  }
}

function formatOutput(result, issueId, subject, opts) {
  const payload = {
    issueId,
    subject,
    decision: result.decision,
    verdict: decisionToVerdict(result),
    reasons: result.reasons,
    warnings: result.warnings,
    passed: result.passed,
    applyEligible: result.decision === "ACCEPT",
  };
  if (opts.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  console.log(`\nCTO Decision — ${issueId}`);
  console.log(`Subject: ${subject}`);
  console.log(`Decision: ${result.decision} · Verdict: ${decisionToVerdict(result)}\n`);
  if (result.passed.length) {
    console.log("✓ Passou:");
    for (const p of result.passed) console.log(`  - ${p}`);
  }
  if (result.warnings.length) {
    console.log("\n⚠ Avisos:");
    for (const w of result.warnings) console.log(`  - ${w}`);
  }
  if (result.reasons.length) {
    console.log("\n✗ Pendências:");
    for (const r of result.reasons) console.log(`  - ${r}`);
  }
  if (result.decision === "ACCEPT") {
    console.log("\nPróximo: npm run orchestration:cto-decide -- --issue " + issueId + " --apply");
  }
  console.log("");
}

function buildDecisionRecord(result, subject) {
  const chosen =
    result.decision === "ACCEPT"
      ? "aceitar"
      : result.decision === "ESCALATE_TO_OWNER"
        ? "escalar Owner"
        : "corrigir pendências";
  const options = ["aceitar", "corrigir pendências", "escalar Owner"];
  const rationale =
    result.decision === "ACCEPT"
      ? result.passed.slice(0, 6).join("; ")
      : result.reasons.join("; ") || result.warnings.join("; ");
  return {
    subject,
    options,
    chosen,
    rationale,
    reversible: result.decision !== "ACCEPT",
  };
}

function postDecision(issueId, subject, result) {
  const p = getPersona("orchestrator");
  const verdict = decisionToVerdict(result);
  const decision = buildDecisionRecord(result, subject);
  const body =
    result.decision === "ACCEPT"
      ? `@time — **Decisão CTO:** ${subject}. Escolhido: **${decision.chosen}**. ${decision.rationale}`
      : `@time — **Decisão CTO:** ${subject}. **${decision.chosen}**. Pendências: ${result.reasons.join("; ") || "ver avisos"}`;

  const message = createDialogueMessage({
    from: {
      agentId: "orchestrator-cto-decide",
      role: "orchestrator",
      name: p.fullName,
      persona: { name: p.fullName, role: p.slug, team: p.team },
    },
    issueId,
    gate: subject.toLowerCase().includes("g7") ? "G7" : null,
    type: "decision",
    body,
    verdict,
    evidence: [
      { kind: "issue", ref: issueId },
      { kind: "file", ref: ".cursor/orchestration/CTO-AUTHORITY.md" },
      { kind: "file", ref: ".cursor/orchestration/CTO-ACCEPTANCE.md" },
      { kind: "command", ref: `npm run orchestration:cto-decide -- --issue ${issueId}` },
    ],
    decision,
  });
  return appendDialogueMessage(message);
}

function moveDone(issueId) {
  const threadId =
    process.env.CURSOR_THREAD_ID ??
    process.env.CODEX_THREAD_ID ??
    `cursor-cto-decide-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;

  if (taskctl) {
    execFileSync(
      taskctl,
      ["comment", "add", issueId, "--body", "G7 decisão CTO (CTO-AUTHORITY.md) — move done", "--thread-id", threadId],
      { cwd: root, encoding: "utf8" },
    );
  }

  execFileSync("node", ["scripts/taskboard.mjs", "move", issueId, "done"], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, CURSOR_THREAD_ID: threadId },
  });
  console.log(`✓ ${issueId} → done (thread ${threadId})`);
  return threadId;
}

function launchPipeline() {
  const env = { ...process.env, CTO_DECISION_ACCEPT: "1" };
  delete env.OWNER_ACCEPTED_ANX221;
  execFileSync("./.cursor/orchestration/launch-pipeline.sh", [], {
    cwd: root,
    encoding: "utf8",
    env,
    stdio: "inherit",
  });
}

async function listPending() {
  spawnSync("npm", ["run", "taskboard:ensure"], { cwd: root, stdio: "pipe" });
  const { tasks } = await fetchBoardState();
  const pending = tasks.filter((t) => t.status === "in_review");
  console.log(`\nIssues in_review aguardando CTO (${pending.length}):\n`);
  for (const t of pending.sort((a, b) => a.identifier.localeCompare(b.identifier))) {
    console.log(`  ${t.identifier} · ${t.title?.slice(0, 60) ?? ""}…`);
  }
  console.log("\nAvaliar: npm run orchestration:cto-decide -- --issue ANX-N\n");
}

async function decideIssue(opts) {
  if (!opts.issue || !/^ANX-\d+$/.test(opts.issue)) throw new Error("--issue ANX-N obrigatório");
  spawnSync("npm", ["run", "taskboard:ensure"], { cwd: root, stdio: "pipe" });
  const task = runTaskboardGet(opts.issue);
  const comments = runCommentList(opts.issue);
  const subject = opts.subject ?? `aceitar G7 ${opts.issue}`;
  const result = evaluateEvidence(opts.issue, task, comments, root);
  formatOutput(result, opts.issue, subject, opts);

  if (opts.dryRun) return result;

  postDecision(opts.issue, subject, result);
  console.log("✓ Dialogue decision postado");

  if (opts.apply || (result.decision === "ACCEPT" && process.env.CTO_DECIDE_AUTO_APPLY === "1")) {
    if (result.decision !== "ACCEPT") {
      console.error(`--apply abortado: decisão ${result.decision}`);
      process.exit(1);
    }
    moveDone(opts.issue);
    if (opts.issue === "ANX-221") launchPipeline();
  }

  process.exit(result.decision === "ACCEPT" ? 0 : 1);
}


function handleHireOverride(opts) {
  if (!opts.hireReject && !opts.hireOverrideDismiss) return false;
  if (!opts.issue) throw new Error("--issue ANX-N obrigatório com --hire-reject ou --hire-override-dismiss");
  assertIssueId(opts.issue);
  if (!opts.evidence?.trim()) throw new Error("--evidence obrigatório para override CTO");
  const hireId = opts.hireReject ?? opts.hireOverrideDismiss;
  const rejected = Boolean(opts.hireReject);
  const hire = dismissHire(hireId, {
    dismissedBy: "orchestrator",
    evidence: opts.evidence,
    rejected,
  });
  const subject = rejected ? `rejeitar hire ${hire.slug}` : `override dismiss ${hire.slug}`;
  postDecision(opts.issue, subject, {
    decision: rejected ? "CHANGES_REQUIRED" : "ACCEPT",
    reasons: rejected ? [`Hire ${hireId} rejeitado`] : [],
    warnings: [],
    passed: [`Hire ${hire.slug} encerrado por CTO`],
  });
  console.log(`✓ CTO ${rejected ? "reject" : "override dismiss"}: ${hire.slug} (${hireId})`);
  return true;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (handleHireOverride(opts)) return;
  if (opts.listPending) {
    await listPending();
    return;
  }
  if (!opts.issue) throw new Error("Use --list-pending ou --issue ANX-N");
  await decideIssue(opts);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(2);
});
