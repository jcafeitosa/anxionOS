import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { CONNECTIONS_EVENT_TYPES } from "@anxionos/contracts/connections";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type {
	ConnectionBindingRecord,
	ConnectionsTransactionContext,
	ConnectionsUnitOfWork,
	InferenceRequestRecord,
} from "../../domain/ports/connections-unit-of-work";
import type {
	InferenceInvokeInput,
	InferenceInvokeResult,
	InferencePort,
} from "../../domain/ports/inference-port";
import { invokeInference } from "./invoke-inference";

async function invokeTestSimulatedInference(
	input: InferenceInvokeInput,
): Promise<InferenceInvokeResult> {
	const typedInput =
		input.typedInput && typeof input.typedInput === "object"
			? (input.typedInput as Record<string, unknown>)
			: {};
	if (typedInput.awaitHumanApproval === true) {
		const operationId =
			typeof typedInput.operationId === "string"
				? typedInput.operationId
				: `sim-wait-${input.operation}`;
		return {
			disposition: "waiting_human",
			operationId,
			modelRef: "simulated/model-v1",
			reason:
				typeof typedInput.reason === "string"
					? typedInput.reason
					: "Human approval required (SIMULATED)",
		};
	}
	const started = Date.now();
	return {
		disposition: "completed",
		modelRef: "simulated/model-v1",
		output: {
			operation: input.operation,
			echo: input.typedInput,
			mode: "SIMULATED",
		},
		latencyMs: Math.max(1, Date.now() - started),
		quantity: 1,
		unit: "request",
	};
}

const ORG = "00000000-0000-4000-8000-000000000001";
const PRINCIPAL = "00000000-0000-4000-8000-000000000002";
const BINDING_ID = "cx_bind_test";

function createInMemoryUow(binding: ConnectionBindingRecord) {
	const inferenceByKey = new Map<string, InferenceRequestRecord>();
	let published: DomainEventEnvelope[] = [];
	const ctx: ConnectionsTransactionContext = {
		commandJournal: {
			async findByCommandId() {
				return null;
			},
			async save() {},
		},
		aiAccounts: {
			async findDraftByNaturalKey() {
				return null;
			},
			async save(record) {
				return record;
			},
		},
		bindings: {
			async findActiveById(bindingId, organizationId) {
				if (
					bindingId !== binding.id ||
					organizationId !== binding.organizationId
				) {
					return null;
				}
				return binding;
			},
			async save(record) {
				return record;
			},
		},
		inferenceRequests: {
			async findByIdempotencyKey(organizationId, idempotencyKey) {
				return (
					inferenceByKey.get(`${organizationId}:${idempotencyKey}`) ?? null
				);
			},
			async save(record) {
				inferenceByKey.set(
					`${record.organizationId}:${record.idempotencyKey}`,
					record,
				);
				return record;
			},
			async update(record) {
				inferenceByKey.set(
					`${record.organizationId}:${record.idempotencyKey}`,
					record,
				);
				return record;
			},
		},
		usageRecords: {
			async save() {},
		},
		async publishEvents(envelopes) {
			published = [...published, ...envelopes];
		},
	};
	const unitOfWork: ConnectionsUnitOfWork = {
		async runInTransaction(work) {
			return work(ctx);
		},
	};
	return {
		unitOfWork,
		getPublished: () => published,
		getInference: (key: string) => inferenceByKey.get(`${ORG}:${key}`),
	};
}

const binding: ConnectionBindingRecord = {
	id: BINDING_ID,
	connectionId: "cx_conn",
	bindingVersion: 1,
	organizationId: ORG,
	aiAccountId: "cx_acct",
	kind: "MODEL",
	environment: "SIMULATED",
	adapterId: "simulated",
	status: "active",
	revision: 1,
	secretId: "sec",
	secretGeneration: 1,
};

const inferencePort: InferencePort = {
	invoke: invokeTestSimulatedInference,
};

describe("invokeInference waitingHuman (D-CX-049)", () => {
	test("returns waitingHuman without usage when adapter requests human approval", async () => {
		const { unitOfWork, getPublished, getInference } =
			createInMemoryUow(binding);
		const idempotencyKey = randomUUID();
		const result = await invokeInference(
			{
				unitOfWork,
				inferencePort,
				organizationId: ORG,
				consumerPrincipalId: PRINCIPAL,
			},
			{
				commandId: randomUUID(),
				bindingId: BINDING_ID,
				bindingVersion: 1,
				operation: "approve-trade",
				requirements: {
					schemaVersion: "1.0.0" as const,
					taskType: "test",
					operation: "approve-trade",
					requiredCapabilities: ["text"],
					requiredPurpose: "ROUTINE" as const,
					dataClass: "INTERNAL" as const,
					latencyClass: "INTERACTIVE" as const,
					complexity: "SMALL" as const,
				},
				typedInput: { awaitHumanApproval: true, operationId: "op-141-1" },
				deadline: new Date(Date.now() + 60_000).toISOString(),
				idempotencyKey,
				issueIdentifier: "ANX-141",
			},
		);
		expect(result.waitingHuman?.operationId).toBe("op-141-1");
		expect(result.waitingHuman?.issueIdentifier).toBe("ANX-141");
		expect(getInference(idempotencyKey)?.status).toBe("waiting_human");
		expect(
			getPublished().some(
				(e) => e.eventType === CONNECTIONS_EVENT_TYPES.INFERENCE_WAITING_HUMAN,
			),
		).toBe(true);
		expect(
			getPublished().some(
				(e) => e.eventType === CONNECTIONS_EVENT_TYPES.USAGE_RECORDED,
			),
		).toBe(false);
	});

	test("idempotent replay returns same aggregate without duplicate events", async () => {
		const { unitOfWork, getPublished } = createInMemoryUow(binding);
		const idempotencyKey = randomUUID();
		const deps = {
			unitOfWork,
			inferencePort,
			organizationId: ORG,
			consumerPrincipalId: PRINCIPAL,
		};
		const command = {
			commandId: randomUUID(),
			bindingId: BINDING_ID,
			bindingVersion: 1,
			operation: "summarize",
			requirements: {
				schemaVersion: "1.0.0" as const,
				taskType: "test",
				operation: "approve-trade",
				requiredCapabilities: ["text"],
				requiredPurpose: "ROUTINE" as const,
				dataClass: "INTERNAL" as const,
				latencyClass: "INTERACTIVE" as const,
				complexity: "SMALL" as const,
			},
			typedInput: { text: "hello" },
			deadline: new Date(Date.now() + 60_000).toISOString(),
			idempotencyKey,
		};
		const first = await invokeInference(deps, command);
		const eventCount = getPublished().length;
		const second = await invokeInference(deps, command);
		expect(second.idempotentReplay).toBe(true);
		expect(second.aggregateId).toBe(first.aggregateId);
		expect(getPublished().length).toBe(eventCount);
	});
});
