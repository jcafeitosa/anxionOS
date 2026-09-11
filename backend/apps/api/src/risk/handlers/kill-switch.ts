import {
	activateKillSwitchCommandSchema,
	releaseKillSwitchCommandSchema,
} from "@anxionos/contracts/risk";
import {
	activateKillSwitch,
	getKillSwitchStatus,
	releaseKillSwitch,
} from "@anxionos/risk";
import type { RiskPluginDeps } from "../plugin";

const activateKillSwitchBodySchema = activateKillSwitchCommandSchema.omit({
	commandId: true,
	organizationId: true,
	activatedBy: true,
});

const releaseKillSwitchBodySchema = releaseKillSwitchCommandSchema.omit({
	commandId: true,
	organizationId: true,
	releasedBy: true,
});

export async function handleGetKillSwitchStatus(
	deps: RiskPluginDeps,
	input: { agencyId: string },
) {
	return getKillSwitchStatus(
		{ killSwitch: deps.killSwitch },
		input.agencyId,
	);
}

export async function handleActivateKillSwitch(
	deps: RiskPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		principalId: string;
		body: unknown;
	},
) {
	const body = activateKillSwitchBodySchema.parse(input.body);
	return activateKillSwitch(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			commandId: input.commandId,
			organizationId: input.agencyId,
			reason: body.reason,
			activatedBy: input.principalId,
			scope: body.scope ?? "ORGANIZATION",
			portfolioId: body.portfolioId,
		},
	);
}

export async function handleReleaseKillSwitch(
	deps: RiskPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		principalId: string;
		body: unknown;
	},
) {
	const body = releaseKillSwitchBodySchema.parse(input.body);
	return releaseKillSwitch(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			commandId: input.commandId,
			organizationId: input.agencyId,
			releasedBy: input.principalId,
			scope: body.scope ?? "ORGANIZATION",
			portfolioId: body.portfolioId,
		},
	);
}
