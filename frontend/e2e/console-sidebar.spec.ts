import { expect, test } from "@playwright/test";
import { DEV_SEED_ACCOUNTS, signInLive } from "./fixtures/live-auth";

test.describe("Aceternity console sidebar (ANX-448)", () => {
	test("Owner dashboard exposes the expandable sidebar", async ({ page }) => {
		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
		await expect(page).toHaveURL(/\/agency\/[0-9a-f-]{36}$/, { timeout: 20_000 });
		const sidebar = page.getByTestId("console-sidebar");
		await expect(sidebar).toBeVisible();
		await expect(sidebar).toHaveAttribute("data-console", "owner");
		await expect(page.getByTestId("console-nav-dashboard")).toBeVisible();
		await expect(page.getByTestId("console-nav-owner-agency")).toBeVisible();
		await expect(page.getByTestId("console-nav-logout")).toBeVisible();
		await expect(page.getByTestId("console-sidebar-session")).toContainText(
			DEV_SEED_ACCOUNTS.owner,
		);
		await expect(page.locator("#main-content")).toHaveCount(1);
		await expect(page.getByTestId("owner-dashboard")).toBeVisible();
		await expect(page.getByTestId("archify-canvas")).toBeVisible();
	});

	test("Operator sidebar does not expose Owner navigation", async ({ page }) => {
		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
		await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, { timeout: 20_000 });
		const sidebar = page.getByTestId("console-sidebar");
		await expect(sidebar).toBeVisible();
		await expect(sidebar).toHaveAttribute("data-console", "operator");
		await expect(page.getByTestId("console-nav-owner-agency")).toHaveCount(0);
		await expect(sidebar.getByRole("link", { name: "Owner Console" })).toHaveCount(
			0,
		);
		await expect(sidebar.getByRole("link", { name: "Equipe" })).toHaveCount(0);
		await expect(sidebar.locator('a[href*="/agency/"]')).toHaveCount(0);
		await expect(page.getByTestId("owner-dashboard")).toHaveCount(0);
		await expect(page.getByTestId("operator-dashboard")).toBeVisible();
	});
});
