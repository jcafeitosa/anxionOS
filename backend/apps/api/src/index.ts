import { healthResponseSchema, schemaVersion } from "@anxionos/contracts";
import { createPgPool } from "@anxionos/eventing/postgres";
import { createLogger } from "@anxionos/observability";
import { Elysia } from "elysia";
import { bootstrapIdentitySessionRevocation } from "./identity/bootstrap-session-revocation";

const logger = createLogger({ service: "api" });
const port = Number(process.env.PORT ?? "3000");

const databaseUrl = process.env.DATABASE_URL?.trim();
if (databaseUrl) {
	bootstrapIdentitySessionRevocation(createPgPool(databaseUrl));
} else {
	logger.info("DATABASE_URL unset — identity session consumer disabled");
}

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
