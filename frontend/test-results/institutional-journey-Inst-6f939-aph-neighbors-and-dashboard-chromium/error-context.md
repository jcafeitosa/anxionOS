# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: institutional-journey.spec.ts >> Institutional journey (login → Agency → grafo → dashboard) >> authenticated owner traverses agency API, graph neighbors, and dashboard
- Location: e2e/institutional-journey.spec.ts:41:2

# Error details

```
TimeoutError: page.waitForURL: Timeout 60000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/app**" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e5]:
      - generic [ref=e6]: Language
      - combobox "Language" [ref=e7] [cursor=pointer]:
        - option "Português (BR)" [selected]
        - option "English"
        - option "Español"
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: anxionOS
        - paragraph [ref=e16]: Governança institucional para investimentos autônomos
        - paragraph [ref=e17]: Agentes, capital e decisões conectados em um grafo auditável.
      - generic [ref=e19]:
        - banner [ref=e20]:
          - heading "Entrar na sua conta" [level=1] [ref=e21]
          - paragraph [ref=e22]: Acesse o console institucional da sua organização.
        - generic [ref=e23]:
          - generic [ref=e24]:
            - generic [ref=e25]: E-mail
            - textbox "E-mail" [ref=e26]: dev@anxionos.local
          - generic [ref=e27]:
            - generic [ref=e28]: Senha
            - textbox "Senha" [ref=e29]: anxionos-dev-pass
          - alert [ref=e30]:
            - generic [ref=e33]: Credenciais inválidas. Verifique e-mail e senha.
          - button "Entrar" [ref=e34] [cursor=pointer]
        - contentinfo [ref=e35]:
          - paragraph [ref=e36]:
            - text: Não tem conta?
            - link "Criar conta" [ref=e37] [cursor=pointer]:
              - /url: /register
            - text: ·
            - link "Esqueci a senha" [ref=e38] [cursor=pointer]:
              - /url: /forgot-password
  - generic [ref=e41]:
    - button [ref=e42]
    - button [ref=e48]
    - button [ref=e52]
    - button [ref=e57]
```

# Test source

```ts
  1  | import { expect, type Page } from "@playwright/test";
  2  | 
  3  | export const DEV_EMAIL = "dev@anxionos.local";
  4  | export const DEV_PASSWORD = process.env.DEV_SEED_PASSWORD ?? "anxionos-dev-pass";
  5  | 
  6  | export async function loginAsDevUser(page: Page): Promise<void> {
  7  | 	await page.goto("/login", { waitUntil: "domcontentloaded" });
  8  | 
  9  | 	const emailInput = page.getByRole("textbox", { name: /E-mail/i });
  10 | 	const passwordInput = page.getByRole("textbox", { name: /Senha/i });
  11 | 	const submitButton = page.getByRole("button", { name: /Entrar/i });
  12 | 
  13 | 	await emailInput.waitFor({ state: "visible", timeout: 60_000 });
  14 | 	await submitButton.waitFor({ state: "visible", timeout: 60_000 });
  15 | 
  16 | 	await emailInput.click();
  17 | 	await emailInput.fill(DEV_EMAIL);
  18 | 	await expect(emailInput).toHaveValue(DEV_EMAIL);
  19 | 
  20 | 	await passwordInput.click();
  21 | 	await passwordInput.fill(DEV_PASSWORD);
  22 | 	await expect(passwordInput).toHaveValue(DEV_PASSWORD);
  23 | 
  24 | 	await submitButton.click();
> 25 | 	await page.waitForURL("**/app**", { timeout: 60_000 });
     |             ^ TimeoutError: page.waitForURL: Timeout 60000ms exceeded.
  26 | 	await expect(page.getByRole("heading", { name: "Tempo real", exact: true })).toBeVisible({
  27 | 		timeout: 60_000,
  28 | 	});
  29 | }
  30 | 
```