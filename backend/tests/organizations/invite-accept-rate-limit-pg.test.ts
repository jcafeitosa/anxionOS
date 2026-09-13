/**
 * ANX-489 — F4 (janela nova não colapsa concorrentes) e F5 (ROLLBACK não
 * mascara o erro original) no `PostgresInviteAcceptRateLimitStore`.
 *
 * Parte 1 é integração com PostgreSQL real (gated por `RUN_PG_INTEGRATION_TESTS`,
 * como os demais harnesses do repo): N concorrentes num IP virgem têm de
 * produzir rejeições coerentes com o limite declarado (10/min), nunca
 * `count = 1` com N aceitos.
 *
 * Parte 2 é unidade: o ROLLBACK best-effort no catch nunca substitui o erro
 * original pelo do rollback.
 */
import { describe, expect, test } from "bun:test";
import { createPgPool } from "@anxionos/eventing/postgres";
import type { Pool } from "pg";
import {
	ensureInviteAcceptRateLimitSchema,
	INVITE_ACCEPT_LIMIT,
	PostgresInviteAcceptRateLimitStore,
} from "../../apps/api/src/organizations/invite-accept-rate-limit-store";
import { truncateDomainTables } from "../pg-harness-guard";
import { getDatabaseUrl, shouldRunPgIntegrationTests } from "./test-support";

const TRUNCATE_SQL =
	"TRUNCATE api_invite_accept_rate_limits RESTART IDENTITY CASCADE";

async function withPgHarness(
	work: (pool: Pool) => Promise<void>,
): Promise<void> {
	if (!shouldRunPgIntegrationTests()) {
		return;
	}
	const url = getDatabaseUrl();
	if (!url) {
		return;
	}
	const pool = createPgPool(url);
	try {
		await ensureInviteAcceptRateLimitSchema(pool);
		await truncateDomainTables(pool, TRUNCATE_SQL);
		await work(pool);
	} finally {
		await pool.end();
	}
}

describe("ANX-489 F4 — abertura de janela com concorrencia (PG real)", () => {
	test("N concorrentes em IP virgem: rejeicoes coerentes com o limite, nunca count=1 com N aceitos", async () => {
		await withPgHarness(async (pool) => {
			const store = new PostgresInviteAcceptRateLimitStore(pool);
			const ip = "203.0.113.99";
			const attempts = INVITE_ACCEPT_LIMIT * 2; // 20
			const results = await Promise.all(
				Array.from({ length: attempts }, () =>
					store
						.assertWithinLimit(ip)
						.then(() => "ok")
						.catch(
							(error: Error & { code?: string }) => error.code ?? error.name,
						),
				),
			);
			const accepted = results.filter((r) => r === "ok").length;
			const rejected = results.filter((r) => r === "RATE_LIMITED").length;
			expect(accepted).toBe(INVITE_ACCEPT_LIMIT);
			expect(rejected).toBe(INVITE_ACCEPT_LIMIT);
			const row = await pool.query<{ count: number }>(
				"SELECT count FROM api_invite_accept_rate_limits WHERE client_ip = $1",
				[ip],
			);
			expect(Number(row.rows[0]?.count)).toBe(INVITE_ACCEPT_LIMIT);
		});
	});
});

describe("ANX-489 F5 — rollback best-effort nao mascara o erro original", () => {
	test("ROLLBACK com falha registra e relanca o erro ORIGINAL", async () => {
		const originalError = new Error("dominio/429 original");
		const rollbackError = new Error("connection broken");
		let loggedCause: unknown;
		const fakeClient = {
			async query(sql: string) {
				if (sql !== "ROLLBACK") {
					throw originalError;
				}
				throw rollbackError;
			},
			release() {},
		};
		const fakePool = {
			query: async () => ({ rows: [] }),
			connect: async () => fakeClient,
		};
		// Captura o log do logger antes de executar.
		const originalLog = console.log;
		console.log = (line: unknown) => {
			const text = String(line);
			if (text.includes("rollback failed")) {
				loggedCause = JSON.parse(text).cause ?? text;
			}
			originalLog(line);
		};
		try {
			const store = new PostgresInviteAcceptRateLimitStore(fakePool as never);
			let thrown: unknown;
			try {
				await store.assertWithinLimit("203.0.113.7");
			} catch (error) {
				thrown = error;
			}
			expect(thrown).toBe(originalError);
		} finally {
			console.log = originalLog;
		}
		expect(loggedCause).toEqual({
			name: "Error",
			message: "connection broken",
		});
	});
});
