#!/usr/bin/env node
/**
 * Regressões do adaptador DSH (spawn-plan → subagente).
 * Cobre os defeitos encontrados no gate G2 (ANX-458): fence aninhada, prompt
 * embrulhado, `cmd:` inválido, placeholder de evidência, scrub agressivo,
 * task sem bookkeeping, model id com `/`, cap do plano e check-lock.
 *
 * Executar: npm run orchestration:dsh-test
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const SCRIPT = fileURLToPath(
	new URL("../dsh-dispatch.mjs", import.meta.url),
);

function buildTask(overrides = {}) {
	return {
		dispatchId: "11111111-1111-4111-8111-111111111111",
		persona: "backend-critic",
		personaName: "Marina Ferreira",
		issueId: "ANX-457",
		subagent_type: "code-reviewer",
		run_in_background: true,
		description: "backend-critic · ANX-457",
		prompt: "## Pacote de delegação — ANX-457\n\n### Identidade\n- Persona: Marina\n",
		afterSpawn:
			"npm run orchestration:dispatch -- mark-dispatched --id 11111111-1111-4111-8111-111111111111",
		onComplete:
			'npm run orchestration:dispatch -- mark-done --id 11111111-1111-4111-8111-111111111111 --evidence "..."',
		...overrides,
	};
}

function withPlan(tasks) {
	const dir = mkdtempSync(join(tmpdir(), "dsh-dispatch-"));
	const path = join(dir, "plan.json");
	writeFileSync(path, JSON.stringify({ tasks }, null, 2));
	return path;
}

function run(args, { env } = {}) {
	const result = spawnSync(process.execPath, [SCRIPT, ...args], {
		encoding: "utf8",
		env: { ...process.env, ...env },
	});
	return {
		code: result.status ?? 1,
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
	};
}

/** PATH com um `npm` falso, para simular respostas da coordination. */
function npmShim(body) {
	const dir = mkdtempSync(join(tmpdir(), "dsh-npm-"));
	const bin = join(dir, "npm");
	writeFileSync(bin, `#!/bin/sh\n${body}\n`);
	chmodSync(bin, 0o755);
	return dir;
}

test("não vaza seção descartada quando a fence é aninhada", () => {
	const prompt = [
		"## Pacote",
		"",
		"### Recursos Cursor",
		"| **serena MCP** | edições |",
		"````markdown",
		"```bash",
		"echo interno",
		"```",
		"### Cabeçalho interno do template Cursor",
		"conteudo exclusivo do Cursor",
		"````",
		"",
		"### Entregar",
		"implementar escopo",
	].join("\n");
	const plan = withPlan([buildTask({ prompt })]);
	const result = run(["--input", plan, "--issue", "ANX-457", "--format", "json"]);
	assert.equal(result.code, 0, result.stderr);
	const { dispatches } = JSON.parse(result.stdout);
	const adapted = dispatches[0].prompt;
	assert.ok(!adapted.includes("Recursos Cursor"), "seção Cursor vazou");
	assert.ok(!adapted.includes("Cabeçalho interno"), "header interno vazou");
	assert.ok(!adapted.includes("conteudo exclusivo do Cursor"), "corpo vazou");
	assert.ok(!adapted.includes("serena MCP"), "linha de MCP vazou");
	assert.ok(adapted.includes("implementar escopo"), "seção legítima foi perdida");
});

test("remove seções Cursor quando o prompt chega embrulhado em fence", () => {
	const inner = [
		"## Pacote",
		"",
		"### Recursos Cursor",
		"| **graphify query** | antes de Grep |",
		"",
		"### Skills",
		"- karpathy-guidelines · test-driven-development",
		"",
		"### Entregar",
		"implementar escopo",
	].join("\n");
	const plan = withPlan([
		buildTask({ prompt: "```markdown\n" + inner + "\n```" }),
	]);
	const result = run(["--input", plan, "--issue", "ANX-457", "--format", "json"]);
	assert.equal(result.code, 0, result.stderr);
	const adapted = JSON.parse(result.stdout).dispatches[0].prompt;
	assert.ok(!adapted.includes("Recursos Cursor"));
	assert.ok(!adapted.includes("karpathy-guidelines"));
	assert.ok(!adapted.includes("test-driven-development"));
	assert.ok(adapted.includes("implementar escopo"));
});

test("preserva linha legítima que menciona playwright sem MCP", () => {
	const prompt = [
		"## Pacote",
		"",
		"### Entregar",
		"Rodar `npx playwright test` em frontend/e2e",
		"| **Playwright / Chrome DevTools MCP** | após mudanças de UI |",
	].join("\n");
	const plan = withPlan([buildTask({ prompt })]);
	const result = run(["--input", plan, "--issue", "ANX-457", "--format", "json"]);
	const adapted = JSON.parse(result.stdout).dispatches[0].prompt;
	assert.ok(
		adapted.includes("npx playwright test"),
		"comando legítimo foi removido",
	);
	assert.ok(!adapted.includes("Chrome DevTools MCP"), "linha de MCP ficou");
});

test("normaliza evidência cmd: e o placeholder em prompt e onComplete", () => {
	const prompt = [
		"## Pacote",
		"",
		'--evidence "cmd:dispatch-queue"',
	].join("\n");
	const plan = withPlan([buildTask({ prompt })]);
	const result = run(["--input", plan, "--issue", "ANX-457", "--format", "json"]);
	const dispatch = JSON.parse(result.stdout).dispatches[0];
	assert.ok(dispatch.prompt.includes('--evidence "command:dispatch-queue"'));
	assert.ok(!dispatch.prompt.includes('"cmd:'));
	assert.ok(dispatch.onComplete.includes('--evidence "command:<preencher>"'));
	assert.ok(!dispatch.onComplete.includes('--evidence "..."'));
});

test("renderiza markdown sem quebrar quando falta onComplete", () => {
	const plan = withPlan([
		buildTask({ onComplete: undefined, afterSpawn: undefined }),
	]);
	const result = run(["--input", plan, "--issue", "ANX-457"]);
	assert.equal(result.code, 0, result.stderr);
	assert.ok(result.stdout.includes("bookkeeping ausente"));
});

test("aceita model id com barras múltiplas", () => {
	const plan = withPlan([buildTask()]);
	const result = run([
		"--input",
		plan,
		"--issue",
		"ANX-457",
		"--format",
		"json",
		"--model",
		"backend-critic=openrouter/meta/llama@high",
	]);
	assert.equal(result.code, 0, result.stderr);
	const route = JSON.parse(result.stdout).dispatches[0].route;
	assert.deepEqual(route, {
		provider: "openrouter",
		model: "meta/llama",
		effort: "high",
	});
});

test("rejeita --model sem provider/model", () => {
	const plan = withPlan([buildTask()]);
	const result = run(["--input", plan, "--model", "foo=bar"]);
	assert.equal(result.code, 1);
	assert.match(result.stderr, /requires provider\/model/);
});

test("avisa ao bater o cap do plano", () => {
	const tasks = Array.from({ length: 200 }, (_, index) =>
		buildTask({
			dispatchId: `1111111${String(index).padStart(2, "0")}-1111-4111-8111-111111111111`,
		}),
	);
	const plan = withPlan(tasks);
	const result = run(["--input", plan, "--issue", "ANX-457", "--format", "json"]);
	assert.match(result.stderr, /cap de 200/);
});

test("check-lock falha em aberto com exit 4 quando não é verificável", () => {
	const plan = withPlan([buildTask()]);
	const shimDir = npmShim("exit 1");
	const result = run(
		["--input", plan, "--issue", "ANX-457", "--format", "json", "--check-lock"],
		{ env: { PATH: `${shimDir}:${process.env.PATH}` } },
	);
	assert.equal(result.code, 4);
	const payload = JSON.parse(result.stdout);
	assert.equal(payload.locks[0].status, "error");
	assert.match(result.stderr, /AVISO LOCK \[error\]/);
});

test("check-lock reporta conflito de outra thread com exit 3", () => {
	const plan = withPlan([buildTask()]);
	const shimDir = npmShim('echo "ANX-457\tCONFLICT\tlock=other-thread"');
	const result = run(
		["--input", plan, "--issue", "ANX-457", "--format", "json", "--check-lock"],
		{ env: { PATH: `${shimDir}:${process.env.PATH}` } },
	);
	assert.equal(result.code, 3);
	const payload = JSON.parse(result.stdout);
	assert.equal(payload.locks[0].status, "conflict");
	assert.match(result.stderr, /AVISO LOCK \[conflict\]/);
});

test("filtra por persona e informa quando nada casa", () => {
	const plan = withPlan([buildTask()]);
	const miss = run([
		"--input",
		plan,
		"--issue",
		"ANX-457",
		"--persona",
		"qa-lead",
		"--format",
		"json",
	]);
	assert.equal(miss.code, 0);
	assert.match(miss.stderr, /Nenhum despacho para/);
	assert.match(miss.stderr, /Plano consultado tinha 1 tarefa/);

	const hit = run([
		"--input",
		plan,
		"--issue",
		"ANX-457",
		"--persona",
		"backend-critic",
		"--format",
		"json",
	]);
	assert.equal(JSON.parse(hit.stdout).dispatches.length, 1);
});
