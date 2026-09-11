/**
 * ANX-162 S4 — service auth between control plane adapters and engines-sandbox.
 *
 * `/health` is probed without auth (Docker + SIMULATED oracle). Runtime API routes
 * require `Authorization: Bearer <ENGINE_SANDBOX_AUTH_TOKEN>`.
 */

export function resolveSandboxAuthToken(explicit?: string): string | undefined {
	const raw = explicit ?? process.env.ENGINE_SANDBOX_AUTH_TOKEN?.trim();
	return raw ? raw : undefined;
}

export function isPublicSandboxPath(pathname: string): boolean {
	return pathname === "/health";
}

export function buildSandboxFetchInit(
	base: RequestInit = {},
	token?: string,
): RequestInit {
	const resolved = resolveSandboxAuthToken(token);
	if (!resolved) {
		return base;
	}
	const headers = new Headers(base.headers ?? {});
	if (!headers.has("Authorization")) {
		headers.set("Authorization", `Bearer ${resolved}`);
	}
	return { ...base, headers };
}
