import type { FieldMask } from "@anxionos/contracts/graph";

function getNestedValue(record, path) {
    const parts = path.split(".");
    let current = record;
    for (const part of parts) {
        if (current === null || typeof current !== "object") {
            return undefined;
        }
        current = current[part];
    }
    return current;
}
function setNestedValue(record, path, value) {
    const parts = path.split(".");
    let current = record;
    for (let index = 0; index < parts.length - 1; index += 1) {
        const part = parts[index];
        const next = current[part];
        if (next === undefined || typeof next !== "object" || next === null) {
            current[part] = {};
        }
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
}
/** Applies dotted field mask paths (R04/R06 — batchGet partial payload). */
export function applyFieldMask(payload: Record<string, unknown>, fieldMask?: FieldMask): Record<string, unknown> {
    if (!fieldMask || fieldMask.length === 0) {
        return payload;
    }
    const masked = {};
    for (const path of fieldMask) {
        const value = getNestedValue(payload, path);
        if (value !== undefined) {
            setNestedValue(masked, path, value);
        }
    }
    return masked;
}
