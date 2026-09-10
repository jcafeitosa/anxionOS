import { expect, test } from "@playwright/test";

test.describe("auth smoke", () => {
	test("login page renders", async ({ page }) => {
		await page.goto("/login");
		await expect(page).toHaveTitle(/Entrar/);
		await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
		await expect(page.getByLabel("E-mail")).toBeVisible();
	});

	test("register page renders", async ({ page }) => {
		await page.goto("/register");
		await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible();
		await expect(page.getByLabel("Nome")).toBeVisible();
	});

	test("forgot-password is honest about SMTP", async ({ page }) => {
		await page.goto("/forgot-password");
		await expect(page.getByRole("heading", { name: "Esqueci a senha" })).toBeVisible();
		await page.getByLabel("E-mail").fill("owner@anxionos.local");
		await page.getByRole("button", { name: "Solicitar recuperação" }).click();
		await expect(page.getByRole("status")).toContainText("SMTP não está montado");
	});

	test("MFA page is pending honest without QR", async ({ page }) => {
		await page.goto("/mfa");
		await expect(page.getByRole("heading", { name: "MFA pendente" })).toBeVisible();
		await expect(page.getByText(/QR/i)).toContainText("Nenhum QR");
	});
});
