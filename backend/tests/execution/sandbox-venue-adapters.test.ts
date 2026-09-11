import { describe, expect, test } from "bun:test";
import {
	FreqtradeAdapter,
	HummingbotAdapter,
	isFreqtradeAdapter,
	isHummingbotAdapter,
	isXChangeAdapter,
	mountFreqtradeAdapter,
	mountHummingbotAdapter,
	mountXChangeAdapter,
	XChangeAdapter,
} from "@anxionos/execution";

const permitInput = {
	organizationId: "org_demo",
	riskPermitId: "rp_01",
	intentHash: "intent_hash",
	authorityEpoch: 1,
	riskEpoch: 1,
};

const validLicenses = {
	hummingbot: "HMB-LICENSE-550e8400-e29b-41d4-a716-446655440000-1.0.0",
	freqtrade: "FQT-LICENSE-550e8400-e29b-41d4-a716-446655440000-1.0.0",
	xchange: "XCH-LICENSE-550e8400-e29b-41d4-a716-446655440000-1.0.0",
};

const healthyHmbBody = {
	status: "ok",
	engine: "hummingbot",
	adapterId: "adapter-hummingbot",
	mode: "SIMULATED",
	version: "0.1.0-anx162-s5",
	simulated: true,
};

const healthyFqtBody = {
	status: "ok",
	engine: "freqtrade",
	adapterId: "adapter-freqtrade",
	mode: "SIMULATED",
	version: "0.1.0-anx162-s5",
	simulated: true,
};

const healthyXchBody = {
	status: "ok",
	engine: "xchange",
	adapterId: "adapter-xchange",
	mode: "SIMULATED",
	version: "0.1.0-anx162-s5",
	simulated: true,
};

function mockFetch(
	handler: (url: string) => Response | Promise<Response>,
): typeof fetch {
	return (async (input: RequestInfo | URL) => {
		const url = typeof input === "string" ? input : input.toString();
		return handler(url);
	}) as typeof fetch;
}

describe("execution sandbox venue adapters (ANX-326)", () => {
	test("HummingbotAdapter validates license format and demo permits", async () => {
		const valid = new HummingbotAdapter(
			validLicenses.hummingbot,
			"demo-hmb-01",
			{
				fetchFn: mockFetch((url) => {
					expect(url.endsWith("/health")).toBe(true);
					return Response.json(healthyHmbBody);
				}),
			},
		);
		expect(await valid.validatePermit(permitInput)).toEqual({
			valid: true,
			failure: undefined,
		});

		const invalid = new HummingbotAdapter("bad-license", "demo-hmb-01", {
			fetchFn: mockFetch(() => Response.json(healthyHmbBody)),
		});
		expect(await invalid.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "NOT_ISSUED",
		});
	});

	test("FreqtradeAdapter validates license format and demo permits with sandbox health", async () => {
		const valid = new FreqtradeAdapter(validLicenses.freqtrade, "demo-fqt-01", {
			fetchFn: mockFetch((url) => {
				expect(url.endsWith("/health")).toBe(true);
				return Response.json(healthyFqtBody);
			}),
		});
		expect(await valid.validatePermit(permitInput)).toEqual({
			valid: true,
			failure: undefined,
		});

		const invalid = new FreqtradeAdapter("bad-license", "demo-fqt-01", {
			fetchFn: mockFetch(() => Response.json(healthyFqtBody)),
		});
		expect(await invalid.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "NOT_ISSUED",
		});
	});

	test("XChangeAdapter validates license format and demo permits with sandbox health", async () => {
		const valid = new XChangeAdapter(validLicenses.xchange, "demo-xch-01", {
			fetchFn: mockFetch((url) => {
				expect(url.endsWith("/health")).toBe(true);
				return Response.json(healthyXchBody);
			}),
		});
		expect(await valid.validatePermit(permitInput)).toEqual({
			valid: true,
			failure: undefined,
		});

		const invalid = new XChangeAdapter("bad-license", "demo-xch-01", {
			fetchFn: mockFetch(() => Response.json(healthyXchBody)),
		});
		expect(await invalid.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "NOT_ISSUED",
		});
	});

	test("mount helpers return stable venueAdapterRefId prefixes", () => {
		expect(
			mountHummingbotAdapter("org_1", validLicenses.hummingbot, "demo-hmb")
				.venueAdapterRefId,
		).toBe("ex_vad_hmb_org_1");
		expect(
			mountFreqtradeAdapter("org_1", validLicenses.freqtrade, "demo-fqt")
				.venueAdapterRefId,
		).toBe("ex_vad_fqt_org_1");
		expect(
			mountXChangeAdapter("org_1", validLicenses.xchange, "demo-xch")
				.venueAdapterRefId,
		).toBe("ex_vad_xch_org_1");
	});

	test("kind guards discriminate adapter kinds", () => {
		expect(isHummingbotAdapter("HUMMINGBOT")).toBe(true);
		expect(isHummingbotAdapter("FREQTRADE")).toBe(false);
		expect(isFreqtradeAdapter("FREQTRADE")).toBe(true);
		expect(isFreqtradeAdapter("XChange")).toBe(false);
		expect(isXChangeAdapter("XChange")).toBe(true);
		expect(isXChangeAdapter("HUMMINGBOT")).toBe(false);
	});
});
