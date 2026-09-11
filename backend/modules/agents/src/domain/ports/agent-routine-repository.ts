import type { AgentRoutine } from "../entities/agent-routine";

export interface AgentRoutineRepository {
	save(routine: AgentRoutine): Promise<AgentRoutine>;
	findById(routineId: string): Promise<AgentRoutine | null>;
	findByAgentAndSlug(
		agentId: string,
		slug: string,
	): Promise<AgentRoutine | null>;
}
