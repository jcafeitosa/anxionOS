import { createAuthClient } from "better-auth/react";
import { z } from "zod";

export const authClient = createAuthClient({
	basePath: "/api/auth",
});

const consoleRoleSchema = z.enum(["owner", "admin", "operator", "viewer"]);

export const postLoginAuthContextSchema = z.object({
	authenticated: z.boolean(),
	emailVerified: z.boolean(),
	mfaRequired: z.boolean(),
	principal: z
		.object({
			id: z.string(),
			authUserId: z.string(),
			email: z.string(),
			displayName: z.string().nullish(),
		})
		.nullable(),
	membershipsActive: z.array(
		z.object({
			agencyId: z.string(),
			role: consoleRoleSchema,
			status: z.literal("active"),
		}),
	),
	membershipsPending: z.array(
		z.object({
			agencyId: z.string().optional(),
			role: consoleRoleSchema.optional(),
			inviteEmail: z.string().optional(),
			inviteExpiresAt: z.string().optional(),
		}),
	),
	platformAccess: z.boolean(),
	partnerAccess: z.boolean(),
	onboardingState: z.object({
		needsProfile: z.boolean(),
		needsOrganization: z.boolean(),
		needsEmailVerification: z.boolean().optional(),
		needsMfa: z.boolean().optional(),
		state: z.string().optional(),
	}),
	decision: z.object({
		kind: z.enum([
			"platform",
			"owner",
			"operator",
			"partner",
			"select_organization",
			"onboarding",
			"denied",
		]),
		agencyId: z.string().optional(),
		role: consoleRoleSchema.optional(),
		reason: z.string(),
	}),
	authorization: z
		.object({
			policyVersion: z.string(),
			authorityEpoch: z.number().optional(),
			generatedAt: z.string(),
			expiresAt: z.string().optional(),
		})
		.optional(),
});

export type PostLoginAuthContext = z.infer<typeof postLoginAuthContextSchema>;
export type { ConsoleKind } from "./console-access";
export { canAccessConsole } from "./console-access";

export class PostLoginContextUnavailableError extends Error {
	constructor(readonly status: number) {
		super(`post-login-context unavailable (${status})`);
		this.name = "PostLoginContextUnavailableError";
	}
}

export async function fetchPostLoginContext(): Promise<PostLoginAuthContext> {
	const response = await fetch("/v1/auth/post-login-context", {
		credentials: "include",
		headers: { Accept: "application/json" },
	});
	if (!response.ok) {
		throw new PostLoginContextUnavailableError(response.status);
	}
	return postLoginAuthContextSchema.parse(await response.json());
}

export function pathForPostLogin(context: PostLoginAuthContext): string {
	if (!context.authenticated) {
		return "/login";
	}
	switch (context.decision.kind) {
		case "platform":
			return "/platform";
		case "owner":
			return context.decision.agencyId
				? `/agency/${context.decision.agencyId}`
				: "/access-denied";
		case "operator":
			return context.decision.agencyId
				? `/operator/${context.decision.agencyId}`
				: "/access-denied";
		case "partner":
			return "/partner";
		case "select_organization":
			return "/select-organization";
		case "onboarding":
			if (context.onboardingState.needsMfa) {
				return "/mfa";
			}
			if (context.onboardingState.needsEmailVerification) {
				return "/verify-email";
			}
			return "/onboarding";
		case "denied":
			return "/access-denied";
		default: {
			const exhaustive: never = context.decision.kind;
			return exhaustive;
		}
	}
}

export function consolePathForMembership(
	agencyId: string,
	role: PostLoginAuthContext["membershipsActive"][number]["role"],
): string {
	if (role === "owner" || role === "admin") {
		return `/agency/${agencyId}`;
	}
	return `/operator/${agencyId}`;
}
