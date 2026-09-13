import { describe, expect, test } from "bun:test";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import {
	createPartnersCommandIntent,
	hashCommandPayload,
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "./command-support";

const ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";
const COMMAND_ID = "00000000-0000-4000-8000-000000000002";

function journalWith(
	entry: {
		organizationId: string;
		commandName: string;
		requestHash: string | null;
	},
	responseSnapshot: Record<string, unknown> = {
		aggregateId: "ptr_prt_1",
		revision: 1,
	},
): CommandJournalRepository {
	return {
		async findByCommandId(organizationId, commandId) {
			if (organizationId !== entry.organizationId || commandId !== COMMAND_ID) {
				return null;
			}
			return {
				commandId,
				...entry,
				responseSnapshot,
			};
		},
		async findByInvoiceId() {
			return null;
		},
		async save() {},
	};
}

describe("partners command intent", () => {
	test("hash is canonical across object key order", () => {
		expect(hashCommandPayload({ b: 2, a: 1 })).toBe(
			hashCommandPayload({ a: 1, b: 2 }),
		);
	});

	test("legacy journal row without hash fails closed", async () => {
		const intent = createPartnersCommandIntent("registerPartner", {
			organizationId: ORGANIZATION_ID,
			referralCode: "REF-001",
		});
		await expect(
			loadIdempotentCommandResult(
				journalWith({
					organizationId: ORGANIZATION_ID,
					commandName: "registerPartner",
					requestHash: null,
				}),
				ORGANIZATION_ID,
				COMMAND_ID,
				intent,
			),
		).rejects.toMatchObject({
			partnersCode: "PTR_IDEMPOTENCY_CONFLICT",
		});
	});

	test("same commandId in another organization is not a replay", async () => {
		const intent = createPartnersCommandIntent("registerPartner", {
			organizationId: ORGANIZATION_ID,
			referralCode: "REF-001",
		});
		const result = await loadIdempotentCommandResult(
			journalWith({
				organizationId: ORGANIZATION_ID,
				commandName: "registerPartner",
				requestHash: intent.requestHash,
			}),
			"00000000-0000-4000-8000-000000000003",
			COMMAND_ID,
			intent,
		);
		expect(result).toBeNull();
	});

	test("replay snapshot preserves payoutStatus", async () => {
		const intent = createPartnersCommandIntent("requestPayout", {
			organizationId: ORGANIZATION_ID,
			partnerId: "ptr_prt_00000000-0000-4000-8000-000000000003",
		});
		const result = await loadIdempotentCommandResult(
			journalWith(
				{
					organizationId: ORGANIZATION_ID,
					commandName: "requestPayout",
					requestHash: intent.requestHash,
				},
				toCommandResultSnapshot({
					aggregateId: "ptr_pay_00000000-0000-4000-8000-000000000004",
					revision: 1,
					payoutId: "ptr_pay_00000000-0000-4000-8000-000000000004",
					payoutStatus: "SCHEDULED",
				}),
			),
			ORGANIZATION_ID,
			COMMAND_ID,
			intent,
		);
		expect(result?.payoutStatus).toBe("SCHEDULED");
	});
});
