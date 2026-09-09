import { randomUUID } from "node:crypto";
import {
	connectionsCommandResultSchema,
	invokeInferenceCommandSchema,
	type ConnectionsCommandResult,
	type InvokeInferenceCommand,
} from "@anxionos/contracts/connections";
import {
	createInferenceCompletedEvent,
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
			return connectionsCommandResultSchema.parse({
				aggregateId: existing.id,
				revision: 1,
				inferenceRequestId: existing.id,
				idempotentReplay: true,
			});
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
