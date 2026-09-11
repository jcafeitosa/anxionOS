import { describe, expect, test } from "bun:test";
import { IDENTITY_EVENT_TYPES } from "@anxionos/contracts/identity";
import {
	getPrincipalById,
	type Principal,
	type ServiceIdentity,
	suspendPrincipal,
} from "@anxionos/identity";
import { IdentityCommandError } from "../../modules/identity/src/application/errors";
import {
	createInMemoryPrincipalRepository,
	createInMemoryServiceCredentialRepository,
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
		expect(published[0]?.eventType).toBe(
			IDENTITY_EVENT_TYPES.PRINCIPAL_SUSPENDED,
		);
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

	test("cascade revokes active credentials but keeps the service identity (suspend is reversible)", async () => {
		const serviceIdentity: ServiceIdentity = {
			id: "22222222-2222-4222-8222-222222222222",
			principalId: activePrincipal.id,
			label: "worker-a",
			status: "active",
			createdAt: new Date("2026-09-08T12:00:00.000Z"),
			revokedAt: null,
		};
		const repository = createInMemoryPrincipalRepository([activePrincipal]);
		const serviceIdentityRepository = createInMemoryServiceIdentityRepository([
			serviceIdentity,
		]);
		const serviceCredentialRepository =
			createInMemoryServiceCredentialRepository([
				{
					id: "44444444-4444-4444-8444-444444444444",
					serviceIdentityId: serviceIdentity.id,
					prefix: "anxabcdefghi",
					secretHash: "scrypt$salt$hash",
					status: "active",
					issuedAt: new Date("2026-09-08T12:00:00.000Z"),
					expiresAt: null,
					rotatedAt: null,
					rotatedToId: null,
					revokedAt: null,
				},
			]);
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			serviceIdentityRepository,
			{ serviceCredentialRepository },
		);
		await suspendPrincipal(
			{ repository, unitOfWork },
			{ principalId: activePrincipal.id, reasonCode: "ops.manual" },
		);
		expect(published).toHaveLength(2);
		expect(published[0]?.eventType).toBe(
			IDENTITY_EVENT_TYPES.PRINCIPAL_SUSPENDED,
		);
		expect(published[1]?.eventType).toBe(
			IDENTITY_EVENT_TYPES.SERVICE_CREDENTIAL_REVOKED,
		);
		// The identity survives suspension so credentials can be reissued after
		// reactivation (R03: suspend is reversible).
		const identity = await serviceIdentityRepository.findById(
			serviceIdentity.id,
		);
		expect(identity?.status).toBe("active");
		const credential = await serviceCredentialRepository.findById(
			"44444444-4444-4444-8444-444444444444",
		);
		expect(credential?.status).toBe("revoked");
		expect(credential?.revokedAt).not.toBeNull();
	});

	test("revokes Better Auth sessions synchronously on suspend (ANX-235)", async () => {
		const repository = createInMemoryPrincipalRepository([activePrincipal]);
		const { unitOfWork } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const revoked: string[] = [];
		await suspendPrincipal(
			{
				repository,
				unitOfWork,
				sessionRevoker: {
					async revokeAllForAuthUser(authUserId) {
						revoked.push(authUserId);
						return [];
					},
				},
			},
			{ principalId: activePrincipal.id, reasonCode: "ops.manual" },
		);
		expect(revoked).toEqual([activePrincipal.authUserId]);
	});

	test("idempotent re-suspend does not call session revoker", async () => {
		const suspendedPrincipal: Principal = {
			...activePrincipal,
			status: "suspended",
			suspendedAt: new Date("2026-09-08T12:00:00.000Z"),
			suspensionReason: "ops.manual",
		};
		const repository = createInMemoryPrincipalRepository([suspendedPrincipal]);
		const { unitOfWork } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		let revokeCalls = 0;
		await suspendPrincipal(
			{
				repository,
				unitOfWork,
				sessionRevoker: {
					async revokeAllForAuthUser() {
						revokeCalls += 1;
						return [];
					},
				},
			},
			{ principalId: suspendedPrincipal.id, reasonCode: "ops.manual" },
		);
		expect(revokeCalls).toBe(0);
	});

	test("unknown principal fails closed", async () => {
		const repository = createInMemoryPrincipalRepository();
		const { unitOfWork } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		await expect(
			suspendPrincipal(
				{ repository, unitOfWork },
				{
					principalId: "00000000-0000-4000-8000-000000000000",
					reasonCode: "ops.manual",
				},
			),
		).rejects.toBeInstanceOf(IdentityCommandError);
	});
});
