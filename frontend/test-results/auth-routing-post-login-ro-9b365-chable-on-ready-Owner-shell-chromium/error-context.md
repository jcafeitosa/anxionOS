# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-routing.spec.ts >> post-login routing (live Better Auth) >> skip-link is reachable on ready Owner shell
- Location: e2e/auth-routing.spec.ts:54:2

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator: getByRole('link', { name: 'Pular para o conteúdo principal' })
Expected: focused
Error: strict mode violation: getByRole('link', { name: 'Pular para o conteúdo principal' }) resolved to 2 elements:
    1) <a class="skip-link" href="#main-content">Pular para o conteúdo principal</a> aka getByRole('link', { name: 'Pular para o conteúdo' }).first()
    2) <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-background">Pular para o conteúdo principal</a> aka locator('astro-island').getByRole('link', { name: 'Pular para o conteúdo' })

Call log:
  - Expect "toBeFocused" getByRole('link', { name: 'Pular para o conteúdo principal' }) with timeout 5000ms
  - waiting for getByRole('link', { name: 'Pular para o conteúdo principal' })

```

# Page snapshot

```yaml
- generic [ref=f1e1]:
  - link "Pular para o conteúdo principal" [active] [ref=f1e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=f1e4]:
    - link "Pular para o conteúdo principal" [ref=f1e5] [cursor=pointer]:
      - /url: "#main-content"
    - complementary "Navegação principal" [ref=f1e6]:
      - generic [ref=f1e12]:
        - paragraph [ref=f1e13]: anxionOS
        - paragraph [ref=f1e14]: Owner Console
      - navigation "Menu Owner Console" [ref=f1e15]:
        - link "Visão geral" [ref=f1e16] [cursor=pointer]:
          - /url: /agency/2f5d7f34-2fd1-41ef-b84a-c3a750871c65
        - link "Equipe" [ref=f1e22] [cursor=pointer]:
          - /url: /agency/2f5d7f34-2fd1-41ef-b84a-c3a750871c65#team
        - link "Atividade" [ref=f1e28] [cursor=pointer]:
          - /url: /agency/2f5d7f34-2fd1-41ef-b84a-c3a750871c65#activity
        - link "Configurações" [ref=f1e31] [cursor=pointer]:
          - /url: /agency/2f5d7f34-2fd1-41ef-b84a-c3a750871c65#settings
    - generic [ref=f1e35]:
      - banner [ref=f1e36]:
        - generic [ref=f1e38]:
          - heading "Owner Console" [level=1] [ref=f1e39]
          - paragraph [ref=f1e40]: Agência 2f5d7f34-2fd1-41ef-b84a-c3a750871c65 · owner
        - status "Sessão" [ref=f1e41]:
          - generic [ref=f1e44]: owner@anxionos.local
      - main [ref=f1e45]:
        - generic [ref=f1e46]:
          - region [ref=f1e47]:
            - heading "Estado do console" [level=2] [ref=f1e48]
            - generic [ref=f1e49]:
              - article [ref=f1e50]:
                - generic [ref=f1e51]:
                  - generic [ref=f1e56]:
                    - heading "Acesso confirmado" [level=2] [ref=f1e57]
                    - paragraph [ref=f1e58]: Decisão vinda de GET /v1/auth/post-login-context — não do cliente.
                  - status "Autorizado" [ref=f1e59]
                - generic [ref=f1e62]:
                  - generic [ref=f1e63]:
                    - term [ref=f1e64]: decision.kind
                    - definition [ref=f1e65]: owner
                  - generic [ref=f1e66]:
                    - term [ref=f1e67]: reason
                    - definition [ref=f1e68]: MEMBERSHIP_OWNER
              - article [ref=f1e69]:
                - generic [ref=f1e70]:
                  - generic [ref=f1e75]:
                    - heading "Capacidades de produto" [level=2] [ref=f1e76]
                    - paragraph [ref=f1e77]: Agentes, portfólio e valuation não estão neste slice (ANX-143 / ANX-153).
                  - status "Pendente" [ref=f1e78]
                - paragraph [ref=f1e81]: "Placeholder P07 explícito: conteúdo operacional real só aparece quando a API existir. Nenhum C-level, tenant demo ou número financeiro é inventado aqui."
          - region [ref=f1e82]:
            - heading "Dados operacionais" [level=2] [ref=f1e83]
            - generic [ref=f1e84]:
              - paragraph [ref=f1e85]: Vazio
              - heading "Nenhum dado autoritativo neste console" [level=1] [ref=f1e86]
              - paragraph [ref=f1e87]: A API de agentes/posições ainda não alimenta esta superfície. O estado vazio é intencional.
      - contentinfo [ref=f1e88]: anxionOS · Owner Console · shells honestos ANX-297
  - generic [ref=f1e91]:
    - button [ref=f1e92]
    - button [ref=f1e98]
    - button [ref=f1e102]
    - button [ref=f1e107]
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
  15 | 	test("owner membership opens Owner console", async ({ page }) => {
  16 | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  17 | 		await expect(page).toHaveURL(/\/agency\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  18 | 		await expect(page.getByRole("heading", { name: "Owner Console" })).toBeVisible();
  19 | 		await expect(page.getByText("tn_demo_001")).toHaveCount(0);
  20 | 	});
  21 | 
  22 | 	test("operator membership opens Operator console", async ({ page }) => {
  23 | 		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
  24 | 		await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  25 | 		await expect(
  26 | 			page.getByRole("heading", { name: "Operator Console" }),
  27 | 		).toBeVisible();
  28 | 	});
  29 | 
  30 | 	test("zero memberships open onboarding", async ({ page }) => {
  31 | 		await signInLive(page, DEV_SEED_ACCOUNTS.none);
  32 | 		await expect(page).toHaveURL(/\/onboarding$/, { timeout: 20_000 });
  33 | 	});
  34 | 
  35 | 	test("multiple memberships open select-organization", async ({ page }) => {
  36 | 		await signInLive(page, DEV_SEED_ACCOUNTS.multi);
  37 | 		await expect(page).toHaveURL(/\/select-organization$/, { timeout: 20_000 });
  38 | 		await expect(
  39 | 			page.getByRole("heading", { name: "Escolher organização" }),
  40 | 		).toBeVisible();
  41 | 	});
  42 | 
  43 | 	test("without PLATFORM/partner grant does not open those consoles", async ({
  44 | 		page,
  45 | 	}) => {
  46 | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  47 | 		await expect(page).toHaveURL(/\/agency\//, { timeout: 20_000 });
  48 | 		await page.goto("/platform");
  49 | 		await expect(page).not.toHaveURL(/\/platform$/);
  50 | 		await page.goto("/partner");
  51 | 		await expect(page).not.toHaveURL(/\/partner$/);
  52 | 	});
  53 | 
  54 | 	test("skip-link is reachable on ready Owner shell", async ({ page }) => {
  55 | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  56 | 		await expect(page.getByRole("heading", { name: "Owner Console" })).toBeVisible({
  57 | 			timeout: 20_000,
  58 | 		});
  59 | 		await page.keyboard.press("Tab");
  60 | 		const skip = page.getByRole("link", { name: "Pular para o conteúdo principal" });
> 61 | 		await expect(skip).toBeFocused();
     |                      ^ Error: expect(locator).toBeFocused() failed
  62 | 	});
  63 | });
  64 | 
```