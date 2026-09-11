import { afterEach, describe, expect, test } from "bun:test";
import {
	FREQTRADE_REAL_WIRING_BLOCKERS,
	FreqtradeAdapter,
	mountFreqtradeAdapter,
	resolveFqtEngineMode,
	resolveFqtSandboxUrl,
} from "@anxionos/execution";

const permitInput = {
	organizationId: "org_demo",
	riskPermitId: "rp_01",
	intentHash: "intent_hash",
	authorityEpoch: 1,
	riskEpoch: 1,
};

const validLicense = "FQT-LICENSE-550e8400-e29b-41d4-a716-446655440000-1.0.0";

const healthyBody = {
	status: "ok",
	engine: "freqtrade",
	adapterId: "adapter-freqtrade",
	mode: "SIMULATED",
	version: "0.1.0-anx162-s5",
	simulated: true,
};

const realPingBody = {
	status: "pong",
	version: "2024.12-upstream",
	simulated: false,
};

function mockFetch(
	handler: (url: string) => Response | Promise<Response>,
): typeof fetch {
	return (async (input: RequestInfo | URL) => {
		const url = typeof input === "string" ? input : input.toString();
		return handler(url);
	}) as typeof fetch;
}

describe("FreqtradeAdapter (ANX-177)", () => {
	const originalSandboxUrl = process.env.FREQTRADE_SANDBOX_URL;
	const originalSandboxPort = process.env.FREQTRADE_SANDBOX_PORT;
	const originalEngineMode = process.env.ENGINE_MODE;

	afterEach(() => {
		if (originalSandboxUrl === undefined) {
			delete process.env.FREQTRADE_SANDBOX_URL;
		} else {
			process.env.FREQTRADE_SANDBOX_URL = originalSandboxUrl;
		}
		if (originalSandboxPort === undefined) {
			delete process.env.FREQTRADE_SANDBOX_PORT;
		} else {
			process.env.FREQTRADE_SANDBOX_PORT = originalSandboxPort;
		}
		if (originalEngineMode === undefined) {
			delete process.env.ENGINE_MODE;
		} else {
			process.env.ENGINE_MODE = originalEngineMode;
		}
	});

	test("resolveFqtSandboxUrl prefers explicit URL, then env, then port default", () => {
		delete process.env.FREQTRADE_SANDBOX_URL;
		delete process.env.FREQTRADE_SANDBOX_PORT;
		expect(resolveFqtSandboxUrl("http://sandbox.test:9000/")).toBe(
			"http://sandbox.test:9000",
		);

		process.env.FREQTRADE_SANDBOX_URL = "http://env.test:9055/";
		expect(resolveFqtSandboxUrl()).toBe("http://env.test:9055");

		delete process.env.FREQTRADE_SANDBOX_URL;
		process.env.FREQTRADE_SANDBOX_PORT = "9193";
		expect(resolveFqtSandboxUrl()).toBe("http://127.0.0.1:9193");
	});

	test("resolveFqtEngineMode defaults SIMULATED and accepts REAL", () => {
		delete process.env.ENGINE_MODE;
		expect(resolveFqtEngineMode()).toBe("SIMULATED");
		expect(resolveFqtEngineMode("REAL")).toBe("REAL");
		process.env.ENGINE_MODE = "real";
		expect(resolveFqtEngineMode()).toBe("REAL");
	});

	test("demo permit valid when sandbox /health reports SIMULATED ok", async () => {
		const adapter = new FreqtradeAdapter(validLicense, "demo-fqt-01", {
			sandboxUrl: "http://127.0.0.1:9055",
			fetchFn: mockFetch((url) => {
				expect(url).toBe("http://127.0.0.1:9055/health");
				return Response.json(healthyBody);
			}),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: true,
			failure: undefined,
		});
	});

	test("demo permit returns STALE when sandbox is unreachable", async () => {
		const adapter = new FreqtradeAdapter(validLicense, "demo-fqt-01", {
			sandboxUrl: "http://127.0.0.1:9055",
			fetchFn: mockFetch(() => {
				throw new Error("connection refused");
			}),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "STALE",
		});
	});

	test("demo permit returns STALE when /health body is not SIMULATED freqtrade", async () => {
		const adapter = new FreqtradeAdapter(validLicense, "demo-fqt-01", {
			fetchFn: mockFetch(() =>
				Response.json({
					...healthyBody,
					engine: "other-engine",
				}),
			),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "STALE",
		});
	});

	test("invalid license returns NOT_ISSUED without calling sandbox", async () => {
		let called = false;
		const adapter = new FreqtradeAdapter("bad-license", "demo-fqt-01", {
			fetchFn: mockFetch(() => {
				called = true;
				return Response.json(healthyBody);
			}),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "NOT_ISSUED",
		});
		expect(called).toBe(false);
	});

	test("live account stays STALE when ENGINE_MODE is SIMULATED", async () => {
		const adapter = new FreqtradeAdapter(validLicense, "live-fqt-01", {
			engineMode: "SIMULATED",
			fetchFn: mockFetch(() => Response.json(healthyBody)),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "STALE",
		});
	});

	test("live account valid when ENGINE_MODE REAL and /api/v1/ping is healthy", async () => {
		const adapter = new FreqtradeAdapter(validLicense, "live-fqt-01", {
			engineMode: "REAL",
			sandboxUrl: "https://fqt.test:9055",
			fetchFn: mockFetch((url) => {
				expect(url).toBe("https://fqt.test:9055/api/v1/ping");
				return Response.json(realPingBody);
			}),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: true,
			failure: undefined,
		});
	});

	test("live account STALE when ENGINE_MODE REAL but ping reports simulated stub", async () => {
		const adapter = new FreqtradeAdapter(validLicense, "live-fqt-01", {
			engineMode: "REAL",
			fetchFn: mockFetch(() =>
				Response.json({
					status: "ok",
					engine: "freqtrade-sandbox",
					simulated: true,
				}),
			),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "STALE",
		});
	});

	test("checkRealRuntimeHealth returns healthy=false when engine mode is SIMULATED", async () => {
		const adapter = new FreqtradeAdapter(validLicense, "demo-fqt-01", {
			engineMode: "SIMULATED",
		});
		expect(await adapter.checkRealRuntimeHealth()).toEqual({ healthy: false });
	});

	test("checkSandboxHealth returns healthy=false on non-OK HTTP status", async () => {
		const adapter = new FreqtradeAdapter(validLicense, "demo-fqt-01", {
			fetchFn: mockFetch(() => new Response("down", { status: 503 })),
		});

		expect(await adapter.checkSandboxHealth()).toEqual({ healthy: false });
	});

	test("mount helper returns stable venueAdapterRefId prefix", () => {
		expect(
			mountFreqtradeAdapter("org_1", validLicense, "demo-fqt")
				.venueAdapterRefId,
		).toBe("ex_vad_fqt_org_1");
	});

	test("FREQTRADE_REAL_WIRING_BLOCKERS documents upstream constraints", () => {
		expect(FREQTRADE_REAL_WIRING_BLOCKERS.upstreamRepo).toContain(
			"freqtrade/freqtrade",
		);
		expect(FREQTRADE_REAL_WIRING_BLOCKERS.dockerRuntime).toBeTruthy();
		expect(FREQTRADE_REAL_WIRING_BLOCKERS.dryRunSemantics).toBeTruthy();
	});
});
