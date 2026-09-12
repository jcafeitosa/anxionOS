import { afterEach, describe, expect, test } from "bun:test";
import {
	AppError,
	errorResponseSchema,
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
	 * ANX-486). O que fecha o achado e' a validacao do **envelope** contra
	 * `errorResponseSchema`; `isAppError` NAO serve de oraculo aqui, porque
	 * curto-circuita em `instanceof AppError` e devolve `true` sem olhar o enum
	 * (provado no G2 da ANX-460) — por isso ele nao aparece neste teste.
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
		const appError = caught as AppError;
		expect(appError.code).toBe("RATE_LIMITED");
		expect(appError.statusCode).toBe(429);
		expect(
			errorResponseSchema.safeParse(toErrorResponse(appError)).success,
		).toBe(true);
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
	DEFAULT_TRUSTED_PROXY_HOPS,
	isTrustProxyEnabled,
	resolveClientIp,
	resolveTrustedProxyHops,
} from "../../apps/api/src/organizations/client-ip";

describe("resolveClientIp", () => {
	afterEach(() => {
		delete process.env.TRUST_PROXY;
		delete process.env.TRUSTED_PROXY_HOPS;
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

	/**
	 * ANX-491 — antes desta correcao `resolveClientIp` usava o hop MAIS A'
	 * ESQUERDA do XFF (`"198.51.100.99, 10.0.0.1"` -> `"198.51.100.99"`), que e'
	 * o campo controlado pelo cliente: rotacionando-o, o rate limit de
	 * accept-invite era contornado integralmente (medido 15/15 sem 429 pelo G5).
	 * A semantica correta com `TRUSTED_PROXY_HOPS=1` (default, um proxy
	 * confiavel na frente) e' o hop mais A' DIREITA — o valor que o proxy
	 * confiavel escreveu, nao o que o cliente enviou.
	 */
	test("ANX-491: usa o hop mais a' direita do X-Forwarded-For (nao o mais a' esquerda) quando TRUST_PROXY e' true", () => {
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
		expect(resolveClientIp(request, server)).toBe("10.0.0.1");
	});

	/**
	 * ANX-491 (oraculo) — o hop mais a' esquerda e' puramente controlado pelo
	 * cliente. Rotacionando-o em cada requisicao, o hop mais a' direita (o que
	 * o proxy confiavel escreveu) permanece ESTAVEL: a chave de rate limit
	 * derivada nao muda, entao rotacionar o header nao contorna o limite.
	 */
	test("ANX-491: XFF rotativo a' esquerda nao muda o IP derivado (hops=1)", () => {
		process.env.TRUST_PROXY = "true";
		const server = {
			requestIP: () => ({ address: "203.0.113.10" }),
		};
		const forgedLeftValues = [
			"1.1.1.1",
			"2.2.2.2",
			"9.9.9.9",
			"evil-not-even-an-ip",
			"127.0.0.1",
		];
		const derived = forgedLeftValues.map((forged) => {
			const request = new Request(
				"http://localhost/v1/organizations/invites/accept",
				{ headers: { "x-forwarded-for": `${forged}, 203.0.113.7` } },
			);
			return resolveClientIp(request, server);
		});
		for (const ip of derived) {
			expect(ip).toBe("203.0.113.7");
		}
	});

	/**
	 * ANX-491 — oraculo principal da issue: N requisicoes do MESMO cliente com
	 * XFF rotativo (a esquerda) tem de produzir 429 na 11a, exatamente como um
	 * XFF fixo produziria. Prova que a chave do rate limit nao deriva de campo
	 * controlado pelo cliente.
	 */
	test("ANX-491: XFF rotativo produz 429 na 11a requisicao do mesmo cliente (chave de rate limit estavel)", () => {
		process.env.TRUST_PROXY = "true";
		const server = {
			requestIP: () => ({ address: "203.0.113.10" }),
		};
		const store = new InMemoryInviteAcceptRateLimitStore();
		const deriveIpWithRotatingHeader = (attempt: number) => {
			const request = new Request(
				"http://localhost/v1/organizations/invites/accept",
				{
					headers: {
						// hop mais a' esquerda MUDA a cada requisicao (bypass tentado).
						"x-forwarded-for": `10.${attempt}.${attempt}.${attempt}, 203.0.113.7`,
					},
				},
			);
			return resolveClientIp(request, server);
		};
		for (let i = 0; i < INVITE_ACCEPT_LIMIT; i += 1) {
			const ip = deriveIpWithRotatingHeader(i);
			expect(ip).toBe("203.0.113.7");
			store.assertWithinLimit(ip);
		}
		const eleventhIp = deriveIpWithRotatingHeader(INVITE_ACCEPT_LIMIT);
		expect(eleventhIp).toBe("203.0.113.7");
		let caught: unknown;
		try {
			store.assertWithinLimit(eleventhIp);
		} catch (error) {
			caught = error;
		}
		expect(caught).toBeInstanceOf(AppError);
		expect((caught as AppError).code).toBe("RATE_LIMITED");
		expect((caught as AppError).statusCode).toBe(429);
	});

	test("ANX-491: TRUSTED_PROXY_HOPS=2 conta a partir da direita com 3 hops", () => {
		process.env.TRUST_PROXY = "true";
		process.env.TRUSTED_PROXY_HOPS = "2";
		const request = new Request(
			"http://localhost/v1/organizations/invites/accept",
			{
				headers: {
					// [forjado pelo cliente], cliente, proxy1 — 2 hops confiaveis
					// (cliente + proxy1) contados a partir da direita: index = 3-2 = 1.
					"x-forwarded-for": "9.9.9.9, 203.0.113.7, 10.0.0.1",
				},
			},
		);
		const server = {
			requestIP: () => ({ address: "203.0.113.10" }),
		};
		expect(resolveClientIp(request, server)).toBe("203.0.113.7");
	});

	test("ANX-491: header mais curto que TRUSTED_PROXY_HOPS nao confia no header e cai para IP de conexao", () => {
		process.env.TRUST_PROXY = "true";
		process.env.TRUSTED_PROXY_HOPS = "3";
		const request = new Request(
			"http://localhost/v1/organizations/invites/accept",
			{
				headers: { "x-forwarded-for": "198.51.100.99, 10.0.0.1" },
			},
		);
		const server = {
			requestIP: () => ({ address: "203.0.113.55" }),
		};
		expect(resolveClientIp(request, server)).toBe("203.0.113.55");
	});

	test("ANX-491: TRUSTED_PROXY_HOPS invalido ou ausente usa o default documentado", () => {
		delete process.env.TRUSTED_PROXY_HOPS;
		expect(resolveTrustedProxyHops()).toBe(DEFAULT_TRUSTED_PROXY_HOPS);
		process.env.TRUSTED_PROXY_HOPS = "not-a-number";
		expect(resolveTrustedProxyHops()).toBe(DEFAULT_TRUSTED_PROXY_HOPS);
		process.env.TRUSTED_PROXY_HOPS = "-1";
		expect(resolveTrustedProxyHops()).toBe(DEFAULT_TRUSTED_PROXY_HOPS);
	});

	test("ANX-491: TRUSTED_PROXY_HOPS=0 desabilita a confianca no X-Forwarded-For", () => {
		process.env.TRUST_PROXY = "true";
		process.env.TRUSTED_PROXY_HOPS = "0";
		const request = new Request(
			"http://localhost/v1/organizations/invites/accept",
			{
				headers: { "x-forwarded-for": "198.51.100.99, 10.0.0.1" },
			},
		);
		const server = {
			requestIP: () => ({ address: "203.0.113.55" }),
		};
		expect(resolveClientIp(request, server)).toBe("203.0.113.55");
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
