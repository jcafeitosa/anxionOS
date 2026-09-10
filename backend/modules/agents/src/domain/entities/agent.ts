import type {
	AgentKind,
	AgentLifecycleStatus,
} from "@anxionos/contracts/agents";

export interface Agent {
	id: string;
	organizationId: string;
	agencyId?: string;
	kind: AgentKind;
	displayName: string;
	status: AgentLifecycleStatus;
	activeVersionId?: string;
	revision: number;
	createdAt: Date;
	updatedAt: Date;
}
