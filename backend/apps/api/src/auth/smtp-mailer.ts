import { createLogger } from "@anxionos/observability";
import nodemailer from "nodemailer";

const logger = createLogger({ service: "smtp-mail" });

export interface SmtpMailConfig {
	host: string;
	port: number;
	secure: boolean;
	user: string;
	pass: string;
	from: string;
}

/**
 * Fail-closed: missing SMTP_USER or SMTP_PASS/SMTP_PASSWORD → null (no send).
 * SMTP_PASS is preferred; SMTP_PASSWORD is accepted as alias (docs/backend).
 */
export function resolveSmtpMailConfig(
	env: NodeJS.ProcessEnv = process.env,
): SmtpMailConfig | null {
	const user = env.SMTP_USER?.trim() ?? "";
	const pass = env.SMTP_PASS?.trim() || env.SMTP_PASSWORD?.trim() || "";
	if (!user || !pass) {
		return null;
	}
	const portRaw = env.SMTP_PORT?.trim();
	const port = portRaw ? Number(portRaw) : 587;
	if (!Number.isFinite(port) || port <= 0) {
		return null;
	}
	const secure = env.SMTP_SECURE === "true" || port === 465;
	const from = env.SMTP_FROM?.trim() || env.EMAIL_FROM?.trim() || user;
	return {
		host: env.SMTP_HOST?.trim() || "smtp.gmail.com",
		port,
		secure,
		user,
		pass,
		from,
	};
}

export function isSmtpVerificationEnabled(
	env: NodeJS.ProcessEnv = process.env,
): boolean {
	return resolveSmtpMailConfig(env) !== null;
}

export async function sendSmtpMail(input: {
	to: string;
	subject: string;
	text: string;
	html?: string;
}): Promise<{ accepted: string[]; messageId: string; response: string }> {
	const config = resolveSmtpMailConfig();
	if (!config) {
		throw new Error(
			"SMTP is not configured (SMTP_USER and SMTP_PASS/SMTP_PASSWORD required)",
		);
	}
	const transporter = nodemailer.createTransport({
		host: config.host,
		port: config.port,
		secure: config.secure,
		requireTLS: !config.secure,
		auth: {
			user: config.user,
			pass: config.pass,
		},
	});
	const info = await transporter.sendMail({
		from: config.from,
		to: input.to,
		subject: input.subject,
		text: input.text,
		html: input.html,
	});
	const accepted = (info.accepted ?? []).map(String);
	logger.info("smtp mail accepted", {
		to: input.to,
		messageId: info.messageId,
		response: info.response,
		accepted,
	});
	return {
		accepted,
		messageId: info.messageId,
		response: info.response ?? "",
	};
}

/** Fire-and-forget send (Better Auth: do not await in the handler). */
export function queueVerificationEmail(input: {
	to: string;
	url: string;
}): void {
	void sendSmtpMail({
		to: input.to,
		subject: "Verifique seu e-mail — anxionOS",
		text: `Confirme seu cadastro no anxionOS abrindo este link (válido por 1 hora):\n\n${input.url}\n`,
		html: `<p>Confirme seu cadastro no anxionOS.</p><p><a href="${input.url}">Verificar e-mail</a></p><p>Se o link não abrir, copie: ${input.url}</p>`,
	}).catch((error: unknown) => {
		const message = error instanceof Error ? error.message : "unknown";
		logger.error("smtp verification send failed", {
			to: input.to,
			error: message,
		});
	});
}
