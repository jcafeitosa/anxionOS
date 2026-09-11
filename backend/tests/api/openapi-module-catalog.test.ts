import { describe, expect, test } from "bun:test";
import { GRANT_CAPABILITY_CATALOG } from "@anxionos/contracts/governance";
import { OPENAPI_MODULE_TAG_GROUPS } from "../../apps/api/src/openapi-baseline";
import { createOpenApiCatalogApp } from "../../apps/api/src/openapi-catalog-harness";
import { declaredOperationParameters } from "../../apps/api/src/openapi-operations";

type ParameterExpectation = {
	name: string;
	in: "path" | "query" | "header" | "cookie";
	required: boolean;
};

type ServedParameter = {
	name: string;
	in: string;
	required?: boolean;
	description?: string;
	schema?: { format?: string };
};

const PRINCIPAL_ID: ParameterExpectation = {
	name: "principalId",
	in: "path",
	required: true,
};
const AGENCY_ID: ParameterExpectation = {
	name: "agencyId",
	in: "path",
	required: true,
};
const GRANT_ID: ParameterExpectation = {
	name: "grantId",
	in: "path",
	required: true,
};
const REQUEST_ID_HEADER: ParameterExpectation = {
	name: "X-Request-Id",
	in: "header",
	required: false,
};
const AGENCY_SCOPE_HEADER: ParameterExpectation = {
	name: "X-Agency-Id",
	in: "header",
	required: false,
};
const IDEMPOTENCY_HEADER: ParameterExpectation = {
	name: "Idempotency-Key",
	in: "header",
	required: true,
};

const DOCUMENTED_OPERATIONS: Array<{
	path: string;
	method: string;
	tag: string;
	/** Asserted when declared: `operationId` fixo e status declarados. */
	operationId?: string;
	statuses?: string[];
	/**
	 * ANX-468: parametros declarados que **precisam** sobreviver a geracao.
	 * Antes desta assercao o defeito do gerador (headers descartados em toda
	 * rota com path param) passou por duas rodadas de auditoria de contrato.
	 */
	parameters?: ParameterExpectation[];
}> = [
	{ path: "/health", method: "get", tag: "Health" },
	{ path: "/api/auth/sign-in/email", method: "post", tag: "Identity" },
	{ path: "/api/auth/sign-up/email", method: "post", tag: "Identity" },
	{ path: "/api/auth/get-session", method: "get", tag: "Identity" },
	{ path: "/api/auth/sign-out", method: "post", tag: "Identity" },
	{
		path: "/v1/auth/post-login-context",
		method: "get",
		tag: "Identity",
		parameters: [REQUEST_ID_HEADER],
	},
	{
		path: "/v1/identity/principals/{principalId}",
		method: "get",
		tag: "Identity",
		operationId: "identityGetPrincipal",
		statuses: ["200", "400", "401", "403", "404"],
		parameters: [PRINCIPAL_ID, AGENCY_SCOPE_HEADER, REQUEST_ID_HEADER],
	},
	{
		path: "/v1/identity/principals/{principalId}/sessions",
		method: "get",
		tag: "Identity",
		operationId: "identityListSessions",
		statuses: ["200", "400", "401", "403", "404"],
		parameters: [PRINCIPAL_ID, AGENCY_SCOPE_HEADER, REQUEST_ID_HEADER],
	},
	{
		path: "/v1/identity/principals",
		method: "post",
		tag: "Identity",
		operationId: "identityRegisterPrincipal",
		statuses: ["200", "400", "401", "403", "404", "409"],
		parameters: [IDEMPOTENCY_HEADER, AGENCY_SCOPE_HEADER, REQUEST_ID_HEADER],
	},
	{
		path: "/v1/identity/principals/{principalId}/suspend",
		method: "post",
		tag: "Identity",
		operationId: "identitySuspendPrincipal",
		statuses: ["200", "400", "401", "403", "404", "409", "503"],
		parameters: [
			PRINCIPAL_ID,
			AGENCY_SCOPE_HEADER,
			REQUEST_ID_HEADER,
			IDEMPOTENCY_HEADER,
		],
	},
	{
		path: "/v1/identity/principals/{principalId}/revoke",
		method: "post",
		tag: "Identity",
		operationId: "identityRevokePrincipal",
		statuses: ["200", "400", "401", "403", "404", "409", "503"],
		parameters: [
			PRINCIPAL_ID,
			AGENCY_SCOPE_HEADER,
			REQUEST_ID_HEADER,
			IDEMPOTENCY_HEADER,
		],
	},
	{
		path: "/v1/identity/sessions/revoke",
		method: "post",
		tag: "Identity",
		operationId: "identityRevokeSession",
		statuses: ["200", "400", "401", "403", "404", "409"],
		parameters: [IDEMPOTENCY_HEADER, AGENCY_SCOPE_HEADER, REQUEST_ID_HEADER],
	},
	{
		path: "/v1/identity/sessions/revoked",
		method: "get",
		tag: "Identity",
		operationId: "identityListRevokedSessions",
		statuses: ["200", "400", "401", "403"],
		// ANX-468 (F3): a rota le e aplica o header — precisa declara-lo.
		parameters: [
			{ name: "since", in: "query", required: false },
			AGENCY_SCOPE_HEADER,
			REQUEST_ID_HEADER,
		],
	},
	{
		path: "/v1/organizations/agencies",
		method: "post",
		tag: "Organizations",
		parameters: [IDEMPOTENCY_HEADER, REQUEST_ID_HEADER],
	},
	{ path: "/v1/organizations/agencies", method: "get", tag: "Organizations" },
	{
		path: "/v1/organizations/agencies/{agencyId}",
		method: "get",
		tag: "Organizations",
		parameters: [AGENCY_ID, REQUEST_ID_HEADER],
	},
	{
		path: "/v1/organizations/agencies/{agencyId}/markets",
		method: "patch",
		tag: "Organizations",
	},
	{
		path: "/v1/organizations/agencies/{agencyId}/ownership/transfer",
		method: "post",
		tag: "Organizations",
		operationId: "transferOwnership",
		parameters: [AGENCY_ID, REQUEST_ID_HEADER, IDEMPOTENCY_HEADER],
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
	{
		path: "/v1/agencies/{agencyId}/grants",
		method: "get",
		tag: "Governance",
		parameters: [AGENCY_ID, REQUEST_ID_HEADER],
	},
	{
		path: "/v1/agencies/{agencyId}/grants",
		method: "post",
		tag: "Governance",
		operationId: "issueGrant",
		statuses: ["200", "400", "401", "403", "404", "409", "429"],
		parameters: [AGENCY_ID, REQUEST_ID_HEADER, IDEMPOTENCY_HEADER],
	},
	{
		path: "/v1/agencies/{agencyId}/grants/{grantId}",
		method: "delete",
		tag: "Governance",
		parameters: [AGENCY_ID, REQUEST_ID_HEADER, IDEMPOTENCY_HEADER, GRANT_ID],
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
						responses?: Record<string, unknown>;
						parameters?: Array<{
							name: string;
							in: string;
							required?: boolean;
						}>;
						requestBody?: { required?: boolean; content?: unknown };
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
			} else if (
				expected.operationId &&
				operation.operationId !== expected.operationId
			) {
				missing.push(
					`${expected.method.toUpperCase()} ${expected.path} operationId=${operation.operationId} expected=${expected.operationId}`,
				);
			}
			if (expected.statuses) {
				const declared = Object.keys(operation.responses ?? {}).sort();
				const wanted = [...expected.statuses].sort();
				if (declared.join(",") !== wanted.join(",")) {
					missing.push(
						`${expected.method.toUpperCase()} ${expected.path} statuses=${declared.join(",")} expected=${wanted.join(",")}`,
					);
				}
			}
			if (expected.parameters) {
				const declared = Array.isArray(operation.parameters)
					? operation.parameters
					: [];
				for (const wanted of expected.parameters) {
					const found = declared.find(
						(candidate) =>
							candidate.name === wanted.name && candidate.in === wanted.in,
					);
					if (!found) {
						missing.push(
							`${expected.method.toUpperCase()} ${expected.path} missing parameter ${wanted.in}:${wanted.name} declared=${declared
								.map((candidate) => `${candidate.in}:${candidate.name}`)
								.join(",")}`,
						);
						continue;
					}
					if (Boolean(found.required) !== wanted.required) {
						missing.push(
							`${expected.method.toUpperCase()} ${expected.path} parameter ${wanted.in}:${wanted.name} required=${String(found.required)} expected=${String(wanted.required)}`,
						);
					}
				}
			}
		}

		// `operationId` é a chave estável consumida por agentes e tools; duplicata
		// quebra o cliente gerado mesmo quando cada operação existe.
		const seenOperationIds = new Map<string, string>();
		for (const [path, methods] of Object.entries(spec.paths)) {
			for (const [method, operation] of Object.entries(methods)) {
				if (!operation.operationId) {
					continue;
				}
				const where = `${method.toUpperCase()} ${path}`;
				const previous = seenOperationIds.get(operation.operationId);
				if (previous) {
					missing.push(
						`duplicate operationId ${operation.operationId} on ${previous} and ${where}`,
					);
					continue;
				}
				seenOperationIds.set(operation.operationId, where);
			}
		}
		expect(missing).toEqual([]);
	});

	// ANX-468. O defeito nao estava no source: `detail.parameters` era
	// declarado corretamente e o gerador (`@elysia/openapi`) o descartava em
	// TODA rota com path param. A assercao abaixo e' sistemica de proposito —
	// deriva do registro de `op()` (fonte do contrato), nao de uma lista de
	// rotas, entao cobre os 23 modulos e qualquer rota nova.
	test("every declared operation parameter survives generation (ANX-468)", async () => {
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
						operationId?: string;
						parameters?: Array<{
							name: string;
							in: string;
							required?: boolean;
							description?: string;
							schema?: { format?: string };
						}>;
					}
				>
			>;
		};

		const servedByOperationId = new Map<
			string,
			{ where: string; parameters: ServedParameter[] }
		>();
		for (const [path, methods] of Object.entries(spec.paths)) {
			for (const [method, operation] of Object.entries(methods)) {
				if (!operation.operationId) {
					continue;
				}
				servedByOperationId.set(operation.operationId, {
					where: `${method.toUpperCase()} ${path}`,
					parameters: operation.parameters ?? [],
				});
			}
		}

		const problems: string[] = [];
		let examinedPathParameterOperations = 0;
		let examinedHeaderRestorations = 0;
		const declared = declaredOperationParameters();
		expect(declared.size).toBeGreaterThan(0);

		for (const [operationId, declaredParameters] of declared) {
			const served = servedByOperationId.get(operationId);
			if (!served) {
				problems.push(`operationId ${operationId} is not served`);
				continue;
			}
			const hasPathParameter = declaredParameters.some(
				(parameter) => parameter.in === "path",
			);
			const hasHeaderParameter = declaredParameters.some(
				(parameter) => parameter.in === "header",
			);
			if (hasPathParameter && hasHeaderParameter) {
				examinedPathParameterOperations += 1;
			}
			for (const parameter of declaredParameters) {
				const match = served.parameters.find(
					(candidate) =>
						candidate.name === parameter.name && candidate.in === parameter.in,
				);
				if (!match) {
					problems.push(
						`${served.where} operationId=${operationId} lost parameter ${parameter.in}:${parameter.name}`,
					);
					continue;
				}
				if (Boolean(match.required) !== Boolean(parameter.required)) {
					problems.push(
						`${served.where} parameter ${parameter.in}:${parameter.name} required=${String(match.required)} expected=${String(parameter.required)}`,
					);
				}
				if (parameter.description && !match.description) {
					problems.push(
						`${served.where} parameter ${parameter.in}:${parameter.name} lost its declared description`,
					);
				}
				const declaredFormat = parameter.schema?.format;
				if (declaredFormat && match.schema?.format !== declaredFormat) {
					problems.push(
						`${served.where} parameter ${parameter.in}:${parameter.name} format=${String(match.schema?.format)} expected=${declaredFormat}`,
					);
				}
				if (parameter.in === "header") {
					examinedHeaderRestorations += 1;
				}
			}
		}

		expect(problems).toEqual([]);
		// Guardas de vacuidade: o teste precisa exercitar a classe defeituosa
		// (path param + headers declarados), nao apenas rotas triviais. O ANX-468
		// mediu 73 operacoes nessa classe no documento servido; uma queda grande
		// significa que rotas pararam de declarar seus headers — regressao de
		// contrato por si so'.
		expect(examinedPathParameterOperations).toBeGreaterThanOrEqual(70);
		expect(examinedHeaderRestorations).toBeGreaterThan(0);
	});

	test("every path template variable is served as a path parameter (ANX-468)", async () => {
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
						parameters?: Array<{
							name: string;
							in: string;
							required?: boolean;
						}>;
					}
				>
			>;
		};

		const problems: string[] = [];
		for (const [path, methods] of Object.entries(spec.paths)) {
			const templates = [...path.matchAll(/\{([^}]+)\}/g)].map(
				(match) => match[1],
			);
			if (templates.length === 0) {
				continue;
			}
			for (const [method, operation] of Object.entries(methods)) {
				const parameters = operation.parameters ?? [];
				for (const template of templates) {
					const found = parameters.find(
						(parameter) =>
							parameter.in === "path" && parameter.name === template,
					);
					if (!found) {
						problems.push(
							`${method.toUpperCase()} ${path} missing path:${template}`,
						);
					} else if (found.required !== true) {
						problems.push(
							`${method.toUpperCase()} ${path} path:${template} required=${String(found.required)} expected=true`,
						);
					}
				}
			}
		}
		expect(problems).toEqual([]);
	});

	test("path-param operations keep requestBody and response schemas (ANX-468 item 3)", async () => {
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
						requestBody?: {
							required?: boolean;
							content?: Record<string, { schema?: Record<string, unknown> }>;
						};
						responses?: Record<string, { description?: string }>;
						parameters?: Array<{
							name: string;
							in: string;
							description?: string;
							schema?: { format?: string };
						}>;
					}
				>
			>;
		};

		const suspend =
			spec.paths["/v1/identity/principals/{principalId}/suspend"].post;
		expect(suspend.requestBody?.required).toBe(false);
		expect(
			suspend.requestBody?.content?.["application/json"]?.schema,
		).toBeDefined();
		expect(Object.keys(suspend.responses ?? {})).toEqual(
			expect.arrayContaining(["200", "404", "409"]),
		);

		const issueGrant = spec.paths["/v1/agencies/{agencyId}/grants"].post;
		expect(issueGrant.requestBody?.required).toBe(true);
		const capabilitySchema = (
			issueGrant.requestBody?.content?.["application/json"]?.schema as {
				properties?: { capability?: { enum?: string[] } };
			}
		).properties?.capability;
		expect(capabilitySchema?.enum).toEqual([...GRANT_CAPABILITY_CATALOG]);

		// O objeto declarado vence o derivado pelo plugin: a descricao e o
		// schema tipado (UUID) sobrevivem junto com o parametro.
		const agencyScope = (
			spec.paths["/v1/identity/principals/{principalId}"].get.parameters ?? []
		).find(
			(parameter) =>
				parameter.in === "header" && parameter.name === "X-Agency-Id",
		);
		expect(agencyScope?.description?.length ?? 0).toBeGreaterThan(40);
		expect(agencyScope?.schema?.format).toBe("uuid");
	});
});
