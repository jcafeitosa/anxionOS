import { describe, expect, test } from "bun:test";
import { createOpenApiApp } from "../../apps/api/src/openapi-plugin";

describe("OpenAPI Scalar", () => {
	test("GET /openapi returns Scalar HTML", async () => {
		const app = createOpenApiApp();
		const response = await app.handle(new Request("http://127.0.0.1/openapi"));
		expect(response.status).toBe(200);
		const html = await response.text();
		expect(html.toLowerCase()).toContain("scalar");
	});

	test("GET /openapi/json returns OpenAPI 3 document", async () => {
		const app = createOpenApiApp();
		const response = await app.handle(
			new Request("http://127.0.0.1/openapi/json"),
		);
		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			openapi: string;
			info: { title: string };
		};
		expect(body.openapi.startsWith("3.")).toBe(true);
		expect(body.info.title).toBe("anxionOS API");
	});
});
