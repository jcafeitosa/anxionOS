import type { AgentLifecycleStatus } from "@anxionos/contracts/agents";

const ALLOWED_TRANSITIONS: Record<
	AgentLifecycleStatus,
	readonly AgentLifecycleStatus[]
> = {
	DRAFT: ["CONFIGURED", "ARCHIVED"],
	CONFIGURED: ["READY", "DRAFT", "ARCHIVED"],
	READY: ["ACTIVE", "PAUSED", "CONFIGURED", "ARCHIVED"],
	ACTIVE: ["PAUSED", "DRAINING", "ARCHIVED"],
	PAUSED: ["READY", "ACTIVE", "ARCHIVED"],
	DRAINING: ["ARCHIVED"],
	ARCHIVED: [],
};

const VERSION_REQUIRED_TARGETS: ReadonlySet<AgentLifecycleStatus> = new Set([
	"CONFIGURED",
	"READY",
	"ACTIVE",
]);

export function canTransitionAgentStatus(
	from: AgentLifecycleStatus,
	to: AgentLifecycleStatus,
	options?: { hasActiveVersion: boolean },
): boolean {
	if (from === to) {
		return true;
	}
	if (!ALLOWED_TRANSITIONS[from].includes(to)) {
		return false;
	}
	if (VERSION_REQUIRED_TARGETS.has(to) && !options?.hasActiveVersion) {
		return false;
	}
	return true;
}
