import { describe, expect, test } from "bun:test";
import { CAPABILITY_MANIFEST_V1_ENTRIES } from "@anxionos/contracts/capability-manifest";
import { Elysia } from "elysia";
import { createIdentityPlugin } from "../../apps/api/src/identity/plugin";
import { createOrganizationsPlugin } from "../../apps/api/src/organizations/plugin";

/**
 * Paridade rotas × catálogo de capabilities.
 *
 * O catálogo é o contrato que agentes e ferramentas leem: uma entrada apontando
 * para rota inexistente faz a tool call falhar, e uma rota sem entrada fica fora
 * do contrato canônico. Essa classe de defeito apareceu 6× em `organizations`
 * (G0 da ANX-460) e 3× em `identity` (pareceres G2/G4 da ANX-457) — este teste
 * a transforma em regressão.
 *
 * `governance` está fora porque ainda tem drift conhecido, rastreado em ANX-461
 * (6 entradas sem rota e 9 rotas sem entrada). Incluir o módulo aqui sem antes
 * alinhá-lo deixaria a suíte vermelha.
 */
const COVERED_MODULES = [
	{
		ownerModule: "identity",
		create: () => createIdentityPlugin({} as never),
	},
	{
		ownerModule: "organizations",
		create: () => createOrganizationsPlugin({} as never),
	},
] as const;

function routesOf(plugin: unknown): string[] {
	const app = new Elysia().use(plugin as never);
	return app.routes
		.map((route) => route.path)
		.filter((path) => path.startsWith("/v1"))
		.map((path) => path.replace(/:([A-Za-z0-9_]+)/g, "{$1}"))
		.sort();
}

function catalogApis(ownerModule: string): string[] {
	return CAPABILITY_MANIFEST_V1_ENTRIES.filter(
		(entry) => entry.ownerModule === ownerModule,
	)
		.map((entry) => entry.surfaces.api)
		.filter((api) => api.startsWith("/v1"))
		.sort();
}

describe("paridade rotas × catálogo de capabilities", () => {
	for (const { ownerModule, create } of COVERED_MODULES) {
		test(`${ownerModule}: toda entrada do catálogo aponta para rota existente`, () => {
			const routes = new Set(routesOf(create()));
			const dangling = catalogApis(ownerModule).filter(
				(api) => !routes.has(api),
			);
			expect(dangling).toEqual([]);
		});

		test(`${ownerModule}: toda rota montada tem entrada no catálogo`, () => {
			const catalog = new Set(catalogApis(ownerModule));
			const missing = routesOf(create()).filter((route) => !catalog.has(route));
			expect(missing).toEqual([]);
		});
	}
});
