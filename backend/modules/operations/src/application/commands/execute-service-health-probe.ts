import type {
	ExecuteServiceHealthProbeCommand,
	OperationsCommandResult,
} from "@anxionos/contracts/operations";
import {
	DEFAULT_HEALTH_PROBE_TIMEOUT_MS,
	executeServiceHealthProbeCommandSchema,
} from "@anxionos/contracts/operations";
import {
	buildServiceHealthProbeDetails,
	deriveHealthStatusFromProbeOutcome,
	runHealthProbeWithTimeout,
} from "../../domain/health-lifecycle";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { ServiceHealthProbeFn } from "../../domain/ports/health-probe";
import type { OperationsUnitOfWork } from "../../domain/ports/operations-unit-of-work";
import {
	type RegisterHealthCheckDeps,
	registerHealthCheck,
} from "./register-health-check";

export interface ExecuteServiceHealthProbeDeps extends RegisterHealthCheckDeps {
	runProbe: ServiceHealthProbeFn;
	probeTimeoutMs?: number;
	now?: () => string;
}

export async function executeServiceHealthProbe(
	deps: ExecuteServiceHealthProbeDeps,
	input: ExecuteServiceHealthProbeCommand,
): Promise<OperationsCommandResult> {
	const command = executeServiceHealthProbeCommandSchema.parse(input);
	const probeResult = await runHealthProbeWithTimeout(
		deps.runProbe,
		deps.probeTimeoutMs ?? DEFAULT_HEALTH_PROBE_TIMEOUT_MS,
	);
	const checkedAt =
		command.checkedAt ?? deps.now?.() ?? new Date().toISOString();
	const status = deriveHealthStatusFromProbeOutcome(probeResult.outcome);
	const probeDetails = buildServiceHealthProbeDetails(probeResult);
	return registerHealthCheck(deps, {
		commandId: command.commandId,
		organizationId: command.organizationId,
		serviceId: command.serviceId,
		status,
		checkedAt,
		probeDetails,
	});
}
