import type { AgencyStatus, MarketScope, OnboardingStep } from "@anxionos/contracts/organizations";

const AGENCY_STATUS_ORDER = [
	"draft",
	"connections_pending",
	"ready",
	"draining",
	"archived",
] as const satisfies readonly AgencyStatus[];

/** INV-ORG-01: status advances one step forward in the lifecycle order. */
export function canTransitionAgencyStatus(from: AgencyStatus, to: AgencyStatus): boolean {
	if (from === to) {
		return true;
	}
	const fromIndex = AGENCY_STATUS_ORDER.indexOf(from);
	const toIndex = AGENCY_STATUS_ORDER.indexOf(to);
	if (fromIndex === -1 || toIndex === -1) {
		return false;
	}
	return toIndex === fromIndex + 1;
}

const ONBOARDING_STEP_ORDER = [
	"created",
	"markets_set",
	"blueprint_pending",
	"mandate_pending",
	"ready",
] as const satisfies readonly OnboardingStep[];

/** Onboarding step advances one step forward in the lifecycle order. */
export function canTransitionOnboardingStep(from: OnboardingStep, to: OnboardingStep): boolean {
	if (from === to) {
		return true;
	}
	const fromIndex = ONBOARDING_STEP_ORDER.indexOf(from);
	const toIndex = ONBOARDING_STEP_ORDER.indexOf(to);
	if (fromIndex === -1 || toIndex === -1) {
		return false;
	}
	return toIndex === fromIndex + 1;
}

export interface Agency {
	id: string;
	ownerPrincipalId: string;
	displayName: string;
	marketScope: MarketScope;
	status: AgencyStatus;
	onboardingStep: OnboardingStep;
	revision: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface NewAgency {
	ownerPrincipalId: string;
	displayName: string;
	marketScope: MarketScope;
}
