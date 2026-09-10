import { openapi } from "@elysia/openapi";
import { Elysia } from "elysia";

export function createOpenApiPlugin() {
	return openapi({
		path: "/openapi",
		provider: "scalar",
		documentation: {
			info: {
				title: "anxionOS API",
				version: "0.1.0",
			},
		},
	});
}

export function createOpenApiApp() {
	return new Elysia({ name: "openapi" }).use(createOpenApiPlugin());
}
