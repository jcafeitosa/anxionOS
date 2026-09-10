import { throwOrchestrationError } from "../errors";

export function assertOrganizationScopeMatch(
	scopedOrganizationId: string,
	bodyOrganizationId: string | undefined,
): void {
	if (
		bodyOrganizationId !== undefined &&
		bodyOrganizationId !== scopedOrganizationId
	) {
		throwOrchestrationError(
			"ORC_SCOPE_DENIED",
			"organizationId does not match X-Orchestration-Organization-Id scope",
		);
	}
}
