import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "list",
	use: {
		baseURL: "http://127.0.0.1:4321",
		trace: "on-first-retry",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: [
		{
			command: "node e2e/scripts/start-api-e2e.mjs",
			url: "http://127.0.0.1:3000/health",
			reuseExistingServer: process.env.E2E_REUSE_API === "1",
			timeout: 180_000,
		},
		{
			command: "node e2e/scripts/start-frontend-e2e.mjs",
			url: "http://127.0.0.1:4321",
			reuseExistingServer: process.env.E2E_REUSE_FRONTEND === "1",
			timeout: 120_000,
		},
	],
});
