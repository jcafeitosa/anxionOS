export type { NatsMessagePort } from "../../domain/ports/nats-message-port";
export function createTrackingNatsMessagePort() {
    const state = {
        acked: false,
        naked: false,
        nakDelayMs: null,
    };
    return {
        get acked() {
            return state.acked;
        },
        get naked() {
            return state.naked;
        },
        get nakDelayMs() {
            return state.nakDelayMs;
        },
        ack() {
            state.acked = true;
        },
        nak(delayMs) {
            state.naked = true;
            state.nakDelayMs = delayMs ?? null;
        },
    };
}
export function nakDelayMs(attemptCount: number): number {
    const base = Math.min(300_000, 2 ** attemptCount * 1000);
    const jitter = base * (0.8 + Math.random() * 0.2);
    return Math.floor(jitter);
}
