#!/usr/bin/env node
/**
 * Standup coordenado — formato Google eng (Feito / Fazendo / Bloqueio).
 *
 * Usage:
 *   npm run orchestration:standup -- --issue ANX-N
 *   npm run orchestration:standup -- --issue ANX-N --personas backend-executor,backend-critic
 *   npm run orchestration:standup -- --issue ANX-N --format-only
 *   npm run orchestration:standup -- --issue ANX-N --post --persona backend-executor --done "..." --doing "..." --blockers "nenhum"
 */

import { formatIssueIdHint, isValidIssueId } from "../agent-config/load-config.mjs";
import { appendDialogueMessage } from "./dialogue-log.mjs";
import { writePendingChatDisplay } from "./chat-feed.mjs";
import { formatPersonaChatBlock } from "./chat-participation.mjs";
import { getPersona, personaRef, PERSONA_SLUGS } from "./personas.mjs";
import { createDialogueMessage } from "./protocol.mjs";
import { touchSessionFromDialogue } from "./session-tracker.mjs";

const DEFAULT_STANDUP_PERSONAS = ["backend-executor", "backend-critic"];

function usage(exitCode = 0) {
  console.log(`orchestration:standup — standup coordenado estilo Google eng

Options:
  --issue ANX-N              Issue obrigatória
  --personas SLUG,SLUG       Personas que reportam (default: ${DEFAULT_STANDUP_PERSONAS.join(",")})
  --format-only              Só imprime template markdown (não publica)
  --post                     Publica no dialogue.jsonl
  --done TEXT                Feito (com --post e --persona)
  --doing TEXT               Fazendo
  --blockers TEXT            Bloqueios (default: nenhum)
  --persona SLUG             Persona do update individual (com --post)
  --help                     Esta ajuda
`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const opts = {
    issue: null,
    personas: DEFAULT_STANDUP_PERSONAS,
    formatOnly: false,
    post: false,
    done: null,
    doing: null,
    blockers: "nenhum",
    persona: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") usage(0);
    if (arg === "--issue") opts.issue = argv[++i];
    else if (arg === "--personas") {
      opts.personas = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    } else if (arg === "--format-only") opts.formatOnly = true;
    else if (arg === "--post") opts.post = true;
    else if (arg === "--done") opts.done = argv[++i];
    else if (arg === "--doing") opts.doing = argv[++i];
    else if (arg === "--blockers") opts.blockers = argv[++i];
    else if (arg === "--persona") opts.persona = argv[++i];
    else {
      console.error(`Argumento desconhecido: ${arg}`);
      usage(1);
    }
  }
  if (!opts.issue) {
    console.error("--issue ANX-N é obrigatório");
    usage(1);
  }
  return opts;
}


function buildFrom(slug) {
  const p = getPersona(slug);
  return {
    agentId: `${p.slug}-standup`,
    role: p.role,
    name: p.fullName,
    persona: personaRef(p.slug),
  };
}

export function formatStandupBody(fields) {
  const done = fields.done ?? "(preencher)";
  const doing = fields.doing ?? "(preencher)";
  const blockers = fields.blockers ?? "nenhum";
  return `**Feito:** ${done}\n**Fazendo:** ${doing}\n**Bloqueio:** ${blockers}`;
}

export function buildStandupTemplate(issueId, personas) {
  const mentions = personas
    .map((slug) => {
      const p = getPersona(slug);
      return p ? `@${p.fullName.split(" ")[0].toLowerCase()}` : `@${slug}`;
    })
    .join(" ");

  const blocks = [];
  const orchestrator = getPersona("orchestrator");
  blocks.push(
    formatPersonaChatBlock(
      orchestrator,
      `@time — **Standup ${issueId}**. ${mentions} — formato Feito/Fazendo/Bloqueio. Respondam com \`status\` no dialogue.`,
    ),
  );

  for (const slug of personas) {
    const p = getPersona(slug);
    if (!p) continue;
    blocks.push(formatPersonaChatBlock(p, formatStandupBody({})));
  }
  return blocks.join("\n\n");
}

export function postStandupUpdate(persona, issueId, fields) {
  const body = formatStandupBody(fields);
  const msg = createDialogueMessage({
    from: buildFrom(persona.slug),
    type: "status",
    issueId,
    body,
    threadId: `${issueId}-standup`,
  });
  appendDialogueMessage(msg);
  touchSessionFromDialogue(msg);
  return msg;
}

export function postStandupOpener(issueId, personas) {
  const orchestrator = getPersona("orchestrator");
  const mentions = personas
    .map((slug) => {
      const p = getPersona(slug);
      return p ? `@${p.fullName.split(" ")[0].toLowerCase()}` : `@${slug}`;
    })
    .join(" ");

  const body = `@time — **Standup ${issueId}**. ${mentions} — reportem Feito/Fazendo/Bloqueio via \`status\`.`;
  const msg = createDialogueMessage({
    from: buildFrom("orchestrator"),
    type: "status",
    issueId,
    body,
    threadId: `${issueId}-standup`,
  });
  appendDialogueMessage(msg);
  touchSessionFromDialogue(msg);
  return msg;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!isValidIssueId(opts.issue, { strict: true })) {
    console.error(`--issue inválido. Use ${formatIssueIdHint()}`);
    process.exit(1);
  }

  for (const slug of opts.personas) {
    if (!PERSONA_SLUGS.includes(slug)) {
      console.error(`Persona desconhecida: ${slug}. Válidas: ${PERSONA_SLUGS.join(", ")}`);
      process.exit(1);
    }
  }

  if (opts.formatOnly || !opts.post) {
    console.log(buildStandupTemplate(opts.issue, opts.personas));
    if (!opts.post) return;
  }

  if (opts.post) {
    const opener = postStandupOpener(opts.issue, opts.personas);
    console.log(`Standup opener publicado: ${opener.id}`);

    if (opts.persona) {
      const p = getPersona(opts.persona);
      if (!p) {
        console.error(`Persona desconhecida: ${opts.persona}`);
        process.exit(1);
      }
      const msg = postStandupUpdate(p, opts.issue, {
        done: opts.done ?? "(não informado)",
        doing: opts.doing ?? "(não informado)",
        blockers: opts.blockers,
      });
      console.log(`Update ${opts.persona}: ${msg.id}`);
    }

    writePendingChatDisplay();
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  main();
}
