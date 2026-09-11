import { describe, expect, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import { PLATFORM_SCOPE_ID } from "@anxionos/contracts/governance";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import {
	createIdentityDb,
	ensureIdentitySchema,
	registerPrincipal,
} from "@anxionos/identity";
import { Elysia } from "elysia";
import { createIdentityPlugin } from "../../../apps/api/src/identity/plugin";
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

/** ANX-464: the column only ever holds the sha256 digest the module produces. */
function sessionRefHash(rawRef: string): string {
	return createHash("sha256").update(rawRef, "utf8").digest("hex");
}

type Pool = ReturnType<typeof createPgPool>;

/**
 * Boundary HTTP REAL (Elysia `app.handle`) sobre os repositorios PostgreSQL
 * reais do identity — a prova exigida pelo ANX-467: o ataque tem de ser
 * recusado com o estado da vitima intacto NO BANCO, pelos tres caminhos de
 * resolucao (id, hash, journal).
 */
async function withIdentityHttpPgHarness<T>(
	work: (ctx: {
		pool: Pool;
		app: Elysia;
		db: ReturnType<typeof createIdentityDb>;
		authHeader: (authUserId: string) => Record<string, string>;
	}) => Promise<T>,
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
		const db = createIdentityDb(pool);
		const app = new Elysia().use(
			createIdentityPlugin({
				auth: {
					api: {
						async getSession({ headers }) {
							const authUserId = headers.get("x-test-auth");
							return authUserId ? { user: { id: authUserId } } : null;
						},
					},
				},
				identityRepository: db.repository,
				sessionRefRepository: db.sessionRefRepository,
				identityUnitOfWork: db.unitOfWork,
				// O caso de admin legitimo (aceite 4) exige autoridade de
				// plataforma; self-access nao consulta grants.
				grantRepository: {
					async listActiveByPrincipal() {
						return [
							{
								id: randomUUID(),
								capability: "identity.admin",
								scopeId: PLATFORM_SCOPE_ID,
								status: "active",
								validFrom: new Date("2026-01-01T00:00:00.000Z"),
								validUntil: null,
							},
						];
					},
				} as never,
				agencyScope: {
					async isMember() {
						return false;
					},
					async listAgencyIdsForPrincipal() {
						return [];
					},
				},
			}) as never,
		);
		return await work({
			pool,
			app,
			db,
			authHeader: (authUserId: string) => ({
				"content-type": "application/json",
				"x-test-auth": authUserId,
			}),
		});
	} finally {
		await pool.end();
	}
}

function request(
	path: string,
	init: { headers: Record<string, string>; body?: unknown },
): Request {
	return new Request(`http://127.0.0.1${path}`, {
		method: "POST",
		headers: init.headers,
		body: init.body === undefined ? undefined : JSON.stringify(init.body),
	});
}

describe("ANX-467 — posse da SessionRef é invariante do agregado (HTTP real + PostgreSQL)", () => {
	test.skipIf(Boolean(skipReason))(
		"self-access com id arbitrário + hash de terceiro: 404 e vítima intacta no banco",
		async () => {
			await withIdentityHttpPgHarness(async ({ pool, app, db, authHeader }) => {
				const victim = await registerPrincipal(
					{ repository: db.repository, unitOfWork: db.unitOfWork },
					{ authUserId: `auth-${randomUUID()}`, email: "victim@example.com" },
				);
				const attacker = await registerPrincipal(
					{ repository: db.repository, unitOfWork: db.unitOfWork },
					{ authUserId: `auth-${randomUUID()}`, email: "attacker@example.com" },
				);
				const victimRefId = randomUUID();
				const victimRawRef = `better-auth-session-${randomUUID()}`;
				await db.sessionRefRepository.create({
					id: victimRefId,
					principalId: victim.id,
					externalRefHash: sessionRefHash(victimRawRef),
				});

				const attackerRefId = randomUUID();
				const response = await app.handle(
					request("/v1/identity/sessions/revoke", {
						headers: {
							...authHeader(attacker.authUserId as string),
							"idempotency-key": randomUUID(),
						},
						body: {
							principalId: attacker.id,
							sessionRefId: attackerRefId,
							externalRefHash: sessionRefHash(victimRawRef),
						},
					}),
				);

				expect(response.status).toBe(404);
				expect((await response.json()).error.details.code).toBe(
					"IDN_SESSION_NOT_FOUND",
				);

				const victimRow = await pool.query<{ status: string }>(
					"SELECT status FROM identity_sessions WHERE id = $1",
					[victimRefId],
				);
				expect(victimRow.rows[0]?.status).toBe("active");
				const attackerRow = await pool.query<{ status: string }>(
					"SELECT status FROM identity_sessions WHERE id = $1",
					[attackerRefId],
				);
				expect(attackerRow.rows[0]).toBeUndefined();
			});
		},
	);

	test.skipIf(Boolean(skipReason))(
		"replay do journal de terceiro: 404, sem DTO alheio e sem alterar estado",
		async () => {
			await withIdentityHttpPgHarness(async ({ pool, app, db, authHeader }) => {
				const victim = await registerPrincipal(
					{ repository: db.repository, unitOfWork: db.unitOfWork },
					{ authUserId: `auth-${randomUUID()}`, email: "victim@example.com" },
				);
				const attacker = await registerPrincipal(
					{ repository: db.repository, unitOfWork: db.unitOfWork },
					{ authUserId: `auth-${randomUUID()}`, email: "attacker@example.com" },
				);
				const victimRefId = randomUUID();
				const victimKey = randomUUID();
				const victimRawRef = `better-auth-session-${randomUUID()}`;

				// A vitima registra a propria revogacao: deixa journal para a key.
				const record = await app.handle(
					request("/v1/identity/sessions/revoke", {
						headers: {
							...authHeader(victim.authUserId as string),
							"idempotency-key": victimKey,
						},
						body: {
							principalId: victim.id,
							sessionRefId: victimRefId,
							externalRefHash: sessionRefHash(victimRawRef),
						},
					}),
				);
				expect(record.status).toBe(200);
				expect((await record.json()).sessionRef.principalId).toBe(victim.id);

				// Atacante (self-access) reusa a key de terceiro no MESMO agregado.
				const attack = await app.handle(
					request("/v1/identity/sessions/revoke", {
						headers: {
							...authHeader(attacker.authUserId as string),
							"idempotency-key": victimKey,
						},
						body: {
							principalId: attacker.id,
							sessionRefId: victimRefId,
						},
					}),
				);
				expect(attack.status).toBe(404);
				const attackBody = await attack.json();
				expect(attackBody.error.details.code).toBe("IDN_SESSION_NOT_FOUND");
				expect(JSON.stringify(attackBody)).not.toContain(victim.id);

				// A leitura nao altera estado: a sessao da vitima segue revogada.
				const victimRow = await pool.query<{ status: string }>(
					"SELECT status FROM identity_sessions WHERE id = $1",
					[victimRefId],
				);
				expect(victimRow.rows[0]?.status).toBe("revoked");
			});
		},
	);

	test.skipIf(Boolean(skipReason))(
		"caminhos legítimos: própria referência por id/hash e admin com principalId correto seguem 200",
		async () => {
			await withIdentityHttpPgHarness(async ({ app, db, authHeader }) => {
				const owner = await registerPrincipal(
					{ repository: db.repository, unitOfWork: db.unitOfWork },
					{ authUserId: `auth-${randomUUID()}`, email: "owner@example.com" },
				);
				const victim = await registerPrincipal(
					{ repository: db.repository, unitOfWork: db.unitOfWork },
					{ authUserId: `auth-${randomUUID()}`, email: "victim@example.com" },
				);
				const ownById = randomUUID();
				const ownByHash = randomUUID();
				const ownRawRef = `better-auth-session-${randomUUID()}`;
				await db.sessionRefRepository.create({
					id: ownById,
					principalId: owner.id,
					externalRefHash: sessionRefHash(randomUUID()),
				});
				await db.sessionRefRepository.create({
					id: ownByHash,
					principalId: owner.id,
					externalRefHash: sessionRefHash(ownRawRef),
				});

				const byId = await app.handle(
					request("/v1/identity/sessions/revoke", {
						headers: {
							...authHeader(owner.authUserId as string),
							"idempotency-key": randomUUID(),
						},
						body: { principalId: owner.id, sessionRefId: ownById },
					}),
				);
				expect(byId.status).toBe(200);
				expect((await byId.json()).transitioned).toBe(true);

				const byHash = await app.handle(
					request("/v1/identity/sessions/revoke", {
						headers: {
							...authHeader(owner.authUserId as string),
							"idempotency-key": randomUUID(),
						},
						body: {
							principalId: owner.id,
							sessionRefId: randomUUID(),
							externalRefHash: sessionRefHash(ownRawRef),
						},
					}),
				);
				expect(byHash.status).toBe(200);
				expect((await byHash.json()).sessionRef.sessionRefId).toBe(ownByHash);

				// Admin de plataforma (grant no escopo PLATFORM) sobre terceiro com
				// o `principalId` CORRETO do alvo.
				const victimRefId = randomUUID();
				await db.sessionRefRepository.create({
					id: victimRefId,
					principalId: victim.id,
					externalRefHash: sessionRefHash(randomUUID()),
				});
				const admin = await app.handle(
					request("/v1/identity/sessions/revoke", {
						headers: {
							...authHeader(owner.authUserId as string),
							"idempotency-key": randomUUID(),
						},
						body: { principalId: victim.id, sessionRefId: victimRefId },
					}),
				);
				expect(admin.status).toBe(200);
				expect((await admin.json()).transitioned).toBe(true);
			});
		},
	);
});
