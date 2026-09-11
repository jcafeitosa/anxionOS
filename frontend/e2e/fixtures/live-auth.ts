import { expect, type Page } from "@playwright/test";

export const DEV_SEED_PASSWORD = "anxionos-dev-pass";

export const DEV_SEED_ACCOUNTS = {
	owner: "owner@anxionos.local",
	operator: "operator@anxionos.local",
	platform: "platform@anxionos.local",
	none: "none@anxionos.local",
	multi: "multi@anxionos.local",
} as const;

export async function signInLive(
	page: Page,
	email: string,
	password = DEV_SEED_PASSWORD,
): Promise<void> {
	await page.goto("/login");
	const submit = page.getByRole("button", { name: "Entrar" });
	await expect(submit).toBeEnabled({ timeout: 15_000 });
	await page.getByLabel("E-mail").fill(email);
	await page.getByLabel("Senha").fill(password);
	await submit.click();
}
