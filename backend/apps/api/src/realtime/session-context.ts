import type { betterAuth } from "better-auth";
import type { RealtimeSessionContext } from "./types";

export interface ResolveRealtimeSessionDeps {
	auth: ReturnType<typeof betterAuth>;
}

export async function resolveRealtimeSession(
	deps: ResolveRealtimeSessionDeps,
	headers: Headers,
): Promise<RealtimeSessionContext | null> {
	const session = await deps.auth.api.getSession({ headers });
	const userId = session?.user?.id;
	if (!userId) {
		return null;
	}
	return {
		userId,
		tenantId: userId,
	};
}
