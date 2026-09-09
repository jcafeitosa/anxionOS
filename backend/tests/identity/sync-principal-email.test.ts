import { describe, expect, test } from "bun:test";
import { IDENTITY_EVENT_TYPES } from "@anxionos/contracts/identity";
import { syncPrincipalEmail, type Principal } from "@anxionos/identity";
import {
	createInMemoryPrincipalRepository,
	createInMemoryServiceIdentityRepository,
	createRecordingUnitOfWork,
} from "./test-support";

const principal: Principal = {
	id: "11111111-1111-4111-8111-111111111111",
	authUserId: "auth-1",
	email: "owner@example.com",
	status: "active",
	createdAt: new Date("2026-09-08T12:00:00.000Z"),
	suspendedAt: null,
	suspensionReason: null,
};

describe("syncPrincipalEmail", () => {
	test("updates email and emits email_updated event", async () => {
		const repository = createInMemoryPrincipalRepository([principal]);
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const updated = await syncPrincipalEmail(
			{ repository, unitOfWork },
			{ principalId: principal.id, email: "new-owner@example.com" },
		);
		expect(updated.email).toBe("new-owner@example.com");
		expect(published).toHaveLength(1);
		expect(published[0]?.eventType).toBe(IDENTITY_EVENT_TYPES.PRINCIPAL_EMAIL_UPDATED);
		expect(published[0]?.payload).toEqual({
			principalId: principal.id,
			email: "new-owner@example.com",
		});
	});

	test("same email is idempotent without event", async () => {
		const repository = createInMemoryPrincipalRepository([principal]);
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const updated = await syncPrincipalEmail(
			{ repository, unitOfWork },
			{ principalId: principal.id, email: principal.email },
		);
		expect(updated.id).toBe(principal.id);
		expect(published).toHaveLength(0);
	});

	test("rejects email already registered to another principal", async () => {
		const repository = createInMemoryPrincipalRepository([
			principal,
			{
				...principal,
				id: "22222222-2222-4222-8222-222222222222",
				authUserId: "auth-2",
				email: "taken@example.com",
			},
		]);
		const { unitOfWork } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		await expect(
			syncPrincipalEmail(
				{ repository, unitOfWork },
				{ principalId: principal.id, email: "taken@example.com" },
			),
		).rejects.toMatchObject({ identityCode: "PRINCIPAL_EMAIL_TAKEN" });
	});
});
