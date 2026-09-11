import { afterEach, describe, expect, test } from "bun:test";
import {
	Mt5Adapter,
	MT5_REAL_WIRING_BLOCKERS,
	mountMt5Adapter,
	resolveMt5EngineMode,
	resolveMt5SandboxUrl,
} from "@anxionos/execution";

const permitInput = {
	organizationId: "org_demo",
	riskPermitId: "rp_01",
	intentHash: "intent_hash",
	authorityEpoch: 1,
	riskEpoch: 1,
};

const validLicense = "MT5-LICENSE-550e8400-e29b-41d4-a716-446655440000-5.0.45";

const healthyBody = {
	status: "ok",
	engine: "mt5",
	adapterId: "adapter-mt5",
	mode: "SIMULATED",
	version: "0.1.0-anx180-s1",
	simulated: true,
};

const realStatusBody = {
	status: "ready",
	version: "5.0.45-upstream",
	simulated: false,
	terminalId: "terminal-live-01",
	bridge: "wine",
};

function mockFetch(
	handler: (url: string) => Response | Promise<Response>,
): typeof fetch {
	return (async (input: RequestInfo | URL) => {
		const url = typeof input === "string" ? input : input.toString();
		return handler(url);
	}) as typeof fetch;
}

describe("Mt5Adapter (ANX-180)", () => {
	const originalSandboxUrl = process.env.MT5_SANDBOX_URL;
	const originalSandboxPort = process.env.MT5_SANDBOX_PORT;
	const originalEngineMode = process.env.ENGINE_MODE;

	afterEach(() => {
		if (originalSandboxUrl === undefined) {
			delete process.env.MT5_SANDBOX_URL;
		} else {
			process.env.MT5_SANDBOX_URL = originalSandboxUrl;
		}
		if (originalSandboxPort === undefined) {
			delete process.env.MT5_SANDBOX_PORT;
		} else {
			process.env.MT5_SANDBOX_PORT = originalSandboxPort;
		}
		if (originalEngineMode === undefined) {
			delete process.env.ENGINE_MODE;
		} else {
			process.env.ENGINE_MODE = originalEngineMode;
		}
	});

	test("resolveMt5SandboxUrl prefers explicit URL, then env, then port default", () => {
		delete process.env.MT5_SANDBOX_URL;
		delete process.env.MT5_SANDBOX_PORT;
		expect(resolveMt5SandboxUrl("http://sandbox.test:9000/")).toBe(
			"http://sandbox.test:9000",
		);

		process.env.MT5_SANDBOX_URL = "http://env.test:9059/";
		expect(resolveMt5SandboxUrl()).toBe("http://env.test:9059");

		delete process.env.MT5_SANDBOX_URL;
		process.env.MT5_SANDBOX_PORT = "9199";
		expect(resolveMt5SandboxUrl()).toBe("http://127.0.0.1:9199");
	});

	test("resolveMt5EngineMode defaults SIMULATED and accepts REAL", () => {
		delete process.env.ENGINE_MODE;
		expect(resolveMt5EngineMode()).toBe("SIMULATED");
		expect(resolveMt5EngineMode("REAL")).toBe("REAL");
		process.env.ENGINE_MODE = "real";
		expect(resolveMt5EngineMode()).toBe("REAL");
	});

	test("demo permit valid when sandbox /health reports SIMULATED ok", async () => {
		const adapter = new Mt5Adapter(validLicense, "demo-mt5-01", {
			sandboxUrl: "http://127.0.0.1:9059",
			fetchFn: mockFetch((url) => {
				expect(url).toBe("http://127.0.0.1:9059/health");
				return Response.json(healthyBody);
			}),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: true,
			failure: undefined,
		});
	});

	test("demo permit STALE when sandbox /health unavailable", async () => {
		const adapter = new Mt5Adapter(validLicense, "demo-mt5-01", {
			sandboxUrl: "http://127.0.0.1:9059",
			fetchFn: mockFetch(() => {
				throw new Error("connection refused");
			}),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "STALE",
		});
	});

	test("demo permit STALE when health reports wrong engine", async () => {
		const adapter = new Mt5Adapter(validLicense, "demo-mt5-01", {
			sandboxUrl: "http://127.0.0.1:9059",
			fetchFn: mockFetch(() =>
				Response.json({ ...healthyBody, engine: "other" }),
			),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "STALE",
		});
	});

	test("invalid license returns NOT_ISSUED", async () => {
		const adapter = new Mt5Adapter("bad-license", "demo-mt5-01", {
			sandboxUrl: "http://127.0.0.1:9059",
			fetchFn: mockFetch(() => Response.json(healthyBody)),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "NOT_ISSUED",
		});
	});

	test("non-demo live account STALE in SIMULATED mode", async () => {
		const adapter = new Mt5Adapter(validLicense, "live-mt5-01", {
			sandboxUrl: "http://127.0.0.1:9059",
			engineMode: "SIMULATED",
			fetchFn: mockFetch(() => Response.json(healthyBody)),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "STALE",
		});
	});

	test("REAL mode live account valid when /v1/terminal/status healthy", async () => {
		const adapter = new Mt5Adapter(validLicense, "live-mt5-01", {
			sandboxUrl: "http://127.0.0.1:9059",
			engineMode: "REAL",
			fetchFn: mockFetch((url) => {
				expect(url).toBe("http://127.0.0.1:9059/v1/terminal/status");
				return Response.json(realStatusBody);
			}),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: true,
			failure: undefined,
		});
	});

	test("REAL mode rejects sandbox stub as healthy runtime", async () => {
		const adapter = new Mt5Adapter(validLicense, "live-mt5-01", {
			sandboxUrl: "http://127.0.0.1:9059",
			engineMode: "REAL",
			fetchFn: mockFetch(() =>
				Response.json({
					status: "ok",
					engine: "mt5-sandbox",
					simulated: true,
				}),
			),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "STALE",
		});
	});

	test("mountMt5Adapter returns venue ref id", () => {
		const { adapter, venueAdapterRefId } = mountMt5Adapter(
			"org_01",
			validLicense,
			"demo-mt5-01",
		);
		expect(adapter).toBeInstanceOf(Mt5Adapter);
		expect(venueAdapterRefId).toBe("ex_vad_mt5_org_01");
	});

	test("MT5_REAL_WIRING_BLOCKERS documents Wine/Windows blockers", () => {
		expect(MT5_REAL_WIRING_BLOCKERS.upstreamVendor).toContain("metatrader5");
		expect(MT5_REAL_WIRING_BLOCKERS.wineBridge).toContain("Wine");
		expect(MT5_REAL_WIRING_BLOCKERS.brokerCredentials).toContain("corretora");
	});
});
