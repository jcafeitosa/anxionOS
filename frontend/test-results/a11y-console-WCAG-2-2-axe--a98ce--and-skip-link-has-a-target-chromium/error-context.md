# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a11y-console.spec.ts >> WCAG 2.2 axe — login + shells (ANX-340) >> /login loading form is axe-clean and skip-link has a target
- Location: e2e/a11y-console.spec.ts:26:2

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Entrar' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Entrar' }) with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Entrar' })

```

```yaml
- link "Pular para o conteúdo principal":
  - /url: "#main-content"
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | import { deniedPostLoginFixture, expectAxeClean } from "./a11y";
  3   | import { DEV_SEED_ACCOUNTS, signInLive } from "./fixtures/live-auth";
  4   | 
  5   | async function holdPostLoginContext(page: import("@playwright/test").Page): Promise<void> {
  6   | 	await page.route("**/v1/auth/post-login-context", async (route) => {
  7   | 		await new Promise((resolve) => {
  8   | 			setTimeout(resolve, 45_000);
  9   | 		});
  10  | 		await route.continue();
  11  | 	});
  12  | }
  13  | 
  14  | async function stalePostLoginContext(page: import("@playwright/test").Page): Promise<void> {
  15  | 	await page.route("**/v1/auth/post-login-context", (route) =>
  16  | 		route.fulfill({
  17  | 			status: 503,
  18  | 			contentType: "application/json",
  19  | 			body: JSON.stringify({ error: "unavailable" }),
  20  | 		}),
  21  | 	);
  22  | }
  23  | 
  24  | test.describe("WCAG 2.2 axe — login + shells (ANX-340)", () => {
  25  | 	test.describe.configure({ mode: "serial", timeout: 60_000 });
  26  | 	test("/login loading form is axe-clean and skip-link has a target", async ({
  27  | 		page,
  28  | 	}) => {
  29  | 		await page.goto("/login");
> 30  | 		await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
      |                                                               ^ Error: expect(locator).toBeVisible() failed
  31  | 		await expect(page.locator("#main-content")).toHaveCount(1);
  32  | 		await page.keyboard.press("Tab");
  33  | 		await expect(
  34  | 			page.getByRole("link", { name: "Pular para o conteúdo principal" }),
  35  | 		).toBeFocused();
  36  | 		await expectAxeClean(page, "/login");
  37  | 	});
  38  | 
  39  | 	test("Owner empty (live seed) is axe-clean", async ({ page }) => {
  40  | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  41  | 		await expect(page).toHaveURL(/\/agency\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  42  | 		await expect(page.getByTestId("owner-operational-empty")).toBeVisible();
  43  | 		await expect(page.getByTestId("honest-state-empty")).toBeVisible();
  44  | 		await expectAxeClean(page, "/agency owner empty");
  45  | 	});
  46  | 
  47  | 	test("Owner loading HonestState is axe-clean", async ({ page }) => {
  48  | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  49  | 		await expect(page).toHaveURL(/\/agency\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  50  | 		await holdPostLoginContext(page);
  51  | 		await page.reload({ waitUntil: "domcontentloaded" });
  52  | 		await expect(page.getByTestId("honest-state-loading")).toBeVisible({
  53  | 			timeout: 10_000,
  54  | 		});
  55  | 		await expectAxeClean(page, "/agency loading");
  56  | 		await page.unroute("**/v1/auth/post-login-context");
  57  | 	});
  58  | 
  59  | 	test("Owner stale HonestState is axe-clean", async ({ page }) => {
  60  | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  61  | 		await expect(page).toHaveURL(/\/agency\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  62  | 		await stalePostLoginContext(page);
  63  | 		await page.reload({ waitUntil: "domcontentloaded" });
  64  | 		await expect(page.getByTestId("honest-state-stale")).toBeVisible({
  65  | 			timeout: 10_000,
  66  | 		});
  67  | 		await expectAxeClean(page, "/agency stale");
  68  | 	});
  69  | 
  70  | 	test("Operator empty is axe-clean", async ({ page }) => {
  71  | 		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
  72  | 		await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  73  | 		await expect(page.getByTestId("operator-operational-empty")).toBeVisible();
  74  | 		await expectAxeClean(page, "/operator empty");
  75  | 	});
  76  | 
  77  | 	test("Operator loading HonestState is axe-clean", async ({ page }) => {
  78  | 		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
  79  | 		await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  80  | 		await holdPostLoginContext(page);
  81  | 		await page.reload({ waitUntil: "domcontentloaded" });
  82  | 		await expect(page.getByTestId("honest-state-loading")).toBeVisible({
  83  | 			timeout: 10_000,
  84  | 		});
  85  | 		await expectAxeClean(page, "/operator loading");
  86  | 		await page.unroute("**/v1/auth/post-login-context");
  87  | 	});
  88  | 
  89  | 	test("Operator stale HonestState is axe-clean", async ({ page }) => {
  90  | 		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
  91  | 		await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  92  | 		await stalePostLoginContext(page);
  93  | 		await page.reload({ waitUntil: "domcontentloaded" });
  94  | 		await expect(page.getByTestId("honest-state-stale")).toBeVisible({
  95  | 			timeout: 10_000,
  96  | 		});
  97  | 		await expectAxeClean(page, "/operator stale");
  98  | 	});
  99  | 
  100 | 	test("denied panel (loader fixture, platformAccess=false) is axe-clean", async ({
  101 | 		page,
  102 | 	}) => {
  103 | 		await page.route("**/v1/auth/post-login-context", (route) =>
  104 | 			route.fulfill({
  105 | 				status: 200,
  106 | 				contentType: "application/json",
  107 | 				body: JSON.stringify(deniedPostLoginFixture),
  108 | 			}),
  109 | 		);
  110 | 		await page.goto("/access-denied");
  111 | 		await expect(page.getByTestId("honest-state-denied")).toBeVisible({
  112 | 			timeout: 10_000,
  113 | 		});
  114 | 		await expect(page.getByRole("heading", { name: "Acesso não autorizado" })).toBeVisible();
  115 | 		await expectAxeClean(page, "/access-denied");
  116 | 	});
  117 | 
  118 | 	test("/platform bounce fail-closed lands on axe-clean Owner shell", async ({
  119 | 		page,
  120 | 	}) => {
  121 | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  122 | 		await expect(page).toHaveURL(/\/agency\//, { timeout: 20_000 });
  123 | 		await page.goto("/platform");
  124 | 		await expect(page).not.toHaveURL(/\/platform$/, { timeout: 20_000 });
  125 | 		await expect(page.getByRole("heading", { name: "Platform Console" })).toHaveCount(
  126 | 			0,
  127 | 		);
  128 | 		await expect(page).toHaveURL(/\/agency\//);
  129 | 		await expectAxeClean(page, "after /platform bounce");
  130 | 	});
```