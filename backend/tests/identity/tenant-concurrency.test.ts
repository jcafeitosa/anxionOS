/** Scope: in-memory repositories only — not PostgreSQL advisory-lock concurrency. */
import { describe, expect, test } from "bun:test";
import { IDENTITY_EVENT_TYPES } from "@anxionos/contracts/identity";
import {
	getPrincipalByAuthUserId,
	type Principal,
	reactivatePrincipal,
	registerPrincipal,
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

describe("identity tenant/concurrency", () => {
	test("concurrent register with same authUserId yields one principal", async () => {
		const repository = createInMemoryPrincipalRepository();
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const results = await Promise.all(
			Array.from({ length: 5 }, () =>
				registerPrincipal(
					{ repository, unitOfWork },
					{ authUserId: "tenant-auth-1", email: "tenant@example.com" },
				),
			),
		);
		const uniqueIds = new Set(results.map((principal) => principal.id));
		expect(uniqueIds.size).toBe(1);
		expect(published.length).toBeGreaterThanOrEqual(1);
		expect(published.length).toBeLessThanOrEqual(5);
		const registeredEvents = published.filter(
			(event) => event.eventType === IDENTITY_EVENT_TYPES.PRINCIPAL_REGISTERED,
		);
		expect(registeredEvents).toHaveLength(1);
	});

	test("INV-IDN-07: principal is global — distinct auth users get distinct principals", async () => {
		const repository = createInMemoryPrincipalRepository();
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const results = await Promise.all(
			Array.from({ length: 3 }, (_, index) =>
				registerPrincipal(
					{ repository, unitOfWork },
					{
						authUserId: `agency-a-auth-${index}`,
						email: `member-${index}@agency-a.example.com`,
					},
				),
			),
		);
		expect(new Set(results.map((principal) => principal.id)).size).toBe(3);
		expect(new Set(results.map((principal) => principal.authUserId)).size).toBe(
			3,
		);
		expect(
			published.filter(
				(event) =>
					event.eventType === IDENTITY_EVENT_TYPES.PRINCIPAL_REGISTERED,
			),
		).toHaveLength(3);
	});

	test("same authUserId from parallel callers resolves to one global principal", async () => {
		const repository = createInMemoryPrincipalRepository();
		const { unitOfWork } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const results = await Promise.all(
			Array.from({ length: 4 }, () =>
				registerPrincipal(
					{ repository, unitOfWork },
					{
						authUserId: "global-auth-subject",
						email: "global@example.com",
					},
				),
			),
		);
		const principalId = results[0]?.id;
		expect(principalId).toBeDefined();
		for (const principal of results) {
			expect(principal.id).toBe(principalId);
		}
		expect(
			await getPrincipalByAuthUserId(repository, "global-auth-subject"),
		).toMatchObject({ id: principalId });
	});

	test("concurrent register with same email rejects duplicates (global uniqueness)", async () => {
		const repository = createInMemoryPrincipalRepository();
		const { unitOfWork } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const outcomes = await Promise.allSettled(
			Array.from({ length: 4 }, (_, index) =>
				registerPrincipal(
					{ repository, unitOfWork },
					{
						authUserId: `auth-email-race-${index}`,
						email: "shared-global@example.com",
					},
				),
			),
		);
		const fulfilled = outcomes.filter(
			(outcome): outcome is PromiseFulfilledResult<Principal> =>
				outcome.status === "fulfilled",
		);
		const rejected = outcomes.filter(
			(outcome): outcome is PromiseRejectedResult =>
				outcome.status === "rejected",
		);
		expect(fulfilled).toHaveLength(1);
		expect(rejected).toHaveLength(3);
		for (const outcome of rejected) {
			expect(outcome.reason).toMatchObject({
				identityCode: "PRINCIPAL_EMAIL_TAKEN",
			});
		}
	});

	test("concurrent suspend yields one suspend event cluster", async () => {
		const repository = createInMemoryPrincipalRepository([activePrincipal]);
		const serviceIdentityRepository = createInMemoryServiceIdentityRepository();
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			serviceIdentityRepository,
		);
		await registerServiceIdentity(
			{ repository, unitOfWork },
			{ principalId: activePrincipal.id, label: "worker-race" },
		);
		published.length = 0;

		const results = await Promise.all(
			Array.from({ length: 5 }, () =>
				suspendPrincipal(
					{ repository, unitOfWork },
					{ principalId: activePrincipal.id, reasonCode: "ops.manual" },
				),
			),
		);
		expect(new Set(results.map((principal) => principal.id)).size).toBe(1);
		expect(results.every((principal) => principal.status === "suspended")).toBe(
			true,
		);
		const suspendedEvents = published.filter(
			(event) => event.eventType === IDENTITY_EVENT_TYPES.PRINCIPAL_SUSPENDED,
		);
		expect(suspendedEvents).toHaveLength(1);
		const revokedEvents = published.filter(
			(event) =>
				event.eventType === IDENTITY_EVENT_TYPES.SERVICE_IDENTITY_REVOKED,
		);
		expect(revokedEvents).toHaveLength(1);
	});

	test("concurrent reactivate on suspended principal yields one reactivated event", async () => {
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
		const results = await Promise.all(
			Array.from({ length: 5 }, () =>
				reactivatePrincipal(
					{ repository, unitOfWork },
					{
						principalId: suspendedPrincipal.id,
						actorPrincipalId: "33333333-3333-4333-8333-333333333333",
					},
				),
			),
		);
		expect(new Set(results.map((principal) => principal.id)).size).toBe(1);
		expect(results.every((principal) => principal.status === "active")).toBe(
			true,
		);
		const reactivatedEvents = published.filter(
			(event) => event.eventType === IDENTITY_EVENT_TYPES.PRINCIPAL_REACTIVATED,
		);
		expect(reactivatedEvents).toHaveLength(1);
	});

	test("concurrent service identity registration creates distinct identities", async () => {
		const repository = createInMemoryPrincipalRepository([activePrincipal]);
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const results = await Promise.all(
			Array.from({ length: 4 }, (_, index) =>
				registerServiceIdentity(
					{ repository, unitOfWork },
					{ principalId: activePrincipal.id, label: `worker-${index}` },
				),
			),
		);
		expect(new Set(results.map((identity) => identity.id)).size).toBe(4);
		expect(
			published.filter(
				(event) =>
					event.eventType === IDENTITY_EVENT_TYPES.SERVICE_IDENTITY_REGISTERED,
			),
		).toHaveLength(4);
	});
});
