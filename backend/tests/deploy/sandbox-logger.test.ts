import { describe, expect, it } from "bun:test";
import {
	createSandboxLogger,
	parseSandboxLogLine,
} from "../../deploy/docker/engines/shared/sandbox-logger.mjs";

describe("sandbox-logger (ANX-162 S5)", () => {
	it("emits parseable structured JSON with required fields", () => {
		const lines: string[] = [];
		const original = console.log;
		console.log = (value: string) => {
			lines.push(value);
		};

		const logger = createSandboxLogger("freqtrade", {
			version: "0.1.0-anx162-s5",
			service: "freqtrade-sandbox",
		});
		logger.info("sandbox.started", { port: 9055 });

		console.log = original;

		expect(lines.length).toBe(1);
		const parsed = parseSandboxLogLine(lines[0]);
		expect(parsed).not.toBeNull();
		expect(parsed?.event).toBe("sandbox.started");
		expect(parsed?.engine).toBe("freqtrade");
		expect(parsed?.slice).toBe("S5");
		expect(parsed?.issue).toBe("ANX-162");
		expect(parsed?.port).toBe(9055);
	});

	it("rejects non-structured log lines", () => {
		expect(parseSandboxLogLine("plain text")).toBeNull();
		expect(parseSandboxLogLine('{"foo":"bar"}')).toBeNull();
	});
});
