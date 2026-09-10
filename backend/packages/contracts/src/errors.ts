import { z } from "zod";
export type ErrorBody = z.infer<typeof errorBodySchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export interface AppErrorOptions {
	code: ErrorCode;
	message: string;
	details?: unknown;
	expose?: boolean;
	cause?: unknown;
}
export type ErrorCode = (typeof ERROR_CODES)[number];
export const ERROR_CODES = [
	"VALIDATION_ERROR",
	"UNAUTHORIZED",
	"FORBIDDEN",
	"NOT_FOUND",
	"CONFLICT",
	"RATE_LIMITED",
	"INTERNAL_ERROR",
	"SERVICE_UNAVAILABLE",
	"STALE_PROJECTION",
	"DEPENDENCY_ERROR",
] as const;
export const ERROR_STATUS_MAP = {
	VALIDATION_ERROR: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	RATE_LIMITED: 429,
	INTERNAL_ERROR: 500,
	SERVICE_UNAVAILABLE: 503,
	STALE_PROJECTION: 409,
	DEPENDENCY_ERROR: 502,
};
export const errorBodySchema = z.object({
	code: z.enum(ERROR_CODES),
	message: z.string(),
	requestId: z.string().optional(),
	details: z.unknown().optional(),
	timestamp: z.string().datetime(),
	stack: z.string().optional(),
});
export const errorResponseSchema = z.object({
	error: errorBodySchema,
});
export interface AppErrorOptions {
	code: ErrorCode;
	message: string;
	details?: unknown;
	expose?: boolean;
	cause?: unknown;
}

export class AppError extends Error {
	code;
	statusCode;
	details;
	expose;
	constructor(options: AppErrorOptions) {
		super(
			options.message,
			options.cause ? { cause: options.cause } : undefined,
		);
		this.name = "AppError";
		this.code = options.code;
		this.statusCode = ERROR_STATUS_MAP[options.code];
		this.details = options.details;
		this.expose = options.expose ?? true;
	}
	static validation(message: string, details?: unknown) {
		return new AppError({
			code: "VALIDATION_ERROR",
			message,
			details,
			expose: true,
		});
	}
	static unauthorized(message = "Não autorizado") {
		return new AppError({ code: "UNAUTHORIZED", message, expose: true });
	}
	static forbidden(message = "Acesso negado") {
		return new AppError({ code: "FORBIDDEN", message, expose: true });
	}
	static notFound(message = "Recurso não encontrado") {
		return new AppError({ code: "NOT_FOUND", message, expose: true });
	}
	static internal(message = "Erro interno do servidor", cause?: unknown) {
		return new AppError({
			code: "INTERNAL_ERROR",
			message,
			expose: false,
			cause,
		});
	}
}
export interface ToErrorResponseOptions {
	requestId?: string;
	exposeDetails?: boolean;
	exposeStack?: boolean;
}

export function isAppError(error: unknown): error is AppError {
	if (error instanceof AppError) {
		return true;
	}
	if (typeof error !== "object" || error === null) {
		return false;
	}
	const candidate = error as Record<string, unknown>;
	if (
		typeof candidate.code !== "string" ||
		typeof candidate.statusCode !== "number"
	) {
		return false;
	}
	return (
		ERROR_CODES.includes(candidate.code as ErrorCode) &&
		candidate.statusCode === ERROR_STATUS_MAP[candidate.code as ErrorCode]
	);
}
function isRecord(value: unknown) {
	return typeof value === "object" && value !== null;
}
function extractValidationDetails(error: unknown) {
	if (!isRecord(error)) return undefined;
	if ("all" in error && Array.isArray(error.all)) {
		return error.all;
	}
	if ("errors" in error) {
		return error.errors;
	}
	return undefined;
}
function mapElysiaCode(code: string): ErrorCode {
	switch (String(code)) {
		case "VALIDATION":
			return "VALIDATION_ERROR";
		case "NOT_FOUND":
			return "NOT_FOUND";
		case "PARSE":
			return "VALIDATION_ERROR";
		case "UNKNOWN":
			return "INTERNAL_ERROR";
		default:
			return "INTERNAL_ERROR";
	}
}
function defaultMessageForCode(code: ErrorCode): string {
	switch (code) {
		case "VALIDATION_ERROR":
			return "Dados inválidos";
		case "UNAUTHORIZED":
			return "Não autorizado";
		case "FORBIDDEN":
			return "Acesso negado";
		case "NOT_FOUND":
			return "Recurso não encontrado";
		case "CONFLICT":
			return "Conflito de estado";
		case "RATE_LIMITED":
			return "Muitas requisições — tente novamente em instantes";
		case "SERVICE_UNAVAILABLE":
			return "Serviço temporariamente indisponível";
		case "STALE_PROJECTION":
			return "Projeção desatualizada — atualize e tente novamente";
		case "DEPENDENCY_ERROR":
			return "Falha em dependência externa";
		default:
			return "Erro interno do servidor";
	}
}
export function toErrorResponse(
	error: unknown,
	options: ToErrorResponseOptions = {},
): ErrorResponse {
	const timestamp = new Date().toISOString();
	const exposeDetails =
		options.exposeDetails ?? process.env.NODE_ENV !== "production";
	const exposeStack =
		options.exposeStack ?? process.env.EXPOSE_ERROR_DETAILS === "true";
	if (isAppError(error)) {
		const body = {
			code: error.code,
			message: error.expose ? error.message : defaultMessageForCode(error.code),
			requestId: options.requestId,
			timestamp,
			...(exposeDetails && error.details !== undefined
				? { details: error.details }
				: {}),
			...(exposeStack && error.stack ? { stack: error.stack } : {}),
		};
		return { error: body };
	}
	const elysiaCode =
		isRecord(error) && "code" in error ? String(error.code) : "UNKNOWN";
	const mappedCode = mapElysiaCode(elysiaCode);
	const validationDetails =
		mappedCode === "VALIDATION_ERROR"
			? extractValidationDetails(error)
			: undefined;
	const message =
		exposeDetails && error instanceof Error
			? error.message
			: defaultMessageForCode(mappedCode);
	const body: ErrorBody = {
		code: mappedCode as ErrorCode,
		message,
		requestId: options.requestId,
		timestamp,
		...(exposeDetails && validationDetails !== undefined
			? { details: validationDetails }
			: {}),
		...(exposeStack && error instanceof Error && error.stack
			? { stack: error.stack }
			: {}),
	};
	return { error: body };
}
export function resolveStatusCode(error: unknown): number {
	if (isAppError(error)) {
		return error.statusCode;
	}
	const response = toErrorResponse(error);
	return ERROR_STATUS_MAP[response.error.code];
}
