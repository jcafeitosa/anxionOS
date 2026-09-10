/** Port for orchestration to materialize an AgentRun from a routine trigger. */
export interface RoutineRunDispatchPort {
	dispatchRun(input: {
		organizationId: string;
		agentId: string;
		routineId: string;
		dedupeKey: string;
	}): Promise<{ runId: string }>;
}
