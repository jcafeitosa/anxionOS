type JsonSchema = Record<string, unknown>;

type OpenApiParameter = {
	name: string;
	in: "query" | "header" | "path" | "cookie";
	required?: boolean;
	description?: string;
	schema?: JsonSchema;
};

type OpenApiRequestBody = {
	required?: boolean;
	description?: string;
	content: Record<string, { schema: JsonSchema }>;
};

export { OPENAPI_MODULE_TAG_GROUPS } from "./openapi-baseline";

const UUID: JsonSchema = { type: "string", format: "uuid" };
const COOKIE_SECURITY = [{ cookieAuth: [] }];

function pathUuid(name: string, description: string) {
	return {
		name,
		in: "path" as const,
		required: true,
		schema: UUID,
		description,
	};
}

function header(
	name: string,
	description: string,
	options: { required?: boolean; schema?: JsonSchema } = {},
) {
	return {
		name,
		in: "header" as const,
		required: options.required ?? false,
		schema: options.schema ?? { type: "string" },
		description,
	};
}

const REQUEST_ID = header(
	"X-Request-Id",
	"Optional correlation id. Mapped into error envelopes when present.",
);

function idempotencyKey(required = true) {
	return header(
		"Idempotency-Key",
		"Command UUID. Identical retries replay the journaled result (`idempotentReplay`).",
		{ required, schema: UUID },
	);
}

function jsonBody(schema: JsonSchema, description: string) {
	return {
		required: true,
		description,
		content: {
			"application/json": { schema },
		},
	};
}

const ERROR_RESPONSES = {
	"400": {
		description:
			"Validation failed (`VALIDATION_ERROR`). Body is the institutional error envelope.",
	},
	"401": { description: "Missing or invalid Better Auth session cookie." },
	"403": {
		description: "Caller is not an active member of the agency, or a grant is missing.",
	},
	"404": { description: "Aggregate not found in the agency scope." },
	"409": {
		description: "Revision conflict, duplicate command, or lifecycle guard rejected the transition.",
	},
	"429": { description: "Rate limit or realtime connection quota exceeded." },
};

function op(input: {
	tag: string;
	operationId: string;
	summary: string;
	description: string;
	security?: Array<Record<string, string[]>>;
	parameters?: OpenApiParameter[];
	requestBody?: OpenApiRequestBody;
	responses?: Record<string, { description: string }>;
}) {
	return {
		detail: {
			tags: [input.tag],
			operationId: input.operationId,
			summary: input.summary,
			description: input.description,
			security: input.security,
			parameters: input.parameters,
			requestBody: input.requestBody,
			responses: input.responses,
		},
	};
}

const agencyParams = [
	pathUuid("agencyId", "Agency (organization) UUID that owns the aggregate."),
	REQUEST_ID,
];

const commandParams = [...agencyParams, idempotencyKey()];

export const healthOpenApiDetail = op({
	tag: "Health",
	operationId: "getHealth",
	summary: "Service health and dependency probes",
	description:
		"Module: composition root (`apps/api`). Returns liveness plus Postgres, NATS and Neo4j probes. Unauthenticated. `deps.*.error` does not fail the process; operators must treat `error` as degraded.",
	responses: {
		"200": {
			description:
				"`status=ok` with `schemaVersion`, `service`, ISO timestamp and `deps.{postgres,nats,neo4j}`.",
		},
	},
});

export const hiddenAuthCatchAllDetail = {
	detail: { hide: true },
};

export const identityOpenApi = {
	signInEmail: op({
		tag: "Identity",
		operationId: "identitySignInEmail",
		summary: "Sign in with email and password",
		description:
			"Module: identity (Better Auth). `POST /api/auth/sign-in/email` with `{ email, password }`. Sets cookie `better-auth.session_token`. Other Better Auth subpaths remain on the hidden catch-all `/api/auth/*`.",
		requestBody: jsonBody(
			{
				type: "object",
				required: ["email", "password"],
				properties: {
					email: { type: "string", format: "email" },
					password: { type: "string", minLength: 1 },
				},
			},
			"Credentials.",
		),
		responses: {
			"200": { description: "Session user payload; Set-Cookie on success." },
			"401": { description: "Invalid credentials." },
		},
	}),
	signUpEmail: op({
		tag: "Identity",
		operationId: "identitySignUpEmail",
		summary: "Register with email and password",
		description:
			"Module: identity (Better Auth). `POST /api/auth/sign-up/email` with `{ email, password, name? }`. Email verification is sent only when SMTP_USER/SMTP_PASS are configured.",
		requestBody: jsonBody(
			{
				type: "object",
				required: ["email", "password"],
				properties: {
					email: { type: "string", format: "email" },
					password: { type: "string", minLength: 1 },
					name: { type: "string" },
				},
			},
			"Registration payload.",
		),
		responses: {
			"200": { description: "Created user and session cookie when auto-sign-in is enabled." },
			"400": { description: "Validation or duplicate email." },
		},
	}),
	getSession: op({
		tag: "Identity",
		operationId: "identityGetSession",
		summary: "Read current Better Auth session",
		description:
			"Module: identity. `GET /api/auth/get-session` returns the session bound to `better-auth.session_token`, or null.",
		security: COOKIE_SECURITY,
		responses: {
			"200": { description: "Session and user, or empty/null when anonymous." },
		},
	}),
	signOut: op({
		tag: "Identity",
		operationId: "identitySignOut",
		summary: "Sign out and clear session cookie",
		description:
			"Module: identity. `POST /api/auth/sign-out` revokes the current Better Auth session cookie.",
		security: COOKIE_SECURITY,
		responses: {
			"200": { description: "Signed out." },
		},
	}),
} as const;

export const postLoginContextOpenApiDetail = op({
	tag: "Identity",
	operationId: "getPostLoginContext",
	summary: "Resolve post-login console routing",
	description:
		"Module: identity + organizations. Cookie optional. Returns authentication flags, principal, active/pending memberships, MFA/email-verification gates and whether SMTP verification is configured. `platformAccess` and `partnerAccess` are fail-closed (`false`) until those consoles are authorized.",
	security: COOKIE_SECURITY,
	parameters: [REQUEST_ID],
	responses: {
		"200": {
			description:
				"Routing payload: authenticated, emailVerified, mfaRequired, principal, membershipsActive, membershipsPending, emailDelivery.verificationConfigured.",
		},
	},
});

export const organizationsOpenApi = {
	createAgency: op({
		tag: "Organizations",
		operationId: "createAgency",
		summary: "Create agency",
		description:
			"Module: organizations. Creates an agency for the authenticated principal as owner. Requires `Idempotency-Key`. Body `commandId` is not accepted; the header is the command id. `marketScope`: stocks | crypto | both.",
		security: COOKIE_SECURITY,
		parameters: [idempotencyKey(), REQUEST_ID],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["displayName", "marketScope"],
				properties: {
					displayName: { type: "string", minLength: 1, maxLength: 200 },
					marketScope: { type: "string", enum: ["stocks", "crypto", "both"] },
				},
			},
			"Agency display name and market scope.",
		),
		responses: {
			"200": { description: "Command result: aggregateId, revision, optional idempotentReplay." },
			...ERROR_RESPONSES,
		},
	}),
	listAgencies: op({
		tag: "Organizations",
		operationId: "listAgencies",
		summary: "List agencies for the caller",
		description:
			"Module: organizations. Lists agencies where the authenticated principal has membership. Session cookie required.",
		security: COOKIE_SECURITY,
		parameters: [REQUEST_ID],
		responses: {
			"200": { description: "Array of agency summaries for the principal." },
			"401": ERROR_RESPONSES["401"],
		},
	}),
	getAgency: op({
		tag: "Organizations",
		operationId: "getAgency",
		summary: "Get agency by id",
		description:
			"Module: organizations. Returns one agency. Caller must be an active member of `agencyId`. Tenant-scoped read.",
		security: COOKIE_SECURITY,
		parameters: agencyParams,
		responses: {
			"200": { description: "Agency aggregate (status, markets, onboarding)." },
			...ERROR_RESPONSES,
		},
	}),
	updateAgencyMarkets: op({
		tag: "Organizations",
		operationId: "updateAgencyMarkets",
		summary: "Update agency market scope",
		description:
			"Module: organizations. Patches `marketScope` for the agency. Idempotent command via `Idempotency-Key`. Membership required.",
		security: COOKIE_SECURITY,
		parameters: commandParams,
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["marketScope"],
				properties: {
					marketScope: { type: "string", enum: ["stocks", "crypto", "both"] },
				},
			},
			"Replacement market scope.",
		),
		responses: {
			"200": { description: "Command result with new revision." },
			...ERROR_RESPONSES,
		},
	}),
	listMemberships: op({
		tag: "Organizations",
		operationId: "listMemberships",
		summary: "List agency memberships",
		description:
			"Module: organizations. Lists memberships (invited, active, revoked) for the agency. Active membership required.",
		security: COOKIE_SECURITY,
		parameters: agencyParams,
		responses: {
			"200": { description: "Membership collection for the agency." },
			...ERROR_RESPONSES,
		},
	}),
	getMembership: op({
		tag: "Organizations",
		operationId: "getMembership",
		summary: "Get membership by id",
		description:
			"Module: organizations. Returns one membership. Path `membershipId` is the membership UUID, not the principal id.",
		security: COOKIE_SECURITY,
		parameters: [
			...agencyParams,
			pathUuid("membershipId", "Membership UUID."),
		],
		responses: {
			"200": { description: "Membership record (role, status, invite metadata)." },
			...ERROR_RESPONSES,
		},
	}),
	inviteMember: op({
		tag: "Organizations",
		operationId: "inviteMember",
		summary: "Invite member by email",
		description:
			"Module: organizations. Creates an invited membership. Role cannot be `owner`. Body email must match the invitee. Token is hashed with ORG_INVITE_TOKEN_PEPPER; raw token is returned once.",
		security: COOKIE_SECURITY,
		parameters: commandParams,
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["email", "role"],
				properties: {
					email: { type: "string", format: "email" },
					role: { type: "string", enum: ["admin", "operator", "viewer"] },
				},
			},
			"Invitee email and console role.",
		),
		responses: {
			"200": { description: "Invite result including one-time token when issued." },
			...ERROR_RESPONSES,
		},
	}),
	activateMembership: op({
		tag: "Organizations",
		operationId: "activateMembership",
		summary: "Activate invited membership",
		description:
			"Module: organizations. Activates an invited membership. Empty JSON body. `Idempotency-Key` required.",
		security: COOKIE_SECURITY,
		parameters: [
			...commandParams,
			pathUuid("membershipId", "Membership UUID to activate."),
		],
		responses: {
			"200": { description: "Command result after activation." },
			...ERROR_RESPONSES,
		},
	}),
	revokeMembership: op({
		tag: "Organizations",
		operationId: "revokeMembership",
		summary: "Revoke membership",
		description:
			"Module: organizations. Revokes an active or invited membership. Owner transfer is a separate command (not this route).",
		security: COOKIE_SECURITY,
		parameters: [
			...commandParams,
			pathUuid("membershipId", "Membership UUID to revoke."),
		],
		responses: {
			"200": { description: "Command result after revoke." },
			...ERROR_RESPONSES,
		},
	}),
	acceptInvite: op({
		tag: "Organizations",
		operationId: "acceptInvite",
		summary: "Accept invite by token",
		description:
			"Module: organizations. Accepts an invite for the authenticated session email. Rate-limited per client IP. Body `{ token }`. `Idempotency-Key` required.",
		security: COOKIE_SECURITY,
		parameters: [idempotencyKey(), REQUEST_ID],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["token"],
				properties: { token: { type: "string", minLength: 1 } },
			},
			"Raw invite token issued at invite time.",
		),
		responses: {
			"200": { description: "Activated membership command result." },
			...ERROR_RESPONSES,
		},
	}),
} as const;

export const governanceOpenApi = {
	listGrants: op({
		tag: "Governance",
		operationId: "listGrants",
		summary: "List grants in the agency",
		description:
			"Module: governance. Lists capability grants scoped to `agencyId`. Membership required.",
		security: COOKIE_SECURITY,
		parameters: agencyParams,
		responses: {
			"200": { description: "Grant collection for the agency scope." },
			...ERROR_RESPONSES,
		},
	}),
	issueGrant: op({
		tag: "Governance",
		operationId: "issueGrant",
		summary: "Issue a capability grant",
		description:
			"Module: governance. Issues a grant to a principal. `scopeId` in the domain command is the agency. `capability` is a capability id string. Optional `resourceRef` and `validUntil` (ISO datetime).",
		security: COOKIE_SECURITY,
		parameters: commandParams,
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["scopeId", "granteePrincipalId", "capability"],
				properties: {
					scopeId: UUID,
					granteePrincipalId: UUID,
					capability: { type: "string", minLength: 1 },
					resourceRef: { type: "string", minLength: 1 },
					validUntil: { type: "string", format: "date-time" },
				},
			},
			"Grant target, capability and optional expiry.",
		),
		responses: {
			"200": { description: "Command result with grant aggregateId." },
			...ERROR_RESPONSES,
		},
	}),
	revokeGrant: op({
		tag: "Governance",
		operationId: "revokeGrant",
		summary: "Revoke a grant",
		description:
			"Module: governance. Revokes `grantId`. Body may be empty (`Content-Length: 0`) or `{ reason }`. `commandId`/`grantId` in JSON are ignored in favor of header/path.",
		security: COOKIE_SECURITY,
		parameters: [
			...commandParams,
			pathUuid("grantId", "Grant UUID to revoke."),
		],
		requestBody: {
			required: false,
			content: {
				"application/json": {
					schema: {
						type: "object",
						additionalProperties: false,
						properties: { reason: { type: "string", maxLength: 500 } },
					},
				},
			},
		},
		responses: {
			"200": { description: "Command result after revoke." },
			...ERROR_RESPONSES,
		},
	}),
	getAutonomy: op({
		tag: "Governance",
		operationId: "getEffectiveAutonomy",
		summary: "Get effective autonomy assignment",
		description:
			"Module: governance. Returns the effective autonomy level for an agent in the agency (L0–L4 matrix). L3/L4 remain runtime-disabled until certified.",
		security: COOKIE_SECURITY,
		parameters: [
			...agencyParams,
			pathUuid("agentId", "Subject agent UUID."),
		],
		responses: {
			"200": { description: "Autonomy assignment DTO (level, status, evidenceHash, epochs)." },
			...ERROR_RESPONSES,
		},
	}),
	assignAutonomy: op({
		tag: "Governance",
		operationId: "assignAutonomy",
		summary: "Assign autonomy level",
		description:
			"Module: governance. Assigns autonomy level to the path agent. Requires evidence hash and optional approval id. L3/L4 assignment is blocked at runtime.",
		security: COOKIE_SECURITY,
		parameters: [
			...commandParams,
			pathUuid("agentId", "Subject agent UUID."),
		],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["level", "evidenceHash"],
				properties: {
					level: { type: "string", enum: ["L0", "L1", "L2", "L3", "L4"] },
					evidenceHash: { type: "string", minLength: 1 },
					approvalId: UUID,
				},
			},
			"Target level and evidence of authorization.",
		),
		responses: {
			"200": { description: "Command result for the autonomy assignment." },
			...ERROR_RESPONSES,
		},
	}),
	transitionAutonomy: op({
		tag: "Governance",
		operationId: "transitionAutonomy",
		summary: "Promote, demote or takeover autonomy",
		description:
			"Module: governance. Transitions autonomy (`promote` | `demote` | `takeover`). Actor is the authenticated principal. Expected revision required for optimistic concurrency.",
		security: COOKIE_SECURITY,
		parameters: [
			...commandParams,
			pathUuid("agentId", "Subject agent UUID."),
		],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["kind", "targetLevel", "expectedRevision", "evidenceHash"],
				properties: {
					kind: { type: "string", enum: ["promote", "demote", "takeover"] },
					targetLevel: { type: "string", enum: ["L0", "L1", "L2", "L3", "L4"] },
					expectedRevision: { type: "integer", minimum: 0 },
					evidenceHash: { type: "string", minLength: 1 },
					approvalId: UUID,
				},
			},
			"Transition kind, target level and concurrency token.",
		),
		responses: {
			"200": { description: "Command result after the transition." },
			...ERROR_RESPONSES,
		},
	}),
	authorizationCan: op({
		tag: "Governance",
		operationId: "authorizationCan",
		summary: "Evaluate authorization.can (T01)",
		description:
			"Module: governance + graph kernel. Traversal T01 `authorization.can`. `actorId` must equal the authenticated principal. `agencyId` selects membership scope. Returns ALLOW, DENY or REQUIRE_APPROVAL with optional proof.",
		security: COOKIE_SECURITY,
		parameters: [REQUEST_ID],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["agencyId", "actorId", "action", "resourceNodeKey", "validAt"],
				properties: {
					agencyId: UUID,
					actorId: UUID,
					action: { type: "string", minLength: 1 },
					resourceNodeKey: { type: "object" },
					intentHash: { type: "string", minLength: 1 },
					validAt: { type: "string", format: "date-time" },
					expectedAuthorityEpoch: { type: "integer", minimum: 0 },
					expectedRiskEpoch: { type: "integer", minimum: 0 },
				},
			},
			"T01 input plus agencyId for membership.",
		),
		responses: {
			"200": { description: "T01 decision payload." },
			...ERROR_RESPONSES,
		},
	}),
	autonomyMatrix: op({
		tag: "Governance",
		operationId: "getAutonomyMatrix",
		summary: "Get L0–L4 normative matrix",
		description:
			"Module: governance. Read-only normative matrix (labels, effect class, eligible capabilities, runtimeEnabled). Session required; not agency-scoped.",
		security: COOKIE_SECURITY,
		parameters: [REQUEST_ID],
		responses: {
			"200": { description: "Array of autonomy level definitions." },
			"401": ERROR_RESPONSES["401"],
		},
	}),
	evaluateAutonomy: op({
		tag: "Governance",
		operationId: "evaluateAutonomyCapability",
		summary: "Evaluate if autonomy allows a capability",
		description:
			"Module: governance. Checks whether the subject's current autonomy level may exercise `capability` in the agency.",
		security: COOKIE_SECURITY,
		parameters: [REQUEST_ID],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["agencyId", "subjectAgentId", "capability"],
				properties: {
					agencyId: UUID,
					subjectAgentId: UUID,
					capability: { type: "string", minLength: 1 },
				},
			},
			"Agency, agent and capability id.",
		),
		responses: {
			"200": { description: "Eligibility decision for the capability." },
			...ERROR_RESPONSES,
		},
	}),
} as const;

export const agentsOpenApi = {
	register: op({
		tag: "Agents",
		operationId: "registerAgent",
		summary: "Register agent",
		description:
			"Module: agents. Registers an institutional agent in the agency. `kind`: AGENCY | PLATFORM. Optional body `agencyId` defaults to the path agency. Publish still requires a later version + grants.",
		security: COOKIE_SECURITY,
		parameters: commandParams,
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["displayName", "kind"],
				properties: {
					displayName: { type: "string", minLength: 1, maxLength: 256 },
					kind: { type: "string", enum: ["AGENCY", "PLATFORM"] },
					agencyId: UUID,
				},
			},
			"Agent identity fields (commandId omitted — use Idempotency-Key).",
		),
		responses: {
			"200": { description: "Agent DTO plus command revision." },
			...ERROR_RESPONSES,
		},
	}),
	get: op({
		tag: "Agents",
		operationId: "getAgent",
		summary: "Get agent",
		description:
			"Module: agents. Returns agent identity, lifecycle status and active version pointer.",
		security: COOKIE_SECURITY,
		parameters: [...agencyParams, pathUuid("agentId", "Agent UUID.")],
		responses: {
			"200": { description: "Agent DTO." },
			...ERROR_RESPONSES,
		},
	}),
	listVersions: op({
		tag: "Agents",
		operationId: "listAgentVersions",
		summary: "List agent versions",
		description:
			"Module: agents. Lists published/draft versions (instructionRef, skills, model slots, autonomy snapshot).",
		security: COOKIE_SECURITY,
		parameters: [...agencyParams, pathUuid("agentId", "Agent UUID.")],
		responses: {
			"200": { description: "Array of agent version DTOs." },
			...ERROR_RESPONSES,
		},
	}),
	publishVersion: op({
		tag: "Agents",
		operationId: "publishAgentVersion",
		summary: "Publish agent version",
		description:
			"Module: agents. Publishes a version. Guarded by AgentPublishGuard (governance grants). `instructionRef` is an object store pointer `{ bucket, key, contentHash }`. L3/L4 autonomy on the version does not enable live capital.",
		security: COOKIE_SECURITY,
		parameters: [...commandParams, pathUuid("agentId", "Agent UUID.")],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: [
					"versionNumber",
					"expectedRevision",
					"instructionRef",
					"capabilityManifestHash",
					"autonomyLevel",
				],
				properties: {
					versionNumber: { type: "integer", minimum: 1 },
					expectedRevision: { type: "integer", minimum: 0 },
					instructionRef: {
						type: "object",
						required: ["bucket", "key", "contentHash"],
						properties: {
							bucket: { type: "string" },
							key: { type: "string" },
							contentHash: { type: "string" },
						},
					},
					skillRefs: {
						type: "array",
						items: {
							type: "object",
							required: ["skillId", "schemaVersion"],
							properties: {
								skillId: UUID,
								schemaVersion: { type: "string" },
							},
						},
					},
					capabilityManifestHash: { type: "string", minLength: 1, maxLength: 128 },
					modelSlots: {
						type: "array",
						items: {
							type: "object",
							required: ["slotId", "modelBindingId"],
							properties: {
								slotId: { type: "string" },
								modelBindingId: { type: "string" },
							},
						},
					},
					autonomyLevel: { type: "string", enum: ["L0", "L1", "L2", "L3", "L4"] },
				},
			},
			"Version payload without commandId/agentId (path + header).",
		),
		responses: {
			"200": { description: "Published version DTO and revision." },
			...ERROR_RESPONSES,
		},
	}),
	rollbackVersion: op({
		tag: "Agents",
		operationId: "rollbackAgentVersion",
		summary: "Rollback active agent version",
		description:
			"Module: agents. Rolls the active pointer back to `targetVersionNumber` with optimistic concurrency on `expectedRevision`.",
		security: COOKIE_SECURITY,
		parameters: [...commandParams, pathUuid("agentId", "Agent UUID.")],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["expectedRevision", "targetVersionNumber"],
				properties: {
					expectedRevision: { type: "integer", minimum: 0 },
					targetVersionNumber: { type: "integer", minimum: 1 },
				},
			},
			"Target version and expected agent revision.",
		),
		responses: {
			"200": { description: "Command result after rollback." },
			...ERROR_RESPONSES,
		},
	}),
	transitionStatus: op({
		tag: "Agents",
		operationId: "transitionAgentStatus",
		summary: "Transition agent lifecycle status",
		description:
			"Module: agents. Moves status along DRAFT → CONFIGURED → READY → ACTIVE → PAUSED → DRAINING → ARCHIVED per domain policy.",
		security: COOKIE_SECURITY,
		parameters: [...commandParams, pathUuid("agentId", "Agent UUID.")],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["expectedRevision", "targetStatus"],
				properties: {
					expectedRevision: { type: "integer", minimum: 0 },
					targetStatus: {
						type: "string",
						enum: [
							"DRAFT",
							"CONFIGURED",
							"READY",
							"ACTIVE",
							"PAUSED",
							"DRAINING",
							"ARCHIVED",
						],
					},
				},
			},
			"Target lifecycle status and revision.",
		),
		responses: {
			"200": { description: "Updated agent DTO." },
			...ERROR_RESPONSES,
		},
	}),
	invoke: op({
		tag: "Agents",
		operationId: "invokeBrainCapability",
		summary: "Invoke a brain capability",
		description:
			"Module: agents. Invokes a named capability on the agent (Brain facade). Guarded by BrainInvocationGuard. Does not move capital. `correlationId` is required for audit.",
		security: COOKIE_SECURITY,
		parameters: [...commandParams, pathUuid("agentId", "Agent UUID.")],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["capabilityId", "correlationId"],
				properties: {
					agentVersionId: UUID,
					capabilityId: { type: "string", minLength: 1, maxLength: 128 },
					correlationId: { type: "string", minLength: 1, maxLength: 128 },
				},
			},
			"Capability invocation without commandId/agentId.",
		),
		responses: {
			"200": { description: "Invocation receipt (correlation, revision)." },
			...ERROR_RESPONSES,
		},
	}),
} as const;

export const partnersOpenApi = {
	getByOrganization: op({
		tag: "Partners",
		operationId: "getPartnerByOrganization",
		summary: "Get partner for an organization",
		description:
			"Module: partners. Path `organizationId` is the agency UUID; caller must be a member. Returns partner profile or 404 if the org is not a partner.",
		security: COOKIE_SECURITY,
		parameters: [
			pathUuid("organizationId", "Organization/agency UUID."),
			REQUEST_ID,
		],
		responses: {
			"200": { description: "Partner record (referral, commission rate, status)." },
			...ERROR_RESPONSES,
		},
	}),
	listAccruals: op({
		tag: "Partners",
		operationId: "listCommissionAccruals",
		summary: "List commission accruals",
		description:
			"Module: partners. Lists commission accruals for the organization. Optional query `partnerId`.",
		security: COOKIE_SECURITY,
		parameters: [
			pathUuid("organizationId", "Organization/agency UUID."),
			{
				name: "partnerId",
				in: "query" as const,
				required: false,
				schema: UUID,
				description: "Filter by partner id.",
			},
			REQUEST_ID,
		],
		responses: {
			"200": { description: "Accrual list for the organization." },
			...ERROR_RESPONSES,
		},
	}),
	listPayouts: op({
		tag: "Partners",
		operationId: "listPayouts",
		summary: "List partner payouts",
		description:
			"Module: partners. Lists payout records. Optional query `partnerId`. Write/approve payout commands are not exposed on this HTTP surface yet.",
		security: COOKIE_SECURITY,
		parameters: [
			pathUuid("organizationId", "Organization/agency UUID."),
			{
				name: "partnerId",
				in: "query" as const,
				required: false,
				schema: UUID,
				description: "Filter by partner id.",
			},
			REQUEST_ID,
		],
		responses: {
			"200": { description: "Payout list for the organization." },
			...ERROR_RESPONSES,
		},
	}),
} as const;

const realtimeChannelQuery = {
	name: "channels",
	in: "query" as const,
	required: false,
	schema: { type: "string" },
	description: "Comma-separated realtime channel ids allowed for the session.",
};

const lastEventQuery = {
	name: "lastEventId",
	in: "query" as const,
	required: false,
	schema: { type: "string" },
	description: "Replay cursor. Also accepted as `Last-Event-Id` header on SSE.",
};

export const realtimeOpenApi = {
	sse: op({
		tag: "Realtime",
		operationId: "realtimeSse",
		summary: "Subscribe via Server-Sent Events",
		description:
			"Module: composition realtime gateway. SSE stream of institutional envelopes. Session cookie required. Heartbeats every 30s. Quota exceeded returns 429.",
		security: COOKIE_SECURITY,
		parameters: [realtimeChannelQuery, lastEventQuery, REQUEST_ID],
		responses: {
			"200": { description: "text/event-stream of envelope events." },
			"401": ERROR_RESPONSES["401"],
			"429": ERROR_RESPONSES["429"],
		},
	}),
	poll: op({
		tag: "Realtime",
		operationId: "realtimeLongPoll",
		summary: "Long-poll the next event",
		description:
			"Module: composition realtime gateway. Waits up to 25s for the next event. `204` on timeout. Returns `{ event, seq }` when an envelope is available.",
		security: COOKIE_SECURITY,
		parameters: [realtimeChannelQuery, lastEventQuery, REQUEST_ID],
		responses: {
			"200": { description: "Next envelope and sequence." },
			"204": { description: "No event before poll timeout." },
			"401": ERROR_RESPONSES["401"],
			"429": ERROR_RESPONSES["429"],
		},
	}),
	ws: op({
		tag: "Realtime",
		operationId: "realtimeWebSocket",
		summary: "Subscribe via WebSocket",
		description:
			"Module: composition realtime gateway. WebSocket at `/api/realtime/ws`. Messages: `{ op: ping|subscribe|unsubscribe, channels? }`. Events: `{ op: event, seq, envelope }`. Close 4401 unauthorized, 4429 quota.",
		security: COOKIE_SECURITY,
		parameters: [REQUEST_ID],
		responses: {
			"101": { description: "WebSocket upgrade." },
			"401": ERROR_RESPONSES["401"],
		},
	}),
} as const;
