import type { ComputerSessionRef } from "@anxionos/contracts/openbot";

/** Isolated computer workspace lifecycle per agent/tenant (R144-03, R144-05). */
export interface ComputerSessionPort {
	acquireSession(input: {
		organizationId: string;
		agentId: string;
	}): Promise<ComputerSessionRef>;
	releaseSession(input: {
		sessionId: string;
		organizationId: string;
	}): Promise<ComputerSessionRef>;
	takeoverSession(input: {
		sessionId: string;
		organizationId: string;
		operatorId: string;
	}): Promise<{
		session: ComputerSessionRef;
		revokedAuthorityToken: string;
		previousController: "bot" | "human";
	}>;
	resumeBotControl(input: {
		sessionId: string;
		organizationId: string;
	}): Promise<{
		session: ComputerSessionRef;
		revokedAuthorityToken: string;
	}>;
	getSession(input: {
		sessionId: string;
		organizationId: string;
	}): Promise<ComputerSessionRef | null>;
	isAuthorityRevoked(authorityToken: string): boolean;
}
