import { openapi } from "@elysia/openapi";
import { Elysia } from "elysia";
import {
	OPENAPI_MODULE_TAG_GROUPS,
	OPENAPI_TAGS,
	plannedModuleOpenApiPaths,
} from "./openapi-baseline";

const SCALAR_API_REFERENCE_VERSION = "1.68.0";

export const OPENAPI_INFO_TITLE = "anxionOS API";
export { OPENAPI_TAGS };

export function resolveOpenApiServerUrl(): string {
	const configured = process.env.BETTER_AUTH_URL?.trim();
	if (configured) {
		return configured.replace(/\/$/, "");
	}
	const port = process.env.PORT?.trim() || "3000";
	return `http://localhost:${port}`;
}

export function createOpenApiPlugin() {
	const serverUrl = resolveOpenApiServerUrl();
	const documentation = {
		info: {
			title: OPENAPI_INFO_TITLE,
			version: "0.1.0",
			description:
				"Composition root HTTP (Bun + Elysia). Sidebar grouped by the 23 baseline modules (ADR0002) plus Health/Realtime. Session cookie `better-auth.session_token`. Mutating commands require `Idempotency-Key`. Tags without a live handler are catalog placeholders (501 in the spec) — they do not register routes.",
			contact: {
				name: "anxionOS",
				url: "https://github.com/jcafeitosa/anxionOS",
			},
			license: {
				name: "MIT",
				url: "https://opensource.org/licenses/MIT",
			},
		},
		servers: [
			{
				url: serverUrl,
				description: "API base (BETTER_AUTH_URL or local PORT)",
			},
		],
		tags: [...OPENAPI_TAGS],
		"x-tagGroups": [...OPENAPI_MODULE_TAG_GROUPS],
		paths: plannedModuleOpenApiPaths(),
		components: {
			securitySchemes: {
				cookieAuth: {
					type: "apiKey" as const,
					in: "cookie" as const,
					name: "better-auth.session_token",
					description:
						"Better Auth session cookie set by POST /api/auth/sign-in/email.",
				},
			},
		},
	};
	return openapi({
		path: "/openapi",
		provider: "scalar",
		exclude: {
			methods: ["options", "head", "trace"],
		},
		documentation,
		scalar: {
			theme: "kepler",
			layout: "modern",
			darkMode: true,
			telemetry: false,
			documentDownloadType: "both",
			defaultOpenAllTags: false,
			defaultHttpClient: {
				targetKey: "js",
				clientKey: "fetch",
			},
			tagsSorter: "alpha",
			operationsSorter: "method",
			hiddenClients: ["jquery", "xhr", "httpie", "wget"],
			authentication: {
				preferredSecurityScheme: "cookieAuth",
			},
			metaData: {
				title: `${OPENAPI_INFO_TITLE} — OpenAPI`,
				description:
					"Interactive reference generated from the live Elysia app.",
			},
			agent: {
				disabled: true,
			},
			cdn: `https://cdn.jsdelivr.net/npm/@scalar/api-reference@${SCALAR_API_REFERENCE_VERSION}/dist/browser/standalone.min.js`,
			version: SCALAR_API_REFERENCE_VERSION,
		},
	});
}

export function createOpenApiApp() {
	return new Elysia({ name: "openapi" }).use(createOpenApiPlugin());
}
