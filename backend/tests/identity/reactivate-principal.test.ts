import { describe, expect, test } from "bun:test";
import { IDENTITY_EVENT_TYPES } from "@anxionos/contracts/identity";
import {
	getPrincipalById,
	reactivatePrincipal,
	type Principal,
} from "@anxionos/identity";
import { IdentityCommandError } from "../../modules/identity/src/application/errors";
import {
	createInMemoryPrincipalRepository,
	createInMemoryServiceIdentityRepository,
	createRecordingUnitOfWork,
} from "./test-support";

const suspendedPrincipal: Principal = {
	id: "11111111-1111-4111-8111-111111111111",
	authUserId: "auth-1",
	email: "owner@example.com",
	status: "suspended",
	createdAt: new Date("2026-09-08T12:00:00.000Z"),
	suspendedAt: new Date("2026-09-08T12:00:00.000Z"),
	suspensionReason: "ops.manual",
};

describe("reactivatePrincipal", () => {
	test("recovery emits audited reactivated event and restores query visibility", async () => {
		const repository = createInMemoryPrincipalRepository([suspendedPrincipal]);
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const reactivated = await reactivatePrincipal(
			{ repository, unitOfWork },
			{
				principalId: suspendedPrincipal.id,
				actorPrincipalId: "22222222-2222-4222-8222-222222222222",
			},
		);
		expect(reactivated.status).toBe("active");
		expect(published[0]?.eventType).toBe(IDENTITY_EVENT_TYPES.PRINCIPAL_REACTIVATED);
		expect(published[0]?.payload).toMatchObject({
			principalId: suspendedPrincipal.id,
			actorPrincipalId: "22222222-2222-4222-8222-222222222222",
		});
		expect(await getPrincipalById(repository, suspendedPrincipal.id)).not.toBeNull();
	});

	test("re-reactivate is idempotent without duplicate event", async () => {
		const activePrincipal: Principal = {
			...suspendedPrincipal,
			status: "active",
			suspendedAt: null,
			suspensionReason: null,
		};
		const repository = createInMemoryPrincipalRepository([activePrincipal]);
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const result = await reactivatePrincipal(
			{ repository, unitOfWork },
			{ principalId: activePrincipal.id },
		);
		expect(result.status).toBe("active");
		expect(published).toHaveLength(0);
	});

	test("unknown principal fails closed", async () => {
		const repository = createInMemoryPrincipalRepository();
		const { unitOfWork } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		await expect(
			reactivatePrincipal(
				{ repository, unitOfWork },
				{ principalId: "00000000-0000-4000-8000-000000000000" },
			),
		).rejects.toBeInstanceOf(IdentityCommandError);
	});
});
