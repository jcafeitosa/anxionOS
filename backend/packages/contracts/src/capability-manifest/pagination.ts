import { z } from "zod";

/** Shared pagination request for list/query capabilities (P02). */
export const pageRequestSchema = z.object({
	pageSize: z.number().int().min(1).max(200),
	pageToken: z.string().min(1).optional(),
});

/** Shared pagination response envelope for list/query capabilities (P02). */
export const pageResponseSchema = z.object({
	items: z.array(z.unknown()),
	nextPageToken: z.string().min(1).optional(),
	totalCount: z.number().int().nonnegative().optional(),
});

export type PageRequest = z.infer<typeof pageRequestSchema>;
export type PageResponse = z.infer<typeof pageResponseSchema>;
