import { describe, expect, test } from "bun:test";
import { IDENTITY_EVENT_TYPES } from "@anxionos/contracts/identity";
import {
	createServiceCredentialCrypto,
	issueServiceCredential,
	listServiceCredentials,
	type Principal,
	revokeServiceCredential,
	rotateServiceCredential,
	type ServiceIdentity,
	verifyServiceCredential,
} from "@anxionos/identity";
import {
	createInMemoryPrincipalRepository,
	createInMemoryServiceCredentialRepository,
	createInMemoryServiceIdentityRepository,
	createRecordingUnitOfWork,
} from "./test-support";

const commandId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const rotateCommandId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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

const serviceIdentity: ServiceIdentity = {
	id: "22222222-2222-4222-8222-222222222222",
	principalId: activePrincipal.id,
	label: "worker-a",
	status: "active",
	createdAt: new Date("2026-09-08T12:00:00.000Z"),
	revokedAt: null,
};

function harness(
	identity: ServiceIdentity = serviceIdentity,
	journalSeed?: ReturnType<typeof createRecordingUnitOfWork>["commandJournal"],
) {
	const principalRepository = createInMemoryPrincipalRepository([
		activePrincipal,
	]);
	const serviceIdentityRepository = createInMemoryServiceIdentityRepository([
		identity,
	]);
	const serviceCredentialRepository =
		createInMemoryServiceCredentialRepository();
	const recording = createRecordingUnitOfWork(
		principalRepository,
		serviceIdentityRepository,
		{
			serviceCredentialRepository,
			commandJournal: journalSeed,
		},
	);
	return {
		...recording,
		serviceIdentityRepository,
		principalRepository,
		serviceCredentialRepository,
		crypto: createServiceCredentialCrypto(),
	};
}

describe("service credentials", () => {
	test("issuing returns the secret once and persists only the hash", async () => {
		const h = harness();
		const issued = await issueServiceCredential(
			{
				serviceIdentityRepository: h.serviceIdentityRepository,
				serviceCredentialRepository: h.serviceCredentialRepository,
				commandJournal: h.commandJournal,
				unitOfWork: h.unitOfWork,
				crypto: h.crypto,
			},
			{ serviceIdentityId: serviceIdentity.id, commandId },
		);

		expect(issued.secret).toMatch(/^anx[a-z0-9]{9}\./);
		expect(issued.idempotentReplay).toBe(false);
		expect(issued.credential.status).toBe("active");

		const stored = await h.serviceCredentialRepository.findById(
			issued.credential.credentialId,
		);
		expect(stored?.secretHash).not.toBe(issued.secret);
		expect(stored?.secretHash.startsWith("scrypt$")).toBe(true);
		// The plaintext key must not appear anywhere in persisted state or events.
		const serialized = JSON.stringify({ stored, published: h.published });
		expect(serialized).not.toContain(issued.secret.split(".")[1]);

		const issuedEvents = h.published.filter(
			(event) =>
				event.eventType === IDENTITY_EVENT_TYPES.SERVICE_CREDENTIAL_ISSUED,
		);
		expect(issuedEvents).toHaveLength(1);
		expect(issuedEvents[0]?.payload).toMatchObject({
			credentialId: issued.credential.credentialId,
			serviceIdentityId: serviceIdentity.id,
		});
	});

	test("replaying the commandId never reissues a secret", async () => {
		const h = harness();
		const deps = {
			serviceIdentityRepository: h.serviceIdentityRepository,
			serviceCredentialRepository: h.serviceCredentialRepository,
			commandJournal: h.commandJournal,
			unitOfWork: h.unitOfWork,
			crypto: h.crypto,
		};
		const first = await issueServiceCredential(deps, {
			serviceIdentityId: serviceIdentity.id,
			commandId,
		});
		const replay = await issueServiceCredential(deps, {
			serviceIdentityId: serviceIdentity.id,
			commandId,
		});

		expect(replay.idempotentReplay).toBe(true);
		expect(replay.secret).toBe("");
		expect(replay.credential.credentialId).toBe(first.credential.credentialId);
		expect(
			h.published.filter(
				(event) =>
					event.eventType === IDENTITY_EVENT_TYPES.SERVICE_CREDENTIAL_ISSUED,
			),
		).toHaveLength(1);
	});

	test("refuses to issue for a revoked service identity", async () => {
		const h = harness({
			...serviceIdentity,
			status: "revoked",
			revokedAt: new Date(),
		});
		await expect(
			issueServiceCredential(
				{
					serviceIdentityRepository: h.serviceIdentityRepository,
					serviceCredentialRepository: h.serviceCredentialRepository,
					commandJournal: h.commandJournal,
					unitOfWork: h.unitOfWork,
					crypto: h.crypto,
				},
				{ serviceIdentityId: serviceIdentity.id },
			),
		).rejects.toMatchObject({
			identityCode: "IDN_SERVICE_IDENTITY_ALREADY_REVOKED",
		});
	});

	test("verify accepts the issued key and rejects wrong secret and prefix", async () => {
		const h = harness();
		const issued = await issueServiceCredential(
			{
				serviceIdentityRepository: h.serviceIdentityRepository,
				serviceCredentialRepository: h.serviceCredentialRepository,
				commandJournal: h.commandJournal,
				unitOfWork: h.unitOfWork,
				crypto: h.crypto,
			},
			{ serviceIdentityId: serviceIdentity.id },
		);
		const deps = {
			serviceCredentialRepository: h.serviceCredentialRepository,
			crypto: h.crypto,
		};

		const ok = await verifyServiceCredential(deps, issued.secret);
		expect(ok.valid).toBe(true);
		if (ok.valid) {
			expect(ok.serviceIdentityId).toBe(serviceIdentity.id);
		}
		expect(await verifyServiceCredential(deps, "sem-formato")).toEqual({
			valid: false,
			reason: "malformed",
		});
		expect(await verifyServiceCredential(deps, "anxnaoexiste0.secret")).toEqual(
			{ valid: false, reason: "not_found" },
		);
		expect(
			await verifyServiceCredential(deps, `${issued.secret}tampered`),
		).toEqual({ valid: false, reason: "mismatch" });
	});

	test("rotation supersedes the previous key without a double-valid window", async () => {
		const h = harness();
		const deps = {
			serviceIdentityRepository: h.serviceIdentityRepository,
			serviceCredentialRepository: h.serviceCredentialRepository,
			commandJournal: h.commandJournal,
			unitOfWork: h.unitOfWork,
			crypto: h.crypto,
		};
		const first = await issueServiceCredential(deps, {
			serviceIdentityId: serviceIdentity.id,
		});
		const rotated = await rotateServiceCredential(deps, {
			serviceIdentityId: serviceIdentity.id,
			commandId: rotateCommandId,
		});

		expect(rotated.replacedCredentialIds).toEqual([
			first.credential.credentialId,
		]);
		const verifyDeps = {
			serviceCredentialRepository: h.serviceCredentialRepository,
			crypto: h.crypto,
		};
		expect(await verifyServiceCredential(verifyDeps, first.secret)).toEqual({
			valid: false,
			reason: "rotated",
		});
		expect(
			(await verifyServiceCredential(verifyDeps, rotated.secret)).valid,
		).toBe(true);
		expect(
			h.published.filter(
				(event) =>
					event.eventType === IDENTITY_EVENT_TYPES.SERVICE_CREDENTIAL_ROTATED,
			),
		).toHaveLength(1);
	});

	test("rotation fails closed without an active credential", async () => {
		const h = harness();
		await expect(
			rotateServiceCredential(
				{
					serviceIdentityRepository: h.serviceIdentityRepository,
					serviceCredentialRepository: h.serviceCredentialRepository,
					commandJournal: h.commandJournal,
					unitOfWork: h.unitOfWork,
					crypto: h.crypto,
				},
				{ serviceIdentityId: serviceIdentity.id },
			),
		).rejects.toMatchObject({ identityCode: "IDN_CREDENTIAL_NOT_FOUND" });
	});

	test("revoking invalidates the key and is idempotent", async () => {
		const h = harness();
		const issued = await issueServiceCredential(
			{
				serviceIdentityRepository: h.serviceIdentityRepository,
				serviceCredentialRepository: h.serviceCredentialRepository,
				commandJournal: h.commandJournal,
				unitOfWork: h.unitOfWork,
				crypto: h.crypto,
			},
			{ serviceIdentityId: serviceIdentity.id },
		);
		const revokeDeps = {
			serviceCredentialRepository: h.serviceCredentialRepository,
			unitOfWork: h.unitOfWork,
		};
		await revokeServiceCredential(revokeDeps, {
			credentialId: issued.credential.credentialId,
		});
		await revokeServiceCredential(revokeDeps, {
			credentialId: issued.credential.credentialId,
		});

		expect(
			h.published.filter(
				(event) =>
					event.eventType === IDENTITY_EVENT_TYPES.SERVICE_CREDENTIAL_REVOKED,
			),
		).toHaveLength(1);
		expect(
			await verifyServiceCredential(
				{
					serviceCredentialRepository: h.serviceCredentialRepository,
					crypto: h.crypto,
				},
				issued.secret,
			),
		).toEqual({ valid: false, reason: "revoked" });
	});

	test("listing never exposes the hash", async () => {
		const h = harness();
		const issued = await issueServiceCredential(
			{
				serviceIdentityRepository: h.serviceIdentityRepository,
				serviceCredentialRepository: h.serviceCredentialRepository,
				commandJournal: h.commandJournal,
				unitOfWork: h.unitOfWork,
				crypto: h.crypto,
			},
			{ serviceIdentityId: serviceIdentity.id },
		);
		const listed = await listServiceCredentials(
			{ serviceCredentialRepository: h.serviceCredentialRepository },
			serviceIdentity.id,
		);
		expect(listed).toHaveLength(1);
		expect(Object.keys(listed[0] ?? {})).not.toContain("secretHash");
		expect(JSON.stringify(listed)).not.toContain("scrypt$");
		expect(listed[0]?.credentialId).toBe(issued.credential.credentialId);
	});
});
