/**
 * Rituais Google-style — helpers para standup, design review, team interaction.
 * ANX-274
 */

import { readDialogueMessages } from "./dialogue-log.mjs";

export const GOOGLE_RITUALS = {
  standup: {
    id: "standup",
    name: "Daily standup",
    dialogueTypes: ["status"],
    cli: "npm run orchestration:standup -- --issue ANX-N --post",
    when: "Início de turno longo ou 2+ personas na issue",
  },
  designReview: {
    id: "design-review",
    name: "Design doc review",
    dialogueTypes: ["consult", "debate", "response"],
    cli: "npm run orchestration:broadcast -- --type consult --issue ANX-N",
    when: "P1–P2 antes de código em backend/frontend",
  },
  codeReview: {
    id: "code-review",
    name: "Code review",
    dialogueTypes: ["review", "verdict", "response"],
    cli: "npm run orchestration:broadcast -- --type review --gate G2 --issue ANX-N",
    when: "Após G1 PASS",
  },
  launchReadiness: {
    id: "launch-readiness",
    name: "Launch readiness review",
    dialogueTypes: ["plan", "decision"],
    cli: "npm run orchestration:phase -- gate P6 --issue ANX-N",
    when: "P6 antes de produção",
  },
  postmortem: {
    id: "postmortem",
    name: "Blameless postmortem",
    dialogueTypes: ["share", "plan"],
    cli: "skill write-a-postmortem",
    when: "P7 ou incidente material",
  },
};

export const STANDUP_SECTIONS = ["Feito", "Fazendo", "Bloqueio"];

/**
 * @param {string} body
 */
export function isStandupFormat(body) {
  if (!body || typeof body !== "string") return false;
  const lower = body.toLowerCase();
  return STANDUP_SECTIONS.some((s) => lower.includes(s.toLowerCase()));
}

/**
 * Detecta se houve interação peer-to-peer (não só orchestrator) no dialogue.
 * @param {string} issueId
 * @param {object} [opts]
 */
export function detectPeerInteraction(issueId, opts = {}) {
  const messages = opts.messages ?? readDialogueMessages({ issueId, limit: 200 });
  const orchestratorOnly = new Set(["orchestrator", "cto-critic"]);
  const peerTypes = new Set([
    "consult",
    "response",
    "debate",
    "challenge",
    "pair",
    "collab",
  ]);

  let peerToPeer = false;
  let orchestratorPosts = 0;
  let executorCriticExchange = false;

  for (const m of messages) {
    const slug = m.from?.persona?.role ?? m.from?.role ?? "";
    if (slug === "orchestrator") orchestratorPosts += 1;

    if (peerTypes.has(m.type)) {
      const mentionsOther =
        /@\w+/i.test(m.body ?? "") &&
        !/@owner/i.test(m.body ?? "") &&
        slug !== "orchestrator";
      if (mentionsOther || (slug && !orchestratorOnly.has(slug))) {
        peerToPeer = true;
      }
    }

    if (
      (slug?.endsWith("-executor") || slug?.endsWith("-critic")) &&
      (m.type === "challenge" || m.type === "response" || m.type === "consult")
    ) {
      executorCriticExchange = true;
    }
  }

  return {
    peerToPeer,
    orchestratorPosts,
    executorCriticExchange,
    messageCount: messages.length,
  };
}

/**
 * @param {string} issueId
 * @param {object} [opts]
 * @returns {{ code: string, message: string, fix: string }[]}
 */
export function evaluateTeamInteractionWarnings(issueId, opts = {}) {
  const warnings = [];
  if (!issueId) return warnings;

  const { peerToPeer, orchestratorPosts, executorCriticExchange, messageCount } =
    detectPeerInteraction(issueId, opts);

  if (messageCount >= 3 && orchestratorPosts > 0 && !peerToPeer && !executorCriticExchange) {
    warnings.push({
      code: "GOOGLE_TEAM_NO_PEER_CHAT",
      message:
        "Dialogue sem interação peer-to-peer — time deve conversar entre si (consult/challenge/response), não só via orchestrator",
      fix:
        "Ver GOOGLE-TEAM-PLAYBOOK.md § Conversa natural; exemplos em templates/GOOGLE-NATURAL-TEAM-EXAMPLES.md",
    });
  }

  return warnings;
}

/**
 * @param {string} ritualId
 */
export function getRitual(ritualId) {
  return GOOGLE_RITUALS[ritualId] ?? null;
}

export function listRituals() {
  return Object.values(GOOGLE_RITUALS);
}

function parseArgs(argv) {
  const opts = { cmd: argv[0], issue: null, json: false, ritual: null };
  for (let i = 1; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--issue") opts.issue = argv[++i];
    else if (a === "--ritual") opts.ritual = argv[++i];
  }
  return opts;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.cmd || args.cmd === "--help" || args.cmd === "-h") {
    console.log(`Usage:
  node google-team-rituals.mjs list [--json]
  node google-team-rituals.mjs check --issue ANX-N [--json]
  node google-team-rituals.mjs ritual standup|design-review|...`);
    process.exit(0);
  }

  if (args.cmd === "list") {
    const out = listRituals();
    console.log(args.json ? JSON.stringify(out, null, 2) : out.map((r) => `${r.id}: ${r.name}`).join("\n"));
    return;
  }

  if (args.cmd === "check") {
    if (!args.issue) throw new Error("--issue ANX-N obrigatório");
    const peer = detectPeerInteraction(args.issue);
    const warnings = evaluateTeamInteractionWarnings(args.issue);
    const out = { issueId: args.issue, peer, warnings };
    console.log(args.json ? JSON.stringify(out, null, 2) : JSON.stringify(out, null, 2));
    return;
  }

  if (args.cmd === "ritual") {
    const r = getRitual(args.ritual);
    if (!r) throw new Error(`Ritual desconhecido: ${args.ritual}`);
    console.log(args.json ? JSON.stringify(r, null, 2) : `${r.name}\nWhen: ${r.when}\nCLI: ${r.cli}`);
    return;
  }

  throw new Error(`Comando desconhecido: ${args.cmd}`);
}

import { fileURLToPath } from "node:url";

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
