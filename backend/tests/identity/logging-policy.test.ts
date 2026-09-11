import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Oráculo `G4-IDN-02` do R09 ("logs sem email em clear") + a regra de
 * tolerância zero do AGENTS.md ("`console.log`/`debugger` deixados no commit").
 *
 * Verifica os DOIS lados do boundary: o módulo (`modules/identity/src`) e o
 * composition root (`apps/api/src/identity`, onde vive o consumer de revogação
 * de sessão). A asserção é estrutural: extrai cada chamada de log inteira —
 * inclusive payload multilinha — e recusa PII/material de credencial dentro
 * dela. Um teste linha-a-linha não pegaria payload quebrado em várias linhas.
 */

const ROOTS = ["modules/identity/src", "apps/api/src/identity"] as const;
const FORBIDDEN_IN_LOG_PAYLOAD = [
	"email",
	"authUserId",
	"auth_user_id",
	"secret",
	"token",
	"password",
	"hash",
	"cookie",
] as const;

function sourceFiles(dir: string): string[] {
	const entries = readdirSync(dir);
	const files: string[] = [];
	for (const entry of entries) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			files.push(...sourceFiles(full));
			continue;
		}
		if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
			files.push(full);
		}
	}
	return files;
}

/** Recorta de `logger.info(` até o `)` que fecha a chamada. */
function logStatements(source: string): string[] {
	const statements: string[] = [];
	const marker = /logger\s*\.\s*(?:info|warn|error|debug)\s*\(/g;
	for (const match of source.matchAll(marker)) {
		const start = match.index ?? 0;
		let depth = 0;
		let index = start + match[0].length - 1;
		for (; index < source.length; index += 1) {
			const char = source[index];
			if (char === "(") depth += 1;
			else if (char === ")") {
				depth -= 1;
				if (depth === 0) break;
			}
		}
		statements.push(source.slice(start, index + 1));
	}
	return statements;
}

describe("identity logging policy (R09 G4-IDN-02)", () => {
	test("nenhum log carrega email, credencial ou token", () => {
		const offences: string[] = [];
		for (const root of ROOTS) {
			for (const file of sourceFiles(root)) {
				for (const statement of logStatements(readFileSync(file, "utf8"))) {
					for (const forbidden of FORBIDDEN_IN_LOG_PAYLOAD) {
						if (statement.toLowerCase().includes(forbidden.toLowerCase())) {
							offences.push(`${relative(".", file)}: ${forbidden}`);
						}
					}
				}
			}
		}
		expect(offences).toEqual([]);
	});

	test("nenhum console.* ou debugger na árvore do boundary de identity", () => {
		const offences: string[] = [];
		for (const root of ROOTS) {
			for (const file of sourceFiles(root)) {
				const source = readFileSync(file, "utf8");
				if (
					/\bconsole\s*\.\s*(?:log|debug|info|warn|error)\s*\(/.test(source)
				) {
					offences.push(`${relative(".", file)}: console.*`);
				}
				if (/\bdebugger\b/.test(source)) {
					offences.push(`${relative(".", file)}: debugger`);
				}
			}
		}
		expect(offences).toEqual([]);
	});

	/**
	 * Ancoragem: se as duas asserções acima passarem apenas porque a varredura
	 * não encontrou nenhum arquivo, o teste seria vazio.
	 */
	test("a varredura realmente encontra os arquivos e as chamadas de log", () => {
		const files = ROOTS.flatMap((root) => sourceFiles(root));
		expect(files.length).toBeGreaterThan(10);
		const withLogs = files.filter(
			(file) => logStatements(readFileSync(file, "utf8")).length > 0,
		);
		expect(withLogs.length).toBeGreaterThan(0);
	});
});
