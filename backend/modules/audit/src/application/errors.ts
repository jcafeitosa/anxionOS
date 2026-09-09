import {
  auditCommandResultSchema,
  type AuditCommandResult,
  type AuditErrorCode,
} from "@anxionos/contracts/audit";

export class AuditCommandError extends Error {
  readonly code: AuditErrorCode;

  constructor(code: AuditErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "AuditCommandError";
  }
}

export function throwAuditError(code: AuditErrorCode, message: string): never {
  throw new AuditCommandError(code, message);
}

export function parseCommandResultSnapshot(snapshot: Record<string, unknown>): AuditCommandResult {
  return auditCommandResultSchema.parse({
    aggregateId: snapshot.aggregateId,
    revision: snapshot.revision,
    idempotentReplay: snapshot.idempotentReplay,
    manifestId: snapshot.manifestId,
    flightRecordId: snapshot.flightRecordId,
  });
}
