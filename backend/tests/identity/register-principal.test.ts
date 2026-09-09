import { describe, expect, test } from "bun:test";
import { IDENTITY_EVENT_TYPES } from "@anxionos/contracts/identity";
import { registerPrincipal } from "@anxionos/identity";
import {
	createInMemoryPrincipalRepository,
	createInMemoryServiceIdentityRepository,
	createRecordingUnitOfWork,
} from "./test-support";

describe("registerPrincipal", () => {
	test("creates principal and emits registered event once", async () => {
		const repository = createInMemoryPrincipalRepository();
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const principal = await registerPrincipal(
			{ repository, unitOfWork },
			{ authUserId: "auth-1", email: "owner@example.com" },
		);
		expect(principal.email).toBe("owner@example.com");
		expect(published).toHaveLength(1);
		expect(published[0]?.eventType).toBe(IDENTITY_EVENT_TYPES.PRINCIPAL_REGISTERED);
		expect(published[0]?.payload).not.toHaveProperty("authUserId");
	});

	test("rejects email already registered to another auth user", async () => {
		const repository = createInMemoryPrincipalRepository();
		const { unitOfWork } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		await registerPrincipal(
			{ repository, unitOfWork },
			{ authUserId: "auth-existing", email: "taken@example.com" },
		);
		await expect(
			registerPrincipal(
				{ repository, unitOfWork },
				{ authUserId: "auth-new", email: "taken@example.com" },
			),
		).rejects.toMatchObject({ identityCode: "PRINCIPAL_EMAIL_TAKEN" });
	});

	test("replay by authUserId is idempotent without second event", async () => {
		const repository = createInMemoryPrincipalRepository();
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const first = await registerPrincipal(
			{ repository, unitOfWork },
			{ authUserId: "auth-1", email: "owner@example.com" },
		);
		const second = await registerPrincipal(
			{ repository, unitOfWork },
			{ authUserId: "auth-1", email: "owner@example.com" },
		);
		expect(second.id).toBe(first.id);
		expect(published).toHaveLength(1);
	});
});
