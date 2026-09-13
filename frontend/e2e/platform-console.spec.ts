import { expect, test } from "@playwright/test";
import { mockAuthorizedPlatformApis } from "./fixtures/authorized-consoles";
import { DEV_SEED_ACCOUNTS, signInLive } from "./fixtures/live-auth";

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
