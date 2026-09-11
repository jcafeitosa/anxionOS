import type { ListOrdersResponse } from "@anxionos/contracts/execution";
import { listOrdersResponseSchema } from "@anxionos/contracts/execution";
import type { ExecutionOrderRepository } from "../../domain/ports/execution-unit-of-work";
import { toOrderSnapshot } from "./query-support";

export interface ListOrdersDeps {
	orders: ExecutionOrderRepository;
}

export async function listOrders(
	deps: ListOrdersDeps,
	organizationId: string,
	limit?: number,
): Promise<ListOrdersResponse> {
	const records = await deps.orders.listOpenByOrganizationId(
		organizationId,
		limit,
	);
	return listOrdersResponseSchema.parse({
		orders: records.map(toOrderSnapshot),
	});
}
