export interface AgentPublishGuardPort {
	assertPublishAllowed(input: {
		agencyId: string;
		agentId: string;
	}): Promise<void>;
}
