import { describe, expect, test } from "bun:test";
import { IDENTITY_EVENT_TYPES } from "@anxionos/contracts/identity";
import {
	getPrincipalById,
	suspendPrincipal,
	type Principal,
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

describe("suspendPrincipal", () => {
	test("suspends active principal and hides it from queries", async () => {
		const repository = createInMemoryPrincipalRepository([activePrincipal]);
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const suspended = await suspendPrincipal(
			{ repository, unitOfWork },
			{ principalId: activePrincipal.id, reasonCode: "ops.manual" },
		);
		expect(suspended.status).toBe("suspended");
		expect(published[0]?.eventType).toBe(IDENTITY_EVENT_TYPES.PRINCIPAL_SUSPENDED);
		expect(await getPrincipalById(repository, activePrincipal.id)).toBeNull();
	});

	test("re-suspend is idempotent without duplicate event", async () => {
		const suspendedPrincipal: Principal = {
			...activePrincipal,
			status: "suspended",
			suspendedAt: new Date("2026-09-08T12:00:00.000Z"),
			suspensionReason: "ops.manual",
		};
		const repository = createInMemoryPrincipalRepository([suspendedPrincipal]);
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const result = await suspendPrincipal(
			{ repository, unitOfWork },
			{ principalId: suspendedPrincipal.id, reasonCode: "ops.manual" },
		);
		expect(result.status).toBe("suspended");
		expect(published).toHaveLength(0);
	});
});
