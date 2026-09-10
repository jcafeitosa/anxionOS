import type { Driver } from "neo4j-driver";
import neo4j, {} from "neo4j-driver";

/**
 * Creates a Neo4j driver. Only the graph adapter layer may use neo4j-driver (D-GR-005, AR01).
 * Requires NEO4J_URI + NEO4J_PASSWORD at runtime; NEO4J_USER defaults to "neo4j".
 */
export function createNeo4jDriver(config: Neo4jClientConfig): Driver {
	return neo4j.driver(
		config.uri,
		neo4j.auth.basic(config.user, config.password),
	);
}
export function createNeo4jDriverFromEnv(): Driver {
	const uri = process.env.NEO4J_URI;
	const user = process.env.NEO4J_USER ?? "neo4j";
	const password = process.env.NEO4J_PASSWORD;
	if (!uri) {
		throw new Error("NEO4J_URI is required for Neo4j graph adapter");
	}
	if (!password) {
		throw new Error("NEO4J_PASSWORD is required for Neo4j graph adapter");
	}
	return createNeo4jDriver({ uri, user, password });
}

export interface Neo4jClientConfig {
	uri: string;
	user: string;
	password: string;
}
/**
 * Creates a Neo4j driver. Only the graph adapter layer may use neo4j-driver (D-GR-005, AR01).
 * Requires NEO4J_URI + NEO4J_PASSWORD at runtime; NEO4J_USER defaults to "neo4j".
 */
