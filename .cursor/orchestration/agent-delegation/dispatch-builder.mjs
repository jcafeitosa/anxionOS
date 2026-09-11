/**
 * Constrói prompts Task completos para subagentes Cursor (estilo Grok Bot teammate).
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getPersona } from "../agent-dialogue/personas.mjs";
import { EXECUTOR_CRITIC_PAIR } from "../agent-hire/levels.mjs";
import { DISPATCH_MARKER } from "./dispatch-queue.mjs";

const orchestrationRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readTemplateSnippet(relPath, maxLines = 40) {
  try {
    const content = readFileSync(join(orchestrationRoot, relPath), "utf8");
    return content.split("\n").slice(0, maxLines).join("\n");
  } catch {
    return "";
  }
}

/**
 * @param {object} dispatch — item da fila
 * @param {object} [extras]
 * @returns {string}
 */
export function buildTaskPrompt(dispatch, extras = {}) {
  const p = getPersona(dispatch.persona);
  const criticSlug = EXECUTOR_CRITIC_PAIR[dispatch.persona] ?? null;
  const critic = criticSlug ? getPersona(criticSlug) : null;

  const deliverables =
    dispatch.deliverables ??
    extras.deliverables ??
    "Implementar escopo da issue com evidências verificáveis (comandos, paths, testes).";
  const constraints =
    dispatch.constraints ??
    extras.constraints ??
    "Sem mocks em produção; sem TODO sem ANX-*; compliance integral.";

  return `## Pacote de delegação — ${dispatch.issueId} (Grok-style teammate)

Você é **${p.fullName}** (\`${dispatch.persona}\`) — teammate autônomo com acesso total ao Cursor:
shell, MCPs, skills, Task filhos, browser/playwright, graphify, serena, open-knowledge.

### Identidade
- Persona: ${p.fullName} · ${p.role} · ${p.team}
- Issue: **${dispatch.issueId}** (claim \`in_progress\` obrigatório)
- Contratado por: \`${dispatch.hiredBy}\`
- Motivo: ${dispatch.reason}
- Evidência: ${dispatch.evidence || "hire/delegação"}

### Gates obrigatórios (abortar se falhar)
\`\`\`bash
npm run taskboard:ensure || exit 1
npm run orchestration:session -- start --persona ${dispatch.persona} --issue ${dispatch.issueId}
npm run orchestration:compliance -- --pre-work --scope ${dispatch.scope ?? "auto"} --issue ${dispatch.issueId} --persona ${dispatch.persona}
npm run orchestration:broadcast -- --from-persona ${dispatch.persona} --type ack --issue ${dispatch.issueId} --body "ack delegação ${dispatch.id}" --evidence "command:dispatch-queue"
\`\`\`

### Recursos Cursor (usar TODOS quando aplicável)
| Recurso | Quando |
| --- | --- |
| **Shell** | testes, lint, build — nunca describe-only |
| **graphify query** | antes de Grep/Glob/Read em massa |
| **serena MCP** | edições estruturais de símbolos |
| **open-knowledge MCP** | qualquer path \`brain/\` |
| **WebSearch / context7** | fatos externos e docs de libs |
| **Playwright / Chrome DevTools MCP** | após mudanças \`frontend/\` |
| **code-review-graph MCP** | impacto e review G2 |
| **Supermemory** | \`workspaceRoot\` absoluto do repo |
| **Task** | sub-tarefas não triviais (incluir SUBAGENT-DELEGATION-PACKAGE) |

### Skills (ler SKILL.md antes de agir)
- manage-taskboard · orchestrate-work · karpathy-guidelines (sempre)
- test-driven-development (implementação) · systematic-debugging (bugs)
- verification-before-completion (antes de handoff)

### Coordenação de equipe (estilo Grok Bot)
${critic ? `- Crítico pareado: **${critic.fullName}** (\`${criticSlug}\`) — mesma issue, ack no dialogue\n- @mention ${critic.shortName} para challenge/review antes de handoff G1` : "- Coordenar com orquestrador via @Renata no dialogue"}
- Publicar \`status\` a cada >10min de trabalho ativo
- Handoff final: \`npm run orchestration:broadcast -- --from-persona ${dispatch.persona} --type handoff --issue ${dispatch.issueId} --body "..." --evidence "..."\`
- Ao concluir: \`npm run orchestration:dispatch -- mark-done --id ${dispatch.id} --evidence "..."\`

### Entregar
${deliverables}

### Não fazer
${constraints}

### Chat Cursor (obrigatório)
Responder ao parent **somente** com blocos persona (\`---\`); mínimo 2 personas em implementação.
Cada bloco → \`orchestration:speak\` ou \`broadcast\` com \`--issue ${dispatch.issueId}\`.
Proibido voz "Assistant" genérica.

### Referência tooling
${readTemplateSnippet("templates/SUBAGENT-PROMPT-TOOLING.md", 25)}

Dispatch ID: \`${dispatch.id}\` · subagent_type: \`${dispatch.subagentType}\`
`;
}

/**
 * @param {object[]} items
 * @returns {string}
 */
export function formatDispatchInjectBlock(items) {
  if (!items.length) return "";

  const lines = [
    `<!-- ${DISPATCH_MARKER}: spawn Task subagents NOW -->`,
    "",
    "## Teammates pendentes (Grok Bot → Cursor Task)",
    "",
    "O orquestrador **DEVE** invocar a ferramenta `Task` para cada item abaixo **neste turno**.",
    "Use `run_in_background: true` quando `parallel` estiver indicado.",
    "",
  ];

  for (const [idx, item] of items.entries()) {
    const bg = item.runInBackground ? "sim (paralelo)" : "não";
    lines.push(`### ${idx + 1}. ${item.personaName} → \`${item.subagentType}\` · ${item.issueId}`);
    lines.push("");
    lines.push(`| Campo | Valor |`);
    lines.push(`| --- | --- |`);
    lines.push(`| **Task.subagent_type** | \`${item.subagentType}\` |`);
    lines.push(`| **run_in_background** | ${bg} |`);
    lines.push(`| **dispatch_id** | \`${item.id}\` |`);
    lines.push(`| **Motivo** | ${item.reason} |`);
    lines.push("");
    lines.push("<details><summary>Prompt completo (copiar no Task)</summary>");
    lines.push("");
    lines.push("```markdown");
    lines.push(buildTaskPrompt(item));
    lines.push("```");
    lines.push("");
    lines.push("</details>");
    lines.push("");
    lines.push("Após spawn: `npm run orchestration:dispatch -- mark-dispatched --id " + item.id + "`");
    lines.push("");
  }

  lines.push("Monitor: `npm run orchestration:delegate-monitor -- list`");
  lines.push(`<!-- END ${DISPATCH_MARKER} -->`);

  return lines.join("\n");
}

/**
 * Plano JSON para o parent invocar Task em lote (Multitask Mode).
 * @param {object[]} items
 * @returns {object}
 */
export function buildSpawnPlan(items) {
  const tasks = items.map((item) => ({
    dispatchId: item.id,
    persona: item.persona,
    personaName: item.personaName,
    issueId: item.issueId,
    subagent_type: item.subagentType,
    run_in_background: item.runInBackground !== false,
    description: `${item.persona} · ${item.issueId}`,
    prompt: buildTaskPrompt(item),
    afterSpawn: `npm run orchestration:dispatch -- mark-dispatched --id ${item.id}`,
    onComplete: `npm run orchestration:dispatch -- mark-done --id ${item.id} --evidence "..."`,
  }));

  return {
    marker: DISPATCH_MARKER,
    generatedAt: new Date().toISOString(),
    instruction:
      "Invocar ferramenta Task para cada entrada em tasks (paralelo quando run_in_background=true).",
    tasks,
  };
}
