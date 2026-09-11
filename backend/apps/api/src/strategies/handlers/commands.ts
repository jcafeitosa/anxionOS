import {
	activateDeploymentCommandSchema,
	completeBacktestCommandSchema,
	createStrategyVersionCommandSchema,
	emitSignalCommandSchema,
	publishStrategyVersionCommandSchema,
	registerStrategyCommandSchema,
	requestBacktestCommandSchema,
} from "@anxionos/contracts/strategies";
import {
	activateDeployment,
	completeBacktest,
	createStrategyVersion,
	emitSignal,
	publishStrategyVersion,
	registerStrategy,
	requestBacktest,
} from "@anxionos/strategies";
import { z } from "zod";
import type { StrategiesPluginDeps } from "../plugin";

const registerStrategyBodySchema = registerStrategyCommandSchema
	.omit({ commandId: true, organizationId: true })
	.strict();

const createStrategyVersionBodySchema = createStrategyVersionCommandSchema
	.omit({ commandId: true, organizationId: true, strategyId: true })
	.strict();

const publishStrategyVersionBodySchema = publishStrategyVersionCommandSchema
	.omit({
		commandId: true,
		organizationId: true,
		strategyId: true,
		strategyVersionId: true,
	})
	.strict();

const requestBacktestBodySchema = requestBacktestCommandSchema
	.omit({
		commandId: true,
		organizationId: true,
		strategyId: true,
		strategyVersionId: true,
	})
	.strict();

const completeBacktestBodySchema = completeBacktestCommandSchema
	.omit({ commandId: true, organizationId: true, backtestRunId: true })
	.strict();

const activateDeploymentBodySchema = activateDeploymentCommandSchema
	.omit({
		commandId: true,
		organizationId: true,
		strategyId: true,
	})
	.strict();

const emitSignalBodySchema = emitSignalCommandSchema
	.omit({ commandId: true, organizationId: true, strategyId: true })
	.strict();

export const strategyIdParamSchema = z.object({
	strategyId: z.string().regex(/^st_str_[0-9a-f-]{36}$/i),
});

export const strategyVersionIdParamSchema = z.object({
	strategyVersionId: z.string().regex(/^st_ver_[0-9a-f-]{36}$/i),
});

export const backtestRunIdParamSchema = z.object({
	backtestRunId: z.string().regex(/^st_btr_[0-9a-f-]{36}$/i),
});

export async function handleRegisterStrategy(
	deps: StrategiesPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		body: unknown;
	},
) {
	const body = registerStrategyBodySchema.parse(input.body);
	return registerStrategy(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			commandId: input.commandId,
			organizationId: input.agencyId,
			displayName: body.displayName,
			description: body.description,
			executionMode: body.executionMode,
		},
	);
}

export async function handleCreateStrategyVersion(
	deps: StrategiesPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		strategyId: string;
		body: unknown;
	},
) {
	const body = createStrategyVersionBodySchema.parse(input.body);
	return createStrategyVersion(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			commandId: input.commandId,
			organizationId: input.agencyId,
			strategyId: input.strategyId,
			sourceHash: body.sourceHash,
			rulesHash: body.rulesHash,
			parametersHash: body.parametersHash,
			executionMode: body.executionMode,
		},
	);
}

export async function handlePublishStrategyVersion(
	deps: StrategiesPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		strategyId: string;
		strategyVersionId: string;
		body: unknown;
	},
) {
	publishStrategyVersionBodySchema.parse(input.body ?? {});
	return publishStrategyVersion(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			commandId: input.commandId,
			organizationId: input.agencyId,
			strategyId: input.strategyId,
			strategyVersionId: input.strategyVersionId,
		},
	);
}

export async function handleRequestBacktest(
	deps: StrategiesPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		strategyId: string;
		strategyVersionId: string;
		body: unknown;
	},
) {
	const body = requestBacktestBodySchema.parse(input.body);
	return requestBacktest(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			commandId: input.commandId,
			organizationId: input.agencyId,
			strategyId: input.strategyId,
			strategyVersionId: input.strategyVersionId,
			datasetId: body.datasetId,
			datasetRevision: body.datasetRevision,
			seed: body.seed,
		},
	);
}

export async function handleCompleteBacktest(
	deps: StrategiesPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		backtestRunId: string;
		body: unknown;
	},
) {
	completeBacktestBodySchema.parse(input.body ?? {});
	return completeBacktest(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
			backtestRunner: deps.backtestRunner,
		},
		{
			commandId: input.commandId,
			organizationId: input.agencyId,
			backtestRunId: input.backtestRunId,
		},
	);
}

export async function handleActivateDeployment(
	deps: StrategiesPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		strategyId: string;
		body: unknown;
	},
) {
	const body = activateDeploymentBodySchema.parse(input.body);
	return activateDeployment(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			commandId: input.commandId,
			organizationId: input.agencyId,
			strategyId: input.strategyId,
			strategyVersionId: body.strategyVersionId,
			executionMode: body.executionMode,
			portfolioId: body.portfolioId,
			bindingSnapshot: body.bindingSnapshot,
		},
	);
}

export async function handleEmitSignal(
	deps: StrategiesPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		strategyId: string;
		body: unknown;
	},
) {
	const body = emitSignalBodySchema.parse(input.body);
	return emitSignal(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			commandId: input.commandId,
			organizationId: input.agencyId,
			strategyId: input.strategyId,
			deploymentId: body.deploymentId,
			instrumentRefs: body.instrumentRefs,
			valueRef: body.valueRef,
			expiresAt: body.expiresAt,
		},
	);
}
