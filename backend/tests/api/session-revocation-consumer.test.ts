import { describe, expect, test } from "bun:test";
import { IDENTITY_EVENT_TYPES } from "@anxionos/contracts/identity";
import type { Principal } from "@anxionos/identity";
import {
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
	test("consumer name matches R09 durable identity-sessions contract", () => {
		expect(IDENTITY_SESSIONS_CONSUMER_NAME).toBe("apps/api:identity-sessions:v1");
	});

	test("consumeIdentitySuspendedEvent revokes sessions for suspended principal", async () => {
		const revoked: string[] = [];
		await consumeIdentitySuspendedEvent(
			{
				principalRepository: createInMemoryPrincipalRepository([suspendedPrincipal]),
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
				principalRepository: createInMemoryPrincipalRepository([suspendedPrincipal]),
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
});
