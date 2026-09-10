/** Worker profile identifiers (composition root — apps/workers). */
export const WORKER_PROFILE_GRAPH_GOVERNANCE = "graph-governance-projection";
export const WORKER_PROFILE_GRAPH_PRODUCT = "graph-product-projection";
export const WORKER_PROFILE_OUTBOX_RELAY = "outbox-relay";

export const DEFAULT_NATS_EVENTS_STREAM = "EVENTS";
export const DEFAULT_NATS_GRAPH_GOVERNANCE_SUBJECT = "events.governance.>";
export const DEFAULT_NATS_GRAPH_GOVERNANCE_DURABLE = "graph-governance-v1";
export const DEFAULT_NATS_GRAPH_ORGANIZATIONS_SUBJECT =
	"agency.*.events.organizations.>";
export const DEFAULT_NATS_GRAPH_ORGANIZATIONS_DURABLE = "graph-organizations-v1";
export const DEFAULT_NATS_GRAPH_PRODUCT_SUBJECT = "events.product.>";
export const DEFAULT_NATS_GRAPH_PRODUCT_DURABLE = "graph-product-v1";
export const DEFAULT_NATS_GRAPH_AGENTS_SUBJECT = "events.agents.>";
export const DEFAULT_NATS_GRAPH_AGENTS_DURABLE = "graph-agents-v1";
export const DEFAULT_NATS_MAX_RECONNECT_ATTEMPTS = -1;
export const DEFAULT_OUTBOX_RELAY_POLL_INTERVAL_MS = 1000;
export const DEFAULT_OUTBOX_RELAY_BATCH_SIZE = 50;
export const DEFAULT_OUTBOX_RELAY_LEASE_TTL_MS = 30_000;

export interface GraphGovernanceWorkerConfig {
	profile: typeof WORKER_PROFILE_GRAPH_GOVERNANCE;
	databaseUrl: string;
	natsUrl: string;
	eventsStream: string;
	governanceSubject: string;
	governanceDurable: string;
	organizationsSubject: string;
	organizationsDurable: string;
}

export interface GraphProductWorkerConfig {
	profile: typeof WORKER_PROFILE_GRAPH_PRODUCT;
	databaseUrl: string;
	natsUrl: string;
	eventsStream: string;
	productSubject: string;
	productDurable: string;
	agentsSubject: string;
	agentsDurable: string;
}

export interface OutboxRelayWorkerConfig {
	profile: typeof WORKER_PROFILE_OUTBOX_RELAY;
	databaseUrl: string;
	natsUrl: string;
	eventsStream: string;
	pollIntervalMs: number;
	batchSize: number;
	leaseTtlMs: number;
}

function requireEnv(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) {
		throw new Error(`${name} is required for workers bootstrap`);
	}
	return value;
}

function parsePositiveIntEnv(name: string, fallback: number): number {
	const raw = process.env[name]?.trim();
	if (!raw) {
		return fallback;
	}
	const parsed = Number.parseInt(raw, 10);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new Error(`${name} must be a positive integer`);
	}
	return parsed;
}

export function loadGraphGovernanceWorkerConfig(): GraphGovernanceWorkerConfig {
	const profile =
		process.env.WORKER_PROFILE?.trim() ?? WORKER_PROFILE_GRAPH_GOVERNANCE;
	if (profile !== WORKER_PROFILE_GRAPH_GOVERNANCE) {
		throw new Error(
			`Unsupported WORKER_PROFILE "${profile}" — expected ${WORKER_PROFILE_GRAPH_GOVERNANCE}`,
		);
	}
	return {
		profile,
		databaseUrl: requireEnv("DATABASE_URL"),
		natsUrl: requireEnv("NATS_URL"),
		eventsStream:
			process.env.NATS_EVENTS_STREAM?.trim() ?? DEFAULT_NATS_EVENTS_STREAM,
		governanceSubject:
			process.env.NATS_GRAPH_GOVERNANCE_SUBJECT?.trim() ??
			DEFAULT_NATS_GRAPH_GOVERNANCE_SUBJECT,
		governanceDurable:
			process.env.NATS_GRAPH_GOVERNANCE_DURABLE?.trim() ??
			DEFAULT_NATS_GRAPH_GOVERNANCE_DURABLE,
		organizationsSubject:
			process.env.NATS_GRAPH_ORGANIZATIONS_SUBJECT?.trim() ??
			DEFAULT_NATS_GRAPH_ORGANIZATIONS_SUBJECT,
		organizationsDurable:
			process.env.NATS_GRAPH_ORGANIZATIONS_DURABLE?.trim() ??
			DEFAULT_NATS_GRAPH_ORGANIZATIONS_DURABLE,
	};
}

export function loadGraphProductWorkerConfig(): GraphProductWorkerConfig {
	const profile =
		process.env.WORKER_PROFILE?.trim() ?? WORKER_PROFILE_GRAPH_PRODUCT;
	if (profile !== WORKER_PROFILE_GRAPH_PRODUCT) {
		throw new Error(
			`Unsupported WORKER_PROFILE "${profile}" — expected ${WORKER_PROFILE_GRAPH_PRODUCT}`,
		);
	}
	const enabled = process.env.ENABLE_PRODUCT_GRAPH_PROJECTION?.trim() === "true";
	if (!enabled) {
		throw new Error(
			"ENABLE_PRODUCT_GRAPH_PROJECTION=true is required for graph-product-projection worker profile",
		);
	}
	return {
		profile,
		databaseUrl: requireEnv("DATABASE_URL"),
		natsUrl: requireEnv("NATS_URL"),
		eventsStream:
			process.env.NATS_EVENTS_STREAM?.trim() ?? DEFAULT_NATS_EVENTS_STREAM,
		productSubject:
			process.env.NATS_GRAPH_PRODUCT_SUBJECT?.trim() ??
			DEFAULT_NATS_GRAPH_PRODUCT_SUBJECT,
		productDurable:
			process.env.NATS_GRAPH_PRODUCT_DURABLE?.trim() ??
			DEFAULT_NATS_GRAPH_PRODUCT_DURABLE,
		agentsSubject:
			process.env.NATS_GRAPH_AGENTS_SUBJECT?.trim() ??
			DEFAULT_NATS_GRAPH_AGENTS_SUBJECT,
		agentsDurable:
			process.env.NATS_GRAPH_AGENTS_DURABLE?.trim() ??
			DEFAULT_NATS_GRAPH_AGENTS_DURABLE,
	};
}

export function loadOutboxRelayWorkerConfig(): OutboxRelayWorkerConfig {
	const profile =
		process.env.WORKER_PROFILE?.trim() ?? WORKER_PROFILE_OUTBOX_RELAY;
	if (profile !== WORKER_PROFILE_OUTBOX_RELAY) {
		throw new Error(
			`Unsupported WORKER_PROFILE "${profile}" — expected ${WORKER_PROFILE_OUTBOX_RELAY}`,
		);
	}
	return {
		profile,
		databaseUrl: requireEnv("DATABASE_URL"),
		natsUrl: requireEnv("NATS_URL"),
		eventsStream:
			process.env.NATS_EVENTS_STREAM?.trim() ?? DEFAULT_NATS_EVENTS_STREAM,
		pollIntervalMs: parsePositiveIntEnv(
			"OUTBOX_RELAY_POLL_INTERVAL_MS",
			DEFAULT_OUTBOX_RELAY_POLL_INTERVAL_MS,
		),
		batchSize: parsePositiveIntEnv(
			"OUTBOX_RELAY_BATCH_SIZE",
			DEFAULT_OUTBOX_RELAY_BATCH_SIZE,
		),
		leaseTtlMs: parsePositiveIntEnv(
			"OUTBOX_RELAY_LEASE_TTL_MS",
			DEFAULT_OUTBOX_RELAY_LEASE_TTL_MS,
		),
	};
}
