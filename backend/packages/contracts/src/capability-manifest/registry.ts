import { ZodError } from "zod";
import { CAPABILITY_MANIFEST_V1_CATALOG } from "./catalog-v1";
import { CapabilityManifestError } from "./errors";
import {
	type CapabilityId,
	type CapabilityInvocationChannel,
	type CapabilityManifestCatalog,
	type CapabilityManifestEntry,
	capabilityManifestCatalogSchema,
	type ExecutionMode,
} from "./schema";
import {
	getCapabilityErrorSchema,
	getCapabilityInputSchema,
	getCapabilityOutputSchema,
} from "./schema-registry";

const entryIndex = new Map<CapabilityId, CapabilityManifestEntry>(
	CAPABILITY_MANIFEST_V1_CATALOG.entries.map((entry) => [
		entry.capabilityId,
		entry,
	]),
);

export function parseCapabilityManifestCatalog(
	input: unknown,
): CapabilityManifestCatalog {
	return capabilityManifestCatalogSchema.parse(input);
}

export function getCapabilityManifestEntry(
	capabilityId: CapabilityId,
): CapabilityManifestEntry {
	const entry = entryIndex.get(capabilityId);
	if (!entry) {
		throw new CapabilityManifestError(
			"CAP_MANIFEST_NOT_FOUND",
			`capability not found: ${capabilityId}`,
			{ capabilityId },
		);
	}
	return entry;
}

export function listCapabilityManifestEntries(): CapabilityManifestEntry[] {
	return [...CAPABILITY_MANIFEST_V1_CATALOG.entries];
}

export function listCapabilityManifestEntriesByOwner(
	ownerModule: CapabilityManifestEntry["ownerModule"],
): CapabilityManifestEntry[] {
	return CAPABILITY_MANIFEST_V1_CATALOG.entries.filter(
		(entry) => entry.ownerModule === ownerModule,
	);
}

export function assertCapabilityChannelAllowed(
	entry: CapabilityManifestEntry,
	channel: CapabilityInvocationChannel,
): void {
	if (!entry.allowedChannels.includes(channel)) {
		throw new CapabilityManifestError(
			"CAP_MANIFEST_CHANNEL_DENIED",
			`channel ${channel} not allowed for ${entry.capabilityId}`,
			{ capabilityId: entry.capabilityId, channel },
		);
	}
}

export function assertCapabilityExecutionModeAllowed(
	entry: CapabilityManifestEntry,
	mode: ExecutionMode,
): void {
	if (!entry.allowedExecutionModes.includes(mode)) {
		throw new CapabilityManifestError(
			"CAP_MANIFEST_MODE_DENIED",
			`execution mode ${mode} not allowed for ${entry.capabilityId}`,
			{ capabilityId: entry.capabilityId, mode },
		);
	}
}

export function validateCapabilityInput(
	capabilityId: CapabilityId,
	input: unknown,
): unknown {
	const entry = getCapabilityManifestEntry(capabilityId);
	if (entry.inputSchemaDeferred || !entry.inputSchemaRef) {
		throw new CapabilityManifestError(
			"CAP_MANIFEST_INPUT_SCHEMA_UNAVAILABLE",
			`input schema unavailable for ${capabilityId}`,
			{ capabilityId },
		);
	}
	const schema = getCapabilityInputSchema(entry.inputSchemaRef);
	if (!schema) {
		throw new CapabilityManifestError(
			"CAP_MANIFEST_INPUT_SCHEMA_UNAVAILABLE",
			`input schema ref not registered: ${entry.inputSchemaRef}`,
			{ capabilityId, inputSchemaRef: entry.inputSchemaRef },
		);
	}
	try {
		return schema.parse(input);
	} catch (error) {
		if (error instanceof ZodError) {
			throw new CapabilityManifestError(
				"CAP_MANIFEST_INPUT_INVALID",
				`invalid input for ${capabilityId}`,
				{ capabilityId, issues: error.issues },
			);
		}
		throw error;
	}
}

export function parseCapabilityOutput(
	capabilityId: CapabilityId,
	output: unknown,
): unknown {
	const entry = getCapabilityManifestEntry(capabilityId);
	if (!entry.outputSchemaRef) {
		throw new CapabilityManifestError(
			"CAP_MANIFEST_OUTPUT_SCHEMA_UNAVAILABLE",
			`output schema unavailable for ${capabilityId}`,
			{ capabilityId },
		);
	}
	const schema = getCapabilityOutputSchema(entry.outputSchemaRef);
	if (!schema) {
		throw new CapabilityManifestError(
			"CAP_MANIFEST_OUTPUT_SCHEMA_UNAVAILABLE",
			`output schema ref not registered: ${entry.outputSchemaRef}`,
			{ capabilityId, outputSchemaRef: entry.outputSchemaRef },
		);
	}
	try {
		return schema.parse(output);
	} catch (error) {
		if (error instanceof ZodError) {
			throw new CapabilityManifestError(
				"CAP_MANIFEST_OUTPUT_INVALID",
				`invalid output for ${capabilityId}`,
				{ capabilityId, issues: error.issues },
			);
		}
		throw error;
	}
}

export function parseCapabilityError(
	capabilityId: CapabilityId,
	errorBody: unknown,
): unknown {
	const entry = getCapabilityManifestEntry(capabilityId);
	if (!entry.errorSchemaRef) {
		throw new CapabilityManifestError(
			"CAP_MANIFEST_ERROR_SCHEMA_UNAVAILABLE",
			`error schema unavailable for ${capabilityId}`,
			{ capabilityId },
		);
	}
	const schema = getCapabilityErrorSchema(entry.errorSchemaRef);
	if (!schema) {
		throw new CapabilityManifestError(
			"CAP_MANIFEST_ERROR_SCHEMA_UNAVAILABLE",
			`error schema ref not registered: ${entry.errorSchemaRef}`,
			{ capabilityId, errorSchemaRef: entry.errorSchemaRef },
		);
	}
	try {
		return schema.parse(errorBody);
	} catch (error) {
		if (error instanceof ZodError) {
			throw new CapabilityManifestError(
				"CAP_MANIFEST_INPUT_INVALID",
				`invalid error body for ${capabilityId}`,
				{ capabilityId, issues: error.issues },
			);
		}
		throw error;
	}
}

export function getCapabilitySurfaceMatrix(capabilityId: CapabilityId) {
	return getCapabilityManifestEntry(capabilityId).surfaces;
}
