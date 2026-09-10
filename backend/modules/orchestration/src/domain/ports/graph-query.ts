export interface GraphQueryPort {
	explainEscalationPath(
		agentId: string,
		organizationId: string,
	): Promise<{
		path: string[];
		complete: boolean;
	}>;
}
