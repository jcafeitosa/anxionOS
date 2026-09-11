import { openapi } from "@elysia/openapi";
import { Elysia } from "elysia";
import * as z from "zod";
import {
	OPENAPI_MODULE_TAG_GROUPS,
	OPENAPI_TAGS,
	plannedModuleOpenApiPaths,
} from "./openapi-baseline";
import {
	declaredOperationParameters,
	type OpenApiParameter,
} from "./openapi-operations";

const SCALAR_API_REFERENCE_VERSION = "1.68.0";
const OPENAPI_PATH = "/openapi";
const OPENAPI_SPEC_PATH = `${OPENAPI_PATH}/json`;

export const OPENAPI_INFO_TITLE = "anxionOS API";
export { OPENAPI_TAGS };

type ParameterLike = {
	name?: unknown;
	in?: unknown;
	[key: string]: unknown;
};

function isParameterLike(value: unknown): value is ParameterLike {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parameterKey(parameter: ParameterLike): string | undefined {
	if (typeof parameter.name !== "string" || typeof parameter.in !== "string") {
		return undefined;
	}
	return `${parameter.in}:${parameter.name}`;
}

/**
 * ANX-468 — causa-raiz: `@elysia/openapi@1.4.16` (`toOpenAPISchema`) monta
 * `operation` a partir de `detail` e, **sempre que deriva ao menos um parametro
 * da rota** (todo path com `:param`), reatribui `operation.parameters` com esse
 * conjunto derivado — descartando `detail.parameters` (headers de tenancy,
 * `Idempotency-Key`, `X-Request-Id`). Rotas sem path param nao derivam nada e
 * por isso mantinham os headers, o que mascarava o defeito como "so' identity".
 *
 * A correcao e' na raiz do gerador: restauramos os parametros **declarados**
 * (registro de `op()`, chaveado pelo `operationId` estavel) em toda operacao do
 * documento, preservando o objeto declarado (descricao + schema tipado) e
 * anexando somente parametros derivados que a declaracao nao cobre. Nenhuma
 * rota e' remendada individualmente e rotas futuras herdam o comportamento.
 */
function restoreDeclaredParameters(
	document: unknown,
	declared: ReadonlyMap<string, readonly OpenApiParameter[]>,
): unknown {
	if (typeof document !== "object" || document === null) {
		return document;
	}
	const paths = (document as { paths?: unknown }).paths;
	if (typeof paths !== "object" || paths === null) {
		return document;
	}
	for (const pathItem of Object.values(paths as Record<string, unknown>)) {
		if (typeof pathItem !== "object" || pathItem === null) {
			continue;
		}
		for (const operation of Object.values(
			pathItem as Record<string, unknown>,
		)) {
			if (typeof operation !== "object" || operation === null) {
				continue;
			}
			const operationId = (operation as { operationId?: unknown }).operationId;
			if (typeof operationId !== "string") {
				continue;
			}
			const declaredParameters = declared.get(operationId);
			if (!declaredParameters || declaredParameters.length === 0) {
				continue;
			}
			const generated = (operation as { parameters?: unknown }).parameters;
			const generatedList = Array.isArray(generated)
				? generated.filter(isParameterLike)
				: [];
			const restored: ParameterLike[] = [];
			const seen = new Set<string>();
			for (const parameter of declaredParameters) {
				const key = `${parameter.in}:${parameter.name}`;
				seen.add(key);
				// O objeto declarado vence o derivado pelo plugin: o derivado de
				// path param e' `{ type: "string" }` sem descricao, e o declarado
				// carrega descricao + schema tipado (UUID).
				restored.push({ ...parameter });
			}
			for (const parameter of generatedList) {
				const key = parameterKey(parameter);
				if (!key || seen.has(key)) {
					continue;
				}
				seen.add(key);
				restored.push(parameter);
			}
			(operation as { parameters?: unknown }).parameters = restored;
		}
	}
	return document;
}

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
	// Zod UUID fields (e.g. authorityToken, abortToken) appear in the public OpenAPI
	// schema via z.toJSONSchema — intentional for Scalar; values are not exposed.
	const plugin = openapi({
		path: OPENAPI_PATH,
		provider: "scalar",
		mapJsonSchema: {
			zod: z.toJSONSchema,
		},
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
	// ANX-468: a rota de spec do plugin e' reescrita depois dela, no mesmo
	// escopo, para servir o documento com os parametros declarados restaurados.
	// `plugin.handle` continua sendo a unica fonte do documento (metadata,
	// merge de `documentation.paths`, schemas) — nao ha segunda montagem para
	// divergir. O plugin ve as rotas do parent chain, entao a correcao cobre
	// todas as operacoes registradas depois deste `.use`.
	const composite = new Elysia({ name: "openapi-declared-parameters" }).use(
		plugin,
	);
	composite.get(
		OPENAPI_SPEC_PATH,
		async () => {
			const response = await plugin.handle(
				new Request(`http://127.0.0.1${OPENAPI_SPEC_PATH}`),
			);
			const document = await response.json();
			return restoreDeclaredParameters(document, declaredOperationParameters());
		},
		{ detail: { hide: true } },
	);
	return composite;
}

export function createOpenApiApp() {
	return new Elysia({ name: "openapi" }).use(createOpenApiPlugin());
}
