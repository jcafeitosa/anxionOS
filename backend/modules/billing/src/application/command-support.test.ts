import { describe, expect, test } from "bun:test";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import {
	createBillingCommandIntent,
	hashCommandPayload,
	loadIdempotentCommandResult,
} from "./command-support";

const ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";
const COMMAND_ID = "00000000-0000-4000-8000-000000000002";

function journalWith(entry: {
	organizationId: string;
	commandName: string;
	requestHash: string | null;
}): CommandJournalRepository {
	return {
		async findByCommandId(organizationId, commandId) {
			if (organizationId !== entry.organizationId || commandId !== COMMAND_ID) {
				return null;
			}
			return {
				commandId,
				...entry,
				responseSnapshot: { aggregateId: "bil_sub_1", revision: 1 },
			};
		},
		async findByUsageRecordId() {
			return null;
		},
		async findByWebhookEventId() {
			return null;
		},
		async save() {},
	};
}

describe("billing command intent", () => {
	test("hash is canonical across object key order", () => {
		expect(hashCommandPayload({ b: 2, a: 1 })).toBe(
			hashCommandPayload({ a: 1, b: 2 }),
		);
	});

	test("legacy journal row without hash fails closed", async () => {
		const intent = createBillingCommandIntent("createSubscription", {
			planCode: "pro",
		});
		await expect(
			loadIdempotentCommandResult(
				journalWith({
					organizationId: ORGANIZATION_ID,
					commandName: "createSubscription",
					requestHash: null,
				}),
				ORGANIZATION_ID,
				COMMAND_ID,
				intent,
			),
		).rejects.toMatchObject({ code: "BIL_IDEMPOTENCY_CONFLICT" });
	});

	test("same commandId in another organization is not a replay", async () => {
		const intent = createBillingCommandIntent("createSubscription", {
			planCode: "pro",
		});
		const result = await loadIdempotentCommandResult(
			journalWith({
				organizationId: ORGANIZATION_ID,
				commandName: "createSubscription",
				requestHash: intent.requestHash,
			}),
			"00000000-0000-4000-8000-000000000003",
			COMMAND_ID,
			intent,
		);
		expect(result).toBeNull();
	});
});
