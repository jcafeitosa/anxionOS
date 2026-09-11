/**
 * MetaTrader 5 sandbox health surface (ANX-180).
 *
 * Lightweight SIMULATED engine stub — not the MT5 Windows terminal or Wine bridge.
 * REAL wiring replaces this with terminal/bridge API once homologated.
 */
import { assertSandboxAuth } from "./shared/sandbox-auth.mjs";
import { createSandboxLogger } from "./shared/sandbox-logger.mjs";

const port = Number(process.env.MT5_SANDBOX_PORT ?? "9059");
const mode = process.env.ENGINE_MODE ?? "SIMULATED";
const version = process.env.MT5_SANDBOX_VERSION ?? "0.1.0-anx180-s1";
const logger = createSandboxLogger("mt5", {
	version,
	service: "mt5-sandbox",
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
				engine: "mt5",
				adapterId: "adapter-mt5",
				mode,
				version,
				simulated: mode === "SIMULATED",
			});
		}
		if (url.pathname === "/v1/terminal/status") {
			return Response.json({
				status: "ok",
				engine: "mt5-sandbox",
				mode,
				version,
				simulated: true,
				terminalId: "sandbox-terminal",
				bridge: "stub",
			});
		}
		return new Response("not found", { status: 404 });
	},
});

logger.info("sandbox.started", { port: server.port });
