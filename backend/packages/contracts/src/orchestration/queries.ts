import { z } from "zod";
import { checkoutStatusSchema, goalIdSchema, issueIdentifierSchema, runStatusSchema, taskIdSchema, } from "./types";
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
    id: z.string().uuid(),
    taskId: taskIdSchema,
    agentId: z.string(),
    issueIdentifier: issueIdentifierSchema,
    status: runStatusSchema,
    goalAncestry: z.array(goalIdSchema),
    startedAt: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
});
export const checkoutTaskResultSchema = z.object({
    task: taskDtoSchema,
    run: runDtoSchema,
    leaseToken: z.string().uuid(),
    idempotentReplay: z.boolean(),
});

export type TaskDto = z.infer<typeof taskDtoSchema>;
export type RunDto = z.infer<typeof runDtoSchema>;
export type CheckoutTaskResult = z.infer<typeof checkoutTaskResultSchema>;
