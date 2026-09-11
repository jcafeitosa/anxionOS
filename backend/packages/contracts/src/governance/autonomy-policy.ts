import { z } from "zod";

export const autonomyLevelSchema = z.enum(["L0", "L1", "L2", "L3", "L4"]);

export const autonomyTransitionKindSchema = z.enum([
	"promote",
	"demote",
	"takeover",
]);

export const autonomyAssignmentStatusSchema = z.enum([
	"active",
	"superseded",
	"revoked",
]);

/** Levels blocked at runtime until explicit authorization (ANX-173). */
export const RUNTIME_DISABLED_AUTONOMY_LEVELS: readonly AutonomyLevel[] = [
	"L3",
	"L4",
];

export type AutonomyLevel = z.infer<typeof autonomyLevelSchema>;
export type AutonomyTransitionKind = z.infer<
	typeof autonomyTransitionKindSchema
>;
export type AutonomyAssignmentStatus = z.infer<
	typeof autonomyAssignmentStatusSchema
>;

export interface AutonomyLevelDefinition {
	level: AutonomyLevel;
	label: string;
	effectClass: "observe" | "propose" | "paper" | "live" | "organizational";
	eligibleCapabilities: readonly string[];
	runtimeEnabled: boolean;
	requiresApprovalToAssign: boolean;
}

/**
 * Normative matrix v1 — capabilities are NOT cumulative across levels.
 * Grants must be issued individually; this table defines eligibility per level.
 */
export const AUTONOMY_NORMATIVE_MATRIX: readonly AutonomyLevelDefinition[] = [
	{
		level: "L0",
		label: "observe",
		effectClass: "observe",
		eligibleCapabilities: [
			"market.observe",
			"portfolio.read",
			"audit.read",
		],
		runtimeEnabled: true,
		requiresApprovalToAssign: false,
	},
	{
		level: "L1",
		label: "research/propose",
		effectClass: "propose",
		eligibleCapabilities: [
			"strategy.research",
			"intent.propose",
			"decision.propose",
			"agents.tools.invoke",
		],
		runtimeEnabled: true,
		requiresApprovalToAssign: false,
	},
	{
		level: "L2",
		label: "paper execution",
		effectClass: "paper",
		eligibleCapabilities: ["order.submit.paper", "execution.simulate"],
		runtimeEnabled: true,
		requiresApprovalToAssign: true,
	},
	{
		level: "L3",
		label: "live within approved bounds",
		effectClass: "live",
		eligibleCapabilities: ["order.submit.live"],
		runtimeEnabled: false,
		requiresApprovalToAssign: true,
	},
	{
		level: "L4",
		label: "organizational proposal",
		effectClass: "organizational",
		eligibleCapabilities: ["org.change.propose"],
		runtimeEnabled: false,
		requiresApprovalToAssign: true,
	},
];

export const assignAutonomyLevelCommandSchema = z.object({
	commandId: z.string().uuid(),
	scopeId: z.string().uuid(),
	subjectAgentId: z.string().uuid(),
	level: autonomyLevelSchema,
	evidenceHash: z.string().min(1).optional(),
	approvalId: z.string().uuid().optional(),
});

export const transitionAutonomyLevelCommandSchema = z.object({
	commandId: z.string().uuid(),
	scopeId: z.string().uuid(),
	subjectAgentId: z.string().uuid(),
	targetLevel: autonomyLevelSchema,
	transitionKind: autonomyTransitionKindSchema,
	evidenceHash: z.string().min(1).optional(),
	approvalId: z.string().uuid().optional(),
	actorPrincipalId: z.string().uuid(),
	reason: z.string().max(500).optional(),
});

export type AssignAutonomyLevelCommand = z.infer<
	typeof assignAutonomyLevelCommandSchema
>;
export type TransitionAutonomyLevelCommand = z.infer<
	typeof transitionAutonomyLevelCommandSchema
>;
