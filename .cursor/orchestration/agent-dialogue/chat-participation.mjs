#!/usr/bin/env node
/**
 * Chat Participation — formata bloco de persona para o chat Cursor e publica no dialogue.jsonl.
 *
 * Usage:
 *   npm run orchestration:speak -- --persona backend-executor --body "@marina, boundaries passam." --issue ANX-N
 *   npm run orchestration:speak -- --persona orchestrator --body "@Owner, delego ANX-222." --issue ANX-222 --type ack
 *
 * Flags:
 *   --persona SLUG       Slug canônico (ver personas.mjs list)
 *   --body TEXT          Corpo da mensagem (suporta @mentions)
 *   --issue ANX-N        Issue vinculada (recomendado)
 *   --type TYPE          Tipo dialogue (default: status)
 *   --gate G1            Gate opcional
 *   --to-mention @nome   Destinatário explícito (auto-detecta primeiro @ do body)
 *   --format-only        Só imprime bloco markdown, não publica
 *   --json               Imprime JSON { block, messageId } após publicar
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { writePendingChatDisplay } from "./chat-feed.mjs";
import { appendDialogueMessage } from "./dialogue-log.mjs";
import { getPersona, personaRef, PERSONA_SLUGS } from "./personas.mjs";
import {
  AGENT_ROLES,
  GATE_IDS,
  MESSAGE_TYPES,
  createDialogueMessage,
} from "./protocol.mjs";
import { touchSessionFromDialogue } from "./session-tracker.mjs";

const ROLE_LABELS = {
  orchestrator: "orquestrador",
  executor: "executor",
  critic: "crítica",
  "code-review": "code review",
  qa: "QA",
  security: "security",
  "red-team": "red team",
  github: "GitHub/CI",
  docs: "documentação",
  researcher: "pesquisa",
  architect: "arquiteto",
};

const TEAM_LABELS = {
  leadership: "liderança",
  execution: "execução",
  quality: "qualidade",
  "code-review": "code review",
  qa: "QA",
  security: "security",
  "red-team": "red team",
  github: "github",
  docs: "docs",
  research: "pesquisa",
  architecture: "arquitetura",
};

/**
 * @param {import("./personas.mjs").Persona} persona
 * @param {string} body
 * @returns {string}
 */
export function formatPersonaChatBlock(persona, body) {
  const roleLabel = ROLE_LABELS[persona.role] ?? persona.role;
  const teamLabel = TEAM_LABELS[persona.team] ?? persona.team;
  const slugHint =
    persona.role === "executor" || persona.role === "critic"
      ? ` · ${persona.slug}`
      : "";
  const header = `**${persona.fullName}** · ${roleLabel}${slugHint} · ${teamLabel}`;
  return `---\n${header}\n${body.trim()}\n---`;
}

/**
 * @param {string} body
 * @returns {string | null}
 */
export function extractFirstMention(body) {
  const match = body.match(/@([a-zA-Z0-9_-]+)/);
  return match ? `@${match[1]}` : null;
}

function usage(exitCode = 0) {
  console.log(`anxionOS chat participation (speak)

Usage:
  npm run orchestration:speak -- --persona SLUG --body "TEXT" [--issue ANX-N]

Personas:
  ${PERSONA_SLUGS.join(", ")}

Options:
  --persona SLUG       Obrigatório
  --body TEXT          Obrigatório (ou --body-file PATH)
  --body-file PATH     Lê corpo de arquivo
  --issue ANX-N        Issue vinculada
  --type TYPE          ${MESSAGE_TYPES.join(", ")} (default: status)
  --gate G1            ${GATE_IDS.join(", ")}
  --to-mention @nome   Destinatário (default: primeiro @ do body)
  --format-only        Não publica no dialogue.jsonl
  --json               Saída JSON após bloco markdown

Docs: .cursor/orchestration/CHAT-PARTICIPATION.md
`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const opts = {
    persona: null,
    body: null,
    bodyFile: null,
    issueId: null,
    type: "status",
    gate: null,
    toMention: null,
    formatOnly: false,
    asJson: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--body") opts.body = argv[++i];
    else if (a === "--body-file") opts.bodyFile = argv[++i];
    else if (a === "--issue") opts.issueId = argv[++i];
    else if (a === "--type") opts.type = argv[++i];
    else if (a === "--gate") opts.gate = argv[++i];
    else if (a === "--to-mention") opts.toMention = argv[++i];
    else if (a === "--format-only") opts.formatOnly = true;
    else if (a === "--json") opts.asJson = true;
    else if (a === "--help" || a === "-h") usage(0);
    else throw new Error(`Opção desconhecida: ${a}`);
  }

  return opts;
}

function buildTo(opts, body) {
  const mention = opts.toMention ?? extractFirstMention(body);
  if (!mention) return undefined;
  return { mention };
}

function postToDialogue(persona, opts, body) {
  if (!AGENT_ROLES.includes(persona.role)) {
    throw new Error(`Role inválida para persona ${persona.slug}`);
  }
  if (opts.gate && !GATE_IDS.includes(opts.gate)) {
    throw new Error(`Gate inválido: ${opts.gate}`);
  }
  if (!MESSAGE_TYPES.includes(opts.type)) {
    throw new Error(`Tipo inválido: ${opts.type}`);
  }

  const message = createDialogueMessage({
    from: {
      agentId: `${persona.slug}-chat`,
      role: persona.role,
      name: persona.fullName,
      persona: personaRef(persona.slug),
    },
    to: buildTo(opts, body),
    issueId: opts.issueId,
    gate: opts.gate,
    type: opts.type,
    body,
  });

  const saved = appendDialogueMessage(message);
  touchSessionFromDialogue(saved);
  writePendingChatDisplay(saved.issueId ?? null, saved.id);
  return saved;
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    if (!opts.persona) throw new Error("--persona é obrigatório");

    let body = opts.body;
    if (opts.bodyFile) {
      body = readFileSync(opts.bodyFile, "utf8").trimEnd();
    }
    if (!body) throw new Error("--body ou --body-file é obrigatório");

    const persona = getPersona(opts.persona);
    const block = formatPersonaChatBlock(persona, body);

    let messageId = null;
    if (!opts.formatOnly) {
      const saved = postToDialogue(persona, opts, body);
      messageId = saved.id;
    }

    console.log(block);

    if (opts.asJson) {
      console.log(JSON.stringify({ block, messageId, persona: persona.slug }, null, 2));
    }
  } catch (err) {
    console.error(`speak error: ${err.message}`);
    process.exit(1);
  }
}
