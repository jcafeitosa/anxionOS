/**
 * ANX-278 — sandbox PC12 cycle: metric → FEEDS_BACK → Discovery trigger.
 * User instruction: Product Intelligence runtime FEEDS_BACK loop (ANX-278).
 */
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import {
	PRODUCT_GRAPH_EVENT_TYPES,
	PRODUCT_GRAPH_OWNER_DOMAIN,
} from "@anxionos/contracts/graph";
import {
	createInMemoryGraphStore,
	projectProductGraphEvent,
} from "@anxionos/graph";
import { saveLifecycleState } from "../../.cursor/orchestration/agent-lifecycle/phase-check.mjs";
import { resolveStageCode } from "../../.cursor/orchestration/agent-lifecycle/product-company-stages.mjs";

function parseCli(argv) {
	const { values } = parseArgs({
		args: argv,
		options: {
			issue: { type: "string" },
			metric: { type: "string", default: "p99_latency_ms" },
			value: { type: "string", default: "840" },
			threshold: { type: "string", default: "500" },
			"trigger-discovery": { type: "boolean", default: true },
			json: { type: "boolean", default: false },
		},
		allowPositionals: false,
	});
	if (!values.issue) {
		throw new Error("--issue ANX-N is required");
	}
	return values;
}

export async function runProductIntelligenceCycle(input) {
	const companyId = randomUUID();
	const monitorId = randomUUID();
	const problemId = randomUUID();
	const graphStore = createInMemoryGraphStore();
	const envelope = {
		eventId: randomUUID(),
		schemaVersion: "0.1.0",
		ownerDomain: PRODUCT_GRAPH_OWNER_DOMAIN,
		eventType: PRODUCT_GRAPH_EVENT_TYPES.INTELLIGENCE_FEEDS_BACK,
		occurredAt: new Date().toISOString(),
		payload: {
			companyId,
			monitorId,
			problemId,
			revision: 1,
			metricName: input.metric,
			metricValue: Number(input.value),
			threshold: Number(input.threshold),
			unit: "ms",
			insightSummary: `Métrica ${input.metric}=${input.value} acima de ${input.threshold}`,
			problemStatement: `SLO breach: ${input.metric}`,
			triggerDiscovery: input.triggerDiscovery,
		},
	};

	await projectProductGraphEvent({
		envelope,
		graphStore,
		projectionGeneration: 1,
	});

	let discoveryStage = null;
	if (input.triggerDiscovery) {
		discoveryStage = saveLifecycleState(input.issue, {
			productCompanyStage: resolveStageCode("discovery"),
		});
	}

	return {
		issue: input.issue,
		eventId: envelope.eventId,
		eventType: envelope.eventType,
		nodesProjected: graphStore.records.size,
		edgesProjected: graphStore.edges.length,
		discoveryStage: discoveryStage?.productCompanyStage ?? null,
		discoveryStageSlug: discoveryStage?.productCompanyStageSlug ?? null,
	};
}

const values = parseCli(process.argv.slice(2));
const report = await runProductIntelligenceCycle({
	issue: values.issue,
	metric: values.metric,
	value: values.value,
	threshold: values.threshold,
	triggerDiscovery: values["trigger-discovery"],
});

if (values.json) {
	console.log(JSON.stringify(report, null, 2));
} else {
	console.log(`Product Intelligence cycle — ${report.issue}`);
	console.log(`  event: ${report.eventType}`);
	console.log(
		`  nodes: ${report.nodesProjected} · edges: ${report.edgesProjected}`,
	);
	console.log(
		`  discovery: ${report.discoveryStage} (${report.discoveryStageSlug})`,
	);
}
