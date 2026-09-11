import { randomUUID } from "node:crypto";
import type { ScopeContext } from "@anxionos/contracts/graph";
import {
	graphQueryEnvelopeSchema,
	T01_INPUT_SCHEMA,
	T01_OUTPUT_SCHEMA,
	T02_INPUT_SCHEMA,
	T02_OUTPUT_SCHEMA,
	T03_OUTPUT_SCHEMA,
	T04_INPUT_SCHEMA,
	T04_OUTPUT_SCHEMA,
	T05_INPUT_SCHEMA,
	T05_OUTPUT_SCHEMA,
	T06_INPUT_SCHEMA,
	T06_OUTPUT_SCHEMA,
	T07_INPUT_SCHEMA,
	T07_OUTPUT_SCHEMA,
	T08_INPUT_SCHEMA,
	T08_OUTPUT_SCHEMA,
	T09_INPUT_SCHEMA,
	T09_OUTPUT_SCHEMA,
	T10_INPUT_SCHEMA,
	T10_OUTPUT_SCHEMA,
	T11_INPUT_SCHEMA,
	T11_OUTPUT_SCHEMA,
	T12_INPUT_SCHEMA,
	T12_OUTPUT_SCHEMA,
	T13_INPUT_SCHEMA,
	T13_OUTPUT_SCHEMA,
	T14_INPUT_SCHEMA,
	T14_OUTPUT_SCHEMA,
	T15_INPUT_SCHEMA,
	T15_OUTPUT_SCHEMA,
	T16_INPUT_SCHEMA,
	T16_OUTPUT_SCHEMA,
	T17_INPUT_SCHEMA,
	T17_OUTPUT_SCHEMA,
	T18_INPUT_SCHEMA,
	T18_OUTPUT_SCHEMA,
	T19_INPUT_SCHEMA,
	T19_OUTPUT_SCHEMA,
	T20_INPUT_SCHEMA,
	T20_OUTPUT_SCHEMA,
	TRAVERSAL_T01_META,
	TRAVERSAL_T02_META,
	TRAVERSAL_T03_META,
	TRAVERSAL_T04_META,
	TRAVERSAL_T05_META,
	TRAVERSAL_T06_META,
	TRAVERSAL_T07_META,
	TRAVERSAL_T08_META,
	TRAVERSAL_T09_META,
	TRAVERSAL_T10_META,
	TRAVERSAL_T11_META,
	TRAVERSAL_T12_META,
	TRAVERSAL_T13_META,
	TRAVERSAL_T14_META,
	TRAVERSAL_T15_META,
	TRAVERSAL_T16_META,
	TRAVERSAL_T17_META,
	TRAVERSAL_T18_META,
	TRAVERSAL_T19_META,
	TRAVERSAL_T20_META,
} from "@anxionos/contracts/graph";
import type { TraversalEvaluatorId } from "../../domain/ports/traversal-evaluator";
import { getOrLoadGraphCacheValue } from "../cache/cache-aside";
import { GraphHttpError } from "./graph-http-error";
import type { GraphTraversalRateLimiter } from "./graph-rate-limit";
import { buildTraversalRateLimitKey } from "./graph-rate-limit";
import type { GraphHttpRuntime } from "./graph-runtime";
import { assertEnvelopeScopeMatches } from "./scope-enforcement";

const TRAVERSAL_META = {
	T01: TRAVERSAL_T01_META,
	T02: TRAVERSAL_T02_META,
	T03: TRAVERSAL_T03_META,
	T04: TRAVERSAL_T04_META,
	T05: TRAVERSAL_T05_META,
	T06: TRAVERSAL_T06_META,
	T07: TRAVERSAL_T07_META,
	T08: TRAVERSAL_T08_META,
	T09: TRAVERSAL_T09_META,
	T10: TRAVERSAL_T10_META,
	T11: TRAVERSAL_T11_META,
	T12: TRAVERSAL_T12_META,
	T13: TRAVERSAL_T13_META,
	T14: TRAVERSAL_T14_META,
	T15: TRAVERSAL_T15_META,
	T16: TRAVERSAL_T16_META,
	T17: TRAVERSAL_T17_META,
	T18: TRAVERSAL_T18_META,
	T19: TRAVERSAL_T19_META,
	T20: TRAVERSAL_T20_META,
};
const TRAVERSAL_INPUT_SCHEMAS = {
	T01: T01_INPUT_SCHEMA,
	T02: T02_INPUT_SCHEMA,
	T03: T01_INPUT_SCHEMA,
	T04: T04_INPUT_SCHEMA,
	T05: T05_INPUT_SCHEMA,
	T06: T06_INPUT_SCHEMA,
	T07: T07_INPUT_SCHEMA,
	T08: T08_INPUT_SCHEMA,
	T09: T09_INPUT_SCHEMA,
	T10: T10_INPUT_SCHEMA,
	T11: T11_INPUT_SCHEMA,
	T12: T12_INPUT_SCHEMA,
	T13: T13_INPUT_SCHEMA,
	T14: T14_INPUT_SCHEMA,
	T15: T15_INPUT_SCHEMA,
	T16: T16_INPUT_SCHEMA,
	T17: T17_INPUT_SCHEMA,
	T18: T18_INPUT_SCHEMA,
	T19: T19_INPUT_SCHEMA,
	T20: T20_INPUT_SCHEMA,
};
const TRAVERSAL_OUTPUT_SCHEMAS = {
	T01: T01_OUTPUT_SCHEMA,
	T02: T02_OUTPUT_SCHEMA,
	T03: T03_OUTPUT_SCHEMA,
	T04: T04_OUTPUT_SCHEMA,
	T05: T05_OUTPUT_SCHEMA,
	T06: T06_OUTPUT_SCHEMA,
	T07: T07_OUTPUT_SCHEMA,
	T08: T08_OUTPUT_SCHEMA,
	T09: T09_OUTPUT_SCHEMA,
	T10: T10_OUTPUT_SCHEMA,
	T11: T11_OUTPUT_SCHEMA,
	T12: T12_OUTPUT_SCHEMA,
	T13: T13_OUTPUT_SCHEMA,
	T14: T14_OUTPUT_SCHEMA,
	T15: T15_OUTPUT_SCHEMA,
	T16: T16_OUTPUT_SCHEMA,
	T17: T17_OUTPUT_SCHEMA,
	T18: T18_OUTPUT_SCHEMA,
	T19: T19_OUTPUT_SCHEMA,
	T20: T20_OUTPUT_SCHEMA,
};
const TRAVERSAL_IDS = new Set([
	"T01",
	"T02",
	"T03",
	"T04",
	"T05",
	"T06",
	"T07",
	"T08",
	"T09",
	"T10",
	"T11",
	"T12",
	"T13",
	"T14",
	"T15",
	"T16",
	"T17",
	"T18",
	"T19",
	"T20",
]);
function assertTraversalId(value) {
	if (TRAVERSAL_IDS.has(value)) {
		return value;
	}
	throw new GraphHttpError(
		"TRAVERSAL_NOT_FOUND",
		`Traversal not found: ${value}`,
	);
}
function parseTraversalParams(traversalId, params) {
	const parsed = TRAVERSAL_INPUT_SCHEMAS[traversalId].safeParse(params);
	if (!parsed.success) {
		throw new GraphHttpError(
			"TRAVERSAL_INPUT_INVALID",
			`Invalid ${traversalId} params`,
			parsed.error.flatten(),
		);
	}
	return parsed.data;
}
export function assertTraversalRateLimit(
	rateLimiter: GraphTraversalRateLimiter,
	principalId: string,
	traversalId: TraversalEvaluatorId | "neighbors",
): void {
	const key = buildTraversalRateLimitKey(principalId, traversalId);
	if (!rateLimiter.check(key)) {
		throw new GraphHttpError("RATE_LIMITED", "Traversal rate limit exceeded", {
			traversalId,
			limitPerMinute: 60,
		});
	}
}
export async function handleTraversal(
	runtime,
	traversalIdParam,
	body,
	scope,
	requestId,
) {
	const traversalId = assertTraversalId(traversalIdParam);
	assertTraversalRateLimit(runtime.rateLimiter, scope.principalId, traversalId);
	const envelopeParsed = graphQueryEnvelopeSchema.safeParse(body);
	if (!envelopeParsed.success) {
		throw new GraphHttpError(
			"TRAVERSAL_INPUT_INVALID",
			"Invalid GraphQuery envelope",
			envelopeParsed.error.flatten(),
		);
	}
	const envelope = envelopeParsed.data;
	assertEnvelopeScopeMatches(scope, envelope.scope);
	const traversalInput = parseTraversalParams(traversalId, envelope.params);
	const catalogEntry = runtime.catalog.getTraversal(
		traversalId,
		TRAVERSAL_META[traversalId].queryVersion,
	);
	if (!catalogEntry) {
		throw new GraphHttpError(
			"TRAVERSAL_NOT_FOUND",
			`Traversal not registered: ${traversalId}`,
		);
	}
	const catalogGeneration = await runtime.getRegistryGeneration();
	const queryId = randomUUID();
	const intentHash =
		"intentHash" in traversalInput ? traversalInput.intentHash : undefined;
	const authorityEpoch =
		"expectedAuthorityEpoch" in traversalInput
			? traversalInput.expectedAuthorityEpoch
			: catalogGeneration;
	const riskEpoch =
		"expectedRiskEpoch" in traversalInput
			? traversalInput.expectedRiskEpoch
			: 0;
	const cacheLookupInput = {
		traversalId,
		scopeType: scope.actingScope.scopeType,
		scopeId: scope.actingScope.scopeId,
		principalId: scope.principalId,
		queryParams: envelope.params,
		authorityEpoch: authorityEpoch ?? catalogGeneration,
		riskEpoch: riskEpoch ?? 0,
		catalogGeneration,
		intentHash,
	};
	const evaluateTraversal = async () => {
		const result = await runtime.traversalEvaluator.evaluate({
			traversalId,
			input: traversalInput,
			scope,
			temporal: envelope.temporal,
		});
		const outputSchema = TRAVERSAL_OUTPUT_SCHEMAS[traversalId];
		return {
			...result,
			data: outputSchema.parse(result.data),
		};
	};
	let evaluation: Awaited<ReturnType<typeof evaluateTraversal>> | undefined;
	let cacheHit = false;
	if (intentHash) {
		evaluation = await evaluateTraversal();
	} else if (traversalId === "T01") {
		const denyCacheInput = {
			...cacheLookupInput,
			decision: "DENY",
		};
		const cached = await getOrLoadGraphCacheValue(
			runtime,
			denyCacheInput,
			evaluateTraversal,
		);
		evaluation = cached.value;
		cacheHit = cached.cacheHit;
		if (!cacheHit && evaluation.data.decision !== "DENY") {
			cacheHit = false;
		}
	} else if (TRAVERSAL_META[traversalId].cacheable === "never") {
		evaluation = await evaluateTraversal();
	} else {
		const cached = await getOrLoadGraphCacheValue(
			runtime,
			cacheLookupInput,
			evaluateTraversal,
		);
		evaluation = cached.value;
		cacheHit = cached.cacheHit;
	}
	return {
		meta: {
			queryId,
			traversalId,
			queryVersion: catalogEntry.queryVersion,
			requestId,
			validAt: envelope.temporal.validAt,
			knownAt: envelope.temporal.knownAt,
			projectionGeneration: evaluation.projectionGeneration,
			checkpoint: evaluation.checkpoint,
			complete: "complete" in evaluation.data ? evaluation.data.complete : true,
			cached: cacheHit,
		},
		data: evaluation.data,
	};
}
