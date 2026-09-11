/**
 * ANX-162 S5 — structured JSON logging for engines-sandbox stubs.
 *
 * Emits one JSON object per line on stdout for Docker json-file driver ingestion.
 */

const ISSUE = "ANX-162";
const SLICE = "S5";

/**
 * @param {string} engineId
 * @param {{ version?: string; service?: string }} [context]
 */
export function createSandboxLogger(engineId, context = {}) {
	const base = {
		issue: ISSUE,
		slice: SLICE,
		engine: engineId,
		service: context.service ?? `${engineId}-sandbox`,
		mode: process.env.ENGINE_MODE ?? "SIMULATED",
		version: context.version ?? "unknown",
	};

	function write(level, event, fields = {}) {
		const entry = {
			timestamp: new Date().toISOString(),
			level,
			event,
			...base,
			...fields,
		};
		console.log(JSON.stringify(entry));
	}

	return {
		info: (event, fields) => write("info", event, fields),
		warn: (event, fields) => write("warn", event, fields),
		error: (event, fields) => write("error", event, fields),
	};
}

/**
 * Parse a log line emitted by createSandboxLogger (for oracle/tests).
 *
 * @param {string} line
 */
export function parseSandboxLogLine(line) {
	const trimmed = line.trim();
	if (!trimmed) {
		return null;
	}
	try {
		const parsed = JSON.parse(trimmed);
		if (
			typeof parsed.timestamp === "string" &&
			typeof parsed.level === "string" &&
			typeof parsed.event === "string" &&
			parsed.issue === ISSUE
		) {
			return parsed;
		}
		return null;
	} catch {
		return null;
	}
}
