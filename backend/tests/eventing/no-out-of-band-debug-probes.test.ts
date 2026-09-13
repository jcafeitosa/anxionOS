import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";

const backendRoot = resolve(import.meta.dir, "../..");
const productionSourceGlob = new Bun.Glob(
	"{apps,modules,packages,services}/**/*.{ts,tsx,js,mjs,cjs}",
);

const forbiddenProbeMarkers = [
	`${["127", "0", "0", "1"].join(".")}:${7_857}`,
	["X", "Debug", "Session", "Id"].join("-"),
];

describe("eventing production-source hygiene", () => {
	test("contains no out-of-band debug probe markers", async () => {
		for await (const relativePath of productionSourceGlob.scan({
			cwd: backendRoot,
			onlyFiles: true,
		})) {
			const source = await Bun.file(resolve(backendRoot, relativePath)).text();

			for (const marker of forbiddenProbeMarkers) {
				expect(source, `${relativePath} contains ${marker}`).not.toContain(
					marker,
				);
			}
		}
	});
});
