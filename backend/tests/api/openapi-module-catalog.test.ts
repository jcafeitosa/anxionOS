import { describe, expect, test } from "bun:test";
import { OPENAPI_MODULE_TAG_GROUPS } from "../../apps/api/src/openapi-baseline";
import { createOpenApiCatalogApp } from "../../apps/api/src/openapi-catalog-harness";

const DOCUMENTED_OPERATIONS: Array<{
	path: string;
	method: string;
	tag: string;
}> = [
	{ path: "/health", method: "get", tag: "Health" },
	{ path: "/api/auth/sign-in/email", method: "post", tag: "Identity" },
	{ path: "/api/auth/sign-up/email", method: "post", tag: "Identity" },
	{ path: "/api/auth/get-session", method: "get", tag: "Identity" },
	{ path: "/api/auth/sign-out", method: "post", tag: "Identity" },
	{ path: "/v1/auth/post-login-context", method: "get", tag: "Identity" },
	{ path: "/v1/organizations/agencies", method: "post", tag: "Organizations" },
	{ path: "/v1/organizations/agencies", method: "get", tag: "Organizations" },
	{
		path: "/v1/organizations/agencies/{agencyId}",
		method: "get",
		tag: "Organizations",
	},
	{
		path: "/v1/organizations/agencies/{agencyId}/markets",
		method: "patch",
		tag: "Organizations",
	},
	{
		path: "/v1/organizations/agencies/{agencyId}/memberships",
		method: "get",
		tag: "Organizations",
	},
	{
		path: "/v1/organizations/agencies/{agencyId}/memberships/{membershipId}",
		method: "get",
		tag: "Organizations",
	},
	{
		path: "/v1/organizations/agencies/{agencyId}/memberships/invite",
		method: "post",
		tag: "Organizations",
	},
	{
		path: "/v1/organizations/agencies/{agencyId}/memberships/{membershipId}/activate",
		method: "post",
		tag: "Organizations",
	},
	{
		path: "/v1/organizations/agencies/{agencyId}/memberships/{membershipId}/revoke",
		method: "post",
		tag: "Organizations",
	},
	{
		path: "/v1/organizations/invites/accept",
		method: "post",
		tag: "Organizations",
	},
	{ path: "/v1/agencies/{agencyId}/grants", method: "get", tag: "Governance" },
	{ path: "/v1/agencies/{agencyId}/grants", method: "post", tag: "Governance" },
	{
		path: "/v1/agencies/{agencyId}/grants/{grantId}",
		method: "delete",
		tag: "Governance",
	},
	{
		path: "/v1/agencies/{agencyId}/agents/{agentId}/autonomy",
		method: "get",
		tag: "Governance",
	},
	{
		path: "/v1/agencies/{agencyId}/agents/{agentId}/autonomy",
		method: "post",
		tag: "Governance",
	},
	{
		path: "/v1/agencies/{agencyId}/agents/{agentId}/autonomy/transition",
		method: "post",
		tag: "Governance",
	},
	{
		path: "/v1/agencies/{agencyId}/change-proposals",
		method: "get",
		tag: "Governance",
	},
	{
		path: "/v1/governance/authorization/can",
		method: "post",
		tag: "Governance",
	},
	{ path: "/v1/governance/autonomy/matrix", method: "get", tag: "Governance" },
	{
		path: "/v1/governance/autonomy/evaluate",
		method: "post",
		tag: "Governance",
	},
	{ path: "/v1/agencies/{agencyId}/agents", method: "post", tag: "Agents" },
	{
		path: "/v1/agencies/{agencyId}/agents/{agentId}",
		method: "get",
		tag: "Agents",
	},
	{
		path: "/v1/agencies/{agencyId}/agents/{agentId}/versions",
		method: "get",
		tag: "Agents",
	},
	{
		path: "/v1/agencies/{agencyId}/agents/{agentId}/versions",
		method: "post",
		tag: "Agents",
	},
	{
		path: "/v1/agencies/{agencyId}/agents/{agentId}/versions/rollback",
		method: "post",
		tag: "Agents",
	},
	{
		path: "/v1/agencies/{agencyId}/agents/{agentId}/status",
		method: "patch",
		tag: "Agents",
	},
	{
		path: "/v1/agencies/{agencyId}/agents/{agentId}/invoke",
		method: "post",
		tag: "Agents",
	},
	{
		path: "/v1/agencies/{agencyId}/agents/{agentId}/skills/bind",
		method: "post",
		tag: "Agents",
	},
	{ path: "/v1/agencies/{agencyId}/skills", method: "post", tag: "Agents" },
	{
		path: "/v1/agencies/{agencyId}/skills/{skillId}/versions",
		method: "post",
		tag: "Agents",
	},
	{
		path: "/v1/agencies/{agencyId}/skills/{skillId}/versions/{skillVersionId}/submit",
		method: "post",
		tag: "Agents",
	},
	{
		path: "/v1/agencies/{agencyId}/skills/{skillId}/versions/{skillVersionId}/evaluate",
		method: "post",
		tag: "Agents",
	},
	{
		path: "/v1/partners/organizations/{organizationId}",
		method: "get",
		tag: "Partners",
	},
	{
		path: "/v1/partners/organizations/{organizationId}/commission-accruals",
		method: "get",
		tag: "Partners",
	},
	{
		path: "/v1/partners/organizations/{organizationId}/payouts",
		method: "get",
		tag: "Partners",
	},
	{ path: "/api/realtime/events", method: "get", tag: "Realtime" },
	{ path: "/api/realtime/poll", method: "get", tag: "Realtime" },
	{ path: "/api/realtime/ws", method: "ws", tag: "Realtime" },
	{ path: "/v1/graph", method: "get", tag: "Graph" },
	{ path: "/v1/orchestration", method: "get", tag: "Orchestration" },
	{ path: "/v1/connections", method: "get", tag: "Connections" },
	{ path: "/v1/knowledge", method: "get", tag: "Knowledge" },
	{ path: "/v1/market-data", method: "get", tag: "Market data" },
	{
		path: "/v1/strategies/agencies/{agencyId}",
		method: "post",
		tag: "Strategies",
	},
	{
		path: "/v1/strategies/agencies/{agencyId}/{strategyId}/versions",
		method: "post",
		tag: "Strategies",
	},
	{
		path: "/v1/strategies/agencies/{agencyId}/{strategyId}/versions/{strategyVersionId}/publish",
		method: "post",
		tag: "Strategies",
	},
	{
		path: "/v1/strategies/agencies/{agencyId}/{strategyId}/versions/{strategyVersionId}/backtests",
		method: "post",
		tag: "Strategies",
	},
	{
		path: "/v1/strategies/agencies/{agencyId}/backtest-runs/{backtestRunId}/complete",
		method: "post",
		tag: "Strategies",
	},
	{
		path: "/v1/strategies/agencies/{agencyId}/{strategyId}/deployments",
		method: "post",
		tag: "Strategies",
	},
	{
		path: "/v1/strategies/agencies/{agencyId}/{strategyId}/deployments/{deploymentId}/rollback",
		method: "post",
		tag: "Strategies",
	},

	{
		path: "/v1/strategies/agencies/{agencyId}/{strategyId}/signals",
		method: "post",
		tag: "Strategies",
	},
	{ path: "/v1/capital", method: "get", tag: "Capital" },
	{
		path: "/v1/agencies/{agencyId}/portfolios",
		method: "get",
		tag: "Portfolios",
	},
	{ path: "/v1/decisions", method: "get", tag: "Decisions" },
	{
		path: "/v1/risk/agencies/{agencyId}/kill-switch",
		method: "get",
		tag: "Risk",
	},
	{
		path: "/v1/risk/agencies/{agencyId}/kill-switch/activate",
		method: "post",
		tag: "Risk",
	},
	{
		path: "/v1/risk/agencies/{agencyId}/kill-switch/release",
		method: "post",
		tag: "Risk",
	},
	{
		path: "/v1/execution/agencies/{agencyId}/orders",
		method: "get",
		tag: "Execution",
	},
	{
		path: "/v1/execution/agencies/{agencyId}/reconciliation-cases",
		method: "get",
		tag: "Execution",
	},
	{ path: "/v1/accounting", method: "get", tag: "Accounting" },
	{
		path: "/v1/performance/agencies/{agencyId}/outcome-snapshots",
		method: "get",
		tag: "Performance",
	},
	{
		path: "/v1/performance/agencies/{agencyId}/outcome-snapshots/{outcomeSnapshotId}",
		method: "get",
		tag: "Performance",
	},
	{
		path: "/v1/performance/agencies/{agencyId}/outcome-snapshots/{outcomeSnapshotId}/metrics",
		method: "get",
		tag: "Performance",
	},
	{
		path: "/v1/performance/agencies/{agencyId}/position-exposure-snapshots",
		method: "get",
		tag: "Performance",
	},
	{
		path: "/v1/performance/agencies/{agencyId}/position-exposure-snapshots/{positionExposureSnapshotId}",
		method: "get",
		tag: "Performance",
	},
	{
		path: "/v1/performance/agencies/{agencyId}/position-exposure-snapshots/{positionExposureSnapshotId}/metrics",
		method: "get",
		tag: "Performance",
	},
	{
		path: "/v1/evaluation/agencies/{agencyId}/certifications",
		method: "get",
		tag: "Evaluation",
	},
	{
		path: "/v1/evaluation/agencies/{agencyId}/certifications",
		method: "post",
		tag: "Evaluation",
	},
	{
		path: "/v1/evaluation/agencies/{agencyId}/evaluation-records/{evaluationRecordId}",
		method: "get",
		tag: "Evaluation",
	},
	{
		path: "/v1/evaluation/agencies/{agencyId}/evaluation-records/{evaluationRecordId}/score",
		method: "get",
		tag: "Evaluation",
	},
	{
		path: "/v1/simulation/agencies/{agencyId}/runs",
		method: "get",
		tag: "Simulation",
	},
	{
		path: "/v1/simulation/agencies/{agencyId}/runs/{simulationRunId}",
		method: "get",
		tag: "Simulation",
	},
	{
		path: "/v1/simulation/agencies/{agencyId}/runs/{simulationRunId}/snapshot",
		method: "get",
		tag: "Simulation",
	},
	{ path: "/v1/audit", method: "get", tag: "Audit" },
	{ path: "/v1/billing", method: "get", tag: "Billing" },
	{
		path: "/v1/operations/platform/health",
		method: "get",
		tag: "Operations",
	},
	{
		path: "/v1/operations/platform/incidents",
		method: "get",
		tag: "Operations",
	},
	{
		path: "/v1/operations/platform/runtimes",
		method: "get",
		tag: "Operations",
	},
	{
		path: "/v1/operations/platform/recovery",
		method: "get",
		tag: "Operations",
	},
	{
		path: "/v1/operations/agencies/{agencyId}/incidents/{incidentId}/recovery-tasks",
		method: "post",
		tag: "Operations",
	},
	{
		path: "/v1/operations/agencies/{agencyId}/recovery-tasks/{recoveryTaskId}/approve",
		method: "post",
		tag: "Operations",
	},
	{
		path: "/v1/operations/agencies/{agencyId}/recovery-tasks/{recoveryTaskId}/start-execution",
		method: "post",
		tag: "Operations",
	},
	{
		path: "/v1/operations/agencies/{agencyId}/recovery-tasks/{recoveryTaskId}/complete",
		method: "post",
		tag: "Operations",
	},
	{
		path: "/v1/operations/agencies/{agencyId}/recovery-tasks/{recoveryTaskId}/fail",
		method: "post",
		tag: "Operations",
	},
	{
		path: "/v1/operations/agencies/{agencyId}/recovery-tasks/{recoveryTaskId}/cancel",
		method: "post",
		tag: "Operations",
	},
];

describe("OpenAPI module catalog", () => {
	test("tag groups cover the 23 baseline modules", () => {
		expect(OPENAPI_MODULE_TAG_GROUPS.map((group) => group.name)).toEqual([
			"Platform",
			"Identity & access",
			"Intelligence",
			"Markets",
			"Capital cycle",
			"Institution",
		]);
	});

	test("every documented operation is tagged; catch-all auth is hidden", async () => {
		const app = createOpenApiCatalogApp();
		const response = await app.handle(
			new Request("http://127.0.0.1/openapi/json"),
		);
		expect(response.status).toBe(200);
		const spec = (await response.json()) as {
			paths: Record<
				string,
				Record<
					string,
					{
						tags?: string[];
						summary?: string;
						description?: string;
						operationId?: string;
					}
				>
			>;
			"x-tagGroups"?: Array<{ name: string; tags: string[] }>;
		};
		expect(spec["x-tagGroups"]?.length).toBeGreaterThan(0);
		expect(spec.paths["/api/auth/*"]).toBeUndefined();

		const missing: string[] = [];
		for (const expected of DOCUMENTED_OPERATIONS) {
			const methods = spec.paths[expected.path] ?? {};
			const operation =
				methods[expected.method] ??
				(expected.method === "ws" ? methods.get : undefined);
			if (!operation) {
				missing.push(
					`missing ${expected.method.toUpperCase()} ${expected.path} keys=${Object.keys(methods).join(",")}`,
				);
				continue;
			}
			if (!operation.tags?.includes(expected.tag)) {
				missing.push(
					`${expected.method.toUpperCase()} ${expected.path} tags=${JSON.stringify(operation.tags)}`,
				);
			}
			if (!operation.summary || operation.summary.length < 8) {
				missing.push(
					`${expected.method.toUpperCase()} ${expected.path} missing summary`,
				);
			}
			if (!operation.description || operation.description.length < 40) {
				missing.push(
					`${expected.method.toUpperCase()} ${expected.path} missing description`,
				);
			}
			if (!operation.operationId) {
				missing.push(
					`${expected.method.toUpperCase()} ${expected.path} missing operationId`,
				);
			}
		}
		expect(missing).toEqual([]);
	});
});
