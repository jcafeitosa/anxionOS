import { expect, test } from "@playwright/test";
import { deniedPostLoginFixture, expectAxeClean } from "./a11y";
import { DEV_SEED_ACCOUNTS, signInLive } from "./fixtures/live-auth";

async function holdPostLoginContext(page: import("@playwright/test").Page): Promise<void> {
	await page.route("**/v1/auth/post-login-context", async (route) => {
		await new Promise((resolve) => {
			setTimeout(resolve, 45_000);
		});
		await route.continue();
	});
}

async function stalePostLoginContext(page: import("@playwright/test").Page): Promise<void> {
	await page.route("**/v1/auth/post-login-context", (route) =>
		route.fulfill({
			status: 503,
			contentType: "application/json",
			body: JSON.stringify({ error: "unavailable" }),
		}),
	);
}

test.describe("WCAG 2.2 axe — login + shells (ANX-340)", () => {
	test.describe.configure({ mode: "serial", timeout: 60_000 });
	test("/login loading form is axe-clean and skip-link has a target", async ({
		page,
	}) => {
		await page.goto("/login");
		await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
		await expect(page.locator("#main-content")).toHaveCount(1);
		await page.keyboard.press("Tab");
		await expect(
			page.getByRole("link", { name: "Pular para o conteúdo principal" }),
		).toBeFocused();
		await expectAxeClean(page, "/login");
	});

	test("Owner empty (live seed) is axe-clean", async ({ page }) => {
		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
		await expect(page).toHaveURL(/\/agency\/[0-9a-f-]{36}$/, { timeout: 20_000 });
		await expect(page.getByTestId("owner-operational-empty")).toBeVisible();
		await expect(page.getByTestId("honest-state-empty")).toBeVisible();
		await expectAxeClean(page, "/agency owner empty");
	});

	test("Owner loading HonestState is axe-clean", async ({ page }) => {
		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
		await expect(page).toHaveURL(/\/agency\/[0-9a-f-]{36}$/, { timeout: 20_000 });
		await holdPostLoginContext(page);
		await page.reload({ waitUntil: "domcontentloaded" });
		await expect(page.getByTestId("honest-state-loading")).toBeVisible({
			timeout: 10_000,
		});
		await expectAxeClean(page, "/agency loading");
		await page.unroute("**/v1/auth/post-login-context");
	});

	test("Owner stale HonestState is axe-clean", async ({ page }) => {
		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
		await expect(page).toHaveURL(/\/agency\/[0-9a-f-]{36}$/, { timeout: 20_000 });
		await stalePostLoginContext(page);
		await page.reload({ waitUntil: "domcontentloaded" });
		await expect(page.getByTestId("honest-state-stale")).toBeVisible({
			timeout: 10_000,
		});
		await expectAxeClean(page, "/agency stale");
	});

	test("Operator empty is axe-clean", async ({ page }) => {
		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
		await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, { timeout: 20_000 });
		await expect(page.getByTestId("operator-operational-empty")).toBeVisible();
		await expectAxeClean(page, "/operator empty");
	});

	test("Operator loading HonestState is axe-clean", async ({ page }) => {
		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
		await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, { timeout: 20_000 });
		await holdPostLoginContext(page);
		await page.reload({ waitUntil: "domcontentloaded" });
		await expect(page.getByTestId("honest-state-loading")).toBeVisible({
			timeout: 10_000,
		});
		await expectAxeClean(page, "/operator loading");
		await page.unroute("**/v1/auth/post-login-context");
	});

	test("Operator stale HonestState is axe-clean", async ({ page }) => {
		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
		await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, { timeout: 20_000 });
		await stalePostLoginContext(page);
		await page.reload({ waitUntil: "domcontentloaded" });
		await expect(page.getByTestId("honest-state-stale")).toBeVisible({
			timeout: 10_000,
		});
		await expectAxeClean(page, "/operator stale");
	});

	test("denied panel (loader fixture, platformAccess=false) is axe-clean", async ({
		page,
	}) => {
		await page.route("**/v1/auth/post-login-context", (route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(deniedPostLoginFixture),
			}),
		);
		await page.goto("/access-denied");
		await expect(page.getByTestId("honest-state-denied")).toBeVisible({
			timeout: 10_000,
		});
		await expect(page.getByRole("heading", { name: "Acesso não autorizado" })).toBeVisible();
		await expectAxeClean(page, "/access-denied");
	});

	test("/platform bounce fail-closed lands on axe-clean Owner shell", async ({
		page,
	}) => {
		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
		await expect(page).toHaveURL(/\/agency\//, { timeout: 20_000 });
		await page.goto("/platform");
		await expect(page).not.toHaveURL(/\/platform$/, { timeout: 20_000 });
		await expect(page.getByRole("heading", { name: "Platform Console" })).toHaveCount(
			0,
		);
		await expect(page).toHaveURL(/\/agency\//);
		await expectAxeClean(page, "after /platform bounce");
	});

	test("/partner bounce fail-closed lands on axe-clean Owner shell", async ({
		page,
	}) => {
		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
		await expect(page).toHaveURL(/\/agency\//, { timeout: 20_000 });
		await page.goto("/partner");
		await expect(page).not.toHaveURL(/\/partner$/, { timeout: 20_000 });
		await expect(page.getByRole("heading", { name: "Partner Console" })).toHaveCount(
			0,
		);
		await expect(page).toHaveURL(/\/agency\//);
		await expectAxeClean(page, "after /partner bounce");
	});
});
