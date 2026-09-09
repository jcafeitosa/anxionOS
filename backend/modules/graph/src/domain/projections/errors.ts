export class ProjectionError extends Error {
    code;
    classification;
    constructor(message, code, classification) {
        super(message);
        this.name = "ProjectionError";
        this.code = code;
        this.classification = classification;
    }
}
export function isProjectionError(error: unknown): error is ProjectionError {
    return error instanceof ProjectionError;
}

export type ProjectionErrorClassification = "transient" | "permanent";
