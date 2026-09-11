import { afterEach, describe, expect, test } from "bun:test";
import {
	buildSandboxFetchInit,
	isPublicSandboxPath,
	resolveSandboxAuthToken,
} from "@anxionos/execution";

describe("sandbox-auth (ANX-162 S4)", () => {
	const originalToken = process.env.ENGINE_SANDBOX_AUTH_TOKEN;

	afterEach(() => {
		if (originalToken === undefined) {
			delete process.env.ENGINE_SANDBOX_AUTH_TOKEN;
		} else {
			process.env.ENGINE_SANDBOX_AUTH_TOKEN = originalToken;
		}
	});

	test("isPublicSandboxPath allows /health only", () => {
		expect(isPublicSandboxPath("/health")).toBe(true);
		expect(isPublicSandboxPath("/v1/getinfo")).toBe(false);
	});

	test("resolveSandboxAuthToken prefers explicit value then env", () => {
		delete process.env.ENGINE_SANDBOX_AUTH_TOKEN;
		expect(resolveSandboxAuthToken("explicit-token")).toBe("explicit-token");

		process.env.ENGINE_SANDBOX_AUTH_TOKEN = "env-token";
		expect(resolveSandboxAuthToken()).toBe("env-token");
		expect(resolveSandboxAuthToken("")).toBeUndefined();
	});

	test("buildSandboxFetchInit adds bearer when token is configured", () => {
		process.env.ENGINE_SANDBOX_AUTH_TOKEN = "dev-sandbox-auth-local-only";
		const init = buildSandboxFetchInit({ signal: AbortSignal.timeout(1000) });
		const headers = new Headers(init.headers);
		expect(headers.get("Authorization")).toBe(
			"Bearer dev-sandbox-auth-local-only",
		);
	});
});
