import { listOrders } from "@anxionos/execution";
import { z } from "zod";
import type { ExecutionPluginDeps } from "../plugin";

const listOrdersQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function handleListOrders(
	deps: ExecutionPluginDeps,
	input: { agencyId: string; query: Record<string, string | undefined> },
) {
	const { limit } = listOrdersQuerySchema.parse(input.query);
	return listOrders({ orders: deps.orders }, input.agencyId, limit);
}
