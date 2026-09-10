# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-routing.spec.ts >> post-login routing (live Better Auth) >> zero memberships open onboarding
- Location: e2e/auth-routing.spec.ts:30:2

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/onboarding$/
Received string:  "http://127.0.0.1:4321/login?email=none%40anxionos.local&password=anxionos-dev-pass"
Timeout: 20000ms

Call log:
  - Expect "toHaveURL" with timeout 20000ms
    43 × locator resolved to <html lang="pt-BR">…</html>
       - unexpected value "http://127.0.0.1:4321/login?email=none%40anxionos.local&password=anxionos-dev-pass"

```

```yaml
- link "Pular para o conteúdo principal":
  - /url: "#main-content"
- paragraph: Sessão
- heading "Entrar" [level=1]
- paragraph: O destino após o login vem do loader autoritativo, não de um papel escolhido neste formulário.
- text: E-mail
- textbox "E-mail"
- text: Senha
- textbox "Senha"
- button "Mostrar"
- button "Entrar"
- link "Criar conta":
  - /url: /register
- link "Esqueci a senha":
  - /url: /forgot-password
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
> 32 | 		await expect(page).toHaveURL(/\/onboarding$/, { timeout: 20_000 });
     |                      ^ Error: expect(page).toHaveURL(expected) failed
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
  61 | 		await expect(skip).toBeFocused();
  62 | 	});
  63 | });
  64 | 
```