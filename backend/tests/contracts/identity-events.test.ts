import { describe, expect, test } from "bun:test";
import {
	IDENTITY_EVENT_TYPES,
	identityEventPayloadSchema,
	identityPrincipalRegisteredV1PayloadSchema,
	identityPrincipalReactivatedV1PayloadSchema,
} from "@anxionos/contracts/identity";

describe("identity contracts events", () => {
	test("registered payload round-trip without authUserId", () => {
		const payload = identityPrincipalRegisteredV1PayloadSchema.parse({
			principalId: "11111111-1111-4111-8111-111111111111",
			email: "owner@example.com",
		});
		expect(payload).not.toHaveProperty("authUserId");
		expect(payload.email).toBe("owner@example.com");
	});

	test("reactivated payload includes audit timestamp", () => {
		const payload = identityPrincipalReactivatedV1PayloadSchema.parse({
			principalId: "11111111-1111-4111-8111-111111111111",
			reactivatedAt: "2026-09-08T12:00:00.000Z",
			actorPrincipalId: "22222222-2222-4222-8222-222222222222",
		});
		expect(payload.reactivatedAt).toBe("2026-09-08T12:00:00.000Z");
	});

	test("discriminated union accepts suspended event", () => {
		const parsed = identityEventPayloadSchema.parse({
			eventType: IDENTITY_EVENT_TYPES.PRINCIPAL_SUSPENDED,
			payload: {
				principalId: "11111111-1111-4111-8111-111111111111",
				reasonCode: "ops.manual",
				suspendedAt: "2026-09-08T12:00:00.000Z",
			},
		});
		expect(parsed.eventType).toBe(IDENTITY_EVENT_TYPES.PRINCIPAL_SUSPENDED);
	});
});
