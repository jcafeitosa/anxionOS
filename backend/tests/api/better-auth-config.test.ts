import { describe, expect, test } from "bun:test";
import {
	assertProductionBetterAuthBaseUrl,
	resolveBetterAuthConfig,
} from "../../apps/api/src/auth/create-better-auth";

describe("better auth config", () => {
	test("resolveBetterAuthConfig returns null when secret or base URL missing", () => {
		const previousSecret = process.env.BETTER_AUTH_SECRET;
		const previousUrl = process.env.BETTER_AUTH_URL;
		delete process.env.BETTER_AUTH_SECRET;
		delete process.env.BETTER_AUTH_URL;
		try {
			expect(resolveBetterAuthConfig()).toBeNull();
		} finally {
			if (previousSecret === undefined) {
				delete process.env.BETTER_AUTH_SECRET;
			} else {
				process.env.BETTER_AUTH_SECRET = previousSecret;
			}
			if (previousUrl === undefined) {
				delete process.env.BETTER_AUTH_URL;
			} else {
				process.env.BETTER_AUTH_URL = previousUrl;
			}
		}
	});

	test("assertProductionBetterAuthBaseUrl rejects http in production", () => {
		const previousNodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";
		try {
			expect(() =>
				assertProductionBetterAuthBaseUrl("http://api.example.test"),
			).toThrow(/https:\/\//);
			expect(() =>
				assertProductionBetterAuthBaseUrl("https://api.example.test"),
			).not.toThrow();
		} finally {
			if (previousNodeEnv === undefined) {
				delete process.env.NODE_ENV;
			} else {
				process.env.NODE_ENV = previousNodeEnv;
			}
		}
	});

	test("resolveBetterAuthConfig parses trusted origins", () => {
		const previousSecret = process.env.BETTER_AUTH_SECRET;
		const previousUrl = process.env.BETTER_AUTH_URL;
		const previousOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS;
		process.env.BETTER_AUTH_SECRET = "test-secret";
		process.env.BETTER_AUTH_URL = "http://localhost:3000";
		process.env.BETTER_AUTH_TRUSTED_ORIGINS =
			"http://localhost:4321, http://localhost:3000";
		try {
			expect(resolveBetterAuthConfig()).toEqual({
				secret: "test-secret",
				baseURL: "http://localhost:3000",
				trustedOrigins: ["http://localhost:4321", "http://localhost:3000"],
			});
		} finally {
			if (previousSecret === undefined) {
				delete process.env.BETTER_AUTH_SECRET;
			} else {
				process.env.BETTER_AUTH_SECRET = previousSecret;
			}
			if (previousUrl === undefined) {
				delete process.env.BETTER_AUTH_URL;
			} else {
				process.env.BETTER_AUTH_URL = previousUrl;
			}
			if (previousOrigins === undefined) {
				delete process.env.BETTER_AUTH_TRUSTED_ORIGINS;
			} else {
				process.env.BETTER_AUTH_TRUSTED_ORIGINS = previousOrigins;
			}
		}
	});
});

describe("smtp mail config", () => {
	test("resolveSmtpMailConfig is fail-closed without pass", async () => {
		const { resolveSmtpMailConfig } = await import(
			"../../apps/api/src/auth/smtp-mailer"
		);
		expect(
			resolveSmtpMailConfig({
				SMTP_USER: "juliocezaraquinofeitosa@gmail.com",
			}),
		).toBeNull();
	});

	test("resolveSmtpMailConfig accepts SMTP_PASS and Gmail defaults", async () => {
		const { resolveSmtpMailConfig } = await import(
			"../../apps/api/src/auth/smtp-mailer"
		);
		const resolved = resolveSmtpMailConfig({
			SMTP_USER: "juliocezaraquinofeitosa@gmail.com",
			SMTP_PASS: "fixture-app-password",
		});
		expect(resolved).toEqual({
			host: "smtp.gmail.com",
			port: 587,
			secure: false,
			user: "juliocezaraquinofeitosa@gmail.com",
			pass: "fixture-app-password",
			from: "juliocezaraquinofeitosa@gmail.com",
		});
	});

	test("SMTP_PASSWORD alias works", async () => {
		const { resolveSmtpMailConfig } = await import(
			"../../apps/api/src/auth/smtp-mailer"
		);
		const resolved = resolveSmtpMailConfig({
			SMTP_HOST: "smtp.gmail.com",
			SMTP_USER: "sender@example.test",
			SMTP_PASSWORD: "alias-only",
			SMTP_FROM: "noreply@example.test",
		});
		expect(resolved?.pass).toBe("alias-only");
		expect(resolved?.from).toBe("noreply@example.test");
	});
});
