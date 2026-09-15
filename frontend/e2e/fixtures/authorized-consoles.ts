import { expect, type Page } from "@playwright/test";
import { DEV_SEED_ACCOUNTS } from "./live-auth";

export const PARTNER_ORGANIZATION_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

export const authorizedPartnerPostLogin = {
	authenticated: true,
	emailVerified: true,
	mfaRequired: false,
	principal: {
		id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
		authUserId: "auth-partner-e2e",
		email: DEV_SEED_ACCOUNTS.partner,
		displayName: "Partner E2E",
	},
	membershipsActive: [
		{
			agencyId: PARTNER_ORGANIZATION_ID,
			role: "operator" as const,
			status: "active" as const,
		},
	],
	membershipsPending: [],
	platformAccess: false,
	partnerAccess: true,
	onboardingState: {
		needsProfile: false,
		needsOrganization: false,
	},
	decision: {
		kind: "partner" as const,
		agencyId: PARTNER_ORGANIZATION_ID,
		reason: "PARTNER_ACCESS",
	},
};

const authorizedPlatformPostLogin = {
	authenticated: true,
	emailVerified: true,
	mfaRequired: false,
	principal: {
		id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
		authUserId: "auth-platform-g3",
		email: "platform-g3@anxionos.local",
		displayName: "Platform G3",
	},
	membershipsActive: [],
	membershipsPending: [],
	platformAccess: true,
	partnerAccess: false,
	onboardingState: {
		needsProfile: false,
		needsOrganization: false,
	},
	decision: {
		kind: "platform" as const,
		reason: "console.platform_grant",
	},
};

export async function mockAuthorizedPartnerApis(page: Page): Promise<void> {
	await page.route("**/v1/auth/post-login-context", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(authorizedPartnerPostLogin),
		}),
	);
	await page.route(
		`**/v1/partners/organizations/${PARTNER_ORGANIZATION_ID}`,
		(route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					partner: {
						id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
						organizationId: PARTNER_ORGANIZATION_ID,
						referralCode: "PARTNER-E2E",
						displayName: "Partner E2E",
						commissionRate: "10",
						referredOrganizationId: "12121212-1212-4121-8121-121212121212",
						status: "ACTIVE",
						revision: 1,
					},
				}),
			}),
	);
	await page.route(
		`**/v1/partners/organizations/${PARTNER_ORGANIZATION_ID}/commission-accruals**`,
		(route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					accruals: [
						{
							id: "13131313-1313-4131-8131-131313131313",
							partnerId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
							partnerOrganizationId: PARTNER_ORGANIZATION_ID,
							referredOrganizationId: "12121212-1212-4121-8121-121212121212",
							invoiceId: "invoice-e2e-001",
							invoiceTotalAmount: "100.00",
							commissionRate: "10",
							commissionAmount: "10.00",
							status: "ACCRUED",
							accruedAt: "2026-09-12T12:00:00.000Z",
							reversedAt: null,
						},
					],
				}),
			}),
	);
	await page.route(
		`**/v1/partners/organizations/${PARTNER_ORGANIZATION_ID}/payouts**`,
		(route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					payouts: [
						{
							id: "14141414-1414-4141-8141-141414141414",
							partnerId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
							partnerOrganizationId: PARTNER_ORGANIZATION_ID,
							requestedAmount: "10.00",
							status: "REQUESTED",
							requestedAt: "2026-09-12T13:00:00.000Z",
							approvedAt: null,
							approvalReference: null,
						},
					],
				}),
			}),
	);
}

export async function mockAuthorizedPlatformApis(page: Page): Promise<void> {
	await page.route("**/v1/auth/post-login-context", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(authorizedPlatformPostLogin),
		}),
	);
	await page.route("**/v1/operations/platform/health", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				source: "probeHealthDeps",
				checkedAt: "2026-09-11T16:00:00.000Z",
				stale: false,
				deps: { postgres: "ok", nats: "ok", neo4j: "ok" },
			}),
		}),
	);
	await page.route("**/v1/operations/platform/incidents", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ incidents: [] }),
		}),
	);
	await page.route("**/v1/operations/platform/runtimes", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ runtimes: [] }),
		}),
	);
	await page.route("**/v1/operations/platform/recovery", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ recoveryTasks: [] }),
		}),
	);
}

export async function assertAuthorizedConsoleHeading(
	page: Page,
	name: string,
): Promise<void> {
	await expect(page.getByRole("heading", { name })).toBeVisible({ timeout: 20_000 });
}
