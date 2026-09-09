import { describe, expect, test } from "bun:test";
import { IDENTITY_EVENT_TYPES } from "@anxionos/contracts/identity";
import {
	registerServiceIdentity,
	revokeServiceIdentity,
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

describe("registerServiceIdentity", () => {
	test("registers service identity for active principal", async () => {
		const repository = createInMemoryPrincipalRepository([activePrincipal]);
		const serviceIdentityRepository = createInMemoryServiceIdentityRepository();
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			serviceIdentityRepository,
		);
		const identity = await registerServiceIdentity(
			{ repository, unitOfWork },
			{ principalId: activePrincipal.id, label: "worker-a" },
		);
		expect(identity.label).toBe("worker-a");
		expect(published[0]?.eventType).toBe(
			IDENTITY_EVENT_TYPES.SERVICE_IDENTITY_REGISTERED,
		);
	});
});

describe("revokeServiceIdentity", () => {
	test("revokes active service identity and emits event", async () => {
		const repository = createInMemoryPrincipalRepository([activePrincipal]);
		const serviceIdentityRepository = createInMemoryServiceIdentityRepository();
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			serviceIdentityRepository,
		);
		const created = await registerServiceIdentity(
			{ repository, unitOfWork },
			{ principalId: activePrincipal.id, label: "worker-a" },
		);
		published.length = 0;
		const revoked = await revokeServiceIdentity(
			{ serviceIdentityRepository, unitOfWork },
			{ serviceIdentityId: created.id },
		);
		expect(revoked.status).toBe("revoked");
		expect(published[0]?.eventType).toBe(
			IDENTITY_EVENT_TYPES.SERVICE_IDENTITY_REVOKED,
		);
	});
});
