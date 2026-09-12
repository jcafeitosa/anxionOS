/**
 * ANX-484 + ANX-485 — fail-closed do envelope de erro em produção e log do 500
 * não mapeado.
 *
 * ANX-484: o detalhe SENSÍVEL (mensagem crua do driver, stack) nunca vai ao
 * cliente com NODE_ENV ausente/`production`; exige opt-in explícito
 * (`EXPOSE_ERROR_DETAILS=true`) E ambiente não-produção. O `details.code`
 * institucional segue a semântica do contrato (R04) sem depender da flag.
 *
 * ANX-485: o erro não mapeado que vira 500 é logado estruturado, no ponto onde
 * o 500 é decidido (cada error-handler de módulo chama
 * `logUnhandledBoundaryError`), e a evidência do G4 (zero log no stdout para
 * o 42P01 injetado) deixa de valer.
 */
import { afterEach, describe, expect, test } from "bun:test";
import {
	AppError,
	toErrorResponse,
} from "@anxionos/contracts/errors";
import {
	logUnhandledBoundaryError,
} from "../../apps/api/src/middleware/unhandled-error-log";
import { mapOrganizationsError } from "../../apps/api/src/organizations/error-handler";

type Env = Record<string, string | undefined>;
const saved: Env = {};

function withEnv(env: Env, work: () => void): void {
	for (const [key, value] of Object.entries(env)) {
		saved[key] = process.env[key];
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
	try {
		work();
	} finally {
		for (const key of Object.keys(env)) {
			if (saved[key] === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = saved[key];
			}
		}
	}
}

afterEach(() => {
	delete process.env.NODE_ENV;
	delete process.env.EXPOSE_ERROR_DETAILS;
});

const DRIVER_ERROR = new Error(
	'Failed query: update "organizations_memberships" set status = $1 where id = $2 params: <uuid>,<email>',
);

describe("ANX-484 — fail-closed do detalhe de erro em produção", () => {
	test("NODE_ENV=production, sem EXPOSE_ERROR_DETAILS: mensagem crua do driver NAO vai ao corpo", () => {
		withEnv({ NODE_ENV: "production" }, () => {
			const response = toErrorResponse(DRIVER_ERROR);
			expect(response.error.code).toBe("INTERNAL_ERROR");
			expect(response.error.message).toContain("Erro interno do servidor");
			expect(response.error.message).not.toContain("Failed query");
			expect(response.error.stack).toBeUndefined();
		});
	});

	test("NODE_ENV ausente (cenario de deploy): mensagem crua NAO vai ao corpo (fail-closed)", () => {
		withEnv({ NODE_ENV: undefined }, () => {
			const response = toErrorResponse(DRIVER_ERROR);
			expect(response.error.message).not.toContain("Failed query");
			expect(response.error.stack).toBeUndefined();
		});
	});

	test("EXPOSE_ERROR_DETAILS=true exige ambiente nao-producao para expor", () => {
		withEnv(
			{ NODE_ENV: "production", EXPOSE_ERROR_DETAILS: "true" },
			() => {
				const response = toErrorResponse(DRIVER_ERROR);
				expect(response.error.message).not.toContain("Failed query");
			},
		);
		withEnv(
			{ NODE_ENV: "development", EXPOSE_ERROR_DETAILS: "true" },
			() => {
				const response = toErrorResponse(DRIVER_ERROR);
				expect(response.error.message).toContain("Failed query");
				expect(response.error.stack).toBeString();
			},
		);
	});

	test("details institucional (details.code) sai fora de producao sem depender da flag (R04)", () => {
		withEnv({ NODE_ENV: "production" }, () => {
			const appError = new AppError({
				code: "CONFLICT",
				message: "Conflito",
				details: { code: "ORG_MEMBERSHIP_EXISTS" },
			});
			const response = toErrorResponse(appError, { exposeDetails: true });
			expect(response.error.details).toEqual({
				code: "ORG_MEMBERSHIP_EXISTS",
			});
		});
	});
});

describe("ANX-485 — log estruturado do 500 nao mapeado", () => {
	const logLines: string[] = [];

	function captureLog(work: () => void): string[] {
		logLines.length = 0;
		const original = console.log;
		console.log = (line: unknown) => {
			logLines.push(String(line));
		};
		try {
			work();
		} finally {
			console.log = original;
		}
		return logLines;
	}

	test("logUnhandledBoundaryError emite JSON com requestId, nome, mensagem e stack", () => {
		captureLog(() => {
			logUnhandledBoundaryError(DRIVER_ERROR, "req-123");
		});
		expect(logLines.length).toBe(1);
		const entry = JSON.parse(logLines[0]);
		expect(entry.level).toBe("error");
		expect(entry.requestId).toBe("req-123");
		expect(entry.errorName).toBe("Error");
		expect(entry.message).toContain("Failed query");
		expect(entry.stack).toBeString();
		expect(entry.service).toBe("api");
	});

	test("boundary de organizations: erro cru vira 500 E gera log com a causa (42P01)", () => {
		const driverError = new Error('relation "organizations_memberships" does not exist (42P01)');
		const lines = captureLog(() => {
			const mapped = mapOrganizationsError(driverError, "req-42p01");
			expect(mapped.status).toBe(500);
			expect(mapped.body.error.message).toContain("Erro interno do servidor");
			expect(mapped.body.error.message).not.toContain("42P01");
		});
		expect(lines.length).toBe(1);
		const entry = JSON.parse(lines[0]);
		expect(entry.requestId).toBe("req-42p01");
		expect(entry.message).toContain("42P01");
	});
});