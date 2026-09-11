import { expect, test, type Page } from "@playwright/test";
import { DEV_SEED_ACCOUNTS, signInLive } from "./fixtures/live-auth";

const PLATFORM_PRINCIPAL_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const authorizedPlatformPostLogin = {
	authenticated: true,
	emailVerified: true,
	mfaRequired: false,
	principal: {
		id: PLATFORM_PRINCIPAL_ID,
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

async function mockAuthorizedPlatformApis(page: Page): Promise<void> {
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

test.describe("Platform console (ANX-166 G3)", () => {
	test("operator without grant is bounced off /platform", async ({ page }) => {
		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
		await expect(page).toHaveURL(/\/operator\//, { timeout: 20_000 });
		await page.goto("/platform");
		await expect(page).not.toHaveURL(/\/platform$/);
		await expect(page.getByRole("heading", { name: "Platform Console" })).toHaveCount(
			0,
		);
	});

	test("authorized PLATFORM session never calls agency operations and keeps recovery honest", async ({
		page,
	}) => {
		const leakedAgencyOperations: string[] = [];
		page.on("request", (request) => {
			if (/\/v1\/operations\/agencies\//.test(request.url())) {
				leakedAgencyOperations.push(request.url());
			}
		});
		await mockAuthorizedPlatformApis(page);
		await page.goto("/platform");
		await expect(page.getByRole("heading", { name: "Platform Console" })).toBeVisible({
			timeout: 20_000,
		});
		await expect(page.getByTestId("platform-dashboard")).toBeVisible();
		await expect(page.getByTestId("platform-health-snapshot")).toBeVisible({
			timeout: 20_000,
		});
		await expect(page.locator("#incidents")).toContainText(
			"Nenhum incidente de plataforma",
		);
		await expect(page.locator("#runtimes")).toContainText(
			"Nenhum runtime de plataforma",
		);
		await expect(page.locator("#rollout")).toContainText(
			"Nenhuma tarefa de recovery de plataforma",
		);
		await expect(page.locator("#rollout")).toContainText(
			"Does not execute break-glass",
		);
		expect(leakedAgencyOperations).toEqual([]);
	});

	test("live PLATFORM seed reaches /platform without agency operations", async ({
		page,
	}) => {
		const leakedAgencyOperations: string[] = [];
		page.on("request", (request) => {
			if (/\/v1\/operations\/agencies\//.test(request.url())) {
				leakedAgencyOperations.push(request.url());
			}
		});
		await signInLive(page, DEV_SEED_ACCOUNTS.platform);
		await expect(page).toHaveURL(/\/platform/, { timeout: 20_000 });
		await expect(page.getByRole("heading", { name: "Platform Console" })).toBeVisible({
			timeout: 20_000,
		});
		await expect(page.getByTestId("platform-dashboard")).toBeVisible();
		await expect(page.getByTestId("platform-health-snapshot")).toBeVisible({
			timeout: 20_000,
		});
		await expect(page.locator("#runtimes")).toContainText(
			"Nenhum runtime de plataforma",
			{ timeout: 20_000 },
		);
		await expect(page.locator("#rollout")).toContainText(
			"Nenhuma tarefa de recovery de plataforma",
		);
		expect(leakedAgencyOperations).toEqual([]);
	});
});
