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
}
