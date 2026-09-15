import { describe, expect, test } from "bun:test";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type {
	CommandJournalRecord,
	CommandJournalRepository,
} from "../../domain/ports/command-journal";
import type {
	AiAccountRecord,
	ConnectionsTransactionContext,
	ConnectionsUnitOfWork,
} from "../../domain/ports/connections-unit-of-work";
import { registerAIAccount } from "./register-ai-account";

const ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";
const PRINCIPAL_ID = "00000000-0000-4000-8000-000000000002";

function createDeps() {
	const accounts = new Map<string, AiAccountRecord>();
	const journal = new Map<string, CommandJournalRecord>();
	const published: DomainEventEnvelope[] = [];
	const commandJournal: CommandJournalRepository = {
		async findByCommandId(organizationId, commandId) {
			return journal.get(`${organizationId}:${commandId}`) ?? null;
		},
		async save(record) {
			journal.set(`${record.organizationId}:${record.commandId}`, record);
		},
	};
	const context: ConnectionsTransactionContext = {
		async lockIdempotencyKey() {},
		commandJournal,
		aiAccounts: {
			async findDraftByNaturalKey(input) {
				return (
					[...accounts.values()].find(
						(account) =>
							account.organizationId === input.organizationId &&
							account.ownerPrincipalId === input.ownerPrincipalId &&
							account.providerId === input.providerId &&
							account.displayName === input.displayName &&
							account.status === "draft",
					) ?? null
				);
			},
			async save(record) {
				accounts.set(record.id, record);
				return record;
			},
		},
		bindings: {
			async findActiveById() {
				return null;
			},
			async save(record) {
				return record;
			},
		},
		inferenceRequests: {
			async findByIdempotencyKey() {
				return null;
			},
			async save(record) {
				return record;
			},
			async update(record) {
				return record;
			},
		},
		usageRecords: { async save() {} },
		async publishEvents(events) {
			published.push(...events);
		},
	};
	const unitOfWork: ConnectionsUnitOfWork = {
		async runInTransaction(work) {
			return work(context);
		},
	};
	return {
		deps: { unitOfWork, commandJournal },
		published,
		accounts,
	};
}

describe("registerAIAccount intent", () => {
	test("rejects divergent command replay without a second account or event", async () => {
		const { deps, accounts, published } = createDeps();
		const commandId = "00000000-0000-4000-8000-000000000010";
		const base = {
			commandId,
			organizationId: ORGANIZATION_ID,
			ownerPrincipalId: PRINCIPAL_ID,
			providerId: "simulated",
			displayName: "Primary account",
			scopes: [],
		};
		const first = await registerAIAccount(deps, base);

		await expect(
			registerAIAccount(deps, { ...base, displayName: "Changed account" }),
		).rejects.toMatchObject({ code: "CX_IDEMPOTENCY_CONFLICT" });
		expect(accounts.size).toBe(1);
		expect(published).toHaveLength(1);
		expect(first.aggregateId).toBe([...accounts.keys()][0]);
	});
});
