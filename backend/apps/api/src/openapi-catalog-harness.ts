import { Elysia } from "elysia";
import { createAgentsPlugin } from "./agents/plugin";
import { createPostLoginPlugin } from "./auth/post-login-plugin";
import { createEvaluationPlugin } from "./evaluation/plugin";
import { createExecutionPlugin } from "./execution/plugin";
import { createGovernancePlugin } from "./governance/plugin";
import { createIdentityPlugin } from "./identity/plugin";
import {
	healthOpenApiDetail,
	hiddenAuthCatchAllDetail,
	identityOpenApi,
} from "./openapi-operations";
import { createOpenApiPlugin } from "./openapi-plugin";
import { createOperationsPlugin } from "./operations/plugin";
import { createOrganizationsPlugin } from "./organizations/plugin";
import { createPartnersPlugin } from "./partners/plugin";
import { createPerformancePlugin } from "./performance/plugin";
import { createPortfoliosPlugin } from "./portfolios/plugin";
import { createRealtimePlugin } from "./realtime/plugin";
import { SubscriptionManager } from "./realtime/subscription-manager";
import { createRiskPlugin } from "./risk/plugin";
import { createSimulationPlugin } from "./simulation/plugin";
import { createStrategiesPlugin } from "./strategies/plugin";

const stubAuth = {
	api: {
		getSession: async () => null,
	},
	handler: async (_request: Request) => new Response("ok"),
};

const unused = {} as never;

/** In-memory composition of HTTP plugins for OpenAPI catalog tests (no DB). */
export function createOpenApiCatalogApp() {
	return new Elysia()
		.use(createOpenApiPlugin())
		.post(
			"/api/auth/sign-in/email",
			({ request }) => stubAuth.handler(request),
			identityOpenApi.signInEmail,
		)
		.post(
			"/api/auth/sign-up/email",
			({ request }) => stubAuth.handler(request),
			identityOpenApi.signUpEmail,
		)
		.get(
			"/api/auth/get-session",
			({ request }) => stubAuth.handler(request),
			identityOpenApi.getSession,
		)
		.post(
			"/api/auth/sign-out",
			({ request }) => stubAuth.handler(request),
			identityOpenApi.signOut,
		)
		.all(
			"/api/auth/*",
			({ request }) => stubAuth.handler(request),
			hiddenAuthCatchAllDetail,
		)
		.get("/health", () => ({ status: "ok" }), healthOpenApiDetail)
		.use(
			createPostLoginPlugin({
				auth: stubAuth as never,
				membershipRepository: unused,
				identityRepository: unused,
				grantRepository: unused,
			}),
		)
		.use(
			createOrganizationsPlugin({
				auth: stubAuth as never,
				agencyRepository: unused,
				membershipRepository: unused,
				commandJournal: unused,
				unitOfWork: unused,
				principalLookup: unused,
				inviteTokenHasher: unused,
				identityRepository: unused,
				scopedPool: unused,
			}),
		)
		.use(
			createGovernancePlugin({
				auth: stubAuth as never,
				grantRepository: unused,
				changeProposalRepository: unused,
				autonomyAssignmentRepository: unused,
				commandJournal: unused,
				unitOfWork: unused,
				principalLookup: unused,
				membershipRepository: unused,
				scopedPool: unused,
				identityRepository: unused,
				traversalEvaluator: unused,
			}),
		)
		.use(
			createIdentityPlugin({
				auth: stubAuth as never,
				identityRepository: unused,
				sessionRefRepository: unused,
				identityUnitOfWork: unused,
				grantRepository: unused,
				agencyScope: unused,
			}),
		)
		.use(
			createAgentsPlugin({
				auth: stubAuth as never,
				agentRepository: unused,
				agentVersionRepository: unused,
				skillRepository: unused,
				skillVersionRepository: unused,
				agentSkillBindingRepository: unused,
				commandJournal: unused,
				unitOfWork: unused,
				membershipRepository: unused,
				scopedPool: unused,
				identityRepository: unused,
			}),
		)
		.use(
			createPartnersPlugin({
				auth: stubAuth as never,
				partners: unused,
				commissionAccruals: unused,
				payouts: unused,
				identityRepository: unused,
				scopedPool: unused,
			}),
		)
		.use(
			createPortfoliosPlugin({
				auth: stubAuth as never,
				portfolios: unused,
				positions: unused,
				valuationSnapshots: unused,
				identityRepository: unused,
				scopedPool: unused,
			}),
		)
		.use(
			createStrategiesPlugin({
				auth: stubAuth as never,
				unitOfWork: unused,
				commandJournal: unused,
				backtestRunner: unused,
				identityRepository: unused,
				scopedPool: unused,
			}),
		)
		.use(
			createOperationsPlugin({
				auth: stubAuth as never,
				unitOfWork: unused,
				commandJournal: unused,
				incidents: unused,
				recoveryTasks: unused,
				identityRepository: unused,
				scopedPool: unused,
				grantRepository: unused,
				probePlatformHealth: unused,
			}),
		)
		.use(
			createPerformancePlugin({
				auth: stubAuth as never,
				outcomeSnapshots: unused,
				positionExposureSnapshots: unused,
				metricSeries: unused,
				identityRepository: unused,
				scopedPool: unused,
			}),
		)
		.use(
			createSimulationPlugin({
				auth: stubAuth as never,
				runs: unused,
				snapshots: unused,
				identityRepository: unused,
				scopedPool: unused,
			}),
		)
		.use(
			createExecutionPlugin({
				auth: stubAuth as never,
				orders: unused,
				reconciliationCases: unused,
				identityRepository: unused,
				scopedPool: unused,
			}),
		)
		.use(
			createEvaluationPlugin({
				auth: stubAuth as never,
				unitOfWork: unused,
				commandJournal: unused,
				certifications: unused,
				evaluationRecords: unused,
				evaluationScores: unused,
				subjectQuery: unused,
				scoringPolicyQuery: unused,
				identityRepository: unused,
				scopedPool: unused,
			}),
		)
		.use(
			createRiskPlugin({
				auth: stubAuth as never,
				unitOfWork: unused,
				commandJournal: unused,
				killSwitch: unused,
				identityRepository: unused,
				scopedPool: unused,
			}),
		)
		.use(
			createRealtimePlugin({
				auth: stubAuth as never,
				manager: new SubscriptionManager(),
			}),
		);
}
