import { z } from "zod";
import { nodeKeySchema } from "./types";
export const nodeCreateCommandSchema = z.object({
	commandId: z.string().uuid(),
	ownerDomain: z.string().min(1),
	nodeKey: nodeKeySchema,
	schemaVersion: z.number().int().positive(),
	payload: z.record(z.string(), z.unknown()),
});
export const nodeUpdateCommandSchema = z.object({
	commandId: z.string().uuid(),
	ownerDomain: z.string().min(1),
	nodeKey: nodeKeySchema,
	revision: z.number().int().positive(),
	payload: z.record(z.string(), z.unknown()),
});

export type NodeCreateCommand = z.infer<typeof nodeCreateCommandSchema>;
export type NodeUpdateCommand = z.infer<typeof nodeUpdateCommandSchema>;
