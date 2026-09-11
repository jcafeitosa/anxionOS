import { describe, expect, test } from "bun:test";
import {
	IDENTITY_EVENT_TYPES,
	identityServiceIdentityRegisteredV1PayloadSchema,
	identityServiceIdentityRevokedV1PayloadSchema,
	registerServiceIdentityCommandSchema,
	revokeServiceIdentityCommandSchema,
} from "@anxionos/contracts/identity";
import {
	type Principal,
	registerServiceIdentity,
	revokeServiceIdentity,
} from "@anxionos/identity";
import { IdentityCommandError } from "../../modules/identity/src/application/errors";
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
	kind: "human",
	revision: 1,
	revokedAt: null,
	revocationReason: null,
};

const suspendedPrincipal: Principal = {
	...activePrincipal,
	status: "suspended",
	suspendedAt: new Date("2026-09-08T12:00:00.000Z"),
	suspensionReason: "ops.manual",
	kind: "human",
	revision: 1,
	revokedAt: null,
	revocationReason: null,
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
		expect(identity.status).toBe("active");
		expect(published).toHaveLength(1);
		expect(published[0]?.eventType).toBe(
			IDENTITY_EVENT_TYPES.SERVICE_IDENTITY_REGISTERED,
		);
		const payload = identityServiceIdentityRegisteredV1PayloadSchema.parse(
			published[0]?.payload,
		);
		expect(payload.serviceIdentityId).toBe(identity.id);
		expect(payload.principalId).toBe(activePrincipal.id);
		expect(payload.label).toBe("worker-a");
	});

	test("rejects suspended principal", async () => {
		const repository = createInMemoryPrincipalRepository([suspendedPrincipal]);
		const { unitOfWork } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		await expect(
			registerServiceIdentity(
				{ repository, unitOfWork },
				{ principalId: suspendedPrincipal.id, label: "worker-a" },
			),
		).rejects.toMatchObject({
			identityCode: "IDN_PRINCIPAL_NOT_FOUND",
		});
	});

	test("unknown principal fails closed", async () => {
		const repository = createInMemoryPrincipalRepository();
		const { unitOfWork } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		await expect(
			registerServiceIdentity(
				{ repository, unitOfWork },
				{
					principalId: "00000000-0000-4000-8000-000000000000",
					label: "worker-a",
				},
			),
		).rejects.toBeInstanceOf(IdentityCommandError);
	});

	test("command schema rejects empty label", () => {
		expect(() =>
			registerServiceIdentityCommandSchema.parse({
				principalId: activePrincipal.id,
				label: "",
			}),
		).toThrow();
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
		expect(revoked.revokedAt).not.toBeNull();
		expect(published).toHaveLength(1);
		expect(published[0]?.eventType).toBe(
			IDENTITY_EVENT_TYPES.SERVICE_IDENTITY_REVOKED,
		);
		const payload = identityServiceIdentityRevokedV1PayloadSchema.parse(
			published[0]?.payload,
		);
		expect(payload.serviceIdentityId).toBe(created.id);
		expect(payload.principalId).toBe(activePrincipal.id);
		expect(payload.revokedAt).toBe(revoked.revokedAt?.toISOString());
	});

	test("re-revoke is idempotent without duplicate event", async () => {
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
		await revokeServiceIdentity(
			{ serviceIdentityRepository, unitOfWork },
			{ serviceIdentityId: created.id },
		);
		published.length = 0;
		const again = await revokeServiceIdentity(
			{ serviceIdentityRepository, unitOfWork },
			{ serviceIdentityId: created.id },
		);
		expect(again.status).toBe("revoked");
		expect(published).toHaveLength(0);
	});

	test("unknown service identity fails closed", async () => {
		const repository = createInMemoryPrincipalRepository([activePrincipal]);
		const serviceIdentityRepository = createInMemoryServiceIdentityRepository();
		const { unitOfWork } = createRecordingUnitOfWork(
			repository,
			serviceIdentityRepository,
		);
		await expect(
			revokeServiceIdentity(
				{ serviceIdentityRepository, unitOfWork },
				{
					serviceIdentityId: "00000000-0000-4000-8000-000000000000",
				},
			),
		).rejects.toMatchObject({
			identityCode: "IDN_SERVICE_IDENTITY_NOT_FOUND",
		});
	});

	test("command schema requires serviceIdentityId uuid", () => {
		expect(() =>
			revokeServiceIdentityCommandSchema.parse({
				serviceIdentityId: "not-a-uuid",
			}),
		).toThrow();
	});
});
