import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import { riskKillSwitchIdSchema, riskKillSwitchScopeSchema } from "./types";

export const killSwitchStatusSchema = z.object({
	killSwitchId: riskKillSwitchIdSchema.optional(),
	organizationId: institutionalUuidSchema,
	scope: riskKillSwitchScopeSchema,
	portfolioId: z.string().min(1).nullable().optional(),
	killSwitchActive: z.boolean(),
	reason: z.string().nullable().optional(),
	activatedBy: z.string().nullable().optional(),
	activatedAt: z.string().datetime().nullable().optional(),
	releasedBy: z.string().nullable().optional(),
	releasedAt: z.string().datetime().nullable().optional(),
	riskEpoch: z.number().int().nonnegative().optional(),
});

export const getKillSwitchStatusResponseSchema = z.object({
	status: killSwitchStatusSchema,
});

export type KillSwitchStatus = z.infer<typeof killSwitchStatusSchema>;
export type GetKillSwitchStatusResponse = z.infer<
	typeof getKillSwitchStatusResponseSchema
>;
