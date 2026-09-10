import { describe, expect, test } from "bun:test";
import { resolveBetterAuthConfig } from "../../apps/api/src/auth/create-better-auth";

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
