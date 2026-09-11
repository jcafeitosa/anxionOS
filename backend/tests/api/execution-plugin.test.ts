import { describe, expect, test } from "bun:test";
import { EXECUTION_MODULE_ERROR_CODES } from "@anxionos/contracts/execution";
import { ExecutionCommandError } from "@anxionos/execution";
import { mapExecutionError } from "../../apps/api/src/execution/error-handler";
import { createExecutionPlugin } from "../../apps/api/src/execution/plugin";

describe("execution API boundary (ANX-165 HTTP read)", () => {
	test("mapExecutionError maps EX_ORDER_NOT_FOUND to 404", () => {
		const error = new ExecutionCommandError(
			EXECUTION_MODULE_ERROR_CODES.ORDER_NOT_FOUND,
			"order not found",
		);
		const mapped = mapExecutionError(error);
		expect(mapped.status).toBe(404);
		expect(mapped.body.error.details).toEqual({
			code: EXECUTION_MODULE_ERROR_CODES.ORDER_NOT_FOUND,
		});
	});

	test("mapExecutionError maps EX_CROSS_TENANT to 403", () => {
		const error = new ExecutionCommandError(
			EXECUTION_MODULE_ERROR_CODES.CROSS_TENANT,
			"organization mismatch",
		);
		const mapped = mapExecutionError(error);
		expect(mapped.status).toBe(403);
		expect(mapped.body.error.details).toEqual({
			code: EXECUTION_MODULE_ERROR_CODES.CROSS_TENANT,
		});
	});
});

describe("execution plugin routes (ANX-165 HTTP read)", () => {
	test("registers orders and reconciliation read routes", () => {
		const plugin = createExecutionPlugin({
			auth: { api: { getSession: async () => null } } as never,
			identityRepository: {} as never,
			scopedPool: {} as never,
			orders: {} as never,
			reconciliationCases: {} as never,
		});
		const routes = plugin.routes.map((route) => route.path);
		expect(routes).toContain("/v1/execution/agencies/:agencyId/orders");
		expect(routes).toContain(
			"/v1/execution/agencies/:agencyId/reconciliation-cases",
		);
	});
});
