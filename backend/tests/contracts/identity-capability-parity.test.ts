import { describe, expect, test } from "bun:test";
import { CAPABILITY_MANIFEST_V1_ENTRIES } from "@anxionos/contracts/capability-manifest";
import { Elysia } from "elysia";
import { createIdentityPlugin } from "../../apps/api/src/identity/plugin";

/**
 * Paridade rotas × catálogo de capabilities.
 *
 * Tanto o G2 quanto o G4 encontraram drift (rota implementada sem entrada no
 * catálogo, e entrada declarando grants diferentes do handler). Este teste
 * transforma essa classe de defeito em regressão: qualquer rota nova sem entrada
 * — ou entrada apontando para rota inexistente — falha aqui.
 */

function identityRoutes(): string[] {
	const app = new Elysia().use(createIdentityPlugin({} as never) as never);
	return app.routes
		.map((route) => route.path)
		.filter((path) => path.startsWith("/v1/identity"))
		.map((path) => path.replace(/:([A-Za-z0-9_]+)/g, "{$1}"))
		.sort();
}

function catalogSurfaceApis(): string[] {
	return CAPABILITY_MANIFEST_V1_ENTRIES.filter(
		(entry) => entry.ownerModule === "identity",
	)
		.map((entry) => entry.surfaces.api)
		.filter((api) => api.startsWith("/v1/identity"))
		.sort();
}

describe("identity capability catalog parity", () => {
	test("toda rota implementada tem entrada no catálogo", () => {
		const catalog = new Set(catalogSurfaceApis());
		const missing = identityRoutes().filter((route) => !catalog.has(route));
		expect(missing).toEqual([]);
	});

	test("toda entrada do catálogo aponta para rota existente", () => {
		const routes = new Set(identityRoutes());
		const dangling = catalogSurfaceApis().filter((api) => !routes.has(api));
		expect(dangling).toEqual([]);
	});

	test("as rotas declaradas em R04/D-IDN-030 estão de fato montadas", () => {
		const routes = identityRoutes();
		expect(routes).toEqual(
			[
				"/v1/identity/principals",
				"/v1/identity/principals/{principalId}",
				"/v1/identity/principals/{principalId}/revoke",
				"/v1/identity/principals/{principalId}/sessions",
				"/v1/identity/principals/{principalId}/suspend",
				"/v1/identity/sessions/revoked",
				"/v1/identity/sessions/revoke",
			].sort(),
		);
	});
});
