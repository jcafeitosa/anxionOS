/**
 * Roster on-demand — registro e consulta de contratações ativas.
 */

import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  appendHireLog,
  loadActiveOnDemand,
  loadPermanentRoster,
  saveActiveOnDemand,
} from "./registry.mjs";
import { getCursorSubagentType, levelOf } from "./levels.mjs";
import { getPersona } from "../agent-dialogue/personas.mjs";

export const MAX_CONCURRENT_PER_ISSUE = 3;

export function listActive(issueId = null) {
  const data = loadActiveOnDemand();
  return data.agents.filter(
    (a) => a.status === "active" && (!issueId || a.issueId === issueId),
  );
}

export function countActiveForIssue(issueId) {
  return listActive(issueId).length;
}

export function findActiveByTarget(issueId, target) {
  return listActive(issueId).find((a) => a.slug === target);
}

export function registerHire(opts) {
  if (countActiveForIssue(opts.issueId) >= MAX_CONCURRENT_PER_ISSUE) {
    throw new Error(`Máximo ${MAX_CONCURRENT_PER_ISSUE} hires on-demand simultâneos por issue (${opts.issueId})`);
  }
  const existing = findActiveByTarget(opts.issueId, opts.target);
  if (existing) throw new Error(`${opts.target} já contratado em ${opts.issueId} (${existing.id})`);

  const data = loadActiveOnDemand();
  const cursorSubagentType = getCursorSubagentType(opts.target);
  const entry = {
    id: randomUUID(),
    slug: opts.target,
    targetType: opts.targetType,
    ...(cursorSubagentType ? { cursorSubagentType } : {}),
    issueId: opts.issueId,
    hiredBy: opts.hiredBy,
    hiredByLevel: opts.hiredByLevel,
    reason: opts.reason,
    evidence: opts.evidence,
    status: "active",
    hiredAt: new Date().toISOString(),
  };
  data.agents.push(entry);
  saveActiveOnDemand(data);
  appendHireLog({ action: "hire", ...entry });
  return entry;
}

export function dismissHire(hireId, opts) {
  const data = loadActiveOnDemand();
  const idx = data.agents.findIndex((a) => a.id === hireId && a.status === "active");
  if (idx === -1) throw new Error(`Hire ativo não encontrado: ${hireId}`);
  const hire = data.agents[idx];
  hire.status = opts.rejected ? "rejected" : "dismissed";
  hire.dismissedBy = opts.dismissedBy;
  hire.dismissEvidence = opts.evidence;
  hire.dismissedAt = new Date().toISOString();
  if (opts.rejected) hire.rejectedByCto = true;
  data.agents[idx] = hire;
  saveActiveOnDemand(data);
  appendHireLog({
    action: opts.rejected ? "reject" : "dismiss",
    hireId,
    issueId: hire.issueId,
    slug: hire.slug,
    hiredBy: hire.hiredBy,
    dismissedBy: opts.dismissedBy,
    evidence: opts.evidence,
  });
  return hire;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

function groupByLevel(agents) {
  const g = { A: [], B: [], C: [] };
  for (const a of agents) { const l = a.level ?? levelOf(a.slug); if (g[l]) g[l].push(a); }
  return g;
}

function cmdList(json, issueId) {
  const permanent = loadPermanentRoster();
  const groups = groupByLevel(permanent.agents);
  const active = listActive(issueId);
  const summary = { bootstrappedAt: permanent.bootstrappedAt, permanent: { total: permanent.agents.length, A: groups.A.length, B: groups.B.length, C: groups.C.length }, onDemand: { total: active.length, agents: active } };
  if (json) { console.log(JSON.stringify(summary, null, 2)); return; }
  console.log("=== Roster permanente (A/B/C) ===");
  console.log(`Bootstrap: ${permanent.bootstrappedAt ?? "não executado"}`);
  console.log(`Level A (${groups.A.length}): ${groups.A.map((a) => a.slug).join(", ") || "—"}`);
  console.log(`Level B (${groups.B.length}): ${groups.B.map((a) => a.slug).join(", ") || "—"}`);
  console.log(`Level C (${groups.C.length}): ${groups.C.map((a) => a.slug).join(", ") || "—"}`);
  console.log(`Total permanente: ${permanent.agents.length}\n=== On-demand ativos ===`);
  if (active.length === 0) console.log("(nenhum)");
  else for (const h of active) {
    const hirer = getPersona(h.hiredBy);
    const sub = h.cursorSubagentType ? ` → Task:${h.cursorSubagentType}` : "";
    console.log(`  ${h.slug}${sub} · ${hirer.shortName} (${h.hiredByLevel}) · ${h.issueId}`);
  }
  console.log(`Total on-demand: ${active.length}`);
}

function cmdCounts(json) {
  const permanent = loadPermanentRoster();
  const groups = groupByLevel(permanent.agents);
  const out = { permanentA: groups.A.length, permanentB: groups.B.length, permanentC: groups.C.length, permanentTotal: permanent.agents.length, onDemandActive: listActive().length };
  if (json) console.log(JSON.stringify(out, null, 2));
  else console.log(`A=${out.permanentA} B=${out.permanentB} C=${out.permanentC} permanent=${out.permanentTotal} on-demand=${out.onDemandActive}`);
}

if (isMain) {
  const args = process.argv.slice(2);
  const cmd = args[0] && !args[0].startsWith("-") ? args[0] : "list";
  const json = args.includes("--json");
  const issueIdx = args.indexOf("--issue");
  const issueId = issueIdx >= 0 ? args[issueIdx + 1]?.toUpperCase() : null;
  if (cmd === "list" || cmd === "counts") {
    if (cmd === "counts") cmdCounts(json);
    else cmdList(json, issueId);
  } else {
    const active = listActive(issueId);
    if (json) console.log(JSON.stringify(active, null, 2));
    else {
      console.log(`Hires ativos${issueId ? ` (${issueId})` : ""}: ${active.length}\n`);
      for (const h of active) { const hirer = getPersona(h.hiredBy); console.log(`${h.id.slice(0, 8)}… ${h.slug} · ${hirer.shortName} (${h.hiredByLevel}) · ${h.issueId}`); }
    }
  }
}
