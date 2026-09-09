import { createHmac, timingSafeEqual } from "node:crypto";
import type { InviteTokenHasher } from "../../domain/ports/invite-token-hasher";

export function createHmacInviteTokenHasher(pepper: string): InviteTokenHasher {
	if (!pepper.trim()) {
		throw new Error("ORG_INVITE_TOKEN_PEPPER is required");
	}
	return {
		hash(plaintextToken: string) {
			return createHmac("sha256", pepper).update(plaintextToken).digest("hex");
		},
		verify(plaintextToken: string, storedHash: string) {
			const computed = createHmac("sha256", pepper).update(plaintextToken).digest("hex");
			if (computed.length !== storedHash.length) {
				return false;
			}
			return timingSafeEqual(Buffer.from(computed, "utf8"), Buffer.from(storedHash, "utf8"));
		},
	};
}

export function createHmacInviteTokenHasherFromEnv(): InviteTokenHasher {
	const pepper = process.env.ORG_INVITE_TOKEN_PEPPER;
	if (!pepper?.trim()) {
		throw new Error("ORG_INVITE_TOKEN_PEPPER is required");
	}
	return createHmacInviteTokenHasher(pepper);
}
