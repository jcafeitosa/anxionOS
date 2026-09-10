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
		const hooks = createIdentityBetterAuthDatabaseHooks({
			repository,
			unitOfWork,
		});
		await hooks.user.create.after({
			id: "better-auth-user-1",
			email: "signup@example.com",
		});
		const principal = await repository.findByAuthUserId("better-auth-user-1");
		expect(principal?.email).toBe("signup@example.com");
		expect(published[0]?.eventType).toBe(
			IDENTITY_EVENT_TYPES.PRINCIPAL_REGISTERED,
		);
	});

	test("user.update.after syncs principal email when linked", async () => {
		const repository = createInMemoryPrincipalRepository();
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const hooks = createIdentityBetterAuthDatabaseHooks({
			repository,
			unitOfWork,
		});
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
		expect(published[0]?.eventType).toBe(
			IDENTITY_EVENT_TYPES.PRINCIPAL_EMAIL_UPDATED,
		);
	});

	test("session.create.before blocks session for suspended principal (ANX-234)", async () => {
		const suspendedPrincipal = {
			id: "11111111-1111-4111-8111-111111111111",
			authUserId: "better-auth-user-suspended",
			email: "suspended@example.com",
			status: "suspended" as const,
			createdAt: new Date("2026-09-08T12:00:00.000Z"),
			suspendedAt: new Date("2026-09-08T12:00:00.000Z"),
			suspensionReason: "ops.manual",
		};
		const repository = createInMemoryPrincipalRepository([suspendedPrincipal]);
		const { unitOfWork } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const hooks = createIdentityBetterAuthDatabaseHooks({
			repository,
			unitOfWork,
		});
		const blocked = await hooks.session.create.before({
			userId: "better-auth-user-suspended",
		});
		expect(blocked).toBe(false);
	});

	test("session.create.before allows session for active principal", async () => {
		const activePrincipal = {
			id: "22222222-2222-4222-8222-222222222222",
			authUserId: "better-auth-user-active",
			email: "active@example.com",
			status: "active" as const,
			createdAt: new Date("2026-09-08T12:00:00.000Z"),
			suspendedAt: null,
			suspensionReason: null,
		};
		const repository = createInMemoryPrincipalRepository([activePrincipal]);
		const { unitOfWork } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const hooks = createIdentityBetterAuthDatabaseHooks({
			repository,
			unitOfWork,
		});
		const allowed = await hooks.session.create.before({
			userId: "better-auth-user-active",
		});
		expect(allowed).toBeUndefined();
	});

	test("user.update.after is no-op when principal is not linked", async () => {
		const repository = createInMemoryPrincipalRepository();
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const hooks = createIdentityBetterAuthDatabaseHooks({
			repository,
			unitOfWork,
		});
		await hooks.user.update.after({
			id: "orphan-auth-user",
			email: "orphan@example.com",
		});
		expect(published).toHaveLength(0);
	});
});
