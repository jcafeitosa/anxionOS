import type {
	RiskPermitValidationFailure,
	RiskPermitValidationInput,
	RiskPermitValidationPort,
} from "../../domain/ports/risk-permit-validation";

/**
 * Freqtrade adapter for the execution sandbox.
 * License format is validated locally; live engine I/O stays behind ANX-162 isolation.
 * Institutional executionMode is not replaced by Freqtrade dry-run.
 */
export class FreqtradeAdapter implements RiskPermitValidationPort {
	private readonly licenseValid: boolean;
	private readonly demoAccount: string;

	constructor(licenseKey: string, demoAccountId: string) {
		this.licenseValid = this.validateLicenseFormat(licenseKey);
		this.demoAccount = demoAccountId;
	}

	private validateLicenseFormat(license: string): boolean {
		const licenseRegex = /^FQT-LICENSE-[0-9a-f-]{36}-\d+\.\d+\.\d+$/i;
		return licenseRegex.test(license);
	}

	async validatePermit(_input: RiskPermitValidationInput): Promise<{
		valid: boolean;
		failure?: RiskPermitValidationFailure;
	}> {
		if (!this.licenseValid) {
			return { valid: false, failure: "NOT_ISSUED" };
		}
		if (this.demoAccount.startsWith("demo-")) {
			return { valid: true, failure: undefined };
		}
		return { valid: true, failure: undefined };
	}
}

export function mountFreqtradeAdapter(
	organizationId: string,
	licenseKey: string,
	demoAccountId: string,
) {
	const adapter = new FreqtradeAdapter(licenseKey, demoAccountId);
	const venueAdapterRefId = `ex_vad_fqt_${organizationId}`;
	return { adapter, venueAdapterRefId };
}

export function isFreqtradeAdapter(
	adapterKind: string,
): adapterKind is "FREQTRADE" {
	return adapterKind === "FREQTRADE";
}
