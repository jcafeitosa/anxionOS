import { describe, expect, test } from "bun:test";
import { OrganizationCommandError } from "@anxionos/organizations";
import { mapPortfoliosError } from "../../apps/api/src/portfolios/error-handler";
import { portfolioOverviewItemSchema } from "../../apps/api/src/portfolios/handlers/overview";

/** G5 Red Team adversarial matrix — ANX-164 slice 6 finance (OwnerFinancePanel + GET portfolios). */
describe("portfolios API boundary (ANX-164 slice 6 G5)", () => {
	test("G5-ADV-IDOR: mapPortfoliosError maps ORG_CROSS_TENANT to 403", () => {
		const error = new OrganizationCommandError(
			"ORG_CROSS_TENANT",
			"Principal lacks active membership in agency",
		);
		const mapped = mapPortfoliosError(error);
		expect(mapped.status).toBe(403);
		expect(mapped.body.error.details).toEqual({ code: "ORG_CROSS_TENANT" });
	});

	test("G5-ADV-DTO: overview schema shape omits ownerUserId, capitalAccountId and position details", () => {
		const keys = Object.keys(portfolioOverviewItemSchema.shape);
		expect(keys).not.toContain("ownerUserId");
		expect(keys).not.toContain("capitalAccountId");
		expect(keys).not.toContain("positions");
		expect(keys).toContain("positionCount");

		const parsed = portfolioOverviewItemSchema.parse({
			id: "pf_test",
			name: "Test",
			baseCurrency: "USD",
			executionMode: "SIMULATED",
			status: "ACTIVE",
			positionCount: 2,
			latestValuation: null,
			ownerUserId: "leak",
			capitalAccountId: "leak",
			positions: [{ instrumentId: "x", quantity: "1" }],
		});
		expect(parsed).not.toHaveProperty("ownerUserId");
		expect(parsed).not.toHaveProperty("capitalAccountId");
		expect(parsed).not.toHaveProperty("positions");
		expect(parsed.positionCount).toBe(2);
	});
});
