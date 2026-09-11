import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import { nodeKeySchema } from "./types";
export const nodeCreateCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	ownerDomain: z.string().min(1),
	nodeKey: nodeKeySchema,
	schemaVersion: z.number().int().positive(),
	payload: z.record(z.string(), z.unknown()),
});
export const nodeUpdateCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	ownerDomain: z.string().min(1),
	nodeKey: nodeKeySchema,
	revision: z.number().int().positive(),
	payload: z.record(z.string(), z.unknown()),
});

export type NodeCreateCommand = z.infer<typeof nodeCreateCommandSchema>;
export type NodeUpdateCommand = z.infer<typeof nodeUpdateCommandSchema>;
