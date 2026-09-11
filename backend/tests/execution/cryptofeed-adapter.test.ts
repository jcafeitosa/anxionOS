import { afterEach, describe, expect, test } from "bun:test";
import {
	CryptofeedAdapter,
	CFS_REAL_WIRING_BLOCKERS,
	mountCryptofeedAdapter,
	resolveCfsEngineMode,
	resolveCfsSandboxUrl,
} from "@anxionos/execution";

const permitInput = {
	organizationId: "org_demo",
	riskPermitId: "rp_01",
	intentHash: "intent_hash",
	authorityEpoch: 1,
	riskEpoch: 1,
};

const validLicense = "CFS-LICENSE-550e8400-e29b-41d4-a716-446655440000-2.4.1";

const healthyBody = {
	status: "ok",
	engine: "cryptofeed",
	adapterId: "adapter-cryptofeed",
	mode: "SIMULATED",
	version: "0.1.0-anx179-s1",
	simulated: true,
	dataOnly: true,
};

const realStatusBody = {
	status: "ready",
	version: "2.4.1-upstream",
	simulated: false,
	dataOnly: true,
	feedsActive: 3,
};

function mockFetch(
	handler: (url: string) => Response | Promise<Response>,
): typeof fetch {
	return (async (input: RequestInfo | URL) => {
		const url = typeof input === "string" ? input : input.toString();
		return handler(url);
	}) as typeof fetch;
}

describe("CryptofeedAdapter (ANX-179)", () => {
	const originalSandboxUrl = process.env.CRYPTOFEED_SANDBOX_URL;
	const originalSandboxPort = process.env.CRYPTOFEED_SANDBOX_PORT;
	const originalEngineMode = process.env.ENGINE_MODE;

	afterEach(() => {
		if (originalSandboxUrl === undefined) {
			delete process.env.CRYPTOFEED_SANDBOX_URL;
		} else {
			process.env.CRYPTOFEED_SANDBOX_URL = originalSandboxUrl;
		}
		if (originalSandboxPort === undefined) {
			delete process.env.CRYPTOFEED_SANDBOX_PORT;
		} else {
			process.env.CRYPTOFEED_SANDBOX_PORT = originalSandboxPort;
		}
		if (originalEngineMode === undefined) {
			delete process.env.ENGINE_MODE;
		} else {
			process.env.ENGINE_MODE = originalEngineMode;
		}
	});

	test("resolveCfsSandboxUrl prefers explicit URL, then env, then port default", () => {
		delete process.env.CRYPTOFEED_SANDBOX_URL;
		delete process.env.CRYPTOFEED_SANDBOX_PORT;
		expect(resolveCfsSandboxUrl("http://sandbox.test:9000/")).toBe(
			"http://sandbox.test:9000",
		);

		process.env.CRYPTOFEED_SANDBOX_URL = "http://env.test:9058/";
		expect(resolveCfsSandboxUrl()).toBe("http://env.test:9058");

		delete process.env.CRYPTOFEED_SANDBOX_URL;
		process.env.CRYPTOFEED_SANDBOX_PORT = "9198";
		expect(resolveCfsSandboxUrl()).toBe("http://127.0.0.1:9198");
	});

	test("resolveCfsEngineMode defaults SIMULATED and accepts REAL", () => {
		delete process.env.ENGINE_MODE;
		expect(resolveCfsEngineMode()).toBe("SIMULATED");
		expect(resolveCfsEngineMode("REAL")).toBe("REAL");
		process.env.ENGINE_MODE = "real";
		expect(resolveCfsEngineMode()).toBe("REAL");
	});

	test("demo permit valid when sandbox /health reports SIMULATED data-only ok", async () => {
		const adapter = new CryptofeedAdapter(validLicense, "demo-cfs-01", {
			sandboxUrl: "http://127.0.0.1:9058",
			fetchFn: mockFetch((url) => {
				expect(url).toBe("http://127.0.0.1:9058/health");
				return Response.json(healthyBody);
			}),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: true,
			failure: undefined,
		});
	});

	test("demo permit STALE when sandbox /health unavailable", async () => {
		const adapter = new CryptofeedAdapter(validLicense, "demo-cfs-01", {
			sandboxUrl: "http://127.0.0.1:9058",
			fetchFn: mockFetch(() => {
				throw new Error("connection refused");
			}),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "STALE",
		});
	});

	test("demo permit STALE when health missing dataOnly flag", async () => {
		const adapter = new CryptofeedAdapter(validLicense, "demo-cfs-01", {
			sandboxUrl: "http://127.0.0.1:9058",
			fetchFn: mockFetch(() =>
				Response.json({ ...healthyBody, dataOnly: false }),
			),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "STALE",
		});
	});

	test("invalid license returns NOT_ISSUED", async () => {
		const adapter = new CryptofeedAdapter("bad-license", "demo-cfs-01", {
			sandboxUrl: "http://127.0.0.1:9058",
			fetchFn: mockFetch(() => Response.json(healthyBody)),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "NOT_ISSUED",
		});
	});

	test("non-demo live account STALE in SIMULATED mode", async () => {
		const adapter = new CryptofeedAdapter(validLicense, "live-cfs-01", {
			sandboxUrl: "http://127.0.0.1:9058",
			engineMode: "SIMULATED",
			fetchFn: mockFetch(() => Response.json(healthyBody)),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "STALE",
		});
	});

	test("REAL mode live account valid when /v1/feeds/status healthy", async () => {
		const adapter = new CryptofeedAdapter(validLicense, "live-cfs-01", {
			sandboxUrl: "http://127.0.0.1:9058",
			engineMode: "REAL",
			fetchFn: mockFetch((url) => {
				expect(url).toBe("http://127.0.0.1:9058/v1/feeds/status");
				return Response.json(realStatusBody);
			}),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: true,
			failure: undefined,
		});
	});

	test("REAL mode rejects sandbox stub as healthy runtime", async () => {
		const adapter = new CryptofeedAdapter(validLicense, "live-cfs-01", {
			sandboxUrl: "http://127.0.0.1:9058",
			engineMode: "REAL",
			fetchFn: mockFetch(() =>
				Response.json({
					status: "ok",
					engine: "cryptofeed-sandbox",
					simulated: true,
				}),
			),
		});

		expect(await adapter.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "STALE",
		});
	});

	test("mountCryptofeedAdapter returns venue ref id", () => {
		const { adapter, venueAdapterRefId } = mountCryptofeedAdapter(
			"org_01",
			validLicense,
			"demo-cfs-01",
		);
		expect(adapter).toBeInstanceOf(CryptofeedAdapter);
		expect(venueAdapterRefId).toBe("ex_vad_cfs_org_01");
	});

	test("CFS_REAL_WIRING_BLOCKERS documents upstream metadata", () => {
		expect(CFS_REAL_WIRING_BLOCKERS.upstreamRepo).toContain("cryptofeed");
		expect(CFS_REAL_WIRING_BLOCKERS.pinnedRef).toBeTruthy();
		expect(CFS_REAL_WIRING_BLOCKERS.dataOnlySemantics).toContain("data-only");
	});
});
