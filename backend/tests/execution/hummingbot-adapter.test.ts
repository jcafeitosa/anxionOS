import { afterEach, describe, expect, test } from "bun:test";
import {
	HummingbotAdapter,
	HMB_REAL_WIRING_BLOCKERS,
	mountHummingbotAdapter,
	resolveHmbEngineMode,
	resolveHmbSandboxUrl,
} from "@anxionos/execution";

const permitInput = {
	organizationId: "org_demo",
	riskPermitId: "rp_01",
	intentHash: "intent_hash",
	authorityEpoch: 1,
	riskEpoch: 1,
};

const validLicense = "HMB-LICENSE-550e8400-e29b-41d4-a716-446655440000-1.0.0";

const healthyBody = {
	status: "ok",
	engine: "hummingbot",
	adapterId: "adapter-hummingbot",
	mode: "SIMULATED",
	version: "0.1.0-anx162-s5",
	simulated: true,
};

const realStatusBody = {
	status: "ok",
	version: "2.0.0-upstream",
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

describe("HummingbotAdapter (ANX-176)", () => {
	const originalSandboxUrl = process.env.HUMMINGBOT_SANDBOX_URL;
	const originalSandboxPort = process.env.HUMMINGBOT_SANDBOX_PORT;
	const originalEngineMode = process.env.ENGINE_MODE;

	afterEach(() => {
		if (originalSandboxUrl === undefined) {
			delete process.env.HUMMINGBOT_SANDBOX_URL;
		} else {
			process.env.HUMMINGBOT_SANDBOX_URL = originalSandboxUrl;
		}
		if (originalSandboxPort === undefined) {
			delete process.env.HUMMINGBOT_SANDBOX_PORT;
		} else {
			process.env.HUMMINGBOT_SANDBOX_PORT = originalSandboxPort;
		}
		if (originalEngineMode === undefined) {
			delete process.env.ENGINE_MODE;
		} else {
			process.env.ENGINE_MODE = originalEngineMode;
		}
	});

	test("resolveHmbSandboxUrl prefers explicit URL, then env, then port default", () => {
		delete process.env.HUMMINGBOT_SANDBOX_URL;
		delete process.env.HUMMINGBOT_SANDBOX_PORT;
		expect(resolveHmbSandboxUrl("http://sandbox.test:9000/")).toBe(
			"http://sandbox.test:9000",
		);

		process.env.HUMMINGBOT_SANDBOX_URL = "http://env.test:9054/";
		expect(resolveHmbSandboxUrl()).toBe("http://env.test:9054");

		delete process.env.HUMMINGBOT_SANDBOX_URL;
		process.env.HUMMINGBOT_SANDBOX_PORT = "9192";
		expect(resolveHmbSandboxUrl()).toBe("http://127.0.0.1:9192");
	});

	test("resolveHmbEngineMode defaults SIMULATED and accepts REAL", () => {
		delete process.env.ENGINE_MODE;
		expect(resolveHmbEngineMode()).toBe("SIMULATED");
		expect(resolveHmbEngineMode("REAL")).toBe("REAL");
		process.env.ENGINE_MODE = "real";
		expect(resolveHmbEngineMode()).toBe("REAL");
	});

	test("demo permit valid when sandbox /health reports SIMULATED ok", async () => {
		const adapter = new HummingbotAdapter(validLicense, "demo-hmb-01", {
			sandboxUrl: "http://127.0.0.1:9054",
			fetchFn: mockFetch((url) => {
				expect(url).toBe("http://127.0.0.1:9054/health");
				return Response.json(healthyBody);
			}),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: true,
			failure: undefined,
		});
	});

	test("demo permit returns STALE when sandbox is unreachable", async () => {
		const adapter = new HummingbotAdapter(validLicense, "demo-hmb-01", {
			sandboxUrl: "http://127.0.0.1:9054",
			fetchFn: mockFetch(() => {
				throw new Error("connection refused");
			}),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "STALE",
		});
	});

	test("demo permit returns STALE when /health body is not SIMULATED hummingbot", async () => {
		const adapter = new HummingbotAdapter(validLicense, "demo-hmb-01", {
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
		const adapter = new HummingbotAdapter("bad-license", "demo-hmb-01", {
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
		const adapter = new HummingbotAdapter(validLicense, "live-hmb-01", {
			engineMode: "SIMULATED",
			fetchFn: mockFetch(() => Response.json(healthyBody)),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "STALE",
		});
	});

	test("live account valid when ENGINE_MODE REAL and /v1/status is healthy", async () => {
		const adapter = new HummingbotAdapter(validLicense, "live-hmb-01", {
			engineMode: "REAL",
			sandboxUrl: "https://hmb.test:9054",
			fetchFn: mockFetch((url) => {
				expect(url).toBe("https://hmb.test:9054/v1/status");
				return Response.json(realStatusBody);
			}),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: true,
			failure: undefined,
		});
	});

	test("live account STALE when ENGINE_MODE REAL but status reports simulated stub", async () => {
		const adapter = new HummingbotAdapter(validLicense, "live-hmb-01", {
			engineMode: "REAL",
			fetchFn: mockFetch(() =>
				Response.json({
					status: "ok",
					engine: "hummingbot-sandbox",
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
		const adapter = new HummingbotAdapter(validLicense, "demo-hmb-01", {
			engineMode: "SIMULATED",
		});
		expect(await adapter.checkRealRuntimeHealth()).toEqual({ healthy: false });
	});

	test("checkSandboxHealth returns healthy=false on non-OK HTTP status", async () => {
		const adapter = new HummingbotAdapter(validLicense, "demo-hmb-01", {
			fetchFn: mockFetch(() => new Response("down", { status: 503 })),
		});

		expect(await adapter.checkSandboxHealth()).toEqual({ healthy: false });
	});

	test("mount helper returns stable venueAdapterRefId prefix", () => {
		expect(
			mountHummingbotAdapter("org_1", validLicense, "demo-hmb")
				.venueAdapterRefId,
		).toBe("ex_vad_hmb_org_1");
	});

	test("HMB_REAL_WIRING_BLOCKERS documents upstream constraints", () => {
		expect(HMB_REAL_WIRING_BLOCKERS.upstreamRepo).toContain(
			"hummingbot/hummingbot",
		);
		expect(HMB_REAL_WIRING_BLOCKERS.dockerRuntime).toBeTruthy();
	});
});
