import { randomUUID } from "node:crypto";
import {
	type ConnectionsCommandResult,
	type InvokeInferenceCommand,
	connectionsCommandResultSchema,
	invokeInferenceCommandSchema,
} from "@anxionos/contracts/connections";
import {
	createInferenceCompletedEvent,
	createInferenceWaitingHumanEvent,
	createUsageRecordedEvent,
} from "../../domain/events/connections-events";
import type { ConnectionsUnitOfWork } from "../../domain/ports/connections-unit-of-work";
import type { InferencePort } from "../../domain/ports/inference-port";
import { throwConnectionsError } from "../errors";

export interface InvokeInferenceDeps {
	unitOfWork: ConnectionsUnitOfWork;
	inferencePort: InferencePort;
	organizationId: string;
	consumerPrincipalId: string;
}

function parseWaitingOperationId(modelRef: string | null): string | null {
	if (!modelRef?.startsWith("waiting:")) return null;
	return modelRef.slice("waiting:".length) || null;
}

function toReplayResult(
	existing: {
		id: string;
		status: string;
		modelRef: string | null;
	},
	issueIdentifier?: string,
): ConnectionsCommandResult {
	const operationId =
		existing.status === "waiting_human"
			? parseWaitingOperationId(existing.modelRef)
			: null;
	return connectionsCommandResultSchema.parse({
		aggregateId: existing.id,
		revision: 1,
		inferenceRequestId: existing.id,
		idempotentReplay: true,
		waitingHuman: operationId
			? {
					operationId,
					inferenceRequestId: existing.id,
					issueIdentifier,
				}
			: undefined,
	});
}

export async function invokeInference(
	deps: InvokeInferenceDeps,
	input: InvokeInferenceCommand,
): Promise<ConnectionsCommandResult> {
	const command = invokeInferenceCommandSchema.parse(input);
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const existing = await ctx.inferenceRequests.findByIdempotencyKey(
			deps.organizationId,
			command.idempotencyKey,
		);
		if (existing) {
			if (existing.status === "waiting_human") {
				return toReplayResult(existing, command.issueIdentifier);
			}
			return toReplayResult(existing);
		}
		const binding = await ctx.bindings.findActiveById(
			command.bindingId,
			deps.organizationId,
		);
		if (!binding) {
			throwConnectionsError(
				"CX_BINDING_NOT_FOUND",
				`Binding ${command.bindingId} not found or inactive`,
			);
		}
		if (binding.bindingVersion !== command.bindingVersion) {
			throwConnectionsError("CX_REVISION_CONFLICT", "Binding version mismatch");
		}
		if (binding.adapterId !== "simulated") {
			throwConnectionsError(
				"CX_ADAPTER_UNAVAILABLE",
				`Adapter ${binding.adapterId} not available in SIMULATED slice`,
			);
		}
		const inferenceRequestId = randomUUID();
		await ctx.inferenceRequests.save({
			id: inferenceRequestId,
			organizationId: deps.organizationId,
			bindingId: binding.id,
			bindingVersion: binding.bindingVersion,
			idempotencyKey: command.idempotencyKey,
			operation: command.operation,
			status: "pending",
			modelRef: null,
			latencyMs: null,
		});
		const adapterResult = await deps.inferencePort.invoke({
			operation: command.operation,
			typedInput: command.typedInput,
		});
		if (adapterResult.disposition === "waiting_human") {
			await ctx.inferenceRequests.update({
				id: inferenceRequestId,
				organizationId: deps.organizationId,
				bindingId: binding.id,
				bindingVersion: binding.bindingVersion,
				idempotencyKey: command.idempotencyKey,
				operation: command.operation,
				status: "waiting_human",
				modelRef: `waiting:${adapterResult.operationId}`,
				latencyMs: null,
			});
			const waitingHuman = {
				operationId: adapterResult.operationId,
				inferenceRequestId,
				issueIdentifier: command.issueIdentifier,
			};
			await ctx.publishEvents([
				createInferenceWaitingHumanEvent({
					inferenceRequestId,
					bindingId: binding.id,
					operationId: adapterResult.operationId,
					issueIdentifier: command.issueIdentifier,
				}),
			]);
			return connectionsCommandResultSchema.parse({
				aggregateId: inferenceRequestId,
				revision: 1,
				inferenceRequestId,
				waitingHuman,
			});
		}
		await ctx.inferenceRequests.update({
			id: inferenceRequestId,
			organizationId: deps.organizationId,
			bindingId: binding.id,
			bindingVersion: binding.bindingVersion,
			idempotencyKey: command.idempotencyKey,
			operation: command.operation,
			status: "completed",
			modelRef: adapterResult.modelRef,
			latencyMs: adapterResult.latencyMs,
		});
		const usageRecordId = `cx_usage_${randomUUID()}`;
		await ctx.usageRecords.save({
			id: usageRecordId,
			organizationId: deps.organizationId,
			aiAccountId: binding.aiAccountId,
			connectionBindingId: binding.id,
			bindingVersion: binding.bindingVersion,
			inferenceRequestId,
			consumerKind: "owner",
			consumerPrincipalId: deps.consumerPrincipalId,
			operation: command.operation,
			quantity: String(adapterResult.quantity),
			unit: adapterResult.unit,
		});
		await ctx.publishEvents([
			createInferenceCompletedEvent({
				inferenceRequestId,
				bindingId: binding.id,
				modelRef: adapterResult.modelRef,
				latencyMs: adapterResult.latencyMs,
				usageRecordId,
			}),
			createUsageRecordedEvent({
				usageRecordId,
				quantity: adapterResult.quantity,
				unit: adapterResult.unit,
				consumerKind: "owner",
				taskId: command.taskId,
			}),
		]);
		return connectionsCommandResultSchema.parse({
			aggregateId: inferenceRequestId,
			revision: 1,
			inferenceRequestId,
		});
	});
}
