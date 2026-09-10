import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { verifyManifestIntegrity } from "./verify-manifest-integrity";
import { AuditCommandError } from "../errors";
import { hashCommandPayload } from "../command-support";
import type {
	AuditManifestRecord,
	AuditTransactionContext,
	AuditUnitOfWork,
} from "../../domain/ports/audit-unit-of-work";

const ORG = "00000000-0000-4000-8000-000000000001";
const ORG_B = "00000000-0000-4000-8000-000000000002";
const HASH = "a".repeat(64);

function createUow(manifest: AuditManifestRecord | null) {
	const journal = new Map<string, { organizationId: string; responseSnapshot: Record<string, unknown> }>();
	const ctx: AuditTransactionContext = {
		commandJournal: {
			async findByCommandId(id) {
				const entry = journal.get(id);
				return entry
					? {
							commandId: id,
							organizationId: entry.organizationId,
							commandName: "verifyManifestIntegrity",
							responseSnapshot: entry.responseSnapshot,
						}
					: null;
			},
			async findBySourceEventId() {
				return null;
			},
			async save(entry) {
				journal.set(entry.commandId, {
					organizationId: entry.organizationId,
					responseSnapshot: entry.responseSnapshot,
				});
			},
		},
		manifests: {
			async findById(id) {
				return manifest && manifest.id === id ? manifest : null;
			},
			async findBySourceEventId() {
				return null;
			},
			async save(record) {
				return record;
			},
		},
		flightRecorderEntries: {
			async save(record) {
				return record;
			},
		},
		async publishEvents() {},
	};
	const unitOfWork: AuditUnitOfWork = {
		async runInTransaction(work) {
			return work(ctx);
		},
	};
	return { unitOfWork, journal };
}

const manifest: AuditManifestRecord = {
	id: `aud_man_${randomUUID()}`,
	organizationId: ORG,
	sourceEventId: randomUUID(),
	ownerDomain: "orchestration",
	eventType: "orchestration.task.checked_out.v1",
	occurredAt: new Date().toISOString(),
	payloadHash: HASH,
	recordedAt: new Date().toISOString(),
};

function ctxJournal(journal: Map<string, { organizationId: string; responseSnapshot: Record<string, unknown> }>) {
	return {
		async findByCommandId(id: string) {
			const entry = journal.get(id);
			return entry
				? {
						commandId: id,
						organizationId: entry.organizationId,
						commandName: "verifyManifestIntegrity",
						responseSnapshot: entry.responseSnapshot,
					}
				: null;
		},
		async findBySourceEventId() {
			return null;
		},
		async save(entry: {
			commandId: string;
			organizationId: string;
			commandName: string;
			responseSnapshot: Record<string, unknown>;
		}) {
			journal.set(entry.commandId, {
				organizationId: entry.organizationId,
				responseSnapshot: entry.responseSnapshot,
			});
		},
	};
}

describe("verifyManifestIntegrity", () => {
	test("verifies matching payload hash", async () => {
		const { unitOfWork, journal } = createUow(manifest);
		const result = await verifyManifestIntegrity(
			{ unitOfWork, commandJournal: ctxJournal(journal) },
			{
				commandId: randomUUID(),
				organizationId: ORG,
				manifestId: manifest.id,
				payloadHash: HASH,
			},
		);
		expect(result.integrity).toBe("verified");
	});

	test("rejects tampered payload hash", async () => {
		const { unitOfWork, journal } = createUow(manifest);
		await expect(
			verifyManifestIntegrity(
				{ unitOfWork, commandJournal: ctxJournal(journal) },
				{
					commandId: randomUUID(),
					organizationId: ORG,
					manifestId: manifest.id,
					payloadHash: "b".repeat(64),
				},
			),
		).rejects.toBeInstanceOf(AuditCommandError);
	});

	test("rejects cross-tenant commandId replay", async () => {
		const commandId = randomUUID();
		const { unitOfWork, journal } = createUow(manifest);
		await verifyManifestIntegrity(
			{ unitOfWork, commandJournal: ctxJournal(journal) },
			{
				commandId,
				organizationId: ORG,
				manifestId: manifest.id,
				payloadHash: HASH,
			},
		);
		await expect(
			verifyManifestIntegrity(
				{ unitOfWork, commandJournal: ctxJournal(journal) },
				{
					commandId,
					organizationId: ORG_B,
					manifestId: manifest.id,
					payloadHash: HASH,
				},
			),
		).rejects.toMatchObject({ code: "AUD_CROSS_TENANT" });
	});

	test("rejects divergent payload on commandId replay", async () => {
		const commandId = randomUUID();
		const { unitOfWork, journal } = createUow(manifest);
		const requestHash = hashCommandPayload({
			organizationId: ORG,
			manifestId: manifest.id,
			payloadHash: HASH.toLowerCase(),
		});
		journal.set(commandId, {
			organizationId: ORG,
			responseSnapshot: {
				aggregateId: manifest.id,
				revision: 1,
				requestHash,
			},
		});
		await expect(
			verifyManifestIntegrity(
				{ unitOfWork, commandJournal: ctxJournal(journal) },
				{
					commandId,
					organizationId: ORG,
					manifestId: manifest.id,
					payloadHash: "b".repeat(64),
				},
			),
		).rejects.toMatchObject({ code: "AUD_TAMPER_DETECTED" });
	});
});
