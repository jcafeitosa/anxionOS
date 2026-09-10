import type { Pool } from "pg";
import {
	type InviteAcceptRateLimitStore,
	createInviteAcceptRateLimitStore,
} from "./invite-accept-rate-limit-store";

let activeStore: InviteAcceptRateLimitStore | null = null;

export function configureInviteAcceptRateLimit(pool?: Pool): void {
	activeStore = createInviteAcceptRateLimitStore(pool);
}

function getStore(): InviteAcceptRateLimitStore {
	if (!activeStore) {
		activeStore = createInviteAcceptRateLimitStore();
	}
	return activeStore;
}

export async function assertInviteAcceptRateLimit(
	clientIp: string,
): Promise<void> {
	await getStore().assertWithinLimit(clientIp);
}

export async function resetInviteAcceptRateLimits(): Promise<void> {
	await getStore().reset();
}
