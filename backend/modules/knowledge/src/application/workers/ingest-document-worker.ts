import type {
	IngestDocumentCommand,
	KnowledgeCommandResult,
} from "@anxionos/contracts/knowledge";
import type { EmbeddingPort } from "../../domain/ports/embedding-port";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { KnowledgeUnitOfWork } from "../../domain/ports/knowledge-unit-of-work";
import { ingestDocument } from "../commands/ingest-document";

export interface IngestDocumentWorkerDeps {
	unitOfWork: KnowledgeUnitOfWork;
	commandJournal: CommandJournalRepository;
	embeddingPort?: EmbeddingPort;
}

export function createIngestDocumentWorker(deps: IngestDocumentWorkerDeps): {
	run(command: IngestDocumentCommand): Promise<KnowledgeCommandResult>;
} {
	if (!deps.embeddingPort) {
		throw new Error("embeddingPort is required for ingest document worker");
	}
	const ingestDeps = {
		unitOfWork: deps.unitOfWork,
		commandJournal: deps.commandJournal,
		embeddingPort: deps.embeddingPort,
	};
	return {
		async run(command) {
			return ingestDocument(ingestDeps, command);
		},
	};
}
