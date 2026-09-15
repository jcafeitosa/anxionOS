import { describe, expect, test } from "bun:test";
import { failPayoutCommandSchema } from "@anxionos/contracts/partners";
import { mapPartnersError } from "../../apps/api/src/partners/error-handler";

describe("partners error handler", () => {
	test("maps safe-text ZodError to validation 400", () => {
		const parsed = failPayoutCommandSchema.safeParse({
			commandId: "00000000-0000-4000-8000-000000000001",
			partnerOrganizationId: "00000000-0000-4000-8000-000000000002",
			payoutId: "ptr_pay_00000000-0000-4000-8000-000000000003",
			failedAt: "2026-09-13T12:00:00.000Z",
			failureReason: "-----BEGIN PRIVATE KEY-----",
		});
		expect(parsed.success).toBe(false);
		if (parsed.success) throw new Error("expected invalid payout command");

		const mapped = mapPartnersError(parsed.error, "req-partners-zod");
		expect(mapped.status).toBe(400);
		expect(mapped.body.error.code).toBe("VALIDATION_ERROR");
		expect(mapped.body.error.requestId).toBe("req-partners-zod");
		expect(mapped.body.error.details).toEqual({
			issues: [{ path: "failureReason", code: "custom" }],
		});
	});
});
