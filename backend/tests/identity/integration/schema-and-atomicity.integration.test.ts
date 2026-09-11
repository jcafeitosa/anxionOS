import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import {
	createIdentityDb,
	ensureIdentitySchema,
	registerPrincipal,
	suspendPrincipal,
} from "@anxionos/identity";
import {
	getDatabaseUrl,
	shouldRunPgIntegrationTests,
} from "../../api/test-support";

const skipReason = shouldRunPgIntegrationTests()
	? null
	: "RUN_PG_INTEGRATION_TESTS != true (PostgreSQL offline)";

const TRUNCATE_SQL = `TRUNCATE domain_journal, outbox, inbox, dead_letter_queue,
	identity_sessions, identity_service_credentials, identity_service_identities,
	identity_principals, identity_command_journal RESTART IDENTITY CASCADE`;

/**
 * Harness de integração do identity: aplica o **migrator Drizzle real**
 * (`ensureIdentitySchema`), não o DDL de conveniência dos testes de API — é
 * justamente a migração `0001` que precisa ser provada contra PostgreSQL.
 */
async function withIdentityPgHarness<T>(
	work: (ctx: { pool: ReturnType<typeof createPgPool> }) => Promise<T>,
): Promise<T | undefined> {
	const url = getDatabaseUrl();
	if (!shouldRunPgIntegrationTests() || !url) {
		return undefined;
	}
	const pool = createPgPool(url);
	try {
		await ensureEventingSchema(pool);
		await ensureIdentitySchema(pool);
		await pool.query(TRUNCATE_SQL);
		return await work({ pool });
	} finally {
		await pool.end();
	}
}

describe("identity schema — migrator real contra PostgreSQL", () => {
	test.skipIf(Boolean(skipReason))(
		"ensureIdentitySchema é idempotente e cria as tabelas do módulo",
		async () => {
			await withIdentityPgHarness(async ({ pool }) => {
				// segunda aplicação: o journal do drizzle não deve reexecutar nada
				await ensureIdentitySchema(pool);

				const tables = await pool.query<{ table_name: string }>(
					`SELECT table_name FROM information_schema.tables
					 WHERE table_schema = 'public' AND table_name LIKE 'identity_%'
					 ORDER BY table_name`,
				);
				const names = tables.rows.map((row) => row.table_name);
				expect(names).toContain("identity_principals");
				expect(names).toContain("identity_sessions");
				expect(names).toContain("identity_service_credentials");
				expect(names).toContain("identity_command_journal");
			});
		},
	);

	test.skipIf(Boolean(skipReason))(
		"o enum aceita REVOKED e auth_user_id é nulo para service principals",
		async () => {
			await withIdentityPgHarness(async ({ pool }) => {
				const labels = await pool.query<{ enumlabel: string }>(
					`SELECT e.enumlabel FROM pg_enum e
					 JOIN pg_type t ON t.oid = e.enumtypid
					 WHERE t.typname = 'identity_principal_status'
					 ORDER BY e.enumsortorder`,
				);
				expect(labels.rows.map((row) => row.enumlabel)).toEqual([
					"active",
					"suspended",
					"revoked",
				]);

				const column = await pool.query<{ is_nullable: string }>(
					`SELECT is_nullable FROM information_schema.columns
					 WHERE table_name = 'identity_principals' AND column_name = 'auth_user_id'`,
				);
				expect(column.rows[0]?.is_nullable).toBe("YES");
			});
		},
	);

	test.skipIf(Boolean(skipReason))(
		"registerPrincipal grava estado, journal do domínio e outbox na MESMA transação",
		async () => {
			await withIdentityPgHarness(async ({ pool }) => {
				const db = createIdentityDb(pool);
				const principal = await registerPrincipal(
					{ repository: db.repository, unitOfWork: db.unitOfWork },
					{ authUserId: `auth-${randomUUID()}`, email: "pg@example.com" },
				);

				const stored = await pool.query<{ status: string; revision: number }>(
					"SELECT status, revision FROM identity_principals WHERE id = $1",
					[principal.id],
				);
				expect(stored.rows[0]).toMatchObject({ status: "active", revision: 1 });

				const journal = await pool.query<{ event_type: string }>(
					"SELECT event_type FROM domain_journal WHERE owner_domain = 'identity'",
				);
				expect(journal.rows.map((row) => row.event_type)).toContain(
					"identity.principal.registered.v1",
				);
				const outbox = await pool.query<{ status: string }>(
					"SELECT status FROM outbox WHERE owner_domain = 'identity'",
				);
				expect(outbox.rows[0]?.status).toBe("pending");
			});
		},
	);

	test.skipIf(Boolean(skipReason))(
		"comando que falha não deixa journal nem outbox (rollback atômico)",
		async () => {
			await withIdentityPgHarness(async ({ pool }) => {
				const db = createIdentityDb(pool);
				const deps = {
					repository: db.repository,
					unitOfWork: db.unitOfWork,
				};
				const authUserId = `auth-${randomUUID()}`;
				await registerPrincipal(deps, {
					authUserId,
					email: "first@example.com",
				});
				const before = await pool.query<{ count: string }>(
					"SELECT COUNT(*)::text AS count FROM outbox",
				);

				// e-mail já usado por outro principal: falha dentro da transação
				await expect(
					registerPrincipal(deps, {
						authUserId: `auth-${randomUUID()}`,
						email: "first@example.com",
					}),
				).rejects.toMatchObject({ identityCode: "IDN_PRINCIPAL_EMAIL_TAKEN" });

				const after = await pool.query<{ count: string }>(
					"SELECT COUNT(*)::text AS count FROM outbox",
				);
				expect(after.rows[0]?.count).toBe(before.rows[0]?.count);
			});
		},
	);

	test.skipIf(Boolean(skipReason))(
		"commandId concorrente: uma linha de journal e nenhum estado parcial",
		async () => {
			await withIdentityPgHarness(async ({ pool }) => {
				const db = createIdentityDb(pool);
				const deps = {
					repository: db.repository,
					unitOfWork: db.unitOfWork,
				};
				const principal = await registerPrincipal(deps, {
					authUserId: `auth-${randomUUID()}`,
					email: "race@example.com",
				});
				const commandId = randomUUID();

				const results = await Promise.allSettled(
					Array.from({ length: 2 }, () =>
						suspendPrincipal(deps, {
							principalId: principal.id,
							reasonCode: "ops.manual",
							commandId,
						}),
					),
				);

				// Um vencedor aplica; o outro executa o MESMO commandId e deve
				// receber replay (mesmo principal suspenso), não lost-update.
				// Se os dois tentarem inserir no journal exatamente juntos, o
				// perdedor recebe IDN_DUPLICATE_IDEMPOTENCY — nunca estado parcial.
				for (const settled of results) {
					if (settled.status === "fulfilled") {
						expect(settled.value.id).toBe(principal.id);
						expect(settled.value.status).toBe("suspended");
						continue;
					}
					expect(settled.reason).toMatchObject({
						identityCode: "IDN_DUPLICATE_IDEMPOTENCY",
					});
				}
				expect(results.some((settled) => settled.status === "fulfilled")).toBe(
					true,
				);

				const journal = await pool.query<{ count: string }>(
					"SELECT COUNT(*)::text AS count FROM identity_command_journal WHERE command_id = $1",
					[commandId],
				);
				expect(journal.rows[0]?.count).toBe("1");

				const principalRow = await pool.query<{
					status: string;
					revision: number;
				}>("SELECT status, revision FROM identity_principals WHERE id = $1", [
					principal.id,
				]);
				expect(principalRow.rows[0]?.status).toBe("suspended");
				// uma única transição: revision 1 -> 2 (sem dupla aplicação)
				expect(principalRow.rows[0]?.revision).toBe(2);
			});
		},
	);
});
