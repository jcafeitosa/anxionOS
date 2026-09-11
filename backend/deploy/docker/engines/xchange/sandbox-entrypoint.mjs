/**
 * XChange sandbox health surface (ANX-162 S3 / ANX-178 prelude).
 *
 * Lightweight SIMULATED engine stub — not the full XChange Java bridge.
 * ANX-178 REAL wiring replaces this with official Java bridge REST once homologated.
 */
import { assertSandboxAuth } from "./shared/sandbox-auth.mjs";
import { createSandboxLogger } from "./shared/sandbox-logger.mjs";

const port = Number(process.env.XCHANGE_SANDBOX_PORT ?? "9056");
const mode = process.env.ENGINE_MODE ?? "SIMULATED";
const version = process.env.XCHANGE_SANDBOX_VERSION ?? "0.1.0-anx162-s5";
const logger = createSandboxLogger("xchange", {
	version,
	service: "xchange-sandbox",
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
				engine: "xchange",
				adapterId: "adapter-xchange",
				mode,
				version,
				simulated: mode === "SIMULATED",
			});
		}
		if (url.pathname === "/api/v1/health") {
			return Response.json({
				status: "ok",
				engine: "xchange-sandbox",
				mode,
				version,
				simulated: true,
			});
		}
		return new Response("not found", { status: 404 });
	},
});

logger.info("sandbox.started", { port: server.port });
