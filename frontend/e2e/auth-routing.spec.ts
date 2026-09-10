import { expect, test } from "@playwright/test";
import { DEV_SEED_ACCOUNTS, signInLive } from "./fixtures/live-auth";

test.describe("post-login routing (live Better Auth)", () => {
	test("unauthenticated landing stays public", async ({ page }) => {
		await page.goto("/");
		await expect(
			page.getByRole("heading", {
				name: "Investimentos autônomos com governança institucional",
			}),
		).toBeVisible();
		await expect(page.getByRole("link", { name: "Entrar" }).first()).toBeVisible();
	});

	test("owner membership opens Owner dashboard from loader", async ({ page }) => {
		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
		await expect(page).toHaveURL(/\/agency\/[0-9a-f-]{36}$/, { timeout: 20_000 });
		await expect(page.getByRole("heading", { name: "Owner Console" })).toBeVisible();
		await expect(page.getByTestId("owner-dashboard")).toBeVisible();
		await expect(page.getByTestId("archify-canvas")).toBeVisible();
		const url = page.url();
		const agencyId = url.match(/\/agency\/([0-9a-f-]{36})$/)?.[1];
		expect(agencyId).toBeTruthy();
		await expect(page.getByTestId("owner-membership")).toContainText(agencyId!);
		await expect(page.getByTestId("owner-membership")).toContainText("owner");
		await expect(page.getByTestId("owner-platform-grant")).toContainText(
			"platformAccess=false",
		);
		await expect(page.getByTestId("owner-operational-empty")).toContainText(
			"Agentes e portfólio ainda não alimentam este console",
		);
		await expect(page.getByText("tn_demo_001")).toHaveCount(0);
		await expect(page.getByText("C-level")).toHaveCount(0);
	});

	test("operator membership opens Operator dashboard from loader", async ({ page }) => {
		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
		await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, { timeout: 20_000 });
		await expect(
			page.getByRole("heading", { name: "Operator Console" }),
		).toBeVisible();
		await expect(page.getByTestId("operator-dashboard")).toBeVisible();
		await expect(page.getByTestId("archify-canvas")).toBeVisible();
		const url = page.url();
		const agencyId = url.match(/\/operator\/([0-9a-f-]{36})$/)?.[1];
		expect(agencyId).toBeTruthy();
		await expect(page.getByTestId("operator-membership")).toContainText(agencyId!);
		await expect(page.getByTestId("operator-membership")).toContainText("operator");
		await expect(page.getByTestId("operator-platform-grant")).toContainText(
			"platformAccess=false",
		);
		await expect(page.getByTestId("operator-operational-empty")).toContainText(
			"Agentes e portfólio ainda não alimentam este console",
		);
		await expect(page.getByText("tn_demo_001")).toHaveCount(0);
		await expect(page.getByText("C-level")).toHaveCount(0);
	});

	test("zero memberships open onboarding", async ({ page }) => {
		await signInLive(page, DEV_SEED_ACCOUNTS.none);
		await expect(page).toHaveURL(/\/onboarding$/, { timeout: 20_000 });
	});

	test("multiple memberships open select-organization", async ({ page }) => {
		await signInLive(page, DEV_SEED_ACCOUNTS.multi);
		await expect(page).toHaveURL(/\/select-organization$/, { timeout: 20_000 });
		await expect(
			page.getByRole("heading", { name: "Escolher organização" }),
		).toBeVisible();
	});

	test("without PLATFORM/partner grant does not open those consoles", async ({
		page,
	}) => {
		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
		await expect(page).toHaveURL(/\/agency\//, { timeout: 20_000 });
		await page.goto("/platform");
		await expect(page).not.toHaveURL(/\/platform$/);
		await page.goto("/partner");
		await expect(page).not.toHaveURL(/\/partner$/);
	});

	test("operator without PLATFORM grant is blocked from /platform", async ({
		page,
	}) => {
		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
		await expect(page).toHaveURL(/\/operator\//, { timeout: 20_000 });
		await page.goto("/platform");
		await expect(page).not.toHaveURL(/\/platform$/);
		await expect(page.getByRole("heading", { name: "Platform Console" })).toHaveCount(
			0,
		);
	});

	test("skip-link is reachable on ready Owner shell", async ({ page }) => {
		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
		await expect(page.getByRole("heading", { name: "Owner Console" })).toBeVisible({
			timeout: 20_000,
		});
		await page.keyboard.press("Tab");
		const skip = page.getByRole("link", { name: "Pular para o conteúdo principal" });
		await expect(skip).toBeFocused();
	});
});
