import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import type { GraphStore } from "@anxionos/graph";
import { ensureGraphSchema } from "@anxionos/graph";
import {
	createNeo4jDriverFromEnv,
	createNeo4jGraphStore,
	ensureNeo4jGraphConstraints,
} from "@anxionos/graph/neo4j";
import {
	createFixtureOperationalBudget,
	createOrchestrationDb,
	createSystemLeaseClock,
	ensureOrchestrationSchema,
	type LeaseClock,
	type OperationalBudgetPort,
	type OrchestrationUnitOfWork,
} from "@anxionos/orchestration";
import type { Driver } from "neo4j-driver";
import type { Pool } from "pg";
import type {
	GraphGovernanceWorkerConfig,
	GraphProductWorkerConfig,
	OrchestrationS5WorkerConfig,
	OutboxRelayWorkerConfig,
} from "./config";

export interface GraphGovernanceWorkerRuntime {
	pool: Pool;
	graphStore: GraphStore;
	neo4jDriver: Driver;
}

export interface OutboxRelayWorkerRuntime {
	pool: Pool;
}

export async function bootstrapGraphGovernanceWorker(
	config: GraphGovernanceWorkerConfig | GraphProductWorkerConfig,
): Promise<GraphGovernanceWorkerRuntime> {
	const pool = createPgPool(config.databaseUrl);
	await pool.query("SELECT 1");
	await ensureEventingSchema(pool);
	await ensureGraphSchema(pool);

	const neo4jDriver = createNeo4jDriverFromEnv();
	try {
		await neo4jDriver.verifyConnectivity();
	} catch (error) {
		await neo4jDriver.close();
		const detail = error instanceof Error ? error.message : String(error);
		throw new Error(
			`Neo4j graph governance worker bootstrap failed: cannot reach database (${detail}). Check NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD.`,
		);
	}
	await ensureNeo4jGraphConstraints(neo4jDriver);
	const graphStore = createNeo4jGraphStore(neo4jDriver);
	return { pool, graphStore, neo4jDriver };
}

export async function shutdownGraphGovernanceWorker(
	runtime: GraphGovernanceWorkerRuntime,
): Promise<void> {
	await runtime.pool.end();
	await runtime.neo4jDriver.close();
}

export async function bootstrapOutboxRelayWorker(
	config: OutboxRelayWorkerConfig,
): Promise<OutboxRelayWorkerRuntime> {
	const pool = createPgPool(config.databaseUrl);
	await pool.query("SELECT 1");
	await ensureEventingSchema(pool);
	return { pool };
}

export async function shutdownOutboxRelayWorker(
	runtime: OutboxRelayWorkerRuntime,
): Promise<void> {
	await runtime.pool.end();
}

export interface OrchestrationS5WorkerRuntime {
	pool: Pool;
	unitOfWork: OrchestrationUnitOfWork;
	leaseClock: LeaseClock;
	operationalBudget: OperationalBudgetPort;
}

export async function bootstrapOrchestrationS5Worker(
	config: OrchestrationS5WorkerConfig,
): Promise<OrchestrationS5WorkerRuntime> {
	const pool = createPgPool(config.databaseUrl);
	await pool.query("SELECT 1");
	await ensureEventingSchema(pool);
	await ensureOrchestrationSchema(pool);
	const { unitOfWork } = createOrchestrationDb(pool);
	return {
		pool,
		unitOfWork,
		leaseClock: createSystemLeaseClock(),
		operationalBudget: createFixtureOperationalBudget(),
	};
}

export async function shutdownOrchestrationS5Worker(
	runtime: OrchestrationS5WorkerRuntime,
): Promise<void> {
	await runtime.pool.end();
}
