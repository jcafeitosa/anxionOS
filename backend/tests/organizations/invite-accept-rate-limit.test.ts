import { afterEach, describe, expect, test } from "bun:test";
import {
	AppError,
	errorResponseSchema,
	isAppError,
	toErrorResponse,
} from "@anxionos/contracts/errors";
import {
	createInviteAcceptRateLimitStore,
	INVITE_ACCEPT_LIMIT,
	InMemoryInviteAcceptRateLimitStore,
	PostgresInviteAcceptRateLimitStore,
	resolveInviteAcceptRateLimitStoreKind,
} from "../../apps/api/src/organizations/invite-accept-rate-limit-store";

describe("invite accept rate limit store", () => {
	afterEach(() => {
		delete process.env.ORG_INVITE_ACCEPT_RATE_LIMIT_STORE;
		delete process.env.NODE_ENV;
	});

	/**
	 * O 429 tambem tem de sair do enum canonico: a versao anterior mutava um
	 * `VALIDATION_ERROR` (400) via `defineProperty` para `RATE_LIMITED`/429. Hoje
	 * canonico, mas o oraculo era fraco — so' checava `instanceof AppError`, entao
	 * um `code` fora de `ERROR_CODES` (envelope invalido) passaria (LOW do G4 na
	 * ANX-486). `isAppError` exige simultaneamente `code` conhecido e
	 * `statusCode === ERROR_STATUS_MAP[code]`.
	 */
	test("in-memory store blocks after limit", () => {
		const store = new InMemoryInviteAcceptRateLimitStore();
		for (let i = 0; i < INVITE_ACCEPT_LIMIT; i += 1) {
			store.assertWithinLimit("203.0.113.10");
		}
		let caught: unknown;
		try {
			store.assertWithinLimit("203.0.113.10");
		} catch (error) {
			caught = error;
		}
		expect(caught).toBeInstanceOf(AppError);
		expect(isAppError(caught)).toBe(true);
		const appError = caught as AppError;
		expect(appError.code).toBe("RATE_LIMITED");
		expect(appError.statusCode).toBe(429);
		expect(errorResponseSchema.safeParse(toErrorResponse(appError)).success).toBe(
			true,
		);
	});

	test("resolveInviteAcceptRateLimitStoreKind defaults to postgres when pool exists", () => {
		expect(resolveInviteAcceptRateLimitStoreKind({} as never)).toBe("postgres");
	});

	test("resolveInviteAcceptRateLimitStoreKind honors memory override", () => {
		process.env.ORG_INVITE_ACCEPT_RATE_LIMIT_STORE = "memory";
		expect(resolveInviteAcceptRateLimitStoreKind({} as never)).toBe("memory");
	});

	test("createInviteAcceptRateLimitStore forbids memory in production", () => {
		process.env.NODE_ENV = "production";
		process.env.ORG_INVITE_ACCEPT_RATE_LIMIT_STORE = "memory";
		expect(() => createInviteAcceptRateLimitStore()).toThrow(
			/In-memory invite accept rate limit is forbidden in production/,
		);
	});

	test("PostgresInviteAcceptRateLimitStore class is exported for distributed wiring", () => {
		expect(PostgresInviteAcceptRateLimitStore.name).toBe(
			"PostgresInviteAcceptRateLimitStore",
		);
	});
});

import {
	isTrustProxyEnabled,
	resolveClientIp,
} from "../../apps/api/src/organizations/client-ip";

describe("resolveClientIp", () => {
	afterEach(() => {
		delete process.env.TRUST_PROXY;
	});

	test("ignores X-Forwarded-For when TRUST_PROXY is false", () => {
		process.env.TRUST_PROXY = "false";
		const request = new Request(
			"http://localhost/v1/organizations/invites/accept",
			{
				headers: { "x-forwarded-for": "198.51.100.99" },
			},
		);
		const server = {
			requestIP: () => ({ address: "203.0.113.10" }),
		};
		expect(resolveClientIp(request, server)).toBe("203.0.113.10");
	});

	test("uses X-Forwarded-For when TRUST_PROXY is true", () => {
		process.env.TRUST_PROXY = "true";
		const request = new Request(
			"http://localhost/v1/organizations/invites/accept",
			{
				headers: { "x-forwarded-for": "198.51.100.99, 10.0.0.1" },
			},
		);
		const server = {
			requestIP: () => ({ address: "203.0.113.10" }),
		};
		expect(resolveClientIp(request, server)).toBe("198.51.100.99");
	});

	test("falls back to connection IP when TRUST_PROXY true but headers absent", () => {
		process.env.TRUST_PROXY = "true";
		const request = new Request(
			"http://localhost/v1/organizations/invites/accept",
		);
		const server = {
			requestIP: () => ({ address: "203.0.113.55" }),
		};
		expect(resolveClientIp(request, server)).toBe("203.0.113.55");
	});

	test("fails closed when no IP is available", () => {
		process.env.TRUST_PROXY = "false";
		const request = new Request(
			"http://localhost/v1/organizations/invites/accept",
			{
				headers: { "x-forwarded-for": "198.51.100.99" },
			},
		);
		expect(() => resolveClientIp(request)).toThrow(AppError);
	});

	/**
	 * ANX-486 — o codigo do envelope tem de pertencer ao enum canonico
	 * `ERROR_CODES`. Antes a funcao mutava um `AppError` via `defineProperty` para
	 * `CLIENT_IP_UNAVAILABLE`, que **nao existe** no catalogo, e o boundary
	 * devolvia esse codigo cru — envelope invalido contra `errorResponseSchema`.
	 */
	test("ANX-486: o 503 usa o codigo canonico e leva o motivo em details", () => {
		process.env.TRUST_PROXY = "false";
		const request = new Request(
			"http://localhost/v1/organizations/invites/accept",
			{ headers: { "x-forwarded-for": "198.51.100.99" } },
		);
		let caught: unknown;
		try {
			resolveClientIp(request);
		} catch (error) {
			caught = error;
		}
		expect(caught).toBeInstanceOf(AppError);
		const appError = caught as AppError;
		expect(appError.code).toBe("SERVICE_UNAVAILABLE");
		expect(appError.statusCode).toBe(503);
		expect(appError.details).toEqual({ code: "CLIENT_IP_UNAVAILABLE" });
	});

	test("isTrustProxyEnabled parses common truthy values", () => {
		process.env.TRUST_PROXY = "1";
		expect(isTrustProxyEnabled()).toBe(true);
		process.env.TRUST_PROXY = "yes";
		expect(isTrustProxyEnabled()).toBe(true);
		delete process.env.TRUST_PROXY;
		expect(isTrustProxyEnabled()).toBe(false);
	});
});
