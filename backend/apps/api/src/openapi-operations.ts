import { GRANT_CAPABILITY_CATALOG } from "@anxionos/contracts/governance";

type JsonSchema = Record<string, unknown>;

export type OpenApiParameter = {
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

type OpenApiResponse = {
	description: string;
	content?: Record<string, { schema: JsonSchema }>;
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
		description:
			"Caller is not an active member of the agency, or a grant is missing.",
	},
	"404": { description: "Aggregate not found in the agency scope." },
	"409": {
		description:
			"Revision conflict, duplicate command, or lifecycle guard rejected the transition.",
	},
	"429": { description: "Rate limit or realtime connection quota exceeded." },
};

/**
 * Parametros declarados por `operationId` (ANX-468).
 *
 * `@elysia/openapi` reconstroi `operation.parameters` a partir do schema da
 * rota e **descarta** `detail.parameters` sempre que o path tem ao menos um
 * template variable (`:principalId` etc.). A correcao vive na raiz — o gerador
 * (`openapi-plugin.ts`) restaura os parametros declarados a partir deste
 * registro — entao nenhuma rota precisa remendar a saida individualmente e
 * rotas novas herdam o comportamento.
 */
const DECLARED_OPERATION_PARAMETERS = new Map<
	string,
	readonly OpenApiParameter[]
>();

/**
 * Somente leitura para o gerador e para o teste de regressao do catalogo.
 * A chave e' o `operationId` — identificador estavel ja assertado no documento
 * servido.
 */
export function declaredOperationParameters(): ReadonlyMap<
	string,
	readonly OpenApiParameter[]
> {
	return DECLARED_OPERATION_PARAMETERS;
}

function op(input: {
	tag: string;
	operationId: string;
	summary: string;
	description: string;
	security?: Array<Record<string, string[]>>;
	parameters?: OpenApiParameter[];
	requestBody?: OpenApiRequestBody;
	responses?: Record<string, OpenApiResponse>;
}) {
	if (input.parameters && input.parameters.length > 0) {
		DECLARED_OPERATION_PARAMETERS.set(input.operationId, input.parameters);
	}
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
			"Provider: Better Auth, mounted by the composition root (`apps/api`) — `/api/auth/*` is **not** owned by `modules/identity`, which owns only the principal/session-reference ledger. `POST /api/auth/sign-in/email` with `{ email, password }`. Sets cookie `better-auth.session_token`. Other Better Auth subpaths remain on the hidden catch-all `/api/auth/*`.",
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
			"400": {
				description:
					"Body validation failed — `email` and `password` are required (`VALIDATION_ERROR`).",
			},
			"401": { description: "Invalid credentials." },
			"403": {
				description:
					"Untrusted or invalid `Origin` (Better Auth trusted-origin check).",
			},
		},
	}),
	signUpEmail: op({
		tag: "Identity",
		operationId: "identitySignUpEmail",
		summary: "Register with email and password",
		description:
			"Provider: Better Auth, mounted by the composition root (`apps/api`) — `/api/auth/*` is **not** owned by `modules/identity`. `POST /api/auth/sign-up/email` with `{ email, password, name }` (all three required). A successful signup registers the institutional principal through the Better Auth `user.create.after` hook. Email verification is sent only when SMTP_USER/SMTP_PASS are configured.",
		requestBody: jsonBody(
			{
				type: "object",
				required: ["email", "password", "name"],
				properties: {
					email: { type: "string", format: "email" },
					password: { type: "string", minLength: 1 },
					name: { type: "string" },
				},
			},
			"Registration payload; `name` is required by Better Auth.",
		),
		responses: {
			"200": {
				description:
					"Created user and session cookie when auto-sign-in is enabled.",
			},
			"400": {
				description:
					"Body validation failed — `email`, `password` and `name` are required (`VALIDATION_ERROR`).",
			},
			"403": {
				description:
					"Untrusted or invalid `Origin` (Better Auth trusted-origin check).",
			},
			"422": {
				description:
					"Email already registered (`USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`).",
			},
		},
	}),
	getSession: op({
		tag: "Identity",
		operationId: "identityGetSession",
		summary: "Read current Better Auth session",
		description:
			"Provider: Better Auth, mounted by the composition root (`apps/api`). `GET /api/auth/get-session` returns the session bound to `better-auth.session_token`, or `null` when anonymous.",
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
			"Provider: Better Auth, mounted by the composition root (`apps/api`). `POST /api/auth/sign-out` revokes the current Better Auth session cookie; an anonymous call is a no-op that still returns 200.",
		security: COOKIE_SECURITY,
		responses: {
			"200": {
				description:
					"Signed out (`{ success: true }`), including when anonymous.",
			},
			"403": {
				description:
					"Cookie present without an `Origin` header, or an untrusted `Origin` (Better Auth trusted-origin check).",
			},
		},
	}),
} as const;

export const postLoginContextOpenApiDetail = op({
	tag: "Identity",
	operationId: "getPostLoginContext",
	summary: "Resolve post-login console routing",
	description:
		"Module: identity + organizations. Cookie optional. Returns authentication flags, principal, active/pending memberships, MFA/email-verification gates and whether SMTP verification is configured. `platformAccess` is true only with an active `console.platform` grant (fail-closed otherwise). `partnerAccess` remains fail-closed until the partner console is authorized.",
	security: COOKIE_SECURITY,
	parameters: [REQUEST_ID],
	responses: {
		"200": {
			description:
				"Routing payload: authenticated, emailVerified, mfaRequired, principal, membershipsActive, membershipsPending, emailDelivery.verificationConfigured.",
		},
	},
});

/**
 * Optional agency scope of an identity request. Omitting it makes the request
 * PLATFORM-scoped and requires a platform-scoped grant (ANX-462); declaring an
 * agency requires active membership in it and a grant scoped to that agency,
 * and — on routes with a target principal — that the target belongs to that
 * agency (ANX-457). Not read by `GET /v1/identity/sessions/revoked`, whose
 * ledger is global.
 */
const AGENCY_SCOPE = header(
	"X-Agency-Id",
	"Optional agency scope of the request. When present the caller must be an active member of that agency and the grant must be scoped to it; routes with a target principal also require the target to belong to it (`IDN_CROSS_TENANT` otherwise). When absent the request is platform-scoped and requires a platform-scoped grant. Invalid UUID → `VALIDATION_ERROR`.",
	{ schema: UUID },
);

const identityPrincipalParams = [
	pathUuid(
		"principalId",
		"Principal UUID owned by `identity`. This is the institutional principal id, never the Better Auth user id.",
	),
	AGENCY_SCOPE,
	REQUEST_ID,
];

const identityCommandParams = [...identityPrincipalParams, idempotencyKey()];

export const identityPrincipalsOpenApi = {
	getPrincipal: op({
		tag: "Identity",
		operationId: "identityGetPrincipal",
		summary: "Get one principal",
		description:
			"Module: identity. Returns the public principal DTO (no `authUserId`, no credential material). Self-access is allowed; otherwise the caller needs the `identity.read` grant (`identity.admin` does not imply it, D-IDN-034). Suspended and revoked principals fail closed with 404. When `X-Agency-Id` is declared the caller must be a member of that agency **and** the target principal must belong to it (otherwise `IDN_CROSS_TENANT`); without the header the request is platform-scoped.",
		security: [{ cookieAuth: [] }],
		parameters: identityPrincipalParams,
		responses: {
			"200": {
				description: "`{ principal }` with id, email, kind, status, revision.",
			},
			"400": {
				description:
					"Invalid `principalId` or `X-Agency-Id` (`VALIDATION_ERROR`).",
			},
			"401": { description: "No session." },
			"403": { description: "`IDN_FORBIDDEN` / `IDN_CROSS_TENANT`." },
			"404": {
				description: "`IDN_PRINCIPAL_NOT_FOUND` (includes suspended/revoked).",
			},
		},
	}),
	listSessions: op({
		tag: "Identity",
		operationId: "identityListSessions",
		summary: "List session references of a principal",
		description:
			"Module: identity. Logical session references only — never a token, cookie or raw session id. Self-access allowed; otherwise requires `identity.read`. Suspended and revoked principals fail closed with 404. When `X-Agency-Id` is declared the caller must be a member of that agency **and** the target principal must belong to it (otherwise `IDN_CROSS_TENANT`).",
		security: [{ cookieAuth: [] }],
		parameters: identityPrincipalParams,
		responses: {
			"200": { description: "`{ sessions }` newest first." },
			"400": {
				description:
					"Invalid `principalId` or `X-Agency-Id` (`VALIDATION_ERROR`).",
			},
			"401": { description: "No session." },
			"403": { description: "`IDN_FORBIDDEN` / `IDN_CROSS_TENANT`." },
			"404": {
				description: "`IDN_PRINCIPAL_NOT_FOUND` (includes suspended/revoked).",
			},
		},
	}),
	registerPrincipal: op({
		tag: "Identity",
		operationId: "identityRegisterPrincipal",
		summary: "Register a principal",
		description:
			"Module: identity. Requires `identity.admin` with **platform** scope plus an `Idempotency-Key` header (materialized as `commandId`): the principal created here is global (it is born with no agency binding) and an existing principal replays with its public DTO — including e-mail — so an agency-scoped grant is rejected even when `X-Agency-Id` matches one of the caller's memberships (`IDN_FORBIDDEN`). Declaring `X-Agency-Id` only adds the membership check (a foreign agency is `IDN_CROSS_TENANT`); it never relaxes the platform requirement. Idempotent by `authUserId`: a repeated registration returns the existing principal without a second event; replaying a registration whose principal is suspended or revoked fails closed with 404 (`IDN_PRINCIPAL_NOT_FOUND`).",
		security: [{ cookieAuth: [] }],
		parameters: [idempotencyKey(), AGENCY_SCOPE, REQUEST_ID],
		requestBody: {
			required: true,
			content: {
				"application/json": {
					schema: {
						type: "object",
						required: ["authUserId", "email"],
						properties: {
							authUserId: { type: "string", minLength: 1, maxLength: 128 },
							email: { type: "string", format: "email", maxLength: 320 },
							kind: {
								type: "string",
								enum: ["human", "service"],
								default: "human",
							},
						},
					},
				},
			},
		},
		responses: {
			"200": { description: "`{ principal }`." },
			"400": {
				description:
					"Missing/invalid `Idempotency-Key`, invalid `X-Agency-Id` or body (`VALIDATION_ERROR`).",
			},
			"401": { description: "No session." },
			"403": { description: "`IDN_FORBIDDEN` / `IDN_CROSS_TENANT`." },
			"404": {
				description:
					"`IDN_PRINCIPAL_NOT_FOUND` when the `authUserId` being registered is already linked to a suspended or revoked principal (fail-closed replay).",
			},
			"409": {
				description:
					"`IDN_PRINCIPAL_EMAIL_TAKEN` / `IDN_DUPLICATE_IDEMPOTENCY`.",
			},
		},
	}),
	suspendPrincipal: op({
		tag: "Identity",
		operationId: "identitySuspendPrincipal",
		summary: "Suspend a principal (reversible)",
		description:
			"Module: identity. Requires `identity.admin` and `Idempotency-Key`. Revokes every active service credential and inline-revokes Better Auth sessions (fail-closed), but keeps service identities so they can be reissued after reactivation. Suspending an already-suspended principal is an idempotent 200. `expectedRevision` mismatch returns `IDN_REVISION_CONFLICT`. When `X-Agency-Id` is declared the caller must be a member of that agency **and** the target principal must belong to it (otherwise `IDN_CROSS_TENANT`).",
		security: [{ cookieAuth: [] }],
		parameters: identityCommandParams,
		requestBody: {
			required: false,
			content: {
				"application/json": {
					schema: {
						type: "object",
						additionalProperties: false,
						properties: {
							reasonCode: {
								type: "string",
								enum: [
									"ops.manual",
									"governance.revoked",
									"security.incident",
									"user.requested",
								],
								default: "ops.manual",
							},
							expectedRevision: { type: "integer", minimum: 0 },
						},
					},
				},
			},
		},
		responses: {
			"200": { description: "`{ principal }` suspended." },
			"400": {
				description:
					"Missing/invalid `Idempotency-Key`, invalid `X-Agency-Id`, unknown body property or invalid body (`VALIDATION_ERROR`).",
			},
			"401": { description: "No session." },
			"403": { description: "`IDN_FORBIDDEN` / `IDN_CROSS_TENANT`." },
			"404": { description: "`IDN_PRINCIPAL_NOT_FOUND`." },
			"409": {
				description: "`IDN_REVISION_CONFLICT` / `IDN_PRINCIPAL_REVOKED`.",
			},
			"503": {
				description:
					"`IDN_IDENTITY_UNAVAILABLE` when session revocation fails.",
			},
		},
	}),
	revokePrincipal: op({
		tag: "Identity",
		operationId: "identityRevokePrincipal",
		summary: "Revoke a principal (terminal)",
		description:
			"Module: identity. Requires `identity.admin` and `Idempotency-Key`. Terminal: also revokes service identities, their credentials and sessions. A revoked principal can never be reactivated; revoking an already-revoked principal is an idempotent 200. When `X-Agency-Id` is declared the caller must be a member of that agency **and** the target principal must belong to it (otherwise `IDN_CROSS_TENANT`).",
		security: [{ cookieAuth: [] }],
		parameters: identityCommandParams,
		requestBody: {
			required: false,
			content: {
				"application/json": {
					schema: {
						type: "object",
						additionalProperties: false,
						properties: {
							reasonCode: {
								type: "string",
								enum: [
									"ops.manual",
									"governance.revoked",
									"security.incident",
									"user.requested",
									"gdpr.erasure",
								],
								default: "ops.manual",
							},
							expectedRevision: { type: "integer", minimum: 0 },
						},
					},
				},
			},
		},
		responses: {
			"200": { description: "`{ principal }` revoked." },
			"400": {
				description:
					"Missing/invalid `Idempotency-Key`, invalid `X-Agency-Id`, unknown body property or invalid body (`VALIDATION_ERROR`).",
			},
			"401": { description: "No session." },
			"403": { description: "`IDN_FORBIDDEN` / `IDN_CROSS_TENANT`." },
			"404": { description: "`IDN_PRINCIPAL_NOT_FOUND`." },
			"409": { description: "`IDN_REVISION_CONFLICT`." },
			"503": {
				description:
					"`IDN_IDENTITY_UNAVAILABLE` when session revocation fails.",
			},
		},
	}),
	revokeSession: op({
		tag: "Identity",
		operationId: "identityRevokeSession",
		summary: "Record a revoked session reference",
		description:
			"Module: identity. Requires `Idempotency-Key`. Self-access (revoking your own session reference) is allowed; otherwise the caller needs `identity.admin` for the `principalId` in the body. The reference must belong to the declared `principalId`: revoking a `sessionRefId` owned by another principal is rejected with the same opaque `IDN_SESSION_NOT_FOUND` as an unknown reference (object ownership is enforced on the aggregate, not merely by knowing its id). Records a revocation learned from the session owner; `externalRefHash` is required only when the reference is unknown to the module (otherwise `IDN_SESSION_NOT_FOUND`). Emits `identity.session.revoked.v1` carrying the logical sessionRefId — never a token. When `X-Agency-Id` is declared the caller must be a member of that agency **and** the target principal must belong to it (otherwise `IDN_CROSS_TENANT`).",
		security: [{ cookieAuth: [] }],
		parameters: [idempotencyKey(), AGENCY_SCOPE, REQUEST_ID],
		requestBody: {
			required: true,
			content: {
				"application/json": {
					schema: {
						type: "object",
						required: ["principalId", "sessionRefId"],
						properties: {
							principalId: { type: "string", format: "uuid" },
							sessionRefId: { type: "string", format: "uuid" },
							externalRefHash: {
								type: "string",
								description:
									"One-way sha256 hex digest of the session owner's opaque reference; raw tokens/cookies are rejected (`VALIDATION_ERROR`).",
								pattern: "^[0-9a-f]{64}$",
								minLength: 64,
								maxLength: 64,
							},
							revokedAt: { type: "string", format: "date-time" },
							reasonCode: {
								type: "string",
								minLength: 1,
								maxLength: 64,
							},
						},
					},
				},
			},
		},
		responses: {
			"200": { description: "`{ sessionRef, transitioned }`." },
			"400": {
				description:
					"Missing/invalid `Idempotency-Key`, invalid `X-Agency-Id` or body (`VALIDATION_ERROR`).",
			},
			"401": { description: "No session." },
			"403": { description: "`IDN_FORBIDDEN` / `IDN_CROSS_TENANT`." },
			"404": {
				description: "`IDN_PRINCIPAL_NOT_FOUND` / `IDN_SESSION_NOT_FOUND`.",
			},
			"409": { description: "`IDN_DUPLICATE_IDEMPOTENCY`." },
		},
	}),
	listRevokedSessions: op({
		tag: "Identity",
		operationId: "identityListRevokedSessions",
		summary: "List revoked session references",
		description:
			"Module: identity. Requires an `identity.admin` grant with **platform** scope: the revocation ledger is global (session references carry no agency dimension), so an agency-scoped grant is rejected even when `X-Agency-Id` matches one of the caller's memberships. Declaring `X-Agency-Id` does not change the scope requirement, but an agency the caller is **not** an active member of is still rejected as `IDN_CROSS_TENANT` — declaring a foreign agency is a cross-tenant signal on every route. Optionally bounded by `since` (ISO-8601).",
		security: [{ cookieAuth: [] }],
		parameters: [
			{
				name: "since",
				in: "query",
				required: false,
				schema: { type: "string", format: "date-time" },
				description: "Only revocations at or after this instant.",
			},
			// ANX-468 (F3 do G3): a rota LE e APLICA o header — agencia
			// estrangeira responde `IDN_CROSS_TENANT` — mas ele nao era
			// declarado. Descricao propria porque o ledger e' global: declarar
			// agencia nao satisfaz o escopo exigido (sempre PLATAFORMA).
			header(
				"X-Agency-Id",
				"Optional agency scope. The revocation ledger is global, so this route always requires a platform-scoped `identity.admin` grant; declaring an agency the caller is not an active member of is still rejected as `IDN_CROSS_TENANT`. Invalid UUID → `VALIDATION_ERROR`.",
				{ schema: UUID },
			),
			REQUEST_ID,
		],
		responses: {
			"200": { description: "`{ sessions }` newest first." },
			"400": {
				description: "Invalid `since` (`VALIDATION_ERROR`).",
			},
			"401": { description: "No session." },
			"403": { description: "`IDN_FORBIDDEN` / `IDN_CROSS_TENANT`." },
		},
	}),
} as const;

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
			"200": {
				description:
					"Command result: aggregateId, revision, optional idempotentReplay.",
			},
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
	transferOwnership: op({
		tag: "Organizations",
		operationId: "transferOwnership",
		summary: "Transfer agency ownership",
		description:
			"Module: organizations. Hands the agency to another principal. Requires an active membership for the successor; only the current active owner is accepted (`ORG_CROSS_TENANT` otherwise). Body `{ newOwnerPrincipalId }`. `Idempotency-Key` required.",
		security: COOKIE_SECURITY,
		parameters: commandParams,
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["newOwnerPrincipalId"],
				properties: { newOwnerPrincipalId: UUID },
			},
			"Principal that becomes the new agency owner.",
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
		parameters: [...agencyParams, pathUuid("membershipId", "Membership UUID.")],
		responses: {
			"200": {
				description: "Membership record (role, status, invite metadata).",
			},
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
			"200": {
				description: "Invite result including one-time token when issued.",
			},
			...ERROR_RESPONSES,
		},
	}),
	activateMembership: op({
		tag: "Organizations",
		operationId: "activateMembership",
		summary: "Reactivate an already-bound membership",
		description:
			"Module: organizations. Assisted reactivation (`revoked` → `active`). Requires the membership to be **already bound to a principal**: a pending invite is refused with 403 `ORG_INVITEE_CONSENT_REQUIRED`, because the first binding must be accepted by the invitee via `/invites/accept`. Owner authority is never activated here (409). Empty JSON body. `Idempotency-Key` required.",
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
			"Module: organizations. Revokes an active or invited membership. Revoking a pending invite publishes `principalId: null` (no principal ever existed). Ownership transfer is `POST /agencies/{agencyId}/ownership/transfer`, not this route.",
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
	listChangeProposals: op({
		tag: "Governance",
		operationId: "listPendingChangeProposals",
		summary: "List pending change proposals",
		description:
			"Module: governance. Lists pending ChangeProposal rows for the agency scope (`scopeId` = `agencyId`). Membership required. Resolve via POST /v1/governance/approvals/resolve.",
		security: COOKIE_SECURITY,
		parameters: agencyParams,
		responses: {
			"200": {
				description: "Pending change proposal collection for the agency.",
			},
			...ERROR_RESPONSES,
		},
	}),
	issueGrant: op({
		tag: "Governance",
		operationId: "issueGrant",
		summary: "Issue a capability grant",
		description:
			"Module: governance. Issues a grant to a principal. The agency is the **path parameter**; the body must NOT carry `scopeId` (the handler builds it from the path and rejects unknown keys — sending it is `400 VALIDATION_ERROR`). `capability` is **validated against the grant capability catalog** (`GRANT_CAPABILITY_CATALOG`, the single source of the tokens the system consumes); a value outside the catalog is rejected with `GOV_CAPABILITY_UNKNOWN` (400) and zero writes, by the HTTP route and by the command (seed/worker included). Issuing is authorized by **role and possession**, not by role alone: `operator` only issues operational capabilities, `owner`/`admin` also issue administrative ones (`identity.*`, `governance.*`, `console.*`, `owner.*`), and the issuer must already hold the capability in the declared agency scope or in PLATFORM scope — otherwise `GOV_INSUFFICIENT_AUTHORITY` (403). `console.platform` stays platform-only: requesting it in agency scope is `GOV_CAPABILITY_SCOPE_MISMATCH` (409). Optional `resourceRef` and `validUntil` (ISO datetime).",
		security: COOKIE_SECURITY,
		parameters: commandParams,
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["granteePrincipalId", "capability"],
				properties: {
					granteePrincipalId: UUID,
					capability: {
						type: "string",
						enum: [...GRANT_CAPABILITY_CATALOG],
						description:
							"Grant capability token. Must belong to `GRANT_CAPABILITY_CATALOG`; any other value is refused with `GOV_CAPABILITY_UNKNOWN` (400).",
					},
					resourceRef: { type: "string", minLength: 1 },
					validUntil: { type: "string", format: "date-time" },
				},
			},
			"Grant target, capability and optional expiry.",
		),
		responses: {
			"200": { description: "Command result with grant aggregateId." },
			...ERROR_RESPONSES,
			"400": {
				description:
					"`GOV_CAPABILITY_UNKNOWN` when `capability` is not in the grant capability catalog (no write). Malformed body, unknown body property or missing/invalid `Idempotency-Key` → `VALIDATION_ERROR`.",
			},
			"403": {
				description:
					"`GOV_INSUFFICIENT_AUTHORITY` when the caller's membership role may not issue that capability class, or when the issuer does not already hold it in the declared agency scope or in PLATFORM scope. Also `ORG_CROSS_TENANT` when the caller lacks an active mutating membership in `agencyId`.",
			},
			"404": {
				description:
					"`GOV_PRINCIPAL_NOT_FOUND` for an unknown `granteePrincipalId` (also `ORG_PRINCIPAL_NOT_FOUND` / `ORG_AGENCY_NOT_FOUND` on the agency scope).",
			},
			"409": {
				description:
					"`GOV_CAPABILITY_SCOPE_MISMATCH` when a platform-only capability (e.g. `console.platform`) is requested in agency scope, or when scope id and scope kind disagree. Also revision/duplicate-command conflicts.",
			},
		},
	}),
	revokeGrant: op({
		tag: "Governance",
		operationId: "revokeGrant",
		summary: "Revoke a grant",
		description:
			"Module: governance. Revokes `grantId`. Authorization (ANX-469): the caller must be an **owner/admin** of the declared agency **or** the grant's **issuer** (`issued_by_principal_id`); anyone else is refused with `GOV_INSUFFICIENT_AUTHORITY` (403) and **nothing is written**. `revokeGrant` is never a way to undo a grant issued by a higher role. Body may be empty (`Content-Length: 0`) or `{ reason }`. `commandId`/`grantId` in JSON are ignored in favor of header/path.",
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
			"400": {
				description:
					"Missing/invalid `Idempotency-Key`, invalid path/body (`VALIDATION_ERROR`).",
			},
			"401": { description: "No session." },
			"403": {
				description:
					"`GOV_INSUFFICIENT_AUTHORITY` (not owner/admin and not the issuer) / `ORG_CROSS_TENANT`.",
			},
			"404": {
				description: "`GOV_GRANT_NOT_FOUND` / `GOV_PRINCIPAL_NOT_FOUND`.",
			},
			"409": { description: "`GOV_GRANT_REVOKED` (already revoked)." },
			"429": ERROR_RESPONSES["429"],
		},
	}),
	getAutonomy: op({
		tag: "Governance",
		operationId: "getEffectiveAutonomy",
		summary: "Get effective autonomy assignment",
		description:
			"Module: governance. Returns the effective autonomy level for an agent in the agency (L0–L4 matrix). L3/L4 remain runtime-disabled until certified.",
		security: COOKIE_SECURITY,
		parameters: [...agencyParams, pathUuid("agentId", "Subject agent UUID.")],
		responses: {
			"200": {
				description:
					"Autonomy assignment DTO (level, status, evidenceHash, epochs).",
			},
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
		parameters: [...commandParams, pathUuid("agentId", "Subject agent UUID.")],
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
		parameters: [...commandParams, pathUuid("agentId", "Subject agent UUID.")],
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
				required: [
					"agencyId",
					"actorId",
					"action",
					"resourceNodeKey",
					"validAt",
				],
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
					capabilityManifestHash: {
						type: "string",
						minLength: 1,
						maxLength: 128,
					},
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
					autonomyLevel: {
						type: "string",
						enum: ["L0", "L1", "L2", "L3", "L4"],
					},
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
	bindSkill: op({
		tag: "Agents",
		operationId: "bindAgentSkill",
		summary: "Bind verified skill version to draft agent version",
		description:
			"Module: agents. Binds a verified skill version to a draft agent version. Guarded by SkillBindGuard (`agents.skills.bind` grant).",
		security: COOKIE_SECURITY,
		parameters: [...commandParams, pathUuid("agentId", "Agent UUID.")],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["agentVersionId", "skillVersionId", "expectedAgentRevision"],
				properties: {
					agentVersionId: UUID,
					skillVersionId: UUID,
					expectedAgentRevision: { type: "integer", minimum: 0 },
					bindingConfig: { type: "object", additionalProperties: true },
				},
			},
			"Binding payload without commandId/agentId.",
		),
		responses: {
			"200": { description: "Binding id and agent revision." },
			...ERROR_RESPONSES,
		},
	}),
	registerSkill: op({
		tag: "Agents",
		operationId: "registerSkill",
		summary: "Register governed skill",
		description:
			"Module: agents. Registers a skill identity (slug) in the agency. Versions are created separately and must be evaluated before binding.",
		security: COOKIE_SECURITY,
		parameters: commandParams,
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["slug", "displayName"],
				properties: {
					slug: {
						type: "string",
						pattern: "^[a-z][a-z0-9-]*$",
						minLength: 1,
						maxLength: 64,
					},
					displayName: { type: "string", minLength: 1, maxLength: 256 },
					description: { type: "string", maxLength: 2048 },
					agencyId: UUID,
				},
			},
			"Skill identity (commandId via Idempotency-Key).",
		),
		responses: {
			"200": { description: "Skill id and revision." },
			...ERROR_RESPONSES,
		},
	}),
	createSkillVersion: op({
		tag: "Agents",
		operationId: "createSkillVersion",
		summary: "Create draft skill version",
		description:
			"Module: agents. Creates a draft skill version with content hash and sandbox policy.",
		security: COOKIE_SECURITY,
		parameters: [...commandParams, pathUuid("skillId", "Skill UUID.")],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["schemaVersion", "contentRef", "contentHash"],
				properties: {
					schemaVersion: { type: "string", minLength: 1, maxLength: 32 },
					contentRef: {
						type: "object",
						required: ["bucket", "key", "contentHash"],
						properties: {
							bucket: { type: "string" },
							key: { type: "string" },
							contentHash: { type: "string" },
						},
					},
					contentHash: { type: "string", minLength: 1, maxLength: 128 },
					permissionRequirements: { type: "array", items: { type: "object" } },
					sandboxPolicy: { type: "object" },
				},
			},
			"Draft version payload.",
		),
		responses: {
			"200": { description: "Skill version id and skill revision." },
			...ERROR_RESPONSES,
		},
	}),
	submitSkillVersion: op({
		tag: "Agents",
		operationId: "submitSkillVersion",
		summary: "Submit skill version for evaluation",
		description: "Module: agents. Moves skill version from draft to candidate.",
		security: COOKIE_SECURITY,
		parameters: [
			...commandParams,
			pathUuid("skillId", "Skill UUID."),
			pathUuid("skillVersionId", "Skill version UUID."),
		],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["expectedRevision"],
				properties: {
					expectedRevision: { type: "integer", minimum: 0 },
				},
			},
			"Expected skill aggregate revision.",
		),
		responses: {
			"200": { description: "Submitted skill version id and revision." },
			...ERROR_RESPONSES,
		},
	}),
	evaluateSkillVersion: op({
		tag: "Agents",
		operationId: "recordSkillVersionEvaluation",
		summary: "Record skill version evaluation outcome",
		description:
			"Module: agents. Records evaluation outcome (verified/rejected) with evaluationRef evidence. Promotion gate requires evaluationRef.outcome pass for verified and fail for rejected.",
		security: COOKIE_SECURITY,
		parameters: [
			...commandParams,
			pathUuid("skillId", "Skill UUID."),
			pathUuid("skillVersionId", "Skill version UUID."),
		],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["expectedRevision", "outcome", "evaluationRef"],
				properties: {
					expectedRevision: { type: "integer", minimum: 0 },
					outcome: { type: "string", enum: ["verified", "rejected"] },
					evaluationRef: {
						type: "object",
						required: [
							"evaluationId",
							"rubricVersion",
							"outcome",
							"evidenceHash",
						],
						properties: {
							evaluationId: UUID,
							rubricVersion: { type: "string" },
							outcome: { type: "string", enum: ["pass", "fail"] },
							evidenceHash: { type: "string" },
						},
					},
				},
			},
			"Evaluation record with rubric evidence.",
		),
		responses: {
			"200": { description: "Evaluated skill version id and revision." },
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
			"200": {
				description: "Partner record (referral, commission rate, status).",
			},
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

const contentHashProperty = {
	type: "string",
	pattern: "^[a-f0-9]{64}$",
};

export const strategiesOpenApi = {
	register: op({
		tag: "Strategies",
		operationId: "registerStrategy",
		summary: "Register strategy",
		description:
			"Module: strategies. Registers a strategy identity in the agency. `executionMode`: SIMULATED | PAPER (REAL blocked). Idempotent via `Idempotency-Key`.",
		security: COOKIE_SECURITY,
		parameters: commandParams,
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["displayName", "executionMode"],
				properties: {
					displayName: { type: "string", minLength: 1, maxLength: 256 },
					description: { type: "string", maxLength: 1024 },
					executionMode: { type: "string", enum: ["SIMULATED", "PAPER"] },
				},
			},
			"Strategy identity (commandId via Idempotency-Key).",
		),
		responses: {
			"200": { description: "Command result with strategyId." },
			...ERROR_RESPONSES,
		},
	}),
	createVersion: op({
		tag: "Strategies",
		operationId: "createStrategyVersion",
		summary: "Create draft strategy version",
		description:
			"Module: strategies. Creates a DRAFT version with immutable content hashes. Versions become immutable after publish.",
		security: COOKIE_SECURITY,
		parameters: [
			...commandParams,
			pathUuid("strategyId", "Strategy aggregate id."),
		],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: [
					"sourceHash",
					"rulesHash",
					"parametersHash",
					"executionMode",
				],
				properties: {
					sourceHash: contentHashProperty,
					rulesHash: contentHashProperty,
					parametersHash: contentHashProperty,
					executionMode: { type: "string", enum: ["SIMULATED", "PAPER"] },
				},
			},
			"Draft version hashes and execution mode.",
		),
		responses: {
			"200": { description: "Command result with strategyVersionId." },
			...ERROR_RESPONSES,
		},
	}),
	publish: op({
		tag: "Strategies",
		operationId: "publishStrategyVersion",
		summary: "Publish strategy version",
		description:
			"Module: strategies. Publishes a draft version (immutability trigger). Empty JSON body accepted.",
		security: COOKIE_SECURITY,
		parameters: [
			...commandParams,
			pathUuid("strategyId", "Strategy aggregate id."),
			pathUuid("strategyVersionId", "Strategy version id."),
		],
		requestBody: {
			required: false,
			content: {
				"application/json": {
					schema: { type: "object", additionalProperties: false },
				},
			},
		},
		responses: {
			"200": { description: "Command result after publish." },
			...ERROR_RESPONSES,
		},
	}),
	requestBacktest: op({
		tag: "Strategies",
		operationId: "requestStrategyBacktest",
		summary: "Request backtest for a version",
		description:
			"Module: strategies. Opens a backtest run for a published version. Completes via POST .../backtest-runs/:backtestRunId/complete.",
		security: COOKIE_SECURITY,
		parameters: [
			...commandParams,
			pathUuid("strategyId", "Strategy aggregate id."),
			pathUuid("strategyVersionId", "Strategy version id."),
		],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["datasetId", "datasetRevision", "seed"],
				properties: {
					datasetId: { type: "string", minLength: 1, maxLength: 256 },
					datasetRevision: { type: "string", minLength: 1, maxLength: 128 },
					seed: { type: "string", minLength: 1, maxLength: 256 },
				},
			},
			"Dataset binding and deterministic seed.",
		),
		responses: {
			"200": { description: "Command result with backtestRunId." },
			...ERROR_RESPONSES,
		},
	}),
	completeBacktest: op({
		tag: "Strategies",
		operationId: "completeStrategyBacktest",
		summary: "Complete backtest run",
		description:
			"Module: strategies. Finalizes a backtest via sandbox runner adapter. Transitions version to BACKTESTED on success.",
		security: COOKIE_SECURITY,
		parameters: [
			...commandParams,
			pathUuid("backtestRunId", "Backtest run id (`st_btr_*`)."),
		],
		requestBody: {
			required: false,
			content: {
				"application/json": {
					schema: { type: "object", additionalProperties: false },
				},
			},
		},
		responses: {
			"200": { description: "Command result after backtest completion." },
			...ERROR_RESPONSES,
		},
	}),
	activateDeployment: op({
		tag: "Strategies",
		operationId: "activateStrategyDeployment",
		summary: "Activate deployment binding",
		description:
			"Module: strategies. Activates a deployment for a certified/backtested version. PAPER requires certification bridge (EVALUATED→CERTIFIED). Binding snapshot is immutable after activation.",
		security: COOKIE_SECURITY,
		parameters: [
			...commandParams,
			pathUuid("strategyId", "Strategy aggregate id."),
		],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["strategyVersionId", "executionMode", "bindingSnapshot"],
				properties: {
					strategyVersionId: UUID,
					executionMode: { type: "string", enum: ["SIMULATED", "PAPER"] },
					portfolioId: { type: "string", minLength: 1, maxLength: 256 },
					canary: { type: "boolean" },
					bindingSnapshot: {
						type: "object",
						required: ["instrumentRefs", "parametersHash"],
						properties: {
							instrumentRefs: {
								type: "array",
								items: { type: "string", minLength: 1 },
								minItems: 1,
							},
							parametersHash: contentHashProperty,
							rulesHash: contentHashProperty,
						},
					},
				},
			},
			"Deployment target version, mode and binding snapshot.",
		),
		responses: {
			"200": { description: "Command result with deploymentId." },
			...ERROR_RESPONSES,
		},
	}),
	rollbackDeployment: op({
		tag: "Strategies",
		operationId: "rollbackStrategyDeployment",
		summary: "Rollback strategy deployment",
		description:
			"Module: strategies (ANX-171). Rolls back an ACTIVE or CANARY deployment to ROLLED_BACK with audited journal and domain event.",
		security: COOKIE_SECURITY,
		parameters: [
			...commandParams,
			pathUuid("strategyId", "Strategy aggregate id."),
			{
				name: "deploymentId",
				in: "path",
				required: true,
				schema: { type: "string", pattern: "^st_dep_[0-9a-f-]{36}$" },
				description: "Deployment aggregate id.",
			},
		],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["reason"],
				properties: {
					reason: { type: "string", minLength: 1, maxLength: 512 },
				},
			},
			"Rollback reason for audit trail.",
		),
		responses: {
			"200": { description: "Command result after deployment rollback." },
			...ERROR_RESPONSES,
		},
	}),
	emitSignal: op({
		tag: "Strategies",
		operationId: "emitStrategySignal",
		summary: "Emit strategy signal",
		description:
			"Module: strategies. Emits a time-bound signal for instruments. Optional deploymentId scopes to an active deployment.",
		security: COOKIE_SECURITY,
		parameters: [
			...commandParams,
			pathUuid("strategyId", "Strategy aggregate id."),
		],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["instrumentRefs", "valueRef", "expiresAt"],
				properties: {
					deploymentId: UUID,
					instrumentRefs: {
						type: "array",
						items: { type: "string", minLength: 1 },
						minItems: 1,
					},
					valueRef: { type: "string", minLength: 1, maxLength: 512 },
					expiresAt: { type: "string", format: "date-time" },
				},
			},
			"Signal payload with ISO-8601 expiry.",
		),
		responses: {
			"200": { description: "Command result with signalId." },
			...ERROR_RESPONSES,
		},
	}),
} as const;

const recoveryTaskIdPath = {
	name: "recoveryTaskId",
	in: "path" as const,
	required: true,
	schema: { type: "string", pattern: "^ops_rcv_[0-9a-f-]{36}$" },
	description: "Recovery task aggregate id (`ops_rcv_*`).",
};

const incidentIdPath = {
	name: "incidentId",
	in: "path" as const,
	required: true,
	schema: { type: "string", pattern: "^ops_inc_[0-9a-f-]{36}$" },
	description: "Incident aggregate id (`ops_inc_*`).",
};

const recoveryStepKindProperty = {
	type: "string",
	enum: [
		"VALIDATE_SCHEMA",
		"CHECK_CHECKPOINT",
		"VERIFY_INTEGRITY",
		"RESTORE_DATABASE",
		"REPLAY_OUTBOX",
		"REBUILD_PROJECTION",
		"PURGE_QUEUE",
	],
};

const expectedRevisionBody = {
	type: "object",
	additionalProperties: false,
	required: ["expectedRevision"],
	properties: {
		expectedRevision: { type: "integer", minimum: 1 },
	},
};

const incidentSeverityProperty = {
	type: "string",
	enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
};

const incidentStatusProperty = {
	type: "string",
	enum: [
		"OPEN",
		"ACKNOWLEDGED",
		"INVESTIGATING",
		"MITIGATING",
		"ESCALATED",
		"RESOLVED",
		"CLOSED",
	],
};

const incidentSnapshotOpenApiSchema = {
	type: "object",
	additionalProperties: false,
	required: [
		"incidentId",
		"organizationId",
		"title",
		"description",
		"severity",
		"status",
		"serviceId",
		"openedAt",
		"revision",
		"runbookId",
		"runbookVersion",
		"runbookAttachedAt",
		"responsiblePrincipalId",
		"resolvedAt",
		"closedAt",
	],
	properties: {
		incidentId: {
			type: "string",
			pattern: "^ops_inc_[0-9a-f-]{36}$",
		},
		organizationId: UUID,
		title: { type: "string", minLength: 1, maxLength: 256 },
		description: { type: "string", maxLength: 4096, nullable: true },
		severity: incidentSeverityProperty,
		status: incidentStatusProperty,
		serviceId: { type: "string", maxLength: 128, nullable: true },
		openedAt: { type: "string", format: "date-time" },
		revision: { type: "integer", minimum: 1 },
		runbookId: {
			type: "string",
			pattern: "^ops_rnb_[0-9a-f-]{36}$",
			nullable: true,
		},
		runbookVersion: { type: "string", maxLength: 64, nullable: true },
		runbookAttachedAt: { type: "string", format: "date-time", nullable: true },
		responsiblePrincipalId: { ...UUID, nullable: true },
		resolvedAt: { type: "string", format: "date-time", nullable: true },
		closedAt: { type: "string", format: "date-time", nullable: true },
	},
};

const recoveryTaskSnapshotSchema = {
	type: "object",
	additionalProperties: false,
	required: [
		"recoveryTaskId",
		"organizationId",
		"incidentId",
		"stepKind",
		"status",
		"stepRequiresApproval",
		"hasRequiredApproval",
		"startedAt",
		"revision",
		"initiatedByPrincipalId",
	],
	properties: {
		recoveryTaskId: {
			type: "string",
			pattern: "^ops_rcv_[0-9a-f-]{36}$",
		},
		organizationId: UUID,
		incidentId: {
			type: "string",
			pattern: "^ops_inc_[0-9a-f-]{36}$",
		},
		stepKind: recoveryStepKindProperty,
		status: {
			type: "string",
			enum: [
				"PENDING",
				"AWAITING_APPROVAL",
				"APPROVED",
				"IN_PROGRESS",
				"COMPLETED",
				"FAILED",
				"CANCELLED",
			],
		},
		stepRequiresApproval: { type: "boolean" },
		hasRequiredApproval: { type: "boolean" },
		startedAt: { type: "string", format: "date-time" },
		revision: { type: "integer", minimum: 1 },
		initiatedByPrincipalId: { ...UUID, nullable: true },
	},
};

export const operationsOpenApi = {
	getPlatformHealth: op({
		tag: "Operations",
		operationId: "getPlatformHealth",
		summary: "Platform health probe",
		description:
			"Module: operations. PLATFORM-scoped health (postgres/nats/neo4j) with source/checkedAt/stale. Requires active `console.platform` grant. Does not return agency tenant data.",
		security: COOKIE_SECURITY,
		responses: {
			"200": {
				description: "Platform infrastructure health snapshot.",
				content: {
					"application/json": {
						schema: {
							type: "object",
							additionalProperties: false,
							required: ["source", "checkedAt", "stale", "deps"],
							properties: {
								source: { type: "string", const: "probeHealthDeps" },
								checkedAt: { type: "string", format: "date-time" },
								stale: { type: "boolean" },
								deps: {
									type: "object",
									additionalProperties: false,
									required: ["postgres", "nats", "neo4j"],
									properties: {
										postgres: { type: "string", enum: ["ok", "error"] },
										nats: { type: "string", enum: ["ok", "error"] },
										neo4j: { type: "string", enum: ["ok", "error"] },
									},
								},
							},
						},
					},
				},
			},
			...ERROR_RESPONSES,
		},
	}),
	listPlatformIncidents: op({
		tag: "Operations",
		operationId: "listPlatformIncidents",
		summary: "List platform incidents",
		description:
			"Module: operations. PLATFORM incident collection. Does not list agency incidents (no tenant leak). Requires `console.platform` grant. Empty array is the honest ledger while incidents remain agency-scoped.",
		security: COOKIE_SECURITY,
		responses: {
			"200": {
				description: "Platform incidents (never agency rows).",
				content: {
					"application/json": {
						schema: {
							type: "object",
							additionalProperties: false,
							required: ["incidents"],
							properties: {
								incidents: {
									type: "array",
									maxItems: 0,
									items: incidentSnapshotOpenApiSchema,
								},
							},
						},
					},
				},
			},
			...ERROR_RESPONSES,
		},
	}),
	listPlatformRuntimes: op({
		tag: "Operations",
		operationId: "listPlatformRuntimes",
		summary: "List platform runtimes",
		description:
			"Module: operations. PLATFORM runtime/quota collection. Requires `console.platform` grant. Empty array is the honest ledger until a platform runtime store exists. Never copies Agency metrics.",
		security: COOKIE_SECURITY,
		responses: {
			"200": {
				description: "Platform runtimes (never agency rows).",
				content: {
					"application/json": {
						schema: {
							type: "object",
							additionalProperties: false,
							required: ["runtimes"],
							properties: {
								runtimes: {
									type: "array",
									maxItems: 0,
									items: { type: "object" },
								},
							},
						},
					},
				},
			},
			...ERROR_RESPONSES,
		},
	}),
	listPlatformRecovery: op({
		tag: "Operations",
		operationId: "listPlatformRecovery",
		summary: "List platform recovery tasks",
		description:
			"Module: operations. PLATFORM recovery collection. Requires `console.platform` grant. Does not list agency recovery-tasks. Empty array is honest; this console does not execute break-glass.",
		security: COOKIE_SECURITY,
		responses: {
			"200": {
				description: "Platform recovery tasks (never agency rows).",
				content: {
					"application/json": {
						schema: {
							type: "object",
							additionalProperties: false,
							required: ["recoveryTasks"],
							properties: {
								recoveryTasks: {
									type: "array",
									maxItems: 0,
									items: { type: "object" },
								},
							},
						},
					},
				},
			},
			...ERROR_RESPONSES,
		},
	}),
	listIncidents: op({
		tag: "Operations",
		operationId: "listIncidents",
		summary: "List incidents",
		description:
			"Module: operations. Lists incidents for the agency ordered by openedAt descending. Active agency membership required.",
		security: COOKIE_SECURITY,
		parameters: [...agencyParams],
		responses: {
			"200": {
				description: "Incidents ordered by openedAt descending.",
				content: {
					"application/json": {
						schema: {
							type: "object",
							additionalProperties: false,
							required: ["incidents"],
							properties: {
								incidents: {
									type: "array",
									items: incidentSnapshotOpenApiSchema,
								},
							},
						},
					},
				},
			},
			...ERROR_RESPONSES,
		},
	}),
	getIncident: op({
		tag: "Operations",
		operationId: "getIncident",
		summary: "Get incident",
		description:
			"Module: operations. Returns an incident snapshot scoped to the agency. Active agency membership required.",
		security: COOKIE_SECURITY,
		parameters: [...agencyParams, incidentIdPath],
		responses: {
			"200": {
				description: "Incident snapshot.",
				content: {
					"application/json": {
						schema: incidentSnapshotOpenApiSchema,
					},
				},
			},
			...ERROR_RESPONSES,
		},
	}),
	openIncident: op({
		tag: "Operations",
		operationId: "openIncident",
		summary: "Open incident",
		description:
			"Module: operations. Opens a new incident for the agency. Idempotent via `Idempotency-Key`. Requires operator+ agency role.",
		security: COOKIE_SECURITY,
		parameters: [...commandParams],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["title", "severity"],
				properties: {
					title: { type: "string", minLength: 1, maxLength: 256 },
					description: { type: "string", maxLength: 4096 },
					severity: incidentSeverityProperty,
					serviceId: { type: "string", minLength: 1, maxLength: 128 },
				},
			},
			"Incident title, severity and optional context.",
		),
		responses: {
			"200": { description: "Command result with incidentId." },
			...ERROR_RESPONSES,
		},
	}),
	transitionIncidentStatus: op({
		tag: "Operations",
		operationId: "transitionIncidentStatus",
		summary: "Transition incident status",
		description:
			"Module: operations. Transitions an incident through the lifecycle. Optimistic revision required.",
		security: COOKIE_SECURITY,
		parameters: [...commandParams, incidentIdPath],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["expectedRevision", "targetStatus"],
				properties: {
					expectedRevision: { type: "integer", minimum: 1 },
					targetStatus: incidentStatusProperty,
					reason: { type: "string", maxLength: 1024 },
				},
			},
			"Target status with expected revision.",
		),
		responses: {
			"200": { description: "Command result after status transition." },
			...ERROR_RESPONSES,
		},
	}),
	attachIncidentRunbook: op({
		tag: "Operations",
		operationId: "attachIncidentRunbook",
		summary: "Attach runbook to incident",
		description:
			"Module: operations. Attaches a versioned runbook to an incident. Responsible principal is taken from the session.",
		security: COOKIE_SECURITY,
		parameters: [...commandParams, incidentIdPath],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["expectedRevision", "runbookId", "runbookVersion"],
				properties: {
					expectedRevision: { type: "integer", minimum: 1 },
					runbookId: {
						type: "string",
						pattern: "^ops_rnb_[0-9a-f-]{36}$",
					},
					runbookVersion: { type: "string", minLength: 1, maxLength: 64 },
					evidence: { type: "string", maxLength: 4096 },
				},
			},
			"Runbook reference with expected revision.",
		),
		responses: {
			"200": { description: "Command result after runbook attachment." },
			...ERROR_RESPONSES,
		},
	}),
	getRecoveryTask: op({
		tag: "Operations",
		operationId: "getRecoveryTask",
		summary: "Get recovery task",
		description:
			"Module: operations. Returns a recovery task snapshot scoped to the agency. Active agency membership required.",
		security: COOKIE_SECURITY,
		parameters: [...agencyParams, recoveryTaskIdPath],
		responses: {
			"200": {
				description: "Recovery task snapshot.",
			},
			...ERROR_RESPONSES,
		},
	}),
	listRecoveryTasksByIncident: op({
		tag: "Operations",
		operationId: "listRecoveryTasksByIncident",
		summary: "List recovery tasks for incident",
		description:
			"Module: operations. Lists recovery tasks linked to an incident within the agency. Active agency membership required.",
		security: COOKIE_SECURITY,
		parameters: [...agencyParams, incidentIdPath],
		responses: {
			"200": {
				description: "Recovery tasks ordered by startedAt ascending.",
			},
			...ERROR_RESPONSES,
		},
	}),
	startRecoveryTask: op({
		tag: "Operations",
		operationId: "startRecoveryTask",
		summary: "Start recovery task for incident",
		description:
			"Module: operations. Starts a deterministic recovery step linked to an incident. Idempotent via `Idempotency-Key`. Requires operator+ agency role.",
		security: COOKIE_SECURITY,
		parameters: [...commandParams, incidentIdPath],
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["stepKind"],
				properties: {
					stepKind: recoveryStepKindProperty,
					hasRequiredApproval: { type: "boolean" },
				},
			},
			"Recovery step kind and optional approval override.",
		),
		responses: {
			"200": { description: "Command result with recoveryTaskId." },
			...ERROR_RESPONSES,
		},
	}),
	approveRecoveryTask: op({
		tag: "Operations",
		operationId: "approveRecoveryTask",
		summary: "Approve recovery task",
		description:
			"Module: operations. Approves a recovery task awaiting approval. Optimistic revision required.",
		security: COOKIE_SECURITY,
		parameters: [...commandParams, recoveryTaskIdPath],
		requestBody: jsonBody(expectedRevisionBody, "Expected revision."),
		responses: {
			"200": { description: "Command result after approval." },
			...ERROR_RESPONSES,
		},
	}),
	startRecoveryTaskExecution: op({
		tag: "Operations",
		operationId: "startRecoveryTaskExecution",
		summary: "Start recovery task execution",
		description:
			"Module: operations. Transitions an approved recovery task to IN_PROGRESS.",
		security: COOKIE_SECURITY,
		parameters: [...commandParams, recoveryTaskIdPath],
		requestBody: jsonBody(expectedRevisionBody, "Expected revision."),
		responses: {
			"200": { description: "Command result after execution start." },
			...ERROR_RESPONSES,
		},
	}),
	completeRecoveryTask: op({
		tag: "Operations",
		operationId: "completeRecoveryTask",
		summary: "Complete recovery task",
		description:
			"Module: operations. Marks an in-progress recovery task as COMPLETED.",
		security: COOKIE_SECURITY,
		parameters: [...commandParams, recoveryTaskIdPath],
		requestBody: jsonBody(expectedRevisionBody, "Expected revision."),
		responses: {
			"200": { description: "Command result after completion." },
			...ERROR_RESPONSES,
		},
	}),
	failRecoveryTask: op({
		tag: "Operations",
		operationId: "failRecoveryTask",
		summary: "Fail recovery task",
		description:
			"Module: operations. Marks a recovery task as FAILED from an allowed source status.",
		security: COOKIE_SECURITY,
		parameters: [...commandParams, recoveryTaskIdPath],
		requestBody: jsonBody(
			{
				...expectedRevisionBody,
				properties: {
					...expectedRevisionBody.properties,
					failureReason: { type: "string", maxLength: 4096 },
				},
			},
			"Expected revision and optional failure reason.",
		),
		responses: {
			"200": { description: "Command result after failure." },
			...ERROR_RESPONSES,
		},
	}),
	cancelRecoveryTask: op({
		tag: "Operations",
		operationId: "cancelRecoveryTask",
		summary: "Cancel recovery task",
		description: "Module: operations. Cancels a non-terminal recovery task.",
		security: COOKIE_SECURITY,
		parameters: [...commandParams, recoveryTaskIdPath],
		requestBody: jsonBody(
			{
				...expectedRevisionBody,
				properties: {
					...expectedRevisionBody.properties,
					cancelReason: { type: "string", maxLength: 4096 },
				},
			},
			"Expected revision and optional cancel reason.",
		),
		responses: {
			"200": { description: "Command result after cancellation." },
			...ERROR_RESPONSES,
		},
	}),
} as const;

const outcomeSnapshotIdPath = {
	name: "outcomeSnapshotId",
	in: "path" as const,
	required: true,
	schema: { type: "string", pattern: "^perf_out_[0-9a-f-]{36}$" },
	description: "Outcome snapshot id (`perf_out_*`).",
};

const positionExposureSnapshotIdPath = {
	name: "positionExposureSnapshotId",
	in: "path" as const,
	required: true,
	schema: { type: "string", pattern: "^perf_pes_[0-9a-f-]{36}$" },
	description: "Position exposure snapshot id (`perf_pes_*`).",
};

const outcomeSnapshotOpenApiSchema: JsonSchema = {
	type: "object",
	additionalProperties: false,
	required: [
		"outcomeSnapshotId",
		"organizationId",
		"journalEntryId",
		"valueDate",
		"linesSummary",
		"recordedAt",
	],
	properties: {
		outcomeSnapshotId: outcomeSnapshotIdPath.schema,
		organizationId: UUID,
		journalEntryId: { type: "string" },
		valueDate: { type: "string" },
		linesSummary: { type: "array", items: { type: "object" } },
		recordedAt: { type: "string", format: "date-time" },
	},
};

const positionExposureSnapshotOpenApiSchema: JsonSchema = {
	type: "object",
	additionalProperties: false,
	required: [
		"positionExposureSnapshotId",
		"organizationId",
		"portfolioId",
		"positionId",
		"revision",
		"instrumentId",
		"positionSide",
		"book",
		"quantity",
		"fillId",
		"side",
		"provisionalCash",
		"observedAt",
	],
	properties: {
		positionExposureSnapshotId: positionExposureSnapshotIdPath.schema,
		organizationId: UUID,
		portfolioId: { type: "string" },
		positionId: { type: "string" },
		revision: { type: "integer", minimum: 1 },
		instrumentId: { type: "string" },
		positionSide: { type: "string" },
		book: { type: "string" },
		quantity: { type: "string" },
		fillId: { type: "string" },
		side: { type: "string" },
		provisionalCash: { type: "boolean" },
		observedAt: { type: "string", format: "date-time" },
	},
};

const metricSeriesItemOpenApiSchema: JsonSchema = {
	type: "object",
	additionalProperties: false,
	required: [
		"metricSeriesId",
		"organizationId",
		"metricName",
		"metricValue",
		"observedAt",
	],
	properties: {
		metricSeriesId: {
			type: "string",
			pattern: "^perf_mtr_[0-9a-f-]{36}$",
		},
		organizationId: UUID,
		outcomeSnapshotId: outcomeSnapshotIdPath.schema,
		positionExposureSnapshotId: positionExposureSnapshotIdPath.schema,
		metricName: { type: "string" },
		metricValue: { type: "string" },
		observedAt: { type: "string", format: "date-time" },
	},
};

export const performanceOpenApi = {
	listOutcomeSnapshots: op({
		tag: "Performance",
		operationId: "listOutcomeSnapshots",
		summary: "List outcome snapshots",
		description:
			"Module: performance. Lists ledger-derived outcome snapshots for the agency ordered by recordedAt descending. Optional journalEntryId filter. Active agency membership required.",
		security: COOKIE_SECURITY,
		parameters: [
			...agencyParams,
			{
				name: "journalEntryId",
				in: "query",
				required: false,
				schema: { type: "string", minLength: 1 },
				description: "Filter by accounting journal entry id.",
			},
			{
				name: "limit",
				in: "query",
				required: false,
				schema: { type: "integer", minimum: 1, maximum: 100 },
				description: "Maximum rows to return (default 50).",
			},
		],
		responses: {
			"200": {
				description: "Outcome snapshots for the agency.",
				content: {
					"application/json": {
						schema: {
							type: "object",
							additionalProperties: false,
							required: ["outcomeSnapshots"],
							properties: {
								outcomeSnapshots: {
									type: "array",
									items: outcomeSnapshotOpenApiSchema,
								},
							},
						},
					},
				},
			},
			...ERROR_RESPONSES,
		},
	}),
	getOutcomeSnapshot: op({
		tag: "Performance",
		operationId: "getOutcomeSnapshot",
		summary: "Get outcome snapshot",
		description:
			"Module: performance. Returns a single outcome snapshot scoped to the agency.",
		security: COOKIE_SECURITY,
		parameters: [...agencyParams, outcomeSnapshotIdPath],
		responses: {
			"200": {
				description: "Outcome snapshot.",
				content: {
					"application/json": {
						schema: outcomeSnapshotOpenApiSchema,
					},
				},
			},
			...ERROR_RESPONSES,
		},
	}),
	listOutcomeSnapshotMetrics: op({
		tag: "Performance",
		operationId: "listOutcomeSnapshotMetrics",
		summary: "List derived metrics for outcome snapshot",
		description:
			"Module: performance. Returns derived P&L metric series rows for the outcome snapshot.",
		security: COOKIE_SECURITY,
		parameters: [...agencyParams, outcomeSnapshotIdPath],
		responses: {
			"200": {
				description: "Derived metric series for the outcome snapshot.",
				content: {
					"application/json": {
						schema: {
							type: "object",
							additionalProperties: false,
							required: ["metrics"],
							properties: {
								metrics: {
									type: "array",
									items: metricSeriesItemOpenApiSchema,
								},
							},
						},
					},
				},
			},
			...ERROR_RESPONSES,
		},
	}),
	listPositionExposureSnapshots: op({
		tag: "Performance",
		operationId: "listPositionExposureSnapshots",
		summary: "List position exposure snapshots",
		description:
			"Module: performance. Lists position exposure snapshots for the agency with optional portfolioId and positionId filters.",
		security: COOKIE_SECURITY,
		parameters: [
			...agencyParams,
			{
				name: "portfolioId",
				in: "query",
				required: false,
				schema: { type: "string", minLength: 1 },
			},
			{
				name: "positionId",
				in: "query",
				required: false,
				schema: { type: "string", minLength: 1 },
			},
			{
				name: "limit",
				in: "query",
				required: false,
				schema: { type: "integer", minimum: 1, maximum: 100 },
			},
		],
		responses: {
			"200": {
				description: "Position exposure snapshots for the agency.",
				content: {
					"application/json": {
						schema: {
							type: "object",
							additionalProperties: false,
							required: ["positionExposureSnapshots"],
							properties: {
								positionExposureSnapshots: {
									type: "array",
									items: positionExposureSnapshotOpenApiSchema,
								},
							},
						},
					},
				},
			},
			...ERROR_RESPONSES,
		},
	}),
	getPositionExposureSnapshot: op({
		tag: "Performance",
		operationId: "getPositionExposureSnapshot",
		summary: "Get position exposure snapshot",
		description:
			"Module: performance. Returns a single position exposure snapshot scoped to the agency.",
		security: COOKIE_SECURITY,
		parameters: [...agencyParams, positionExposureSnapshotIdPath],
		responses: {
			"200": {
				description: "Position exposure snapshot.",
				content: {
					"application/json": {
						schema: positionExposureSnapshotOpenApiSchema,
					},
				},
			},
			...ERROR_RESPONSES,
		},
	}),
	listPositionExposureSnapshotMetrics: op({
		tag: "Performance",
		operationId: "listPositionExposureSnapshotMetrics",
		summary: "List derived metrics for position exposure snapshot",
		description:
			"Module: performance. Returns derived exposure metric series rows for the position exposure snapshot.",
		security: COOKIE_SECURITY,
		parameters: [...agencyParams, positionExposureSnapshotIdPath],
		responses: {
			"200": {
				description:
					"Derived metric series for the position exposure snapshot.",
				content: {
					"application/json": {
						schema: {
							type: "object",
							additionalProperties: false,
							required: ["metrics"],
							properties: {
								metrics: {
									type: "array",
									items: metricSeriesItemOpenApiSchema,
								},
							},
						},
					},
				},
			},
			...ERROR_RESPONSES,
		},
	}),
} as const;

export const portfoliosOpenApi = {
	listAgencyPortfolios: op({
		tag: "Portfolios",
		operationId: "listAgencyPortfolios",
		summary: "List agency portfolio overview",
		description:
			"Module: portfolios. Lists portfolios for the agency (`organizationId` = `agencyId`) with position counts and latest valuation snapshot when present. Membership required. ANX-153 S1–S4 + ANX-164 slice 6.",
		security: COOKIE_SECURITY,
		parameters: agencyParams,
		responses: {
			"200": { description: "Portfolio overview collection for the agency." },
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

const simulationRunIdPath = {
	name: "simulationRunId",
	in: "path" as const,
	required: true,
	schema: { type: "string", pattern: "^sim_run_[0-9a-f-]{36}$" },
	description: "Simulation run id (`sim_run_*`).",
};

const simulationRunOpenApiSchema: JsonSchema = {
	type: "object",
	additionalProperties: false,
	required: [
		"simulationRunId",
		"organizationId",
		"executionMode",
		"status",
		"isolationFlags",
		"revision",
		"startedAt",
	],
	properties: {
		simulationRunId: simulationRunIdPath.schema,
		organizationId: UUID,
		manifestId: { type: "string", nullable: true },
		strategyId: { type: "string", nullable: true },
		strategyVersionId: { type: "string", nullable: true },
		backtestRequestId: {
			type: "string",
			pattern: "^st_btr_[0-9a-f-]{36}$",
			nullable: true,
		},
		executionMode: { type: "string", enum: ["SIMULATED"] },
		status: { type: "string", enum: ["STARTED", "COMPLETED", "FAILED"] },
		scenarioLabel: { type: "string", nullable: true },
		isolationFlags: { type: "object" },
		seedHash: { type: "string", nullable: true },
		resultRef: { type: "string", nullable: true },
		revision: { type: "integer", minimum: 1 },
		startedAt: { type: "string", format: "date-time" },
		completedAt: { type: "string", format: "date-time", nullable: true },
		failedAt: { type: "string", format: "date-time", nullable: true },
		failureCode: { type: "string", nullable: true },
	},
};

const simulationRunSnapshotOpenApiSchema: JsonSchema = {
	type: "object",
	additionalProperties: false,
	required: ["snapshotId", "simulationRunId", "organizationId", "datasetHash"],
	properties: {
		snapshotId: {
			type: "string",
			pattern: "^sim_snap_[0-9a-f-]{36}$",
		},
		simulationRunId: simulationRunIdPath.schema,
		organizationId: UUID,
		datasetRef: { type: "string", nullable: true },
		datasetHash: { type: "string" },
		snapshotPayload: { type: "object", nullable: true },
	},
};

export const simulationOpenApi = {
	listSimulationRuns: op({
		tag: "Simulation",
		operationId: "listSimulationRuns",
		summary: "List simulation runs",
		description:
			"Module: simulation. Lists isolated scenario runs for the agency ordered by startedAt descending. Optional status, backtestRequestId and strategyId filters. Active agency membership required. Run creation is event-driven (no HTTP POST).",
		security: COOKIE_SECURITY,
		parameters: [
			...agencyParams,
			{
				name: "status",
				in: "query",
				required: false,
				schema: { type: "string", enum: ["STARTED", "COMPLETED", "FAILED"] },
			},
			{
				name: "backtestRequestId",
				in: "query",
				required: false,
				schema: { type: "string", pattern: "^st_btr_[0-9a-f-]{36}$" },
			},
			{
				name: "strategyId",
				in: "query",
				required: false,
				schema: { type: "string", minLength: 1, maxLength: 128 },
			},
			{
				name: "limit",
				in: "query",
				required: false,
				schema: { type: "integer", minimum: 1, maximum: 100 },
				description: "Maximum rows to return (default 50).",
			},
		],
		responses: {
			"200": {
				description: "Simulation runs for the agency.",
				content: {
					"application/json": {
						schema: {
							type: "object",
							additionalProperties: false,
							required: ["simulationRuns"],
							properties: {
								simulationRuns: {
									type: "array",
									items: simulationRunOpenApiSchema,
								},
							},
						},
					},
				},
			},
			...ERROR_RESPONSES,
		},
	}),
	getSimulationRun: op({
		tag: "Simulation",
		operationId: "getSimulationRun",
		summary: "Get simulation run",
		description:
			"Module: simulation. Returns a single simulation run scoped to the agency.",
		security: COOKIE_SECURITY,
		parameters: [...agencyParams, simulationRunIdPath],
		responses: {
			"200": {
				description: "Simulation run.",
				content: {
					"application/json": {
						schema: simulationRunOpenApiSchema,
					},
				},
			},
			...ERROR_RESPONSES,
		},
	}),
	getSimulationRunSnapshot: op({
		tag: "Simulation",
		operationId: "getSimulationRunSnapshot",
		summary: "Get simulation run snapshot",
		description:
			"Module: simulation. Returns the result snapshot for a completed simulation run (payload from sandbox execution).",
		security: COOKIE_SECURITY,
		parameters: [...agencyParams, simulationRunIdPath],
		responses: {
			"200": {
				description: "Simulation run snapshot.",
				content: {
					"application/json": {
						schema: simulationRunSnapshotOpenApiSchema,
					},
				},
			},
			...ERROR_RESPONSES,
		},
	}),
} as const;

export const executionOpenApi = {
	listOrders: op({
		tag: "Execution",
		operationId: "listExecutionOrders",
		summary: "List open execution orders",
		description:
			"Module: execution. Lists open orders (SUBMITTED or PARTIALLY_FILLED) for the agency ordered by submittedAt descending. Active agency membership required.",
		security: COOKIE_SECURITY,
		parameters: [
			...agencyParams,
			{
				name: "limit",
				in: "query",
				required: false,
				schema: { type: "integer", minimum: 1, maximum: 100 },
				description: "Maximum rows to return (default 50).",
			},
		],
		responses: {
			"200": {
				description: "Open orders for the agency.",
				content: {
					"application/json": {
						schema: {
							type: "object",
							additionalProperties: false,
							required: ["orders"],
							properties: {
								orders: { type: "array", items: { type: "object" } },
							},
						},
					},
				},
			},
			...ERROR_RESPONSES,
		},
	}),
	listReconciliationCases: op({
		tag: "Execution",
		operationId: "listExecutionReconciliationCases",
		summary: "List venue reconciliation cases",
		description:
			"Module: execution. Lists venue reconciliation cases for the agency ordered by openedAt descending.",
		security: COOKIE_SECURITY,
		parameters: [
			...agencyParams,
			{
				name: "limit",
				in: "query",
				required: false,
				schema: { type: "integer", minimum: 1, maximum: 100 },
				description: "Maximum rows to return (default 50).",
			},
		],
		responses: {
			"200": {
				description: "Reconciliation cases for the agency.",
				content: {
					"application/json": {
						schema: {
							type: "object",
							additionalProperties: false,
							required: ["reconciliationCases"],
							properties: {
								reconciliationCases: {
									type: "array",
									items: { type: "object" },
								},
							},
						},
					},
				},
			},
			...ERROR_RESPONSES,
		},
	}),
} as const;

export const riskOpenApi = {
	getKillSwitchStatus: op({
		tag: "Risk",
		operationId: "getKillSwitchStatus",
		summary: "Get organization kill switch status",
		description:
			"Module: risk. Returns organization-scope kill switch status for the agency. Active agency membership required.",
		security: COOKIE_SECURITY,
		parameters: agencyParams,
		responses: {
			"200": {
				description: "Kill switch status envelope.",
				content: {
					"application/json": {
						schema: {
							type: "object",
							additionalProperties: false,
							required: ["status"],
							properties: { status: { type: "object" } },
						},
					},
				},
			},
			...ERROR_RESPONSES,
		},
	}),
	activateKillSwitch: op({
		tag: "Risk",
		operationId: "activateKillSwitch",
		summary: "Activate kill switch",
		description:
			"Module: risk. Activates organization or portfolio kill switch. `activatedBy` is taken from the session principal, not the request body. Requires agency mutation role and Idempotency-Key.",
		security: COOKIE_SECURITY,
		parameters: commandParams,
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["reason"],
				properties: {
					reason: { type: "string", minLength: 1, maxLength: 512 },
					scope: { type: "string", enum: ["ORGANIZATION", "PORTFOLIO"] },
					portfolioId: { type: "string", minLength: 1 },
				},
			},
			"Kill switch activation payload. Principal identity is session-bound.",
		),
		responses: {
			"200": { description: "Command result after activation." },
			...ERROR_RESPONSES,
		},
	}),
	releaseKillSwitch: op({
		tag: "Risk",
		operationId: "releaseKillSwitch",
		summary: "Release kill switch",
		description:
			"Module: risk. Releases organization or portfolio kill switch. `releasedBy` is taken from the session principal, not the request body. Requires agency mutation role and Idempotency-Key.",
		security: COOKIE_SECURITY,
		parameters: commandParams,
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				properties: {
					scope: { type: "string", enum: ["ORGANIZATION", "PORTFOLIO"] },
					portfolioId: { type: "string", minLength: 1 },
				},
			},
			"Kill switch release payload. Principal identity is session-bound.",
		),
		responses: {
			"200": { description: "Command result after release." },
			...ERROR_RESPONSES,
		},
	}),
} as const;

export const evaluationOpenApi = {
	getCertificationBySubject: op({
		tag: "Evaluation",
		operationId: "getCertificationBySubject",
		summary: "Get issued certification by strategy subject",
		description:
			"Module: evaluation. Returns the active issued certification for a strategy version and optional policy hash. Active agency membership required.",
		security: COOKIE_SECURITY,
		parameters: [
			...agencyParams,
			{
				name: "strategyId",
				in: "query",
				required: true,
				schema: { type: "string", pattern: "^st_str_[0-9a-f-]{36}$" },
			},
			{
				name: "strategyVersionId",
				in: "query",
				required: true,
				schema: { type: "string", pattern: "^st_ver_[0-9a-f-]{36}$" },
			},
			{
				name: "policyHash",
				in: "query",
				required: false,
				schema: { type: "string", pattern: "^[a-f0-9]{64}$" },
			},
		],
		responses: {
			"200": { description: "Issued certification envelope." },
			...ERROR_RESPONSES,
		},
	}),
	getEvaluationRecord: op({
		tag: "Evaluation",
		operationId: "getEvaluationRecord",
		summary: "Get evaluation record",
		description:
			"Module: evaluation. Returns an evaluation record by id for the agency. Active agency membership required.",
		security: COOKIE_SECURITY,
		parameters: [
			...agencyParams,
			{
				name: "evaluationRecordId",
				in: "path",
				required: true,
				schema: { type: "string", pattern: "^evl_rec_[0-9a-f-]{36}$" },
			},
		],
		responses: {
			"200": { description: "Evaluation record envelope." },
			...ERROR_RESPONSES,
		},
	}),
	getEvaluationScore: op({
		tag: "Evaluation",
		operationId: "getEvaluationScore",
		summary: "Get evaluation score for record",
		description:
			"Module: evaluation. Returns the computed score for an evaluation record. Active agency membership required.",
		security: COOKIE_SECURITY,
		parameters: [
			...agencyParams,
			{
				name: "evaluationRecordId",
				in: "path",
				required: true,
				schema: { type: "string", pattern: "^evl_rec_[0-9a-f-]{36}$" },
			},
		],
		responses: {
			"200": { description: "Evaluation score envelope." },
			...ERROR_RESPONSES,
		},
	}),
	issueCertification: op({
		tag: "Evaluation",
		operationId: "issueCertification",
		summary: "Issue strategy version certification",
		description:
			"Module: evaluation. Issues a certification for an EVALUATED strategy version with a published scoring policy hash. Requires agency mutation role and Idempotency-Key.",
		security: COOKIE_SECURITY,
		parameters: commandParams,
		requestBody: jsonBody(
			{
				type: "object",
				additionalProperties: false,
				required: ["strategyId", "strategyVersionId", "policyHash"],
				properties: {
					strategyId: { type: "string", pattern: "^st_str_[0-9a-f-]{36}$" },
					strategyVersionId: {
						type: "string",
						pattern: "^st_ver_[0-9a-f-]{36}$",
					},
					evaluationRecordId: {
						type: "string",
						pattern: "^evl_rec_[0-9a-f-]{36}$",
					},
					policyHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
				},
			},
			"Issue certification payload. organizationId is taken from agencyId path param.",
		),
		responses: {
			"200": { description: "Command result after certification issue." },
			...ERROR_RESPONSES,
		},
	}),
} as const;

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
