import { randomUUID } from "node:crypto";
import { describe, expect, test } from "bun:test";
import { getTestPool } from "../helpers";
import { registerPrincipalForTest } from "./helpers";
import { recordSessionRevoked } from "@anxionos/identity";
import { createIdentityDb } from "@anxionos/identity";

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
	const pool = getTestPool();

	test("ABUSE CASE 1 — cannot revoke another principal's session by hash", async () => {
		const alice = await registerPrincipalForTest(pool, {
			authUserId: randomUUID(),
			email: "alice@test.anxion.os",
		});

		const bob = await registerPrincipalForTest(pool, {
			authUserId: randomUUID(),
			email: "bob@test.anxion.os",
		});

		const identityDb = createIdentityDb(pool);

		// Bob creates a session reference
		const bobSessionRefId = randomUUID();
		const bobExternalHash = randomUUID(); // Simulated hash

		await recordSessionRevoked(
			{
				principalRepository: identityDb.repository,
				sessionRefRepository: identityDb.sessionRefRepository,
				unitOfWork: identityDb.unitOfWork,
			},
			{
				principalId: bob.id,
				sessionRefId: bobSessionRefId,
				externalRefHash: bobExternalHash,
			},
		);

		// Alice tries to revoke Bob's session with self-access + Bob's hash
		await expect(
			recordSessionRevoked(
				{
					principalRepository: identityDb.repository,
					sessionRefRepository: identityDb.sessionRefRepository,
					unitOfWork: identityDb.unitOfWork,
				},
				{
					principalId: alice.id, // Alice claims it's her session
					sessionRefId: randomUUID(), // Unknown id
					externalRefHash: bobExternalHash, // But Bob's hash
				},
			),
		).rejects.toMatchObject({
			identityCode: "IDN_SESSION_NOT_FOUND",
		});
	});

	test("ABUSE CASE 2 — cannot replay idempotency key to get another principal's session", async () => {
		const alice = await registerPrincipalForTest(pool, {
			authUserId: randomUUID(),
			email: "alice-replay@test.anxion.os",
		});

		const bob = await registerPrincipalForTest(pool, {
			authUserId: randomUUID(),
			email: "bob-replay@test.anxion.os",
		});

		const identityDb = createIdentityDb(pool);

		// Bob revokes his session with idempotency key
		const bobSessionRefId = randomUUID();
		const idempotencyKey = randomUUID();

		await recordSessionRevoked(
			{
				principalRepository: identityDb.repository,
				sessionRefRepository: identityDb.sessionRefRepository,
				unitOfWork: identityDb.unitOfWork,
			},
			{
				principalId: bob.id,
				sessionRefId: bobSessionRefId,
				externalRefHash: randomUUID(),
				commandId: idempotencyKey,
			},
		);

		// Alice tries to replay with same key but different principalId
		await expect(
			recordSessionRevoked(
				{
					principalRepository: identityDb.repository,
					sessionRefRepository: identityDb.sessionRefRepository,
					unitOfWork: identityDb.unitOfWork,
				},
				{
					principalId: alice.id, // Alice's id
					sessionRefId: bobSessionRefId, // Bob's session
					commandId: idempotencyKey, // Bob's key
				},
			),
		).rejects.toMatchObject({
			identityCode: "IDN_SESSION_NOT_FOUND",
		});
	});

	test("ABUSE CASE 3 — session ref ownership checked on existing ref", async () => {
		const alice = await registerPrincipalForTest(pool, {
			authUserId: randomUUID(),
			email: "alice-existing@test.anxion.os",
		});

		const bob = await registerPrincipalForTest(pool, {
			authUserId: randomUUID(),
			email: "bob-existing@test.anxion.os",
		});

		const identityDb = createIdentityDb(pool);

		// Bob creates a session reference
		const bobSessionRefId = randomUUID();
		await recordSessionRevoked(
			{
				principalRepository: identityDb.repository,
				sessionRefRepository: identityDb.sessionRefRepository,
				unitOfWork: identityDb.unitOfWork,
			},
			{
				principalId: bob.id,
				sessionRefId: bobSessionRefId,
				externalRefHash: randomUUID(),
			},
		);

		// Alice tries to revoke it by knowing the sessionRefId
		await expect(
			recordSessionRevoked(
				{
					principalRepository: identityDb.repository,
					sessionRefRepository: identityDb.sessionRefRepository,
					unitOfWork: identityDb.unitOfWork,
				},
				{
					principalId: alice.id, // Wrong principal
					sessionRefId: bobSessionRefId, // Bob's session ref
				},
			),
		).rejects.toMatchObject({
			identityCode: "IDN_SESSION_NOT_FOUND",
		});
	});

	test("VALID CASE — owner can revoke their own session", async () => {
		const alice = await registerPrincipalForTest(pool, {
			authUserId: randomUUID(),
			email: "alice-valid@test.anxion.os",
		});

		const identityDb = createIdentityDb(pool);

		const aliceSessionRefId = randomUUID();
		const result = await recordSessionRevoked(
			{
				principalRepository: identityDb.repository,
				sessionRefRepository: identityDb.sessionRefRepository,
				unitOfWork: identityDb.unitOfWork,
			},
			{
				principalId: alice.id,
				sessionRefId: aliceSessionRefId,
				externalRefHash: randomUUID(),
			},
		);

		expect(result.sessionRef.id).toBe(aliceSessionRefId);
		expect(result.sessionRef.principalId).toBe(alice.id);
		expect(result.transitioned).toBe(true);
	});
});
