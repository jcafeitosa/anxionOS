import { expect, test, type Locator, type Page } from "@playwright/test";
import { DEV_SEED_ACCOUNTS, signInLive } from "./fixtures/live-auth";

const INTERVENTION_PANEL_TEST_IDS = [
	"operator-incidents-panel",
	"operator-takeover-panel",
	"operator-kill-switch-panel",
	"operator-orders-panel",
	"operator-reconciliation-panel",
] as const;

async function openOperatorConsole(page: Page): Promise<string> {
	await signInLive(page, DEV_SEED_ACCOUNTS.operator);
	await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, { timeout: 20_000 });
	await expect(
		page.getByRole("heading", { name: "Operator Console" }),
	).toBeVisible();
	await expect(page.getByTestId("operator-dashboard")).toBeVisible();
	await expect(page.getByTestId("archify-canvas")).toBeVisible();
	const agencyId = page.url().match(/\/operator\/([0-9a-f-]{36})$/)?.[1];
	expect(agencyId).toBeTruthy();
	return agencyId!;
}

async function assertPanelHonestOrData(panel: Locator): Promise<void> {
	const honest = panel.locator('[data-testid^="honest-state-"]');
	const list = panel.locator('[data-testid$="-list"]');
	const killSwitchStatus = panel.getByTestId("operator-kill-switch-status");
	await expect(honest.or(list).or(killSwitchStatus).first()).toBeVisible({
		timeout: 20_000,
	});
}

test.describe("Operator console intervention panels (ANX-165 S9)", () => {
	test("operator seed lands on /operator/:agencyId with membership", async ({
		page,
	}) => {
		const agencyId = await openOperatorConsole(page);
		await expect(page.getByTestId("operator-membership")).toContainText(agencyId);
		await expect(page.getByTestId("operator-membership")).toContainText("operator");
		await expect(page.getByTestId("operator-platform-grant")).toContainText(
			"platformAccess=false",
		);
	});

	test("intervention panels mount with honest empty states when APIs unmounted", async ({
		page,
	}) => {
		const agencyId = await openOperatorConsole(page);
		await page.goto(`/operator/${agencyId}`);
		await expect(page.getByTestId("operator-dashboard")).toBeVisible();

		for (const testId of INTERVENTION_PANEL_TEST_IDS) {
			const panel = page.getByTestId(testId);
			await expect(panel).toBeVisible();
			await assertPanelHonestOrData(panel);
		}

		const incidentsPanel = page.getByTestId("operator-incidents-panel");
		await expect(incidentsPanel).toContainText("Incidentes operacionais");

		const ordersPanel = page.getByTestId("operator-orders-panel");
		await expect(ordersPanel).toContainText("Ordens de execução");
		await expect(ordersPanel.getByTestId("operator-orders-contract")).toContainText(
			"GET /v1/execution/agencies/:agencyId/orders",
		);

		const reconciliationPanel = page.getByTestId("operator-reconciliation-panel");
		await expect(reconciliationPanel).toContainText("Reconciliação venue");
		await expect(
			reconciliationPanel.getByTestId("operator-reconciliation-contract"),
		).toContainText("GET /v1/execution/agencies/:agencyId/reconciliation-cases");

		const takeoverPanel = page.getByTestId("operator-takeover-panel");
		await expect(takeoverPanel.getByTestId("operator-takeover-read-contract")).toBeVisible();

		const killSwitchPanel = page.getByTestId("operator-kill-switch-panel");
		await expect(killSwitchPanel).toContainText("Kill switch de risco");
		await expect(
			killSwitchPanel.getByTestId("operator-kill-switch-read-contract"),
		).toContainText("GET /v1/risk/agencies/:agencyId/kill-switch");

		const emptyStates = page.locator('[data-testid="honest-state-empty"]');
		await expect(emptyStates.first()).toBeVisible();
	});

	test("kill switch confirm dialog keeps principal fields read-only when status is ready", async ({
		page,
	}) => {
		const agencyId = await openOperatorConsole(page);

		const principalId = await page.evaluate(async () => {
			const response = await fetch("/v1/auth/post-login-context", {
				credentials: "include",
				headers: { Accept: "application/json" },
			});
			if (!response.ok) {
				return null;
			}
			const body = (await response.json()) as {
				principal?: { id?: string } | null;
			};
			return body.principal?.id ?? null;
		});
		expect(principalId).toBeTruthy();

		await page.route(
			`**/v1/risk/agencies/${agencyId}/kill-switch`,
			(route) =>
				route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						organizationId: agencyId,
						scope: "ORGANIZATION",
						killSwitchActive: false,
					}),
				}),
		);

		await page.reload({ waitUntil: "domcontentloaded" });
		await expect(page.getByTestId("operator-kill-switch-status")).toBeVisible({
			timeout: 20_000,
		});
		await expect(page.getByTestId("operator-kill-switch-activate")).toBeEnabled();
		await page.getByTestId("operator-kill-switch-activate").click();
		await expect(page.getByTestId("operator-kill-switch-confirm-dialog")).toBeVisible();
		const activatedBy = page.getByTestId("operator-kill-switch-activated-by");
		await expect(activatedBy).toHaveAttribute("readonly", "");
		await expect(activatedBy).toHaveValue(principalId!);
		await page.getByRole("button", { name: "Voltar" }).click();
		await expect(page.getByTestId("operator-kill-switch-confirm-dialog")).toBeHidden();
	});

	test("operator console does not expose Owner-only panels", async ({ page }) => {
		await openOperatorConsole(page);
		await expect(page.getByTestId("owner-dashboard")).toHaveCount(0);
		await expect(page.getByTestId("owner-finance-panel")).toHaveCount(0);
		await expect(page.getByTestId("owner-grants-panel")).toHaveCount(0);
		await expect(page.getByTestId("owner-agents-catalog")).toHaveCount(0);
		await expect(page.getByRole("heading", { name: "Owner Console" })).toHaveCount(0);
	});
});
