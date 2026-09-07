import { healthResponseSchema, schemaVersion } from "@anxionos/contracts";
import { createLogger } from "@anxionos/observability";
import { Elysia } from "elysia";

const logger = createLogger({ service: "api" });
const port = Number(process.env.PORT ?? "3000");

const app = new Elysia()
	.get("/health", () => {
		const body = healthResponseSchema.parse({
			status: "ok",
			schemaVersion,
			service: "api",
			timestamp: new Date().toISOString(),
		});
		return body;
	})
	.listen(port);

logger.info("API listening", { port: app.server?.port ?? port });

export type App = typeof app;
