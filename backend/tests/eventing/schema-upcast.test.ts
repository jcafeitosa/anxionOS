import { describe, expect, test } from "bun:test";
import {
	UnknownSchemaVersionError,
	upcastEnvelopeForPublish,
	upcastEnvelopeToV02,
} from "@anxionos/eventing/schema-upcast";

const sampleEnvelope = {
	eventId: "11111111-1111-4111-8111-111111111111",
	schemaVersion: "0.1.0" as const,
	ownerDomain: "identity",
	eventType: "identity.principal.suspended.v1",
	occurredAt: "2026-09-08T12:00:00.000Z",
	payload: { principalId: "22222222-2222-4222-8222-222222222222" },
};

describe("schema upcast", () => {
	test("upcastEnvelopeForPublish passes through 0.1.0", () => {
		expect(upcastEnvelopeForPublish(sampleEnvelope)).toEqual(sampleEnvelope);
	});

	test("upcastEnvelopeForPublish rejects unknown versions", () => {
		expect(() =>
			upcastEnvelopeForPublish({
				...sampleEnvelope,
				schemaVersion: "9.9.9" as "0.1.0",
			}),
		).toThrow(UnknownSchemaVersionError);
	});

	test("upcastEnvelopeToV02 upgrades baseline envelope", () => {
		const upgraded = upcastEnvelopeToV02(sampleEnvelope, {
			correlationId: "33333333-3333-4333-8333-333333333333",
			actorPrincipalId: "44444444-4444-4444-8444-444444444444",
			channel: "worker",
		});
		expect(upgraded.schemaVersion).toBe("0.2.0");
		expect(upgraded.messageId).toBe(sampleEnvelope.eventId);
		expect(upgraded.messageType).toBe(sampleEnvelope.eventType);
	});
});
