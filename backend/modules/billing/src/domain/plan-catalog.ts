export const PLAN_IDS = ["freemium", "beginner", "trader", "pro"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const ENTITLEMENT_KEYS = [
	"maxAgents",
	"maxConnections",
	"maxStrategies",
	"maxAgencies",
	"storageMb",
	"apiRequestsPerMinute",
] as const;
export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[number];

export interface PlanPricing {
	monthlyFee: number;
	profitFeePercentage: number;
	currency: "USD";
}

export interface PlanEntitlements {
	maxAgents: number;
	maxConnections: number;
	maxStrategies: number;
	maxAgencies: number;
	storageMb: number;
	apiRequestsPerMinute: number;
}

export interface PlanFeatures {
	crypto: true;
	stocks: boolean;
	advancedResources: boolean;
	operationalSupport: boolean;
}

export interface PlanCatalogEntry {
	id: PlanId;
	displayName: string;
	pricing: PlanPricing;
	entitlements: PlanEntitlements;
	features: PlanFeatures;
}

export type PlanCatalog = Readonly<Record<PlanId, PlanCatalogEntry>>;

export interface EntitlementCheckResult {
	allowed: boolean;
	limit: number;
	current: number;
	remaining: number;
}

const PLAN_CATALOG: PlanCatalog = {
	freemium: {
		id: "freemium",
		displayName: "Freemium",
		pricing: { monthlyFee: 0, profitFeePercentage: 20, currency: "USD" },
		entitlements: {
			maxAgents: 1,
			maxConnections: 1,
			maxStrategies: 1,
			maxAgencies: 1,
			storageMb: 100,
			apiRequestsPerMinute: 30,
		},
		features: {
			crypto: true,
			stocks: false,
			advancedResources: false,
			operationalSupport: false,
		},
	},
	beginner: {
		id: "beginner",
		displayName: "Beginner",
		pricing: { monthlyFee: 19, profitFeePercentage: 15, currency: "USD" },
		entitlements: {
			maxAgents: 3,
			maxConnections: 3,
			maxStrategies: 3,
			maxAgencies: 1,
			storageMb: 500,
			apiRequestsPerMinute: 60,
		},
		features: {
			crypto: true,
			stocks: false,
			advancedResources: false,
			operationalSupport: false,
		},
	},
	trader: {
		id: "trader",
		displayName: "Trader",
		pricing: { monthlyFee: 59, profitFeePercentage: 10, currency: "USD" },
		entitlements: {
			maxAgents: 10,
			maxConnections: 10,
			maxStrategies: 10,
			maxAgencies: 3,
			storageMb: 2_000,
			apiRequestsPerMinute: 180,
		},
		features: {
			crypto: true,
			stocks: true,
			advancedResources: false,
			operationalSupport: false,
		},
	},
	pro: {
		id: "pro",
		displayName: "Pro",
		pricing: { monthlyFee: 199, profitFeePercentage: 10, currency: "USD" },
		entitlements: {
			maxAgents: 50,
			maxConnections: 50,
			maxStrategies: 50,
			maxAgencies: 10,
			storageMb: 10_000,
			apiRequestsPerMinute: 600,
		},
		features: {
			crypto: true,
			stocks: true,
			advancedResources: true,
			operationalSupport: true,
		},
	},
};

export function createPlanCatalog(): PlanCatalog {
	return PLAN_CATALOG;
}

export function getEntitlementsForPlan(planId: PlanId): PlanEntitlements {
	return PLAN_CATALOG[planId].entitlements;
}

export function checkEntitlement(
	planId: PlanId,
	entitlement: EntitlementKey,
	currentUsage: number,
): EntitlementCheckResult {
	if (!Number.isFinite(currentUsage) || currentUsage < 0) {
		throw new RangeError("currentUsage must be a finite non-negative number");
	}
	const limit = getEntitlementsForPlan(planId)[entitlement];
	return {
		allowed: currentUsage <= limit,
		limit,
		current: currentUsage,
		remaining: Math.max(0, limit - currentUsage),
	};
}
