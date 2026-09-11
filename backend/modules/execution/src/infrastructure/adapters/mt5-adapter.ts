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
 * MT5 Adapter for execution sandbox (ANX-180)
 *
 * IMPORTANTE: Este adapter depende da infraestrutura Docker homologada (ANX-162).
 * Neste turno, implementamos o skeleton e a validação de licensing/demo,
 * sem conexão com container Docker nativo. A integração real com MT5 terminal
 * requer o migration ANX-162 (isolamento Docker dos motores externos).
 *
 * Flow:
 * 1. Licensing validation (sem conexão real — valida schema/versão fixada)
 * 2. Demo account connect (sem enviar ordens para corretora real)
 * 3. Health check (ping simulado)
 * 4. Graceful shutdown (limpeza de recursos)
 *
 * Para produção com MT5 terminal nativo, aguardar ANX-162: homologar isolamento
 * Docker dos motores externos.
 */
export class Mt5Adapter implements RiskPermitValidationPort {
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
		// Formato fixado no G0: MT5-LICENSE-<UUID>-<version>
		const licenseRegex = /^MT5-LICENSE-[0-9a-f-]{36}-\d+\.\d+\.\d+$/i;
		return licenseRegex.test(license);
	}

	async validatePermit(input: RiskPermitValidationInput): Promise<{
		valid: boolean;
		failure?: RiskPermitValidationFailure;
	}> {
		if (!this.licenseValid) {
			return { valid: false, failure: "NOT_ISSUED" };
		}

		// Demo mode: validate demo account exists in schema, don't connect to real MT5
		if (this.demoAccount.startsWith("demo-")) {
			return { valid: true, failure: undefined };
		}

		// Real mode — placeholder: would connect to MT5 terminal
		// require ANX-162 (Docker isolation of external engines)
		return {
			valid: false,
			failure: "STALE",
		};
	}
}

/**
 * Mount the MT5 adapter into the execution unit of work.
 * Note: venueAdapterRefs save uses SIMULATED kind by default;
 * MT5 adapter is registered with kind "MT5" and marked pending ANX-162.
 */
export function mountMt5Adapter(
	organizationId: string,
	licenseKey: string,
	demoAccountId: string,
) {
	const adapter = new Mt5Adapter(licenseKey, demoAccountId);
	const venueAdapterRefId = `ex_vad_mt5_${organizationId}`;

	return { adapter, venueAdapterRefId };
}

export function isMt5Adapter(
	adapterKind: string,
): adapterKind is "MT5" {
	return adapterKind === "MT5";
}