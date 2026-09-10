# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-routing.spec.ts >> post-login routing (live Better Auth) >> owner membership opens Owner dashboard from loader
- Location: e2e/auth-routing.spec.ts:15:2

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('owner-dashboard')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByTestId('owner-dashboard') with timeout 5000ms
  - waiting for getByTestId('owner-dashboard')

```

```yaml
- link "Pular para o conteúdo principal":
  - /url: "#main-content"
- complementary "Navegação principal":
  - paragraph: anxionOS
  - paragraph: Owner Console
  - navigation "Menu Owner Console":
    - link "Visão geral":
      - /url: /agency/2f5d7f34-2fd1-41ef-b84a-c3a750871c65
    - link "Equipe":
      - /url: /agency/2f5d7f34-2fd1-41ef-b84a-c3a750871c65#team
    - link "Atividade":
      - /url: /agency/2f5d7f34-2fd1-41ef-b84a-c3a750871c65#activity
    - link "Configurações":
      - /url: /agency/2f5d7f34-2fd1-41ef-b84a-c3a750871c65#settings
- banner:
  - heading "Owner Console" [level=1]
  - paragraph: Agência 2f5d7f34-2fd1-41ef-b84a-c3a750871c65 · owner
  - status "Sessão": owner@anxionos.local
- main:
  - region "Trilha de autorização":
    - heading "Trilha de autorização" [level=2]
    - list:
      - listitem:
        - paragraph: Sessão
        - paragraph: frontend · Better Auth
      - listitem:
        - paragraph: post-login-context
        - paragraph: backend · GET /v1/auth/post-login-context
      - listitem:
        - paragraph: Owner Console
        - paragraph: security · owner · MEMBERSHIP_OWNER
  - region "Estado do console":
    - heading "Estado do console" [level=2]
    - article:
      - heading "Acesso confirmado" [level=2]
      - paragraph: Decisão vinda de GET /v1/auth/post-login-context — não do cliente.
      - status "Autorizado"
      - term: decision.kind
      - definition: owner
      - term: reason
      - definition: MEMBERSHIP_OWNER
    - article:
      - heading "Capacidades de produto" [level=2]
      - paragraph: Agentes, portfólio e valuation não estão neste slice (ANX-143 / ANX-153).
      - status "Pendente"
      - paragraph: "Placeholder P07 explícito: conteúdo operacional real só aparece quando a API existir. Nenhum C-level, tenant demo ou número financeiro é inventado aqui."
  - region "Dados operacionais":
    - heading "Dados operacionais" [level=2]
    - paragraph: Vazio
    - heading "Nenhum dado autoritativo neste console" [level=1]
    - paragraph: A API de agentes/posições ainda não alimenta esta superfície. O estado vazio é intencional.
- contentinfo: anxionOS · Owner Console · shells honestos ANX-297
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { DEV_SEED_ACCOUNTS, signInLive } from "./fixtures/live-auth";
  3  | 
  4  | test.describe("post-login routing (live Better Auth)", () => {
  5  | 	test("unauthenticated landing stays public", async ({ page }) => {
  6  | 		await page.goto("/");
  7  | 		await expect(
  8  | 			page.getByRole("heading", {
  9  | 				name: "Investimentos autônomos com governança institucional",
  10 | 			}),
  11 | 		).toBeVisible();
  12 | 		await expect(page.getByRole("link", { name: "Entrar" }).first()).toBeVisible();
  13 | 	});
  14 | 
  15 | 	test("owner membership opens Owner dashboard from loader", async ({ page }) => {
  16 | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  17 | 		await expect(page).toHaveURL(/\/agency\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  18 | 		await expect(page.getByRole("heading", { name: "Owner Console" })).toBeVisible();
> 19 | 		await expect(page.getByTestId("owner-dashboard")).toBeVisible();
     |                                                     ^ Error: expect(locator).toBeVisible() failed
  20 | 		await expect(page.getByTestId("archify-canvas")).toBeVisible();
  21 | 		const url = page.url();
  22 | 		const agencyId = url.match(/\/agency\/([0-9a-f-]{36})$/)?.[1];
  23 | 		expect(agencyId).toBeTruthy();
  24 | 		await expect(page.getByTestId("owner-membership")).toContainText(agencyId!);
  25 | 		await expect(page.getByTestId("owner-membership")).toContainText("owner");
  26 | 		await expect(page.getByTestId("owner-platform-grant")).toContainText(
  27 | 			"platformAccess=false",
  28 | 		);
  29 | 		await expect(page.getByTestId("owner-operational-empty")).toContainText(
  30 | 			"Agentes e portfólio ainda não alimentam este console",
  31 | 		);
  32 | 		await expect(page.getByText("tn_demo_001")).toHaveCount(0);
  33 | 		await expect(page.getByText("C-level")).toHaveCount(0);
  34 | 	});
  35 | 
  36 | 	test("operator membership opens Operator console", async ({ page }) => {
  37 | 		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
  38 | 		await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  39 | 		await expect(
  40 | 			page.getByRole("heading", { name: "Operator Console" }),
  41 | 		).toBeVisible();
  42 | 	});
  43 | 
  44 | 	test("zero memberships open onboarding", async ({ page }) => {
  45 | 		await signInLive(page, DEV_SEED_ACCOUNTS.none);
  46 | 		await expect(page).toHaveURL(/\/onboarding$/, { timeout: 20_000 });
  47 | 	});
  48 | 
  49 | 	test("multiple memberships open select-organization", async ({ page }) => {
  50 | 		await signInLive(page, DEV_SEED_ACCOUNTS.multi);
  51 | 		await expect(page).toHaveURL(/\/select-organization$/, { timeout: 20_000 });
  52 | 		await expect(
  53 | 			page.getByRole("heading", { name: "Escolher organização" }),
  54 | 		).toBeVisible();
  55 | 	});
  56 | 
  57 | 	test("without PLATFORM/partner grant does not open those consoles", async ({
  58 | 		page,
  59 | 	}) => {
  60 | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  61 | 		await expect(page).toHaveURL(/\/agency\//, { timeout: 20_000 });
  62 | 		await page.goto("/platform");
  63 | 		await expect(page).not.toHaveURL(/\/platform$/);
  64 | 		await page.goto("/partner");
  65 | 		await expect(page).not.toHaveURL(/\/partner$/);
  66 | 	});
  67 | 
  68 | 	test("skip-link is reachable on ready Owner shell", async ({ page }) => {
  69 | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  70 | 		await expect(page.getByRole("heading", { name: "Owner Console" })).toBeVisible({
  71 | 			timeout: 20_000,
  72 | 		});
  73 | 		await page.keyboard.press("Tab");
  74 | 		const skip = page.getByRole("link", { name: "Pular para o conteúdo principal" });
  75 | 		await expect(skip).toBeFocused();
  76 | 	});
  77 | });
  78 | 
```