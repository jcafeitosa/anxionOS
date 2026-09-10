# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-routing.spec.ts >> post-login routing (live Better Auth) >> operator membership opens Operator console
- Location: e2e/auth-routing.spec.ts:22:2

# Error details

```
Error: expect(locator).toBeEnabled() failed

Locator:  getByRole('button', { name: 'Entrar' })
Expected: enabled
Received: disabled
Timeout:  15000ms

Call log:
  - Expect "toBeEnabled" getByRole('button', { name: 'Entrar' }) with timeout 15000ms
  - waiting for getByRole('button', { name: 'Entrar' })
    33 × locator resolved to <button disabled type="submit" class="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent px-4 font-semibold text-on-accent transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-60">Entrar</button>
       - unexpected value "disabled"

```

```yaml
- button "Entrar" [disabled]
```

# Test source

```ts
  1  | import { expect, type Page } from "@playwright/test";
  2  | 
  3  | export const DEV_SEED_PASSWORD = "anxionos-dev-pass";
  4  | 
  5  | export const DEV_SEED_ACCOUNTS = {
  6  | 	owner: "owner@anxionos.local",
  7  | 	operator: "operator@anxionos.local",
  8  | 	none: "none@anxionos.local",
  9  | 	multi: "multi@anxionos.local",
  10 | } as const;
  11 | 
  12 | export async function signInLive(
  13 | 	page: Page,
  14 | 	email: string,
  15 | 	password = DEV_SEED_PASSWORD,
  16 | ): Promise<void> {
  17 | 	await page.goto("/login");
  18 | 	const submit = page.getByRole("button", { name: "Entrar" });
> 19 | 	await expect(submit).toBeEnabled({ timeout: 15_000 });
     |                       ^ Error: expect(locator).toBeEnabled() failed
  20 | 	await page.getByLabel("E-mail").fill(email);
  21 | 	await page.getByLabel("Senha").fill(password);
  22 | 	await submit.click();
  23 | }
  24 | 
```