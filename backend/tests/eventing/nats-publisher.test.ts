import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	assertTenantScopedEnvelopeAgencyId,
	type DomainEventEnvelope,
} from "@anxionos/contracts/events";
import { ORGANIZATION_EVENT_TYPES } from "@anxionos/contracts/organizations";
import {
	NATS_EVENTS_STREAM_SUBJECTS,
	resolveEventSubject,
} from "@anxionos/eventing/nats-publisher";

describe("nats publisher helpers", () => {
	test("resolveEventSubject prefixes platform events namespace", () => {
		expect(resolveEventSubject("identity.principal.suspended.v1")).toBe(
			"events.identity.principal.suspended.v1",
		);
	});

	test("resolveEventSubject prefixes agency-scoped organization events", () => {
		const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
		expect(
			resolveEventSubject(
				ORGANIZATION_EVENT_TYPES.MEMBERSHIP_ACTIVATED,
				agencyId,
			),
		).toBe(
			`agency.${agencyId}.events.${ORGANIZATION_EVENT_TYPES.MEMBERSHIP_ACTIVATED}`,
		);
	});

	test("JetStream subject list covers platform and agency namespaces", () => {
		expect(NATS_EVENTS_STREAM_SUBJECTS).toEqual([
			"events.>",
			"agency.>.events.>",
		]);
	});

	test("assertTenantScopedEnvelopeAgencyId rejects missing envelope agencyId", () => {
		const envelope: DomainEventEnvelope = {
			eventId: randomUUID(),
			schemaVersion: "0.1.0",
			ownerDomain: "organizations",
			eventType: ORGANIZATION_EVENT_TYPES.MEMBERSHIP_ACTIVATED,
			occurredAt: "2026-09-10T12:00:00.000Z",
			payload: {
				agencyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
				membershipId: randomUUID(),
				principalId: randomUUID(),
				role: "member",
				revision: 1,
			},
		};
		expect(() => assertTenantScopedEnvelopeAgencyId(envelope)).toThrow(
			"missing envelope.agencyId",
		);
	});

	test("assertTenantScopedEnvelopeAgencyId rejects agencyId mismatch", () => {
		const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
		const otherAgencyId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
		const envelope: DomainEventEnvelope = {
			eventId: randomUUID(),
			schemaVersion: "0.1.0",
			ownerDomain: "organizations",
			eventType: ORGANIZATION_EVENT_TYPES.MEMBERSHIP_ACTIVATED,
			occurredAt: "2026-09-10T12:00:00.000Z",
			agencyId,
			payload: {
				agencyId: otherAgencyId,
				membershipId: randomUUID(),
				principalId: randomUUID(),
				role: "member",
				revision: 1,
			},
		};
		expect(() => assertTenantScopedEnvelopeAgencyId(envelope)).toThrow(
			"agencyId mismatch",
		);
	});

	test("assertTenantScopedEnvelopeAgencyId passes for aligned organization envelope", () => {
		const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
		const envelope: DomainEventEnvelope = {
			eventId: randomUUID(),
			schemaVersion: "0.1.0",
			ownerDomain: "organizations",
			eventType: ORGANIZATION_EVENT_TYPES.MEMBERSHIP_ACTIVATED,
			occurredAt: "2026-09-10T12:00:00.000Z",
			agencyId,
			payload: {
				agencyId,
				membershipId: randomUUID(),
				principalId: randomUUID(),
				role: "member",
				revision: 1,
			},
		};
		expect(() => assertTenantScopedEnvelopeAgencyId(envelope)).not.toThrow();
	});
});
