export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
	debug(message: string, meta?: Record<string, unknown>): void;
	info(message: string, meta?: Record<string, unknown>): void;
	warn(message: string, meta?: Record<string, unknown>): void;
	error(message: string, meta?: Record<string, unknown>): void;
}

export interface LoggerOptions {
	service: string;
	level?: LogLevel;
}

const LEVEL_ORDER: LogLevel[] = ["debug", "info", "warn", "error"];

function shouldLog(current: LogLevel, messageLevel: LogLevel): boolean {
	return LEVEL_ORDER.indexOf(messageLevel) >= LEVEL_ORDER.indexOf(current);
}

export function createLogger(options: LoggerOptions): Logger {
	const level = options.level ?? "info";

	const write = (
		messageLevel: LogLevel,
		message: string,
		meta?: Record<string, unknown>,
	) => {
		if (!shouldLog(level, messageLevel)) return;
		console.log(
			JSON.stringify({
				level: messageLevel,
				service: options.service,
				message,
				...meta,
				timestamp: new Date().toISOString(),
			}),
		);
	};

	return {
		debug: (message, meta) => write("debug", message, meta),
		info: (message, meta) => write("info", message, meta),
		warn: (message, meta) => write("warn", message, meta),
		error: (message, meta) => write("error", message, meta),
	};
}
