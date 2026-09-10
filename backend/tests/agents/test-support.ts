import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { Agent } from "../../modules/agents/src/domain/entities/agent";
import type { AgentVersion } from "../../modules/agents/src/domain/entities/agent-version";
import type { AgentRepository } from "../../modules/agents/src/domain/ports/agent-repository";
import type { AgentVersionRepository } from "../../modules/agents/src/domain/ports/agent-version-repository";
import type {
	CommandJournalRecord,
	CommandJournalRepository,
	NewCommandJournalRecord,
} from "../../modules/agents/src/domain/ports/command-journal";
import type {
	AgentsTransactionContext,
	AgentsUnitOfWork,
} from "../../modules/agents/src/domain/ports/agents-unit-of-work";

export function createInMemoryAgentRepository(seed: Agent[] = []): AgentRepository {
	const agents = new Map(seed.map((agent) => [agent.id, { ...agent }]));
	return {
		async save(agent) {
			agents.set(agent.id, { ...agent });
			return { ...agent };
		},
		async findById(agentId) {
			return agents.get(agentId) ?? null;
		},
	};
}

export function createInMemoryAgentVersionRepository(
	seed: AgentVersion[] = [],
): AgentVersionRepository {
	const versions = new Map(
		seed.map((version) => [versionKey(version), { ...version }]),
	);
	return {
		async save(version) {
			const key = versionKey(version);
			versions.set(key, { ...version });
			return { ...version };
		},
		async findById(versionId) {
			for (const version of versions.values()) {
				if (version.id === versionId) {
					return version;
				}
			}
			return null;
		},
		async findByAgentAndVersionNumber(agentId, versionNumber) {
			return versions.get(`${agentId}:${versionNumber}`) ?? null;
		},
		async listByAgentId(agentId) {
			return [...versions.values()].filter(
				(version) => version.agentId === agentId,
			);
		},
	};
}

export function createInMemoryCommandJournalRepository(
	seed: CommandJournalRecord[] = [],
): CommandJournalRepository {
	const records = new Map(
		seed.map((record) => [record.commandId, { ...record }]),
	);
	return {
		async findByCommandId(commandId) {
			return records.get(commandId) ?? null;
		},
		async record(entry: NewCommandJournalRecord) {
			const existing = records.get(entry.commandId);
			if (existing) {
				return existing;
			}
			const stored: CommandJournalRecord = {
				...entry,
				createdAt: new Date(),
			};
			records.set(entry.commandId, stored);
			return stored;
		},
	};
}

export function createRecordingAgentsUnitOfWork(deps: {
	agentRepository: AgentRepository;
	agentVersionRepository: AgentVersionRepository;
	commandJournal: CommandJournalRepository;
}): { unitOfWork: AgentsUnitOfWork; published: DomainEventEnvelope[] } {
	const published: DomainEventEnvelope[] = [];
	let transactionChain: Promise<unknown> = Promise.resolve();
	const unitOfWork: AgentsUnitOfWork = {
		async runInTransaction(_ctx, work) {
			const run = transactionChain.then(async () => {
				const context: AgentsTransactionContext = {
					client: null,
					agentRepository: deps.agentRepository,
					agentVersionRepository: deps.agentVersionRepository,
					commandJournal: deps.commandJournal,
					async publishEvents(envelopes) {
						published.push(...envelopes);
					},
				};
				return work(context);
			});
			transactionChain = run.catch(() => undefined);
			return run;
		},
	};
	return { unitOfWork, published };
}

function versionKey(version: Pick<AgentVersion, "agentId" | "versionNumber">): string {
	return `${version.agentId}:${version.versionNumber}`;
}

export function getDatabaseUrl(): string | undefined {
	return process.env.DATABASE_URL?.trim() || undefined;
}

export function shouldRunPgIntegrationTests(): boolean {
	return (
		process.env.RUN_PG_INTEGRATION_TESTS === "true" && Boolean(getDatabaseUrl())
	);
}

const AGENTS_TRUNCATE_SQL =
	"TRUNCATE agents_command_journal, agents_agent_versions, agents_agents, domain_journal, outbox";

export async function withAgentsPgHarness<T>(
	work: (ctx: { pool: import("pg").Pool }) => Promise<T>,
): Promise<T | undefined> {
	const url = getDatabaseUrl();
	if (!shouldRunPgIntegrationTests() || !url) {
		return undefined;
	}

	const { createPgPool, ensureEventingSchema } = await import(
		"@anxionos/eventing/postgres"
	);
	const { ensureAgentsSchema } = await import("@anxionos/agents");

	const pool = createPgPool(url);
	try {
		await ensureEventingSchema(pool);
		await ensureAgentsSchema(pool);
		await pool.query(AGENTS_TRUNCATE_SQL);
		return await work({ pool });
	} finally {
		await pool.end();
	}
}
