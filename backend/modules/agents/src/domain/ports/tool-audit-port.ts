import type {
	ToolAuditEntry,
	ToolInvocationDecision,
} from "@anxionos/contracts/openbot";

export type ToolAuditBeforeInput = {
	requestId: string;
	organizationId: string;
	agentId: string;
	toolName: string;
	decision: ToolInvocationDecision;
	/** Named policy rule when decision is DENY or ALLOW (R144-07). */
	ruleId?: string;
};

export type ToolAuditAfterInput = {
	requestId: string;
	organizationId: string;
	agentId: string;
	toolName: string;
	outcomeHash: string;
};

export type ToolAuditTrailQuery = {
	requestId: string;
};

/** Append-only audit before/after material tool effects (R144-04, R144-07). */
export interface ToolAuditPort {
	recordBefore(input: ToolAuditBeforeInput): Promise<ToolAuditEntry>;
	recordAfter(input: ToolAuditAfterInput): Promise<ToolAuditEntry>;
	/** Ordered append-only entries for a request (immutable trail). */
	listTrail(query: ToolAuditTrailQuery): Promise<readonly ToolAuditEntry[]>;
}
