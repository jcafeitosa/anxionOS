import { afterEach, describe, expect, test } from "bun:test";
import {
	mountXChangeAdapter,
	resolveXchEngineMode,
	resolveXchSandboxUrl,
	XCHANGE_REAL_WIRING_BLOCKERS,
	XChangeAdapter,
} from "@anxionos/execution";

const permitInput = {
	organizationId: "org_demo",
	riskPermitId: "rp_01",
	intentHash: "intent_hash",
	authorityEpoch: 1,
	riskEpoch: 1,
};

const validLicense = "XCH-LICENSE-550e8400-e29b-41d4-a716-446655440000-1.0.0";

const healthyBody = {
	status: "ok",
	engine: "xchange",
	adapterId: "adapter-xchange",
	mode: "SIMULATED",
	version: "0.1.0-anx162-s5",
	simulated: true,
};

const realHealthBody = {
	status: "up",
	version: "5.2.0-upstream",
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

describe("XChangeAdapter (ANX-178)", () => {
	const originalSandboxUrl = process.env.XCHANGE_SANDBOX_URL;
	const originalSandboxPort = process.env.XCHANGE_SANDBOX_PORT;
	const originalEngineMode = process.env.ENGINE_MODE;

	afterEach(() => {
		if (originalSandboxUrl === undefined) {
			delete process.env.XCHANGE_SANDBOX_URL;
		} else {
			process.env.XCHANGE_SANDBOX_URL = originalSandboxUrl;
		}
		if (originalSandboxPort === undefined) {
			delete process.env.XCHANGE_SANDBOX_PORT;
		} else {
			process.env.XCHANGE_SANDBOX_PORT = originalSandboxPort;
		}
		if (originalEngineMode === undefined) {
			delete process.env.ENGINE_MODE;
		} else {
			process.env.ENGINE_MODE = originalEngineMode;
		}
	});

	test("resolveXchSandboxUrl prefers explicit URL, then env, then port default", () => {
		delete process.env.XCHANGE_SANDBOX_URL;
		delete process.env.XCHANGE_SANDBOX_PORT;
		expect(resolveXchSandboxUrl("http://sandbox.test:9000/")).toBe(
			"http://sandbox.test:9000",
		);

		process.env.XCHANGE_SANDBOX_URL = "http://env.test:9056/";
		expect(resolveXchSandboxUrl()).toBe("http://env.test:9056");

		delete process.env.XCHANGE_SANDBOX_URL;
		process.env.XCHANGE_SANDBOX_PORT = "9196";
		expect(resolveXchSandboxUrl()).toBe("http://127.0.0.1:9196");
	});

	test("resolveXchEngineMode defaults SIMULATED and accepts REAL", () => {
		delete process.env.ENGINE_MODE;
		expect(resolveXchEngineMode()).toBe("SIMULATED");
		expect(resolveXchEngineMode("REAL")).toBe("REAL");
		process.env.ENGINE_MODE = "real";
		expect(resolveXchEngineMode()).toBe("REAL");
	});

	test("demo permit valid when sandbox /health reports SIMULATED ok", async () => {
		const adapter = new XChangeAdapter(validLicense, "demo-xch-01", {
			sandboxUrl: "http://127.0.0.1:9056",
			fetchFn: mockFetch((url) => {
				expect(url).toBe("http://127.0.0.1:9056/health");
				return Response.json(healthyBody);
			}),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: true,
			failure: undefined,
		});
	});

	test("demo permit returns STALE when sandbox is unreachable", async () => {
		const adapter = new XChangeAdapter(validLicense, "demo-xch-01", {
			sandboxUrl: "http://127.0.0.1:9056",
			fetchFn: mockFetch(() => {
				throw new Error("connection refused");
			}),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "STALE",
		});
	});

	test("demo permit returns STALE when /health body is not SIMULATED xchange", async () => {
		const adapter = new XChangeAdapter(validLicense, "demo-xch-01", {
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
		const adapter = new XChangeAdapter("bad-license", "demo-xch-01", {
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
		const adapter = new XChangeAdapter(validLicense, "live-xch-01", {
			engineMode: "SIMULATED",
			fetchFn: mockFetch(() => Response.json(healthyBody)),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "STALE",
		});
	});

	test("live account valid when ENGINE_MODE REAL and /api/v1/health is healthy", async () => {
		const adapter = new XChangeAdapter(validLicense, "live-xch-01", {
			engineMode: "REAL",
			sandboxUrl: "https://xch.test:9056",
			fetchFn: mockFetch((url) => {
				expect(url).toBe("https://xch.test:9056/api/v1/health");
				return Response.json(realHealthBody);
			}),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: true,
			failure: undefined,
		});
	});

	test("live account STALE when ENGINE_MODE REAL but health reports simulated stub", async () => {
		const adapter = new XChangeAdapter(validLicense, "live-xch-01", {
			engineMode: "REAL",
			fetchFn: mockFetch(() =>
				Response.json({
					status: "ok",
					engine: "xchange-sandbox",
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
		const adapter = new XChangeAdapter(validLicense, "demo-xch-01", {
			engineMode: "SIMULATED",
		});
		expect(await adapter.checkRealRuntimeHealth()).toEqual({ healthy: false });
	});

	test("checkSandboxHealth returns healthy=false on non-OK HTTP status", async () => {
		const adapter = new XChangeAdapter(validLicense, "demo-xch-01", {
			fetchFn: mockFetch(() => new Response("down", { status: 503 })),
		});

		expect(await adapter.checkSandboxHealth()).toEqual({ healthy: false });
	});

	test("mount helper returns stable venueAdapterRefId prefix", () => {
		expect(
			mountXChangeAdapter("org_1", validLicense, "demo-xch").venueAdapterRefId,
		).toBe("ex_vad_xch_org_1");
	});

	test("XCHANGE_REAL_WIRING_BLOCKERS documents upstream constraints", () => {
		expect(XCHANGE_REAL_WIRING_BLOCKERS.upstreamRepo).toContain(
			"knowm/XChange",
		);
		expect(XCHANGE_REAL_WIRING_BLOCKERS.javaBridgeRuntime).toBeTruthy();
		expect(XCHANGE_REAL_WIRING_BLOCKERS.multiExchangeSemantics).toBeTruthy();
	});
});
