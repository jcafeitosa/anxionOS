import { describe, expect, test } from "bun:test";
import { createAgencyCommandSchema } from "@anxionos/contracts/organizations";
import { OrganizationCommandError } from "@anxionos/organizations";
import { mapOrganizationsError } from "../../apps/api/src/organizations/error-handler";

describe("organizations API boundary", () => {
	test("createAgency body schema strips principalId tampering (G5-03)", () => {
		const parsed = createAgencyCommandSchema
			.omit({ commandId: true })
			.strict()
			.safeParse({
				displayName: "Acme",
				marketScope: "both",
				principalId: "00000000-0000-4000-8000-000000000099",
			});
		expect(parsed.success).toBe(false);
	});

	test("mapOrganizationsError maps ORG_CROSS_TENANT to 403", () => {
		const error = new OrganizationCommandError(
			"ORG_CROSS_TENANT",
			"cross tenant",
		);
		const mapped = mapOrganizationsError(error);
		expect(mapped.status).toBe(403);
		expect(mapped.body.error.details).toEqual({ code: "ORG_CROSS_TENANT" });
	});
});
