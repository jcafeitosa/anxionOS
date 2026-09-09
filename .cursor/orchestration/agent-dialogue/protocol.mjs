/**
 * Esquema e validação de mensagens de diálogo entre agentes.
 * Validação via Zod (backend/packages/contracts).
 */

import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIssueIdRegex, formatIssueIdError } from "../agent-config/load-config.mjs";

const require = createRequire(import.meta.url);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const { z } = require(join(repoRoot, "backend/packages/contracts/node_modules/zod"));

/** @typedef {"executor"|"critic"|"orchestrator"|"code-review"|"qa"|"security"|"red-team"|"github"|"docs"} AgentRole */

/** @typedef {"G0"|"G1"|"G2"|"G3"|"G4"|"G5"|"G6"|"G7"|null} GateId */

/** @typedef {"debate"|"collab"|"share"|"research"|"consult"|"vote"|"handoff"|"challenge"|"response"|"verdict"|"status"|"question"|"ack"|"escalate"|"pair"|"review"|"approve"|"decision"|"hire"|"dismiss"|"block"|"unblock"|"plan"|"policy"} MessageType */

/** @typedef {"PASS"|"CHANGES_REQUIRED"|"BLOCKED"|"NOT_APPLICABLE"|null} Verdict */

/** @typedef {"file"|"command"|"issue"|"pr"} EvidenceKind */

/**
 * @typedef {Object} AgentRef
 * @property {string} agentId
 * @property {AgentRole} role
 * @property {string} name
 */

/**
 * @typedef {Object} ToRef
 * @property {string} [agentId]
 * @property {AgentRole} [role]
 * @property {string} [mention]
 */

/**
 * @typedef {Object} EvidenceRef
 * @property {EvidenceKind} kind
 * @property {string} ref
 */

/**
 * @typedef {Object} DialogueMessage
 * @property {string} id
 * @property {string} timestamp
 * @property {AgentRef} from
 * @property {ToRef} [to]
 * @property {string} [issueId]
 * @property {GateId} [gate]
 * @property {MessageType} type
 * @property {string} body
 * @property {EvidenceRef[]} [evidence]
 * @property {Verdict} [verdict]
 * @property {string} [threadId]
 * @property {string} [replyTo]
 * @property {string} [correlationId]
 * @property {string} [runId]
 * @property {DecisionRecord|null} [decision]
 * @property {HireRecord|null} [hire]
 * @property {DismissRecord|null} [dismiss]
 * @property {BlockRecord|null} [block]
 * @property {PlanRecord|null} [plan]
 * @property {PolicyRecord|null} [policy]
 * @property {string|null} [diagram] Mermaid source (optional visual)
 */

/**
 * @typedef {Object} DecisionRecord
 * @property {string} subject
 * @property {string[]} options
 * @property {string} chosen
 * @property {string} rationale
 * @property {boolean} reversible
 */

/**
 * @typedef {Object} HireRecord
 * @property {string} hireId
 * @property {string} target
 * @property {string} reason
 * @property {"A"|"B"|"C"} hiredByLevel
 */

/**
 * @typedef {Object} DismissRecord
 * @property {string} hireId
 * @property {string} target
 * @property {boolean} rejected
 */

/**
 * @typedef {Object} BlockRecord
 * @property {string} reason
 * @property {string} [blockedUntil]
 */

/**
 * @typedef {Object} PlanRecord
 * @property {string} phase
 * @property {string[]} steps
 */

/**
 * @typedef {Object} PolicyRecord
 * @property {string} policyId
 * @property {string} scope
 */

export const AGENT_ROLES = [
  "executor",
  "critic",
  "orchestrator",
  "code-review",
  "qa",
  "security",
  "red-team",
  "github",
  "docs",
  "researcher",
  "architect",
];

export const GATE_IDS = ["G0", "G1", "G2", "G3", "G4", "G5", "G6", "G7"];

export const MESSAGE_TYPES = [
  "debate",
  "collab",
  "share",
  "research",
  "consult",
  "vote",
  "handoff",
  "challenge",
  "response",
  "verdict",
  "status",
  "question",
  "ack",
  "escalate",
  "pair",
  "review",
  "approve",
  "decision",
  "hire",
  "dismiss",
  "block",
  "unblock",
  "plan",
  "policy",
];

export const VERDICTS = [
  "PASS",
  "CHANGES_REQUIRED",
  "BLOCKED",
  "NOT_APPLICABLE",
];

export const EVIDENCE_KINDS = ["file", "command", "issue", "pr"];

/** PREFIX-<number> for real issues; PREFIX-VALIDATION|TEST for smoke tests. */
const ISSUE_ID_RE = buildIssueIdRegex();

const personaSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  team: z.string().min(1),
});

const agentRefSchema = z.object({
  agentId: z.string().min(1),
  role: z.enum(AGENT_ROLES),
  name: z.string().min(1),
  persona: personaSchema.optional(),
});

const toRefSchema = z
  .object({
    agentId: z.string().min(1).optional(),
    role: z.enum(AGENT_ROLES).optional(),
    mention: z.string().min(1).optional(),
    persona: personaSchema.optional(),
  })
  .optional();

const evidenceSchema = z.object({
  kind: z.enum(EVIDENCE_KINDS),
  ref: z.string().min(1),
});

const voteEntrySchema = z.object({
  persona: z.string().min(1),
  option: z.string().min(1),
  timestamp: z.string().datetime().optional(),
});

const voteSchema = z
  .object({
    options: z.array(z.string().min(1)).min(2),
    votes: z.array(voteEntrySchema).default([]),
    deadline: z.string().datetime().optional(),
  })
  .optional()
  .nullable();

const decisionSchema = z
  .object({
    subject: z.string().min(1),
    options: z.array(z.string().min(1)).min(2),
    chosen: z.string().min(1),
    rationale: z.string().min(1),
    reversible: z.boolean(),
  })
  .optional()
  .nullable();

const hireSchema = z
  .object({
    hireId: z.string().uuid(),
    target: z.string().min(1),
    reason: z.string().min(1),
    hiredByLevel: z.enum(["A", "B", "C"]),
  })
  .optional()
  .nullable();

const dismissSchema = z
  .object({
    hireId: z.string().uuid(),
    target: z.string().min(1),
    rejected: z.boolean().default(false),
  })
  .optional()
  .nullable();

const blockSchema = z
  .object({
    reason: z.string().min(1),
    blockedUntil: z.string().datetime().optional(),
  })
  .optional()
  .nullable();

const planSchema = z
  .object({
    phase: z.string().min(1),
    steps: z.array(z.string().min(1)).min(1),
  })
  .optional()
  .nullable();

const policySchema = z
  .object({
    policyId: z.string().min(1),
    scope: z.string().min(1),
  })
  .optional()
  .nullable();

export const dialogueMessageSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  from: agentRefSchema,
  to: toRefSchema,
  issueId: z
    .string()
    .regex(ISSUE_ID_RE, formatIssueIdError())
    .nullable()
    .optional(),
  gate: z.enum(GATE_IDS).nullable().optional(),
  type: z.enum(MESSAGE_TYPES),
  body: z.string().min(1),
  evidence: z.array(evidenceSchema).optional().default([]),
  verdict: z.enum(VERDICTS).nullable().optional(),
  threadId: z.string().min(1).nullable().optional(),
  replyTo: z.string().uuid().nullable().optional(),
  correlationId: z.string().min(1).nullable().optional(),
  runId: z.string().min(1).nullable().optional(),
  vote: voteSchema,
  decision: decisionSchema,
  hire: hireSchema,
  dismiss: dismissSchema,
  block: blockSchema,
  plan: planSchema,
  policy: policySchema,
  diagram: z.string().min(1).nullable().optional(),
});

/**
 * @param {unknown} raw
 * @returns {z.infer<typeof dialogueMessageSchema>}
 */
export function parseDialogueMessage(raw) {
  const result = dialogueMessageSchema.safeParse(raw);
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(msg);
  }
  return result.data;
}

/**
 * @param {Partial<DialogueMessage> & Pick<DialogueMessage, "from"|"type"|"body">} input
 * @returns {DialogueMessage}
 */
export function createDialogueMessage(input) {
  const message = {
    id: input.id ?? randomUUID(),
    timestamp: input.timestamp ?? new Date().toISOString(),
    from: input.from,
    to: input.to,
    issueId: input.issueId ?? null,
    gate: input.gate ?? null,
    type: input.type,
    body: input.body,
    evidence: input.evidence ?? [],
    verdict: input.verdict ?? null,
    threadId: input.threadId ?? process.env.CURSOR_THREAD_ID ?? process.env.CODEX_THREAD_ID ?? null,
    replyTo: input.replyTo ?? null,
    correlationId: input.correlationId ?? null,
    runId: input.runId ?? null,
    vote: input.vote ?? null,
    decision: input.decision ?? null,
    hire: input.hire ?? null,
    dismiss: input.dismiss ?? null,
    block: input.block ?? null,
    plan: input.plan ?? null,
    policy: input.policy ?? null,
    diagram: input.diagram ?? null,
  };
  return parseDialogueMessage(message);
}

/**
 * Formato legível para stdout (estilo thread Google eng).
 * @param {DialogueMessage} msg
 */
export function formatDialogueMessage(msg) {
  const gate = msg.gate ? ` · ${msg.gate}` : "";
  const issue = msg.issueId ? ` · ${msg.issueId}` : "";
  const mention = msg.to?.mention ? ` → ${msg.to.mention}` : "";
  const verdict = msg.verdict ? ` [${msg.verdict}]` : "";
  const personaTeam = msg.from.persona ? ` · ${msg.from.persona.team}` : "";
  const header = `${msg.from.name} (${msg.from.role})${personaTeam}${mention}${issue}${gate}${verdict}`;
  const evidence =
    msg.evidence?.length > 0
      ? `\n  evidência: ${msg.evidence.map((e) => `${e.kind}:${e.ref}`).join(", ")}`
      : "";
  const voteInfo =
    msg.type === "vote" && msg.vote?.options?.length
      ? `\n  voto: ${msg.vote.options.join(" | ")}`
      : "";
  const decisionInfo =
    msg.type === "decision" && msg.decision
      ? `\n  decisão: ${msg.decision.chosen} ← [${msg.decision.options.join(" | ")}] · reversível=${msg.decision.reversible}`
      : "";
  const hireInfo =
    msg.type === "hire" && msg.hire
      ? `\n  hire: ${msg.hire.target} · Level ${msg.hire.hiredByLevel} · id=${msg.hire.hireId}`
      : "";
  const dismissInfo =
    msg.type === "dismiss" && msg.dismiss
      ? `\n  dismiss: ${msg.dismiss.target} · id=${msg.dismiss.hireId} · rejected=${msg.dismiss.rejected}`
      : "";
  const blockInfo =
    (msg.type === "block" || msg.type === "unblock") && msg.block
      ? `\n  block: ${msg.block.reason}${msg.block.blockedUntil ? ` · até ${msg.block.blockedUntil}` : ""}`
      : "";
  const planInfo =
    msg.type === "plan" && msg.plan
      ? `\n  plano: ${msg.plan.phase} · ${msg.plan.steps.length} passos`
      : "";
  const policyInfo =
    msg.type === "policy" && msg.policy
      ? `\n  política: ${msg.policy.policyId} · escopo=${msg.policy.scope}`
      : "";
  const diagramInfo = msg.diagram
    ? `\n  diagrama:\n${msg.diagram.replace(/\n/g, "\n  ")}`
    : "";
  return `[${msg.timestamp}] ${header}\n  ${msg.body.replace(/\n/g, "\n  ")}${evidence}${voteInfo}${decisionInfo}${hireInfo}${dismissInfo}${blockInfo}${planInfo}${policyInfo}${diagramInfo}\n  id=${msg.id}`;
}

export const MESSAGE_SCHEMA_EXAMPLE = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  timestamp: "2026-09-09T12:00:00.000Z",
  from: {
    agentId: "backend-executor-local",
    role: "executor",
    name: "Lucas Mendes",
    persona: { name: "Lucas Mendes", role: "backend-executor", team: "execution" },
  },
  to: {
    mention: "@marina",
    role: "critic",
    persona: { name: "Marina Ferreira", role: "backend-critic", team: "quality" },
  },
  issueId: "ANX-134",
  gate: "G1",
  type: "handoff",
  body: "@marina, candidato r2 pronto. Critérios C1–C3 no pacote.",
  evidence: [{ kind: "command", ref: "bun test backend/tests/identity.test.ts" }],
  verdict: null,
  threadId: "ANX-134-g1",
  vote: null,
};
