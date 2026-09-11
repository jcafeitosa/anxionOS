import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
	IDENTITY_EVENT_TYPES,
	identityPrincipalSuspendedV1PayloadSchema,
} from "@anxionos/contracts/identity";
import type { Principal } from "@anxionos/identity";

import {
	reconcileSuspendedPrincipalSessions,
	SessionRevocationUnavailableError,
} from "@anxionos/identity";
import {
	classifyIdentitySessionRevocationError,
	consumeIdentitySuspendedEvent,
	IDENTITY_SESSIONS_CONSUMER_NAME,
} from "../../apps/api/src/identity/session-revocation-consumer";
import {
	createInMemoryPrincipalRepository,
	createInMemoryServiceIdentityRepository,
	createRecordingUnitOfWork,
} from "../identity/test-support";

/** ANX-464: `externalRefHash` carries a real sha256 hex digest, never material. */
function sessionRefHash(rawRef: string): string {
	return createHash("sha256").update(rawRef, "utf8").digest("hex");
}

const suspendedPrincipal: Principal = {
	id: "11111111-1111-4111-8111-111111111111",
	authUserId: "auth-1",
	email: "owner@example.com",
	kind: "human",
	status: "suspended",
	revision: 2,
	createdAt: new Date("2026-09-08T12:00:00.000Z"),
	suspendedAt: new Date("2026-09-08T12:00:00.000Z"),
	suspensionReason: "ops.manual",
	revokedAt: null,
	revocationReason: null,
};

describe("session revocation consumer", () => {
	describe("classifyIdentitySessionRevocationError", () => {
		test("treats Zod validation failures as permanent (ack poison)", () => {
			let validationError: unknown;
			try {
				identityPrincipalSuspendedV1PayloadSchema.parse({
					principalId: suspendedPrincipal.id,
				});
			} catch (error) {
				validationError = error;
			}
			expect(classifyIdentitySessionRevocationError(validationError)).toBe(
				"permanent",
			);
		});

		test("treats session revoker outages as transient (nak retry)", () => {
			expect(
				classifyIdentitySessionRevocationError(
					new SessionRevocationUnavailableError("down"),
				),
			).toBe("transient");
		});
	});

	test("consumer name matches R09 durable identity-sessions contract", () => {
		expect(IDENTITY_SESSIONS_CONSUMER_NAME).toBe(
			"apps/api:identity-sessions:v1",
		);
	});

	test("consumeIdentitySuspendedEvent revokes sessions for suspended principal", async () => {
		const revoked: string[] = [];
		await consumeIdentitySuspendedEvent(
			{
				principalRepository: createInMemoryPrincipalRepository([
					suspendedPrincipal,
				]),
				sessionRevoker: {
					async revokeAllForAuthUser(authUserId) {
						revoked.push(authUserId);
					},
				},
			},
			{
				eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
				schemaVersion: "0.1.0",
				ownerDomain: "identity",
				eventType: IDENTITY_EVENT_TYPES.PRINCIPAL_SUSPENDED,
				occurredAt: "2026-09-08T12:00:00.000Z",
				payload: {
					principalId: suspendedPrincipal.id,
					reasonCode: "ops.manual",
					suspendedAt: "2026-09-08T12:00:00.000Z",
				},
			},
		);
		expect(revoked).toEqual(["auth-1"]);
	});

	test("consumeIdentitySuspendedEvent ignores unrelated event types", async () => {
		const revoked: string[] = [];
		await consumeIdentitySuspendedEvent(
			{
				principalRepository: createInMemoryPrincipalRepository([
					suspendedPrincipal,
				]),
				sessionRevoker: {
					async revokeAllForAuthUser(authUserId) {
						revoked.push(authUserId);
					},
				},
			},
			{
				eventId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
				schemaVersion: "0.1.0",
				ownerDomain: "identity",
				eventType: IDENTITY_EVENT_TYPES.PRINCIPAL_REGISTERED,
				occurredAt: "2026-09-08T12:00:00.000Z",
				payload: {
					principalId: suspendedPrincipal.id,
					email: "owner@example.com",
				},
			},
		);
		expect(revoked).toEqual([]);
	});

	test("reconcileSuspendedPrincipalSessions revokes all suspended principals", async () => {
		const revoked: string[] = [];
		const result = await reconcileSuspendedPrincipalSessions({
			principalRepository: createInMemoryPrincipalRepository([
				suspendedPrincipal,
				{
					...suspendedPrincipal,
					id: "22222222-2222-4222-8222-222222222222",
					authUserId: "auth-2",
					email: "other@example.com",
				},
			]),
			sessionRevoker: {
				async revokeAllForAuthUser(authUserId) {
					revoked.push(authUserId);
					return [
						{
							externalRefHash: sessionRefHash(authUserId),
							revokedAt: new Date(),
						},
					];
				},
			},
		});
		expect(result.revokedPrincipalCount).toBe(2);
		expect(revoked.sort()).toEqual(["auth-1", "auth-2"]);
	});

	test("reconcile does not count a principal that had no live session", async () => {
		const result = await reconcileSuspendedPrincipalSessions({
			principalRepository: createInMemoryPrincipalRepository([
				suspendedPrincipal,
			]),
			sessionRevoker: {
				async revokeAllForAuthUser() {
					return [];
				},
			},
		});
		expect(result.revokedPrincipalCount).toBe(0);
	});

	test("reconcile records session refs and emits the revoked event when wired", async () => {
		const repository = createInMemoryPrincipalRepository([suspendedPrincipal]);
		const { unitOfWork, published, sessionRefRepository } =
			createRecordingUnitOfWork(
				repository,
				createInMemoryServiceIdentityRepository(),
			);
		const result = await reconcileSuspendedPrincipalSessions({
			principalRepository: repository,
			sessionRevoker: {
				async revokeAllForAuthUser() {
					return [
						{
							externalRefHash: sessionRefHash("auth-1"),
							revokedAt: new Date(),
						},
					];
				},
			},
			unitOfWork,
		});
		expect(result.revokedPrincipalCount).toBe(1);
		const refs = await sessionRefRepository.listRevoked();
		expect(refs).toHaveLength(1);
		expect(refs[0]?.principalId).toBe(suspendedPrincipal.id);
		expect(
			published.filter(
				(event) => event.eventType === IDENTITY_EVENT_TYPES.SESSION_REVOKED,
			),
		).toHaveLength(1);
	});
});
