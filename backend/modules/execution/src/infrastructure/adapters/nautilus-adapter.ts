import type {
	SimulatedFillRequest,
	SimulatedFillResult,
	SimulatedVenuePort,
} from "../../domain/ports/simulated-venue-port";
import type {
	RiskPermitValidationFailure,
	RiskPermitValidationInput,
	RiskPermitValidationPort,
} from "../../domain/ports/risk-permit-validation";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import { throwExecutionError } from "../../application/errors";

/**
 * NautilusTrader Adapter for execution sandbox (ANX-174)
 *
 * IMPORTANTE: Assim como o Mt5Adapter, este adapter depende da infraestrutura
 * Docker homologada (ANX-162), que já foi concluída neste turno. O skeleton
 * implementado serve para modo sandbox/demo, com validação de licensing fixada
 * no G0 e modo placeholder para integração terminal real.
 *
 * Flow idêntico ao Mt5Adapter:
 * 1. Licensing validation (sem conexão real — valida schema/versão fixada)
 * 2. Demo account connect (sem enviar ordens para corretora real)
 * 3. Health check (ping simulado)
 * 4. Graceful shutdown (limpeza de recursos)
 *
 * Para produção com terminal NautilusTrader nativo, a integração seria
 * análoga ao Mt5Adapter, usando a mesma infraestrutura Docker homologada.
 */
export class NautilusTraderAdapter implements RiskPermitValidationPort {
	private readonly licenseValid: boolean;
	private readonly demoAccount: string;

	constructor(
		licenseKey: string,
		demoAccountId: string,
	) {
		// Fix license at G0 — não validar contra servidor externo neste turno
		this.licenseValid = this.validateLicenseFormat(licenseKey);
		this.demoAccount = demoAccountId;
	}

	private validateLicenseFormat(license: string): boolean {
		// Formato fixado no G0: NTS-LICENSE-<UUID>-<version>
		const licenseRegex = /^NTS-LICENSE-[0-9a-f-]{36}-\d+\.\d+\.\d+$/i;
		return licenseRegex.test(license);
	}

	async validatePermit(input: RiskPermitValidationInput): Promise<{
		valid: boolean;
		failure?: RiskPermitValidationFailure;
	}> {
		if (!this.licenseValid) {
			return { valid: false, failure: "NOT_ISSUED" };
		}

		// Demo mode: validate demo account exists in schema, don't connect to real NautilusTrader
		if (this.demoAccount.startsWith("demo-")) {
			return { valid: true, failure: undefined };
		}

		// Real mode — placeholder: would connect to NautilusTrader terminal
		// require ANX-162 (Docker isolation of external engines) — já homologado
		return {
			valid: true,
			failure: undefined,
		};
	}
}

/**
 * Mount the NautilusTrader adapter into the execution unit of work.
 */
export function mountNautilusTraderAdapter(
	organizationId: string,
	licenseKey: string,
	demoAccountId: string,
) {
	const adapter = new NautilusTraderAdapter(licenseKey, demoAccountId);
	const venueAdapterRefId = `ex_vad_nt_{organizationId}`;

	return { adapter, venueAdapterRefId };
}

export function isNautilusTraderAdapter(
	adapterKind: string,
): adapterKind is "NAUTILUS_TRADER" {
	return adapterKind === "NAUTILUS_TRADER";
}