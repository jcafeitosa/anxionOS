# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: operator-console.spec.ts >> Operator console intervention panels (ANX-165 S9) >> operator console does not expose Owner-only panels
- Location: e2e/operator-console.spec.ts:135:2

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/operator\/[0-9a-f-]{36}$/
Received string:  "http://127.0.0.1:4321/login"
Timeout: 20000ms

Call log:
  - Expect "toHaveURL" with timeout 20000ms
    44 × locator resolved to <html lang="pt-BR">…</html>
       - unexpected value "http://127.0.0.1:4321/login"

```

```yaml
- link "Pular para o conteúdo principal":
  - /url: "#main-content"
- main:
  - paragraph: Sessão
  - heading "Entrar" [level=1]
  - paragraph: O destino após o login vem do loader autoritativo, não de um papel escolhido neste formulário.
  - text: E-mail
  - textbox "E-mail": operator@anxionos.local
  - text: Senha
  - textbox "Senha": anxionos-dev-pass
  - button "Mostrar caracteres": Mostrar
  - alert: "Não foi possível entrar: e-mail ou senha não conferem. Confira as credenciais ou use uma conta de seed local."
  - button "Entrar"
  - link "Criar conta":
    - /url: /register
  - link "Esqueci a senha":
    - /url: /forgot-password
- paragraph: Desatualizado
- heading "Contexto de acesso indisponível" [level=1]
- paragraph: Não foi possível confirmar a sessão neste momento. Tente de novo; nenhum console será aberto sem decisão autoritativa.
- link "Ir para o login":
  - /url: /login
```

# Test source

```ts
  1   | import { expect, test, type Locator, type Page } from "@playwright/test";
  2   | import { DEV_SEED_ACCOUNTS, signInLive } from "./fixtures/live-auth";
  3   | 
  4   | const INTERVENTION_PANEL_TEST_IDS = [
  5   | 	"operator-incidents-panel",
  6   | 	"operator-takeover-panel",
  7   | 	"operator-kill-switch-panel",
  8   | 	"operator-orders-panel",
  9   | 	"operator-reconciliation-panel",
  10  | ] as const;
  11  | 
  12  | async function openOperatorConsole(page: Page): Promise<string> {
  13  | 	await signInLive(page, DEV_SEED_ACCOUNTS.operator);
> 14  | 	await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, { timeout: 20_000 });
      |                     ^ Error: expect(page).toHaveURL(expected) failed
  15  | 	await expect(
  16  | 		page.getByRole("heading", { name: "Operator Console" }),
  17  | 	).toBeVisible();
  18  | 	await expect(page.getByTestId("operator-dashboard")).toBeVisible();
  19  | 	await expect(page.getByTestId("archify-canvas")).toBeVisible();
  20  | 	const agencyId = page.url().match(/\/operator\/([0-9a-f-]{36})$/)?.[1];
  21  | 	expect(agencyId).toBeTruthy();
  22  | 	return agencyId!;
  23  | }
  24  | 
  25  | async function assertPanelHonestOrData(panel: Locator): Promise<void> {
  26  | 	const honest = panel.locator('[data-testid^="honest-state-"]');
  27  | 	const list = panel.locator('[data-testid$="-list"]');
  28  | 	const killSwitchStatus = panel.getByTestId("operator-kill-switch-status");
  29  | 	await expect(honest.or(list).or(killSwitchStatus).first()).toBeVisible({
  30  | 		timeout: 20_000,
  31  | 	});
  32  | }
  33  | 
  34  | test.describe("Operator console intervention panels (ANX-165 S9)", () => {
  35  | 	test("operator seed lands on /operator/:agencyId with membership", async ({
  36  | 		page,
  37  | 	}) => {
  38  | 		const agencyId = await openOperatorConsole(page);
  39  | 		await expect(page.getByTestId("operator-membership")).toContainText(agencyId);
  40  | 		await expect(page.getByTestId("operator-membership")).toContainText("operator");
  41  | 		await expect(page.getByTestId("operator-platform-grant")).toContainText(
  42  | 			"platformAccess=false",
  43  | 		);
  44  | 	});
  45  | 
  46  | 	test("intervention panels mount with honest empty states when APIs unmounted", async ({
  47  | 		page,
  48  | 	}) => {
  49  | 		const agencyId = await openOperatorConsole(page);
  50  | 		await page.goto(`/operator/${agencyId}`);
  51  | 		await expect(page.getByTestId("operator-dashboard")).toBeVisible();
  52  | 
  53  | 		for (const testId of INTERVENTION_PANEL_TEST_IDS) {
  54  | 			const panel = page.getByTestId(testId);
  55  | 			await expect(panel).toBeVisible();
  56  | 			await assertPanelHonestOrData(panel);
  57  | 		}
  58  | 
  59  | 		const incidentsPanel = page.getByTestId("operator-incidents-panel");
  60  | 		await expect(incidentsPanel).toContainText("Incidentes operacionais");
  61  | 
  62  | 		const ordersPanel = page.getByTestId("operator-orders-panel");
  63  | 		await expect(ordersPanel).toContainText("Ordens de execução");
  64  | 		await expect(ordersPanel.getByTestId("operator-orders-contract")).toContainText(
  65  | 			"GET /v1/execution/agencies/:agencyId/orders",
  66  | 		);
  67  | 
  68  | 		const reconciliationPanel = page.getByTestId("operator-reconciliation-panel");
  69  | 		await expect(reconciliationPanel).toContainText("Reconciliação venue");
  70  | 		await expect(
  71  | 			reconciliationPanel.getByTestId("operator-reconciliation-contract"),
  72  | 		).toContainText("GET /v1/execution/agencies/:agencyId/reconciliation-cases");
  73  | 
  74  | 		const takeoverPanel = page.getByTestId("operator-takeover-panel");
  75  | 		await expect(takeoverPanel.getByTestId("operator-takeover-read-contract")).toBeVisible();
  76  | 
  77  | 		const killSwitchPanel = page.getByTestId("operator-kill-switch-panel");
  78  | 		await expect(killSwitchPanel).toContainText("Kill switch de risco");
  79  | 		await expect(
  80  | 			killSwitchPanel.getByTestId("operator-kill-switch-read-contract"),
  81  | 		).toContainText("GET /v1/risk/agencies/:agencyId/kill-switch");
  82  | 
  83  | 		const emptyStates = page.locator('[data-testid="honest-state-empty"]');
  84  | 		await expect(emptyStates.first()).toBeVisible();
  85  | 	});
  86  | 
  87  | 	test("kill switch confirm dialog keeps principal fields read-only when status is ready", async ({
  88  | 		page,
  89  | 	}) => {
  90  | 		const agencyId = await openOperatorConsole(page);
  91  | 
  92  | 		const principalId = await page.evaluate(async () => {
  93  | 			const response = await fetch("/v1/auth/post-login-context", {
  94  | 				credentials: "include",
  95  | 				headers: { Accept: "application/json" },
  96  | 			});
  97  | 			if (!response.ok) {
  98  | 				return null;
  99  | 			}
  100 | 			const body = (await response.json()) as {
  101 | 				principal?: { id?: string } | null;
  102 | 			};
  103 | 			return body.principal?.id ?? null;
  104 | 		});
  105 | 		expect(principalId).toBeTruthy();
  106 | 
  107 | 		await page.route(
  108 | 			`**/v1/risk/agencies/${agencyId}/kill-switch`,
  109 | 			(route) =>
  110 | 				route.fulfill({
  111 | 					status: 200,
  112 | 					contentType: "application/json",
  113 | 					body: JSON.stringify({
  114 | 						organizationId: agencyId,
```