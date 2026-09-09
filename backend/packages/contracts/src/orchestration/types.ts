import { z } from "zod";
export const gateIdSchema = z.enum([
    "G0",
    "G1",
    "G2",
    "G3",
    "G4",
    "G5",
    "G6",
    "G7",
]);
export const gateDispositionSchema = z.enum([
    "PASS",
    "CHANGES_REQUIRED",
    "BLOCKED",
    "NOT_APPLICABLE",
]);
export const hierarchyModeSchema = z.enum([
    "HIERARCHY_TREE",
    "HIERARCHY_CIRCULAR",
]);
export const checkoutStatusSchema = z.enum([
    "UNCLAIMED",
    "LEASED",
    "COMPLETED",
    "BLOCKED",
]);
export const runStatusSchema = z.enum([
    "SCHEDULED",
    "WAKING",
    "ACTIVE",
    "PAUSED",
    "COMPLETED",
    "ORPHANED",
    "BUDGET_STOPPED",
    "TERMINATED",
]);
export const goalStatusSchema = z.enum([
    "draft",
    "active",
    "completed",
    "archived",
]);
export const heartbeatStatusSchema = z.enum([
    "pending",
    "processing",
    "done",
    "cancelled",
]);
export const taskIdSchema = z.string().uuid();
export const runIdSchema = z.string().uuid();
export const goalIdSchema = z.string().uuid();
export const issueIdentifierSchema = z.string().regex(/^ANX-[0-9]+$/);
export const artifactDigestSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const agentIdSchema = z.string().min(1).max(128);
export const organizationIdSchema = z.string().min(1).max(64);

export type GateId = z.infer<typeof gateIdSchema>;
export type GateDisposition = z.infer<typeof gateDispositionSchema>;
export type HierarchyMode = z.infer<typeof hierarchyModeSchema>;
export type CheckoutStatus = z.infer<typeof checkoutStatusSchema>;
export type RunStatus = z.infer<typeof runStatusSchema>;
export type GoalStatus = z.infer<typeof goalStatusSchema>;
export type HeartbeatStatus = z.infer<typeof heartbeatStatusSchema>;
