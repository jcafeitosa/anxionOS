import type { HealthDepStatus, HealthDeps } from "@anxionos/contracts";
import { createNeo4jDriverFromEnv } from "@anxionos/graph/neo4j";
import { connect } from "nats";
import type { Pool } from "pg";

const PROBE_TIMEOUT_MS = 3000;

async function probePostgres(pool?: Pool): Promise<HealthDepStatus> {
	if (!pool) {
		return "error";
	}
	try {
		await pool.query("SELECT 1");
		return "ok";
	} catch {
		return "error";
	}
}

async function probeNats(natsUrl?: string): Promise<HealthDepStatus> {
	if (!natsUrl) {
		return "error";
	}
	try {
		const nc = await connect({
			servers: natsUrl,
			timeout: PROBE_TIMEOUT_MS,
		});
		try {
			await nc.flush();
			return "ok";
		} finally {
			await nc.close();
		}
	} catch {
		return "error";
	}
}

async function probeNeo4j(): Promise<HealthDepStatus> {
	const uri = process.env.NEO4J_URI?.trim();
	const password = process.env.NEO4J_PASSWORD?.trim();
	if (!uri || !password) {
		return "error";
	}
	try {
		const driver = createNeo4jDriverFromEnv();
		try {
			await driver.verifyConnectivity();
			return "ok";
		} finally {
			await driver.close();
		}
	} catch {
		return "error";
	}
}

export async function probeHealthDeps(pool?: Pool): Promise<HealthDeps> {
	const natsUrl = process.env.NATS_URL?.trim();
	const [postgres, nats, neo4j] = await Promise.all([
		probePostgres(pool),
		probeNats(natsUrl),
		probeNeo4j(),
	]);
	return { postgres, nats, neo4j };
}
