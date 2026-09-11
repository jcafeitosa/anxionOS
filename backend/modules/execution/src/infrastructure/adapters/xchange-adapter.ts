import type {
	RiskPermitValidationFailure,
	RiskPermitValidationInput,
	RiskPermitValidationPort,
} from "../../domain/ports/risk-permit-validation";
import { buildSandboxFetchInit } from "./sandbox-auth";

/** Health payload from ANX-162 S3 sandbox (`GET /health`, SIMULATED). */
export interface XchSandboxHealthResponse {
	status: string;
	engine: string;
	adapterId?: string;
	mode: string;
	version: string;
	simulated: boolean;
}

/**
 * Minimal shape of XChange Java bridge REST health (REAL runtime oracle).
 * @see https://github.com/knowm/XChange
 */
export interface XchRealHealthResponse {
	status?: string;
	version?: string;
	simulated?: boolean;
	engine?: string;
}

export type XchEngineMode = "SIMULATED" | "REAL";

export interface XChangeAdapterOptions {
	/** Base URL of the engines slot (default: XCHANGE_SANDBOX_URL or http://127.0.0.1:${XCHANGE_SANDBOX_PORT}). */
	sandboxUrl?: string;
	/** Runtime mode gate — REAL requires Java bridge runtime (ANX-178). */
	engineMode?: XchEngineMode;
	fetchFn?: typeof fetch;
	healthTimeoutMs?: number;
}

const DEFAULT_XCH_SANDBOX_PORT = "9056";
const DEFAULT_HEALTH_TIMEOUT_MS = 5000;
const XCH_UPSTREAM_REPO = "https://github.com/knowm/XChange";
const XCH_PINNED_REF = "5.2.0"; // G0 — atualizar com evidência de release estável

function trimTrailingSlash(url: string): string {
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function resolveXchSandboxUrl(explicit?: string): string {
	if (explicit?.trim()) {
		return trimTrailingSlash(explicit.trim());
	}
	const fromEnv = process.env.XCHANGE_SANDBOX_URL?.trim();
	if (fromEnv) {
		return trimTrailingSlash(fromEnv);
	}
	const port =
		process.env.XCHANGE_SANDBOX_PORT?.trim() ?? DEFAULT_XCH_SANDBOX_PORT;
	return `http://127.0.0.1:${port}`;
}

export function resolveXchEngineMode(explicit?: XchEngineMode): XchEngineMode {
	const raw = (explicit ?? process.env.ENGINE_MODE ?? "SIMULATED").trim();
	return raw.toUpperCase() === "REAL" ? "REAL" : "SIMULATED";
}

function isHealthySimulatedSandbox(body: XchSandboxHealthResponse): boolean {
	return (
		body.status === "ok" && body.engine === "xchange" && body.simulated === true
	);
}

function isHealthyRealRuntime(body: XchRealHealthResponse): boolean {
	if (body.simulated === true) {
		return false;
	}
	if (body.engine === "xchange-sandbox") {
		return false;
	}
	const status = body.status?.toLowerCase();
	return status === "ok" || status === "up" || status === "running";
}

/**
 * XChange adapter for the execution sandbox.
 *
 * Infra (ANX-162):
 * - S2 homologou storage/rede Docker (volumes, networks, limites).
 * - S3 homologou o slot `xchange-sandbox` no profile engines (health/restart).
 *
 * Runtime SIMULATED (ANX-178):
 * - Modo demo (`demo-*`) valida licença localmente e exige `/health` do sandbox S3.
 * - Indisponibilidade do sandbox não é sucesso simulado — retorna STALE.
 *
 * Runtime REAL (ANX-178 — wiring parcial, runtime bloqueado):
 * - `ENGINE_MODE=REAL` habilita oracle `GET /api/v1/health` (Java bridge REST).
 * - Runtime upstream exige JVM + bridge Java + credenciais de exchange fora
 *   do escopo ANX-178. Sem runtime REAL saudável → STALE (não sucesso simulado).
 *
 * Flow:
 * 1. Licensing validation (schema/versão fixada no G0)
 * 2. Demo + SIMULATED: sandbox health (`GET /health`)
 * 3. Live + REAL: bridge health (`GET /api/v1/health`) quando ENGINE_MODE=REAL
 *
 * XChange é biblioteca Java — não servidor pronto; bridge encapsulada no container.
 */
export class XChangeAdapter implements RiskPermitValidationPort {
	private readonly licenseValid: boolean;
	private readonly demoAccount: string;
	private readonly sandboxUrl: string;
	private readonly engineMode: XchEngineMode;
	private readonly fetchFn: typeof fetch;
	private readonly healthTimeoutMs: number;

	constructor(
		licenseKey: string,
		demoAccountId: string,
		options: XChangeAdapterOptions = {},
	) {
		this.licenseValid = this.validateLicenseFormat(licenseKey);
		this.demoAccount = demoAccountId;
		this.sandboxUrl = resolveXchSandboxUrl(options.sandboxUrl);
		this.engineMode = resolveXchEngineMode(options.engineMode);
		this.fetchFn = options.fetchFn ?? fetch;
		this.healthTimeoutMs = options.healthTimeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS;
	}

	private validateLicenseFormat(license: string): boolean {
		const licenseRegex = /^XCH-LICENSE-[0-9a-f-]{36}-\d+\.\d+\.\d+$/i;
		return licenseRegex.test(license);
	}

	/** Probes ANX-162 S3 sandbox health oracle (`GET /health`). */
	async checkSandboxHealth(): Promise<{
		healthy: boolean;
		body?: XchSandboxHealthResponse;
	}> {
		const url = `${this.sandboxUrl}/health`;
		try {
			const response = await this.fetchFn(url, {
				signal: AbortSignal.timeout(this.healthTimeoutMs),
			});
			if (!response.ok) {
				return { healthy: false };
			}
			const body = (await response.json()) as XchSandboxHealthResponse;
			return {
				healthy: isHealthySimulatedSandbox(body),
				body,
			};
		} catch {
			return { healthy: false };
		}
	}

	/**
	 * Probes XChange Java bridge REST health (`GET /api/v1/health`).
	 * Requires ENGINE_MODE=REAL and a running upstream bridge — not the Bun stub.
	 */
	async checkRealRuntimeHealth(): Promise<{
		healthy: boolean;
		body?: XchRealHealthResponse;
	}> {
		if (this.engineMode !== "REAL") {
			return { healthy: false };
		}
		const url = `${this.sandboxUrl}/api/v1/health`;
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
			const body = (await response.json()) as XchRealHealthResponse;
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
export const XCHANGE_REAL_WIRING_BLOCKERS = {
	upstreamRepo: XCH_UPSTREAM_REPO,
	pinnedRef: XCH_PINNED_REF,
	javaBridgeRuntime:
		"XChange é biblioteca Java — exige JVM + bridge REST encapsulada; não é servidor pronto.",
	exchangeCredentials:
		"Contas live exigem exchange API keys — sem capital real neste slice.",
	multiExchangeSemantics:
		"XChange unifica exchanges — homologação REAL exige connector por exchange.",
	homologationProfile:
		"ANX-162 S3 homologa SIMULATED only; REAL exige profile/issue própria.",
} as const;

export function mountXChangeAdapter(
	organizationId: string,
	licenseKey: string,
	demoAccountId: string,
	options?: XChangeAdapterOptions,
) {
	const adapter = new XChangeAdapter(licenseKey, demoAccountId, options);
	const venueAdapterRefId = `ex_vad_xch_${organizationId}`;
	return { adapter, venueAdapterRefId };
}

export function isXChangeAdapter(
	adapterKind: string,
): adapterKind is "XChange" {
	return adapterKind === "XChange";
}
