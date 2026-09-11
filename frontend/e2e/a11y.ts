import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function expectAxeClean(page: Page, label: string): Promise<void> {
	const results = await new AxeBuilder({ page })
		.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
		.analyze();
	expect(results.violations, `${label}: ${JSON.stringify(results.violations, null, 2)}`).toEqual(
		[],
	);
}

export const deniedPostLoginFixture = {
	authenticated: true,
	emailVerified: true,
	mfaRequired: false,
	principal: {
		id: "principal-denied-a11y",
		authUserId: "auth-denied-a11y",
		email: "denied-a11y@anxionos.local",
		displayName: null,
	},
	membershipsActive: [],
	membershipsPending: [],
	platformAccess: false,
	partnerAccess: false,
	onboardingState: {
		needsProfile: false,
		needsOrganization: false,
	},
	decision: {
		kind: "denied" as const,
		reason: "no_authorized_console",
	},
};
