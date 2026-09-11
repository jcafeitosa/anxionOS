import {
	attachIncidentRunbookCommandSchema,
	createIncidentCommandSchema,
	operationsIncidentIdSchema,
	transitionIncidentStatusCommandSchema,
} from "@anxionos/contracts/operations";
import {
	attachIncidentRunbook,
	createIncident,
	transitionIncidentStatus,
} from "@anxionos/operations";
import { z } from "zod";
import type { OperationsPluginDeps } from "../plugin";

const openIncidentBodySchema = createIncidentCommandSchema
	.omit({
		commandId: true,
		organizationId: true,
	})
	.strict();

const transitionIncidentStatusBodySchema = transitionIncidentStatusCommandSchema
	.omit({
		commandId: true,
		organizationId: true,
		incidentId: true,
	})
	.strict();

const attachIncidentRunbookBodySchema = attachIncidentRunbookCommandSchema
	.omit({
		commandId: true,
		organizationId: true,
		incidentId: true,
		responsiblePrincipalId: true,
	})
	.strict();

export const incidentIdParamSchema = z.object({
	incidentId: operationsIncidentIdSchema,
});

export async function handleOpenIncident(
	deps: OperationsPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		body: unknown;
	},
) {
	const body = openIncidentBodySchema.parse(input.body);
	return createIncident(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			commandId: input.commandId,
			organizationId: input.agencyId,
			title: body.title,
			description: body.description,
			severity: body.severity,
			serviceId: body.serviceId,
		},
	);
}

export async function handleTransitionIncidentStatus(
	deps: OperationsPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		incidentId: string;
		body: unknown;
	},
) {
	const body = transitionIncidentStatusBodySchema.parse(input.body);
	return transitionIncidentStatus(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			commandId: input.commandId,
			organizationId: input.agencyId,
			incidentId: input.incidentId,
			expectedRevision: body.expectedRevision,
			targetStatus: body.targetStatus,
			reason: body.reason,
		},
	);
}

export async function handleAttachIncidentRunbook(
	deps: OperationsPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		incidentId: string;
		principalId: string;
		body: unknown;
	},
) {
	const body = attachIncidentRunbookBodySchema.parse(input.body);
	return attachIncidentRunbook(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			commandId: input.commandId,
			organizationId: input.agencyId,
			incidentId: input.incidentId,
			expectedRevision: body.expectedRevision,
			runbookId: body.runbookId,
			runbookVersion: body.runbookVersion,
			responsiblePrincipalId: input.principalId,
			evidence: body.evidence,
		},
	);
}
