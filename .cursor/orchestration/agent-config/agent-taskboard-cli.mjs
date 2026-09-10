#!/usr/bin/env node
/** CLI unificado: identity | comment | move */
import { fileURLToPath } from "node:url";
import { resolveIdentity, syncAgentsToRegistry } from "./agent-taskboard-identity.mjs";
import {
  detectAgentSyncDrift,
  formatAgentSyncDriftWarning,
  maybeAutoSyncAgents,
  warnAgentSyncDrift,
} from "./agent-taskboard-drift.mjs";
import { taskboardComment, taskboardMove } from "./agent-taskboard-write.mjs";

const args = process.argv.slice(2);
const cmd = args[0];
const getOpt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};

(async () => {
  try {
    if (cmd === "identity") {
      const identity = resolveIdentity(getOpt("--persona"));
      if (!identity) {
        console.error("Erro: --persona ou ORCHESTRATION_PERSONA obrigatório");
        process.exit(1);
      }
      console.log(JSON.stringify(identity, null, 2));
      process.exit(0);
    }
    if (cmd === "comment") {
      const result = await taskboardComment({
        issueId: getOpt("--issue")?.toUpperCase(),
        persona: getOpt("--persona"),
        body: getOpt("--body"),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (cmd === "sync-agents") {
      if (args.includes("--watch")) {
        const intervalMs = Number(getOpt("--interval-ms") ?? "60000");
        const tick = async () => {
          const drift = await detectAgentSyncDrift();
          if (drift.drift) warnAgentSyncDrift(drift);
          const result = await maybeAutoSyncAgents("taskboard:watch");
          if (args.includes("--json")) console.log(JSON.stringify({ drift, sync: result }, null, 2));
          else if (result.ok && result.agentCount) console.log(`✓ watch sync ${result.agentCount} personas`);
        };
        await tick();
        setInterval(() => { void tick(); }, intervalMs);
        return;
      }
      if (args.includes("--check-drift")) {
        const drift = await detectAgentSyncDrift();
        if (args.includes("--json")) console.log(JSON.stringify(drift, null, 2));
        else if (drift.drift) console.warn(formatAgentSyncDriftWarning(drift));
        else console.log(`✓ ${drift.expectedCount} personas alinhadas (registry ${drift.registryCount}, board ${drift.boardCount})`);
        process.exit(drift.drift ? 2 : 0);
      }
      const result = await syncAgentsToRegistry();
      if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
      else console.log(`✓ ${result.agentCount} personas → ${result.path}` + (result.taskboard?.projectId ? ` · board ${result.taskboard.projectId}` : ''));
      process.exit(0);
    }
    if (cmd === "move") {
      const result = await taskboardMove({
        issueId: getOpt("--issue")?.toUpperCase(),
        status: getOpt("--status"),
        persona: getOpt("--persona"),
        mergeAgentLabel: args.includes("--merge-agent-label"),
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    console.log(`Usage:
  npm run orchestration:taskboard -- identity --persona SLUG
  npm run orchestration:taskboard -- comment --issue ANX-N --persona SLUG --body "..."
  npm run orchestration:taskboard -- move --issue ANX-N --status STATUS --persona SLUG [--merge-agent-label]
  npm run orchestration:taskboard -- sync-agents [--json] [--check-drift] [--watch] [--interval-ms 60000]`);
    process.exit(cmd ? 1 : 0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();
