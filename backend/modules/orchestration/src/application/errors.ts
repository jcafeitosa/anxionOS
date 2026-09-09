import { AppError } from "@anxionos/contracts/errors";
import { type CheckoutTaskResult, type OrchestrationErrorCode } from "@anxionos/contracts/orchestration";
import { AppError } from "@anxionos/contracts/errors";
import { ORCHESTRATION_ERROR_STATUS_MAP } from "@anxionos/contracts/orchestration";

}): never;

export class OrchestrationCommandError extends AppError {
    orchestrationCode;
    constructor(orchestrationCode, message, options) {
        const statusCode = ORCHESTRATION_ERROR_STATUS_MAP[orchestrationCode];
        const appCode = statusCode === 404
            ? "NOT_FOUND"
            : statusCode === 403
                ? "FORBIDDEN"
                : statusCode === 409
                    ? "CONFLICT"
                    : statusCode === 503
                        ? "SERVICE_UNAVAILABLE"
                        : "INTERNAL_ERROR";
        super({
            code: appCode,
            message,
            details: { code: orchestrationCode },
            expose: true,
            cause: options?.cause,
        });
        this.name = "OrchestrationCommandError";
        this.orchestrationCode = orchestrationCode;
        Object.defineProperty(this, "statusCode", { value: statusCode });
    }
}
export function throwOrchestrationError(code: OrchestrationErrorCode, message: string, options?: {
    cause?: unknown;
}): never {
    throw new OrchestrationCommandError(code, message, options);
}
export function parseCheckoutResultSnapshot(snapshot: Record<string, unknown> | null): CheckoutTaskResult {
    if (!snapshot || typeof snapshot.task !== "object" || typeof snapshot.run !== "object") {
        throw new Error("Invalid checkout command journal response snapshot");
    }
    return {
        task: snapshot.task,
        run: snapshot.run,
        leaseToken: String(snapshot.leaseToken),
        idempotentReplay: true,
    };
}
