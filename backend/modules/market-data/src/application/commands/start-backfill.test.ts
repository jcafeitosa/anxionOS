import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	INSTRUMENT_ID,
	ORG,
	activeInstrument,
	createInMemoryUow,
	type InstrumentRecord,
} from "../test-support";
import { startBackfill, startBackfillCommandSchema } from "./start-backfill";

function validCommand(
	overrides: Partial<{
		commandId: string;
		organizationId: string;
		instrumentId: string;
		requestedFrom: string;
		requestedTo: string;
		executionMode: "SIMULATED" | "PAPER";
	}> = {},
) {
	return {
		commandId: randomUUID(),
		organizationId: ORG,
		instrumentId: INSTRUMENT_ID,
		requestedFrom: "2024-01-01T00:00:00.000Z",
		requestedTo: "2024-01-02T00:00:00.000Z",
		executionMode: "SIMULATED" as const,
		...overrides,
	};
}

describe("startBackfillCommandSchema (ANX-146 slice A)", () => {
	test("validates a minimal valid input", () => {
		const result = startBackfillCommandSchema.safeParse(validCommand());
		expect(result.success).toBe(true);
	});

	test("rejects invalid instrumentId format", () => {
		const result = startBackfillCommandSchema.safeParse(
			validCommand({ instrumentId: "invalid-id" }),
		);
		expect(result.success).toBe(false);
	});

	test("rejects requestedTo <= requestedFrom", () => {
		const result = startBackfillCommandSchema.safeParse(
			validCommand({
				requestedFrom: "2024-01-02T00:00:00.000Z",
				requestedTo: "2024-01-01T00:00:00.000Z",
			}),
		);
		expect(result.success).toBe(false);
	});

	test("rejects unsupported executionMode", () => {
		const result = startBackfillCommandSchema.safeParse({
			...validCommand(),
			executionMode: "REAL",
		});
		expect(result.success).toBe(false);
	});
});

describe("startBackfill deps integration (unit with in-memory fakes, ANX-146 slice A)", () => {
	test("idempotent creation: same commandId returns replay", async () => {
		const { unitOfWork, commandJournal } = createInMemoryUow(activeInstrument());
		const command = validCommand();
		const result1 = await startBackfill({ unitOfWork, commandJournal }, command);
		const result2 = await startBackfill({ unitOfWork, commandJournal }, command);
		expect(result1.aggregateId).toBe(result2.aggregateId);
		expect(result2.idempotentReplay).toBe(true);
	});

	test("rejects non-existent instrument", async () => {
		const { unitOfWork, commandJournal } = createInMemoryUow(activeInstrument());
		await expect(
			startBackfill(
				{ unitOfWork, commandJournal },
				validCommand({
					instrumentId: "md_ins_00000000-0000-4000-8000-000000000099",
				}),
			),
		).rejects.toMatchObject({ code: "MD_INSTRUMENT_NOT_FOUND" });
	});

	test("rejects non-ACTIVE instrument", async () => {
		const suspended: InstrumentRecord = {
			...activeInstrument(),
			status: "SUSPENDED",
		};
		const { unitOfWork, commandJournal } = createInMemoryUow(suspended);
		await expect(
			startBackfill({ unitOfWork, commandJournal }, validCommand()),
		).rejects.toMatchObject({ code: "MD_BACKFILL_LICENSE_DENIED" });
	});

	test("rejects mismatched execution mode", async () => {
		const { unitOfWork, commandJournal } = createInMemoryUow(activeInstrument());
		await expect(
			startBackfill(
				{ unitOfWork, commandJournal },
				validCommand({ executionMode: "PAPER" }),
			),
		).rejects.toMatchObject({ code: "MD_EXECUTION_MODE_NOT_SUPPORTED" });
	});
});
