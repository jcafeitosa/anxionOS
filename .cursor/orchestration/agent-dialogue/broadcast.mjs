#!/usr/bin/env node
/**
 * CLI de diálogo visível entre agentes (orquestrador, executor, crítico, equipes).
 *
 * Usage:
 *   node .cursor/orchestration/agent-dialogue/broadcast.mjs post [opts]
 *   node .cursor/orchestration/agent-dialogue/broadcast.mjs read [opts]
 *   node .cursor/orchestration/agent-dialogue/broadcast.mjs tail [--lines N]
 *   node .cursor/orchestration/agent-dialogue/broadcast.mjs path
 *
 * Env: CURSOR_THREAD_ID / CODEX_THREAD_ID (threadId automático no post)
 */

import { execFileSync, spawnSync } from "node:child_process";
import { getCliBrand } from "../agent-config/cli-brand.mjs";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writePendingChatDisplay } from "./chat-feed.mjs";
import { cmdConversation } from "./conversation.mjs";
import {
  appendDialogueMessage,
  formatDialogueMessages,
  getDialogueLogPath,
  readDialogueMessages,
} from "./dialogue-log.mjs";
import { getPersona, personaRef, PERSONA_SLUGS } from "./personas.mjs";
import {
  AGENT_ROLES,
  GATE_IDS,
  MESSAGE_TYPES,
  VERDICTS,
  createDialogueMessage,
  parseDialogueMessage,
} from "./protocol.mjs";
import { touchSessionFromDialogue } from "./session-tracker.mjs";
import { formatDialogueTerminalOneliner } from "./terminal-format.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const MAC_TASKCTL =
  "/Applications/Codex Taskboard.app/Contents/Resources/bin/taskctl";

function resolveTaskctl() {
  const fromPath = spawnSync("which", ["taskctl"], { encoding: "utf8" });
  if (fromPath.status === 0 && fromPath.stdout.trim()) {
    return fromPath.stdout.trim();
  }
  if (existsSync(MAC_TASKCTL)) {
    return MAC_TASKCTL;
  }
  return null;
}

const taskctl = resolveTaskctl();

function usage(exitCode = 0) {
  console.log(`${getCliBrand()} — agent dialogue — personas e interações

Commands:
  post [opts]              Publica mensagem (.cursor/orchestration-runtime/dialogue/dialogue.jsonl)
  read [opts]              Lista mensagens
  tail [--lines N]         Últimas N mensagens (default 20)
  conversation [opts]      Markdown para exibir no chat Cursor
  path                     Caminho do JSONL
  --help                   Esta ajuda

Personas (--from-persona / --to-persona):
  ${PERSONA_SLUGS.join(", ")}

Tipos de interação (--type):
  ${MESSAGE_TYPES.join(", ")}

Post options:
  --from-persona SLUG      Resolve nome/time/role (ex.: backend-executor)
  --to-persona SLUG        Destinatário com persona
  --from-role ROLE         Papel legado
  --from-name NAME         Nome exibido legado
  --from-id ID             agentId
  --to-mention @nome       Menção
  --to-role ROLE           Papel destinatário
  --issue ANX-N            Issue vinculada
  --gate G1                Gate G0–G7
  --type TYPE              Tipo de interação
  --body TEXT              Corpo markdown
  --body-file PATH         Lê corpo de arquivo
  --verdict VERDICT        PASS|CHANGES_REQUIRED|BLOCKED|NOT_APPLICABLE
  --evidence KIND:REF      Repetível
  --thread-id ID           Agrupa debate/collab/vote
  --reply-to ID            messageId pai
  --vote-options A,B       Opções para type=vote
  --vote-deadline ISO      Prazo ISO-8601
  --decision-subject TEXT  Assunto (type=decision)
  --decision-options A,B   Opções (min 2)
  --decision-chosen TEXT   Escolha
  --decision-rationale TEXT Rationale
  --decision-reversible    Decisão reversível (flag)
  --hire-id UUID           Hire id (type=hire)
  --hire-target SLUG       Persona/worker contratado
  --hire-reason TEXT       Motivo do hire
  --hire-level A|B|C       Nível do contratante
  --dismiss-id UUID        Hire id (type=dismiss)
  --dismiss-target SLUG    Persona/worker dispensado
  --dismiss-rejected       Dismiss como rejeição CTO (flag)
  --block-reason TEXT      Motivo (type=block|unblock)
  --block-until ISO        Prazo ISO-8601 opcional
  --plan-phase TEXT        Fase (type=plan)
  --plan-steps A,B,C       Passos separados por vírgula
  --policy-id TEXT         Id da política (type=policy)
  --policy-scope TEXT      Escopo da política
  --json PATH              Mensagem JSON completa
  --diagram TEXT           Fonte Mermaid (campo diagram)
  --diagram-file PATH      Lê fonte Mermaid de arquivo
  --mirror-taskboard       Espelha resumo na issue

Read options:
  --issue ANX-N  --gate G1  --type TYPE  --role ROLE  --since ISO  --limit N  --json

Conversation options:
  --issue ANX-N  --thread ID  --lines N  --format markdown

Docs: .cursor/orchestration/PERSONAS.md · INTERACTIONS.md
`);
  process.exit(exitCode);
}

function parseEvidenceArgs(argv) {
  const evidence = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] !== "--evidence") continue;
    const raw = argv[++i];
    const sep = raw.indexOf(":");
    if (sep <= 0) throw new Error(`--evidence must be kind:ref (got ${raw})`);
    evidence.push({ kind: raw.slice(0, sep), ref: raw.slice(sep + 1) });
  }
  return evidence;
}

function buildAgentFrom(opts) {
  if (opts.fromPersona) {
    const p = getPersona(opts.fromPersona);
    return {
      agentId: opts.fromId ?? `${p.slug}-local`,
      role: p.role,
      name: p.fullName,
      persona: personaRef(p.slug),
    };
  }
  return {
    agentId: opts.fromId ?? `${opts.fromRole}-local`,
    role: opts.fromRole,
    name: opts.fromName,
  };
}

function buildAgentTo(opts) {
  if (!opts.toPersona && !opts.toMention && !opts.toRole) return undefined;
  /** @type {Record<string, unknown>} */
  const to = {};
  if (opts.toMention) to.mention = opts.toMention;
  if (opts.toRole) to.role = opts.toRole;
  if (opts.toPersona) {
    const p = getPersona(opts.toPersona);
    to.persona = personaRef(p.slug);
    if (!to.mention) to.mention = `@${p.shortName.toLowerCase()}`;
    if (!to.role) to.role = p.role;
  }
  return to;
}

function parsePostArgs(argv) {
  const opts = {
    fromPersona: null,
    toPersona: null,
    fromRole: process.env.DIALOGUE_FROM_ROLE ?? "executor",
    fromName: process.env.DIALOGUE_FROM_NAME ?? "Executor",
    fromId: process.env.DIALOGUE_FROM_ID ?? null,
    toMention: null,
    toRole: null,
    issueId: null,
    gate: null,
    type: "status",
    body: null,
    bodyFile: null,
    verdict: null,
    replyTo: null,
    threadId: null,
    jsonPath: null,
    mirrorTaskboard: false,
    voteOptions: null,
    voteDeadline: null,
    decisionSubject: null,
    decisionOptions: null,
    decisionChosen: null,
    decisionRationale: null,
    decisionReversible: false,
    hireId: null,
    hireTarget: null,
    hireReason: null,
    hireLevel: null,
    dismissId: null,
    dismissTarget: null,
    dismissRejected: false,
    blockReason: null,
    blockUntil: null,
    planPhase: null,
    planSteps: null,
    policyId: null,
    policyScope: null,
    diagram: null,
    diagramFile: null,
    evidence: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--from-persona") opts.fromPersona = argv[++i];
    else if (a === "--to-persona") opts.toPersona = argv[++i];
    else if (a === "--from-role") opts.fromRole = argv[++i];
    else if (a === "--from-name") opts.fromName = argv[++i];
    else if (a === "--from-id") opts.fromId = argv[++i];
    else if (a === "--to-mention") opts.toMention = argv[++i];
    else if (a === "--to-role") opts.toRole = argv[++i];
    else if (a === "--issue") opts.issueId = argv[++i];
    else if (a === "--gate") opts.gate = argv[++i];
    else if (a === "--type") opts.type = argv[++i];
    else if (a === "--body") opts.body = argv[++i];
    else if (a === "--body-file") opts.bodyFile = argv[++i];
    else if (a === "--verdict") opts.verdict = argv[++i];
    else if (a === "--reply-to") opts.replyTo = argv[++i];
    else if (a === "--thread-id") opts.threadId = argv[++i];
    else if (a === "--vote-options") opts.voteOptions = argv[++i].split(",");
    else if (a === "--vote-deadline") opts.voteDeadline = argv[++i];
    else if (a === "--decision-subject") opts.decisionSubject = argv[++i];
    else if (a === "--decision-options") opts.decisionOptions = argv[++i].split(",");
    else if (a === "--decision-chosen") opts.decisionChosen = argv[++i];
    else if (a === "--decision-rationale") opts.decisionRationale = argv[++i];
    else if (a === "--decision-reversible") opts.decisionReversible = true;
    else if (a === "--hire-id") opts.hireId = argv[++i];
    else if (a === "--hire-target") opts.hireTarget = argv[++i];
    else if (a === "--hire-reason") opts.hireReason = argv[++i];
    else if (a === "--hire-level") opts.hireLevel = argv[++i];
    else if (a === "--dismiss-id") opts.dismissId = argv[++i];
    else if (a === "--dismiss-target") opts.dismissTarget = argv[++i];
    else if (a === "--dismiss-rejected") opts.dismissRejected = true;
    else if (a === "--block-reason") opts.blockReason = argv[++i];
    else if (a === "--block-until") opts.blockUntil = argv[++i];
    else if (a === "--plan-phase") opts.planPhase = argv[++i];
    else if (a === "--plan-steps") opts.planSteps = argv[++i].split(",");
    else if (a === "--policy-id") opts.policyId = argv[++i];
    else if (a === "--policy-scope") opts.policyScope = argv[++i];
    else if (a === "--json") opts.jsonPath = argv[++i];
    else if (a === "--diagram") opts.diagram = argv[++i];
    else if (a === "--diagram-file") opts.diagramFile = argv[++i];
    else if (a === "--mirror-taskboard") opts.mirrorTaskboard = true;
    else if (a === "--evidence") i += 1;
    else throw new Error(`Unknown post option: ${a}`);
  }

  opts.evidence = parseEvidenceArgs(argv);
  return opts;
}

function parseReadArgs(argv) {
  const opts = {
    issueId: null,
    gate: null,
    type: null,
    role: null,
    since: null,
    limit: null,
    asJson: false,
    newestFirst: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--issue") opts.issueId = argv[++i];
    else if (a === "--gate") opts.gate = argv[++i];
    else if (a === "--type") opts.type = argv[++i];
    else if (a === "--role") opts.role = argv[++i];
    else if (a === "--since") opts.since = argv[++i];
    else if (a === "--limit") opts.limit = Number(argv[++i]);
    else if (a === "--json") opts.asJson = true;
    else if (a === "--newest-first") opts.newestFirst = true;
    else throw new Error(`Unknown read option: ${a}`);
  }

  return opts;
}

function mirrorToTaskboard(message) {
  if (!message.issueId) {
    throw new Error("--mirror-taskboard requires --issue ANX-N");
  }
  if (!taskctl) {
    throw new Error("taskctl not found; cannot mirror to taskboard");
  }

  const gate = message.gate ? ` · ${message.gate}` : "";
  const verdict = message.verdict ? ` · **${message.verdict}**` : "";
  const mention = message.to?.mention ? ` ${message.to.mention}` : "";
  const summary = `[dialogue] **${message.from.name}** (${message.type})${mention}${gate}${verdict}

${message.body}

_ref: \`${message.id}\`_`;

  const threadId =
    process.env.CURSOR_THREAD_ID ??
    process.env.CODEX_THREAD_ID ??
    process.env.CLAUDE_CODE_SESSION_ID;

  const args = ["comment", "add", message.issueId, "--body", summary];
  if (threadId) args.push("--thread-id", threadId);

  execFileSync(taskctl, args, { cwd: root, encoding: "utf8" });
}


function warnComplianceEvidence(message) {
  const complianceTypes = new Set(["handoff", "verdict", "hire", "dismiss", "decision"]);
  if (!complianceTypes.has(message.type)) return;

  const evidence = message.evidence ?? [];
  const hasComplianceEvidence = evidence.some((entry) => {
    const ref = String(entry.ref ?? "").toLowerCase();
    const kind = String(entry.kind ?? "").toLowerCase();
    if (kind === "command" || kind === "issue" || kind === "pr") return true;
    return ref.includes("agents.md") || ref.includes("brain/");
  });

  if (!hasComplianceEvidence) {
    console.error(
      "[compliance warning] handoff/verdict/hire/dismiss/decision sem --evidence rastreável — ver .cursor/orchestration/COMPLIANCE.md"
    );
  }
}

function cmdPost(argv) {
  const opts = parsePostArgs(argv);
  let message;

  if (opts.jsonPath) {
    const raw = JSON.parse(readFileSync(opts.jsonPath, "utf8"));
    message = parseDialogueMessage(raw);
  } else {
    let body = opts.body;
    if (opts.bodyFile) {
      body = readFileSync(opts.bodyFile, "utf8").trimEnd();
    }
    if (!body) {
      throw new Error("post requires --body, --body-file, or --json");
    }

    const from = buildAgentFrom(opts);
    if (!AGENT_ROLES.includes(from.role)) {
      throw new Error(`Invalid role. Allowed: ${AGENT_ROLES.join(", ")}`);
    }
    if (opts.gate && !GATE_IDS.includes(opts.gate)) {
      throw new Error(`Invalid --gate. Allowed: ${GATE_IDS.join(", ")}`);
    }
    if (!MESSAGE_TYPES.includes(opts.type)) {
      throw new Error(`Invalid --type. Allowed: ${MESSAGE_TYPES.join(", ")}`);
    }
    if (opts.verdict && !VERDICTS.includes(opts.verdict)) {
      throw new Error(`Invalid --verdict. Allowed: ${VERDICTS.join(", ")}`);
    }

    let vote = null;
    if (opts.type === "vote") {
      if (!opts.voteOptions || opts.voteOptions.length < 2) {
        throw new Error("type=vote requires --vote-options A,B (min 2)");
      }
      vote = {
        options: opts.voteOptions.map((o) => o.trim()),
        votes: [],
        deadline: opts.voteDeadline ?? undefined,
      };
    }

    let decision = null;
    if (opts.type === "decision") {
      if (!opts.decisionSubject || !opts.decisionOptions || opts.decisionOptions.length < 2) {
        throw new Error("type=decision requires --decision-subject and --decision-options A,B");
      }
      if (!opts.decisionChosen || !opts.decisionRationale) {
        throw new Error("type=decision requires --decision-chosen and --decision-rationale");
      }
      decision = {
        subject: opts.decisionSubject,
        options: opts.decisionOptions.map((o) => o.trim()),
        chosen: opts.decisionChosen,
        rationale: opts.decisionRationale,
        reversible: opts.decisionReversible,
      };
    }

    let hire = null;
    if (opts.type === "hire") {
      if (!opts.hireId || !opts.hireTarget || !opts.hireReason || !opts.hireLevel) {
        throw new Error("type=hire requires --hire-id, --hire-target, --hire-reason, --hire-level A|B|C");
      }
      if (!["A", "B", "C"].includes(opts.hireLevel)) {
        throw new Error("--hire-level must be A, B, or C");
      }
      hire = {
        hireId: opts.hireId,
        target: opts.hireTarget,
        reason: opts.hireReason,
        hiredByLevel: opts.hireLevel,
      };
    }

    let dismiss = null;
    if (opts.type === "dismiss") {
      if (!opts.dismissId || !opts.dismissTarget) {
        throw new Error("type=dismiss requires --dismiss-id and --dismiss-target");
      }
      dismiss = {
        hireId: opts.dismissId,
        target: opts.dismissTarget,
        rejected: opts.dismissRejected,
      };
    }

    let block = null;
    if (opts.type === "block" || opts.type === "unblock") {
      if (!opts.blockReason) {
        throw new Error("type=block|unblock requires --block-reason");
      }
      block = {
        reason: opts.blockReason,
        blockedUntil: opts.blockUntil ?? undefined,
      };
    }

    let plan = null;
    if (opts.type === "plan") {
      if (!opts.planPhase || !opts.planSteps || opts.planSteps.length < 1) {
        throw new Error("type=plan requires --plan-phase and --plan-steps A,B,...");
      }
      plan = {
        phase: opts.planPhase,
        steps: opts.planSteps.map((s) => s.trim()),
      };
    }

    let policy = null;
    if (opts.type === "policy") {
      if (!opts.policyId || !opts.policyScope) {
        throw new Error("type=policy requires --policy-id and --policy-scope");
      }
      policy = {
        policyId: opts.policyId,
        scope: opts.policyScope,
      };
    }

    let diagram = opts.diagram;
    if (opts.diagramFile) {
      diagram = readFileSync(opts.diagramFile, "utf8").trimEnd();
    }

    message = createDialogueMessage({
      from,
      to: buildAgentTo(opts),
      issueId: opts.issueId,
      gate: opts.gate,
      type: opts.type,
      body,
      evidence: opts.evidence,
      verdict: opts.verdict,
      replyTo: opts.replyTo,
      threadId: opts.threadId,
      vote,
      decision,
      hire,
      dismiss,
      block,
      plan,
      policy,
      diagram,
    });
  }

  warnComplianceEvidence(message);

  const saved = appendDialogueMessage(message);
  touchSessionFromDialogue(saved);
  writePendingChatDisplay(saved.issueId ?? null, saved.id);

  if (process.stdout.isTTY || process.env.DIALOGUE_TERMINAL === "1") {
    console.log(formatDialogueTerminalOneliner(saved));
  } else {
    console.log(formatDialogueMessages([saved], "text"));
  }

  if (opts.mirrorTaskboard) {
    mirrorToTaskboard(saved);
    console.error(`(espelhado em ${saved.issueId} via taskctl)`);
  }

  return saved;
}

function cmdRead(argv) {
  const opts = parseReadArgs(argv);
  const messages = readDialogueMessages({
    issueId: opts.issueId ?? undefined,
    gate: opts.gate ?? undefined,
    type: opts.type ?? undefined,
    role: opts.role ?? undefined,
    since: opts.since ?? undefined,
    limit: opts.limit ?? undefined,
    newestFirst: opts.newestFirst,
  });
  console.log(formatDialogueMessages(messages, opts.asJson ? "json" : "text"));
}

function cmdTail(argv) {
  let lines = 20;
  if (argv[0] === "--lines" && argv[1]) {
    lines = Number(argv[1]);
  }
  const messages = readDialogueMessages({ limit: lines, newestFirst: false });
  console.log(formatDialogueMessages(messages, "text"));
}

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd || cmd === "--help" || cmd === "-h" || cmd === "help") usage(0);

const resolvedCmd = cmd.startsWith("--") ? "post" : cmd;
const resolvedRest = cmd.startsWith("--") ? [cmd, ...rest] : rest;

try {
  switch (resolvedCmd) {
    case "post":
      cmdPost(resolvedRest);
      break;
    case "read":
      cmdRead(rest);
      break;
    case "tail":
      cmdTail(rest);
      break;
    case "conversation":
      cmdConversation(rest);
      break;
    case "path":
      console.log(getDialogueLogPath());
      break;
    default:
      usage(1);
  }
} catch (err) {
  console.error(`dialogue error: ${err.message}`);
  process.exit(1);
}
