#!/usr/bin/env node
/**
 * Imprime catalogo resumido das Politicas Zero (Z0-Z21).
 * Fonte canonica: .cursor/orchestration/ZERO-POLICIES.md
 */

const CATALOG = [
  { id: "Z0", name: "Zero trabalho fora do board", enforcement: "block", codes: "WORK_WITHOUT_BOARD_ISSUE, TASKBOARD_OFFLINE" },
  { id: "Z1", name: "Zero codigo incompleto", enforcement: "block", codes: "grep + G1/G2" },
  { id: "Z2", name: "Zero done com ressalvas", enforcement: "block", codes: "DONE_WITH_RESERVATIONS (policy)" },
  { id: "Z3", name: "Zero silent work", enforcement: "block", codes: "MISSING_ACK, STALE_STATUS, PENDING_BROADCAST" },
  { id: "Z4", name: "Zero monologo coordenador", enforcement: "warn", codes: "COORDINATOR_MONOLOGUE" },
  { id: "Z5", name: "Zero proxy hierarquico", enforcement: "warn", codes: "HIERARCHY_PROXY_ANSWER" },
  { id: "Z6", name: "Zero brain ignorado", enforcement: "warn", codes: "BRAIN_NOT_CONSULTED" },
  { id: "Z7", name: "Zero delegacao sem feedback", enforcement: "warn", codes: "DELEGATION_NO_FEEDBACK" },
  { id: "Z8", name: "Zero dialogue nao exibido", enforcement: "block*", codes: "PENDING_CHAT_DISPLAY" },
  { id: "Z9", name: "Zero secrets/hardcoded", enforcement: "block", codes: "grep + G4" },
  { id: "Z10", name: "Zero mistura de boards", enforcement: "block", codes: "CURSOR_GOAL_MISSING" },
  { id: "Z11", name: "Zero AGENTS.md ignorado", enforcement: "block", codes: "AGENTS_MD" },
  { id: "Z12", name: "Zero executor sem critico", enforcement: "block", codes: "MISSING_CRITIC_PAIR" },
  { id: "Z13", name: "Zero Renata sem Claudia", enforcement: "warn", codes: "MISSING_CTO_CRITIC_PAIR" },
  { id: "Z14", name: "Zero voz robotica", enforcement: "warn", codes: "PERSONA_ROBOTIC" },
  { id: "Z15", name: "Zero decisao fora do nucleo", enforcement: "warn", codes: "CENTER_BYPASS_DECISION" },
  { id: "Z16", name: "Zero reflexao pendente", enforcement: "warn", codes: "REFLECTION_PENDING" },
  { id: "Z17", name: "Zero graphify ignorado", enforcement: "warn", codes: "GRAPHIFY_INDEX_MISSING" },
  { id: "Z18", name: "Zero SCOPE ignorado", enforcement: "block", codes: "SCOPE" },
  { id: "Z19", name: "Zero capacidades subutilizadas", enforcement: "warn", codes: "CAPABILITIES_UNDERUSED" },
  { id: "Z20", name: "Zero sem bypass de blockers", enforcement: "block", codes: "BLOCKER_BYPASS_ATTEMPT, MISSING_PEER_DEBATE, UNVOTED_IMPLEMENTATION, NO_AUDIT_TRAIL, SELF_APPROVAL" },
  { id: "Z21", name: "Zero claim sem lock", enforcement: "block", codes: "MISSING_ISSUE_LOCK, CROSS_CHAT_CLAIM_CONFLICT" },
];

function printTable() {
  console.log("Politicas Zero — catalogo (22 politicas)\n");
  console.log("Doc: .cursor/orchestration/ZERO-POLICIES.md\n");
  console.log("| ID | Nome | Enforcement | Compliance |");
  console.log("| --- | --- | --- | --- |");
  for (const row of CATALOG) {
    console.log(`| ${row.id} | ${row.name} | ${row.enforcement} | ${row.codes} |`);
  }
  console.log("\n* Z8: warn pre-work; block pre-commit (orchestrator)");
  console.log("Verificar: npm run orchestration:compliance -- --pre-work --issue ANX-N --persona SLUG");
}

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  console.log("Uso: npm run orchestration:zero-policies [--json]");
  process.exit(0);
}

if (argv.includes("--json")) {
  console.log(JSON.stringify({ version: 1, count: CATALOG.length, policies: CATALOG }, null, 2));
  process.exit(0);
}

printTable();
