/**
 * OpenAPI tags for the 23 baseline modules (ADR0002) plus composition
 * surfaces (Health, Realtime). Unmounted modules appear as documented
 * GET placeholders in the spec only — they are not HTTP handlers.
 */
export const COMPOSITION_OPENAPI_TAGS = [
	{
		name: "Health",
		description:
			"Composition root liveness. Not a domain module; probes Postgres, NATS and Neo4j.",
	},
	{
		name: "Realtime",
		description:
			"Composition gateway: SSE, long-poll and WebSocket for institutional envelopes.",
	},
] as const;

export const BASELINE_MODULE_OPENAPI_TAGS = [
	{
		name: "Identity",
		folder: "identity",
		mounted: true as const,
		description:
			"Users, sessions and Better Auth (`/api/auth/*`, `/v1/auth/post-login-context`).",
	},
	{
		name: "Organizations",
		folder: "organizations",
		mounted: true as const,
		description:
			"Agency, Owner, onboarding, memberships and invites (`/v1/organizations/*`).",
	},
	{
		name: "Governance",
		folder: "governance",
		mounted: true as const,
		description:
			"Grants, autonomy L0–L4 and authorization.can T01 (`/v1/agencies/:id/grants`, `/v1/governance/*`).",
	},
	{
		name: "Graph",
		folder: "graph",
		mounted: false as const,
		description:
			"Institutional graph kernel, schema, traversals and temporality. HTTP `/v1/graph/*` not mounted yet.",
	},
	{
		name: "Agents",
		folder: "agents",
		mounted: true as const,
		description:
			"Agent registry, versions, lifecycle and brain invoke (`/v1/agencies/:id/agents`).",
	},
	{
		name: "Orchestration",
		folder: "orchestration",
		mounted: false as const,
		description:
			"Goals, tasks, runs, heartbeat and scheduler. HTTP `/v1/orchestration/*` not mounted yet.",
	},
	{
		name: "Connections",
		folder: "connections",
		mounted: false as const,
		description:
			"Providers, accounts, models and inference. HTTP `/v1/connections/*` not mounted yet.",
	},
	{
		name: "Knowledge",
		folder: "knowledge",
		mounted: false as const,
		description:
			"Documents, memories, evidence and Graph RAG. HTTP `/v1/knowledge/*` not mounted yet.",
	},
	{
		name: "Market data",
		folder: "market-data",
		mounted: false as const,
		description:
			"Instruments, feeds, prices and market events. HTTP `/v1/market-data/*` not mounted yet.",
	},
	{
		name: "Strategies",
		folder: "strategies",
		mounted: true as const,
		description:
			"Strategies, backtests, deployments and signals (`/v1/strategies/agencies/:agencyId/*`).",
	},
	{
		name: "Capital",
		folder: "capital",
		mounted: false as const,
		description:
			"Capital accounts, allocations and reserves. HTTP `/v1/capital/*` not mounted yet.",
	},
	{
		name: "Portfolios",
		folder: "portfolios",
		mounted: true as const,
		description:
			"Portfolios, positions and valuation overview. HTTP GET `/v1/agencies/:agencyId/portfolios`.",
	},
	{
		name: "Decisions",
		folder: "decisions",
		mounted: false as const,
		description:
			"Investment decisions and intents. HTTP `/v1/decisions/*` not mounted yet.",
	},
	{
		name: "Risk",
		folder: "risk",
		mounted: true as const,
		description:
			"Risk policies, limits, checks and kill switch (`/v1/risk/agencies/:agencyId/kill-switch`).",
	},
	{
		name: "Execution",
		folder: "execution",
		mounted: true as const,
		description:
			"Orders, fills and venue reconciliation (`/v1/execution/agencies/:agencyId/orders`, reconciliation cases).",
	},
	{
		name: "Accounting",
		folder: "accounting",
		mounted: false as const,
		description:
			"Ledger, fees and financial reconciliation. HTTP `/v1/accounting/*` not mounted yet.",
	},
	{
		name: "Performance",
		folder: "performance",
		mounted: true as const,
		description:
			"P&L, metrics and attribution (`/v1/performance/agencies/:agencyId/outcome-snapshots`, position exposure snapshots and derived metrics).",
	},
	{
		name: "Evaluation",
		folder: "evaluation",
		mounted: true as const,
		description:
			"Evaluation records, scores and strategy certifications (`/v1/evaluation/agencies/:agencyId/*`). Outcome scoring is event-driven via performance.outcome.recorded.v1.",
	},
	{
		name: "Simulation",
		folder: "simulation",
		mounted: true as const,
		description:
			"Digital twin and isolated scenario runs (`/v1/simulation/agencies/:agencyId/runs`). Read-only HTTP; run creation is event-driven.",
	},
	{
		name: "Audit",
		folder: "audit",
		mounted: false as const,
		description:
			"Flight recorder, lineage and governed replay. HTTP `/v1/audit/*` not mounted yet.",
	},
	{
		name: "Billing",
		folder: "billing",
		mounted: false as const,
		description:
			"Platform subscription and charging. HTTP `/v1/billing/*` not mounted yet.",
	},
	{
		name: "Partners",
		folder: "partners",
		mounted: true as const,
		description:
			"Referrals, commissions and payouts (`/v1/partners/organizations/:id`).",
	},
	{
		name: "Operations",
		folder: "operations",
		mounted: true as const,
		description:
			"Incidents, retention, export and recovery (`/v1/operations/agencies/:agencyId/*`). Recovery task lifecycle mounted in S4e.",
	},
] as const;

export const OPENAPI_TAGS = [
	...COMPOSITION_OPENAPI_TAGS,
	...BASELINE_MODULE_OPENAPI_TAGS.map((module) => ({
		name: module.name,
		description: module.description,
	})),
];

export const OPENAPI_MODULE_TAG_GROUPS = [
	{
		name: "Platform",
		tags: ["Health", "Realtime"],
	},
	{
		name: "Identity & access",
		tags: ["Identity", "Organizations", "Governance"],
	},
	{
		name: "Intelligence",
		tags: ["Graph", "Agents", "Knowledge", "Connections", "Orchestration"],
	},
	{
		name: "Markets",
		tags: ["Market data", "Strategies", "Simulation"],
	},
	{
		name: "Capital cycle",
		tags: [
			"Capital",
			"Portfolios",
			"Decisions",
			"Risk",
			"Execution",
			"Accounting",
			"Performance",
		],
	},
	{
		name: "Institution",
		tags: ["Evaluation", "Audit", "Billing", "Partners", "Operations"],
	},
] as const;

export function plannedModuleOpenApiPaths(): Record<
	string,
	Record<
		string,
		{
			tags: string[];
			operationId: string;
			summary: string;
			description: string;
			responses: Record<string, { description: string }>;
		}
	>
> {
	const paths: ReturnType<typeof plannedModuleOpenApiPaths> = {};
	for (const module of BASELINE_MODULE_OPENAPI_TAGS) {
		if (module.mounted) continue;
		const path = `/v1/${module.folder}`;
		paths[path] = {
			get: {
				tags: [module.name],
				operationId: `${module.folder.replace(/-/g, "_")}HttpNotMounted`,
				summary: "HTTP not mounted on apps/api",
				description: `${module.description} Owner: backend/modules/${module.folder}. This operation exists only in the OpenAPI catalog so the module is visible in Scalar; the composition root does not register a handler.`,
				responses: {
					"501": {
						description:
							"Not implemented on this composition root. Domain commands live in the module, not in a public HTTP route yet.",
					},
				},
			},
		};
	}
	return paths;
}
