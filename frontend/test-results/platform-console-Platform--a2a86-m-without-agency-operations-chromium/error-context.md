# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: platform-console.spec.ts >> Platform console (ANX-166 G3) >> live PLATFORM seed reaches /platform without agency operations
- Location: e2e/platform-console.spec.ts:117:2

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Platform Console' })
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Platform Console' }) with timeout 20000ms
  - waiting for getByRole('heading', { name: 'Platform Console' })

```

```yaml
- link "Pular para o conteúdo principal":
  - /url: "#main-content"
- main:
  - paragraph: Carregando
  - heading "Abrindo console" [level=1]
  - paragraph: Confirmando membership e decisão autoritativa.
```

# Test source

```ts
  28  | };
  29  | 
  30  | async function mockAuthorizedPlatformApis(page: Page): Promise<void> {
  31  | 	await page.route("**/v1/auth/post-login-context", (route) =>
  32  | 		route.fulfill({
  33  | 			status: 200,
  34  | 			contentType: "application/json",
  35  | 			body: JSON.stringify(authorizedPlatformPostLogin),
  36  | 		}),
  37  | 	);
  38  | 	await page.route("**/v1/operations/platform/health", (route) =>
  39  | 		route.fulfill({
  40  | 			status: 200,
  41  | 			contentType: "application/json",
  42  | 			body: JSON.stringify({
  43  | 				source: "probeHealthDeps",
  44  | 				checkedAt: "2026-09-11T16:00:00.000Z",
  45  | 				stale: false,
  46  | 				deps: { postgres: "ok", nats: "ok", neo4j: "ok" },
  47  | 			}),
  48  | 		}),
  49  | 	);
  50  | 	await page.route("**/v1/operations/platform/incidents", (route) =>
  51  | 		route.fulfill({
  52  | 			status: 200,
  53  | 			contentType: "application/json",
  54  | 			body: JSON.stringify({ incidents: [] }),
  55  | 		}),
  56  | 	);
  57  | 	await page.route("**/v1/operations/platform/runtimes", (route) =>
  58  | 		route.fulfill({
  59  | 			status: 200,
  60  | 			contentType: "application/json",
  61  | 			body: JSON.stringify({ runtimes: [] }),
  62  | 		}),
  63  | 	);
  64  | 	await page.route("**/v1/operations/platform/recovery", (route) =>
  65  | 		route.fulfill({
  66  | 			status: 200,
  67  | 			contentType: "application/json",
  68  | 			body: JSON.stringify({ recoveryTasks: [] }),
  69  | 		}),
  70  | 	);
  71  | }
  72  | 
  73  | test.describe("Platform console (ANX-166 G3)", () => {
  74  | 	test("operator without grant is bounced off /platform", async ({ page }) => {
  75  | 		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
  76  | 		await expect(page).toHaveURL(/\/operator\//, { timeout: 20_000 });
  77  | 		await page.goto("/platform");
  78  | 		await expect(page).not.toHaveURL(/\/platform$/);
  79  | 		await expect(page.getByRole("heading", { name: "Platform Console" })).toHaveCount(
  80  | 			0,
  81  | 		);
  82  | 	});
  83  | 
  84  | 	test("authorized PLATFORM session never calls agency operations and keeps recovery honest", async ({
  85  | 		page,
  86  | 	}) => {
  87  | 		const leakedAgencyOperations: string[] = [];
  88  | 		page.on("request", (request) => {
  89  | 			if (/\/v1\/operations\/agencies\//.test(request.url())) {
  90  | 				leakedAgencyOperations.push(request.url());
  91  | 			}
  92  | 		});
  93  | 		await mockAuthorizedPlatformApis(page);
  94  | 		await page.goto("/platform");
  95  | 		await expect(page.getByRole("heading", { name: "Platform Console" })).toBeVisible({
  96  | 			timeout: 20_000,
  97  | 		});
  98  | 		await expect(page.getByTestId("platform-dashboard")).toBeVisible();
  99  | 		await expect(page.getByTestId("platform-health-snapshot")).toBeVisible({
  100 | 			timeout: 20_000,
  101 | 		});
  102 | 		await expect(page.locator("#incidents")).toContainText(
  103 | 			"Nenhum incidente de plataforma",
  104 | 		);
  105 | 		await expect(page.locator("#runtimes")).toContainText(
  106 | 			"Nenhum runtime de plataforma",
  107 | 		);
  108 | 		await expect(page.locator("#rollout")).toContainText(
  109 | 			"Nenhuma tarefa de recovery de plataforma",
  110 | 		);
  111 | 		await expect(page.locator("#rollout")).toContainText(
  112 | 			"Does not execute break-glass",
  113 | 		);
  114 | 		expect(leakedAgencyOperations).toEqual([]);
  115 | 	});
  116 | 
  117 | 	test("live PLATFORM seed reaches /platform without agency operations", async ({
  118 | 		page,
  119 | 	}) => {
  120 | 		const leakedAgencyOperations: string[] = [];
  121 | 		page.on("request", (request) => {
  122 | 			if (/\/v1\/operations\/agencies\//.test(request.url())) {
  123 | 				leakedAgencyOperations.push(request.url());
  124 | 			}
  125 | 		});
  126 | 		await signInLive(page, DEV_SEED_ACCOUNTS.platform);
  127 | 		await expect(page).toHaveURL(/\/platform/, { timeout: 20_000 });
> 128 | 		await expect(page.getByRole("heading", { name: "Platform Console" })).toBeVisible({
      |                                                                         ^ Error: expect(locator).toBeVisible() failed
  129 | 			timeout: 20_000,
  130 | 		});
  131 | 		await expect(page.getByTestId("platform-dashboard")).toBeVisible();
  132 | 		await expect(page.getByTestId("platform-health-snapshot")).toBeVisible({
  133 | 			timeout: 20_000,
  134 | 		});
  135 | 		await expect(page.locator("#runtimes")).toContainText(
  136 | 			"Nenhum runtime de plataforma",
  137 | 			{ timeout: 20_000 },
  138 | 		);
  139 | 		await expect(page.locator("#rollout")).toContainText(
  140 | 			"Nenhuma tarefa de recovery de plataforma",
  141 | 		);
  142 | 		expect(leakedAgencyOperations).toEqual([]);
  143 | 	});
  144 | });
  145 | 
```