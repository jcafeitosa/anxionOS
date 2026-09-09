import type { LeaseClock } from "../domain/ports/lease-clock";

export function createSystemLeaseClock(): LeaseClock {
    return {
        now() {
            return new Date();
        },
        expiresIn(ttlMs) {
            return new Date(Date.now() + ttlMs);
        },
    };
}
