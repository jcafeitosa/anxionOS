import { processWithInbox } from "@anxionos/eventing/postgres";
import type { Pool } from "pg";
import type { InboxConsumer, InboxProcessorPort } from "../domain/ports/inbox-processor-port";

export function createGovernanceInboxProcessor(pool: Pool): InboxProcessorPort {
	return {
		async process(consumer: InboxConsumer, envelope) {
			return processWithInbox(pool, consumer, envelope);
		},
	};
}
