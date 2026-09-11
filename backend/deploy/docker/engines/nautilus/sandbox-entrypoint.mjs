/**
 * NautilusTrader sandbox health surface (ANX-174).
 *
 * Lightweight SIMULATED engine stub — not the full NautilusTrader runtime.
 * REAL wiring replaces this with official system API once homologated.
 */
import { assertSandboxAuth } from "./shared/sandbox-auth.mjs";
import { createSandboxLogger } from "./shared/sandbox-logger.mjs";

const port = Number(process.env.NAUTILUS_SANDBOX_PORT ?? "9057");
const mode = process.env.ENGINE_MODE ?? "SIMULATED";
const version = process.env.NAUTILUS_SANDBOX_VERSION ?? "0.1.0-anx174-s1";
const logger = createSandboxLogger("nautilus", {
	version,
	service: "nautilus-sandbox",
});

const server = Bun.serve({
	port,
	hostname: "0.0.0.0",
	fetch(request) {
		const authFailure = assertSandboxAuth(request);
		if (authFailure) {
			logger.warn("sandbox.auth.rejected", {
				path: new URL(request.url).pathname,
			});
			return authFailure;
		}

		const url = new URL(request.url);
		if (url.pathname === "/health") {
			return Response.json({
				status: "ok",
				engine: "nautilus",
				adapterId: "adapter-nautilus",
				mode,
				version,
				simulated: mode === "SIMULATED",
			});
		}
		if (url.pathname === "/v1/system/status") {
			return Response.json({
				status: "ok",
				engine: "nautilus-sandbox",
				mode,
				version,
				simulated: true,
				traderId: "sandbox-trader",
			});
		}
		return new Response("not found", { status: 404 });
	},
});

logger.info("sandbox.started", { port: server.port });
