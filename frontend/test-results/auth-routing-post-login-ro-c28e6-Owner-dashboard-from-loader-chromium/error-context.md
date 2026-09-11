# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-routing.spec.ts >> post-login routing (live Better Auth) >> owner membership opens Owner dashboard from loader
- Location: e2e/auth-routing.spec.ts:15:2

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByTestId('owner-team-panel')
Expected substring: "GET /v1/organizations/agencies/:agencyId/memberships"
Received string:    "Equipeowner · activedda03cf9-8ab9-4f03-9123-3d25a95c9876 · 3e5baade-6c4c-4e75-b90f-ece93944ee59operator · active16b23284-843e-4095-97c6-e507d0d7cc09 · 16894192-21b7-46be-ae23-2c5ddc377b20"
Timeout: 5000ms

Call log:
  - Expect "toContainText" getByTestId('owner-team-panel') with timeout 5000ms
  - waiting for getByTestId('owner-team-panel')
    14 × locator resolved to <section id="team" data-testid="owner-team-panel" aria-labelledby="owner-team-heading">…</section>
       - unexpected value "Equipeowner · activedda03cf9-8ab9-4f03-9123-3d25a95c9876 · 3e5baade-6c4c-4e75-b90f-ece93944ee59operator · active16b23284-843e-4095-97c6-e507d0d7cc09 · 16894192-21b7-46be-ae23-2c5ddc377b20"

```

```yaml
- region "Equipe":
  - heading "Equipe" [level=2]
  - list:
    - listitem:
      - paragraph: owner · active
      - paragraph: dda03cf9-8ab9-4f03-9123-3d25a95c9876 · 3e5baade-6c4c-4e75-b90f-ece93944ee59
    - listitem:
      - paragraph: operator · active
      - paragraph: 16b23284-843e-4095-97c6-e507d0d7cc09 · 16894192-21b7-46be-ae23-2c5ddc377b20
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | import { DEV_SEED_ACCOUNTS, signInLive } from "./fixtures/live-auth";
  3   | 
  4   | test.describe("post-login routing (live Better Auth)", () => {
  5   | 	test("unauthenticated landing stays public", async ({ page }) => {
  6   | 		await page.goto("/");
  7   | 		await expect(
  8   | 			page.getByRole("heading", {
  9   | 				name: "Investimentos autônomos com governança institucional",
  10  | 			}),
  11  | 		).toBeVisible();
  12  | 		await expect(page.getByRole("link", { name: "Entrar" }).first()).toBeVisible();
  13  | 	});
  14  | 
  15  | 	test("owner membership opens Owner dashboard from loader", async ({ page }) => {
  16  | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  17  | 		await expect(page).toHaveURL(/\/agency\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  18  | 		await expect(page.getByRole("heading", { name: "Owner Console" })).toBeVisible();
  19  | 		await expect(page.getByTestId("owner-dashboard")).toBeVisible();
  20  | 		await expect(page.getByTestId("archify-canvas")).toBeVisible();
  21  | 		const url = page.url();
  22  | 		const agencyId = url.match(/\/agency\/([0-9a-f-]{36})$/)?.[1];
  23  | 		expect(agencyId).toBeTruthy();
  24  | 		await expect(page.getByTestId("owner-membership")).toContainText(agencyId!);
  25  | 		await expect(page.getByTestId("owner-membership")).toContainText("owner");
  26  | 		await expect(page.getByTestId("owner-platform-grant")).toContainText(
  27  | 			"platformAccess=false",
  28  | 		);
  29  | 		await expect(page.getByTestId("owner-finance-panel")).toBeVisible();
  30  | 		await expect(page.getByTestId("owner-finance-panel")).toContainText(
  31  | 			"GET /v1/agencies/:agencyId/portfolios",
  32  | 		);
  33  | 		const teamPanel = page.getByTestId("owner-team-panel");
  34  | 		await expect(teamPanel).toBeVisible();
> 35  | 		await expect(teamPanel).toContainText(
      |                           ^ Error: expect(locator).toContainText(expected) failed
  36  | 			"GET /v1/organizations/agencies/:agencyId/memberships",
  37  | 		);
  38  | 		const teamList = page.getByTestId("owner-team-list");
  39  | 		const teamEmpty = teamPanel.getByTestId("honest-state-empty");
  40  | 		const teamDenied = teamPanel.getByTestId("honest-state-denied");
  41  | 		const teamStale = teamPanel.getByTestId("honest-state-stale");
  42  | 		await expect(
  43  | 			teamList.or(teamEmpty).or(teamDenied).or(teamStale),
  44  | 		).toBeVisible({ timeout: 20_000 });
  45  | 		if (await teamList.isVisible()) {
  46  | 			await expect(teamList).toContainText("owner");
  47  | 		}
  48  | 		const grantsPanel = page.getByTestId("owner-grants-panel");
  49  | 		await expect(grantsPanel).toBeVisible();
  50  | 		await expect(grantsPanel).toContainText("GET /v1/agencies/:agencyId/grants");
  51  | 		const grantsList = page.getByTestId("owner-grants-list");
  52  | 		const grantsEmpty = grantsPanel.getByTestId("honest-state-empty");
  53  | 		const grantsDenied = grantsPanel.getByTestId("honest-state-denied");
  54  | 		const grantsStale = grantsPanel.getByTestId("honest-state-stale");
  55  | 		await expect(
  56  | 			grantsList.or(grantsEmpty).or(grantsDenied).or(grantsStale),
  57  | 		).toBeVisible({ timeout: 20_000 });
  58  | 		await expect(page.getByTestId("owner-autonomy-contract")).toContainText(
  59  | 			"/agents/:agentId/autonomy",
  60  | 		);
  61  | 		const approvalsPanel = page.getByTestId("owner-approvals-panel");
  62  | 		await expect(approvalsPanel).toBeVisible();
  63  | 		await expect(approvalsPanel).toContainText(
  64  | 			"GET /v1/agencies/:agencyId/change-proposals",
  65  | 		);
  66  | 		const approvalsList = page.getByTestId("owner-approvals-list");
  67  | 		const approvalsEmpty = approvalsPanel.getByTestId("honest-state-empty");
  68  | 		const approvalsDenied = approvalsPanel.getByTestId("honest-state-denied");
  69  | 		const approvalsStale = approvalsPanel.getByTestId("honest-state-stale");
  70  | 		await expect(
  71  | 			approvalsList.or(approvalsEmpty).or(approvalsDenied).or(approvalsStale),
  72  | 		).toBeVisible({ timeout: 20_000 });
  73  | 		await expect(page.getByTestId("owner-approval-resolve-contract")).toContainText(
  74  | 			"/v1/governance/approvals/resolve",
  75  | 		);
  76  | 		const agentsCatalog = page.getByTestId("owner-agents-catalog");
  77  | 		await expect(agentsCatalog).toBeVisible();
  78  | 		await expect(agentsCatalog.getByTestId("honest-state-empty")).toBeVisible({
  79  | 			timeout: 20_000,
  80  | 		});
  81  | 		await expect(agentsCatalog).toContainText("GET /v1/agencies/:agencyId/agents");
  82  | 		await expect(page.getByTestId("owner-agents-list")).toHaveCount(0);
  83  | 		await expect(page.getByTestId("owner-agents-autonomy-contract")).toHaveCount(0);
  84  | 		await expect(page.getByText(/^L[0-4]$/)).toHaveCount(0);
  85  | 		await expect(page.getByText("tn_demo_001")).toHaveCount(0);
  86  | 		await expect(page.getByText("C-level")).toHaveCount(0);
  87  | 	});
  88  | 
  89  | 	test("operator membership opens Operator dashboard from loader", async ({ page }) => {
  90  | 		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
  91  | 		await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  92  | 		await expect(
  93  | 			page.getByRole("heading", { name: "Operator Console" }),
  94  | 		).toBeVisible();
  95  | 		await expect(page.getByTestId("operator-dashboard")).toBeVisible();
  96  | 		await expect(page.getByTestId("archify-canvas")).toBeVisible();
  97  | 		const url = page.url();
  98  | 		const agencyId = url.match(/\/operator\/([0-9a-f-]{36})$/)?.[1];
  99  | 		expect(agencyId).toBeTruthy();
  100 | 		await expect(page.getByTestId("operator-membership")).toContainText(agencyId!);
  101 | 		await expect(page.getByTestId("operator-membership")).toContainText("operator");
  102 | 		await expect(page.getByTestId("operator-platform-grant")).toContainText(
  103 | 			"platformAccess=false",
  104 | 		);
  105 | 		await expect(page.getByTestId("operator-operational-empty")).toContainText(
  106 | 			"Este console não lista Owner capabilities",
  107 | 		);
  108 | 		await expect(page.getByTestId("owner-team-panel")).toHaveCount(0);
  109 | 		await expect(page.getByTestId("owner-grants-panel")).toHaveCount(0);
  110 | 		await expect(page.getByTestId("owner-agents-catalog")).toHaveCount(0);
  111 | 		await expect(page.getByTestId("owner-dashboard")).toHaveCount(0);
  112 | 		await expect(page.getByRole("heading", { name: "Owner Console" })).toHaveCount(0);
  113 | 		await expect(page.getByText("tn_demo_001")).toHaveCount(0);
  114 | 		await expect(page.getByText("C-level")).toHaveCount(0);
  115 | 	});
  116 | 
  117 | 	test("zero memberships open onboarding", async ({ page }) => {
  118 | 		await signInLive(page, DEV_SEED_ACCOUNTS.none);
  119 | 		await expect(page).toHaveURL(/\/onboarding$/, { timeout: 20_000 });
  120 | 	});
  121 | 
  122 | 	test("multiple memberships open select-organization", async ({ page }) => {
  123 | 		await signInLive(page, DEV_SEED_ACCOUNTS.multi);
  124 | 		await expect(page).toHaveURL(/\/select-organization$/, { timeout: 20_000 });
  125 | 		await expect(
  126 | 			page.getByRole("heading", { name: "Escolher organização" }),
  127 | 		).toBeVisible();
  128 | 	});
  129 | 
  130 | 	test("without PLATFORM/partner grant does not open those consoles", async ({
  131 | 		page,
  132 | 	}) => {
  133 | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  134 | 		await expect(page).toHaveURL(/\/agency\//, { timeout: 20_000 });
  135 | 		await page.goto("/platform");
```