import { buildWorkspacePath } from "../../modules/agents/src/application/services/workspace-path-jail";
import type { ComputerSessionPort } from "../../modules/agents/src/domain/ports/computer-session-port";
import type {
	ToolAuditAfterInput,
	ToolAuditBeforeInput,
	ToolAuditPort,
} from "../../modules/agents/src/domain/ports/tool-audit-port";
import type { ToolGatewayPort } from "../../modules/agents/src/domain/ports/tool-gateway-port";
import type {
	ComputerSessionRef,
	ToolAuditEntry,
	ToolCallDecision,
	ToolCallEffect,
	ToolCallRequest,
} from "@anxionos/contracts/openbot";

export function createInMemoryToolGatewayPort(
	options: {
		defaultDecision?: ToolCallDecision["decision"];
		denyTools?: string[];
	} = {},
): ToolGatewayPort {
	const defaultDecision = options.defaultDecision ?? "ALLOW";
	const denyTools = new Set(options.denyTools ?? []);

	return {
		async authorizeToolCall(request: ToolCallRequest): Promise<ToolCallDecision> {
			if (denyTools.has(request.toolName)) {
				return {
					requestId: request.requestId,
					decision: "DENY",
					ruleId: "sandbox.deny-list",
					reason: "tool denied by sandbox policy",
				};
			}
			return {
				requestId: request.requestId,
				decision: defaultDecision,
				ruleId: "sandbox.allow",
			};
		},
		async forwardToolCall(input: {
			request: ToolCallRequest;
			decision: ToolCallDecision;
		}): Promise<ToolCallEffect> {
			if (input.decision.decision !== "ALLOW") {
				throw new Error("forward blocked when decision is not ALLOW");
			}
			return {
				effectId: crypto.randomUUID(),
				requestId: input.request.requestId,
				outcomeHash: `sha256:${input.request.inputHash}`,
			};
		},
	};
}

export function createInMemoryComputerSessionPort(): ComputerSessionPort {
	const sessions = new Map<string, ComputerSessionRef>();
	const revokedAuthorityTokens = new Set<string>();

	return {
		async acquireSession(input) {
			const session: ComputerSessionRef = {
				sessionId: crypto.randomUUID(),
				organizationId: input.organizationId,
				agentId: input.agentId,
				workspacePath: buildWorkspacePath(input.organizationId, input.agentId),
				status: "active",
			};
			sessions.set(session.sessionId, session);
			return session;
		},
		async releaseSession(input) {
			const existing = sessions.get(input.sessionId);
			if (!existing || existing.organizationId !== input.organizationId) {
				throw new Error("session not found for tenant");
			}
			const released = { ...existing, status: "released" as const };
			sessions.set(input.sessionId, released);
			return released;
		},
		async takeoverSession(input) {
			const existing = sessions.get(input.sessionId);
			if (!existing || existing.organizationId !== input.organizationId) {
				throw new Error("session not found for tenant");
			}
			if (existing.status !== "active" || existing.controller === "human") {
				throw new Error("session not eligible for takeover");
			}
			const revokedAuthorityToken = existing.authorityToken;
			revokedAuthorityTokens.add(revokedAuthorityToken);
			const session = {
				...existing,
				authorityToken: crypto.randomUUID(),
				controller: "human" as const,
			};
			sessions.set(input.sessionId, session);
			return {
				session,
				revokedAuthorityToken,
				previousController: "bot" as const,
			};
		},
		async resumeBotControl(input) {
			const existing = sessions.get(input.sessionId);
			if (!existing || existing.organizationId !== input.organizationId) {
				throw new Error("session not found for tenant");
			}
			if (existing.controller !== "human") {
				throw new Error("session not under human control");
			}
			const revokedAuthorityToken = existing.authorityToken;
			revokedAuthorityTokens.add(revokedAuthorityToken);
			const session = {
				...existing,
				authorityToken: crypto.randomUUID(),
				controller: "bot" as const,
			};
			sessions.set(input.sessionId, session);
			return { session, revokedAuthorityToken };
		},
		async getSession(input) {
			const existing = sessions.get(input.sessionId);
			if (!existing || existing.organizationId !== input.organizationId) {
				return null;
			}
			return existing;
		},
		isAuthorityRevoked(authorityToken: string) {
			return revokedAuthorityTokens.has(authorityToken);
		},
	};
}

export function createInMemoryToolAuditPort(): ToolAuditPort & {
	entries: ToolAuditEntry[];
} {
	const entries: ToolAuditEntry[] = [];

	return {
		entries,
		async recordBefore(input: ToolAuditBeforeInput): Promise<ToolAuditEntry> {
			const entry: ToolAuditEntry = {
				auditId: crypto.randomUUID(),
				requestId: input.requestId,
				phase: "before",
				organizationId: input.organizationId,
				agentId: input.agentId,
				toolName: input.toolName,
				decision: input.decision,
				ruleId: input.ruleId,
				recordedAt: new Date().toISOString(),
			};
			entries.push(entry);
			return entry;
		},
		async recordAfter(input: ToolAuditAfterInput): Promise<ToolAuditEntry> {
			const entry: ToolAuditEntry = {
				auditId: crypto.randomUUID(),
				requestId: input.requestId,
				phase: "after",
				organizationId: input.organizationId,
				agentId: input.agentId,
				toolName: input.toolName,
				outcomeHash: input.outcomeHash,
				recordedAt: new Date().toISOString(),
			};
			entries.push(entry);
			return entry;
		},
		async listTrail(query) {
			return entries.filter((entry) => entry.requestId === query.requestId);
		},
	};
}
