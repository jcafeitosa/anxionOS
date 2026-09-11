# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: partner-console.spec.ts >> Partner console fail-closed (seed partnerAccess=false) >> operator seed is blocked from /partner without inventing commission
- Location: e2e/partner-console.spec.ts:40:2

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByTestId('operator-partner-grant')
Expected substring: "partnerAccess=false"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" getByTestId('operator-partner-grant') with timeout 5000ms
  - waiting for getByTestId('operator-partner-grant')

```

```yaml
- link "Pular para o conteúdo principal":
  - /url: "#main-content"
```

# Test source

```ts
  1  | import { expect, test, type Page } from "@playwright/test";
  2  | import { DEV_SEED_ACCOUNTS, signInLive } from "./fixtures/live-auth";
  3  | 
  4  | async function assertPartnerRouteBlocked(page: Page): Promise<void> {
  5  | 	await page.goto("/partner");
  6  | 	await expect(page).not.toHaveURL(/\/partner$/, { timeout: 20_000 });
  7  | 	await expect(page.getByRole("heading", { name: "Partner Console" })).toHaveCount(
  8  | 		0,
  9  | 	);
  10 | 	await expect(page.getByTestId("partner-dashboard")).toHaveCount(0);
  11 | 	await expect(page.getByTestId("partner-accruals-list")).toHaveCount(0);
  12 | 	await expect(page.getByTestId("partner-payouts-list")).toHaveCount(0);
  13 | }
  14 | 
  15 | test.describe("Partner console fail-closed (seed partnerAccess=false)", () => {
  16 | 	test("unauthenticated /partner does not stay on the partner shell", async ({
  17 | 		page,
  18 | 	}) => {
  19 | 		await page.goto("/partner");
  20 | 		await expect(page).not.toHaveURL(/\/partner$/, { timeout: 20_000 });
  21 | 		await expect(page.getByRole("heading", { name: "Partner Console" })).toHaveCount(
  22 | 			0,
  23 | 		);
  24 | 	});
  25 | 
  26 | 	test("owner seed shows partnerAccess=false and cannot remain on /partner$", async ({
  27 | 		page,
  28 | 	}) => {
  29 | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  30 | 		await expect(page).toHaveURL(/\/agency\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  31 | 		await expect(page.getByTestId("owner-partner-grant")).toContainText(
  32 | 			"partnerAccess=false",
  33 | 		);
  34 | 		await expect(page.getByTestId("archify-canvas")).toBeVisible();
  35 | 		await expect(page.getByText("tn_demo_001")).toHaveCount(0);
  36 | 		await assertPartnerRouteBlocked(page);
  37 | 		await expect(page).toHaveURL(/\/agency\//);
  38 | 	});
  39 | 
  40 | 	test("operator seed is blocked from /partner without inventing commission", async ({
  41 | 		page,
  42 | 	}) => {
  43 | 		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
  44 | 		await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, {
  45 | 			timeout: 20_000,
  46 | 		});
> 47 | 		await expect(page.getByTestId("operator-partner-grant")).toContainText(
     |                                                            ^ Error: expect(locator).toContainText(expected) failed
  48 | 			"partnerAccess=false",
  49 | 		);
  50 | 		await expect(page.getByTestId("archify-canvas")).toBeVisible();
  51 | 		await expect(page.getByText("C-level")).toHaveCount(0);
  52 | 		await assertPartnerRouteBlocked(page);
  53 | 		await expect(page).toHaveURL(/\/operator\//);
  54 | 	});
  55 | 
  56 | 	test("multi-org user cannot remain on /partner$", async ({ page }) => {
  57 | 		await signInLive(page, DEV_SEED_ACCOUNTS.multi);
  58 | 		await expect(page).toHaveURL(/\/select-organization$/, { timeout: 20_000 });
  59 | 		await assertPartnerRouteBlocked(page);
  60 | 	});
  61 | });
  62 | 
```