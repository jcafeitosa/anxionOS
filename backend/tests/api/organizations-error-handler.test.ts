import { describe, expect, test } from "bun:test";
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
});
