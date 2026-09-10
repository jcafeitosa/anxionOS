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

	test("GET /openapi/json includes professional document metadata", async () => {
		const app = createOpenApiApp();
		const response = await app.handle(
			new Request("http://127.0.0.1/openapi/json"),
		);
		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			openapi: string;
			info: {
				title: string;
				description?: string;
				license?: { name: string };
				contact?: { name: string };
			};
			servers?: Array<{ url: string; description?: string }>;
			tags?: Array<{ name: string }>;
			components?: {
				securitySchemes?: Record<string, { type: string }>;
			};
		};
		expect(body.openapi.startsWith("3.")).toBe(true);
		expect(body.info.title).toBe("anxionOS API");
		expect(body.info.description?.length).toBeGreaterThan(20);
		expect(body.info.license?.name).toBe("MIT");
		expect(body.info.contact?.name).toBe("anxionOS");
		expect(body.servers?.[0]?.url).toMatch(/^https?:\/\//);
		expect(body.tags?.map((tag) => tag.name)).toEqual(
			expect.arrayContaining([
				"Health",
				"Identity",
				"Organizations",
				"Governance",
				"Agents",
				"Partners",
				"Realtime",
				"Graph",
				"Orchestration",
				"Connections",
				"Operations",
			]),
		);
		expect(body.components?.securitySchemes?.cookieAuth?.type).toBe("apiKey");
	});

	test("GET /openapi embeds Scalar professional runtime config", async () => {
		const app = createOpenApiApp();
		const response = await app.handle(new Request("http://127.0.0.1/openapi"));
		expect(response.status).toBe(200);
		const html = await response.text();
		expect(html).toContain('"theme":"kepler"');
		expect(html).toContain('"telemetry":false');
		expect(html).toContain('"layout":"modern"');
	});
});
