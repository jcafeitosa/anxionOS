import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { betterAuthDrizzleSchema } from "./better-auth-drizzle-schema";
import { ensureBetterAuthSchema } from "./ensure-better-auth-schema";
import {
	createIdentityBetterAuthDatabaseHooks,
	type IdentityBetterAuthDeps,
} from "./identity-better-auth-hooks";
import {
	isSmtpVerificationEnabled,
	queueVerificationEmail,
} from "./smtp-mailer";

export interface BetterAuthConfig {
	secret: string;
	baseURL: string;
	trustedOrigins?: string[];
}

export interface BetterAuthRuntime {
	auth: ReturnType<typeof betterAuth>;
}

/** Reject insecure session cookies when production is configured with plain HTTP (G5 ANX-383). */
export function assertProductionBetterAuthBaseUrl(baseURL: string): void {
	if (process.env.NODE_ENV !== "production") {
		return;
	}
	if (baseURL.toLowerCase().startsWith("http://")) {
		throw new Error(
			"BETTER_AUTH_URL must use https:// in production (insecure session cookies on http://)",
		);
	}
}

export function resolveBetterAuthConfig(): BetterAuthConfig | null {
	const secret = process.env.BETTER_AUTH_SECRET?.trim();
	const baseURL = process.env.BETTER_AUTH_URL?.trim();
	if (!secret || !baseURL) {
		return null;
	}
	assertProductionBetterAuthBaseUrl(baseURL);
	const trustedOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
		.map((origin) => origin.trim())
		.filter((origin) => origin.length > 0);
	return {
		secret,
		baseURL,
		trustedOrigins: trustedOrigins?.length ? trustedOrigins : undefined,
	};
}

export async function createBetterAuthRuntime(
	pool: Pool,
	identityDeps: IdentityBetterAuthDeps,
): Promise<BetterAuthRuntime> {
	const config = resolveBetterAuthConfig();
	if (!config) {
		throw new Error(
			"BETTER_AUTH_SECRET and BETTER_AUTH_URL are required to start Better Auth",
		);
	}
	await ensureBetterAuthSchema(pool);
	const db = drizzle(pool, { schema: betterAuthDrizzleSchema });
	const smtpEnabled = isSmtpVerificationEnabled();
	return {
		auth: betterAuth({
			secret: config.secret,
			baseURL: config.baseURL,
			trustedOrigins: config.trustedOrigins,
			database: drizzleAdapter(db, {
				provider: "pg",
				schema: betterAuthDrizzleSchema,
			}),
			emailAndPassword: {
				enabled: true,
			},
			...(smtpEnabled
				? {
						emailVerification: {
							sendOnSignUp: true,
							sendOnSignIn: true,
							autoSignInAfterVerification: true,
							expiresIn: 3600,
							sendVerificationEmail: async ({
								user,
								url,
							}: {
								user: { email: string };
								url: string;
							}) => {
								queueVerificationEmail({ to: user.email, url });
							},
						},
					}
				: {}),
			databaseHooks: createIdentityBetterAuthDatabaseHooks(identityDeps),
		}) as unknown as ReturnType<typeof betterAuth>,
	};
}
