import { describe, expect, test } from "bun:test";
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
import { createInMemoryPrincipalRepository } from "../identity/test-support";

const suspendedPrincipal: Principal = {
	id: "11111111-1111-4111-8111-111111111111",
	authUserId: "auth-1",
	email: "owner@example.com",
	status: "suspended",
	createdAt: new Date("2026-09-08T12:00:00.000Z"),
	suspendedAt: new Date("2026-09-08T12:00:00.000Z"),
	suspensionReason: "ops.manual",
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
				},
			},
		});
		expect(result.revokedPrincipalCount).toBe(2);
		expect(revoked.sort()).toEqual(["auth-1", "auth-2"]);
	});
});
