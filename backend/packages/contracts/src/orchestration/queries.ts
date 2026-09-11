import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	checkoutStatusSchema,
	waitingHumanContextSchema,
	goalIdSchema,
	issueIdentifierSchema,
	runStatusSchema,
	taskIdSchema,
} from "./types";
export const taskDtoSchema = z.object({
	id: taskIdSchema,
	organizationId: z.string(),
	goalId: goalIdSchema,
	goalAncestry: z.array(goalIdSchema),
	issueIdentifier: issueIdentifierSchema,
	title: z.string(),
	checkoutStatus: checkoutStatusSchema,
	leaseExpiresAt: z.string().datetime().optional(),
	revision: z.number().int().nonnegative(),
});
export const runDtoSchema = z.object({
	id: institutionalUuidSchema,
	taskId: taskIdSchema,
	agentId: z.string(),
	issueIdentifier: issueIdentifierSchema,
	status: runStatusSchema,
	goalAncestry: z.array(goalIdSchema),
	startedAt: z.string().datetime().optional(),
	completedAt: z.string().datetime().optional(),
	waitingHuman: waitingHumanContextSchema.optional(),
});
export const checkoutTaskResultSchema = z.object({
	task: taskDtoSchema,
	run: runDtoSchema,
	leaseToken: institutionalUuidSchema,
	idempotentReplay: z.boolean(),
});

export type TaskDto = z.infer<typeof taskDtoSchema>;
export type RunDto = z.infer<typeof runDtoSchema>;
export type CheckoutTaskResult = z.infer<typeof checkoutTaskResultSchema>;

export const requestWaitingHumanInputResultSchema = z.object({
	run: runDtoSchema,
	idempotentReplay: z.boolean(),
});
export const resumeFromWaitingHumanInputResultSchema = z.object({
	run: runDtoSchema,
	idempotentReplay: z.boolean(),
});
export const restartRunFromCheckpointResultSchema = z.object({
	run: runDtoSchema,
	leaseToken: institutionalUuidSchema,
	idempotentReplay: z.boolean(),
});
export type RequestWaitingHumanInputResult = z.infer<
	typeof requestWaitingHumanInputResultSchema
>;
export type ResumeFromWaitingHumanInputResult = z.infer<
	typeof resumeFromWaitingHumanInputResultSchema
>;
export type RestartRunFromCheckpointResult = z.infer<
	typeof restartRunFromCheckpointResultSchema
>;
