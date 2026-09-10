import { expect, test, type Page } from "@playwright/test";
import { DEV_SEED_ACCOUNTS, signInLive } from "./fixtures/live-auth";

async function assertPartnerRouteBlocked(page: Page): Promise<void> {
	await page.goto("/partner");
	await expect(page).not.toHaveURL(/\/partner$/, { timeout: 20_000 });
	await expect(page.getByRole("heading", { name: "Partner Console" })).toHaveCount(
		0,
	);
	await expect(page.getByTestId("partner-dashboard")).toHaveCount(0);
	await expect(page.getByTestId("partner-accruals-list")).toHaveCount(0);
	await expect(page.getByTestId("partner-payouts-list")).toHaveCount(0);
}

test.describe("Partner console fail-closed (seed partnerAccess=false)", () => {
	test("unauthenticated /partner does not stay on the partner shell", async ({
		page,
	}) => {
		await page.goto("/partner");
		await expect(page).not.toHaveURL(/\/partner$/, { timeout: 20_000 });
		await expect(page.getByRole("heading", { name: "Partner Console" })).toHaveCount(
			0,
		);
	});

	test("owner seed shows partnerAccess=false and cannot remain on /partner$", async ({
		page,
	}) => {
		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
		await expect(page).toHaveURL(/\/agency\/[0-9a-f-]{36}$/, { timeout: 20_000 });
		await expect(page.getByTestId("owner-partner-grant")).toContainText(
			"partnerAccess=false",
		);
		await expect(page.getByTestId("archify-canvas")).toBeVisible();
		await expect(page.getByText("tn_demo_001")).toHaveCount(0);
		await assertPartnerRouteBlocked(page);
		await expect(page).toHaveURL(/\/agency\//);
	});

	test("operator seed is blocked from /partner without inventing commission", async ({
		page,
	}) => {
		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
		await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, {
			timeout: 20_000,
		});
		await expect(page.getByTestId("operator-partner-grant")).toContainText(
			"partnerAccess=false",
		);
		await expect(page.getByTestId("archify-canvas")).toBeVisible();
		await expect(page.getByText("C-level")).toHaveCount(0);
		await assertPartnerRouteBlocked(page);
		await expect(page).toHaveURL(/\/operator\//);
	});

	test("multi-org user cannot remain on /partner$", async ({ page }) => {
		await signInLive(page, DEV_SEED_ACCOUNTS.multi);
		await expect(page).toHaveURL(/\/select-organization$/, { timeout: 20_000 });
		await assertPartnerRouteBlocked(page);
	});
});
