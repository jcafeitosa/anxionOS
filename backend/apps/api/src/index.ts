import { ensureAgentsSchema } from "@anxionos/agents";
import { healthResponseSchema, schemaVersion } from "@anxionos/contracts";
import { ensureEvaluationSchema } from "@anxionos/evaluation";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import { ensureExecutionSchema } from "@anxionos/execution";
import { ensureGovernanceSchema } from "@anxionos/governance";
import { createIdentityDb, ensureIdentitySchema } from "@anxionos/identity";
import { createLogger } from "@anxionos/observability";
import { ensureOperationsSchema } from "@anxionos/operations";
import { ensureOrganizationsSchema } from "@anxionos/organizations";
import { ensurePartnersSchema } from "@anxionos/partners";
import { ensurePerformanceSchema } from "@anxionos/performance";
import { ensurePortfoliosSchema } from "@anxionos/portfolios";
import { ensureRiskSchema } from "@anxionos/risk";
import { ensureSimulationSchema } from "@anxionos/simulation";
import { ensureStrategiesSchema } from "@anxionos/strategies";
import { Elysia } from "elysia";
import { createAgentsApiRuntime } from "./agents/bootstrap";
import {
	createGovernanceSkillBindGuard,
	createGovernanceSkillEvaluationGuard,
} from "./agents/governance-guards";
import { createAgentsPlugin } from "./agents/plugin";
import {
	createBetterAuthRuntime,
	resolveBetterAuthConfig,
} from "./auth/create-better-auth";
import { ensureBetterAuthSchema } from "./auth/ensure-better-auth-schema";
import { createPostLoginPlugin } from "./auth/post-login-plugin";
import { createEvaluationApiRuntime } from "./evaluation/bootstrap";
import { bootstrapEvaluationEventConsumers } from "./evaluation/bootstrap-event-consumers";
import { createEvaluationPlugin } from "./evaluation/plugin";
import { createExecutionApiRuntime } from "./execution/bootstrap";
import { createExecutionPlugin } from "./execution/plugin";
import { createGovernanceApiRuntime } from "./governance/bootstrap";
import { bootstrapGovernanceOrganizationsMembership } from "./governance/bootstrap-organizations-membership";
import { createGovernancePlugin } from "./governance/plugin";
import { probeHealthDeps } from "./health/probe-deps";
import { createAgencyScope } from "./identity/agency-scope";
import { createIdentityApiRuntime } from "./identity/bootstrap";
import { bootstrapIdentitySessionRevocation } from "./identity/bootstrap-session-revocation";
import { createIdentityPlugin } from "./identity/plugin";
import {
	createSloMetricsPlugin,
	getApiMetricsCollector,
} from "./middleware/slo-metrics";
import {
	healthOpenApiDetail,
	hiddenAuthCatchAllDetail,
	identityOpenApi,
} from "./openapi-operations";
import { createOpenApiPlugin } from "./openapi-plugin";
import { createOperationsApiRuntime } from "./operations/bootstrap";
import { bootstrapEventingLagSli } from "./operations/bootstrap-eventing-lag-sli";
import { createPlatformSloSnapshotPlugin } from "./operations/platform-slo-snapshot-plugin";
import { createOperationsPlugin } from "./operations/plugin";
import {
	assertOrganizationsStartupEnv,
	createOrganizationsRuntime,
} from "./organizations/bootstrap";
import { ensureInviteAcceptRateLimitSchema } from "./organizations/invite-accept-rate-limit-store";
import { createOrganizationsPlugin } from "./organizations/plugin";
import { configureInviteAcceptRateLimit } from "./organizations/rate-limit";
import { createPartnersApiRuntime } from "./partners/bootstrap";
import { createPartnersPlugin } from "./partners/plugin";
import { createPerformanceApiRuntime } from "./performance/bootstrap";
import { bootstrapPerformanceEventConsumers } from "./performance/bootstrap-event-consumers";
import { createPerformancePlugin } from "./performance/plugin";
import { createPortfoliosApiRuntime } from "./portfolios/bootstrap";
import { createPortfoliosPlugin } from "./portfolios/plugin";
import { createRealtimePlugin, createRealtimeRuntime } from "./realtime";
import { createRiskApiRuntime } from "./risk/bootstrap";
import { createRiskPlugin } from "./risk/plugin";
import { createSimulationApiRuntime } from "./simulation/bootstrap";
import { bootstrapSimulationEventConsumers } from "./simulation/bootstrap-event-consumers";
import { createSimulationPlugin } from "./simulation/plugin";
import { createStrategiesApiRuntime } from "./strategies/bootstrap";
import { createStrategiesPlugin } from "./strategies/plugin";

const logger = createLogger({ service: "api" });
const port = Number(process.env.PORT ?? "3000");
const apiMetrics = getApiMetricsCollector();

const databaseUrl = process.env.DATABASE_URL?.trim();
const pool = databaseUrl ? createPgPool(databaseUrl) : undefined;
if (pool) {
	await ensureBetterAuthSchema(pool);
	await ensureEventingSchema(pool);
	await ensureIdentitySchema(pool);
	assertOrganizationsStartupEnv();
	await ensureOrganizationsSchema(pool);
	await ensureGovernanceSchema(pool);
	await ensureAgentsSchema(pool);
	await ensurePartnersSchema(pool);
	await ensurePortfoliosSchema(pool);
	await ensurePerformanceSchema(pool);
	await ensureOperationsSchema(pool);
	await ensureStrategiesSchema(pool);
	await ensureSimulationSchema(pool);
	await ensureEvaluationSchema(pool);
	await ensureExecutionSchema(pool);
	await ensureRiskSchema(pool);
	await ensureInviteAcceptRateLimitSchema(pool);
	configureInviteAcceptRateLimit(pool);
	bootstrapIdentitySessionRevocation(pool);
	bootstrapGovernanceOrganizationsMembership(pool);
	bootstrapEventingLagSli(pool, apiMetrics);
	bootstrapPerformanceEventConsumers(pool);
	bootstrapSimulationEventConsumers(pool);
	bootstrapEvaluationEventConsumers(pool);
	logger.info(
		"DATABASE_URL loaded — eventing, identity, organizations, governance and auth schema ready",
	);
} else {
	logger.info("DATABASE_URL unset — identity session consumer disabled");
}
let app: Elysia = new Elysia()
	.use(createSloMetricsPlugin({ metrics: apiMetrics }))
	.use(createPlatformSloSnapshotPlugin({ metrics: apiMetrics }))
	.use(createOpenApiPlugin()) as unknown as Elysia;
logger.info("OpenAPI Scalar mounted at /openapi");

if (pool && resolveBetterAuthConfig()) {
	const identity = createIdentityDb(pool);
	const { auth } = await createBetterAuthRuntime(pool, {
		repository: identity.repository,
		unitOfWork: identity.unitOfWork,
	});
	const handleAuth = ({ request }: { request: Request }) =>
		auth.handler(request);
	app = app
		.post("/api/auth/sign-in/email", handleAuth, identityOpenApi.signInEmail)
		.post("/api/auth/sign-up/email", handleAuth, identityOpenApi.signUpEmail)
		.get("/api/auth/get-session", handleAuth, identityOpenApi.getSession)
		.post("/api/auth/sign-out", handleAuth, identityOpenApi.signOut)
		.all(
			"/api/auth/*",
			handleAuth,
			hiddenAuthCatchAllDetail,
		) as unknown as Elysia;
	logger.info("Better Auth mounted at /api/auth/*");
	const orgRuntime = createOrganizationsRuntime(pool, databaseUrl!);
	const govRuntime = createGovernanceApiRuntime(pool);
	const agentsRuntime = createAgentsApiRuntime(pool);
	app = app.use(
		createOrganizationsPlugin({
			auth,
			...orgRuntime,
		}),
	) as unknown as Elysia;
	logger.info("Organizations API mounted at /v1/organizations/*");
	app = app.use(
		createPostLoginPlugin({
			auth,
			membershipRepository: orgRuntime.membershipRepository,
			identityRepository: orgRuntime.identityRepository,
			grantRepository: govRuntime.grantRepository,
		}),
	) as unknown as Elysia;
	logger.info("Post-login context mounted at /v1/auth/post-login-context");
	app = app.use(
		createGovernancePlugin({
			auth,
			...govRuntime,
			membershipRepository: orgRuntime.membershipRepository,
			scopedPool: orgRuntime.scopedPool,
		}),
	) as unknown as Elysia;
	logger.info(
		"Governance API mounted at /v1/agencies/:agencyId/grants, /v1/agencies/:agencyId/change-proposals, /v1/agencies/:agencyId/agents/:agentId/autonomy and /v1/governance/*",
	);
	const identityRuntime = createIdentityApiRuntime(pool);
	app = app.use(
		createIdentityPlugin({
			auth,
			...identityRuntime,
			grantRepository: govRuntime.grantRepository,
			agencyScope: createAgencyScope(orgRuntime.membershipRepository),
		}),
	) as unknown as Elysia;
	logger.info(
		"Identity API mounted at /v1/identity/principals and /v1/identity/sessions",
	);
	const partnersRuntime = createPartnersApiRuntime(pool);
	app = app.use(
		createPartnersPlugin({
			auth,
			...partnersRuntime,
			identityRepository: orgRuntime.identityRepository,
			scopedPool: orgRuntime.scopedPool,
		}),
	) as unknown as Elysia;
	logger.info(
		"Partners API mounted at /v1/partners/organizations/:organizationId/*",
	);
	app = app.use(
		createAgentsPlugin({
			auth,
			...agentsRuntime,
			membershipRepository: orgRuntime.membershipRepository,
			scopedPool: orgRuntime.scopedPool,
			identityRepository: orgRuntime.identityRepository,
			skillBindGuard: createGovernanceSkillBindGuard({
				autonomyAssignmentRepository: govRuntime.autonomyAssignmentRepository,
				grantRepository: govRuntime.grantRepository,
			}),
			skillEvaluationGuard: createGovernanceSkillEvaluationGuard({
				autonomyAssignmentRepository: govRuntime.autonomyAssignmentRepository,
				grantRepository: govRuntime.grantRepository,
			}),
		}),
	) as unknown as Elysia;
	logger.info(
		"Agents API mounted at /v1/agencies/:agencyId/agents and /v1/agencies/:agencyId/skills",
	);
	const strategiesRuntime = createStrategiesApiRuntime(pool);
	app = app.use(
		createStrategiesPlugin({
			auth,
			...strategiesRuntime,
			identityRepository: orgRuntime.identityRepository,
			scopedPool: orgRuntime.scopedPool,
		}),
	) as unknown as Elysia;
	logger.info("Strategies API mounted at /v1/strategies/agencies/:agencyId/*");
	const portfoliosRuntime = createPortfoliosApiRuntime(pool);
	app = app.use(
		createPortfoliosPlugin({
			auth,
			...portfoliosRuntime,
			identityRepository: orgRuntime.identityRepository,
			scopedPool: orgRuntime.scopedPool,
		}),
	) as unknown as Elysia;
	logger.info(
		"Portfolios API mounted at GET /v1/agencies/:agencyId/portfolios",
	);
	const operationsRuntime = createOperationsApiRuntime(pool);
	app = app.use(
		createOperationsPlugin({
			auth,
			...operationsRuntime,
			identityRepository: orgRuntime.identityRepository,
			scopedPool: orgRuntime.scopedPool,
			grantRepository: govRuntime.grantRepository,
			probePlatformHealth: () => probeHealthDeps(pool),
		}),
	) as unknown as Elysia;
	logger.info(
		"Operations API mounted at /v1/operations/agencies/:agencyId/incidents/:incidentId/recovery-tasks and /v1/operations/agencies/:agencyId/recovery-tasks/:recoveryTaskId/*",
	);
	const performanceRuntime = createPerformanceApiRuntime(pool);
	app = app.use(
		createPerformancePlugin({
			auth,
			...performanceRuntime,
			identityRepository: orgRuntime.identityRepository,
			scopedPool: orgRuntime.scopedPool,
		}),
	) as unknown as Elysia;
	logger.info(
		"Performance API mounted at /v1/performance/agencies/:agencyId/outcome-snapshots and /v1/performance/agencies/:agencyId/position-exposure-snapshots",
	);
	const simulationRuntime = createSimulationApiRuntime(pool);
	app = app.use(
		createSimulationPlugin({
			auth,
			...simulationRuntime,
			identityRepository: orgRuntime.identityRepository,
			scopedPool: orgRuntime.scopedPool,
		}),
	) as unknown as Elysia;
	logger.info(
		"Simulation API mounted at /v1/simulation/agencies/:agencyId/runs",
	);
	const evaluationRuntime = createEvaluationApiRuntime(pool);
	app = app.use(
		createEvaluationPlugin({
			auth,
			...evaluationRuntime,
			identityRepository: orgRuntime.identityRepository,
			scopedPool: orgRuntime.scopedPool,
		}),
	) as unknown as Elysia;
	logger.info(
		"Evaluation API mounted at /v1/evaluation/agencies/:agencyId/certifications and /v1/evaluation/agencies/:agencyId/evaluation-records/:evaluationRecordId/*",
	);
	const executionRuntime = createExecutionApiRuntime(pool);
	app = app.use(
		createExecutionPlugin({
			auth,
			...executionRuntime,
			identityRepository: orgRuntime.identityRepository,
			scopedPool: orgRuntime.scopedPool,
		}),
	) as unknown as Elysia;
	logger.info(
		"Execution API mounted at /v1/execution/agencies/:agencyId/orders and /v1/execution/agencies/:agencyId/reconciliation-cases",
	);
	const riskRuntime = createRiskApiRuntime(pool);
	app = app.use(
		createRiskPlugin({
			auth,
			...riskRuntime,
			identityRepository: orgRuntime.identityRepository,
			scopedPool: orgRuntime.scopedPool,
		}),
	) as unknown as Elysia;
	logger.info("Risk API mounted at /v1/risk/agencies/:agencyId/kill-switch");
	const realtimeRuntime = createRealtimeRuntime(pool);
	app = app.use(
		createRealtimePlugin({ auth, manager: realtimeRuntime.manager }),
	) as unknown as Elysia;
	logger.info("Realtime gateway mounted at /api/realtime/*");
} else {
	logger.info(
		"Better Auth disabled — set BETTER_AUTH_SECRET and BETTER_AUTH_URL",
	);
}

app = app.get(
	"/health",
	async () => {
		const body = healthResponseSchema.parse({
			status: "ok",
			schemaVersion,
			service: "api",
			timestamp: new Date().toISOString(),
			deps: await probeHealthDeps(pool),
		});
		return body;
	},
	healthOpenApiDetail,
) as unknown as Elysia;
app.listen(port);

logger.info("API listening", { port: app.server?.port ?? port });

export type App = typeof app;
