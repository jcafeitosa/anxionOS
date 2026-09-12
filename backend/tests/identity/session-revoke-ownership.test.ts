import { randomUUID } from "node:crypto";
import { describe, expect, test } from "bun:test";
import type { Principal } from "@anxionos/identity";
import { recordSessionRevoked } from "@anxionos/identity";
import { IdentityCommandError } from "../../modules/identity/src/application/errors";
import {
	createInMemoryPrincipalRepository,
	createInMemorySessionRefRepository,
	createRecordingUnitOfWork,
} from "./test-support";

const alicePrincipal: Principal = {
	id: "11111111-1111-4111-8111-111111111111",
	authUserId: "alice-auth",
	email: "alice@test.anxion.os",
	kind: "human",
	status: "active",
	revision: 1,
	createdAt: new Date(),
	suspendedAt: null,
	suspensionReason: null,
	revokedAt: null,
	revocationReason: null,
};

const bobPrincipal: Principal = {
	id: "22222222-2222-4222-8222-222222222222",
	authUserId: "bob-auth",
	email: "bob@test.anxion.os",
	kind: "human",
	status: "active",
	revision: 1,
	createdAt: new Date(),
	suspendedAt: null,
	suspensionReason: null,
	revokedAt: null,
	revocationReason: null,
};

/**
 * Session revoke ownership abuse cases.
 *
 * Requirement: sessionRef.principalId === command.principalId enforced.
 * Response: opaque 404 (IDN_SESSION_NOT_FOUND) for ownership violations.
 *
 * Abuse cases:
 * 1. Self-access with arbitrary sessionRefId + victim's hash → revokes victim
 * 2. Knowing idempotency key of another principal's revocation → leaks session info
 * 3. Session ref belongs to principalB, command claims principalA → opaque 404
 */
describe("Session revoke ownership enforcement", () => {
	function createRecordSessionDeps() {
		const principalRepository = createInMemoryPrincipalRepository([
			alicePrincipal,
			bobPrincipal,
		]);
		const sessionRefRepository = createInMemorySessionRefRepository();
		const { unitOfWork } = createRecordingUnitOfWork(
			principalRepository,
			sessionRefRepository,
		);

		return {
			deps: {
				principalRepository,
				sessionRefRepository,
				unitOfWork,
			},
			alice: alicePrincipal,
			bob: bobPrincipal,
		};
	}

	test("ABUSE CASE 1 — cannot revoke another principal's session by hash", async () => {
		const { deps, alice, bob } = createRecordSessionDeps();

		// Bob creates a session reference
		const bobSessionRefId = randomUUID();
		const bobExternalHash = randomUUID(); // Simulated hash

		await recordSessionRevoked(deps, {
			principalId: bob.id,
			sessionRefId: bobSessionRefId,
			externalRefHash: bobExternalHash,
		});

		// Alice tries to revoke Bob's session with self-access + Bob's hash
		await expect(
			recordSessionRevoked(deps, {
				principalId: alice.id, // Alice claims it's her session
				sessionRefId: randomUUID(), // Unknown id
				externalRefHash: bobExternalHash, // But Bob's hash
			}),
		).rejects.toThrow(IdentityCommandError);

		await expect(
			recordSessionRevoked(deps, {
				principalId: alice.id,
				sessionRefId: randomUUID(),
				externalRefHash: bobExternalHash,
			}),
		).rejects.toMatchObject({
			identityCode: "IDN_SESSION_NOT_FOUND",
		});
	});

	test("ABUSE CASE 2 — cannot replay idempotency key to get another principal's session", async () => {
		const { deps, alice, bob } = createRecordSessionDeps();

		// Bob revokes his session with idempotency key
		const bobSessionRefId = randomUUID();
		const idempotencyKey = randomUUID();

		await recordSessionRevoked(deps, {
			principalId: bob.id,
			sessionRefId: bobSessionRefId,
			externalRefHash: randomUUID(),
			commandId: idempotencyKey,
		});

		// Alice tries to replay with same key but different principalId
		await expect(
			recordSessionRevoked(deps, {
				principalId: alice.id, // Alice's id
				sessionRefId: bobSessionRefId, // Bob's session
				commandId: idempotencyKey, // Bob's key
			}),
		).rejects.toMatchObject({
			identityCode: "IDN_SESSION_NOT_FOUND",
		});
	});

	test("ABUSE CASE 3 — session ref ownership checked on existing ref", async () => {
		const { deps, alice, bob } = createRecordSessionDeps();

		// Bob creates a session reference
		const bobSessionRefId = randomUUID();
		await recordSessionRevoked(deps, {
			principalId: bob.id,
			sessionRefId: bobSessionRefId,
			externalRefHash: randomUUID(),
		});

		// Alice tries to revoke it by knowing the sessionRefId
		await expect(
			recordSessionRevoked(deps, {
				principalId: alice.id, // Wrong principal
				sessionRefId: bobSessionRefId, // Bob's session ref
			}),
		).rejects.toMatchObject({
			identityCode: "IDN_SESSION_NOT_FOUND",
		});
	});

	test("VALID CASE — owner can revoke their own session", async () => {
		const { deps, alice } = createRecordSessionDeps();

		const aliceSessionRefId = randomUUID();
		const result = await recordSessionRevoked(deps, {
			principalId: alice.id,
			sessionRefId: aliceSessionRefId,
			externalRefHash: randomUUID(),
		});

		expect(result.sessionRef.id).toBe(aliceSessionRefId);
		expect(result.sessionRef.principalId).toBe(alice.id);
		expect(result.transitioned).toBe(true);
	});
});
