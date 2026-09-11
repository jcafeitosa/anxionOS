/**
 * ANX-162 S4 — shared service auth for engines-sandbox stubs.
 *
 * /health stays public (Docker healthcheck). All other routes require
 * Authorization: Bearer <ENGINE_SANDBOX_AUTH_TOKEN>. Missing server token → 503.
 */

const PUBLIC_PATHS = new Set(["/health"]);

export function resolveSandboxAuthToken() {
	return process.env.ENGINE_SANDBOX_AUTH_TOKEN?.trim() ?? "";
}

export function isPublicSandboxPath(pathname) {
	return PUBLIC_PATHS.has(pathname);
}

export function assertSandboxAuth(request) {
	const pathname = new URL(request.url).pathname;
	if (isPublicSandboxPath(pathname)) {
		return null;
	}

	const expected = resolveSandboxAuthToken();
	if (!expected) {
		return Response.json(
			{
				status: "error",
				code: "SANDBOX_AUTH_UNCONFIGURED",
				message: "ENGINE_SANDBOX_AUTH_TOKEN is required for API routes",
			},
			{ status: 503 },
		);
	}

	const header = request.headers.get("authorization") ?? "";
	const match = /^Bearer\s+(.+)$/i.exec(header);
	if (!match || match[1].trim() !== expected) {
		return Response.json(
			{
				status: "error",
				code: "SANDBOX_AUTH_REQUIRED",
				message: "Missing or invalid Authorization bearer token",
			},
			{ status: 401 },
		);
	}

	return null;
}
