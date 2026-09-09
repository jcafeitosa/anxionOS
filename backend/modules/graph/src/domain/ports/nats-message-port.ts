/** Minimal NATS JetStream message surface for projection inbox ack/nak (GK-R06-02). */
export interface NatsMessagePort {
	ack(): void;
	nak(delayMs?: number): void;
}
