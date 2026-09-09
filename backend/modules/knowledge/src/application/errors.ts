import {
  knowledgeCommandResultSchema,
  type KnowledgeCommandResult,
  type KnowledgeErrorCode,
} from "@anxionos/contracts/knowledge";

export class KnowledgeCommandError extends Error {
  readonly code: KnowledgeErrorCode;

  constructor(code: KnowledgeErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "KnowledgeCommandError";
  }
}

export function throwKnowledgeError(code: KnowledgeErrorCode, message: string): never {
  throw new KnowledgeCommandError(code, message);
}

export function parseCommandResultSnapshot(snapshot: Record<string, unknown>): KnowledgeCommandResult {
  return knowledgeCommandResultSchema.parse({
    aggregateId: snapshot.aggregateId,
    revision: snapshot.revision,
    idempotentReplay: snapshot.idempotentReplay,
    documentId: snapshot.documentId,
    documentVersionId: snapshot.documentVersionId,
    indexGenerationId: snapshot.indexGenerationId,
  });
}
