import {
	createAgentsDb,
	createAgentsUnitOfWork,
} from "@anxionos/agents";
import type { Pool } from "pg";
import type { AgentsPluginDeps } from "./plugin";

export type AgentsApiRuntime = Omit<
	AgentsPluginDeps,
	"auth" | "membershipRepository" | "scopedPool" | "identityRepository"
>;

export function createAgentsApiRuntime(pool: Pool): AgentsApiRuntime {
	const agentsDb = createAgentsDb(pool);
	return {
		agentRepository: agentsDb.agentRepository,
		agentVersionRepository: agentsDb.agentVersionRepository,
		commandJournal: agentsDb.commandJournal,
		unitOfWork: createAgentsUnitOfWork(pool),
	};
}
