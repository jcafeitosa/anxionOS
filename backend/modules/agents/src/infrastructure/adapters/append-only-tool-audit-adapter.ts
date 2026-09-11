import { randomUUID } from "node:crypto";
import type { ToolAuditEntry } from "@anxionos/contracts/openbot";
import type {
	ToolAuditAfterInput,
	ToolAuditBeforeInput,
	ToolAuditPort,
	ToolAuditTrailQuery,
} from "../../domain/ports/tool-audit-port";

function trailKey(organizationId: string, requestId: string): string {
	return `${organizationId}:${requestId}`;
}

/**
 * In-process append-only tool audit store (sandbox / homologation).
 * Entries are never updated or removed once recorded.
 */
export function createAppendOnlyToolAuditAdapter(): ToolAuditPort & {
	readonly entries: readonly ToolAuditEntry[];
} {
	const entries: ToolAuditEntry[] = [];
	const byRequest = new Map<string, ToolAuditEntry[]>();

	function append(entry: ToolAuditEntry): ToolAuditEntry {
		entries.push(entry);
		const key = trailKey(entry.organizationId, entry.requestId);
		const trail = byRequest.get(key) ?? [];
		trail.push(entry);
		byRequest.set(key, trail);
		return entry;
	}

	return {
		get entries() {
			return entries;
		},
		async recordBefore(input: ToolAuditBeforeInput): Promise<ToolAuditEntry> {
			return append({
				auditId: randomUUID(),
				requestId: input.requestId,
				phase: "before",
				organizationId: input.organizationId,
				agentId: input.agentId,
				toolName: input.toolName,
				decision: input.decision,
				ruleId: input.ruleId,
				recordedAt: new Date().toISOString(),
			});
		},
		async recordAfter(input: ToolAuditAfterInput): Promise<ToolAuditEntry> {
			return append({
				auditId: randomUUID(),
				requestId: input.requestId,
				phase: "after",
				organizationId: input.organizationId,
				agentId: input.agentId,
				toolName: input.toolName,
				outcomeHash: input.outcomeHash,
				recordedAt: new Date().toISOString(),
			});
		},
		async listTrail(query: ToolAuditTrailQuery): Promise<readonly ToolAuditEntry[]> {
			const matches = entries.filter((entry) => entry.requestId === query.requestId);
			return [...matches];
		},
	};
}
