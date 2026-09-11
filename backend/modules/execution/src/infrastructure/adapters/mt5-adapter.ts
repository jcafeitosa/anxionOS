import type {
	RiskPermitValidationFailure,
	RiskPermitValidationInput,
	RiskPermitValidationPort,
} from "../../domain/ports/risk-permit-validation";
import { buildSandboxFetchInit } from "./sandbox-auth";

/** Health payload from ANX-180 sandbox (`GET /health`, SIMULATED). */
export interface Mt5SandboxHealthResponse {
	status: string;
	engine: string;
	adapterId?: string;
	mode: string;
	version: string;
	simulated: boolean;
}

/**
 * Minimal shape of MT5 terminal/bridge status (REAL runtime oracle).
 * @see https://www.metatrader5.com/en/terminal/help/startworking
 */
export interface Mt5RealStatusResponse {
	status?: string;
	version?: string;
	simulated?: boolean;
	engine?: string;
	terminalId?: string;
	bridge?: string;
}

export type Mt5EngineMode = "SIMULATED" | "REAL";

export interface Mt5AdapterOptions {
	/** Base URL of the engines slot (default: MT5_SANDBOX_URL or http://127.0.0.1:${MT5_SANDBOX_PORT}). */
	sandboxUrl?: string;
	/** Runtime mode gate — REAL requires Windows terminal + Wine/bridge runtime. */
	engineMode?: Mt5EngineMode;
	fetchFn?: typeof fetch;
	healthTimeoutMs?: number;
}

const DEFAULT_MT5_SANDBOX_PORT = "9059";
const DEFAULT_HEALTH_TIMEOUT_MS = 5000;
const MT5_UPSTREAM_VENDOR = "https://www.metatrader5.com";
const MT5_PINNED_REF = "5.0.45"; // G0 — atualizar com evidência de build estável

function trimTrailingSlash(url: string): string {
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function resolveMt5SandboxUrl(explicit?: string): string {
	if (explicit?.trim()) {
		return trimTrailingSlash(explicit.trim());
	}
	const fromEnv = process.env.MT5_SANDBOX_URL?.trim();
	if (fromEnv) {
		return trimTrailingSlash(fromEnv);
	}
	const port =
		process.env.MT5_SANDBOX_PORT?.trim() ?? DEFAULT_MT5_SANDBOX_PORT;
	return `http://127.0.0.1:${port}`;
}

export function resolveMt5EngineMode(explicit?: Mt5EngineMode): Mt5EngineMode {
	const raw = (explicit ?? process.env.ENGINE_MODE ?? "SIMULATED").trim();
	return raw.toUpperCase() === "REAL" ? "REAL" : "SIMULATED";
}

function isHealthySimulatedSandbox(body: Mt5SandboxHealthResponse): boolean {
	return (
		body.status === "ok" &&
		body.engine === "mt5" &&
		body.simulated === true
	);
}

function isHealthyRealRuntime(body: Mt5RealStatusResponse): boolean {
	if (body.simulated === true) {
		return false;
	}
	if (body.engine === "mt5-sandbox") {
		return false;
	}
	const status = body.status?.toLowerCase();
	return status === "ok" || status === "running" || status === "ready";
}

/**
 * MetaTrader 5 adapter for the execution sandbox (ANX-180).
 *
 * Infra (ANX-162 quartet + ANX-180 extension):
 * - S2 homologou storage/rede Docker (volumes, networks, limites).
 * - S3 homologou quartet; ANX-180 adiciona slot `mt5-sandbox` (:9059).
 *
 * Runtime SIMULATED:
 * - Modo demo (`demo-*`) valida licença localmente e exige `/health` do sandbox.
 * - Indisponibilidade do sandbox não é sucesso simulado — retorna STALE.
 *
 * Runtime REAL (wiring parcial, runtime bloqueado):
 * - `ENGINE_MODE=REAL` habilita oracle `GET /v1/terminal/status`.
 * - Runtime upstream exige Windows terminal + Wine/bridge + broker credenciais.
 *   Sem runtime REAL saudável → STALE (não sucesso simulado).
 */
export class Mt5Adapter implements RiskPermitValidationPort {
	private readonly licenseValid: boolean;
	private readonly demoAccount: string;
	private readonly sandboxUrl: string;
	private readonly engineMode: Mt5EngineMode;
	private readonly fetchFn: typeof fetch;
	private readonly healthTimeoutMs: number;

	constructor(
		licenseKey: string,
		demoAccountId: string,
		options: Mt5AdapterOptions = {},
	) {
		this.licenseValid = this.validateLicenseFormat(licenseKey);
		this.demoAccount = demoAccountId;
		this.sandboxUrl = resolveMt5SandboxUrl(options.sandboxUrl);
		this.engineMode = resolveMt5EngineMode(options.engineMode);
		this.fetchFn = options.fetchFn ?? fetch;
		this.healthTimeoutMs =
			options.healthTimeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS;
	}

	private validateLicenseFormat(license: string): boolean {
		const licenseRegex = /^MT5-LICENSE-[0-9a-f-]{36}-\d+\.\d+\.\d+$/i;
		return licenseRegex.test(license);
	}

	/** Probes ANX-180 sandbox health oracle (`GET /health`). */
	async checkSandboxHealth(): Promise<{
		healthy: boolean;
		body?: Mt5SandboxHealthResponse;
	}> {
		const url = `${this.sandboxUrl}/health`;
		try {
			const response = await this.fetchFn(url, {
				signal: AbortSignal.timeout(this.healthTimeoutMs),
			});
			if (!response.ok) {
				return { healthy: false };
			}
			const body = (await response.json()) as Mt5SandboxHealthResponse;
			return {
				healthy: isHealthySimulatedSandbox(body),
				body,
			};
		} catch {
			return { healthy: false };
		}
	}

	/**
	 * Probes MT5 terminal/bridge API (`GET /v1/terminal/status`).
	 * Requires ENGINE_MODE=REAL and a running upstream runtime — not the Bun stub.
	 */
	async checkRealRuntimeHealth(): Promise<{
		healthy: boolean;
		body?: Mt5RealStatusResponse;
	}> {
		if (this.engineMode !== "REAL") {
			return { healthy: false };
		}
		const url = `${this.sandboxUrl}/v1/terminal/status`;
		try {
			const response = await this.fetchFn(
				url,
				buildSandboxFetchInit({
					signal: AbortSignal.timeout(this.healthTimeoutMs),
				}),
			);
			if (!response.ok) {
				return { healthy: false };
			}
			const body = (await response.json()) as Mt5RealStatusResponse;
			return {
				healthy: isHealthyRealRuntime(body),
				body,
			};
		} catch {
			return { healthy: false };
		}
	}

	async validatePermit(_input: RiskPermitValidationInput): Promise<{
		valid: boolean;
		failure?: RiskPermitValidationFailure;
	}> {
		if (!this.licenseValid) {
			return { valid: false, failure: "NOT_ISSUED" };
		}

		if (this.demoAccount.startsWith("demo-")) {
			const { healthy } = await this.checkSandboxHealth();
			if (!healthy) {
				return { valid: false, failure: "STALE" };
			}
			return { valid: true, failure: undefined };
		}

		if (this.engineMode === "REAL") {
			const { healthy } = await this.checkRealRuntimeHealth();
			if (!healthy) {
				return { valid: false, failure: "STALE" };
			}
			return { valid: true, failure: undefined };
		}

		return {
			valid: false,
			failure: "STALE",
		};
	}
}

/** G0 metadata for REAL wiring blockers and ANX-161 conformance handoff. */
export const MT5_REAL_WIRING_BLOCKERS = {
	upstreamVendor: MT5_UPSTREAM_VENDOR,
	pinnedRef: MT5_PINNED_REF,
	windowsTerminal:
		"MT5 terminal é Windows-native; container Linux exige Wine ou bridge Windows sidecar.",
	wineBridge:
		"Wine/bridge homologation pendente — não presumir container Linux nativo.",
	brokerCredentials:
		"Contas live exigem credenciais de corretora MT5 — sem capital real neste slice.",
	terminalLicensing:
		"Licenciamento MetaQuotes exige terminal autorizado — fora do escopo SIMULATED.",
	homologationProfile:
		"ANX-180 homologa SIMULATED only; REAL exige profile/issue própria.",
} as const;

export function mountMt5Adapter(
	organizationId: string,
	licenseKey: string,
	demoAccountId: string,
	options?: Mt5AdapterOptions,
) {
	const adapter = new Mt5Adapter(licenseKey, demoAccountId, options);
	const venueAdapterRefId = `ex_vad_mt5_${organizationId}`;
	return { adapter, venueAdapterRefId };
}

export function isMt5Adapter(adapterKind: string): adapterKind is "MT5" {
	return adapterKind === "MT5";
}
