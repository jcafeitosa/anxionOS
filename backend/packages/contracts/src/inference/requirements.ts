import { z } from "zod";
export const inferencePurposeSchema = z.enum([
    "ROUTINE",
    "PLANNING",
    "SPECIAL",
    "RETRIEVAL",
    "SPEECH_TTS",
    "SPEECH_STT",
    "RERANK",
]);
export const dataClassSchema = z.enum([
    "PUBLIC",
    "INTERNAL",
    "CONFIDENTIAL",
    "RESTRICTED",
]);
export const latencyClassSchema = z.enum([
    "INTERACTIVE",
    "BATCH",
    "BACKGROUND",
]);
export const complexityClassSchema = z.enum(["SMALL", "MEDIUM", "LARGE"]);
export const inferenceRequirementsSchema = z.object({
    schemaVersion: z.literal("1.0.0"),
    taskType: z.string().min(1).max(128),
    operation: z.string().min(1).max(128),
    requiredCapabilities: z.array(z.string().min(1)).max(32),
    requiredPurpose: inferencePurposeSchema,
    dataClass: dataClassSchema,
    latencyClass: latencyClassSchema,
    complexity: complexityClassSchema,
    contextTokenBudget: z.number().int().positive().optional(),
    outputTokenBudget: z.number().int().positive().optional(),
    toolAllowlist: z.array(z.string().min(1)).max(64).optional(),
});

export type InferenceRequirements = z.infer<typeof inferenceRequirementsSchema>;
