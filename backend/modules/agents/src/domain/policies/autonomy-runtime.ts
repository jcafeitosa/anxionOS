import type { AutonomyLevel } from "@anxionos/contracts/agents";

const RUNTIME_DISABLED_LEVELS: readonly AutonomyLevel[] = ["L3", "L4"];

export function isAutonomyLevelRuntimeEnabled(level: AutonomyLevel): boolean {
	return !RUNTIME_DISABLED_LEVELS.includes(level);
}
