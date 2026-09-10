import { afterEach, describe, expect, test } from "bun:test";
import { assertOrganizationsStartupEnv } from "../../apps/api/src/organizations/bootstrap";

const ORIGINAL = process.env.ORG_INVITE_TOKEN_PEPPER;

afterEach(() => {
	if (ORIGINAL === undefined) {
		delete process.env.ORG_INVITE_TOKEN_PEPPER;
	} else {
		process.env.ORG_INVITE_TOKEN_PEPPER = ORIGINAL;
	}
});

describe("organizations bootstrap", () => {
	test("assertOrganizationsStartupEnv fails without pepper in production", () => {
		const prevNodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";
		delete process.env.ORG_INVITE_TOKEN_PEPPER;
		expect(() => assertOrganizationsStartupEnv()).toThrow(
			"ORG_INVITE_TOKEN_PEPPER is required",
		);
		process.env.NODE_ENV = prevNodeEnv;
	});

	test("assertOrganizationsStartupEnv uses dev fallback outside production", () => {
		const prevNodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "development";
		delete process.env.ORG_INVITE_TOKEN_PEPPER;
		expect(() => assertOrganizationsStartupEnv()).not.toThrow();
		process.env.NODE_ENV = prevNodeEnv;
	});

	test("assertOrganizationsStartupEnv passes with pepper", () => {
		process.env.ORG_INVITE_TOKEN_PEPPER = "test-pepper-value";
		expect(() => assertOrganizationsStartupEnv()).not.toThrow();
	});
});
