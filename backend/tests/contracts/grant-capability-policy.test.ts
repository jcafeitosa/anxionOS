import { describe, expect, test } from "bun:test";
import {
	GRANT_CAPABILITY_CATALOG,
	isAdministrativeGrantCapability,
	isKnownGrantCapability,
	OWNER_AUTHORITY_CAPABILITIES,
	roleMayIssueGrantCapability,
	roleMayRevokeGrant,
} from "@anxionos/contracts/governance";

/**
 * ANX-466 — a politica de emissao e' declarada em contrato (nao inferida de
 * string livre). Estes testes fixam o catalogo e a matriz papel x classe.
 */
describe("grant capability policy (ANX-466)", () => {
	test("o catalogo cobre os tokens reais de grant do repositorio", () => {
		for (const capability of [
			"owner.read",
			"owner.write",
			"owner.manage",
			"identity.read",
			"identity.admin",
			"agents.publish",
			"agents.tools.invoke",
			"console.platform",
		]) {
			expect(GRANT_CAPABILITY_CATALOG).toContain(capability);
			expect(isKnownGrantCapability(capability)).toBe(true);
		}
	});

	test("string livre nao e' capability conhecida", () => {
		expect(isKnownGrantCapability("totally.unknown.capability")).toBe(false);
		expect(isKnownGrantCapability("identity.superadmin")).toBe(false);
	});

	/**
	 * G5 FURO 1: `hasOwnerAuthority` aceita QUALQUER um da lista de autoridade
	 * de owner; logo `owner.read` sozinho ja' e' autoridade administrativa.
	 */
	test("toda capability de autoridade de owner e' administrativa", () => {
		for (const capability of OWNER_AUTHORITY_CAPABILITIES) {
			expect(isKnownGrantCapability(capability)).toBe(true);
			expect(isAdministrativeGrantCapability(capability)).toBe(true);
		}
	});

	test("classe administrativa por exato e por prefixo declarado", () => {
		for (const capability of [
			"identity.read",
			"identity.admin",
			"owner.read",
			"owner.write",
			"owner.manage",
			"console.platform",
			"governance.delegate",
		]) {
			expect(isAdministrativeGrantCapability(capability)).toBe(true);
		}
		for (const capability of ["agents.publish", "agents.tools.invoke"]) {
			expect(isAdministrativeGrantCapability(capability)).toBe(false);
		}
	});

	test("operator so' emite capability operacional; owner/admin emitem as duas", () => {
		expect(roleMayIssueGrantCapability("operator", "agents.publish")).toBe(
			true,
		);
		expect(roleMayIssueGrantCapability("operator", "identity.admin")).toBe(
			false,
		);
		expect(roleMayIssueGrantCapability("operator", "owner.manage")).toBe(false);
		expect(roleMayIssueGrantCapability("operator", "owner.read")).toBe(false);
		expect(roleMayIssueGrantCapability("operator", "console.platform")).toBe(
			false,
		);
		for (const role of ["owner", "admin"] as const) {
			expect(roleMayIssueGrantCapability(role, "agents.publish")).toBe(true);
			expect(roleMayIssueGrantCapability(role, "identity.admin")).toBe(true);
			expect(roleMayIssueGrantCapability(role, "owner.manage")).toBe(true);
		}
	});
});

/**
 * ANX-469 — `governance.grant.revoke` = "owner ou issuer". A revogacao nao
 * limita o alvo apenas por papel: owner/admin revogam qualquer grant da
 * agencia, e os demais papeis so' o proprio grant, nunca acima da classe que
 * podem emitir.
 */
describe("grant revocation policy (ANX-469)", () => {
	test("owner/admin revogam qualquer grant da agencia", () => {
		for (const role of ["owner", "admin"] as const) {
			for (const capability of ["agents.publish", "identity.admin"]) {
				expect(
					roleMayRevokeGrant({
						role,
						capability,
						actorIsIssuer: false,
					}),
				).toBe(true);
			}
		}
	});

	test("nao-emissor fora de owner/admin nao revoga", () => {
		expect(
			roleMayRevokeGrant({
				role: "operator",
				capability: "agents.publish",
				actorIsIssuer: false,
			}),
		).toBe(false);
	});

	test("issuer operator revoga apenas a classe que pode emitir", () => {
		expect(
			roleMayRevokeGrant({
				role: "operator",
				capability: "agents.publish",
				actorIsIssuer: true,
			}),
		).toBe(true);
		expect(
			roleMayRevokeGrant({
				role: "operator",
				capability: "identity.admin",
				actorIsIssuer: true,
			}),
		).toBe(false);
		expect(
			roleMayRevokeGrant({
				role: "operator",
				capability: "owner.manage",
				actorIsIssuer: true,
			}),
		).toBe(false);
	});
});
