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

function clientIpUnavailable(): never {
	const error = AppError.validation(
		"Client IP could not be determined for rate limiting",
	);
	Object.defineProperty(error, "statusCode", { value: 503 });
	Object.defineProperty(error, "code", { value: "CLIENT_IP_UNAVAILABLE" });
	throw error;
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
