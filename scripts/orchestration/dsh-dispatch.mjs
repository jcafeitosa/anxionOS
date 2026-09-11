#!/usr/bin/env node
/**
 * dsh-dispatch — adapta o spawn-plan do framework de orquestração (Cursor)
 * para despachos executáveis no DeepSeek Harness.
 *
 * O framework decide quem/quando/gate (`orchestration:dispatch spawn-plan --json`);
 * este adaptador reescreve o prompt para as ferramentas que existem no DSH e
 * emite o payload que o agente pai passa para `subagent`.
 *
 * Uso:
 *   node scripts/orchestration/dsh-dispatch.mjs --issue ANX-457 [--format markdown|json]
 *   node scripts/orchestration/dsh-dispatch.mjs --input /tmp/spawn-plan.json --persona backend-critic
 *   node scripts/orchestration/dsh-dispatch.mjs --issue ANX-457 --model backend-critic=anthropic/claude-sonnet-4.5@high
 *   node scripts/orchestration/dsh-dispatch.mjs --issue ANX-457 --check-lock
 *
 * Exit codes: 0 ok · 1 erro de uso/execução · 3 lock em conflito de outra thread
 *             · 4 lock-check indisponível (não foi possível verificar).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Ferramentas que existem no DSH. Substitui o bloco "Recursos Cursor". */
const DSH_TOOLING_BLOCK = `### Tooling DSH (use; não descreva)
- Shell (bash): rode lint/tsc/testes de verdade — proibido "execute X" sem executar
- read / grep / glob / edit / write para arquivos; web_search / web_fetch para fatos externos (cite URL)
- subagent / workflow apenas se o seu escopo exigir fan-out
- NÃO existem aqui: Cursor Task, MCPs (serena, code-review-graph, playwright, supermemory, context7)
- Pacote de delegação completo: skill \`dsh-subagent-delegation\``;

/** Seções do prompt Cursor que não se aplicam ao DSH. */
const DROPPED_SECTIONS = [
	/^#{2,3}\s+Recursos Cursor/i,
	/^#{2,3}\s+Skills\b/i,
	/^#{2,3}\s+Chat Cursor/i,
	/^#{2,3}\s+Voz da persona/i,
	/^#{2,3}\s+Q&A hierárquico/i,
	/^#{2,3}\s+Parent agent/i,
	/^#{2,3}\s+Participação nativa no chat Cursor/i,
	/^#{2,3}\s+Referência tooling/i,
	/^#{2,3}\s+Bloco capacidades completas/i,
	/^#{2,3}\s+Capacidades completas do agente/i,
	/^#{1,3}\s+Template\s+—\s+bloco tooling/i,
];

/**
 * Marcadores de linha que só existem no runtime Cursor. A checagem exige
 * contexto de ferramenta (MCP, API do Cursor, convenção de chat) para não
 * apagar conteúdo legítimo — `npx playwright test` é dependência real do repo.
 */
const CURSOR_TOOLING_LINE =
	/(\bMCPs?\b|GetDynamicTools|CallDynamicTool|orchestration:speak|Chat Cursor|\bTask filhos\b|supermemory|context7)/i;
const KEEP_LINE = /NÃO existem aqui/i;

/** Placeholder de evidência do framework: inválido para o dialogue (`cmd:` idem). */
const EVIDENCE_PLACEHOLDER = /--evidence\s+"\.\.\."/g;
const EVIDENCE_CMD_KIND = /--evidence\s+"cmd:/g;
const FALLBACK_EVIDENCE = '--evidence "command:<preencher>"';

const CURSOR_INTRO = /^.*teammate autônomo com acesso total ao Cursor.*$/im;
const DSH_INTRO =
	"Autônomo, com acesso a shell, arquivos e subagentes do DeepSeek Harness:";

/** `spawn-plan` corta em 5 por padrão; pedimos um teto alto e avisamos se bater. */
const PLAN_LIMIT = 200;

function usage(exitCode = 0) {
	console.log(`dsh-dispatch — spawn-plan (framework) → despachos DSH

Opções:
  --issue ANX-N[,ANX-M]     filtra por issue (recomendado; evita despachar trabalho de outra sessão)
  --persona SLUG            filtra por persona
  --input PATH              lê o spawn-plan de arquivo em vez de executar o framework
  --format markdown|json    saída (default: markdown)
  --model SLUG=provider/model[@effort]   fixa a rota do subagente para um papel (repetível)
  --check-lock              verifica o lock de cada issue; exit 3 em conflito, 4 se não verificável
  --json                    atalho para --format json
  --help

Sem --issue, o script consulta a fila global (cap de ${PLAN_LIMIT} por consulta) e emite
TODOS os pendentes — inclusive de outras conversas. Em workspace com sessões
paralelas isso é risco real: prefira sempre --issue.
`);
	process.exit(exitCode);
}

function parseArgs(argv) {
	const options = {
		issues: [],
		persona: null,
		input: null,
		format: "markdown",
		models: new Map(),
		checkLock: false,
	};
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		switch (arg) {
			case "--issue":
			case "--issues": {
				const value = argv[++index];
				if (!value) throw new Error("--issue requires a value");
				options.issues.push(
					...value
						.split(",")
						.map((item) => item.trim().toUpperCase())
						.filter(Boolean),
				);
				break;
			}
			case "--persona":
				options.persona = argv[++index];
				break;
			case "--input":
				options.input = argv[++index];
				break;
			case "--format":
				options.format = argv[++index];
				break;
			case "--model": {
				const value = argv[++index] ?? "";
				const separator = value.indexOf("=");
				if (separator <= 0) {
					throw new Error("--model requires SLUG=provider/model[@effort]");
				}
				const slug = value.slice(0, separator);
				const route = value.slice(separator + 1);
				const [target, effort] = route.split("@");
				// Model ids may contain `/` (e.g. openrouter/meta/llama): split the
				// provider on the FIRST slash only.
				const slash = (target ?? "").indexOf("/");
				if (slash <= 0 || slash === (target ?? "").length - 1) {
					throw new Error("--model requires provider/model");
				}
				options.models.set(slug, {
					provider: target.slice(0, slash),
					model: target.slice(slash + 1),
					effort: effort || undefined,
				});
				break;
			}
			case "--check-lock":
				options.checkLock = true;
				break;
			case "--json":
				options.format = "json";
				break;
			case "--help":
			case "-h":
				usage(0);
				break;
			default:
				throw new Error(`Unknown option: ${arg}`);
		}
	}
	if (!["markdown", "json"].includes(options.format)) {
		throw new Error(`Unsupported --format: ${options.format}`);
	}
	return options;
}

function loadSpawnPlan(inputPath, issues) {
	if (inputPath) {
		const raw = readFileSync(resolve(inputPath), "utf8");
		return JSON.parse(raw.slice(raw.indexOf("{")));
	}
	const call = (extraArgs) => {
		const raw = execFileSync(
			"npm",
			[
				"run",
				"--silent",
				"orchestration:dispatch",
				"--",
				"spawn-plan",
				...extraArgs,
				"--limit",
				String(PLAN_LIMIT),
				"--json",
			],
			{ encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
		);
		return JSON.parse(raw.slice(raw.indexOf("{")));
	};
	// O plano é limitado: consultar por issue evita que o item pedido fique fora
	// da janela (foi um bug real do adaptador).
	if (issues.length === 0) {
		return call([]);
	}
	const seen = new Set();
	const tasks = [];
	for (const issue of issues) {
		for (const task of call(["--issue", issue]).tasks ?? []) {
			if (seen.has(task.dispatchId)) continue;
			seen.add(task.dispatchId);
			tasks.push(task);
		}
	}
	return { tasks };
}

/** Delimitador de fence markdown: ``` ou ~~~, com o comprimento da abertura. */
function fenceDelimiter(line) {
	const match = line.match(/^\s*(`{3,}|~{3,})/);
	return match ? { char: match[1][0], length: match[1].length } : null;
}

/**
 * Remove a fence externa quando o prompt chega embrulhado nela pelo
 * `dispatch inject` (`<details>` + ```markdown). Sem isso, todo header fica
 * "dentro de fence" e o corte por seção nunca acontece.
 */
function unwrapOuterFence(prompt) {
	const lines = prompt.split("\n");
	let start = 0;
	while (start < lines.length && lines[start].trim() === "") start += 1;
	let end = lines.length - 1;
	while (end > start && lines[end].trim() === "") end -= 1;
	const opening = start < lines.length ? fenceDelimiter(lines[start]) : null;
	const closing = end > start ? fenceDelimiter(lines[end]) : null;
	if (
		!opening ||
		!closing ||
		opening.char !== closing.char ||
		closing.length < opening.length
	) {
		return prompt;
	}
	return lines.slice(start + 1, end).join("\n");
}

function normalizeEvidence(value) {
	if (typeof value !== "string") return value;
	return value
		.replace(EVIDENCE_CMD_KIND, '--evidence "command:')
		.replace(EVIDENCE_PLACEHOLDER, FALLBACK_EVIDENCE);
}

/**
 * Reescreve o prompt Cursor removendo acoplamentos e anexando o tooling DSH.
 * Fences são rastreadas por delimitador (abertura/fechamento do mesmo tipo,
 * fechamento com comprimento >= abertura) e headers só contam fora de fence.
 */
function adaptPrompt(prompt) {
	const out = [];
	let dropping = false;
	let fence = null;
	for (const line of unwrapOuterFence(prompt).split("\n")) {
		const delimiter = fenceDelimiter(line);
		if (delimiter) {
			if (fence === null) {
				fence = delimiter;
			} else if (
				delimiter.char === fence.char &&
				delimiter.length >= fence.length
			) {
				fence = null;
			}
			if (dropping) continue;
			out.push(line);
			continue;
		}
		if (fence === null && /^#{1,3}\s+/.test(line)) {
			dropping = DROPPED_SECTIONS.some((pattern) => pattern.test(line));
		}
		if (dropping) continue;
		if (/subagent_type/i.test(line)) {
			const cleaned = line
				.replace(/\s*[·|,-]?\s*subagent_type:.*$/i, "")
				.trim();
			if (cleaned) out.push(cleaned);
			continue;
		}
		if (CURSOR_TOOLING_LINE.test(line) && !KEEP_LINE.test(line)) continue;
		out.push(line);
	}

	const scrubbed = out
		.join("\n")
		.replace(CURSOR_INTRO, DSH_INTRO)
		.replace(/\n{3,}/g, "\n\n")
		.trimEnd();

	// O framework emite `--evidence "cmd:..."` no próprio prompt, mas o dialogue
	// só aceita file|command|issue|pr: sem normalizar, o ack de todo dispatch falha.
	return `${normalizeEvidence(scrubbed)}\n\n${DSH_TOOLING_BLOCK}\n`;
}

function checkLock(issueId) {
	try {
		const raw = execFileSync(
			"npm",
			[
				"run",
				"--silent",
				"orchestration:coordination",
				"--",
				"status",
				"--issue",
				issueId,
			],
			{ encoding: "utf8", stderr: "ignore" },
		);
		const line = raw
			.split("\n")
			.map((item) => item.trim())
			.find((item) => item.startsWith(issueId));
		if (!line) {
			return { issueId, status: "unknown", detail: "sem linha de status" };
		}
		if (line.includes("CONFLICT")) {
			return { issueId, status: "conflict", detail: line };
		}
		return { issueId, status: "ok", detail: line };
	} catch (error) {
		return {
			issueId,
			status: "error",
			detail: error instanceof Error ? error.message : String(error),
		};
	}
}

function toDispatch(task, options) {
	const route = options.models.get(task.persona);
	return {
		dispatchId: task.dispatchId,
		persona: task.persona,
		personaName: task.personaName,
		issueId: task.issueId,
		description: task.description,
		run_in_background: task.run_in_background ?? true,
		legacySubagentType: task.subagent_type ?? null,
		route: route ?? null,
		prompt: adaptPrompt(task.prompt ?? ""),
		afterSpawn: task.afterSpawn ?? null,
		onComplete: task.onComplete
			? normalizeEvidence(task.onComplete)
			: null,
		missingBookkeeping: !task.afterSpawn || !task.onComplete,
	};
}

function renderMarkdown(dispatches, locks) {
	const blocks = dispatches.map((dispatch) => {
		const lock = locks?.get(dispatch.issueId);
		const lockWarning =
			lock && lock.status !== "ok"
				? `\n> ⚠️ LOCK ${lock.status.toUpperCase()}: ${lock.detail}\n`
				: "";
		const route = dispatch.route
			? `${dispatch.route.provider}/${dispatch.route.model}${
					dispatch.route.effort ? `@${dispatch.route.effort}` : ""
				}`
			: "herdar do agente pai";
		const bookkeeping = dispatch.missingBookkeeping
			? "\n> ⚠️ bookkeeping ausente no plano (afterSpawn/onComplete): registre manualmente.\n"
			: `\n\`\`\`bash
# após despachar
${dispatch.afterSpawn}
# ao receber o parecer
${dispatch.onComplete}
\`\`\``;
		return `## ${dispatch.persona} · ${dispatch.issueId}
${lockWarning}
- dispatchId: \`${dispatch.dispatchId}\`
- descrição: ${dispatch.description}
- background: ${dispatch.run_in_background}
- rota: ${route}${dispatch.legacySubagentType ? ` (Cursor: ${dispatch.legacySubagentType})` : ""}
${bookkeeping}

### prompt

\`\`\`text
${dispatch.prompt}
\`\`\``;
	});
	return blocks.join("\n\n---\n\n");
}

/** Exit code do lock-check: 0 ok, 3 conflito, 4 indeterminado. */
function lockExitCode(locks) {
	if (!locks) return 0;
	const statuses = [...locks.values()].map((entry) => entry.status);
	if (statuses.includes("conflict")) return 3;
	if (statuses.some((status) => status !== "ok")) return 4;
	return 0;
}

function main() {
	const options = parseArgs(process.argv.slice(2));
	const plan = loadSpawnPlan(options.input, options.issues);
	const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
	if (tasks.length === 0) {
		console.error("spawn-plan vazio — nada a despachar.");
		process.exit(0);
	}
	if (tasks.length >= PLAN_LIMIT) {
		console.error(
			`AVISO: o plano bateu o cap de ${PLAN_LIMIT} tarefas; pode haver pendentes não listados.`,
		);
	}
	if (options.issues.length === 0 && !options.persona) {
		console.error(
			"AVISO: sem --issue/--persona, todos os despachos pendentes serão emitidos (inclusive de outras conversas).",
		);
	}
	const filtered = tasks.filter((task) => {
		if (options.issues.length > 0 && !options.issues.includes(task.issueId)) {
			return false;
		}
		if (options.persona && task.persona !== options.persona) return false;
		return true;
	});
	if (filtered.length === 0) {
		const seen = [...new Set(tasks.map((task) => task.issueId))].join(", ");
		console.error(
			`Nenhum despacho para ${options.issues.join(", ") || options.persona || "(filtro vazio)"}.`,
		);
		console.error(
			`Plano consultado tinha ${tasks.length} tarefa(s): ${seen || "(nenhuma)"}.`,
		);
		process.exit(0);
	}

	let locks = null;
	if (options.checkLock) {
		locks = new Map(
			[...new Set(filtered.map((task) => task.issueId))].map((issueId) => [
				issueId,
				checkLock(issueId),
			]),
		);
		for (const entry of locks.values()) {
			if (entry.status === "ok") continue;
			console.error(
				`AVISO LOCK [${entry.status}] ${entry.issueId}: ${entry.detail}`,
			);
		}
	}

	const dispatches = filtered.map((task) => toDispatch(task, options));
	if (options.format === "json") {
		console.log(
			JSON.stringify(
				{
					generatedAt: new Date().toISOString(),
					locks: locks ? [...locks.values()] : null,
					dispatches,
				},
				null,
				2,
			),
		);
		process.exit(lockExitCode(locks));
	}
	console.log(renderMarkdown(dispatches, locks));
	process.exit(lockExitCode(locks));
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}
