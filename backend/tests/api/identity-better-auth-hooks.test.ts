import { describe, expect, test } from "bun:test";
import { IDENTITY_EVENT_TYPES } from "@anxionos/contracts/identity";
import { createIdentityBetterAuthDatabaseHooks } from "../../apps/api/src/auth/identity-better-auth-hooks";
import {
	createInMemoryPrincipalRepository,
	createInMemoryServiceIdentityRepository,
	createRecordingUnitOfWork,
} from "../identity/test-support";

describe("identity Better Auth database hooks", () => {
	test("user.create.after registers principal on signup", async () => {
		const repository = createInMemoryPrincipalRepository();
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const hooks = createIdentityBetterAuthDatabaseHooks({ repository, unitOfWork });
		await hooks.user.create.after({
			id: "better-auth-user-1",
			email: "signup@example.com",
		});
		const principal = await repository.findByAuthUserId("better-auth-user-1");
		expect(principal?.email).toBe("signup@example.com");
		expect(published[0]?.eventType).toBe(IDENTITY_EVENT_TYPES.PRINCIPAL_REGISTERED);
	});

	test("user.update.after syncs principal email when linked", async () => {
		const repository = createInMemoryPrincipalRepository();
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const hooks = createIdentityBetterAuthDatabaseHooks({ repository, unitOfWork });
		await hooks.user.create.after({
			id: "better-auth-user-2",
			email: "before@example.com",
		});
		published.length = 0;
		await hooks.user.update.after({
			id: "better-auth-user-2",
			email: "after@example.com",
		});
		const principal = await repository.findByAuthUserId("better-auth-user-2");
		expect(principal?.email).toBe("after@example.com");
		expect(published[0]?.eventType).toBe(IDENTITY_EVENT_TYPES.PRINCIPAL_EMAIL_UPDATED);
	});

	test("user.update.after is no-op when principal is not linked", async () => {
		const repository = createInMemoryPrincipalRepository();
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const hooks = createIdentityBetterAuthDatabaseHooks({ repository, unitOfWork });
		await hooks.user.update.after({
			id: "orphan-auth-user",
			email: "orphan@example.com",
		});
		expect(published).toHaveLength(0);
	});
});
