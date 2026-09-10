import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import { createLogger } from "@anxionos/observability";
import {
	AckPolicy,
	DeliverPolicy,
	JSONCodec,
	type NatsConnection,
	connect,
} from "nats";
import type { Pool } from "pg";
import {
	DEFAULT_NATS_EVENTS_STREAM,
	ensureEventsJetStream,
} from "@anxionos/eventing/nats-publisher";
import {
	GOVERNANCE_ORGANIZATIONS_CONSUMER_NAME,
	classifyOrganizationsMembershipError,
	createOrganizationsMembershipConsumerDeps,
	processOrganizationsMembershipConsumerEvent,
} from "./organizations-membership-consumer";

const logger = createLogger({
	service: "governance-organizations-membership",
});

const codec = JSONCodec<unknown>();

const GOVERNANCE_ORGANIZATIONS_DURABLE =
	"governance-organizations-membership-v1";
/** Agency-scoped organization domain events (membership.*, agency.*). */
export const GOVERNANCE_ORGANIZATIONS_SUBJECT_FILTER =
	"agency.>.events.organizations.>";

export interface GovernanceOrganizationsMembershipHandle {
	stop: () => Promise<void>;
}

export async function startGovernanceOrganizationsMembershipConsumer(
	pool: Pool,
): Promise<GovernanceOrganizationsMembershipHandle> {
	if (process.env.GOVERNANCE_ORGANIZATIONS_CONSUMER_DISABLED === "true") {
		logger.info("Governance organizations membership consumer disabled by env");
		return { stop: async () => {} };
	}

	const natsUrl = process.env.NATS_URL?.trim();
	if (!natsUrl) {
		logger.info("NATS_URL unset — governance organizations consumer disabled");
		return { stop: async () => {} };
	}

	const streamName =
		process.env.NATS_EVENTS_STREAM?.trim() ?? DEFAULT_NATS_EVENTS_STREAM;
	const nc: NatsConnection = await connect({
		servers: natsUrl,
		maxReconnectAttempts: -1,
	});
	const jsm = await nc.jetstreamManager();
	await ensureEventsJetStream(jsm, streamName);

	const js = nc.jetstream();
	const deps = createOrganizationsMembershipConsumerDeps(pool);

	try {
		await jsm.consumers.add(streamName, {
			durable_name: GOVERNANCE_ORGANIZATIONS_DURABLE,
			filter_subject: GOVERNANCE_ORGANIZATIONS_SUBJECT_FILTER,
			ack_policy: AckPolicy.Explicit,
			deliver_policy: DeliverPolicy.New,
		});
	} catch {
		// durable consumer may already exist from a prior process
	}

	const consumer = await js.consumers.get(
		streamName,
		GOVERNANCE_ORGANIZATIONS_DURABLE,
	);
	let aborted = false;

	logger.info("Governance organizations membership consumer started", {
		stream: streamName,
		subject: GOVERNANCE_ORGANIZATIONS_SUBJECT_FILTER,
		durable: GOVERNANCE_ORGANIZATIONS_DURABLE,
		consumer: GOVERNANCE_ORGANIZATIONS_CONSUMER_NAME,
	});

	const loop = (async () => {
		while (!aborted) {
			try {
				const messages = await consumer.fetch({
					max_messages: 10,
					expires: 2_000,
				});
				for await (const msg of messages) {
					try {
						const envelope = domainEventEnvelopeSchema.parse(
							codec.decode(msg.data),
						);
						await processOrganizationsMembershipConsumerEvent(
							pool,
							deps,
							envelope,
						);
						msg.ack();
					} catch (error) {
						const failureClass = classifyOrganizationsMembershipError(error);
						if (failureClass === "permanent") {
							logger.warn(
								"Governance organizations membership message skipped (permanent failure)",
								{
									error: error instanceof Error ? error.message : String(error),
								},
							);
							msg.ack();
						} else {
							logger.error(
								"Governance organizations membership message failed (transient)",
								{
									error: error instanceof Error ? error.message : String(error),
								},
							);
							msg.nak();
						}
					}
				}
			} catch (error) {
				if (aborted) {
					break;
				}
				logger.error("Governance organizations membership fetch failed", {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	})();

	return {
		stop: async () => {
			aborted = true;
			await loop;
			await nc.drain();
		},
	};
}

export function bootstrapGovernanceOrganizationsMembership(pool: Pool): void {
	void startGovernanceOrganizationsMembershipConsumer(pool).catch(
		(error: unknown) => {
			logger.error(
				"Governance organizations membership consumer failed to start",
				{
					error: error instanceof Error ? error.message : String(error),
				},
			);
		},
	);
}
