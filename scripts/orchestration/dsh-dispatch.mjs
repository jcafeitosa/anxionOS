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

/** Menções que só existem no runtime Cursor — removidas do prompt final. */
const CURSOR_ONLY_MARKERS = [
	"serena",
	"code-review-graph",
	"supermemory",
	"context7",
	"GetDynamicTools",
	"CallDynamicTool",
	"Chrome DevTools",
	"playwright",
	"orchestration:speak",
	"Chat Cursor",
	"Task filhos",
];

/** Reescreve o intro Cursor ("acesso total ao Cursor: shell, MCPs, ..."). */
const CURSOR_INTRO_PATTERN = /^(.*teammate autônomo com acesso total ao Cursor.*)$/i;
const DSH_INTRO =
	"Autônomo, com acesso a shell, arquivos e subagentes do DeepSeek Harness:";

function isCursorOnlyLine(line) {
	const trimmed = line.trim();
	if (!trimmed) return false;
	if (trimmed.startsWith("NÃO existem aqui")) return false;
	return CURSOR_ONLY_MARKERS.some((marker) =>
		trimmed.toLowerCase().includes(marker.toLowerCase()),
	);
}

/** Reescreve o prompt Cursor removendo acoplamentos e anexando o tooling DSH. */
function adaptPrompt(prompt) {
	const out = [];
	let dropping = false;
	let inFence = false;
	for (const line of prompt.split("\n")) {
		const isFence = /^\s*```/.test(line);
		// Headers dentro de fence pertencem a template embutido: não reativam seções.
		if (!inFence && !isFence && /^#{1,3}\s+/.test(line)) {
			dropping = DROPPED_SECTIONS.some((pattern) => pattern.test(line));
		}
		if (isFence) {
			inFence = !inFence;
		}
		if (dropping) continue;
		if (/subagent_type/i.test(line)) {
			const cleaned = line
				.replace(/\s*[·|,-]?\s*subagent_type:.*$/i, "")
				.trim();
			if (cleaned) out.push(cleaned);
			continue;
		}
		out.push(line);
	}

	const scrubbed = out
		.filter((line) => !isCursorOnlyLine(line))
		.map((line) =>
			CURSOR_INTRO_PATTERN.test(line)
				? line.replace(CURSOR_INTRO_PATTERN, `$1`).replace(/.*/, DSH_INTRO)
				: line,
		)
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trimEnd();

	return `${scrubbed}\n\n${DSH_TOOLING_BLOCK}\n`;
}

function usage(exitCode = 0) {
	const out = `dsh-dispatch — spawn-plan (framework) → despachos DSH

Opções:
  --issue ANX-N[,ANX-M]     filtra por issue (recomendado; evita despachar trabalho de outra sessão)
  --persona SLUG            filtra por persona
  --input PATH              lê o spawn-plan de arquivo em vez de executar o framework
  --format markdown|json    saída (default: markdown)
  --model SLUG=provider/model[@effort]   fixa a rota do subagente para um papel (repetível)
  --check-lock              consulta o lock de cada issue e avisa em conflito de outra thread
  --json                    atalho para --format json
  --help

Sem --issue, o script emite TODOS os despachos pendentes da fila — inclusive de
outras conversas. Rodar assim em workspace com sessões paralelas é risco real.
`;
	console.log(out);
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
				const [slug, route] = value.split("=");
				if (!slug || !route) {
					throw new Error("--model requires SLUG=provider/model[@effort]");
				}
				const [target, effort] = route.split("@");
				const [provider, model] = target.split("/");
				if (!provider || !model) {
					throw new Error("--model requires provider/model");
				}
				options.models.set(slug, { provider, model, effort });
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
				"--json",
			],
			{ encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
		);
		return JSON.parse(raw.slice(raw.indexOf("{")));
	};
	// O plano global é limitado: consultar por issue evita que o item pedido
	// fique fora da janela (foi um bug real do adaptador).
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
			{ encoding: "utf8" },
		);
		const line = raw
			.split("\n")
			.map((item) => item.trim())
			.find((item) => item.startsWith(issueId));
		if (!line) return { issueId, status: "unknown", detail: "sem resposta" };
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
		afterSpawn: task.afterSpawn,
		onComplete: task.onComplete,
	};
}

function renderMarkdown(dispatches, locks) {
	const blocks = dispatches.map((dispatch) => {
		const lockWarning =
			locks?.get(dispatch.issueId)?.status === "conflict"
				? `\n> ⚠️ LOCK CONFLITANTE: ${locks.get(dispatch.issueId).detail}\n`
				: "";
		const route = dispatch.route
			? `${dispatch.route.provider}/${dispatch.route.model}${
					dispatch.route.effort ? `@${dispatch.route.effort}` : ""
				}`
			: "herdar do agente pai";
		return `## ${dispatch.persona} · ${dispatch.issueId}
${lockWarning}
- dispatchId: \`${dispatch.dispatchId}\`
- descrição: ${dispatch.description}
- background: ${dispatch.run_in_background}
- rota: ${route}${dispatch.legacySubagentType ? ` (Cursor: ${dispatch.legacySubagentType})` : ""}

\`\`\`bash
# após despachar
${dispatch.afterSpawn}
# ao receber o parecer
${dispatch.onComplete.replace(/--evidence "\.\.\."/, '--evidence "command:..."')}
\`\`\`

### prompt

\`\`\`text
${dispatch.prompt}
\`\`\``;
	});
	return blocks.join("\n\n---\n\n");
}

function main() {
	const options = parseArgs(process.argv.slice(2));
	const plan = loadSpawnPlan(options.input, options.issues);
	const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
	if (tasks.length === 0) {
		console.error("spawn-plan vazio — nada a despachar.");
		process.exit(0);
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
	}

	const dispatches = filtered.map((task) => toDispatch(task, options));
	if (options.format === "json") {
		console.log(
			JSON.stringify(
				{ generatedAt: new Date().toISOString(), dispatches },
				null,
				2,
			),
		);
		return;
	}
	console.log(renderMarkdown(dispatches, locks));
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}
