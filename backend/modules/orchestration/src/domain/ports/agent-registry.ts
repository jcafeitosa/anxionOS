export interface AgentRegistryPort {
	isAgentActive(agentId: string, organizationId: string): Promise<boolean>;
}
