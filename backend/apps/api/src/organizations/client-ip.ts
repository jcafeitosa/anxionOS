import { AppError } from "@anxionos/contracts/errors";

export interface RequestIpServer {
	requestIP?(request: Request): { address: string } | null;
}

export type RequestIpResolver =
	| RequestIpServer
	| ((request: Request) => { address?: string } | null);

export function isTrustProxyEnabled(): boolean {
	const raw = process.env.TRUST_PROXY?.trim().toLowerCase();
	return raw === "true" || raw === "1" || raw === "yes";
}

function clientIpFromTrustedHeaders(request: Request): string | undefined {
	const xff = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
	if (xff) {
		return xff;
	}
	const realIp = request.headers.get("x-real-ip")?.trim();
	return realIp || undefined;
}

function clientIpFromConnection(
	request: Request,
	server?: RequestIpResolver,
): string | undefined {
	const address =
		typeof server === "function"
			? server(request)?.address?.trim()
			: server?.requestIP?.(request)?.address?.trim();
	return address || undefined;
}

/**
 * ANX-486 — o codigo tem de pertencer ao enum canonico `ERROR_CODES`. Antes esta
 * funcao mutava um `AppError` via `Object.defineProperty` para um codigo
 * `CLIENT_IP_UNAVAILABLE` que **nao existe** no catalogo: como `isAppError()`
 * curto-circuita em `instanceof`, o boundary emitia esse codigo cru e o envelope
 * ficava **invalido** contra `errorResponseSchema`/OpenAPI. Agora usa o codigo
 * canonico de 503 e leva o motivo em `details.code`.
 */
function clientIpUnavailable(): never {
	throw new AppError({
		code: "SERVICE_UNAVAILABLE",
		message: "Client IP could not be determined for rate limiting",
		details: { code: "CLIENT_IP_UNAVAILABLE" },
		expose: true,
	});
}

export function resolveClientIp(
	request: Request,
	server?: RequestIpResolver,
): string {
	if (isTrustProxyEnabled()) {
		const trusted = clientIpFromTrustedHeaders(request);
		if (trusted) {
			return trusted;
		}
	}
	const connectionIp = clientIpFromConnection(request, server);
	if (connectionIp) {
		return connectionIp;
	}
	return clientIpUnavailable();
}
