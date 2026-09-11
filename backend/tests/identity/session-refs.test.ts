import { describe, expect, test } from "bun:test";
import { IDENTITY_EVENT_TYPES } from "@anxionos/contracts/identity";
import {
	listRevokedSessions,
	listSessions,
	type Principal,
	recordSessionRevoked,
	type SessionRef,
} from "@anxionos/identity";
import {
	createInMemoryPrincipalRepository,
	createInMemoryServiceIdentityRepository,
	createRecordingUnitOfWork,
} from "./test-support";

const sessionRefId = "33333333-3333-4333-8333-333333333333";
const commandId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const activePrincipal: Principal = {
	id: "11111111-1111-4111-8111-111111111111",
	authUserId: "auth-1",
	email: "owner@example.com",
	kind: "human",
	status: "active",
	revision: 1,
	createdAt: new Date("2026-09-08T12:00:00.000Z"),
	suspendedAt: null,
	suspensionReason: null,
	revokedAt: null,
	revocationReason: null,
};

function harness(principal: Principal = activePrincipal) {
	const principalRepository = createInMemoryPrincipalRepository([principal]);
	return {
		principalRepository,
		...createRecordingUnitOfWork(
			principalRepository,
			createInMemoryServiceIdentityRepository(),
		),
	};
}

describe("recordSessionRevoked", () => {
	test("records an unknown reference as revoked and emits the event", async () => {
		const h = harness();
		const result = await recordSessionRevoked(
			{
				principalRepository: h.principalRepository,
				sessionRefRepository: h.sessionRefRepository,
				unitOfWork: h.unitOfWork,
			},
			{
				principalId: activePrincipal.id,
				sessionRefId,
				externalRefHash:
					"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
				reasonCode: "ops.manual",
			},
		);

		expect(result.transitioned).toBe(true);
		expect(result.sessionRef.status).toBe("revoked");
		expect(result.sessionRef.sessionRefId).toBe(sessionRefId);
		// The raw external reference never appears — only its hash is stored.
		const stored = await h.sessionRefRepository.findById(sessionRefId);
		expect(stored?.externalRefHash).toBe(
			"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
		);

		const events = h.published.filter(
			(event) => event.eventType === IDENTITY_EVENT_TYPES.SESSION_REVOKED,
		);
		expect(events).toHaveLength(1);
		expect(events[0]?.payload).toMatchObject({
			sessionRefId,
			principalId: activePrincipal.id,
		});
	});

	test("repeats are idempotent without a second event", async () => {
		const h = harness();
		const deps = {
			principalRepository: h.principalRepository,
			sessionRefRepository: h.sessionRefRepository,
			unitOfWork: h.unitOfWork,
		};
		const input = {
			principalId: activePrincipal.id,
			sessionRefId,
			externalRefHash:
				"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
		};
		await recordSessionRevoked(deps, input);
		const second = await recordSessionRevoked(deps, input);

		expect(second.transitioned).toBe(false);
		expect(
			h.published.filter(
				(event) => event.eventType === IDENTITY_EVENT_TYPES.SESSION_REVOKED,
			),
		).toHaveLength(1);
	});

	test("replays by commandId without emitting again", async () => {
		const h = harness();
		const deps = {
			principalRepository: h.principalRepository,
			sessionRefRepository: h.sessionRefRepository,
			unitOfWork: h.unitOfWork,
		};
		await recordSessionRevoked(deps, {
			principalId: activePrincipal.id,
			sessionRefId,
			externalRefHash:
				"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
			commandId,
		});
		const replay = await recordSessionRevoked(deps, {
			principalId: activePrincipal.id,
			sessionRefId,
			externalRefHash:
				"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
			commandId,
		});

		expect(replay.transitioned).toBe(false);
		expect(
			h.published.filter(
				(event) => event.eventType === IDENTITY_EVENT_TYPES.SESSION_REVOKED,
			),
		).toHaveLength(1);
	});

	test("unknown reference without a hash fails closed", async () => {
		const h = harness();
		await expect(
			recordSessionRevoked(
				{
					principalRepository: h.principalRepository,
					sessionRefRepository: h.sessionRefRepository,
					unitOfWork: h.unitOfWork,
				},
				{ principalId: activePrincipal.id, sessionRefId },
			),
		).rejects.toMatchObject({ identityCode: "IDN_SESSION_NOT_FOUND" });
	});

	/**
	 * ANX-467: a posse e' invariante do agregado tambem quando a referencia e'
	 * resolvida por hash. O comando valida antes de delegar a transicao.
	 */
	test("a hash that belongs to another principal fails closed", async () => {
		const victim: Principal = {
			...activePrincipal,
			id: "22222222-2222-4222-8222-222222222222",
			authUserId: "auth-2",
			email: "victim@example.com",
		};
		const principalRepository = createInMemoryPrincipalRepository([
			activePrincipal,
			victim,
		]);
		const recording = createRecordingUnitOfWork(
			principalRepository,
			createInMemoryServiceIdentityRepository(),
		);
		const victimSessionId = "44444444-4444-4444-8444-444444444444";
		const victimHash = "ab".repeat(32);
		await recording.sessionRefRepository.create({
			id: victimSessionId,
			principalId: victim.id,
			externalRefHash: victimHash,
		});

		await expect(
			recordSessionRevoked(
				{
					principalRepository,
					sessionRefRepository: recording.sessionRefRepository,
					unitOfWork: recording.unitOfWork,
				},
				{
					principalId: activePrincipal.id,
					sessionRefId: "55555555-5555-4555-8555-555555555555",
					externalRefHash: victimHash,
				},
			),
		).rejects.toMatchObject({ identityCode: "IDN_SESSION_NOT_FOUND" });

		expect(
			(await recording.sessionRefRepository.findById(victimSessionId))?.status,
		).toBe("active");
	});

	/**
	 * ANX-464, defense in depth: o comando revalida com o mesmo schema do
	 * boundary, entao chamadores in-process (Better Auth/workers) tambem nao
	 * conseguem gravar um valor que nao seja derivacao sha256.
	 */
	test("a non-sha256 externalRefHash fails closed in the command", async () => {
		const h = harness();
		await expect(
			recordSessionRevoked(
				{
					principalRepository: h.principalRepository,
					sessionRefRepository: h.sessionRefRepository,
					unitOfWork: h.unitOfWork,
				},
				{
					principalId: activePrincipal.id,
					sessionRefId,
					externalRefHash: "raw-session-token",
				},
			),
		).rejects.toThrow();
		expect(await h.sessionRefRepository.findById(sessionRefId)).toBeNull();
	});

	test("recording a revoked principal's session is allowed (reconciliation path)", async () => {
		// Fail-closed applies to resolution/authentication, not to recording the
		// revocation of sessions that belong to a suspended/revoked principal.
		const revoked: Principal = {
			...activePrincipal,
			status: "revoked",
			revision: 3,
			revokedAt: new Date(),
			revocationReason: "security.incident",
		};
		const h = harness(revoked);
		const result = await recordSessionRevoked(
			{
				principalRepository: h.principalRepository,
				sessionRefRepository: h.sessionRefRepository,
				unitOfWork: h.unitOfWork,
			},
			{
				principalId: revoked.id,
				sessionRefId,
				externalRefHash:
					"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
			},
		);
		expect(result.transitioned).toBe(true);
		expect(result.sessionRef.status).toBe("revoked");
	});

	test("an unknown principal id fails closed", async () => {
		const h = harness();
		await expect(
			recordSessionRevoked(
				{
					principalRepository: h.principalRepository,
					sessionRefRepository: h.sessionRefRepository,
					unitOfWork: h.unitOfWork,
				},
				{
					principalId: "99999999-9999-4999-8999-999999999999",
					sessionRefId,
					externalRefHash:
						"9999999999999999999999999999999999999999999999999999999999999999",
				},
			),
		).rejects.toMatchObject({ identityCode: "IDN_PRINCIPAL_NOT_FOUND" });
	});
});

describe("session queries", () => {
	const knownSession: SessionRef = {
		id: sessionRefId,
		principalId: activePrincipal.id,
		status: "active",
		externalRefHash:
			"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
		createdAt: new Date("2026-09-08T12:00:00.000Z"),
		revokedAt: null,
		revocationReason: null,
	};

	test("listSessions returns DTOs without the external hash", async () => {
		const h = harness();
		await h.sessionRefRepository.create({
			id: knownSession.id,
			principalId: knownSession.principalId,
			externalRefHash: knownSession.externalRefHash,
		});
		const sessions = await listSessions(
			{ sessionRefRepository: h.sessionRefRepository },
			activePrincipal.id,
		);
		expect(sessions).toHaveLength(1);
		expect(sessions[0]?.status).toBe("active");
		expect(JSON.stringify(sessions)).not.toContain(
			"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
		);
	});

	test("listRevokedSessions exposes the revocation audit trail", async () => {
		const h = harness();
		await recordSessionRevoked(
			{
				principalRepository: h.principalRepository,
				sessionRefRepository: h.sessionRefRepository,
				unitOfWork: h.unitOfWork,
			},
			{
				principalId: activePrincipal.id,
				sessionRefId,
				externalRefHash:
					"1111111111111111111111111111111111111111111111111111111111111111",
				reasonCode: "security.incident",
			},
		);
		const revoked = await listRevokedSessions({
			sessionRefRepository: h.sessionRefRepository,
		});
		expect(revoked).toHaveLength(1);
		expect(revoked[0]?.status).toBe("revoked");
		expect(revoked[0]?.revocationReason).toBe("security.incident");
		expect(JSON.stringify(revoked)).not.toContain(
			"1111111111111111111111111111111111111111111111111111111111111111",
		);
	});
});
