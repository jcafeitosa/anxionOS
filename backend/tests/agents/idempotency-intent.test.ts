import { describe, expect, test } from "bun:test";
import {
	hashCommandPayload,
	loadIdempotentCommandResult,
} from "../../modules/agents/src/application/command-support";
import { createInMemoryCommandJournalRepository } from "./test-support";

const tenantId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const commandId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const aggregateId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function createJournal(
	requestHash: string | null = hashCommandPayload({
		displayName: "Original agent",
	}),
) {
	return createInMemoryCommandJournalRepository([
		{
			tenantId,
			commandId,
			commandName: "RegisterAgent",
			aggregateId,
			aggregateType: "Agent",
			revision: 1,
			requestHash,
			responseSnapshot: { aggregateId, revision: 1 },
			createdAt: new Date(),
		},
	]);
}

describe("agents command intent", () => {
	test("rejects divergent payload replay with the institutional conflict", async () => {
		const journal = createJournal();

		await expect(
			loadIdempotentCommandResult(journal, tenantId, commandId, {
				commandName: "RegisterAgent",
				requestHash: hashCommandPayload({
					displayName: "Different agent",
				}),
			}),
		).rejects.toMatchObject({ agentsCode: "AGT_DUPLICATE_IDEMPOTENCY" });
	});

	test("replays the same command intent", async () => {
		const journal = createJournal();

		await expect(
			loadIdempotentCommandResult(journal, tenantId, commandId, {
				commandName: "RegisterAgent",
				requestHash: hashCommandPayload({
					displayName: "Original agent",
				}),
			}),
		).resolves.toMatchObject({
			aggregateId,
			revision: 1,
			idempotentReplay: true,
		});
	});

	test("fails closed for a legacy journal row without a fingerprint", async () => {
		const journal = createJournal(null);

		await expect(
			loadIdempotentCommandResult(journal, tenantId, commandId, {
				commandName: "RegisterAgent",
				requestHash: hashCommandPayload({ displayName: "Original agent" }),
			}),
		).rejects.toMatchObject({ agentsCode: "AGT_DUPLICATE_IDEMPOTENCY" });
	});
});
