import { describe, expect, test } from "bun:test";
import { IDENTITY_EVENT_TYPES } from "@anxionos/contracts/identity";
import {
	type Principal,
	getPrincipalById,
	reactivatePrincipal,
	registerServiceIdentity,
	suspendPrincipal,
} from "@anxionos/identity";
import {
	createInMemoryPrincipalRepository,
	createInMemoryServiceIdentityRepository,
	createRecordingUnitOfWork,
} from "./test-support";

const activePrincipal: Principal = {
	id: "11111111-1111-4111-8111-111111111111",
	authUserId: "auth-1",
	email: "owner@example.com",
	status: "active",
	createdAt: new Date("2026-09-08T12:00:00.000Z"),
	suspendedAt: null,
	suspensionReason: null,
};

describe("identity recovery/revocation lifecycle", () => {
	test("suspend cascades service identity revocation; recovery restores principal only", async () => {
		const repository = createInMemoryPrincipalRepository([activePrincipal]);
		const serviceIdentityRepository = createInMemoryServiceIdentityRepository();
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			serviceIdentityRepository,
		);
		const serviceIdentity = await registerServiceIdentity(
			{ repository, unitOfWork },
			{ principalId: activePrincipal.id, label: "worker-a" },
		);
		published.length = 0;

		await suspendPrincipal(
			{ repository, unitOfWork },
			{ principalId: activePrincipal.id, reasonCode: "ops.manual" },
		);
		expect(await getPrincipalById(repository, activePrincipal.id)).toBeNull();
		const revoked = await serviceIdentityRepository.findById(
			serviceIdentity.id,
		);
		expect(revoked?.status).toBe("revoked");

		const reactivated = await reactivatePrincipal(
			{ repository, unitOfWork },
			{
				principalId: activePrincipal.id,
				actorPrincipalId: "33333333-3333-4333-8333-333333333333",
			},
		);
		expect(reactivated.status).toBe("active");
		expect(
			await getPrincipalById(repository, activePrincipal.id),
		).not.toBeNull();
		const stillRevoked = await serviceIdentityRepository.findById(
			serviceIdentity.id,
		);
		expect(stillRevoked?.status).toBe("revoked");

		const reactivatedEvents = published.filter(
			(event) => event.eventType === IDENTITY_EVENT_TYPES.PRINCIPAL_REACTIVATED,
		);
		expect(reactivatedEvents).toHaveLength(1);
		expect(reactivatedEvents[0]?.payload).toMatchObject({
			principalId: activePrincipal.id,
			actorPrincipalId: "33333333-3333-4333-8333-333333333333",
		});
	});
});
