import type { ComputerSessionRef } from "@anxionos/contracts/openbot";
import { throwAgentsError } from "../errors";

/** Root directory for OpenBot sandbox workspaces (R144-03, R144-06). */
export const OPENBOT_SANDBOX_WORKSPACE_ROOT = "/tmp/anxionos-openbot-sandbox";

export function buildWorkspacePath(
	organizationId: string,
	agentId: string,
): string {
	return `${OPENBOT_SANDBOX_WORKSPACE_ROOT}/${organizationId}/${agentId}`;
}

function normalizeSandboxPath(path: string): string {
	const segments = path.replace(/\\/g, "/").split("/").filter(Boolean);
	const resolved: string[] = [];
	for (const segment of segments) {
		if (segment === ".") {
			continue;
		}
		if (segment === "..") {
			if (resolved.length === 0) {
				throwAgentsError(
					"AGT_TRAVERSAL_DENIED",
					"Path traversal outside sandbox workspace is denied",
				);
			}
			resolved.pop();
			continue;
		}
		resolved.push(segment);
	}
	return `/${resolved.join("/")}`;
}

export function assertWorkspacePathReadable(
	session: ComputerSessionRef,
	targetPath: string,
): void {
	const normalizedTarget = normalizeSandboxPath(targetPath);
	const normalizedWorkspace = normalizeSandboxPath(session.workspacePath);

	if (
		normalizedTarget !== normalizedWorkspace &&
		!normalizedTarget.startsWith(`${normalizedWorkspace}/`)
	) {
		throwAgentsError(
			"AGT_TRAVERSAL_DENIED",
			"Target path is outside the jailed workspace for this session",
		);
	}
}

export function assertSessionTenant(
	session: ComputerSessionRef,
	organizationId: string,
): void {
	if (session.organizationId !== organizationId) {
		throwAgentsError(
			"AGT_TRAVERSAL_DENIED",
			"Cross-tenant computer session access is denied",
		);
	}
}
