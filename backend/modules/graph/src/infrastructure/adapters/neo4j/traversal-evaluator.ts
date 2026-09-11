import type { Driver, Record as Neo4jRecord } from "neo4j-driver";
import neo4j from "neo4j-driver";
import type { GrantScope } from "../../../application/traversal/t01-grant-evaluation";
import {
	evaluateT01Grants,
	resolveGrantScope,
	toT03Output,
} from "../../../application/traversal/t01-grant-evaluation";
import { evaluateT02Temporal } from "../../../application/traversal/t02-temporal-evaluation";
import { parseNodeKey } from "../../../domain/node-key";
import type { GraphNodeRecord } from "../../../domain/ports/graph-store";
import type { TraversalEvaluator } from "../../../domain/ports/traversal-evaluator";

function toNumber(value: unknown): number {
	if (neo4j.isInt(value)) {
		return value.toNumber();
	}
	if (typeof value === "number") {
		return value;
	}
	return 0;
}
function parsePayload(value: unknown): Record<string, unknown> {
	if (value === null || value === undefined) {
		return {};
	}
	if (typeof value === "string") {
		return JSON.parse(value);
	}
	if (typeof value === "object") {
		return value as Record<string, unknown>;
	}
	return {};
}
function recordToGrantNode(record: Neo4jRecord): GraphNodeRecord {
	const nodeKey = parseNodeKey(String(record.get("nodeKey")));
	return {
		nodeKey,
		schemaVersion: toNumber(record.get("schemaVersion")),
		ownerDomain: String(record.get("ownerDomain")),
		status: String(record.get("status")),
		revision: toNumber(record.get("revision")),
		projectionGeneration: toNumber(record.get("projectionGeneration")),
		payload: parsePayload(record.get("payloadJson")),
	};
}
async function queryGrantNodes(
	driver: Driver,
	grantScope: GrantScope,
): Promise<GraphNodeRecord[]> {
	const session = driver.session();
	try {
		const result = await session.run(
			`MATCH (n:GraphNode)
			 WHERE n.nodeType = 'Grant'
			   AND n.status = 'active'
			   AND n.scopeType = $scopeType
			   AND n.scopeId = $scopeId
			 RETURN n.nodeKey AS nodeKey,
			        n.schemaVersion AS schemaVersion,
			        n.ownerDomain AS ownerDomain,
			        n.status AS status,
			        n.revision AS revision,
			        n.projectionGeneration AS projectionGeneration,
			        n.payloadJson AS payloadJson`,
			{
				scopeType: grantScope.scopeType,
				scopeId: grantScope.scopeId,
			},
		);
		return result.records.map(recordToGrantNode);
	} finally {
		await session.close();
	}
}
export function createNeo4jTraversalEvaluator(
	deps: CreateNeo4jTraversalEvaluatorDeps,
): TraversalEvaluator {
	const defaultRiskEpoch = deps.riskEpoch ?? 0;
	return {
		async evaluate(input) {
			const checkpoint = await deps.getCheckpoint();
			if (input.traversalId === "T02") {
				const t02Input = input.input;
				if (!("validAt" in t02Input)) {
					throw new Error("T02 requires temporal params");
				}
				const t02Result = evaluateT02Temporal({
					params: t02Input,
					knownAt: input.temporal.knownAt,
				});
				return {
					data: { complete: t02Result.complete },
					authorityEpoch: 0,
					riskEpoch: defaultRiskEpoch,
					projectionGeneration: 0,
					checkpoint,
				};
			}
			if (input.traversalId === "T04" || input.traversalId === "T05") {
				return {
					data: { complete: true },
					authorityEpoch: 0,
					riskEpoch: defaultRiskEpoch,
					projectionGeneration: 0,
					checkpoint,
				};
			}
			if (input.traversalId !== "T01" && input.traversalId !== "T03") {
				throw new Error(`Unsupported traversal: ${input.traversalId}`);
			}
			const t01Input = input.input;
			if (
				!("actorId" in t01Input) ||
				!("action" in t01Input) ||
				!("resourceNodeKey" in t01Input)
			) {
				throw new Error("T01/T03 requires authorization input");
			}
			const grantScope = resolveGrantScope(
				input.scope,
				t01Input.resourceNodeKey,
			);
			const grants = await queryGrantNodes(deps.driver, grantScope);
			const evaluation = evaluateT01Grants(
				{
					scope: input.scope,
					params: t01Input,
					knownAt: input.temporal.knownAt,
				},
				grants,
			);
			const t01Output = evaluation.output;
			const data =
				input.traversalId === "T03" ? toT03Output(t01Output) : t01Output;
			return {
				data,
				authorityEpoch: t01Output.authorityEpoch ?? 0,
				riskEpoch: t01Output.riskEpoch ?? defaultRiskEpoch,
				projectionGeneration: evaluation.projectionGeneration,
				checkpoint,
			};
		},
	};
}

export interface CreateNeo4jTraversalEvaluatorDeps {
	driver: Driver;
	getCheckpoint: () => Promise<string>;
	riskEpoch?: number;
}
