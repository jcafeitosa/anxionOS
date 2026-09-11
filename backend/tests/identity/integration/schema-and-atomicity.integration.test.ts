import { describe, expect, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import {
	createIdentityDb,
	ensureIdentitySchema,
	recordSessionRevoked,
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
 * ANX-464: `externalRefHash` only accepts a real sha256 hex digest — the shape
 * the module itself produces (`hashSessionRef`). Fixtures derive it from the
 * raw reference instead of decorating a literal.
 */
function sessionRefHash(rawRef: string): string {
	return createHash("sha256").update(rawRef, "utf8").digest("hex");
}

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

	/**
	 * Reprodução exata do HIGH do G2: 10 chamadas concorrentes com a MESMA
	 * `Idempotency-Key` produziam `[200,500,500,...]` — `create` sem
	 * `ON CONFLICT` abortava a transação com 23505. O contrato agora é: nenhum
	 * 500, todos os caminhos devolvem o MESMO principal e o journal tem 1 linha.
	 */
	test.skipIf(Boolean(skipReason))(
		"10 registros concorrentes com a mesma Idempotency-Key não devolvem 500",
		async () => {
			await withIdentityPgHarness(async ({ pool }) => {
				const db = createIdentityDb(pool);
				const deps = {
					repository: db.repository,
					unitOfWork: db.unitOfWork,
				};
				const authUserId = `auth-${randomUUID()}`;
				const commandId = randomUUID();

				const settled = await Promise.allSettled(
					Array.from({ length: 10 }, () =>
						registerPrincipal(deps, {
							authUserId,
							email: "same-key@example.com",
							commandId,
						}),
					),
				);

				const rejected = settled.filter(
					(result) => result.status === "rejected",
				) as PromiseRejectedResult[];
				// Nenhuma falha pode ser 23505/erro interno: só conflito de
				// idempotência explícito é aceitável.
				for (const failure of rejected) {
					expect(failure.reason).toMatchObject({
						identityCode: "IDN_DUPLICATE_IDEMPOTENCY",
					});
				}
				const fulfilled = settled.filter(
					(result) => result.status === "fulfilled",
				) as PromiseFulfilledResult<{ id: string }>[];
				expect(fulfilled.length).toBeGreaterThan(0);
				const ids = new Set(fulfilled.map((result) => result.value.id));
				expect(ids.size).toBe(1);

				const principals = await pool.query<{ count: string }>(
					"SELECT COUNT(*)::text AS count FROM identity_principals WHERE auth_user_id = $1",
					[authUserId],
				);
				expect(principals.rows[0]?.count).toBe("1");

				const journal = await pool.query<{ count: string }>(
					"SELECT COUNT(*)::text AS count FROM identity_command_journal WHERE command_id = $1",
					[commandId],
				);
				expect(journal.rows[0]?.count).toBe("1");

				// Um único evento de registro: sem dupla emissão.
				const events = await pool.query<{ count: string }>(
					`SELECT COUNT(*)::text AS count FROM domain_journal
					 WHERE owner_domain = 'identity' AND event_type = 'identity.principal.registered.v1'`,
				);
				expect(events.rows[0]?.count).toBe("1");
			});
		},
	);

	/**
	 * Corrida de e-mail: `authUserId` distintos, mesmo e-mail. O perdedor não
	 * pode virar 500 (23505 cru) nem criar um segundo principal.
	 */
	test.skipIf(Boolean(skipReason))(
		"corrida de e-mail: um vencedor e perdedores com IDN_PRINCIPAL_EMAIL_TAKEN",
		async () => {
			await withIdentityPgHarness(async ({ pool }) => {
				const db = createIdentityDb(pool);
				const deps = {
					repository: db.repository,
					unitOfWork: db.unitOfWork,
				};
				const settled = await Promise.allSettled(
					Array.from({ length: 5 }, (_, index) =>
						registerPrincipal(deps, {
							authUserId: `auth-${index}-${randomUUID()}`,
							email: "collide@example.com",
						}),
					),
				);

				const fulfilled = settled.filter(
					(result) => result.status === "fulfilled",
				);
				expect(fulfilled.length).toBe(1);
				for (const failure of settled.filter(
					(result) => result.status === "rejected",
				) as PromiseRejectedResult[]) {
					expect(failure.reason).toMatchObject({
						identityCode: "IDN_PRINCIPAL_EMAIL_TAKEN",
					});
				}
				const principals = await pool.query<{ count: string }>(
					"SELECT COUNT(*)::text AS count FROM identity_principals WHERE email = $1",
					["collide@example.com"],
				);
				expect(principals.rows[0]?.count).toBe("1");
			});
		},
	);

	/**
	 * MEDIUM do G2: o atalho "já revogada" retornava ANTES da checagem de
	 * intenção, então reusar a key em outro sessionRef já revogado devolvia 200
	 * (replay do agregado errado) em vez de conflito.
	 */
	test.skipIf(Boolean(skipReason))(
		"key reusada em outro sessionRef já revogado é conflito, não replay",
		async () => {
			await withIdentityPgHarness(async ({ pool }) => {
				const db = createIdentityDb(pool);
				const principal = await registerPrincipal(
					{ repository: db.repository, unitOfWork: db.unitOfWork },
					{ authUserId: `auth-${randomUUID()}`, email: "keys@example.com" },
				);
				const deps = {
					principalRepository: db.repository,
					sessionRefRepository: db.sessionRefRepository,
					unitOfWork: db.unitOfWork,
				};
				const firstRef = randomUUID();
				const secondRef = randomUUID();
				const firstKey = randomUUID();

				await recordSessionRevoked(deps, {
					principalId: principal.id,
					sessionRefId: firstRef,
					externalRefHash: sessionRefHash(firstRef),
					commandId: firstKey,
				});
				// segundo agregado já revogado antes do reuso da key
				await recordSessionRevoked(deps, {
					principalId: principal.id,
					sessionRefId: secondRef,
					externalRefHash: sessionRefHash(secondRef),
					commandId: randomUUID(),
				});

				await expect(
					recordSessionRevoked(deps, {
						principalId: principal.id,
						sessionRefId: secondRef,
						externalRefHash: sessionRefHash(secondRef),
						commandId: firstKey,
					}),
				).rejects.toMatchObject({
					identityCode: "IDN_DUPLICATE_IDEMPOTENCY",
				});
			});
		},
	);

	/**
	 * Achado BLOQUEANTE da revalidacao G2: o atalho "ja revogada" nao gravava o
	 * journal. Se a PRIMEIRA usagem da key caisse nele, a key nunca existia no
	 * journal e o reuso posterior escapava da checagem de intencao — a MESMA key
	 * produzia efeito em dois agregados (refX no-op, refZ novo).
	 */
	test.skipIf(Boolean(skipReason))(
		"key usada primeiro em no-op não pode depois aplicar em outro sessionRef",
		async () => {
			await withIdentityPgHarness(async ({ pool }) => {
				const db = createIdentityDb(pool);
				const principal = await registerPrincipal(
					{ repository: db.repository, unitOfWork: db.unitOfWork },
					{ authUserId: `auth-${randomUUID()}`, email: "noop@example.com" },
				);
				const deps = {
					principalRepository: db.repository,
					sessionRefRepository: db.sessionRefRepository,
					unitOfWork: db.unitOfWork,
				};
				const revokedRef = randomUUID();
				const freshRef = randomUUID();

				// ref ja revogada SEM commandId: nada no journal para ela
				await recordSessionRevoked(deps, {
					principalId: principal.id,
					sessionRefId: revokedRef,
					externalRefHash: sessionRefHash(revokedRef),
				});

				const reusableKey = randomUUID();
				// PRIMEIRA usagem da key: cai no atalho de "ja revogada"
				const noop = await recordSessionRevoked(deps, {
					principalId: principal.id,
					sessionRefId: revokedRef,
					commandId: reusableKey,
				});
				expect(noop.transitioned).toBe(false);

				const journal = await pool.query<{ count: string }>(
					"SELECT COUNT(*)::text AS count FROM identity_command_journal WHERE command_id = $1",
					[reusableKey],
				);
				expect(journal.rows[0]?.count).toBe("1");

				// reuso da MESMA key em agregado NOVO tem de ser conflito
				await expect(
					recordSessionRevoked(deps, {
						principalId: principal.id,
						sessionRefId: freshRef,
						externalRefHash: sessionRefHash(freshRef),
						commandId: reusableKey,
					}),
				).rejects.toMatchObject({
					identityCode: "IDN_DUPLICATE_IDEMPOTENCY",
				});

				const untouched = await pool.query<{ status: string }>(
					"SELECT status FROM identity_sessions WHERE id = $1",
					[freshRef],
				);
				expect(untouched.rows[0]).toBeUndefined();
			});
		},
	);
});
