import { z } from "zod";
export const STRATEGIES_OWNER_DOMAIN = "strategies";
export const strategyIdSchema = z.string().regex(/^st_str_[0-9a-f-]{36}$/i);
export const strategyVersionIdSchema = z
	.string()
	.regex(/^st_ver_[0-9a-f-]{36}$/i);
export const strategiesExecutionModeSchema = z.enum(["SIMULATED", "PAPER"]);
export const strategyStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);
export const strategyVersionLifecycleSchema = z.enum([
	"DRAFT",
	"BACKTESTED",
	"EVALUATED",
	"CERTIFIED",
	"PAPER",
	"SUSPENDED",
	"RETIRED",
]);
type StrategyVersionLifecycle = z.infer<typeof strategyVersionLifecycleSchema>;
const ALLOWED_VERSION_TRANSITIONS: Record<
	StrategyVersionLifecycle,
	readonly StrategyVersionLifecycle[]
> = {
	DRAFT: ["BACKTESTED"],
	BACKTESTED: ["EVALUATED"],
	EVALUATED: ["CERTIFIED"],
	CERTIFIED: ["PAPER"],
	PAPER: ["SUSPENDED", "RETIRED"],
	SUSPENDED: ["PAPER", "RETIRED"],
	RETIRED: [],
};
export class StrategiesContractError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "StrategiesContractError";
	}
}
export function assertStrategiesExecutionModeSupported(mode: string): void {
	if (mode === "REAL" || mode === "REAL_EXECUTION" || mode === "LIVE") {
		throw new StrategiesContractError("ST_EXECUTION_MODE_NOT_SUPPORTED");
	}
	const parsed = strategiesExecutionModeSchema.safeParse(mode);
	if (!parsed.success) {
		throw new StrategiesContractError("ST_EXECUTION_MODE_NOT_SUPPORTED");
	}
}
export function assertValidStrategyVersionLifecycleTransition(
	from: StrategyVersionLifecycle,
	to: StrategyVersionLifecycle,
): void {
	const allowed = ALLOWED_VERSION_TRANSITIONS[from];
	if (!allowed.includes(to)) {
		throw new StrategiesContractError("ST_INVALID_LIFECYCLE_TRANSITION");
	}
}
