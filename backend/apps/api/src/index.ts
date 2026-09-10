import { healthResponseSchema, schemaVersion } from "@anxionos/contracts";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import { ensureAgentsSchema } from "@anxionos/agents";
import { ensureGovernanceSchema } from "@anxionos/governance";
import { createIdentityDb, ensureIdentitySchema } from "@anxionos/identity";
import { createLogger } from "@anxionos/observability";
import { ensureOrganizationsSchema } from "@anxionos/organizations";
import { ensurePartnersSchema } from "@anxionos/partners";
import { Elysia } from "elysia";
import {
	createBetterAuthRuntime,
	resolveBetterAuthConfig,
} from "./auth/create-better-auth";
import { ensureBetterAuthSchema } from "./auth/ensure-better-auth-schema";
import { createAgentsApiRuntime } from "./agents/bootstrap";
import { createAgentsPlugin } from "./agents/plugin";
import { createGovernanceApiRuntime } from "./governance/bootstrap";
import { bootstrapGovernanceOrganizationsMembership } from "./governance/bootstrap-organizations-membership";
import { createGovernancePlugin } from "./governance/plugin";
import { probeHealthDeps } from "./health/probe-deps";
import { bootstrapIdentitySessionRevocation } from "./identity/bootstrap-session-revocation";
import {
	assertOrganizationsStartupEnv,
	createOrganizationsRuntime,
} from "./organizations/bootstrap";
import { ensureInviteAcceptRateLimitSchema } from "./organizations/invite-accept-rate-limit-store";
import { createPostLoginPlugin } from "./auth/post-login-plugin";
import { createOpenApiPlugin } from "./openapi-plugin";
import { createOrganizationsPlugin } from "./organizations/plugin";
import { configureInviteAcceptRateLimit } from "./organizations/rate-limit";
import { createPartnersApiRuntime } from "./partners/bootstrap";
import { createPartnersPlugin } from "./partners/plugin";
import {
	createRealtimePlugin,
	createRealtimeRuntime,
} from "./realtime";

const logger = createLogger({ service: "api" });
const port = Number(process.env.PORT ?? "3000");

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
	await ensureInviteAcceptRateLimitSchema(pool);
	configureInviteAcceptRateLimit(pool);
	bootstrapIdentitySessionRevocation(pool);
	bootstrapGovernanceOrganizationsMembership(pool);
	logger.info(
		"DATABASE_URL loaded — eventing, identity, organizations, governance and auth schema ready",
	);
} else {
	logger.info("DATABASE_URL unset — identity session consumer disabled");
}
let app: Elysia = new Elysia().use(createOpenApiPlugin()) as unknown as Elysia;
logger.info("OpenAPI Scalar mounted at /openapi");

if (pool && resolveBetterAuthConfig()) {
	const identity = createIdentityDb(pool);
	const { auth } = await createBetterAuthRuntime(pool, {
		repository: identity.repository,
		unitOfWork: identity.unitOfWork,
	});
	app = app.all("/api/auth/*", ({ request }) =>
		auth.handler(request),
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
		"Governance API mounted at /v1/agencies/:agencyId/grants, /v1/agencies/:agencyId/agents/:agentId/autonomy and /v1/governance/*",
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
		}),
	) as unknown as Elysia;
	logger.info("Agents API mounted at /v1/agencies/:agencyId/agents");
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

app = app.get("/health", async () => {
	const body = healthResponseSchema.parse({
		status: "ok",
		schemaVersion,
		service: "api",
		timestamp: new Date().toISOString(),
		deps: await probeHealthDeps(pool),
	});
	return body;
}) as unknown as Elysia;
app.listen(port);

logger.info("API listening", { port: app.server?.port ?? port });

export type App = typeof app;
