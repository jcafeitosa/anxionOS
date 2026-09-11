import type {
	RiskPermitValidationFailure,
	RiskPermitValidationInput,
	RiskPermitValidationPort,
} from "../../domain/ports/risk-permit-validation";

/**
 * Hummingbot adapter for the execution sandbox.
 * License format is validated locally; live connector I/O stays behind ANX-162 isolation.
 */
export class HummingbotAdapter implements RiskPermitValidationPort {
	private readonly licenseValid: boolean;
	private readonly demoAccount: string;

	constructor(licenseKey: string, demoAccountId: string) {
		this.licenseValid = this.validateLicenseFormat(licenseKey);
		this.demoAccount = demoAccountId;
	}

	private validateLicenseFormat(license: string): boolean {
		const licenseRegex = /^HMB-LICENSE-[0-9a-f-]{36}-\d+\.\d+\.\d+$/i;
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

export function mountHummingbotAdapter(
	organizationId: string,
	licenseKey: string,
	demoAccountId: string,
) {
	const adapter = new HummingbotAdapter(licenseKey, demoAccountId);
	const venueAdapterRefId = `ex_vad_hmb_${organizationId}`;
	return { adapter, venueAdapterRefId };
}

export function isHummingbotAdapter(
	adapterKind: string,
): adapterKind is "HUMMINGBOT" {
	return adapterKind === "HUMMINGBOT";
}
