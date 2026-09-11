import { describe, expect, test } from "bun:test";
import { RISK_ERROR_CODES } from "@anxionos/contracts/risk";
import { RiskCommandError } from "@anxionos/risk";
import { mapRiskError } from "../../apps/api/src/risk/error-handler";
import { createRiskPlugin } from "../../apps/api/src/risk/plugin";

describe("risk API boundary (ANX-165 HTTP read + kill switch)", () => {
	test("mapRiskError maps RK_KILL_SWITCH_NOT_ACTIVE to 409", () => {
		const error = new RiskCommandError(
			RISK_ERROR_CODES.KILL_SWITCH_NOT_ACTIVE,
			"no active kill switch",
		);
		const mapped = mapRiskError(error);
		expect(mapped.status).toBe(409);
		expect(mapped.body.error.details).toEqual({
			code: RISK_ERROR_CODES.KILL_SWITCH_NOT_ACTIVE,
		});
	});

	test("mapRiskError maps RK_CROSS_TENANT to 403", () => {
		const error = new RiskCommandError(
			RISK_ERROR_CODES.CROSS_TENANT,
			"organization mismatch",
		);
		const mapped = mapRiskError(error);
		expect(mapped.status).toBe(403);
		expect(mapped.body.error.details).toEqual({
			code: RISK_ERROR_CODES.CROSS_TENANT,
		});
	});
});

describe("risk plugin routes (ANX-165 kill switch)", () => {
	test("registers kill switch read and mutation routes", () => {
		const plugin = createRiskPlugin({
			auth: { api: { getSession: async () => null } } as never,
			identityRepository: {} as never,
			scopedPool: {} as never,
			unitOfWork: {} as never,
			commandJournal: {} as never,
			killSwitch: {} as never,
		});
		const routes = plugin.routes.map((route) => route.path);
		expect(routes).toContain("/v1/risk/agencies/:agencyId/kill-switch");
		expect(routes).toContain(
			"/v1/risk/agencies/:agencyId/kill-switch/activate",
		);
		expect(routes).toContain(
			"/v1/risk/agencies/:agencyId/kill-switch/release",
		);
	});
});
