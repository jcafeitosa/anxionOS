import { describe, expect, test } from "bun:test";
import { IDENTITY_EVENT_TYPES } from "@anxionos/contracts/identity";
import {
	type CommandJournalRepository,
	type Principal,
	suspendPrincipal,
} from "@anxionos/identity";
import {
	createInMemoryCommandJournal,
	createInMemoryPrincipalRepository,
	createInMemoryServiceIdentityRepository,
	createRecordingUnitOfWork,
} from "./test-support";

const commandId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherCommandId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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

describe("identity command idempotency (R04)", () => {
	test("repeating a commandId replays the applied state without a second event", async () => {
		const repository = createInMemoryPrincipalRepository([activePrincipal]);
		const { unitOfWork, published, commandJournal } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);

		const first = await suspendPrincipal(
			{ repository, unitOfWork },
			{ principalId: activePrincipal.id, reasonCode: "ops.manual", commandId },
		);
		const second = await suspendPrincipal(
			{ repository, unitOfWork },
			{ principalId: activePrincipal.id, reasonCode: "ops.manual", commandId },
		);

		expect(first.status).toBe("suspended");
		expect(second.status).toBe("suspended");
		expect(second.revision).toBe(first.revision);
		const suspendEvents = published.filter(
			(event) => event.eventType === IDENTITY_EVENT_TYPES.PRINCIPAL_SUSPENDED,
		);
		expect(suspendEvents).toHaveLength(1);
		expect(await commandJournal.findByCommandId(commandId)).not.toBeNull();
	});

	test("a distinct commandId on an already-suspended principal is a no-op", async () => {
		const repository = createInMemoryPrincipalRepository([activePrincipal]);
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		await suspendPrincipal(
			{ repository, unitOfWork },
			{ principalId: activePrincipal.id, reasonCode: "ops.manual", commandId },
		);
		await suspendPrincipal(
			{ repository, unitOfWork },
			{
				principalId: activePrincipal.id,
				reasonCode: "ops.manual",
				commandId: otherCommandId,
			},
		);
		expect(
			published.filter(
				(event) => event.eventType === IDENTITY_EVENT_TYPES.PRINCIPAL_SUSPENDED,
			),
		).toHaveLength(1);
	});

	test("maps a concurrent journal primary-key collision to IDN_DUPLICATE_IDEMPOTENCY", async () => {
		const repository = createInMemoryPrincipalRepository([activePrincipal]);
		const baseJournal = createInMemoryCommandJournal();
		// Forma REAL do erro no drizzle 0.45: o codigo vem em `cause`, nao no
		// topo. Um fake com `code` no topo passaria mesmo com o unwrap quebrado.
		const collidingJournal: CommandJournalRepository = {
			findByCommandId: (id) => baseJournal.findByCommandId(id),
			async record() {
				const databaseError = Object.assign(new Error("duplicate key value"), {
					code: "23505",
				});
				throw Object.assign(new Error("Failed query"), {
					name: "DrizzleQueryError",
					cause: databaseError,
				});
			},
		};
		const { unitOfWork } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
			{ commandJournal: collidingJournal },
		);

		await expect(
			suspendPrincipal(
				{ repository, unitOfWork },
				{
					principalId: activePrincipal.id,
					reasonCode: "ops.manual",
					commandId,
				},
			),
		).rejects.toMatchObject({ identityCode: "IDN_DUPLICATE_IDEMPOTENCY" });
	});

	test("rejects a divergent expectedRevision with IDN_REVISION_CONFLICT and zero writes", async () => {
		const repository = createInMemoryPrincipalRepository([activePrincipal]);
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		await expect(
			suspendPrincipal(
				{ repository, unitOfWork },
				{
					principalId: activePrincipal.id,
					reasonCode: "ops.manual",
					expectedRevision: 7,
				},
			),
		).rejects.toMatchObject({ identityCode: "IDN_REVISION_CONFLICT" });
		const stored = await repository.findById(activePrincipal.id);
		expect(stored?.status).toBe("active");
		expect(stored?.revision).toBe(1);
		expect(published).toHaveLength(0);
	});

	test("accepts a matching expectedRevision and advances the revision exactly once", async () => {
		const repository = createInMemoryPrincipalRepository([activePrincipal]);
		const { unitOfWork } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const suspended = await suspendPrincipal(
			{ repository, unitOfWork },
			{
				principalId: activePrincipal.id,
				reasonCode: "ops.manual",
				expectedRevision: 1,
				commandId,
			},
		);
		expect(suspended.revision).toBe(2);
	});
});
