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

describe("execution sandbox venue adapters (ANX-326)", () => {
	test("HummingbotAdapter validates license format and demo permits", async () => {
		const valid = new HummingbotAdapter(
			validLicenses.hummingbot,
			"demo-hmb-01",
		);
		expect(await valid.validatePermit(permitInput)).toEqual({
			valid: true,
			failure: undefined,
		});

		const invalid = new HummingbotAdapter("bad-license", "demo-hmb-01");
		expect(await invalid.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "NOT_ISSUED",
		});
	});

	test("FreqtradeAdapter validates license format and demo permits", async () => {
		const valid = new FreqtradeAdapter(validLicenses.freqtrade, "demo-fqt-01");
		expect(await valid.validatePermit(permitInput)).toEqual({
			valid: true,
			failure: undefined,
		});

		const invalid = new FreqtradeAdapter("bad-license", "demo-fqt-01");
		expect(await invalid.validatePermit(permitInput)).toEqual({
			valid: false,
			failure: "NOT_ISSUED",
		});
	});

	test("XChangeAdapter matches hummingbot/freqtrade sandbox contract", async () => {
		const valid = new XChangeAdapter(validLicenses.xchange, "demo-xch-01");
		expect(await valid.validatePermit(permitInput)).toEqual({
			valid: true,
			failure: undefined,
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
