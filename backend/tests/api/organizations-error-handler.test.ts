import { describe, expect, test } from "bun:test";
import { transferOwnershipCommandSchema } from "@anxionos/contracts/organizations";
import { OrganizationCommandError } from "@anxionos/organizations";
import { mapOrganizationsError } from "../../apps/api/src/organizations/error-handler";

/**
 * S2 (ANX-460) — o boundary HTTP usa `mapOrganizationsError`; o reuso divergente
 * de `Idempotency-Key` precisa chegar ao cliente como 409 institucional, com o
 * codigo do modulo em `details.code`.
 */
describe("organizations error handler (S2/ANX-460)", () => {
	test("maps ORG_DUPLICATE_IDEMPOTENCY to 409", () => {
		const error = new OrganizationCommandError(
			"ORG_DUPLICATE_IDEMPOTENCY",
			"Idempotency key was already applied with a different payload",
		);
		expect(error.statusCode).toBe(409);
		const mapped = mapOrganizationsError(error, "req-anx-460");
		expect(mapped.status).toBe(409);
		expect(mapped.body.error.code).toBe("CONFLICT");
		expect(mapped.body.error.details).toEqual({
			code: "ORG_DUPLICATE_IDEMPOTENCY",
		});
		expect(mapped.body.error.requestId).toBe("req-anx-460");
	});

	test("maps ORG_REVISION_CONFLICT to 409 (S4a/S4c)", () => {
		// O perdedor de uma corrida de revisao (Membership ou Agency) precisa ver
		// 409 institucional, nunca 500 como acontecia com o erro cru de dominio.
		const error = new OrganizationCommandError(
			"ORG_REVISION_CONFLICT",
			"Resource was modified concurrently; reload and retry",
		);
		expect(error.statusCode).toBe(409);
		const mapped = mapOrganizationsError(error, "req-anx-460-s4a");
		expect(mapped.status).toBe(409);
		expect(mapped.body.error.code).toBe("CONFLICT");
		expect(mapped.body.error.details).toEqual({
			code: "ORG_REVISION_CONFLICT",
		});
		expect(mapped.body.error.requestId).toBe("req-anx-460-s4a");
	});

	test("erro cru de dominio desconhecido continua 500 (nao mascara bug)", () => {
		const mapped = mapOrganizationsError(
			new Error("Failed to update agency"),
			"req-anx-460-raw",
		);
		expect(mapped.status).toBe(500);
	});
});

/**
 * G3 (ANX-460) — body invalido e' 400, nao 500. O mapeamento caia no default
 * `status: 500` para `ZodError` (`.strict()`, UUID invalido) e para JSON
 * malformado, entao TODAS as rotas de organizations respondiam 500 a um body
 * ruim. Mesmo defeito ja' corrigido no boundary de governance (ANX-466).
 */
describe("organizations error handler — body invalido e' 400 (G3/ANX-460)", () => {
	test("ZodError de campo extra (.strict) e' 400, nao 500", () => {
		const parsed = transferOwnershipCommandSchema
			.omit({ commandId: true, agencyId: true })
			.strict()
			.safeParse({
				newOwnerPrincipalId: "11111111-1111-4111-8111-111111111111",
				extra: 1,
			});
		expect(parsed.success).toBe(false);
		if (parsed.success) throw new Error("unreachable");

		const mapped = mapOrganizationsError(parsed.error, "req-zod-extra");
		expect(mapped.status).toBe(400);
		expect(mapped.body.error.code).toBe("VALIDATION_ERROR");
		expect(mapped.body.error.requestId).toBe("req-zod-extra");
		expect(mapped.body.error.details).toEqual({
			issues: [{ path: "", code: "unrecognized_keys" }],
		});
	});

	test("ZodError de campo faltante e' 400 com o caminho do campo", () => {
		const parsed = transferOwnershipCommandSchema
			.omit({ commandId: true, agencyId: true })
			.strict()
			.safeParse({});
		if (parsed.success) throw new Error("unreachable");

		const mapped = mapOrganizationsError(parsed.error, "req-zod-missing");
		expect(mapped.status).toBe(400);
		expect(mapped.body.error.details).toEqual({
			issues: [{ path: "newOwnerPrincipalId", code: "invalid_type" }],
		});
	});

	test("JSON malformado (SyntaxError) e' 400, nao 500", () => {
		const mapped = mapOrganizationsError(
			new SyntaxError("Unexpected token } in JSON"),
			"req-syntax",
		);
		expect(mapped.status).toBe(400);
		expect(mapped.body.error.code).toBe("VALIDATION_ERROR");
		expect(mapped.body.error.message).toBe("Malformed JSON body");
		expect(mapped.body.error.requestId).toBe("req-syntax");
	});

	test("erro de parse com nome/codigo equivalentes tambem e' 400", () => {
		// `request.json()` de runtimes diferentes nao lanca sempre `SyntaxError`.
		for (const candidate of [
			Object.assign(new Error("bad json"), { name: "ParseError" }),
			Object.assign(new Error("bad json"), { code: "PARSE" }),
		]) {
			expect(mapOrganizationsError(candidate).status).toBe(400);
		}
	});

	test("ORG_INVITEE_CONSENT_REQUIRED e' 403 (D-ORG-046)", () => {
		const error = new OrganizationCommandError(
			"ORG_INVITEE_CONSENT_REQUIRED",
			"Assisted activation cannot bind a principal for the first time; the invitee must accept the invite",
		);
		expect(error.statusCode).toBe(403);
		const mapped = mapOrganizationsError(error, "req-consent");
		expect(mapped.status).toBe(403);
		expect(mapped.body.error.code).toBe("FORBIDDEN");
		expect(mapped.body.error.details).toEqual({
			code: "ORG_INVITEE_CONSENT_REQUIRED",
		});
	});
});
