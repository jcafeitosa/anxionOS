import { describe, expect, test } from "bun:test";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { IDENTITY_EVENT_TYPES } from "@anxionos/contracts/identity";
import {
	IDENTITY_PROJECTION_FORBIDDEN_ATTRIBUTES,
	identityUserProjectionNodeSchema,
	toIdentityUserProjectionNode,
} from "@anxionos/identity";
import { createServiceCredentialIssuedEvent } from "../../modules/identity/src/domain/events/identity-events";

const principalId = "11111111-1111-4111-8111-111111111111";

function envelope(
	eventType: string,
	payload: Record<string, unknown>,
): DomainEventEnvelope {
	return {
		eventId: "22222222-2222-4222-8222-222222222222",
		schemaVersion: "0.1.0",
		ownerDomain: "identity",
		eventType,
		occurredAt: "2026-09-08T12:00:00.000Z",
		payload,
	};
}

describe("identity :User projection contract (D-IDN-020)", () => {
	test("registration projects the node with the identity attributes", () => {
		const node = toIdentityUserProjectionNode(
			envelope(IDENTITY_EVENT_TYPES.PRINCIPAL_REGISTERED, {
				principalId,
				email: "Owner@Example.com",
				kind: "human",
				revision: 1,
			}),
		);
		expect(node).not.toBeNull();
		expect(node?.nodeKey).toBe(`user:${principalId}`);
		// e-mail normalizado em minúsculas pelo contrato
		expect(node?.email).toBe("owner@example.com");
		expect(node?.status).toBe("active");
		expect(node?.ownerDomain).toBe("identity");
	});

	test("status events patch the node without an email (incremental projection)", () => {
		const suspended = toIdentityUserProjectionNode(
			envelope(IDENTITY_EVENT_TYPES.PRINCIPAL_SUSPENDED, {
				principalId,
				reasonCode: "ops.manual",
				suspendedAt: "2026-09-08T12:00:00.000Z",
				revision: 2,
			}),
		);
		expect(suspended?.status).toBe("suspended");
		expect(suspended?.revision).toBe(2);
		expect(suspended?.email).toBeUndefined();

		const revoked = toIdentityUserProjectionNode(
			envelope(IDENTITY_EVENT_TYPES.PRINCIPAL_REVOKED, {
				principalId,
				reasonCode: "security.incident",
				revokedAt: "2026-09-08T12:00:00.000Z",
				revision: 3,
			}),
		);
		expect(revoked?.status).toBe("revoked");
	});

	test("session and credential events do not project", () => {
		expect(
			toIdentityUserProjectionNode(
				envelope(IDENTITY_EVENT_TYPES.SESSION_REVOKED, {
					sessionRefId: "33333333-3333-4333-8333-333333333333",
					principalId,
					revokedAt: "2026-09-08T12:00:00.000Z",
				}),
			),
		).toBeNull();
		expect(
			toIdentityUserProjectionNode(
				createServiceCredentialIssuedEvent({
					credentialId: "44444444-4444-4444-8444-444444444444",
					serviceIdentityId: "55555555-5555-4555-8555-555555555555",
					principalId,
					prefix: "anxabcdefghi",
					issuedAt: "2026-09-08T12:00:00.000Z",
				}),
			),
		).toBeNull();
	});

	test("the node shape rejects forbidden attributes instead of leaking them", () => {
		for (const forbidden of IDENTITY_PROJECTION_FORBIDDEN_ATTRIBUTES) {
			const parsed = identityUserProjectionNodeSchema.safeParse({
				nodeKey: `user:${principalId}`,
				principalId,
				kind: "human",
				status: "active",
				revision: 1,
				ownerDomain: "identity",
				eventId: "22222222-2222-4222-8222-222222222222",
				checkpoint: "2026-09-08T12:00:00.000Z",
				[forbidden]: "vazamento",
			});
			expect(parsed.success).toBe(false);
		}
	});

	test("no projected node ever carries a credential or token value", () => {
		const secret = "anxabcdefghi.supersecretmaterial";
		const node = toIdentityUserProjectionNode(
			envelope(IDENTITY_EVENT_TYPES.PRINCIPAL_REGISTERED, {
				principalId,
				email: "owner@example.com",
				kind: "service",
				revision: 1,
			}),
		);
		const serialized = JSON.stringify(node);
		expect(serialized).not.toContain(secret);
		expect(serialized).not.toContain("secretHash");
		expect(serialized).not.toContain("auth-1");
		expect(serialized).not.toContain("authUserId");
	});
});
