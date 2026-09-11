import { randomUUID } from "node:crypto";
import type { ComputerSessionRef } from "@anxionos/contracts/openbot";
import {
	assertSessionTenant,
	buildWorkspacePath,
} from "../../application/services/workspace-path-jail";
import { throwAgentsError } from "../../application/errors";
import type { ComputerSessionPort } from "../../domain/ports/computer-session-port";

function sessionKey(organizationId: string, agentId: string): string {
	return `${organizationId}:${agentId}`;
}

function createSessionRef(input: {
	organizationId: string;
	agentId: string;
}): ComputerSessionRef {
	return {
		sessionId: randomUUID(),
		organizationId: input.organizationId,
		agentId: input.agentId,
		workspacePath: buildWorkspacePath(input.organizationId, input.agentId),
		status: "active",
		authorityToken: randomUUID(),
		controller: "bot",
	};
}

export function createSandboxComputerSessionAdapter(): ComputerSessionPort {
	const sessionsById = new Map<string, ComputerSessionRef>();
	const activeByTenantAgent = new Map<string, string>();
	const revokedAuthorityTokens = new Set<string>();

	function getActiveSession(
		sessionId: string,
		organizationId: string,
	): ComputerSessionRef {
		const existing = sessionsById.get(sessionId);
		if (!existing) {
			throwAgentsError(
				"AGT_TRAVERSAL_DENIED",
				`Computer session not found: ${sessionId}`,
			);
		}
		assertSessionTenant(existing, organizationId);
		if (existing.status !== "active") {
			throwAgentsError(
				"AGT_TRAVERSAL_DENIED",
				`Computer session is not active: ${sessionId}`,
			);
		}
		return existing;
	}

	function rotateAuthority(
		session: ComputerSessionRef,
		nextController: ComputerSessionRef["controller"],
	): ComputerSessionRef {
		revokedAuthorityTokens.add(session.authorityToken);
		const rotated: ComputerSessionRef = {
			...session,
			authorityToken: randomUUID(),
			controller: nextController,
		};
		sessionsById.set(session.sessionId, rotated);
		return rotated;
	}

	return {
		async acquireSession(input) {
			const key = sessionKey(input.organizationId, input.agentId);
			const existingId = activeByTenantAgent.get(key);
			if (existingId) {
				const existing = sessionsById.get(existingId);
				if (existing && existing.status === "active") {
					return existing;
				}
			}

			const session = createSessionRef(input);
			sessionsById.set(session.sessionId, session);
			activeByTenantAgent.set(key, session.sessionId);
			return session;
		},

		async releaseSession(input) {
			const existing = getActiveSession(input.sessionId, input.organizationId);
			revokedAuthorityTokens.add(existing.authorityToken);
			const released: ComputerSessionRef = {
				...existing,
				status: "released",
			};
			sessionsById.set(input.sessionId, released);
			activeByTenantAgent.delete(
				sessionKey(existing.organizationId, existing.agentId),
			);
			return released;
		},

		async takeoverSession(input) {
			const existing = getActiveSession(input.sessionId, input.organizationId);
			if (existing.controller === "human") {
				throwAgentsError(
					"AGT_TRAVERSAL_DENIED",
					`Computer session already under human control: ${input.sessionId}`,
				);
			}
			const revokedAuthorityToken = existing.authorityToken;
			const session = rotateAuthority(existing, "human");
			return {
				session,
				revokedAuthorityToken,
				previousController: "bot",
			};
		},

		async resumeBotControl(input) {
			const existing = getActiveSession(input.sessionId, input.organizationId);
			if (existing.controller !== "human") {
				throwAgentsError(
					"AGT_TRAVERSAL_DENIED",
					`Computer session is not under human control: ${input.sessionId}`,
				);
			}
			const revokedAuthorityToken = existing.authorityToken;
			const session = rotateAuthority(existing, "bot");
			return {
				session,
				revokedAuthorityToken,
			};
		},

		async getSession(input) {
			const existing = sessionsById.get(input.sessionId);
			if (!existing) {
				return null;
			}
			assertSessionTenant(existing, input.organizationId);
			return existing;
		},

		isAuthorityRevoked(authorityToken: string): boolean {
			return revokedAuthorityTokens.has(authorityToken);
		},
	};
}
