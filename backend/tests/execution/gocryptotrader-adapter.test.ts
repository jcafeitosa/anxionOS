import { afterEach, describe, expect, test } from "bun:test";
import {
	GCT_REAL_WIRING_BLOCKERS,
	GoCryptoTraderAdapter,
	mountGoCryptoTraderAdapter,
	resolveGctEngineMode,
	resolveGctSandboxUrl,
} from "@anxionos/execution";

const permitInput = {
	organizationId: "org_demo",
	riskPermitId: "rp_01",
	intentHash: "intent_hash",
	authorityEpoch: 1,
	riskEpoch: 1,
};

const validLicense = "GCT-LICENSE-550e8400-e29b-41d4-a716-446655440000-1.0.0";

const healthyBody = {
	status: "ok",
	engine: "gocryptotrader",
	adapterId: "adapter-gocryptotrader",
	mode: "SIMULATED",
	version: "0.1.0-anx162-s5",
	simulated: true,
};

const realInfoBody = {
	status: "ok",
	version: "1.0.0-upstream",
	uptime: "42s",
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

describe("GoCryptoTraderAdapter (ANX-175)", () => {
	const originalSandboxUrl = process.env.GCT_SANDBOX_URL;
	const originalSandboxPort = process.env.GCT_SANDBOX_PORT;
	const originalEngineMode = process.env.ENGINE_MODE;

	afterEach(() => {
		if (originalSandboxUrl === undefined) {
			delete process.env.GCT_SANDBOX_URL;
		} else {
			process.env.GCT_SANDBOX_URL = originalSandboxUrl;
		}
		if (originalSandboxPort === undefined) {
			delete process.env.GCT_SANDBOX_PORT;
		} else {
			process.env.GCT_SANDBOX_PORT = originalSandboxPort;
		}
		if (originalEngineMode === undefined) {
			delete process.env.ENGINE_MODE;
		} else {
			process.env.ENGINE_MODE = originalEngineMode;
		}
	});

	test("resolveGctSandboxUrl prefers explicit URL, then env, then port default", () => {
		delete process.env.GCT_SANDBOX_URL;
		delete process.env.GCT_SANDBOX_PORT;
		expect(resolveGctSandboxUrl("http://sandbox.test:9000/")).toBe(
			"http://sandbox.test:9000",
		);

		process.env.GCT_SANDBOX_URL = "http://env.test:9053/";
		expect(resolveGctSandboxUrl()).toBe("http://env.test:9053");

		delete process.env.GCT_SANDBOX_URL;
		process.env.GCT_SANDBOX_PORT = "9191";
		expect(resolveGctSandboxUrl()).toBe("http://127.0.0.1:9191");
	});

	test("resolveGctEngineMode defaults SIMULATED and accepts REAL", () => {
		delete process.env.ENGINE_MODE;
		expect(resolveGctEngineMode()).toBe("SIMULATED");
		expect(resolveGctEngineMode("REAL")).toBe("REAL");
		process.env.ENGINE_MODE = "real";
		expect(resolveGctEngineMode()).toBe("REAL");
	});

	test("demo permit valid when sandbox /health reports SIMULATED ok", async () => {
		const adapter = new GoCryptoTraderAdapter(validLicense, "demo-gct-01", {
			sandboxUrl: "http://127.0.0.1:9053",
			fetchFn: mockFetch((url) => {
				expect(url).toBe("http://127.0.0.1:9053/health");
				return Response.json(healthyBody);
			}),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: true,
			failure: undefined,
		});
	});

	test("demo permit returns STALE when sandbox is unreachable", async () => {
		const adapter = new GoCryptoTraderAdapter(validLicense, "demo-gct-01", {
			sandboxUrl: "http://127.0.0.1:9053",
			fetchFn: mockFetch(() => {
				throw new Error("connection refused");
			}),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "STALE",
		});
	});

	test("demo permit returns STALE when /health body is not SIMULATED gocryptotrader", async () => {
		const adapter = new GoCryptoTraderAdapter(validLicense, "demo-gct-01", {
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
		const adapter = new GoCryptoTraderAdapter("bad-license", "demo-gct-01", {
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
		const adapter = new GoCryptoTraderAdapter(validLicense, "live-gct-01", {
			engineMode: "SIMULATED",
			fetchFn: mockFetch(() => Response.json(healthyBody)),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "STALE",
		});
	});

	test("live account valid when ENGINE_MODE REAL and /v1/getinfo is healthy", async () => {
		const adapter = new GoCryptoTraderAdapter(validLicense, "live-gct-01", {
			engineMode: "REAL",
			sandboxUrl: "https://gct.test:9053",
			fetchFn: mockFetch((url) => {
				expect(url).toBe("https://gct.test:9053/v1/getinfo");
				return Response.json(realInfoBody);
			}),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: true,
			failure: undefined,
		});
	});

	test("live account STALE when ENGINE_MODE REAL but getinfo reports simulated stub", async () => {
		const adapter = new GoCryptoTraderAdapter(validLicense, "live-gct-01", {
			engineMode: "REAL",
			fetchFn: mockFetch(() =>
				Response.json({
					status: "ok",
					engine: "gocryptotrader-sandbox",
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
		const adapter = new GoCryptoTraderAdapter(validLicense, "demo-gct-01", {
			engineMode: "SIMULATED",
		});
		expect(await adapter.checkRealRuntimeHealth()).toEqual({ healthy: false });
	});

	test("checkSandboxHealth returns healthy=false on non-OK HTTP status", async () => {
		const adapter = new GoCryptoTraderAdapter(validLicense, "demo-gct-01", {
			fetchFn: mockFetch(() => new Response("down", { status: 503 })),
		});

		expect(await adapter.checkSandboxHealth()).toEqual({ healthy: false });
	});

	test("mount helper returns stable venueAdapterRefId prefix", () => {
		expect(
			mountGoCryptoTraderAdapter("org_1", validLicense, "demo-gct")
				.venueAdapterRefId,
		).toBe("ex_vad_goc_org_1");
	});

	test("GCT_REAL_WIRING_BLOCKERS documents upstream constraints", () => {
		expect(GCT_REAL_WIRING_BLOCKERS.upstreamRepo).toContain(
			"thrasher-corp/gocryptotrader",
		);
		expect(GCT_REAL_WIRING_BLOCKERS.noPublishedBinaries).toBeTruthy();
	});
});
