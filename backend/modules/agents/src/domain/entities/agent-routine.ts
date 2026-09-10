import type {
	RoutineStatus,
	RoutineTriggerConfig,
	RoutineTriggerKind,
} from "@anxionos/contracts/agents";

export interface AgentRoutine {
	id: string;
	organizationId: string;
	agentId: string;
	slug: string;
	displayName: string;
	triggerKind: RoutineTriggerKind;
	triggerConfig: RoutineTriggerConfig;
	cooldownSeconds: number;
	status: RoutineStatus;
	lastDedupeKey?: string;
	lastRunId?: string;
	lastTriggeredAt?: Date;
	revision: number;
	createdAt: Date;
	updatedAt: Date;
}
