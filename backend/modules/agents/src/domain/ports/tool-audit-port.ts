import type { ToolAuditEntry, ToolInvocationDecision } from "@anxionos/contracts/openbot";

export type ToolAuditBeforeInput = {
	requestId: string;
	organizationId: string;
	agentId: string;
	toolName: string;
	decision: ToolInvocationDecision;
};

export type ToolAuditAfterInput = {
	requestId: string;
	organizationId: string;
	agentId: string;
	toolName: string;
	outcomeHash: string;
};

/** Append-only audit before/after material tool effects (R144-04, R144-07). */
export interface ToolAuditPort {
	recordBefore(input: ToolAuditBeforeInput): Promise<ToolAuditEntry>;
	recordAfter(input: ToolAuditAfterInput): Promise<ToolAuditEntry>;
}
