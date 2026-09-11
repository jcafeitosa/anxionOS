import { describe, expect, test } from "bun:test";
import { IDENTITY_EVENT_TYPES } from "@anxionos/contracts/identity";
import { linkAuthUserId, type Principal } from "@anxionos/identity";
import {
	createInMemoryPrincipalRepository,
	createInMemoryServiceIdentityRepository,
	createRecordingUnitOfWork,
} from "./test-support";

const principalWithoutAuth: Principal = {
	id: "11111111-1111-4111-8111-111111111111",
	authUserId: "auth-placeholder",
	email: "owner@example.com",
	status: "active",
	createdAt: new Date("2026-09-08T12:00:00.000Z"),
	suspendedAt: null,
	suspensionReason: null,
	kind: "human",
	revision: 1,
	revokedAt: null,
	revocationReason: null,
};

describe("linkAuthUserId", () => {
	test("links Better Auth user and emits audited auth_linked event without authUserId in payload", async () => {
		const repository = createInMemoryPrincipalRepository([
			principalWithoutAuth,
		]);
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const linked = await linkAuthUserId(
			{ repository, unitOfWork },
			{
				principalId: principalWithoutAuth.id,
				authUserId: "better-auth-user-42",
			},
		);
		expect(linked.authUserId).toBe("better-auth-user-42");
		expect(published[0]?.eventType).toBe(
			IDENTITY_EVENT_TYPES.PRINCIPAL_AUTH_LINKED,
		);
		expect(published[0]?.payload).toEqual({
			principalId: principalWithoutAuth.id,
		});
		expect(published[0]?.payload).not.toHaveProperty("authUserId");
	});

	test("rejects auth user already linked to another principal", async () => {
		const repository = createInMemoryPrincipalRepository([
			principalWithoutAuth,
			{
				...principalWithoutAuth,
				id: "22222222-2222-4222-8222-222222222222",
				authUserId: "better-auth-user-42",
				email: "other@example.com",
			},
		]);
		const { unitOfWork } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		await expect(
			linkAuthUserId(
				{ repository, unitOfWork },
				{
					principalId: principalWithoutAuth.id,
					authUserId: "better-auth-user-42",
				},
			),
		).rejects.toMatchObject({ identityCode: "IDN_PRINCIPAL_AUTH_USER_TAKEN" });
	});
});
