import { afterEach, describe, expect, test } from "bun:test";
import {
	mountNautilusTraderAdapter,
	NAUTILUS_REAL_WIRING_BLOCKERS,
	NautilusTraderAdapter,
	resolveNtsEngineMode,
	resolveNtsSandboxUrl,
} from "@anxionos/execution";

const permitInput = {
	organizationId: "org_demo",
	riskPermitId: "rp_01",
	intentHash: "intent_hash",
	authorityEpoch: 1,
	riskEpoch: 1,
};

const validLicense = "NTS-LICENSE-550e8400-e29b-41d4-a716-446655440000-1.0.0";

const healthyBody = {
	status: "ok",
	engine: "nautilus",
	adapterId: "adapter-nautilus",
	mode: "SIMULATED",
	version: "0.1.0-anx174-s1",
	simulated: true,
};

const realStatusBody = {
	status: "ready",
	version: "1.210.0-upstream",
	simulated: false,
	traderId: "live-trader-01",
};

function mockFetch(
	handler: (url: string) => Response | Promise<Response>,
): typeof fetch {
	return (async (input: RequestInfo | URL) => {
		const url = typeof input === "string" ? input : input.toString();
		return handler(url);
	}) as typeof fetch;
}

describe("NautilusTraderAdapter (ANX-174)", () => {
	const originalSandboxUrl = process.env.NAUTILUS_SANDBOX_URL;
	const originalSandboxPort = process.env.NAUTILUS_SANDBOX_PORT;
	const originalEngineMode = process.env.ENGINE_MODE;

	afterEach(() => {
		if (originalSandboxUrl === undefined) {
			delete process.env.NAUTILUS_SANDBOX_URL;
		} else {
			process.env.NAUTILUS_SANDBOX_URL = originalSandboxUrl;
		}
		if (originalSandboxPort === undefined) {
			delete process.env.NAUTILUS_SANDBOX_PORT;
		} else {
			process.env.NAUTILUS_SANDBOX_PORT = originalSandboxPort;
		}
		if (originalEngineMode === undefined) {
			delete process.env.ENGINE_MODE;
		} else {
			process.env.ENGINE_MODE = originalEngineMode;
		}
	});

	test("resolveNtsSandboxUrl prefers explicit URL, then env, then port default", () => {
		delete process.env.NAUTILUS_SANDBOX_URL;
		delete process.env.NAUTILUS_SANDBOX_PORT;
		expect(resolveNtsSandboxUrl("http://sandbox.test:9000/")).toBe(
			"http://sandbox.test:9000",
		);

		process.env.NAUTILUS_SANDBOX_URL = "http://env.test:9057/";
		expect(resolveNtsSandboxUrl()).toBe("http://env.test:9057");

		delete process.env.NAUTILUS_SANDBOX_URL;
		process.env.NAUTILUS_SANDBOX_PORT = "9197";
		expect(resolveNtsSandboxUrl()).toBe("http://127.0.0.1:9197");
	});

	test("resolveNtsEngineMode defaults SIMULATED and accepts REAL", () => {
		delete process.env.ENGINE_MODE;
		expect(resolveNtsEngineMode()).toBe("SIMULATED");
		expect(resolveNtsEngineMode("REAL")).toBe("REAL");
		process.env.ENGINE_MODE = "real";
		expect(resolveNtsEngineMode()).toBe("REAL");
	});

	test("demo permit valid when sandbox /health reports SIMULATED ok", async () => {
		const adapter = new NautilusTraderAdapter(validLicense, "demo-nts-01", {
			sandboxUrl: "http://127.0.0.1:9057",
			fetchFn: mockFetch((url) => {
				expect(url).toBe("http://127.0.0.1:9057/health");
				return Response.json(healthyBody);
			}),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: true,
			failure: undefined,
		});
	});

	test("demo permit STALE when sandbox /health unavailable", async () => {
		const adapter = new NautilusTraderAdapter(validLicense, "demo-nts-01", {
			sandboxUrl: "http://127.0.0.1:9057",
			fetchFn: mockFetch(() => {
				throw new Error("connection refused");
			}),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "STALE",
		});
	});

	test("invalid license returns NOT_ISSUED", async () => {
		const adapter = new NautilusTraderAdapter("bad-license", "demo-nts-01", {
			sandboxUrl: "http://127.0.0.1:9057",
			fetchFn: mockFetch(() => Response.json(healthyBody)),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "NOT_ISSUED",
		});
	});

	test("non-demo live account STALE in SIMULATED mode", async () => {
		const adapter = new NautilusTraderAdapter(validLicense, "live-nts-01", {
			sandboxUrl: "http://127.0.0.1:9057",
			engineMode: "SIMULATED",
			fetchFn: mockFetch(() => Response.json(healthyBody)),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "STALE",
		});
	});

	test("REAL mode live account valid when /v1/system/status healthy", async () => {
		const adapter = new NautilusTraderAdapter(validLicense, "live-nts-01", {
			sandboxUrl: "http://127.0.0.1:9057",
			engineMode: "REAL",
			fetchFn: mockFetch((url) => {
				expect(url).toBe("http://127.0.0.1:9057/v1/system/status");
				return Response.json(realStatusBody);
			}),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: true,
			failure: undefined,
		});
	});

	test("REAL mode rejects sandbox stub as healthy runtime", async () => {
		const adapter = new NautilusTraderAdapter(validLicense, "live-nts-01", {
			sandboxUrl: "http://127.0.0.1:9057",
			engineMode: "REAL",
			fetchFn: mockFetch(() =>
				Response.json({
					status: "ok",
					engine: "nautilus-sandbox",
					simulated: true,
				}),
			),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "STALE",
		});
	});

	test("mountNautilusTraderAdapter returns venue ref id", () => {
		const { adapter, venueAdapterRefId } = mountNautilusTraderAdapter(
			"org_01",
			validLicense,
			"demo-nts-01",
		);
		expect(adapter).toBeInstanceOf(NautilusTraderAdapter);
		expect(venueAdapterRefId).toBe("ex_vad_nts_org_01");
	});

	test("NAUTILUS_REAL_WIRING_BLOCKERS documents upstream metadata", () => {
		expect(NAUTILUS_REAL_WIRING_BLOCKERS.upstreamRepo).toContain(
			"nautilus_trader",
		);
		expect(NAUTILUS_REAL_WIRING_BLOCKERS.pinnedRef).toBeTruthy();
	});
});
