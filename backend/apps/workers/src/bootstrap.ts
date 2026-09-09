import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import { ensureGraphSchema } from "@anxionos/graph";
import {
	createNeo4jDriverFromEnv,
	createNeo4jGraphStore,
	ensureNeo4jGraphConstraints,
} from "@anxionos/graph/neo4j";
import type { Driver } from "neo4j-driver";
import type { Pool } from "pg";
import type { GraphStore } from "@anxionos/graph";
import type {
	GraphGovernanceWorkerConfig,
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
	config: GraphGovernanceWorkerConfig,
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
