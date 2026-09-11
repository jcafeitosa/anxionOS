import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	abortBotRunGeneration,
	acquireBotRunGeneration,
	createInMemoryOrchestrationRunFenceAdapter,
	createSandboxBotRunGenerationAdapter,
	releaseBotRunGeneration,
} from "@anxionos/agents";
import {
	abortBotRunGenerationCommandSchema,
	acquireBotRunGenerationCommandSchema,
	botRunGenerationCommandResultSchema,
	botRunGenerationRefSchema,
	OPENBOT_EVENT_TYPES,
} from "@anxionos/contracts/openbot";

const organizationId = "b2000002-0002-4002-8002-000000000002";
const agentId = "c3000003-0003-4003-8003-000000000003";
const runId = "f8000008-0008-4008-8008-000000000008";
const runRevision = 1;

function createDeps() {
	const runFence = createInMemoryOrchestrationRunFenceAdapter({
		[`${organizationId}:${runId}`]: runRevision,
	});
	const botRunGeneration = createSandboxBotRunGenerationAdapter({ runFence });
	return { runFence, botRunGeneration };
}

describe("generation fencing (ANX-144 S6 / R144-08)", () => {
	test("MEET oracle: acquire A → abort A → acquire B → release A → abort B → B still cancellable", async () => {
		const { botRunGeneration } = createDeps();

		const acquiredA = await acquireBotRunGeneration(
			{ botRunGeneration },
			{
				commandId: randomUUID(),
				organizationId,
				agentId,
				runId,
				runRevision,
			},
		);
		const generationA = acquiredA.generation;

		const abortedA = await abortBotRunGeneration(
			{ botRunGeneration },
			{
				commandId: randomUUID(),
				generationId: generationA.generationId,
				organizationId,
				abortToken: generationA.abortToken,
				runRevision,
			},
		);
		expect(abortedA.generation.status).toBe("aborted");
		expect(botRunGeneration.isGenerationAborted(generationA.generationId)).toBe(
			true,
		);

		const acquiredB = await acquireBotRunGeneration(
			{ botRunGeneration },
			{
				commandId: randomUUID(),
				organizationId,
				agentId,
				runId,
				runRevision,
			},
		);
		const generationB = acquiredB.generation;
		expect(generationB.generationSequence).toBeGreaterThan(
			generationA.generationSequence,
		);
		expect(botRunGeneration.isGenerationAborted(generationB.generationId)).toBe(
			false,
		);

		const releasedA = await releaseBotRunGeneration(
			{ botRunGeneration },
			{
				commandId: randomUUID(),
				generationId: generationA.generationId,
				organizationId,
			},
		);
		expect(releasedA.idempotentReplay).toBe(true);
		expect(botRunGeneration.isGenerationAborted(generationB.generationId)).toBe(
			false,
		);

		const abortedB = await abortBotRunGeneration(
			{ botRunGeneration },
			{
				commandId: randomUUID(),
				generationId: generationB.generationId,
				organizationId,
				abortToken: generationB.abortToken,
				runRevision,
			},
		);
		expect(abortedB.generation.status).toBe("aborted");
		expect(botRunGeneration.isGenerationAborted(generationB.generationId)).toBe(
			true,
		);
	});

	test("adversarial: abort A does not mark generation B as aborted", async () => {
		const { botRunGeneration } = createDeps();
		const genA = await acquireBotRunGeneration(
			{ botRunGeneration },
			{
				commandId: randomUUID(),
				organizationId,
				agentId,
				runId,
				runRevision,
			},
		);
		await abortBotRunGeneration(
			{ botRunGeneration },
			{
				commandId: randomUUID(),
				generationId: genA.generation.generationId,
				organizationId,
				abortToken: genA.generation.abortToken,
				runRevision,
			},
		);
		const genB = await acquireBotRunGeneration(
			{ botRunGeneration },
			{
				commandId: randomUUID(),
				organizationId,
				agentId,
				runId,
				runRevision,
			},
		);
		expect(
			botRunGeneration.isGenerationAborted(genB.generation.generationId),
		).toBe(false);
	});

	test("adversarial: stale abort token rejected without affecting active generation", async () => {
		const { botRunGeneration } = createDeps();
		const genA = await acquireBotRunGeneration(
			{ botRunGeneration },
			{
				commandId: randomUUID(),
				organizationId,
				agentId,
				runId,
				runRevision,
			},
		);
		const genB = await acquireBotRunGeneration(
			{ botRunGeneration },
			{
				commandId: randomUUID(),
				organizationId,
				agentId,
				runId,
				runRevision,
			},
		);
		await expect(
			abortBotRunGeneration(
				{ botRunGeneration },
				{
					commandId: randomUUID(),
					generationId: genA.generation.generationId,
					organizationId,
					abortToken: genB.generation.abortToken,
					runRevision,
				},
			),
		).rejects.toMatchObject({ agentsCode: "AGT_GENERATION_FENCING_MISMATCH" });
		expect(
			botRunGeneration.isGenerationAborted(genB.generation.generationId),
		).toBe(false);
	});

	test("adversarial: run revision mismatch rejected (orchestration fence)", async () => {
		const { runFence, botRunGeneration } = createDeps();
		const acquired = await acquireBotRunGeneration(
			{ botRunGeneration },
			{
				commandId: randomUUID(),
				organizationId,
				agentId,
				runId,
				runRevision,
			},
		);
		runFence.setRunRevision({
			organizationId,
			runId,
			runRevision: runRevision + 1,
		});
		await expect(
			abortBotRunGeneration(
				{ botRunGeneration },
				{
					commandId: randomUUID(),
					generationId: acquired.generation.generationId,
					organizationId,
					abortToken: acquired.generation.abortToken,
					runRevision,
				},
			),
		).rejects.toMatchObject({ agentsCode: "AGT_GENERATION_FENCING_MISMATCH" });
	});

	test("publishes acquired and aborted generation events", async () => {
		const { botRunGeneration } = createDeps();
		const events: string[] = [];
		const publishEvents = async (published: { eventType: string }[]) => {
			for (const event of published) {
				events.push(event.eventType);
			}
		};

		const acquired = await acquireBotRunGeneration(
			{ botRunGeneration, publishEvents },
			{
				commandId: randomUUID(),
				organizationId,
				agentId,
				runId,
				runRevision,
			},
		);
		await abortBotRunGeneration(
			{ botRunGeneration, publishEvents },
			{
				commandId: randomUUID(),
				generationId: acquired.generation.generationId,
				organizationId,
				abortToken: acquired.generation.abortToken,
				runRevision,
			},
		);

		expect(events).toContain(OPENBOT_EVENT_TYPES.BOT_RUN_GENERATION_ACQUIRED);
		expect(events).toContain(OPENBOT_EVENT_TYPES.BOT_RUN_GENERATION_ABORTED);
	});
});

describe("openbot S6 generation contracts (ANX-144 S6)", () => {
	test("acquireBotRunGenerationCommandSchema requires runRevision fence", () => {
		const parsed = acquireBotRunGenerationCommandSchema.parse({
			commandId: randomUUID(),
			organizationId,
			agentId,
			runId,
			runRevision,
		});
		expect(parsed.runRevision).toBe(runRevision);
	});

	test("abortBotRunGenerationCommandSchema requires abortToken", () => {
		const token = randomUUID();
		const parsed = abortBotRunGenerationCommandSchema.parse({
			commandId: randomUUID(),
			generationId: randomUUID(),
			organizationId,
			abortToken: token,
			runRevision,
		});
		expect(parsed.abortToken).toBe(token);
	});

	test("botRunGenerationRefSchema includes generationSequence and abortToken", async () => {
		const { botRunGeneration } = createDeps();
		const result = await acquireBotRunGeneration(
			{ botRunGeneration },
			{
				commandId: randomUUID(),
				organizationId,
				agentId,
				runId,
				runRevision,
			},
		);
		const parsed = botRunGenerationRefSchema.parse(result.generation);
		expect(parsed.generationSequence).toBeGreaterThan(0);
		expect(parsed.abortToken).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
		);
	});

	test("botRunGenerationCommandResultSchema accepts idempotentReplay", () => {
		const parsed = botRunGenerationCommandResultSchema.parse({
			commandId: randomUUID(),
			generation: {
				generationId: randomUUID(),
				organizationId,
				agentId,
				runId,
				runRevision,
				generationSequence: 1,
				status: "aborted",
				abortToken: randomUUID(),
			},
			idempotentReplay: true,
		});
		expect(parsed.idempotentReplay).toBe(true);
	});

	test("OPENBOT_EVENT_TYPES includes generation lifecycle events", () => {
		expect(OPENBOT_EVENT_TYPES.BOT_RUN_GENERATION_ACQUIRED).toBe(
			"openbot.bot_run_generation.acquired.v1",
		);
		expect(OPENBOT_EVENT_TYPES.BOT_RUN_GENERATION_ABORTED).toBe(
			"openbot.bot_run_generation.aborted.v1",
		);
		expect(OPENBOT_EVENT_TYPES.BOT_RUN_GENERATION_RELEASED).toBe(
			"openbot.bot_run_generation.released.v1",
		);
	});
});
