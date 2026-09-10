import type { ServiceHealthSnapshot } from "@anxionos/contracts/operations";
import {
	DEFAULT_HEALTH_STALE_THRESHOLD_MS,
	serviceHealthSnapshotSchema,
} from "@anxionos/contracts/operations";
import { isHealthCheckStale } from "../../domain/health-lifecycle";
import type { HealthCheckRepository } from "../../domain/ports/operations-unit-of-work";
import { throwOperationsError } from "../errors";

export interface GetServiceHealthDeps {
	healthChecks: HealthCheckRepository;
	now?: () => string;
	staleThresholdMs?: number;
}

export async function getServiceHealth(
	deps: GetServiceHealthDeps,
	organizationId: string,
	serviceId: string,
): Promise<ServiceHealthSnapshot> {
	const record = await deps.healthChecks.findByOrganizationAndServiceId(
		organizationId,
		serviceId,
	);
	if (!record) {
		throwOperationsError(
			"OPS_HEALTH_CHECK_NOT_FOUND",
			"service health check not found",
		);
	}
	const nowIso = deps.now?.() ?? new Date().toISOString();
	return serviceHealthSnapshotSchema.parse({
		healthCheckId: record.id,
		organizationId: record.organizationId,
		serviceId: record.serviceId,
		status: record.status,
		checkedAt: record.checkedAt,
		revision: record.revision,
		isStale: isHealthCheckStale(
			record.checkedAt,
			nowIso,
			deps.staleThresholdMs ?? DEFAULT_HEALTH_STALE_THRESHOLD_MS,
		),
		probeDetails: record.probeDetails,
	});
}
