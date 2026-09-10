import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { Agent } from "../../modules/agents/src/domain/entities/agent";
import type { AgentSkillBinding } from "../../modules/agents/src/domain/entities/agent-skill-binding";
import type { AgentVersion } from "../../modules/agents/src/domain/entities/agent-version";
import type { Skill } from "../../modules/agents/src/domain/entities/skill";
import type { SkillVersion } from "../../modules/agents/src/domain/entities/skill-version";
import type { AgentRepository } from "../../modules/agents/src/domain/ports/agent-repository";

import type { AgentBudgetPolicy } from "../../modules/agents/src/domain/entities/agent-budget-policy";
import type { AgentRoutine } from "../../modules/agents/src/domain/entities/agent-routine";
import type { AgentBudgetRepository } from "../../modules/agents/src/domain/ports/agent-budget-repository";
import type { AgentRoutineRepository } from "../../modules/agents/src/domain/ports/agent-routine-repository";
import type { AgentSkillBindingRepository } from "../../modules/agents/src/domain/ports/agent-skill-binding-repository";
import type { AgentVersionRepository } from "../../modules/agents/src/domain/ports/agent-version-repository";
import type { SkillRepository } from "../../modules/agents/src/domain/ports/skill-repository";
import type { SkillVersionRepository } from "../../modules/agents/src/domain/ports/skill-version-repository";
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

function journalKey(tenantId: string, commandId: string) {
	return `${tenantId}:${commandId}`;
}

export function createInMemorySkillRepository(seed: Skill[] = []): SkillRepository {
	const skills = new Map(seed.map((skill) => [skill.id, { ...skill }]));
	const slugIndex = new Map(
		seed.map((skill) => [`${skill.organizationId}:${skill.slug}`, skill.id]),
	);
	return {
		async save(skill) {
			skills.set(skill.id, { ...skill });
			slugIndex.set(`${skill.organizationId}:${skill.slug}`, skill.id);
			return { ...skill };
		},
		async findById(skillId) {
			return skills.get(skillId) ?? null;
		},
		async findByOrganizationAndSlug(organizationId, slug) {
			const skillId = slugIndex.get(`${organizationId}:${slug}`);
			return skillId ? (skills.get(skillId) ?? null) : null;
		},
	};
}

export function createInMemorySkillVersionRepository(
	seed: SkillVersion[] = [],
): SkillVersionRepository {
	const versions = new Map(
		seed.map((version) => [version.id, { ...version }]),
	);
	const versionNumbers = new Map<string, number>();
	for (const version of seed) {
		const current = versionNumbers.get(version.skillId) ?? 0;
		versionNumbers.set(version.skillId, Math.max(current, version.versionNumber));
	}
	return {
		async save(version) {
			versions.set(version.id, { ...version });
			const current = versionNumbers.get(version.skillId) ?? 0;
			versionNumbers.set(version.skillId, Math.max(current, version.versionNumber));
			return { ...version };
		},
		async findById(versionId) {
			return versions.get(versionId) ?? null;
		},
		async findBySkillAndVersionNumber(skillId, versionNumber) {
			for (const version of versions.values()) {
				if (version.skillId === skillId && version.versionNumber === versionNumber) {
					return version;
				}
			}
			return null;
		},
		async getNextVersionNumber(skillId) {
			return (versionNumbers.get(skillId) ?? 0) + 1;
		},
	};
}

export function createInMemoryAgentSkillBindingRepository(
	seed: AgentSkillBinding[] = [],
): AgentSkillBindingRepository {
	const bindings = new Map(seed.map((binding) => [binding.id, { ...binding }]));
	return {
		async save(binding) {
			bindings.set(binding.id, { ...binding });
			return { ...binding };
		},
		async findByAgentVersionAndSkillVersion(agentVersionId, skillVersionId) {
			for (const binding of bindings.values()) {
				if (
					binding.agentVersionId === agentVersionId &&
					binding.skillVersionId === skillVersionId
				) {
					return binding;
				}
			}
			return null;
		},
	};
}

export function createInMemoryCommandJournalRepository(
	seed: CommandJournalRecord[] = [],
): CommandJournalRepository {
	const records = new Map(
		seed.map((record) => [journalKey(record.tenantId, record.commandId), { ...record }]),
	);
	return {
		async findByCommandId(tenantId, commandId) {
			return records.get(journalKey(tenantId, commandId)) ?? null;
		},
		async record(entry: NewCommandJournalRecord) {
			const key = journalKey(entry.tenantId, entry.commandId);
			const existing = records.get(key);
			if (existing) {
				return existing;
			}
			const stored: CommandJournalRecord = {
				...entry,
				createdAt: new Date(),
			};
			records.set(key, stored);
			return stored;
		},
	};
}



export function createInMemoryAgentRoutineRepository(seed: AgentRoutine[] = []): AgentRoutineRepository {
	const routines = new Map(seed.map((routine) => [routine.id, { ...routine }]));
	const slugIndex = new Map(seed.map((r) => [`${r.agentId}:${r.slug}`, r.id]));
	return {
		async save(routine) {
			routines.set(routine.id, { ...routine });
			slugIndex.set(`${routine.agentId}:${routine.slug}`, routine.id);
			return { ...routine };
		},
		async findById(routineId) {
			return routines.get(routineId) ?? null;
		},
		async findByAgentAndSlug(agentId, slug) {
			const id = slugIndex.get(`${agentId}:${slug}`);
			return id ? (routines.get(id) ?? null) : null;
		},
	};
}

export function createInMemoryAgentBudgetRepository(seed: AgentBudgetPolicy[] = []): AgentBudgetRepository {
	const policies = new Map(seed.map((p) => [p.agentId, { ...p }]));
	return {
		async save(policy) {
			policies.set(policy.agentId, { ...policy });
			return { ...policy };
		},
		async findByAgentId(agentId) {
			return policies.get(agentId) ?? null;
		},
	};
}

export function createRecordingAgentsUnitOfWork(deps: {
	agentRepository: AgentRepository;
	agentVersionRepository: AgentVersionRepository;
	skillRepository?: SkillRepository;
	skillVersionRepository?: SkillVersionRepository;
	agentRoutineRepository?: AgentRoutineRepository;
	agentBudgetRepository?: AgentBudgetRepository;
	agentSkillBindingRepository?: AgentSkillBindingRepository;
	commandJournal: CommandJournalRepository;
}): { unitOfWork: AgentsUnitOfWork; published: DomainEventEnvelope[] } {
	const skillRepository = deps.skillRepository ?? createInMemorySkillRepository();
	const skillVersionRepository =
		deps.skillVersionRepository ?? createInMemorySkillVersionRepository();
	const agentRoutineRepository = deps.agentRoutineRepository ?? createInMemoryAgentRoutineRepository();
	const agentBudgetRepository = deps.agentBudgetRepository ?? createInMemoryAgentBudgetRepository();
	const agentSkillBindingRepository =
		deps.agentSkillBindingRepository ?? createInMemoryAgentSkillBindingRepository();
	const published: DomainEventEnvelope[] = [];
	let transactionChain: Promise<unknown> = Promise.resolve();
	const unitOfWork: AgentsUnitOfWork = {
		async runInTransaction(_ctx, work) {
			const run = transactionChain.then(async () => {
				const context: AgentsTransactionContext = {
					client: null,
					agentRepository: deps.agentRepository,
					agentVersionRepository: deps.agentVersionRepository,
					skillRepository,
					skillVersionRepository,
					agentRoutineRepository,
				agentBudgetRepository,
				agentSkillBindingRepository,
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
	"TRUNCATE agents_command_journal, agents_budget_policies, agents_routines, agents_agent_skill_bindings, agents_skill_versions, agents_skills, agents_agent_versions, agents_agents, domain_journal, outbox CASCADE";

export async function createAgentsPgDeps(pool: import("pg").Pool) {
	const { createAgentsUnitOfWork, createAgentsRepositoriesFromPool } =
		await import("@anxionos/agents");
	const repos = createAgentsRepositoriesFromPool(pool);
	return {
		unitOfWork: createAgentsUnitOfWork(pool),
		...repos,
	};
}

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
