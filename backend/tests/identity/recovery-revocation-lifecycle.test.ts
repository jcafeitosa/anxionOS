import { describe, expect, test } from "bun:test";
import { IDENTITY_EVENT_TYPES } from "@anxionos/contracts/identity";
import {
	getPrincipalByAuthUserId,
	getPrincipalById,
	type Principal,
	reactivatePrincipal,
	registerServiceIdentity,
	revokePrincipal,
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
	kind: "human",
	status: "active",
	revision: 1,
	createdAt: new Date("2026-09-08T12:00:00.000Z"),
	suspendedAt: null,
	suspensionReason: null,
	revokedAt: null,
	revocationReason: null,
};

describe("identity recovery/revocation lifecycle", () => {
	test("suspend is reversible for the service identity; revoke is terminal", async () => {
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

		// SUSPEND: principal hidden, service identity survives (R03 reversible).
		await suspendPrincipal(
			{ repository, unitOfWork },
			{ principalId: activePrincipal.id, reasonCode: "ops.manual" },
		);
		expect(await getPrincipalById(repository, activePrincipal.id)).toBeNull();
		expect(
			(await serviceIdentityRepository.findById(serviceIdentity.id))?.status,
		).toBe("active");

		// REACTIVATE: principal visible again, identity untouched.
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

		const reactivatedEvents = published.filter(
			(event) => event.eventType === IDENTITY_EVENT_TYPES.PRINCIPAL_REACTIVATED,
		);
		expect(reactivatedEvents).toHaveLength(1);
		expect(reactivatedEvents[0]?.payload).toMatchObject({
			principalId: activePrincipal.id,
			actorPrincipalId: "33333333-3333-4333-8333-333333333333",
		});

		// REVOKE: terminal — principal hidden and the service identity dies.
		await revokePrincipal(
			{ repository, unitOfWork },
			{ principalId: activePrincipal.id, reasonCode: "security.incident" },
		);
		expect(await getPrincipalById(repository, activePrincipal.id)).toBeNull();
		expect(
			(await serviceIdentityRepository.findById(serviceIdentity.id))?.status,
		).toBe("revoked");
		expect(
			published.filter(
				(event) => event.eventType === IDENTITY_EVENT_TYPES.PRINCIPAL_REVOKED,
			),
		).toHaveLength(1);

		// REVOKED cannot be reactivated.
		await expect(
			reactivatePrincipal(
				{ repository, unitOfWork },
				{ principalId: activePrincipal.id },
			),
		).rejects.toMatchObject({ identityCode: "IDN_PRINCIPAL_REVOKED" });
	});

	test("revoked principal fails closed for consumers (INV-IDN-01)", async () => {
		const revoked: Principal = {
			...activePrincipal,
			status: "revoked",
			revision: 3,
			revokedAt: new Date("2026-09-08T13:00:00.000Z"),
			revocationReason: "security.incident",
		};
		const repository = createInMemoryPrincipalRepository([revoked]);
		// A revoked principal must not resolve as valid through the public queries
		// used by organization guards (`assertPrincipalExists`) and by session
		// resolution — otherwise a revoked actor would pass those checks.
		expect(await getPrincipalById(repository, revoked.id)).toBeNull();
		expect(await getPrincipalByAuthUserId(repository, "auth-1")).toBeNull();
	});
});
